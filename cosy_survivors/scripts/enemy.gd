extends CharacterBody2D

var speed := 50.0
var hp := 10
var target:Node = null
var pool = null
var is_boss := false

func _physics_process(delta):
    if not target:
        return
    var dir = (target.global_position - global_position).normalized()
    velocity = dir * speed
    move_and_slide()

func hit(dmg:float):
    hp -= dmg
    if hp <= 0:
        die()

func die():
    if is_boss:
        Globals.boss_dead = true
    if pool:
        pool.recycle(self)
    else:
        queue_free()

