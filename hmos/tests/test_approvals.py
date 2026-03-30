from hmos.approvals import ApprovalRequest, create_approval, has_approval
from hmos.storage import Storage


def test_create_approval(tmp_path) -> None:
    db_path = tmp_path / "hmos.db"
    storage = Storage(str(db_path))
    approval_id = create_approval(
        storage,
        ApprovalRequest(
            run_id="run",
            step_id="step",
            summary="summary",
            destination="http_api",
            payload_hash="hash",
        ),
    )
    assert approval_id
    assert has_approval(storage, "step")
