from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, Optional

from .models import PlanTier


@dataclass
class AccessConfig:
    plan: PlanTier = PlanTier.STANDARD
    enabled_functions: Iterable[str] = field(
        default_factory=lambda: ["portfolio_optimization", "vqe_ground_state_energy"]
    )

    @classmethod
    def from_dict(cls, data: Dict) -> "AccessConfig":
        plan_value = PlanTier(data.get("plan", PlanTier.STANDARD))
        functions = data.get("enabled_functions", [])
        return cls(plan=plan_value, enabled_functions=functions)

    @classmethod
    def load(cls, path: Optional[str]) -> "AccessConfig":
        if not path:
            return cls()
        config_path = Path(path)
        if not config_path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        if config_path.suffix in {".yml", ".yaml"}:
            try:
                import yaml  # type: ignore
            except ImportError as exc:  # pragma: no cover - optional dependency
                raise RuntimeError("PyYAML is required to load YAML configs") from exc
            with open(config_path, "r", encoding="utf-8") as handle:
                raw = yaml.safe_load(handle) or {}
        else:
            with open(config_path, "r", encoding="utf-8") as handle:
                raw = json.load(handle)
        return cls.from_dict(raw)

    def is_function_enabled(self, function_name: str) -> bool:
        if self.plan == PlanTier.PREMIUM:
            return True
        return function_name in set(self.enabled_functions)
