"""Dynamic organization rules (if/then)."""
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List


@dataclass
class Rule:
    condition: str
    action: str


def apply_rules(context: Dict[str, Any], rules: Iterable[Rule]) -> List[str]:
    """Apply if/then style rules to a context dict.

    Parameters
    ----------
    context: Dict[str, Any]
        Arbitrary context.
    rules: Iterable[Rule]
        Rules with Python expressions.

    Returns
    -------
    List[str]
        List of executed actions for logging purposes.
    """
    actions = []
    safe_globals = {"__builtins__": {}}
    for rule in rules:
        try:
            if eval(rule.condition, safe_globals, context):
                exec(rule.action, safe_globals, context)
                actions.append(rule.action)
        except Exception:
            actions.append(f"Failed: {rule.action}")
    return actions
