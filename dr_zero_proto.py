#!/usr/bin/env python3
"""
Dr. Zero Prototype: Self-Evolving Search Agents without Training Data
====================================================================

Run:
  python dr_zero_proto.py

This single-file prototype implements a minimal self-evolution loop with:
- Proposer/Solver co-training
- Hop grouping + HRPO (Proposer)
- GRPO (Solver)
- Difficulty + verifiability rewards
- Deterministic SearchToolStub
"""

from __future__ import annotations

import argparse
import random
from collections import Counter, deque, defaultdict
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np


# -----------------------------
# Search Tool Stub + Corpus
# -----------------------------


@dataclass(frozen=True)
class Snippet:
    sid: str
    title: str
    text: str
    entities: Tuple[str, ...]


class SearchToolStub:
    """Deterministic search over a small synthetic corpus."""

    def __init__(self, seed: int = 42) -> None:
        self.rng = random.Random(seed)
        self._snippets = self._build_corpus()

    def _build_corpus(self) -> List[Snippet]:
        rng = self.rng
        persons = ["Ava", "Ben", "Cleo", "Dax", "Eli", "Faye"]
        companies = ["NimbleWorks", "Aurora Labs", "Zenith Corp", "Quanta LLC"]
        products = ["HelioPhone", "NebulaOS", "FluxDrive", "EchoLens"]
        cities = ["Seattle", "Austin", "Toronto", "Berlin"]
        years = ["2017", "2018", "2019", "2020"]

        rng.shuffle(persons)
        rng.shuffle(companies)
        rng.shuffle(products)
        rng.shuffle(cities)
        rng.shuffle(years)

        person_to_company = {
            p: companies[i % len(companies)] for i, p in enumerate(persons)
        }
        company_to_product = {
            c: products[i % len(products)] for i, c in enumerate(companies)
        }
        product_to_year = {
            p: years[i % len(years)] for i, p in enumerate(products)
        }
        person_to_city = {
            p: cities[i % len(cities)] for i, p in enumerate(persons)
        }

        snippets: List[Snippet] = []
        sid = 0

        for person in persons:
            company = person_to_company[person]
            city = person_to_city[person]
            snippets.append(
                Snippet(
                    sid=str(sid),
                    title=f"{person} profile",
                    text=f"{person} works at {company} in {city}.",
                    entities=(person, company, city),
                )
            )
            sid += 1

        for company in companies:
            product = company_to_product[company]
            snippets.append(
                Snippet(
                    sid=str(sid),
                    title=f"{company} overview",
                    text=f"{company} makes {product}.",
                    entities=(company, product),
                )
            )
            sid += 1

        for product in products:
            year = product_to_year[product]
            snippets.append(
                Snippet(
                    sid=str(sid),
                    title=f"{product} release",
                    text=f"{product} was released in {year}.",
                    entities=(product, year),
                )
            )
            sid += 1

        for city in cities:
            snippets.append(
                Snippet(
                    sid=str(sid),
                    title=f"{city} facts",
                    text=f"{city} is a tech hub.",
                    entities=(city,),
                )
            )
            sid += 1

        return snippets

    def search(self, query: str, k: int = 5) -> List[Snippet]:
        """Return snippets with keyword matches (deterministic)."""
        keywords = {w.lower() for w in query.replace("?", "").split() if w}
        scored: List[Tuple[int, Snippet]] = []
        for snip in self._snippets:
            text = f"{snip.title} {snip.text}".lower()
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                scored.append((score, snip))
        scored.sort(key=lambda x: (-x[0], x[1].sid))
        return [snip for _, snip in scored[:k]]


# -----------------------------
# Hop Grouper
# -----------------------------


class HopEstimator:
    """Assign hop groups based on metadata or observed calls."""

    def estimate(self, question: "Question", tool_calls: int | None = None) -> int:
        if question.hop_group:
            return question.hop_group
        if tool_calls is not None:
            return max(1, min(3, tool_calls))
        return 1


# -----------------------------
# Proposer Policy (HRPO)
# -----------------------------


@dataclass
class Question:
    text: str
    answer: str
    hop_group: int
    chain_entities: Tuple[str, ...]
    template_id: str
    signature: str
    meta: Dict[str, str]


