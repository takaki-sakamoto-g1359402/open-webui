extends CharacterBody2D

var speed := 120.0
var hp := 100
@onready var weapon_system := WeaponSystem.new()
@onready var upgrade_system := UpgradeSystem.new()

func _ready():
    add_child(weapon_system)
    add_child(upgrade_system)

func _physics_process(delta):
    var input_vec := Vector2.ZERO
    input_vec = Input.get_vector("move_left","move_right","move_up","move_down")
    if Globals.joystick_dir.length() > 0.1:
        input_vec = Globals.joystick_dir
    velocity = input_vec.normalized() * speed
    move_and_slide()

func apply_upgrade(id:String, value):
    match id:
        "move_spd":
            speed += speed * value
        _:
            weapon_system.apply_stat(id, value)
