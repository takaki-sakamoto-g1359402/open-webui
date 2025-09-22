from demo_runner import run_demo


def test_demo_succeeds():
    result = run_demo()
    assert result["decision"] == "allow"
    assert result["taxii_objects"] == 1
    assert result["isochrone_points"] == 36
