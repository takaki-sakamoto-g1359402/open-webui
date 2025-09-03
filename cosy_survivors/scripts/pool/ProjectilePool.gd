extends Node

@export var projectile_scene: PackedScene = preload("res://scenes/Projectile.tscn")
var pool: Array[Node] = []

func fetch() -> Node:
    if pool.size() > 0:
        var p = pool.pop_back()
        p.show()
        return p
    return projectile_scene.instantiate()

func recycle(p:Node) -> void:
    p.hide()
    pool.append(p)
