"""Privacy-preserving anonymisation helpers.

These utilities support classic k-anonymity and l-diversity measurements
for small, tabular datasets typically exchanged between municipal systems
before ingestion into the Civic Security OS lakehouse. The implementation
uses in-memory data structures to keep the dependency footprint small
while providing deterministic analytics that can be covered by the test
suite.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple


@dataclass
class EquivalenceClass:
    """Represents a bucket for quasi-identifiers."""

    key: Tuple
    records: List[Dict[str, object]]

    @property
    def size(self) -> int:
        return len(self.records)

    @property
    def sensitive_values(self) -> Counter:
        counter: Counter = Counter()
        for record in self.records:
            for k, v in record.items():
                counter[(k, v)] += 1
        return counter


def build_equivalence_classes(
    dataset: Sequence[Dict[str, object]],
    quasi_identifiers: Sequence[str],
) -> List[EquivalenceClass]:
    buckets: Dict[Tuple, List[Dict[str, object]]] = defaultdict(list)
    for row in dataset:
        key = tuple(row.get(q) for q in quasi_identifiers)
        buckets[key].append(row)
    return [EquivalenceClass(key=k, records=v) for k, v in buckets.items()]


def satisfies_k_anonymity(
    dataset: Sequence[Dict[str, object]],
    quasi_identifiers: Sequence[str],
    k: int,
) -> bool:
    for eq_class in build_equivalence_classes(dataset, quasi_identifiers):
        if eq_class.size < k:
            return False
    return True


def satisfies_l_diversity(
    dataset: Sequence[Dict[str, object]],
    quasi_identifiers: Sequence[str],
    sensitive_attribute: str,
    l: int,
) -> bool:
    for eq_class in build_equivalence_classes(dataset, quasi_identifiers):
        sensitive_values = {record.get(sensitive_attribute) for record in eq_class.records}
        if len(sensitive_values) < l:
            return False
    return True


__all__ = [
    "EquivalenceClass",
    "build_equivalence_classes",
    "satisfies_k_anonymity",
    "satisfies_l_diversity",
]
