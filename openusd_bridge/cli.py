"""Command line interface for minimal OpenUSD bridge."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from pxr import Usd

from . import usd_ops


def _print_prims(stage: Usd.Stage) -> None:
    for prim_info in usd_ops.list_prims(stage):
        print(f"{prim_info['path']} [{prim_info['typeName']}]")


def command_demo() -> None:
    from .demo import run_demo

    run_demo()


def command_list(file: Path) -> None:
    stage = usd_ops.load_stage(file)
    _print_prims(stage)


def command_set_xform(file: Path, prim_path: str, translate: Sequence[float], rotate: Sequence[float], scale: Sequence[float], out: Path) -> None:
    stage = usd_ops.load_stage(file)
    usd_ops.set_xform(stage, prim_path, tuple(translate), tuple(rotate), tuple(scale))
    saved = usd_ops.save_stage(stage, out, format=out.suffix.lstrip("."))
    print(f"Saved to {saved}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="OpenUSD bridge CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("demo", help="Run demo that writes out.usda")

    list_parser = subparsers.add_parser("list", help="List prims in a USD file")
    list_parser.add_argument("--file", required=True, type=Path, help="USD file to inspect")

    xform_parser = subparsers.add_parser("set-xform", help="Edit a prim's transform and save")
    xform_parser.add_argument("--file", required=True, type=Path, help="Input USD file")
    xform_parser.add_argument("--prim", required=True, help="Prim path to edit")
    xform_parser.add_argument("--t", nargs=3, required=True, type=float, metavar=("TX", "TY", "TZ"))
    xform_parser.add_argument("--r", nargs=3, required=True, type=float, metavar=("RX", "RY", "RZ"))
    xform_parser.add_argument("--s", nargs=3, required=True, type=float, metavar=("SX", "SY", "SZ"))
    xform_parser.add_argument("--out", required=True, type=Path, help="Output USD path")

    return parser


def main(argv: Sequence[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "demo":
        command_demo()
    elif args.command == "list":
        command_list(args.file)
    elif args.command == "set-xform":
        command_set_xform(args.file, args.prim, args.t, args.r, args.s, args.out)


if __name__ == "__main__":  # pragma: no cover
    main()
