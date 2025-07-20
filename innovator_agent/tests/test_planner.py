from innovator_agent.planner import parse_command


def test_parse_fallback():
    color, target = parse_command("move the red block to the left")
    assert color == "red"
    assert target == "left"
