extends Node

@export var enemy_scene: PackedScene = preload("res://scenes/Enemy.tscn")
var pool: Array[Node] = []

func fetch() -> Node:
    if pool.size() > 0:
        var e = pool.pop_back()
        e.show()
        return e
    return enemy_scene.instantiate()

func recycle(e:Node) -> void:
    e.hide()
    pool.append(e)
