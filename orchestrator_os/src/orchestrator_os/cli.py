from __future__ import annotations

import json

import typer

from orchestrator_os.core.models import TaskRequest
from orchestrator_os.core.orchestrator import build_runtime
from orchestrator_os.storage.approval_store import ApprovalStore
from orchestrator_os.storage.audit_store import AuditStore

app = typer.Typer(no_args_is_help=True)
approvals_app = typer.Typer(no_args_is_help=True)
app.add_typer(approvals_app, name="approvals")

runtime = build_runtime()
audit_store = AuditStore()
approval_store = ApprovalStore()


@app.command()
def run(goal: str = typer.Option(..., "--goal")) -> None:
    result = runtime.run(TaskRequest(goal=goal))
    typer.echo(result.model_dump_json(indent=2))


@app.command()
def status(task_id: str) -> None:
    typer.echo(runtime.get_task(task_id).model_dump_json(indent=2))


@app.command("verify-audit")
def verify_audit(task_id: str) -> None:
    ok, details = audit_store.verify_chain(task_id)
    typer.echo(json.dumps({"ok": ok, "details": details}))


@app.command()
def resume(task_id: str) -> None:
    typer.echo(runtime.resume(task_id).model_dump_json(indent=2))


@approvals_app.command("list")
def approvals_list() -> None:
    typer.echo(json.dumps([r.model_dump() for r in approval_store.pending()], indent=2))


@approvals_app.command("decide")
def approvals_decide(
    id: str,
    approve: bool = typer.Option(False, "--approve", help="Approve request"),
    deny: bool = typer.Option(False, "--deny", help="Deny request"),
    reason: str = typer.Option(..., "--reason"),
    by: str = typer.Option(..., "--by"),
) -> None:
    if approve == deny:
        raise typer.BadParameter("Use exactly one of --approve/--deny")
    typer.echo(approval_store.decide(id, approve=approve, reason=reason, decided_by=by).model_dump_json(indent=2))


if __name__ == "__main__":
    app()
