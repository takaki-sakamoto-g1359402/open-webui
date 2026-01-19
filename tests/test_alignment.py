from agent.db import ensure_identity, ensure_models, get_connection, init_db
from agent.llm import MockLLMClient
from agent.system3 import Plan, System3Agent


def test_alignment_checker_blocks_harmful_plan(tmp_path):
    conn = get_connection(tmp_path / "test.db")
    init_db(conn)
    ensure_identity(conn)
    ensure_models(conn)
    agent = System3Agent(conn, MockLLMClient())

    plan = Plan(title="Bad plan", steps=["Do harm"], estimated_steps=1)
    aligned, reasons = agent.check_alignment(plan)
    assert not aligned
    assert reasons
