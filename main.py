"""CLI entry point for the System-3 persistent agent prototype."""
from __future__ import annotations

import json
from pathlib import Path

from agent.db import DEFAULT_DB_PATH, ensure_identity, ensure_models, get_connection, init_db
from agent.llm import MockLLMClient
from agent.memory import EpisodicMemory
from agent.models import ModelStore
from agent.system3 import System3Agent


def prompt_confirm(message: str) -> bool:
    response = input(f"{message} (y/n): ").strip().lower()
    return response == "y"


def handle_command(command: str, agent: System3Agent, memory: EpisodicMemory, models: ModelStore) -> bool:
    if command.startswith("/identity"):
        print("Identity Profile:")
        print(json.dumps(agent.identity.__dict__, indent=2))
        return True
    if command.startswith("/memory"):
        query = command.replace("/memory", "", 1).strip()
        if not query:
            print("Usage: /memory <query>")
            return True
        results = memory.retrieve_similar(query, "cli")
        print("Top Episodes:")
        for item in results:
            print(f"- [{item.id}] ({item.similarity:.2f}) {item.summary}")
        return True
    if command.startswith("/models"):
        print("Self Model:")
        print(json.dumps(models.load("self_model"), indent=2))
        print("User Model:")
        print(json.dumps(models.load("user_model"), indent=2))
        return True
    if command.startswith("/reset"):
        if prompt_confirm("This will clear the database. Continue?"):
            Path(DEFAULT_DB_PATH).unlink(missing_ok=True)
            print("Database reset.")
        return True
    return False


def main() -> None:
    conn = get_connection()
    init_db(conn)
    ensure_identity(conn)
    ensure_models(conn)

    llm = MockLLMClient()
    agent = System3Agent(conn, llm)
    memory = agent.memory
    models = agent.models

    print("System-3 Persistent Agent (CLI). Type /reset, /identity, /memory <query>, /models.")
    while True:
        task = input("\nTask (or 'quit'): ").strip()
        if not task:
            continue
        if task.lower() in {"quit", "exit"}:
            break
        if task.startswith("/"):
            if handle_command(task, agent, memory, models):
                continue
        result = agent.execute(task)
        print("\nPlan:")
        print(f"- {result.plan.title}")
        for step in result.plan.steps:
            print(f"  • {step}")
        print("\nTool Trace:")
        for call in result.tool_calls:
            print(f"- {call}")
        print("\nResult:")
        print(result.result)
        print("\nSystem-3 Reflection:")
        print(result.reflection)


if __name__ == "__main__":
    main()
