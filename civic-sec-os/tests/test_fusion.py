from fusion import Entity, build_graph, resolve_entities


def test_entity_resolution_clusters():
    entities = [
        Entity(id="1", attributes={"name": "Tokyo Hospital", "city": "Tokyo"}),
        Entity(id="2", attributes={"name": "Tokyo hospital", "city": "Tokyo"}),
        Entity(id="3", attributes={"name": "Osaka Power", "city": "Osaka"}),
    ]
    clusters = resolve_entities(entities, block_keys=["city"], weights={"name": 1.0})
    assert any(len(members) == 2 for members in clusters.values())
    graph = build_graph(clusters)
    assert "1" in graph
