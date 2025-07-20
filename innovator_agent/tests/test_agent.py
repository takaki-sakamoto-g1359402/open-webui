import types
from innovator_agent.agent import InnovatorAgent


def test_agent_run(monkeypatch):
    agent = InnovatorAgent()

    def fake_execute(self, color, target):
        return True

    monkeypatch.setattr(InnovatorAgent, "execute", fake_execute)
    monkeypatch.setattr(InnovatorAgent, "observe", lambda self: None)

    res = agent.run("move red block left")
    assert res is True
    agent.shutdown()
