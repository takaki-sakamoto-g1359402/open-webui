"""Orchestrates decomposition, voting, and execution."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from config import Config
from mdap.decomposer import TaskDecomposer
from mdap.domain.list_pipeline import ListPipelineDomain, PipelineTask
from mdap.micro_agent import MicroAgent
from mdap.red_flagger import RedFlagger
from mdap.voting import VotingAggregator


@dataclass
class StepLog:
    step_id: int
    description: str
    winner: dict | None
    voting_rounds: int
    invalid: int
    tallies: Dict
    error: str | None = None


@dataclass
class RunMetrics:
    total_steps: int = 0
    total_llm_calls: int = 0
    total_invalid: int = 0
    undecided_steps: int = 0
    voting_round_histogram: Dict[int, int] = field(default_factory=dict)

    def update(self, outcome_rounds: int, invalid: int):
        self.voting_round_histogram[outcome_rounds] = (
            self.voting_round_histogram.get(outcome_rounds, 0) + 1
        )
        self.total_invalid += invalid


@dataclass
class Orchestrator:
    config: Config
    decomposer: TaskDecomposer
    agent: MicroAgent
    voting: VotingAggregator
    red_flagger: RedFlagger
    domain: ListPipelineDomain

    metrics: RunMetrics = field(default_factory=RunMetrics)
    trace_events: List[dict] = field(default_factory=list)

    def run(self, payload: dict) -> Dict:
        task: PipelineTask = self.decomposer.decompose(payload)
        self.metrics.total_steps = len(task.steps)
        state = task.initial_state
        self._prepare_trace_file()

        for step in task.steps:
            log_entry = self._run_step(step, state)
            self.trace_events.append({
                "step": step.step_id,
                "description": step.description,
                "winner": log_entry.winner,
                "tallies": log_entry.tallies,
                "invalid": log_entry.invalid,
                "error": log_entry.error,
            })
            if log_entry.winner is None:
                self.metrics.undecided_steps += 1
                break
            state = self.domain.apply_action(state, log_entry.winner)
            safe_event = self.trace_events[-1] | {"state": state}
            self._write_trace_event(self._json_safe(safe_event))

        return {
            "final_state": state,
            "metrics": self.metrics,
            "trace_file": self._trace_path,
        }

    def _run_step(self, step, state) -> StepLog:
        state_summary = self.domain.describe_state(state)

        def sample_once():
            result = self.agent.run(
                step_description=step.description,
                state_summary=state_summary,
            )
            self.metrics.total_llm_calls += 1
            if result.action is None:
                flag = self.red_flagger.validate(step=step, candidate={}, raw_output=result.raw_output)
                return None, flag
            flag = self.red_flagger.validate(
                step=step,
                candidate=result.action,
                raw_output=result.raw_output,
            )
            return result.action if flag.ok else None, flag

        outcome = self.voting.run(sample_once)
        self.metrics.update(outcome.rounds, outcome.invalid_candidates)
        error = outcome.reason
        return StepLog(
            step_id=step.step_id,
            description=step.description,
            winner=outcome.winner,
            voting_rounds=outcome.rounds,
            invalid=outcome.invalid_candidates,
            tallies=outcome.tallies,
            error=error,
        )

    def _prepare_trace_file(self):
        os.makedirs(self.config.run_trace_dir, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        self._trace_path = Path(self.config.run_trace_dir) / f"run_{timestamp}.jsonl"
        with open(self._trace_path, "w", encoding="utf-8") as fh:
            fh.write("")

    def _write_trace_event(self, event: dict):
        with open(self._trace_path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(event) + "\n")

    def _json_safe(self, event: dict) -> dict:
        copy = dict(event)
        tallies = copy.get("tallies")
        if tallies:
            copy["tallies"] = [
                {"action": list(key), "votes": votes}
                for key, votes in tallies.items()
            ]
        return copy

    def summarize(self) -> str:
        lines = ["=== Run Summary ==="]
        lines.append(f"Total steps: {self.metrics.total_steps}")
        lines.append(f"LLM calls: {self.metrics.total_llm_calls}")
        lines.append(f"Invalid outputs: {self.metrics.total_invalid}")
        lines.append(f"Undecided steps: {self.metrics.undecided_steps}")
        lines.append("Voting rounds histogram:")
        for rounds, count in sorted(self.metrics.voting_round_histogram.items()):
            lines.append(f"  rounds={rounds}: {count}")
        return "\n".join(lines)
