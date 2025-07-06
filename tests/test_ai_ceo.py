import importlib.util
from pathlib import Path
import types
import sys
import importlib
import pytest

BACKEND = Path(__file__).resolve().parents[1] / "backend"

pkg = types.ModuleType("ai_ceo")
pkg.__path__ = []
sys.modules["ai_ceo"] = pkg

spec = importlib.util.spec_from_file_location(
    "ai_ceo.investment", BACKEND / "open_webui" / "ai_ceo" / "investment.py"
)
investment = importlib.util.module_from_spec(spec)
sys.modules["ai_ceo.investment"] = investment
spec.loader.exec_module(investment)

spec = importlib.util.spec_from_file_location(
    "ai_ceo.horizon", BACKEND / "open_webui" / "ai_ceo" / "horizon.py"
)
horizon = importlib.util.module_from_spec(spec)
sys.modules["ai_ceo.horizon"] = horizon
spec.loader.exec_module(horizon)

spec = importlib.util.spec_from_file_location(
    "ai_ceo.rules", BACKEND / "open_webui" / "ai_ceo" / "rules.py"
)
rules_mod = importlib.util.module_from_spec(spec)
sys.modules["ai_ceo.rules"] = rules_mod
spec.loader.exec_module(rules_mod)

spec = importlib.util.spec_from_file_location(
    "ai_ceo.config", BACKEND / "open_webui" / "ai_ceo" / "config.py"
)
config = importlib.util.module_from_spec(spec)
sys.modules["ai_ceo.config"] = config
spec.loader.exec_module(config)

load_config = config.load_config
generate_strategy = horizon.generate_strategy
Investment = investment.Investment
evaluate_investment = investment.evaluate_investment
apply_rules = rules_mod.apply_rules
Rule = rules_mod.Rule


def test_ai_ceo_workflow():
    if importlib.util.find_spec("yaml") is None:
        pytest.skip("PyYAML not installed")

    cfg = load_config("backend/open_webui/ai_ceo/config-example.yaml")
    strategy = generate_strategy(cfg.goals, cfg.horizons)
    assert strategy

    score = evaluate_investment(
        Investment(irr=0.1, alignment=0.8, risk=0.2), cfg.investment_weights
    )
    context = {"strategy": strategy, "score": score}
    apply_rules(context, cfg.rules)
    assert "decision" in context
