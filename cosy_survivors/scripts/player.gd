extends CharacterBody2D

@export var speed: float = 200.0
var move_input: Vector2 = Vector2.ZERO
var weapons = []
var weapon_data = {}
var exp := 0
var level := 1
var exp_to_level := 10

func _ready():
    var file = FileAccess.open("res://data/weapons.json", FileAccess.READ)
    weapon_data = JSON.parse_string(file.get_as_text())
    file.close()
    var WeaponSys = preload("res://scripts/weapon_system.gd")
    weapons = [
        WeaponSys.Spin.new(self, weapon_data["spin"])
    ]
    print("Run start")

func _physics_process(delta):
    var dir = Vector2(
        Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
        Input.get_action_strength("move_down") - Input.get_action_strength("move_up")
    ) + move_input
    if dir.length() > 1:
        dir = dir.normalized()
    velocity = dir * speed
    move_and_slide()
    for w in weapons:
        w.update(delta)

func add_exp(amount:int) -> void:
    exp += amount
    if exp >= exp_to_level:
        exp -= exp_to_level
        level += 1
        exp_to_level = int(exp_to_level * 1.2)
        var Upgrade = preload("res://scripts/upgrade_system.gd")
        Upgrade.show_selection(self)

func _on_joystick_moved(dir:Vector2) -> void:
    move_input = dir
