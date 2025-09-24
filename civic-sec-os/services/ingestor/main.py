"""Ingest facade for Civic Security OS."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class SchemaDefinition:
    name: str
    version: str
    fields: Dict[str, str]


@dataclass
class IngestEvent:
    source: str
    payload: Dict[str, object]
    received_at: datetime = field(default_factory=datetime.utcnow)

    def normalized(self, schema: SchemaDefinition) -> Dict[str, object]:
        normalized_payload = {field: self.payload.get(field) for field in schema.fields}
        normalized_payload["_schema_version"] = schema.version
        normalized_payload["_source"] = self.source
        normalized_payload["_received_at"] = self.received_at.isoformat() + "Z"
        return normalized_payload


class SchemaRegistry:
    def __init__(self) -> None:
        self._schemas: Dict[str, SchemaDefinition] = {}

    def register(self, schema: SchemaDefinition) -> None:
        key = f"{schema.name}:{schema.version}"
        self._schemas[key] = schema

    def resolve(self, name: str, version: Optional[str] = None) -> SchemaDefinition:
        if version is not None:
            key = f"{name}:{version}"
            if key not in self._schemas:
                raise KeyError(f"schema {key} not registered")
            return self._schemas[key]
        candidates = [schema for schema in self._schemas.values() if schema.name == name]
        if not candidates:
            raise KeyError(f"schema {name} not registered")
        return sorted(candidates, key=lambda s: s.version)[-1]


class IngestorService:
    def __init__(self, registry: SchemaRegistry | None = None) -> None:
        self.registry = registry or SchemaRegistry()
        self.events: List[Dict[str, object]] = []

    def register_schema(self, name: str, version: str, fields: Dict[str, str]) -> None:
        self.registry.register(SchemaDefinition(name=name, version=version, fields=fields))

    def ingest(self, source: str, schema_name: str, payload: Dict[str, object]) -> Dict[str, object]:
        schema = self.registry.resolve(schema_name)
        event = IngestEvent(source=source, payload=payload)
        normalized = event.normalized(schema)
        self.events.append(normalized)
        return normalized

    def export(self) -> str:
        return json.dumps(self.events, indent=2)


__all__ = [
    "SchemaRegistry",
    "SchemaDefinition",
    "IngestEvent",
    "IngestorService",
]