class ProposerPolicy:
    """Template-based question generator with HRPO updates."""

    def __init__(self, rng: np.random.Generator, templates: Dict[str, dict]):
        self.rng = rng
        self.templates = templates
        self.logits = {tid: 0.0 for tid in templates}
        self.baseline_by_hop = defaultdict(float)
        self.recent_signatures = deque(maxlen=50)

    def _softmax(self) -> Dict[str, float]:
        keys = list(self.logits)
        vals = np.array([self.logits[k] for k in keys], dtype=np.float64)
        vals -= vals.max()
        probs = np.exp(vals)
        probs /= probs.sum()
        return {k: float(p) for k, p in zip(keys, probs)}

    def generate(self) -> Question:
        probs = self._softmax()
        template_id = self._sample(probs)
        template = self.templates[template_id]
        data = template["sample_fn"](self.rng)
        question = template["format_fn"](data)

        signature = f"{template_id}|{'|'.join(data['chain'])}"
        return Question(
            text=question,
            answer=data["answer"],
            hop_group=data["hop"],
            chain_entities=tuple(data["chain"]),
            template_id=template_id,
            signature=signature,
            meta=data,
        )

    def update(self, question: Question, reward: float, lr: float = 0.1) -> float:
        hop = question.hop_group
        baseline = self.baseline_by_hop[hop]
        advantage = reward - baseline
        self.logits[question.template_id] += lr * advantage
        self.baseline_by_hop[hop] = 0.9 * baseline + 0.1 * reward
        self.recent_signatures.append(question.signature)
        return advantage

    def duplicate_rate(self) -> float:
        if not self.recent_signatures:
            return 0.0
        counts = Counter(self.recent_signatures)
        duplicates = sum(c - 1 for c in counts.values() if c > 1)
        return duplicates / len(self.recent_signatures)

    def is_duplicate(self, question: Question) -> bool:
        return question.signature in self.recent_signatures

    def _sample(self, probs: Dict[str, float]) -> str:
        keys = list(probs)
        values = np.array([probs[k] for k in keys], dtype=np.float64)
        return str(self.rng.choice(keys, p=values))


# -----------------------------
# Solver Policy (GRPO)
# -----------------------------


@dataclass
class SolverResult:
    answer: str
    evidence_ids: List[str]
    tool_calls: int
    trajectory: List[str]


class SolverPolicy:
    def __init__(self, rng: np.random.Generator):
        self.rng = rng
        self.logits_calls = np.zeros(3, dtype=np.float64)  # 1-3 calls
        self.logits_query = np.zeros(2, dtype=np.float64)  # entity vs relation
        self.logits_chain = np.zeros(2, dtype=np.float64)  # no chain / chain

    def act(self) -> Dict[str, int]:
        max_calls = 1 + self._sample(self.logits_calls)
        query_style = self._sample(self.logits_query)  # 0 entity, 1 relation
        chain_flag = self._sample(self.logits_chain)  # 0 no chain, 1 chain
        return {"max_calls": max_calls, "query_style": query_style, "chain": chain_flag}

    def rollout(self, question: Question, tool: SearchToolStub, decision: Dict[str, int]) -> SolverResult:
        max_calls = decision["max_calls"]
        query_style = decision["query_style"]
        chain_flag = decision["chain"]

        evidence_ids: List[str] = []
        trajectory: List[str] = []
        current_entity = question.chain_entities[0]
        found_answer = ""

        for step in range(max_calls):
            if query_style == 0:
                query = current_entity
            else:
                query = f"{current_entity} related"
            trajectory.append(query)
            results = tool.search(query)
            if results:
                evidence_ids.append(results[0].sid)
                snippet_entities = results[0].entities
                # Try to chain to next entity
                if chain_flag == 1 and step + 1 < len(question.chain_entities):
                    target = question.chain_entities[step + 1]
                    if target in snippet_entities:
                        current_entity = target
                if question.answer in results[0].text:
                    found_answer = question.answer
            if found_answer:
                break

        return SolverResult(
            answer=found_answer or "unknown",
            evidence_ids=evidence_ids,
            tool_calls=len(trajectory),
            trajectory=trajectory,
        )

    def update(self, choices: List[Dict[str, int]], advantages: List[float], lr: float = 0.1) -> None:
        for choice, adv in zip(choices, advantages):
            self.logits_calls[choice["max_calls"] - 1] += lr * adv
            self.logits_query[choice["query_style"]] += lr * adv
            self.logits_chain[choice["chain"]] += lr * adv

    def _sample(self, logits: np.ndarray) -> int:
        vals = logits - logits.max()
        probs = np.exp(vals)
        probs /= probs.sum()
        return int(self.rng.choice(len(probs), p=probs))


