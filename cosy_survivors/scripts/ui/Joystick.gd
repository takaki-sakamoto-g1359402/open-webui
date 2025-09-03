extends Control

signal moved(dir:Vector2)
var dragging := false
var start_pos := Vector2.ZERO

func _input(event):
    if event is InputEventScreenTouch:
        if event.pressed and event.position.x < get_viewport().size.x/2:
            dragging = true
            start_pos = event.position
        elif not event.pressed and dragging:
            dragging = false
            moved.emit(Vector2.ZERO)
    elif event is InputEventScreenDrag and dragging:
        var vec = (event.position - start_pos) / 64.0
        if vec.length() > 1:
            vec = vec.normalized()
        moved.emit(vec)
