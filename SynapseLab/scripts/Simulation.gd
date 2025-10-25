extends RefCounted
class_name Simulation

const FIXED_DT := 1.0 / 60.0

var graph: Graph
var activations: Dictionary = {}
var incoming_cache: Dictionary = {}
var pulses: Dictionary = {}
var rng := RandomNumberGenerator.new()

var params := {
    "learning_rate": 0.05,
    "decay": 0.01,
    "leak": 0.15,
    "noise": 0.0,
    "time_scale": 1.0,
    "learning_enabled": true,
    "max_weight": 1.5
}

var accumulator := 0.0

func _init(p_graph: Graph = null) -> void:
    rng.seed = 1337
    graph = p_graph
    rebuild_state()

func rebuild_state() -> void:
    activations.clear()
    pulses.clear()
    if graph == null:
        return
    for node_id in graph.get_node_ids():
        activations[node_id] = 0.0

func set_graph(p_graph: Graph) -> void:
    graph = p_graph
    rebuild_state()

func on_node_added(node_id: String) -> void:
    activations[node_id] = 0.0

func on_node_removed(node_id: String) -> void:
    activations.erase(node_id)
    pulses.erase(node_id)

func inject_pulse(node_id: String, value: float) -> void:
    if not pulses.has(node_id):
        pulses[node_id] = 0.0
    pulses[node_id] += value

func set_param(name: String, value) -> void:
    if params.has(name):
        params[name] = value

func get_param(name: String):
    return params.get(name, null)

func set_learning_enabled(enabled: bool) -> void:
    params["learning_enabled"] = enabled

func step_simulation(delta: float) -> int:
    if graph == null:
        return 0
    accumulator += delta * params["time_scale"]
    var steps := 0
    while accumulator >= FIXED_DT:
        _integrate(FIXED_DT)
        accumulator -= FIXED_DT
        steps += 1
    return steps

func _integrate(dt: float) -> void:
    var leak := clamp(params["leak"], 0.0, 1.0)
    var noise_scale := max(params["noise"], 0.0)
    var next_activations: Dictionary = {}
    var drive: Dictionary = {}
    # accumulate synaptic input
    for from_id in graph.edges.keys():
        var pre_act := activations.get(from_id, 0.0)
        if pre_act <= 0.0:
            continue
        for to_id in graph.edges[from_id].keys():
            var weight: float = graph.edges[from_id][to_id]
            if weight <= 0.0:
                continue
            drive[to_id] = drive.get(to_id, 0.0) + weight * pre_act
    # update activations
    for node_id in graph.get_node_ids():
        var current := activations.get(node_id, 0.0)
        var synaptic := drive.get(node_id, 0.0)
        var pulse := pulses.get(node_id, 0.0)
        var noise := 0.0
        if noise_scale > 0.0:
            noise = rng.randf_range(-noise_scale, noise_scale)
        var updated := max(0.0, (1.0 - leak) * current + synaptic + pulse + noise)
        next_activations[node_id] = updated
    pulses.clear()
    if params["learning_enabled"]:
        _hebbian_update(next_activations, dt)
    activations = next_activations

func _hebbian_update(next_acts: Dictionary, dt: float) -> void:
    var eta := max(params["learning_rate"], 0.0)
    var decay := max(params["decay"], 0.0)
    var max_weight := max(params["max_weight"], 0.01)
    for from_id in graph.edges.keys():
        var pre := activations.get(from_id, 0.0)
        for to_id in graph.edges[from_id].keys():
            var post := next_acts.get(to_id, 0.0)
            var w := graph.edges[from_id][to_id]
            var delta_w := (eta * post * pre - decay * w) * dt
            w = clamp(w + delta_w, 0.0, max_weight)
            graph.edges[from_id][to_id] = w

func get_activation(node_id: String) -> float:
    return activations.get(node_id, 0.0)

func get_activations() -> Dictionary:
    return activations.duplicate(true)

func get_weight_values() -> Array:
    var weights: Array = []
    for from_id in graph.edges.keys():
        for to_id in graph.edges[from_id].keys():
            weights.append(graph.edges[from_id][to_id])
    return weights

func get_stats() -> Dictionary:
    var acts: Array = []
    for node_id in graph.get_node_ids():
        acts.append(activations.get(node_id, 0.0))
    return {
        "activations": acts,
        "weights": get_weight_values()
    }

func reset_rng() -> void:
    rng.seed = 1337
