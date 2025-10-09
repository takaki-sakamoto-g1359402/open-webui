"""Command line interface for Riai."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

import click
import yaml

from .agent import Agent
from .memory import MemoryStore
from .planner import Planner
from .executor import Executor
from .reflector import Reflector
from .learner import Learner
from .safety import SafetyGuard
from .tools import registry_from_config
from .utils.logging import configure_logging, get_logger


@click.group(invoke_without_command=True)
@click.version_option()
@click.option(
    "--config",
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    default=Path(os.environ.get("RIAI_CONFIG", "configs/config.yaml")),
    help="Path to configuration file.",
)
@click.pass_context
def main(ctx: click.Context, config: Path) -> None:
    """Entry point for the Riai CLI."""
    config_data = yaml.safe_load(config.read_text())
    configure_logging(config_data.get("logging", {}))
    logger = get_logger("riai.cli")
    safety_path = Path(os.environ.get("RIAI_SAFETY_POLICY", config_data["safety_policy"]))
    safety_guard = SafetyGuard.from_yaml(safety_path)
    tools_config_path = Path(config_data["tools_config"])
    registry = registry_from_config(tools_config_path, safety_guard)
    memory_store = MemoryStore(Path(config_data["memory"]["db_path"]))
    learner = Learner(memory_store)
    planner = Planner(seed=config_data["agent"].get("planner_seed", 0), memory=memory_store, learner=learner)
    reflector = Reflector()
    executor = Executor(registry, safety_guard)
    agent = Agent(
        planner=planner,
        executor=executor,
        reflector=reflector,
        learner=learner,
        memory_store=memory_store,
        safety=safety_guard,
        logger=logger,
    )
    ctx.obj = {
        "config": config_data,
        "agent": agent,
        "registry": registry,
        "safety": safety_guard,
        "memory": memory_store,
        "logger": logger,
    }
    if ctx.invoked_subcommand is None:
        help_text = ctx.command.get_help(ctx)
        click.echo(help_text)
@main.command()
@click.option("--goal", required=True, help="High level goal for the agent.")
@click.option("--max-steps", type=int)
@click.option("--budget-tokens", type=int)
@click.pass_context
def run(
    ctx: click.Context,
    goal: str,
    max_steps: Optional[int],
    budget_tokens: Optional[int],
) -> None:
    """Execute the agent loop for a given goal."""
    config = ctx.obj["config"]
    agent: Agent = ctx.obj["agent"]
    max_steps = max_steps or config["agent"].get("default_max_steps", 20)
    budget_tokens = budget_tokens or config["agent"].get("default_budget_tokens", 4000)
    result = agent.run(goal=goal, max_steps=max_steps, budget_tokens=budget_tokens)
    click.echo(json.dumps(result, indent=2))


@main.group()
@click.pass_context
def tools(ctx: click.Context) -> None:
    """Tool management commands."""


@tools.command("list")
@click.pass_context
def list_tools(ctx: click.Context) -> None:
    registry = ctx.obj["registry"]
    click.echo(json.dumps(registry.describe(), indent=2))


@tools.command("add")
@click.option("--tool", required=True)
@click.pass_context
def add_tool(ctx: click.Context, tool: str) -> None:
    registry = ctx.obj["registry"]
    registry.enable(tool)
    click.echo(f"Enabled tool: {tool}")


@tools.command("remove")
@click.option("--tool", required=True)
@click.pass_context
def remove_tool(ctx: click.Context, tool: str) -> None:
    registry = ctx.obj["registry"]
    registry.disable(tool)
    click.echo(f"Disabled tool: {tool}")


@main.command()
@click.argument("task_paths", nargs=-1, type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.pass_context
def eval(ctx: click.Context, task_paths: tuple[Path, ...]) -> None:
    """Run evaluation tasks from YAML descriptions."""
    agent: Agent = ctx.obj["agent"]
    for path in task_paths:
        payload = yaml.safe_load(path.read_text())
        goal = payload.get("goal")
        if not goal:
            raise click.ClickException(f"Task {path} missing goal")
        click.echo(f"Running task: {path}")
        result = agent.run(goal=goal, max_steps=payload.get("max_steps", 20), budget_tokens=payload.get("budget_tokens", 4000))
        click.echo(json.dumps(result, indent=2))


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()

