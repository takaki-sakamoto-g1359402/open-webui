extends Node2D

const NEURON_SCENE := preload("res://scenes/Neuron.tscn")
const SYNAPSE_SCENE := preload("res://scenes/Synapse.tscn")
const SAVE_PATH := "user://synapselab_snapshot.json"

@onready var neuron_layer: Node2D = $Neurons
@onready var synapse_layer: Node2D = $Synapses
@onready var hud: HUD = $HUD
@onready var mission_label: RichTextLabel = $MissionPanel/Panel/Label

var graph := Graph.new()
var simulation := Simulation.new(graph)
var analytics := Analytics.new()
var missions := Missions.new()

var neuron_nodes: Dictionary = {}
var synapse_nodes: Dictionary = {}
var current_tool: String = "select"
var selected_neuron: String = ""
var connection_start: String = ""
var dragging_neuron: String = ""
var drag_offset := Vector2.ZERO
var paused: bool = false
var pending_step: bool = false
var stats_timer: float = 0.0
var presets: Dictionary = {}
var current_mission: String = ""

func _ready() -> void:
    _load_presets()
    hud.tool_selected.connect(_on_tool_changed)
    hud.param_changed.connect(_on_param_changed)
    hud.learning_toggled.connect(_on_learning_toggled)
    hud.pause_toggled.connect(_on_pause_toggled)
    hud.step_requested.connect(_on_step_requested)
    hud.save_requested.connect(_on_save_requested)
    hud.load_requested.connect(_on_load_requested)
    hud.mission_chosen.connect(_on_mission_chosen)
    missions.mission_started.connect(_on_mission_started)
    missions.mission_completed.connect(_on_mission_completed)
    missions.set_missions(presets.get("missions", {}))
    hud.set_missions(missions.get_summary())
    var defaults := presets.get("defaults", {
        "learning_rate": 0.05,
        "decay": 0.01,
        "leak": 0.15,
        "noise": 0.0,
        "time_scale": 1.0,
        "learning_enabled": true,
        "paused": false
    })
    hud.set_defaults(defaults)
    _apply_params(defaults)
    if presets.has("graphs") and presets["graphs"].has("starter"):
        _apply_graph(presets["graphs"]["starter"])
    else:
        _seed_blank_network()
    _refresh_stats()
    hud.update_mission_status("Mission: Sandbox")
    mission_label.text = "Select a mission to view guidance."

func _load_presets() -> void:
    var path := "res://data/presets.json"
    if not FileAccess.file_exists(path):
        presets = {}
        return
    var file := FileAccess.open(path, FileAccess.READ)
    var content := file.get_as_text()
    var json := JSON.new()
    if json.parse(content) == OK:
        presets = json.get_data()
    else:
        presets = {}

func _apply_graph(data: Dictionary) -> void:
    _clear_scene()
    selected_neuron = ""
    connection_start = ""
    dragging_neuron = ""
    graph.load_json_dict(data.get("graph", data))
    simulation.rebuild_state()
    for node_id in graph.get_node_ids():
        var node_data: Dictionary = graph.nodes[node_id]
        _spawn_neuron(node_id, node_data)
    for from_id in graph.edges.keys():
        for to_id in graph.edges[from_id].keys():
            _spawn_synapse(from_id, to_id)
    _update_component_colors()
    _update_goal_flags()
    simulation.reset_rng()
    _update_visuals()

func _seed_blank_network() -> void:
    graph.clear()
    simulation.rebuild_state()
    for i in range(3):
        var id := graph.add_node(Vector2(200 + i * 120, 360))
        _spawn_neuron(id, graph.nodes[id])
    _update_component_colors()

func _clear_scene() -> void:
    for node in neuron_nodes.values():
        node.queue_free()
    neuron_nodes.clear()
    for node in synapse_nodes.values():
        node.queue_free()
    synapse_nodes.clear()

