from __future__ import annotations

import typer

from ugw.audit.log import verify_log
from ugw.services.replay import replay_events
from ugw.audit.log import export_events

app = typer.Typer(add_completion=False)


@app.command("verify-log")
def verify_log_cmd() -> None:
    report = verify_log()
    typer.echo(report)


@app.command("replay")
def replay_cmd() -> None:
    result = replay_events(export_events())
    typer.echo(result)


if __name__ == "__main__":
    app()
