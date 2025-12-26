"""Core OpenUSD operations for loading, editing, and saving stages."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple
from uuid import uuid4

from pxr import Gf, Usd, UsdGeom


class StageStore:
    """Simple in-memory registry for stages keyed by UUID strings."""

    def __init__(self) -> None:
        self._store: Dict[str, Usd.Stage] = {}

    def add(self, stage: Usd.Stage) -> str:
        stage_id = str(uuid4())
        self._store[stage_id] = stage
        return stage_id

    def get(self, stage_id: str) -> Usd.Stage:
        if stage_id not in self._store:
            raise KeyError(f"Unknown stage id: {stage_id}")
        return self._store[stage_id]

    def remove(self, stage_id: str) -> None:
        self._store.pop(stage_id, None)


stage_store = StageStore()


def load_stage(path: str | Path) -> Usd.Stage:
    """Load a USD stage from disk."""

    usd_path = Path(path)
    if not usd_path.exists():
        raise FileNotFoundError(f"USD file not found: {usd_path}")
    stage = Usd.Stage.Open(usd_path.as_posix())
    if stage is None:
        raise RuntimeError(f"Failed to open USD stage: {usd_path}")
    return stage


def list_prims(stage: Usd.Stage) -> List[Dict[str, str]]:
    """Return a list of prim metadata (path, typeName) for the stage."""

    prims = []
    for prim in stage.Traverse():
        prims.append({"path": prim.GetPath().pathString, "typeName": prim.GetTypeName()})
    return prims


def _validate_prim_path(prim_path: str) -> None:
    if not prim_path.startswith("/"):
        raise ValueError("prim_path must start with '/'")


def get_xform(stage: Usd.Stage, prim_path: str) -> Dict[str, Tuple[float, float, float]]:
    """Retrieve translate/rotate/scale vectors for a prim if available."""

    _validate_prim_path(prim_path)
    prim = stage.GetPrimAtPath(prim_path)
    if not prim or not prim.IsValid():
        raise ValueError(f"Prim not found at path: {prim_path}")

    xform_api = UsdGeom.XformCommonAPI(prim)
    if not xform_api:
        return {"translate": (0.0, 0.0, 0.0), "rotate": (0.0, 0.0, 0.0), "scale": (1.0, 1.0, 1.0)}

    translate, rotate, scale, _, _ = xform_api.GetXformVectors()
    return {
        "translate": tuple(translate) if translate is not None else (0.0, 0.0, 0.0),
        "rotate": tuple(rotate) if rotate is not None else (0.0, 0.0, 0.0),
        "scale": tuple(scale) if scale is not None else (1.0, 1.0, 1.0),
    }


def set_xform(
    stage: Usd.Stage,
    prim_path: str,
    translate: Tuple[float, float, float] | None = None,
    rotate: Tuple[float, float, float] | None = None,
    scale: Tuple[float, float, float] | None = None,
) -> None:
    """Apply basic transform edits to a prim using XformCommonAPI."""

    _validate_prim_path(prim_path)
    prim = stage.GetPrimAtPath(prim_path)
    if not prim or not prim.IsValid():
        raise ValueError(f"Prim not found at path: {prim_path}")

    xform_api = UsdGeom.XformCommonAPI(prim)
    translate_vec = Gf.Vec3d(*(translate or (0.0, 0.0, 0.0)))
    rotate_vec = Gf.Vec3f(*(rotate or (0.0, 0.0, 0.0)))
    scale_vec = Gf.Vec3f(*(scale or (1.0, 1.0, 1.0)))
    xform_api.SetTranslate(translate_vec)
    xform_api.SetRotate(rotate_vec)
    xform_api.SetScale(scale_vec)


def add_primitive(stage: Usd.Stage, prim_path: str, prim_type: str = "Cube") -> Usd.Prim:
    """Create a basic prim on the stage."""

    _validate_prim_path(prim_path)
    if prim_type not in {"Cube", "Xform"}:
        raise ValueError("prim_type must be 'Cube' or 'Xform'")

    if prim_type == "Cube":
        prim = UsdGeom.Cube.Define(stage, prim_path)
    else:
        prim = UsdGeom.Xform.Define(stage, prim_path)
    return prim.GetPrim()


def save_stage(stage: Usd.Stage, path: str | Path, format: str = "usda") -> str:
    """Write the stage's root layer to disk in the requested format."""

    target_path = Path(path)
    extension = format.lower()
    if extension not in {"usda", "usdc", "usdz"}:
        raise ValueError("format must be one of: usda, usdc, usdz")

    if target_path.suffix.lower() != f".{extension}":
        target_path = target_path.with_suffix(f".{extension}")

    stage.GetRootLayer().Export(target_path.as_posix())
    return target_path.as_posix()
