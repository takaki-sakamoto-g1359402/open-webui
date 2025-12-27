"""Minimal demo for OpenUSD bridge."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import List

from . import usd_ops


def _asset_path() -> Path:
    return Path(__file__).resolve().parent.parent / "assets" / "sample_scene.usda"


def _print_summary(prims: List[dict]) -> None:
    print("Prim summary:")
    for prim in prims:
        print(f"- {prim['path']} ({prim['typeName']})")


def run_demo() -> Path:
    sample = _asset_path()
    stage = usd_ops.load_stage(sample)

    cube_path = "/World/DemoCube"
    usd_ops.add_primitive(stage, cube_path, "Cube")
    usd_ops.set_xform(stage, cube_path, translate=(0.0, 1.0, 0.0), rotate=(0.0, 0.0, 0.0), scale=(1.0, 1.0, 1.0))

    out_path = Path.cwd() / "out.usda"
    usd_ops.save_stage(stage, out_path, format="usda")

    prims = usd_ops.list_prims(stage)
    _print_summary(prims)

    recorder = shutil.which("usdrecord")
    if recorder:
        preview_path = out_path.with_suffix(".png")
        try:
            import subprocess

            subprocess.run([recorder, out_path.as_posix(), preview_path.as_posix()], check=True)
            print(f"Rendered preview: {preview_path}")
        except Exception as exc:  # pragma: no cover - optional path
            print(f"usdrecord failed: {exc}")
    else:
        print("usdrecord not found; skipping preview render.")

    return out_path


def main() -> None:  # pragma: no cover
    run_demo()


if __name__ == "__main__":  # pragma: no cover
    main()
