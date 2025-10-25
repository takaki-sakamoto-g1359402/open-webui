extends Node2D

@export var from_id: String = ""
@export var to_id: String = ""

var weight: float = 0.1
var color_base: Color = Color(0.75, 0.35, 0.95)
var start_point: Vector2 = Vector2.ZERO
var end_point: Vector2 = Vector2.ZERO

func set_weight(value: float) -> void:
    weight = max(value, 0.0)
    queue_redraw()

func set_points(a: Vector2, b: Vector2) -> void:
    start_point = a
    end_point = b
    queue_redraw()

func _draw() -> void:
    var dir := end_point - start_point
    if dir.length() <= 1.0:
        return
    var thickness := clamp(weight * 6.0, 1.0, 10.0)
    var hue_shift := clamp(weight, 0.0, 1.0)
    var color := color_base.lerp(Color(0.2, 0.8, 0.3), hue_shift)
    color.a = 0.6
    draw_line(start_point, end_point, color, thickness)
    # arrow head
    var normal := dir.normalized()
    var arrow_size := 10.0 + thickness * 0.5
    var tip := end_point
    var left := tip - normal * arrow_size + normal.rotated(PI / 2.5) * (arrow_size * 0.4)
    var right := tip - normal * arrow_size + normal.rotated(-PI / 2.5) * (arrow_size * 0.4)
    draw_polygon(PackedVector2Array([tip, left, right]), PackedColorArray([color, color, color]))
