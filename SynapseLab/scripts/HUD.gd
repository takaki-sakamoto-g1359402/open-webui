extends Control
class_name HUD

signal tool_selected(tool: String)
signal param_changed(name: String, value: float)
signal learning_toggled(enabled: bool)
signal pause_toggled(paused: bool)
signal step_requested()
signal save_requested()
signal load_requested()
signal mission_chosen(id: String)
signal analytics_toggled(visible: bool)

const TOOL_BUTTONS := {
    "Select": "select",
    "AddNeuron": "add_neuron",
    "AddSynapse": "add_synapse",
    "Remove": "remove",
    "Inject": "inject"
}

var slider_nodes := {}
var suppress_tool_signal := false

func _ready() -> void:
    _setup_tool_buttons()
    _setup_sliders()
    $Margin/VBox/Toggles/Learning.toggled.connect(_on_learning_toggled)
    $Margin/VBox/Toggles/Pause.toggled.connect(_on_pause_toggled)
    $Margin/VBox/Toggles/Step.pressed.connect(_on_step_pressed)
    $Margin/VBox/FileOps/Save.pressed.connect(func(): emit_signal("save_requested"))
    $Margin/VBox/FileOps/Load.pressed.connect(func(): emit_signal("load_requested"))
    $Margin/VBox/AnalyticsButton.pressed.connect(_on_analytics_button)
    $Margin/VBox/MissionSelect.item_selected.connect(_on_mission_selected)

func _setup_tool_buttons() -> void:
    for name in TOOL_BUTTONS.keys():
        var node: Button = $Margin/VBox/Tools.get_node(name)
        node.pressed.connect(_on_tool_pressed.bind(name))
    _set_tool_checked("Select")

func _setup_sliders() -> void:
    _register_slider($Margin/VBox/Params/LearningRate, "learning_rate")
    _register_slider($Margin/VBox/Params/Decay, "decay")
    _register_slider($Margin/VBox/Params/Leak, "leak")
    _register_slider($Margin/VBox/Params/Noise, "noise")
    _register_slider($Margin/VBox/Params/TimeScale, "time_scale")

func _register_slider(container: HBoxContainer, key: String) -> void:
    var slider: HSlider = container.get_node("Slider")
    var value_label: Label = container.get_node("Value")
    slider.value_changed.connect(func(value):
        value_label.text = "%.2f" % value
        emit_signal("param_changed", key, value)
    )
    slider_nodes[key] = slider

func set_defaults(defaults: Dictionary) -> void:
    for key in defaults.keys():
        if slider_nodes.has(key):
            var slider: HSlider = slider_nodes[key]
            slider.value = defaults[key]
            slider.emit_signal("value_changed", slider.value)
    if defaults.has("learning_enabled"):
        $Margin/VBox/Toggles/Learning.button_pressed = defaults["learning_enabled"]
    if defaults.has("paused"):
        $Margin/VBox/Toggles/Pause.button_pressed = defaults["paused"]

func set_tool(tool: String) -> void:
    for name in TOOL_BUTTONS.keys():
        if TOOL_BUTTONS[name] == tool:
            _set_tool_checked(name)
            break

func _set_tool_checked(button_name: String) -> void:
    suppress_tool_signal = true
    for name in TOOL_BUTTONS.keys():
        var node: Button = $Margin/VBox/Tools.get_node(name)
        node.button_pressed = (name == button_name)
    suppress_tool_signal = false
    _emit_tool(button_name)

func _on_tool_pressed(button_name: String) -> void:
    if suppress_tool_signal:
        return
    _set_tool_checked(button_name)

func _emit_tool(button_name: String) -> void:
    var tool := TOOL_BUTTONS.get(button_name, "select")
    emit_signal("tool_selected", tool)

func _on_learning_toggled(pressed: bool) -> void:
    emit_signal("learning_toggled", pressed)

func _on_pause_toggled(pressed: bool) -> void:
    emit_signal("pause_toggled", pressed)

func _on_step_pressed() -> void:
    emit_signal("step_requested")

func _on_analytics_button() -> void:
    var panel: Panel = $Margin/VBox/AnalyticsPanel
    panel.visible = not panel.visible
    emit_signal("analytics_toggled", panel.visible)

func set_missions(listing: Array) -> void:
    var option: OptionButton = $Margin/VBox/MissionSelect
    option.clear()
    option.add_item("Sandbox")
    option.set_item_metadata(0, "")
    var index := 1
    for mission in listing:
        option.add_item(mission.get("title", mission.get("id", "Mission")))
        option.set_item_metadata(index, mission.get("id", ""))
        index += 1
    option.select(0)

func _on_mission_selected(index: int) -> void:
    var option: OptionButton = $Margin/VBox/MissionSelect
    var mission_id = option.get_item_metadata(index)
    emit_signal("mission_chosen", mission_id if mission_id != null else "")

func update_stats(stats: Dictionary) -> void:
    var label: Label = $Margin/VBox/AnalyticsPanel/AnalyticsVBox/Stats
    var gini := stats.get("gini", 0.0)
    var active := stats.get("active_percent", 0.0)
    var nodes := stats.get("node_count", 0)
    var edges := stats.get("edge_count", 0)
    label.text = "Nodes: %d  Edges: %d\nActive: %.1f%%  Gini: %.2f" % [nodes, edges, active, gini]
    var activation_hist := stats.get("activation_hist", {})
    var weight_hist := stats.get("weight_hist", {})
    $Margin/VBox/AnalyticsPanel/AnalyticsVBox/ActivationHist.text = _hist_to_text(activation_hist, "Activation")
    $Margin/VBox/AnalyticsPanel/AnalyticsVBox/WeightHist.text = _hist_to_text(weight_hist, "Weight")

func update_mission_status(text: String) -> void:
    $Margin/VBox/MissionLabel.text = text

func _hist_to_text(hist: Dictionary, title: String) -> String:
    if not hist.has("counts"):
        return title + " histogram unavailable"
    var counts: Array = hist["counts"]
    if counts.is_empty():
        return title + ": (no data)"
    var max_count := 0
    for value in counts:
        if value > max_count:
            max_count = value
    var builder := "[center][b]%s[/b][/center]\n" % title
    max_count = max(max_count, 1)
    for i in range(counts.size()):
        var bar_length := int(round(20.0 * counts[i] / max_count))
        var bar := "#".repeat(bar_length)
        builder += "%02d | %s (%d)\n" % [i, bar, counts[i]]
    return builder
