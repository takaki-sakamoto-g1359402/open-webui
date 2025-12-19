import argparse
import glob
import time
from pathlib import Path

from .policy_agent.agent import Agent
from .policy_agent.db import Database
from .policy_agent.planner import Planner
from .policy_agent.policy import PolicyEngine


def seed_demo() -> None:
    db = Database()
    policy = PolicyEngine(db)
    planner = Planner()
    agent = Agent(db, planner, policy)
    demo_dir = Path("demo")
    (demo_dir / "inputs").mkdir(parents=True, exist_ok=True)
    db.add_doc("post-quantum internet", (demo_dir / "pqc.md").read_text(encoding="utf-8"))
    db.add_doc("proof of personhood", (demo_dir / "pop.md").read_text(encoding="utf-8"))
    db.add_event("seed", "pqcチェックして")
    db.add_event("seed", "事業アイデアを3つ")
    print("Seeded demo data")


def process_inbox(db: Database) -> None:
    inbox = Path("inbox")
    for pattern in ("*.md", "*.txt"):
        for path in inbox.glob(pattern):
            content = path.read_text(encoding="utf-8")
            db.add_event(f"file:{path.name}", content)
            path.unlink()


def run_once(text: str, pop_token: str | None = None) -> None:
    db = Database()
    policy = PolicyEngine(db)
    planner = Planner()
    agent = Agent(db, planner, policy)
    db.add_event("cli", text)
    agent.run_pending(pop_token=pop_token)
    print("Run complete")


def run_loop(interval: int = 5, pop_token: str | None = None) -> None:
    db = Database()
    policy = PolicyEngine(db)
    planner = Planner()
    agent = Agent(db, planner, policy)
    while True:
        process_inbox(db)
        agent.run_pending(pop_token=pop_token)
        time.sleep(interval)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("seed-demo")

    run_once_p = sub.add_parser("run-once")
    run_once_p.add_argument("--text", required=True)
    run_once_p.add_argument("--pop-token", dest="pop_token")

    loop_p = sub.add_parser("run-loop")
    loop_p.add_argument("--interval", type=int, default=5)
    loop_p.add_argument("--pop-token", dest="pop_token")

    args = parser.parse_args()
    if args.cmd == "seed-demo":
        seed_demo()
    elif args.cmd == "run-once":
        run_once(args.text, pop_token=args.pop_token)
    elif args.cmd == "run-loop":
        run_loop(args.interval, pop_token=args.pop_token)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
