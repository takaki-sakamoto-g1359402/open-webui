def test_one_way_guard(tmp_path):
    from cds_gateway.gateway import OneWayGuard

    guard = OneWayGuard(tmp_path)
    guard.transfer(b"hello", filename="test.bin", content_type="application/octet-stream")
    files = list(tmp_path.glob("*"))
    assert files
    assert guard.verify_unidirectional()
