"""Voting aggregator."""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Callable, Dict, Tuple

from mdap.red_flagger import CandidateNormalizer, RedFlagResult


@dataclass
class VotingOutcome:
    winner: dict | None
    rounds: int
    tallies: Dict[Tuple, int]
    invalid_candidates: int
    reason: str | None = None


@dataclass
class VotingAggregator:
    samples_per_round: int
    max_rounds: int
    ahead_k: int
    simple_k: int
    use_ahead_mode: bool = True
    normalizer: CandidateNormalizer = field(default_factory=CandidateNormalizer)

    def run(
        self,
        sample_fn: Callable[[], tuple[dict | None, RedFlagResult]],
    ) -> VotingOutcome:
        tallies: Counter = Counter()
        rounds = 0
        invalid = 0
        while rounds < self.max_rounds:
            rounds += 1
            for _ in range(self.samples_per_round):
                action, flag_result = sample_fn()
                if not flag_result.ok or action is None:
                    invalid += 1
                    continue
                key = self.normalizer.canonical_key(action)
                tallies[key] += 1
                if self._has_winner(tallies):
                    winner_key = max(tallies.items(), key=lambda kv: kv[1])[0]
                    winner = self._action_from_key(winner_key)
                    return VotingOutcome(winner, rounds, dict(tallies), invalid)
        return VotingOutcome(None, rounds, dict(tallies), invalid, reason="no consensus")

    def _has_winner(self, tallies: Counter) -> bool:
        if not tallies:
            return False
        leader, leader_votes = tallies.most_common(1)[0]
        if self.use_ahead_mode:
            runner_up_votes = 0
            if len(tallies) > 1:
                runner_up_votes = tallies.most_common(2)[1][1]
            return leader_votes - runner_up_votes >= self.ahead_k
        else:
            return leader_votes >= self.simple_k

    def _action_from_key(self, key: Tuple) -> dict:
        op, value, direction = key
        action = {"operation": op}
        if value is not None:
            action["value"] = value
        if direction is not None:
            action["direction"] = direction
        return action
