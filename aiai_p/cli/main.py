from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path

import matplotlib.pyplot as plt

from .. import run_query
from ..services import db
from ..ui import gui_utils


def main() -> None:
    parser = argparse.ArgumentParser(description="Artificial Innovator AI Plus")
    parser.add_argument("ask_file", help="path to query text file")
    parser.add_argument(
        "--feedback", choices=["success", "fail"], help="result of previous roadmap"
    )
    parser.add_argument("--viz", action="store_true", help="show graph window")
    parser.add_argument("--innovators", default="innovators.json")
    args = parser.parse_args()

    text = Path(args.ask_file).read_text(encoding="utf-8")
    md, g, partners, _ = run_query(text, args.innovators)
    print(md)
    if args.feedback:
        for p in partners:
            for other in partners:
                if p == other:
                    continue
                db.log_history(p["name"], other["name"], args.feedback)
    if args.viz:
        img = gui_utils.graph_image(g, {"synergy", "supply_chain", "conflict"})
        plt.imshow(plt.imread(BytesIO(img)))
        plt.axis("off")
        plt.show()


if __name__ == "__main__":
    main()