func _spawn_neuron(id: String, data: Dictionary) -> void:
    var instance: Node2D = NEURON_SCENE.instantiate()
    instance.position = data.get("position", Vector2.ZERO)
    instance.neuron_id = id
    neuron_layer.add_child(instance)
    neuron_nodes[id] = instance

func _spawn_synapse(from_id: String, to_id: String) -> void:
    if not neuron_nodes.has(from_id) or not neuron_nodes.has(to_id):
        return
    var key := _edge_key(from_id, to_id)
    if synapse_nodes.has(key):
        return
    var instance: Node2D = SYNAPSE_SCENE.instantiate()
    synapse_layer.add_child(instance)
    synapse_nodes[key] = instance
    _update_synapse_geometry(from_id, to_id)

func _edge_key(from_id: String, to_id: String) -> String:
    return "%s->%s" % [from_id, to_id]

func _process(delta: float) -> void:
    var sim_delta := delta
    if paused:
        if pending_step:
            sim_delta = Simulation.FIXED_DT
            pending_step = false
        else:
            sim_delta = 0.0
    var steps := 0
    if sim_delta > 0.0:
        steps = simulation.step_simulation(sim_delta)
    if steps > 0 or sim_delta > 0.0:
        _update_visuals()
    stats_timer += delta
    if stats_timer >= 0.5:
        _refresh_stats()
        stats_timer = 0.0
    var mission_state := missions.update(simulation, sim_delta)
    _update_mission_status(mission_state)

func _update_visuals() -> void:
    for node_id in neuron_nodes.keys():
        var node: Node2D = neuron_nodes[node_id]
        var data := graph.nodes[node_id]
        node.position = data.get("position", node.position)
        node.set_activation(simulation.get_activation(node_id))
        node.set_selected(node_id == selected_neuron)
    for from_id in graph.edges.keys():
        for to_id in graph.edges[from_id].keys():
            _update_synapse_geometry(from_id, to_id)
    _update_goal_flags()

func _update_synapse_geometry(from_id: String, to_id: String) -> void:
    var key := _edge_key(from_id, to_id)
    if not synapse_nodes.has(key):
        _spawn_synapse(from_id, to_id)
        return
    var synapse: Node2D = synapse_nodes[key]
    var from_node: Node2D = neuron_nodes.get(from_id, null)
    var to_node: Node2D = neuron_nodes.get(to_id, null)
    if from_node == null or to_node == null:
        synapse.queue_free()
        synapse_nodes.erase(key)
        return
    var start_pos := from_node.position
    var end_pos := to_node.position
    synapse.set_points(start_pos, end_pos)
    synapse.set_weight(graph.get_weight(from_id, to_id))

func _update_component_colors() -> void:
    var components := graph.connected_components()
    for index in range(components.size()):
        var color := _color_for_index(index)
        for node_id in components[index]:
            if neuron_nodes.has(node_id):
                neuron_nodes[node_id].set_cluster_color(color)

func _color_for_index(index: int) -> Color:
    var palette := [
        Color(0.35, 0.6, 0.9),
        Color(0.9, 0.55, 0.3),
        Color(0.45, 0.8, 0.5),
        Color(0.9, 0.4, 0.7),
        Color(0.75, 0.75, 0.3)
    ]
    return palette[index % palette.size()].lightened(0.1 * (index / float(palette.size())))

func _update_goal_flags() -> void:
    for node_id in neuron_nodes.keys():
        var custom := graph.nodes[node_id].get("custom", {})
        neuron_nodes[node_id].set_goal(custom.get("goal", false))

func _mission_title(id: String) -> String:
    if id == "" or not missions.missions.has(id):
        return "Sandbox"
    return missions.missions[id].get("title", id)


func _refresh_stats() -> void:
    var stats := simulation.get_stats()
    var summary := analytics.summarize(
        stats.get("activations", []),
        stats.get("weights", []),
        graph.nodes.size(),
        graph.edge_count()
    )
    hud.update_stats(summary)

