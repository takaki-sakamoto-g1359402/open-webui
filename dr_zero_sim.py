"""
Dr. Zero: Self-Evolving Search Agents without Training Data (Simplified Simulation)
==============================================================================

README (quick start)
--------------------
- Requirements: Python 3.11+, NumPy
- Run: `python dr_zero_sim.py`
- Output: iteration metrics, hop distribution, and ASCII plots.

Design doc (mapping to the paper)
---------------------------------
This file implements a minimal, faithful simulation of the paper's main ideas:

1) Environment / Search Tool Stub
   - `SearchTool` simulates an external search tool. It returns deterministic
     evidence strings derived from simple entity-relation tables.

2) Proposer (question generator)
   - `ProposerPolicy` is a discrete policy over hop count and templates.
   - For each question, it samples hop h, then a template conditioned on h,
     then synthesizes a QA pair using only the SearchTool.

3) Solver (answerer)
   - `SolverPolicy` is a stochastic policy with per-hop accuracy parameters.
   - For each question, it samples n attempts, calls the SearchTool, builds
     a reasoning trace, and outputs an answer.

4) Proposer reward (difficulty + verifiability)
   - Reward is based on solver pass-rate: k correct out of n attempts.
   - Penalizes k=0 (too hard / unverifiable) and k=n (too easy / trivial).
   - Peaks around k=1 and includes a small format reward.

5) HRPO for Proposer
   - Rewards are grouped by hop; within each hop, rewards are standardized to
     compute advantages (A_{i,h}).
   - REINFORCE-style update with KL regularization to previous policy.

6) GRPO for Solver
   - For each question, rewards are standardized across attempts (group stats).
   - PPO/GRPO-style clipped objective with a KL penalty to previous solver policy.

7) Self-evolution loop
   - As the solver improves, the proposer shifts to higher hop counts via HRPO.
   - Metrics printed each iteration show hop distribution and solver accuracy.

How to extend this to a real LLM + search engine
------------------------------------------------
- Replace `SearchTool` with actual retrieval (e.g., web search + reader).
- Replace `ProposerPolicy` template sampling with an LLM generating questions.
- Replace `SolverPolicy` with an LLM that uses tool calls in reasoning traces.
- Keep the HRPO/GRPO structure, but compute log-probs from the LLM outputs.
- Use verifiability by executing tool calls and checking answers against evidence.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np


@dataclass
class QAItem:
    question: str
    answer: str
    hop: int
    meta: Dict[str, str]


class SearchTool:
    """Deterministic search tool stub.

    It simulates an external search by returning evidence strings based on
    simple tables. The evidence is deterministic, enabling verification.
    """

    def __init__(self, seed: int = 0) -> None:
        random.seed(seed)
        np.random.seed(seed)
        self.entities = [
            "Aldor",
            "Bex",
            "Cyra",
            "Doran",
            "Elios",
            "Fynn",
            "Galen",
            "Hira",
            "Iro",
            "Juno",
        ]
        self.cities = [
            "Luma",
            "Nora",
            "Orin",
            "Pax",
            "Qara",
            "Rin",
            "Sora",
            "Tera",
            "Uma",
            "Vera",
        ]
        self.relations = {
            "born_in": {},
            "capital_of": {},
            "partner_of": {},
        }
        self._init_relations()

    def _init_relations(self) -> None:
        for entity, city in zip(self.entities, self.cities):
            self.relations["born_in"][entity] = city
        for i, city in enumerate(self.cities):
            region = f"Region-{chr(ord('A') + i)}"
            self.relations["capital_of"][city] = region
        for i in range(0, len(self.entities), 2):
            a = self.entities[i]
            b = self.entities[(i + 1) % len(self.entities)]
            self.relations["partner_of"][a] = b
            self.relations["partner_of"][b] = a

    def search(self, query: str) -> str:
        """Return deterministic evidence string for a query."""
        parts = query.split("::")
        if len(parts) != 2:
            return "evidence:none"
        relation, entity = parts
        table = self.relations.get(relation)
        if not table or entity not in table:
            return "evidence:unknown"
        return f"evidence:{relation}({entity})={table[entity]}"


class ProposerPolicy:
    """Discrete proposer policy over hop and template."""

    def __init__(self, max_hop: int = 3, seed: int = 0) -> None:
        rng = np.random.default_rng(seed)
        self.max_hop = max_hop
        self.hop_logits = rng.normal(0.0, 0.01, size=max_hop)
        self.template_logits: Dict[int, np.ndarray] = {}
        self.templates: Dict[int, List[str]] = {
            1: ["born_in", "partner_of"],
            2: ["born_in_then_capital"],
            3: ["partner_born_in_then_capital"],
        }
        for hop, templates in self.templates.items():
            self.template_logits[hop] = rng.normal(0.0, 0.01, size=len(templates))

    def hop_probs(self) -> np.ndarray:
        return softmax(self.hop_logits)

    def template_probs(self, hop: int) -> np.ndarray:
        return softmax(self.template_logits[hop])

    def sample_hop(self) -> int:
        probs = self.hop_probs()
        return int(np.random.choice(np.arange(1, self.max_hop + 1), p=probs))

    def sample_template(self, hop: int) -> Tuple[int, str]:
        probs = self.template_probs(hop)
        idx = int(np.random.choice(np.arange(len(probs)), p=probs))
        return idx, self.templates[hop][idx]

    def generate(self, search_tool: SearchTool) -> QAItem:
        hop = self.sample_hop()
        template_idx, template = self.sample_template(hop)
        entity = random.choice(search_tool.entities)
        meta = {"template": template, "entity": entity}
        if hop == 1:
            if template == "born_in":
                evidence = search_tool.search(f"born_in::{entity}")
                answer = evidence.split("=")[-1]
                question = f"Where was {entity} born?"
            else:
                evidence = search_tool.search(f"partner_of::{entity}")
                answer = evidence.split("=")[-1]
                question = f"Who is the partner of {entity}?"
        elif hop == 2:
            evidence_1 = search_tool.search(f"born_in::{entity}")
            city = evidence_1.split("=")[-1]
            evidence_2 = search_tool.search(f"capital_of::{city}")
            answer = evidence_2.split("=")[-1]
            question = f"{entity} was born in which capital region?"
            meta["bridge"] = city
        else:
            evidence_1 = search_tool.search(f"partner_of::{entity}")
            partner = evidence_1.split("=")[-1]
            evidence_2 = search_tool.search(f"born_in::{partner}")
            city = evidence_2.split("=")[-1]
            evidence_3 = search_tool.search(f"capital_of::{city}")
            answer = evidence_3.split("=")[-1]
            question = f"What region is the birthplace capital of {entity}'s partner?"
            meta["bridge"] = partner
            meta["city"] = city
        return QAItem(question=question, answer=answer, hop=hop, meta=meta)


class SolverPolicy:
    """Stochastic solver with per-hop accuracy parameters."""

    def __init__(self, max_hop: int = 3, seed: int = 0) -> None:
        rng = np.random.default_rng(seed)
        self.max_hop = max_hop
        self.hop_logits = rng.normal(-0.5, 0.1, size=max_hop)

    def prob_correct(self, hop: int) -> float:
        return float(sigmoid(self.hop_logits[hop - 1]))

    def attempt(self, qa: QAItem, search_tool: SearchTool) -> Tuple[str, Dict[str, str]]:
        prob = self.prob_correct(qa.hop)
        correct = np.random.rand() < prob
        trace = {
            "tool_calls": [],
            "notes": [],
        }
        if qa.hop == 1:
            relation = "born_in" if "born" in qa.question else "partner_of"
            trace["tool_calls"].append(search_tool.search(f"{relation}::{qa.meta['entity']}"))
        elif qa.hop == 2:
            trace["tool_calls"].append(search_tool.search(f"born_in::{qa.meta['entity']}"))
            trace["tool_calls"].append(search_tool.search(f"capital_of::{qa.meta['bridge']}"))
        else:
            trace["tool_calls"].append(search_tool.search(f"partner_of::{qa.meta['entity']}"))
            trace["tool_calls"].append(search_tool.search(f"born_in::{qa.meta['bridge']}"))
            trace["tool_calls"].append(search_tool.search(f"capital_of::{qa.meta['city']}"))
        trace["notes"].append(f"hop={qa.hop}")
        if correct:
            return qa.answer, trace
        wrong = random.choice(search_tool.cities + search_tool.entities)
        return wrong, trace


def softmax(logits: np.ndarray) -> np.ndarray:
    exp = np.exp(logits - np.max(logits))
    return exp / np.sum(exp)


def sigmoid(x: np.ndarray | float) -> np.ndarray | float:
    return 1 / (1 + np.exp(-x))


def proposer_reward(k: int, n: int, qa: QAItem) -> float:
    """Difficulty + verifiability reward: best around k=1, penalize extremes."""
    if k == 0 or k == n:
        base = -0.5
    else:
        base = 1.0 - abs(k - 1) / max(1, n - 1)
    format_reward = 0.1 if qa.question and qa.answer and qa.hop >= 1 else -0.1
    return base + format_reward


def kl_categorical(p: np.ndarray, q: np.ndarray) -> float:
    return float(np.sum(p * (np.log(p + 1e-9) - np.log(q + 1e-9))))


def kl_bernoulli(p: float, q: float) -> float:
    return float(
        p * (math.log(p + 1e-9) - math.log(q + 1e-9))
        + (1 - p) * (math.log(1 - p + 1e-9) - math.log(1 - q + 1e-9))
    )


def hrpo_update(
    proposer: ProposerPolicy,
    qas: List[QAItem],
    rewards: List[float],
    lr: float,
    beta: float,
) -> float:
    old_hop_probs = proposer.hop_probs()
    old_template_probs = {h: proposer.template_probs(h) for h in proposer.templates}

    by_hop: Dict[int, List[int]] = {h: [] for h in proposer.templates}
    for idx, qa in enumerate(qas):
        by_hop[qa.hop].append(idx)

    hop_advantages = np.zeros(len(qas))
    for hop, indices in by_hop.items():
        if not indices:
            continue
        hop_rewards = np.array([rewards[i] for i in indices])
        mean = hop_rewards.mean()
        var = hop_rewards.var()
        hop_advantages[indices] = (hop_rewards - mean) / math.sqrt(var + 1e-6)

    for idx, qa in enumerate(qas):
        adv = hop_advantages[idx]
        hop_probs = proposer.hop_probs()
        hop_index = qa.hop - 1
        hop_grad = -hop_probs
        hop_grad[hop_index] += 1.0
        proposer.hop_logits += lr * (adv * hop_grad - beta * (hop_probs - old_hop_probs))

        template_probs = proposer.template_probs(qa.hop)
        template_index = proposer.templates[qa.hop].index(qa.meta["template"])
        template_grad = -template_probs
        template_grad[template_index] += 1.0
        proposer.template_logits[qa.hop] += lr * (
            adv * template_grad - beta * (template_probs - old_template_probs[qa.hop])
        )

    new_hop_probs = proposer.hop_probs()
    hop_kl = kl_categorical(new_hop_probs, old_hop_probs)
    template_kl = 0.0
    for hop, probs in old_template_probs.items():
        template_kl += kl_categorical(proposer.template_probs(hop), probs)
    return hop_kl + template_kl


def grpo_update(
    solver: SolverPolicy,
    qa_attempts: List[Tuple[QAItem, List[int]]],
    lr: float,
    eps: float,
    beta: float,
) -> float:
    old_probs = np.array([solver.prob_correct(h + 1) for h in range(solver.max_hop)])
    for qa, outcomes in qa_attempts:
        outcomes_arr = np.array(outcomes)
        mean = outcomes_arr.mean()
        var = outcomes_arr.var()
        advantages = (outcomes_arr - mean) / math.sqrt(var + 1e-6)
        hop = qa.hop
        logit = solver.hop_logits[hop - 1]
        p = float(sigmoid(logit))
        old_p = old_probs[hop - 1]
        for outcome, adv in zip(outcomes, advantages):
            ratio = (p if outcome == 1 else 1 - p) / (old_p if outcome == 1 else 1 - old_p)
            if adv >= 0:
                ratio_clipped = min(ratio, 1 + eps)
            else:
                ratio_clipped = max(ratio, 1 - eps)
            weight = ratio_clipped * adv
            grad_log_prob = outcome - p
            logit += lr * (weight * grad_log_prob - beta * (p - old_p))
            p = float(sigmoid(logit))
        solver.hop_logits[hop - 1] = logit
    new_probs = np.array([solver.prob_correct(h + 1) for h in range(solver.max_hop)])
    solver_kl = sum(kl_bernoulli(float(n), float(o)) for n, o in zip(new_probs, old_probs))
    return solver_kl


def ascii_bar(dist: np.ndarray, width: int = 30) -> str:
    bars = []
    for val in dist:
        fill = int(round(val * width))
        bars.append("█" * fill + "·" * (width - fill))
    return " | ".join(bars)


def main(
    iterations: int = 30,
    batch_size: int = 64,
    attempts_per_q: int = 4,
    max_hop: int = 3,
    seed: int = 7,
) -> None:
    random.seed(seed)
    np.random.seed(seed)

    search_tool = SearchTool(seed=seed)
    proposer = ProposerPolicy(max_hop=max_hop, seed=seed)
    solver = SolverPolicy(max_hop=max_hop, seed=seed)

    proposer_lr = 0.15
    proposer_beta = 0.1
    solver_lr = 0.2
    solver_eps = 0.2
    solver_beta = 0.05

    for iteration in range(1, iterations + 1):
        qas = [proposer.generate(search_tool) for _ in range(batch_size)]
        hop_counts = np.bincount([qa.hop for qa in qas], minlength=max_hop + 1)[1:]
        hop_dist = hop_counts / hop_counts.sum()

        qa_attempts = []
        rewards = []
        pass_1 = []
        pass_n = []
        hop_acc: Dict[int, List[int]] = {h: [] for h in range(1, max_hop + 1)}

        for qa in qas:
            outcomes = []
            traces = []
            for _ in range(attempts_per_q):
                answer, trace = solver.attempt(qa, search_tool)
                traces.append(trace)
                outcomes.append(int(answer == qa.answer))
            qa_attempts.append((qa, outcomes))
            k = sum(outcomes)
            rewards.append(proposer_reward(k, attempts_per_q, qa))
            pass_1.append(outcomes[0])
            pass_n.append(int(k > 0))
            hop_acc[qa.hop].append(int(k > 0))

        mean_reward = float(np.mean(rewards))
        mean_by_hop = {
            hop: float(np.mean([rewards[i] for i, qa in enumerate(qas) if qa.hop == hop]))
            if any(qa.hop == hop for qa in qas)
            else 0.0
            for hop in range(1, max_hop + 1)
        }

        proposer_kl = hrpo_update(proposer, qas, rewards, proposer_lr, proposer_beta)
        solver_kl = grpo_update(solver, qa_attempts, solver_lr, solver_eps, solver_beta)

        hop_acc_rates = {hop: np.mean(vals) if vals else 0.0 for hop, vals in hop_acc.items()}

        print(f"\nIteration {iteration}")
        print(f"Proposer mean reward: {mean_reward:.3f}")
        print("Proposer mean reward by hop:", ", ".join(
            f"h{hop}={mean_by_hop[hop]:.3f}" for hop in range(1, max_hop + 1)
        ))
        print("Hop distribution:", " ".join(f"h{h}={hop_dist[h-1]:.2f}" for h in range(1, max_hop + 1)))
        print("Hop bars:", ascii_bar(hop_dist))
        print(f"Solver pass@1: {np.mean(pass_1):.2f} | pass@{attempts_per_q}: {np.mean(pass_n):.2f}")
        print("Solver accuracy by hop:", ", ".join(
            f"h{hop}={hop_acc_rates[hop]:.2f}" for hop in range(1, max_hop + 1)
        ))
        print(f"Stability KL - proposer: {proposer_kl:.4f}, solver: {solver_kl:.4f}")


if __name__ == "__main__":
    main()
