extends Node2D

@export var neuron_id: String = ""
@export var radius: float = 22.0

var activation: float = 0.0
var cluster_color: Color = Color(0.35, 0.6, 0.9)
var selected: bool = false
var goal: bool = false

@onready var label: Label = $Label

func _ready() -> void:
    _refresh_label()
    queue_redraw()

func set_activation(value: float) -> void:
    activation = max(value, 0.0)
    _refresh_label()
    queue_redraw()

func set_cluster_color(color: Color) -> void:
    cluster_color = color
    queue_redraw()

func set_goal(flag: bool) -> void:
    goal = flag
    queue_redraw()

func set_selected(flag: bool) -> void:
    selected = flag
    queue_redraw()

func _refresh_label() -> void:
    if label:
        label.text = "%s\n%.2f" % [neuron_id, activation]

func _draw() -> void:
    var intensity := clamp(activation, 0.0, 1.0)
    var fill := cluster_color.lightened(0.4)
    fill.a = 0.4 + intensity * 0.5
    draw_circle(Vector2.ZERO, radius, fill)
    var border_color := Color(0.1, 0.1, 0.1)
    if goal:
        border_color = Color(0.9, 0.2, 0.2)
    if selected:
        border_color = Color(1.0, 0.85, 0.3)
    draw_arc(Vector2.ZERO, radius, 0.0, TAU, 32, border_color, 2.5)

func get_radius() -> float:
    return radius
