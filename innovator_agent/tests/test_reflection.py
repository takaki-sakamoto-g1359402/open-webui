from innovator_agent.reflection import (
    init_db,
    store_episode,
    latest_suggestion,
    Episode,
    store_policy,
    best_policy,
)
import os


def test_store_and_suggestion(tmp_path):
    os.chdir(tmp_path)
    init_db()
    store_episode(Episode("obs", "act", False))
    assert latest_suggestion() == "次はグリッパ速度+10%"


def test_policy_storage(tmp_path):
    os.chdir(tmp_path)
    init_db()
    store_policy("r1", 0.5, [1, 0, 0, 0])
    store_policy("r2", 1.0, [2, 0, 0, 0])
    assert best_policy() == [2.0, 0.0, 0.0, 0.0]