# -----------------------------
# Verifier
# -----------------------------


@dataclass
class RewardBundle:
    solver_reward: float
    proposer_reward: float
    success: bool
    verifiable: bool


class Verifier:
    def __init__(self, tool: SearchToolStub):
        self.tool = tool

    def score(self, question: Question, result: SolverResult, difficulty: float, dup_penalty: float) -> RewardBundle:
        evidence_text = " ".join(
            self._snippet_by_id(sid).text for sid in result.evidence_ids if self._snippet_by_id(sid)
        )
        verifiable = question.answer in evidence_text
        success = result.answer == question.answer and verifiable

        solver_reward = (1.0 if success else 0.0) - 0.05 * result.tool_calls
        solver_reward = max(-1.0, solver_reward)

        solvability = 1.0 if success else 0.2 if verifiable else 0.0
        proposer_reward = difficulty * (1.0 if verifiable else 0.2) * solvability
        proposer_reward -= dup_penalty

        return RewardBundle(
            solver_reward=solver_reward,
            proposer_reward=proposer_reward,
            success=success,
            verifiable=verifiable,
        )

    def _snippet_by_id(self, sid: str) -> Snippet | None:
        for snip in self.tool._snippets:
            if snip.sid == sid:
                return snip
        return None


# -----------------------------
# Trainer / Loop
# -----------------------------


