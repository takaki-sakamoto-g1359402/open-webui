from agent.db import init_db, get_connection
from agent.memory import EpisodicMemory


def test_memory_save_and_retrieve(tmp_path):
    conn = get_connection(tmp_path / "test.db")
    init_db(conn)
    memory = EpisodicMemory(conn)

    memory.save_episode(
        user_context="cli",
        task="calculate budget",
        plan="plan",
        thought_trace="trace",
        outcome="done",
        reward_signals={"extrinsic": 1},
        episode_summary="budget calculation complete",
        episode_detail="detail",
    )

    results = memory.retrieve_similar("calculate budget", "cli", k=1)
    assert results
    assert "budget" in results[0].summary
