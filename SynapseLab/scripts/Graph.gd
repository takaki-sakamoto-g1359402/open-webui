extends RefCounted
class_name Graph

## Lightweight directed graph storing neurons and synapses.
## Keeps metadata needed for saving/loading while simulation
## stores fast-changing activation values separately.

var nodes: Dictionary = {}
var edges: Dictionary = {}
var next_id: int = 0

func clear() -> void:
    nodes.clear()
    edges.clear()
    next_id = 0

func generate_id() -> String:
    var id := str(next_id)
    next_id += 1
    return id

func add_node(position: Vector2, custom: Dictionary = {}) -> String:
    var id := generate_id()
    nodes[id] = {
        "id": id,
        "position": position,
        "custom": custom.duplicate(true)
    }
    edges[id] = {}
    return id

func remove_node(id: String) -> void:
    if not nodes.has(id):
        return
    nodes.erase(id)
    edges.erase(id)
    for from_id in edges.keys():
        edges[from_id].erase(id)

func move_node(id: String, position: Vector2) -> void:
    if nodes.has(id):
        nodes[id]["position"] = position

func add_edge(from_id: String, to_id: String, weight: float = 0.1) -> void:
    if not nodes.has(from_id) or not nodes.has(to_id):
        return
    if not edges.has(from_id):
        edges[from_id] = {}
    edges[from_id][to_id] = weight

func remove_edge(from_id: String, to_id: String) -> void:
    if edges.has(from_id):
        edges[from_id].erase(to_id)

func has_edge(from_id: String, to_id: String) -> bool:
    return edges.has(from_id) and edges[from_id].has(to_id)

func get_weight(from_id: String, to_id: String) -> float:
    if has_edge(from_id, to_id):
        return edges[from_id][to_id]
    return 0.0

func set_weight(from_id: String, to_id: String, weight: float) -> void:
    if has_edge(from_id, to_id):
        edges[from_id][to_id] = weight

func get_node_ids() -> Array:
    return nodes.keys()

func get_outgoing(from_id: String) -> Dictionary:
    if edges.has(from_id):
        return edges[from_id]
    return {}

func to_json_dict() -> Dictionary:
    var node_list: Array = []
    for node_id in nodes.keys():
        var node_data := nodes[node_id]
        node_list.append({
            "id": node_id,
            "position": [node_data["position"].x, node_data["position"].y],
            "custom": node_data.get("custom", {})
        })
    var edge_list: Array = []
    for from_id in edges.keys():
        for to_id in edges[from_id].keys():
            edge_list.append({
                "from": from_id,
                "to": to_id,
                "weight": edges[from_id][to_id]
            })
    return {
        "nodes": node_list,
        "edges": edge_list,
        "next_id": next_id
    }

func load_json_dict(data: Dictionary) -> void:
    clear()
    next_id = data.get("next_id", 0)
    for node_data in data.get("nodes", []):
        var id: String = str(node_data.get("id", generate_id()))
        var pos_array: Array = node_data.get("position", [0.0, 0.0])
        var pos := Vector2(pos_array[0], pos_array[1])
        var custom := node_data.get("custom", {})
        nodes[id] = {"id": id, "position": pos, "custom": custom.duplicate(true) if custom is Dictionary else custom}
        edges[id] = {}
    for edge_data in data.get("edges", []):
        var from_id: String = str(edge_data.get("from", ""))
        var to_id: String = str(edge_data.get("to", ""))
        var weight: float = float(edge_data.get("weight", 0.0))
        if nodes.has(from_id) and nodes.has(to_id):
            if not edges.has(from_id):
                edges[from_id] = {}
            edges[from_id][to_id] = weight

func connected_components() -> Array:
    var visited := {}
    var components: Array = []
    for node_id in nodes.keys():
        if visited.has(node_id):
            continue
        var stack: Array = [node_id]
        var component: Array = []
        visited[node_id] = true
        while stack.size() > 0:
            var current: String = stack.pop_back()
            component.append(current)
            # Undirected traversal for connectivity hint
            for to_id in get_outgoing(current).keys():
                if not visited.has(to_id):
                    visited[to_id] = true
                    stack.append(to_id)
            for from_id in edges.keys():
                if edges[from_id].has(current) and not visited.has(from_id):
                    visited[from_id] = true
                    stack.append(from_id)
        components.append(component)
    return components

func edge_count() -> int:
    var total := 0
    for from_id in edges.keys():
        total += edges[from_id].size()
    return total