class Trainer:
    def __init__(self, steps: int = 200, seed: int = 7, rollouts: int = 3) -> None:
        self.steps = steps
        self.seed = seed
        self.rollouts = rollouts
        self.rng = np.random.default_rng(seed)
        self.tool = SearchToolStub(seed=seed)
        self.hop_estimator = HopEstimator()
        self.templates = self._build_templates()
        self.proposer = ProposerPolicy(self.rng, self.templates)
        self.solver = SolverPolicy(self.rng)
        self.verifier = Verifier(self.tool)

        self.hop_stats = Counter()
        self.success_stats = Counter()
        self.tool_call_sum = Counter()
        self.reward_by_hop: Dict[int, List[float]] = defaultdict(list)
        self.solver_pass_by_hop: Dict[int, List[int]] = defaultdict(list)
        self.solver_success_window: Dict[int, deque] = defaultdict(lambda: deque(maxlen=50))

    def _build_templates(self) -> Dict[str, dict]:
        person_to_company = {
            snip.entities[0]: snip.entities[1]
            for snip in self.tool._snippets
            if "works at" in snip.text
        }
        persons = sorted(person_to_company.keys())
        companies = sorted(person_to_company.values())
        products = sorted({snip.entities[1] for snip in self.tool._snippets if "makes" in snip.text})
        company_to_product = {
            snip.entities[0]: snip.entities[1]
            for snip in self.tool._snippets
            if "makes" in snip.text
        }
        product_to_year = {
            snip.entities[0]: snip.entities[1]
            for snip in self.tool._snippets
            if "released" in snip.text
        }

        def sample_person(rng: np.random.Generator) -> dict:
            person = rng.choice(persons)
            company = person_to_company[person]
            return {
                "question": f"What company does {person} work at?",
                "answer": company,
                "chain": [person],
                "hop": 1,
            }

        def sample_product_year(rng: np.random.Generator) -> dict:
            product = rng.choice(products)
            year = product_to_year[product]
            return {
                "question": f"In what year was {product} released?",
                "answer": year,
                "chain": [product],
                "hop": 1,
            }

        def sample_person_product(rng: np.random.Generator) -> dict:
            person = rng.choice(persons)
            company = person_to_company[person]
            product = company_to_product[company]
            return {
                "question": f"What product is made by the company where {person} works?",
                "answer": product,
                "chain": [person, company],
                "hop": 2,
            }

        def sample_person_product_year(rng: np.random.Generator) -> dict:
            person = rng.choice(persons)
            company = person_to_company[person]
            product = company_to_product[company]
            year = product_to_year[product]
            return {
                "question": (
                    "In what year was the product made by the company where "
                    f"{person} works released?"
                ),
                "answer": year,
                "chain": [person, company, product],
                "hop": 3,
            }

        templates = {
            "work_company": {
                "sample_fn": sample_person,
                "format_fn": lambda d: d["question"],
            },
            "product_year": {
                "sample_fn": sample_product_year,
                "format_fn": lambda d: d["question"],
            },
            "person_product": {
                "sample_fn": sample_person_product,
                "format_fn": lambda d: d["question"],
            },
            "person_product_year": {
                "sample_fn": sample_person_product_year,
                "format_fn": lambda d: d["question"],
            },
        }
        return templates

    def _difficulty_score(self, hop: int) -> float:
        window = self.solver_success_window[hop]
        if not window:
            return 0.5
        rate = sum(window) / len(window)
        target = 0.6
        score = 1.0 - min(1.0, abs(rate - target) / target)
        return max(0.0, score)

    def run(self) -> None:
        for step in range(1, self.steps + 1):
            question = self.proposer.generate()
            hop = self.hop_estimator.estimate(question)
            self.hop_stats[hop] += 1

            rollout_results: List[SolverResult] = []
            rollout_choices: List[Dict[str, int]] = []
            solver_rewards: List[float] = []

            for _ in range(self.rollouts):
                choice = self.solver.act()
                rollout_choices.append(choice)
                result = self.solver.rollout(question, self.tool, choice)
                difficulty = self._difficulty_score(hop)
                dup_penalty = 0.2 if self.proposer.is_duplicate(question) else 0.0
                reward = self.verifier.score(question, result, difficulty, dup_penalty)
                rollout_results.append(result)
                solver_rewards.append(reward.solver_reward)

            mean_reward = float(np.mean(solver_rewards))
            advantages = [r - mean_reward for r in solver_rewards]
            self.solver.update(rollout_choices, advantages)

            best_idx = int(np.argmax(solver_rewards))
            best_result = rollout_results[best_idx]
            difficulty = self._difficulty_score(hop)
            dup_penalty = 0.2 if self.proposer.is_duplicate(question) else 0.0
            reward_bundle = self.verifier.score(question, best_result, difficulty, dup_penalty)
            self.proposer.update(question, reward_bundle.proposer_reward)

            self.reward_by_hop[hop].append(reward_bundle.proposer_reward)
            self.solver_pass_by_hop[hop].append(1 if reward_bundle.success else 0)
            self.solver_success_window[hop].append(1 if reward_bundle.success else 0)
            self.tool_call_sum[hop] += best_result.tool_calls
            if reward_bundle.success:
                self.success_stats[hop] += 1

            if step % 25 == 0 or step == 1:
                self._log_step(step)

        self._log_summary()

    def _log_step(self, step: int) -> None:
        print(f"\nStep {step}")
        for hop in sorted(self.hop_stats):
            rewards = self.reward_by_hop[hop]
            reward_mean = np.mean(rewards) if rewards else 0.0
            reward_std = np.std(rewards) if rewards else 0.0
            pass_rate = np.mean(self.solver_pass_by_hop[hop]) if self.solver_pass_by_hop[hop] else 0.0
            avg_calls = self.tool_call_sum[hop] / max(1, self.hop_stats[hop])
            print(
                f"  Hop {hop}: reward {reward_mean:.3f}±{reward_std:.3f}, "
                f"pass {pass_rate:.2f}, avg calls {avg_calls:.2f}"
            )
        print(f"  Hop distribution: {dict(self.hop_stats)}")
        print(f"  Duplicate rate (recent): {self.proposer.duplicate_rate():.2f}")

    def _log_summary(self) -> None:
        print("\n=== Summary ===")
        total_questions = sum(self.hop_stats.values())
        for hop in sorted(self.hop_stats):
            count = self.hop_stats[hop]
            pass_rate = self.success_stats[hop] / max(1, count)
            avg_calls = self.tool_call_sum[hop] / max(1, count)
            print(
                f"Hop {hop}: {count}/{total_questions} questions, "
                f"pass rate {pass_rate:.2f}, avg calls {avg_calls:.2f}"
            )
        print(f"Overall duplicate rate: {self.proposer.duplicate_rate():.2f}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Dr. Zero prototype (no training data)")
    parser.add_argument("--steps", type=int, default=200)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--rollouts", type=int, default=3)
    args = parser.parse_args()

    trainer = Trainer(steps=args.steps, seed=args.seed, rollouts=args.rollouts)
    trainer.run()


if __name__ == "__main__":
    main()