func _on_tool_changed(tool: String) -> void:
    current_tool = tool
    if tool != "add_synapse":
        connection_start = ""

func _on_param_changed(name: String, value: float) -> void:
    simulation.set_param(name, value)

func _on_learning_toggled(enabled: bool) -> void:
    simulation.set_learning_enabled(enabled)

func _on_pause_toggled(flag: bool) -> void:
    paused = flag

func _on_step_requested() -> void:
    pending_step = true

func _on_save_requested() -> void:
    var snapshot := {
        "graph": graph.to_json_dict(),
        "params": simulation.params,
        "mission": current_mission
    }
    var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    file.store_string(JSON.stringify(snapshot, "  "))
    mission_label.text = "Saved to %s" % SAVE_PATH

func _on_load_requested() -> void:
    if FileAccess.file_exists(SAVE_PATH):
        var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
        var json := JSON.new()
        if json.parse(file.get_as_text()) == OK:
            _apply_loaded_snapshot(json.get_data())
            mission_label.text = "Loaded from %s" % SAVE_PATH
            return
    var fallback := "res://data/sample_save.json"
    if FileAccess.file_exists(fallback):
        var file := FileAccess.open(fallback, FileAccess.READ)
        var json := JSON.new()
        if json.parse(file.get_as_text()) == OK:
            _apply_loaded_snapshot(json.get_data())
            mission_label.text = "Loaded sample save"

func _apply_loaded_snapshot(data: Dictionary) -> void:
    if data.has("graph"):
        _apply_graph(data["graph"])
    if data.has("params"):
        _apply_params(data["params"])
        hud.set_defaults(data["params"])
    if data.has("mission") and data["mission"] != "":
        _on_mission_chosen(data["mission"])

func _apply_params(params: Dictionary) -> void:
    for key in params.keys():
        simulation.set_param(key, params[key])
    if params.has("learning_enabled"):
        simulation.set_learning_enabled(params["learning_enabled"])
    if params.has("paused"):
        paused = params["paused"]

func _on_mission_chosen(id: String) -> void:
    current_mission = id
    if id == "" or id == null:
        missions.stop()
        hud.update_mission_status("Mission: Sandbox")
        mission_label.text = "Sandbox mode."
        if presets.has("graphs") and presets["graphs"].has("starter"):
            _apply_graph(presets["graphs"]["starter"])
        return
    var mission_info := missions.start(id)
    if mission_info.is_empty():
        mission_label.text = "Mission unavailable."
        return
    hud.update_mission_status("Mission: %s" % mission_info.get("title", id))
    mission_label.text = mission_info.get("description", "Mission running.")
    if mission_info.has("graph"):
        _apply_graph(mission_info["graph"])

func _on_mission_started(id: String) -> void:
    current_mission = id

func _on_mission_completed(id: String) -> void:
    mission_label.text = "Mission %s complete!" % id

func _update_mission_status(state: Dictionary) -> void:
    if state.is_empty():
        return
    if state.get("status", "") == "success":
        hud.update_mission_status("%s: Success" % _mission_title(current_mission))
    elif state.get("status", "") == "in_progress":
        var progress := int(state.get("progress", 0.0) * 100.0)
        hud.update_mission_status("%s: %d%%" % [_mission_title(current_mission), progress])
        if state.has("activation"):
            mission_label.text = "Goal activation: %.2f" % state["activation"]
        elif state.has("phase"):
            mission_label.text = "Phase: %s" % state["phase"]

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        if event.pressed:
            _handle_click(event.position)
        else:
            dragging_neuron = ""
    elif event is InputEventMouseMotion and dragging_neuron != "":
        _drag_neuron(event.position)

