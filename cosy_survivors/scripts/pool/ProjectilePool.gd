extends Node

@export var projectile_scene := preload("res://scenes/Projectile.tscn")
var pool : Array = []

func fetch()->Node:
    var p
    if pool.size() > 0:
        p = pool.pop_back()
    else:
        p = projectile_scene.instantiate()
    p.visible = true
    add_child(p)
    p.pool = self
    return p

func recycle(p):
    p.visible = false
    pool.append(p)
