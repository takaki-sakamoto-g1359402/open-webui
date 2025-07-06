"""YAML configuration management for AI CEO."""
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Iterable, Dict
from ast import literal_eval

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover - fallback minimal loader
    yaml = None
from .investment import Investment
from .rules import Rule


@dataclass
class AIConfig:
    goals: Iterable[str]
    horizons: List[int]
    investment_weights: Dict[str, float] = field(default_factory=lambda: {"irr": 1.0, "alignment": 1.0, "risk": 1.0})
    sample_investment: Investment | None = None
    rules: List[Rule] = field(default_factory=list)
    prompt_template: str = ""


def load_config(path: str | Path) -> AIConfig:
    text = Path(path).read_text()
    if yaml:
        data = yaml.safe_load(text)
    else:  # minimal YAML subset parser for config-example.yaml like files
        data = {}
        current_key = None
        for raw in text.splitlines():
            if not raw.strip() or raw.strip().startswith("#"):
                continue
            if raw.lstrip().startswith("- "):
                item = raw.lstrip()[2:]
                if current_key == "rules" and ":" in item:
                    key, val = item.split(":", 1)
                    if key.strip() == "condition":
                        data.setdefault("rules", []).append({"condition": val.strip().strip("'\"")})
                    else:
                        data.setdefault("rules", []).append({key.strip(): val.strip().strip("'\"")})
                else:
                    try:
                        value = literal_eval(item)
                    except Exception:
                        value = item.strip("'\"")
                    if isinstance(data.get(current_key), list):
                        data[current_key].append(value)
                    else:
                        data[current_key] = [value]
                continue

            if ":" in raw:
                key, value = raw.split(":", 1)
                key = key.strip()
                value = value.strip()
                if value == "":
                    current_key = key
                    data[current_key] = []
                else:
                    try:
                        val = literal_eval(value)
                    except Exception:
                        if value.startswith("[") and value.endswith("]"):
                            val = [literal_eval(v.strip()) for v in value[1:-1].split(",") if v.strip()]
                        else:
                            val = value.strip("'\"")
                    data[key] = val
                    current_key = key
    sample_inv = None
    if "sample_investment" in data:
        si = data["sample_investment"]
        sample_inv = Investment(
            irr=float(si.get("irr", 0)),
            alignment=float(si.get("alignment", 0)),
            risk=float(si.get("risk", 0)),
        )
    rules = [Rule(**r) for r in data.get("rules", [])]
    return AIConfig(
        goals=data.get("goals", []),
        horizons=[int(h) for h in data.get("horizons", [])],
        investment_weights={k: float(v) for k, v in data.get("investment_weights", {}).items()},
        sample_investment=sample_inv,
        rules=rules,
        prompt_template=data.get("prompt_template", ""),
    )
