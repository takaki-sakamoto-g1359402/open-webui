from hmos.connectors.http_api import HttpApiConnector
from hmos.storage import Storage


def test_idempotency_cache_hit(tmp_path, monkeypatch) -> None:
    db_path = tmp_path / "hmos.db"
    storage = Storage(str(db_path))
    connector = HttpApiConnector(storage, ("example.com",))
    storage.store_idempotency_result("http_api", "key", {"status_code": 200})

    def fail_request(*args, **kwargs):
        raise AssertionError("Should not be called")

    monkeypatch.setattr("hmos.connectors.http_api.requests.request", fail_request)

    result = connector.execute({"url": "https://example.com/test", "method": "GET", "idempotency_key": "key"})
    assert result.status == "cached"
    assert result.output["status_code"] == 200
