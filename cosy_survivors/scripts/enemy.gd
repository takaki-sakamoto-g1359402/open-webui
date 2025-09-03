extends CharacterBody2D

var speed := 40.0
var hp := 10
var enemy_id := "slime"
var boss := false

func init_enemy(id:String, is_boss:bool) -> void:
    enemy_id = id
    boss = is_boss
    hp = boss ? 200 : 20
    speed = boss ? 30 : 40

func _physics_process(delta):
    var player = get_tree().get_root().get_node_or_null("Main/Player")
    if player:
        var dir = (player.global_position - global_position).normalized()
        velocity = dir * speed
        move_and_slide()

func hit(dmg:int) -> void:
    hp -= dmg
    if hp <= 0:
        var pool = get_tree().get_root().get_node("Main/EnemyPool")
        pool.recycle(self)
        var pickup_scene = preload("res://scenes/Pickup.tscn")
        var p = pickup_scene.instantiate()
        p.global_position = global_position
        get_tree().current_scene.add_child(p)
