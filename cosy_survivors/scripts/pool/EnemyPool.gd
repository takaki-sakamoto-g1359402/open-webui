extends Node

@export var enemy_scene := preload("res://scenes/Enemy.tscn")
var pool : Array = []

func fetch()->Node:
    var e
    if pool.size() > 0:
        e = pool.pop_back()
    else:
        e = enemy_scene.instantiate()
    e.visible = true
    add_child(e)
    e.pool = self
    return e

func recycle(e):
    e.visible = false
    pool.append(e)
