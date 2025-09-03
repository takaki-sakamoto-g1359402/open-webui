extends Area2D

var velocity: Vector2 = Vector2.ZERO
var damage := 10

func start(pos:Vector2, dir:Vector2, dmg:int, speed:float=300.0, life:float=2.0) -> void:
    global_position = pos
    velocity = dir.normalized() * speed
    damage = dmg
    $Timer.start(life)
    show()

func _physics_process(delta):
    position += velocity * delta

func _on_body_entered(body):
    if body.has_method("hit"):
        body.hit(damage)
    get_node("/root/Main/ProjectilePool").recycle(self)

func _on_Timer_timeout():
    get_node("/root/Main/ProjectilePool").recycle(self)
