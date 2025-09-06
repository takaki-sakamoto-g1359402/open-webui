extends Control

var dragging := false
var origin := Vector2.ZERO
var radius := 64.0

func _gui_input(event):
    if event is InputEventScreenTouch:
        if event.pressed and event.position.x < get_viewport_rect().size.x/2:
            dragging = true
            origin = event.position
            Globals.joystick_dir = Vector2.ZERO
        else:
            dragging = false
            Globals.joystick_dir = Vector2.ZERO
    elif event is InputEventScreenDrag and dragging:
        var vec = event.position - origin
        Globals.joystick_dir = vec.clamped(radius)/radius

func _draw():
    if dragging:
        draw_circle(origin, radius, Color(1,1,1,0.2))
        draw_circle(origin + Globals.joystick_dir*radius, 16, Color(1,1,1,0.5))
