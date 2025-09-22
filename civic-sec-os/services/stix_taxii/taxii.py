"""Minimal STIX/TAXII helpers."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Iterable, List


def create_indicator(*, ioc: str, technique_id: str, description: str) -> Dict[str, object]:
    return {
        "type": "indicator",
        "spec_version": "2.1",
        "id": f"indicator--{abs(hash(ioc))}",
        "created": datetime.utcnow().isoformat() + "Z",
        "modified": datetime.utcnow().isoformat() + "Z",
        "pattern": f"[file:hashes.'SHA-256' = '{ioc}']",
        "description": description,
        "labels": ["malicious-activity"],
        "x_mitre_attack_technique": technique_id,
    }


def create_bundle(objects: Iterable[Dict[str, object]]) -> Dict[str, object]:
    items = list(objects)
    object_ids = tuple(obj.get("id", str(idx)) for idx, obj in enumerate(items))
    return {
        "type": "bundle",
        "id": f"bundle--{abs(hash(object_ids))}",
        "spec_version": "2.1",
        "objects": items,
    }


def map_iocs_to_attack(indicators: Iterable[Dict[str, object]]) -> Dict[str, List[str]]:
    mapping: Dict[str, List[str]] = {}
    for indicator in indicators:
        technique = indicator.get("x_mitre_attack_technique")
        if technique:
            mapping.setdefault(technique, []).append(indicator["id"])
    return mapping


@dataclass
class TaxiiCollection:
    title: str
    objects: List[Dict[str, object]] = field(default_factory=list)

    def push(self, bundle: Dict[str, object]) -> None:
        for obj in bundle.get("objects", []):
            self.objects.append(obj)

    def pull(self) -> Dict[str, object]:
        return create_bundle(self.objects)


__all__ = ["create_indicator", "create_bundle", "map_iocs_to_attack", "TaxiiCollection"]
