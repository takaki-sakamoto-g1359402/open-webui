extends Area2D

var velocity := Vector2.ZERO
var damage := 10.0
var life := 2.0
var pool = null

func _physics_process(delta):
    position += velocity * delta
    life -= delta
    if life <= 0:
        if pool:
            pool.recycle(self)

func _on_body_entered(body):
    if body.has_method("hit"):
        body.hit(damage)
        if pool:
            pool.recycle(self)
