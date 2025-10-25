extends RefCounted
class_name Missions

signal mission_started(id)
signal mission_completed(id)
signal mission_failed(id)

var missions: Dictionary = {}
var active_id: String = ""
var state: Dictionary = {}
var mission_data: Dictionary = {}

func set_missions(data: Dictionary) -> void:
    missions = data.duplicate(true)

func get_summary() -> Array:
    var result: Array = []
    for id in missions.keys():
        var info := missions[id]
        result.append({
            "id": id,
            "title": info.get("title", id.capitalize()),
            "description": info.get("description", "")
        })
    return result

func start(id: String) -> Dictionary:
    if not missions.has(id):
        return {}
    active_id = id
    mission_data = missions[id]
    state = {
        "elapsed": 0.0,
        "progress": 0.0,
        "phase": "warmup",
        "success": false
    }
    emit_signal("mission_started", id)
    return mission_data

func stop() -> void:
    active_id = ""
    state.clear()
    mission_data.clear()

func update(simulation: Simulation, delta: float) -> Dictionary:
    if active_id == "" or mission_data.is_empty():
        return {"status": "idle"}
    state["elapsed"] += delta
    match active_id:
        "route_signal":
            return _update_route_signal(simulation, delta)
        "recall_pattern":
            return _update_recall_pattern(simulation, delta)
        _:
            return {"status": "idle"}

func _update_route_signal(simulation: Simulation, delta: float) -> Dictionary:
    var goal_id: String = mission_data.get("goal_id", "")
    if goal_id == "" or simulation == null:
        return {"status": "idle"}
    var threshold := mission_data.get("threshold", 0.35)
    var target_time := mission_data.get("target_time", 5.0)
    var activation := simulation.get_activation(goal_id)
    if activation >= threshold:
        state["progress"] = state.get("progress", 0.0) + delta
    else:
        state["progress"] = max(0.0, state.get("progress", 0.0) - delta * 0.5)
    var progress := clamp(state["progress"] / target_time, 0.0, 1.0)
    if progress >= 1.0 and not state.get("success", false):
        state["success"] = true
        emit_signal("mission_completed", active_id)
    return {
        "status": state.get("success", false) ? "success" : "in_progress",
        "progress": progress,
        "activation": activation,
        "goal": goal_id
    }

func _update_recall_pattern(simulation: Simulation, delta: float) -> Dictionary:
    if simulation == null:
        return {"status": "idle"}
    var pattern: Array = mission_data.get("pattern_nodes", [])
    var cue: Array = mission_data.get("cue_nodes", [])
    var threshold := mission_data.get("threshold", 0.45)
    var sustain := mission_data.get("sustain_time", 2.0)
    var phase := state.get("phase", "warmup")
    if phase == "warmup":
        state["phase"] = "train"
        state["train_elapsed"] = 0.0
        state["cycles"] = 0
    elif phase == "train":
        var train_duration := mission_data.get("train_duration", 4.0)
        var cycle_interval := mission_data.get("cycle_interval", 0.5)
        state["train_elapsed"] = state.get("train_elapsed", 0.0) + delta
        var cycles := int(state["train_elapsed"] / cycle_interval)
        if cycles > state.get("cycles", 0):
            # apply paired pulses to reinforce pattern
            for node_id in pattern:
                simulation.inject_pulse(node_id, mission_data.get("train_pulse", 0.5))
            state["cycles"] = cycles
        if state["train_elapsed"] >= train_duration:
            state["phase"] = "cue"
            state["cue_timer"] = 0.0
    elif phase == "cue":
        state["cue_timer"] = state.get("cue_timer", 0.0) + delta
        if state["cue_timer"] <= mission_data.get("cue_duration", 1.0):
            for node_id in cue:
                simulation.inject_pulse(node_id, mission_data.get("cue_pulse", 0.6))
        else:
            state["phase"] = "evaluate"
            state["success_timer"] = 0.0
    elif phase == "evaluate":
        var active_count := 0
        for node_id in pattern:
            if simulation.get_activation(node_id) >= threshold:
                active_count += 1
        if active_count >= pattern.size():
            state["success_timer"] = state.get("success_timer", 0.0) + delta
            if state["success_timer"] >= sustain and not state.get("success", false):
                state["success"] = true
                emit_signal("mission_completed", active_id)
        else:
            state["success_timer"] = 0.0
    return {
        "status": state.get("success", false) ? "success" : "in_progress",
        "phase": state.get("phase", "train"),
        "progress": state.get("success_timer", 0.0) / max(mission_data.get("sustain_time", 2.0), 0.01)
    }
