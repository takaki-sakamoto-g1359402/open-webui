from world_dsl import load_world


def test_load_world():
    world = load_world()
    assert isinstance(world, dict)
    assert world
