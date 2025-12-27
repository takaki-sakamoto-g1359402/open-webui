from pathlib import Path

from pxr import Usd

from openusd_bridge import usd_ops


def test_add_cube_set_xform_and_reload(tmp_path: Path) -> None:
    stage_path = tmp_path / "temp.usda"
    stage = Usd.Stage.CreateNew(stage_path.as_posix())
    usd_ops.add_primitive(stage, "/World", "Xform")
    cube = usd_ops.add_primitive(stage, "/World/Cube", "Cube")
    usd_ops.set_xform(stage, cube.GetPath().pathString, translate=(1.0, 2.0, 3.0), rotate=(0.0, 45.0, 0.0), scale=(2.0, 2.0, 2.0))
    saved = usd_ops.save_stage(stage, stage_path, format="usda")

    reloaded = usd_ops.load_stage(saved)
    xform = usd_ops.get_xform(reloaded, "/World/Cube")
    assert xform["translate"] == (1.0, 2.0, 3.0)
    assert xform["rotate"] == (0.0, 45.0, 0.0)
    assert xform["scale"] == (2.0, 2.0, 2.0)


def test_list_prims_contains_world(tmp_path: Path) -> None:
    stage = Usd.Stage.CreateInMemory()
    usd_ops.add_primitive(stage, "/World", "Xform")
    usd_ops.add_primitive(stage, "/World/Cube", "Cube")
    prims = usd_ops.list_prims(stage)
    paths = {p["path"] for p in prims}
    assert "/World" in paths
    assert "/World/Cube" in paths
