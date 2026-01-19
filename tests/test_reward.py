from agent.reward import RewardEngine


def test_reward_computation_success():
    engine = RewardEngine("reliable assistant")
    reward = engine.compute(success=True, task="assistant task", steps_used=2, reused_trace=False)
    assert reward.extrinsic == 1.0
    assert reward.mastery <= 1.0
