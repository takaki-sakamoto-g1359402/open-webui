extends Area2D

@export var exp_amount := 1

func _on_body_entered(body):
    if body.has_method("add_exp"):
        body.add_exp(exp_amount)
        queue_free()