func _handle_click(position: Vector2) -> void:
    match current_tool:
        "add_neuron":
            _add_neuron(position)
        "add_synapse":
            _handle_add_synapse(position)
        "remove":
            if not _try_remove_synapse(position):
                var target := _find_neuron(position)
                if target != "":
                    _remove_neuron(target)
        "inject":
            var inject_id := _find_neuron(position)
            if inject_id != "":
                simulation.inject_pulse(inject_id, 1.0)
        _:
            _select_neuron(position)
    _update_visuals()

func _add_neuron(position: Vector2) -> void:
    var id := graph.add_node(position)
    graph.nodes[id]["custom"] = {}
    simulation.on_node_added(id)
    _spawn_neuron(id, graph.nodes[id])
    _update_component_colors()

func _remove_neuron(id: String) -> void:
    graph.remove_node(id)
    simulation.on_node_removed(id)
    if neuron_nodes.has(id):
        neuron_nodes[id].queue_free()
        neuron_nodes.erase(id)
    var keys := synapse_nodes.keys().duplicate()
    for key in keys:
        if key.begins_with(id + "->") or key.ends_with("->" + id):
            synapse_nodes[key].queue_free()
            synapse_nodes.erase(key)
    if selected_neuron == id:
        selected_neuron = ""
    _update_component_colors()

func _handle_add_synapse(position: Vector2) -> void:
    var target := _find_neuron(position)
    if target == "":
        return
    if connection_start == "":
        connection_start = target
        selected_neuron = target
    elif connection_start != target:
        graph.add_edge(connection_start, target, 0.1)
        _spawn_synapse(connection_start, target)
        _update_component_colors()
        connection_start = ""
        selected_neuron = ""
    else:
        connection_start = ""
        selected_neuron = ""

func _select_neuron(position: Vector2) -> void:
    var target := _find_neuron(position)
    if target == "":
        selected_neuron = ""
        return
    selected_neuron = target
    dragging_neuron = target
    drag_offset = neuron_nodes[target].position - position

func _drag_neuron(position: Vector2) -> void:
    if not neuron_nodes.has(dragging_neuron):
        return
    var node := neuron_nodes[dragging_neuron]
    var new_pos := position + drag_offset
    node.position = new_pos
    graph.move_node(dragging_neuron, new_pos)
    for to_id in graph.get_outgoing(dragging_neuron).keys():
        _update_synapse_geometry(dragging_neuron, to_id)
    for from_id in graph.edges.keys():
        if graph.edges[from_id].has(dragging_neuron):
            _update_synapse_geometry(from_id, dragging_neuron)

func _find_neuron(position: Vector2) -> String:
    var best := ""
    var best_dist := 999999.0
    for id in neuron_nodes.keys():
        var node := neuron_nodes[id]
        var dist := node.position.distance_to(position)
        if dist < node.get_radius() and dist < best_dist:
            best = id
            best_dist = dist
    return best

func _try_remove_synapse(position: Vector2) -> bool:
    for key in synapse_nodes.keys():
        var synapse := synapse_nodes[key]
        var points := _decode_edge_key(key)
        var from_node := neuron_nodes.get(points[0], null)
        var to_node := neuron_nodes.get(points[1], null)
        if from_node == null or to_node == null:
            continue
        var dist := _distance_to_segment(position, from_node.position, to_node.position)
        if dist <= 12.0:
            graph.remove_edge(points[0], points[1])
            synapse.queue_free()
            synapse_nodes.erase(key)
            _update_component_colors()
            return true
    return false

func _decode_edge_key(key: String) -> Array:
    var parts := key.split("->")
    return [parts[0], parts[1]]

func _distance_to_segment(point: Vector2, a: Vector2, b: Vector2) -> float:
    var ab := b - a
    var t := 0.0
    var length_sq := ab.length_squared()
    if length_sq > 0.0:
        t = clamp((point - a).dot(ab) / length_sq, 0.0, 1.0)
    var projection := a + ab * t
    return projection.distance_to(point)
