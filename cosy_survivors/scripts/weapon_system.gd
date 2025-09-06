extends Node
class_name WeaponSystem

@export var projectile_pool_path := NodePath("../ProjectilePool")
var weapons := {}

func _ready():
    var file := FileAccess.open("res://data/weapons.json", FileAccess.READ)
    if file:
        var data = JSON.parse_string(file.get_as_text())
        file.close()
        weapons["spin"] = SpinWeapon.new(data["spin"])
        weapons["beam"] = BeamWeapon.new(data["beam"])
        weapons["shot"] = ShotWeapon.new(data["shot"])
        weapons["boomer"] = BoomerWeapon.new(data["boomer"])
        weapons["mine"] = MineWeapon.new(data["mine"])
    for w in weapons.values():
        w.pool = get_node(projectile_pool_path)

func _physics_process(delta):
    for w in weapons.values():
        w.update(delta, get_parent())

func apply_stat(id:String, value):
    for w in weapons.values():
        w.apply_stat(id, value)

class Weapon:
    var data
    var cooldown
    var timer = 0.0
    var pool
    func _init(d):
        data = d
        cooldown = d.get("cooldown",1.0)
    func update(delta, owner):
        timer += delta
        if timer >= cooldown:
            timer = 0
            fire(owner)
    func fire(owner): pass
    func apply_stat(id,value):
        if id == "cd_red":
            cooldown = max(0.1, cooldown*(1.0-value))

class SpinWeapon extends Weapon:
    func fire(owner):
        var p = pool.fetch()
        p.global_position = owner.global_position
        p.velocity = Vector2.ZERO
        p.damage = data.get("dps",10)
        p.life = 0.3

class BeamWeapon extends Weapon:
    func fire(owner):
        var p = pool.fetch()
        p.global_position = owner.global_position
        p.velocity = Vector2.RIGHT*300
        p.damage = data.get("dps",20)
        p.life = 0.5

class ShotWeapon extends Weapon:
    func fire(owner):
        var pellets = data.get("pellets",3)
        for i in range(pellets):
            var angle = deg_to_rad(-15 + 30.0*i/(pellets-1))
            var p = pool.fetch()
            p.global_position = owner.global_position
            p.velocity = Vector2(300,0).rotated(angle)
            p.damage = data.get("dps",20)/pellets
            p.life = 1

class BoomerWeapon extends Weapon:
    func fire(owner):
        var p = pool.fetch()
        p.global_position = owner.global_position
        p.velocity = Vector2.RIGHT*200
        p.damage = data.get("dps",15)
        p.life = 1.2

class MineWeapon extends Weapon:
    func fire(owner):
        var p = pool.fetch()
        p.global_position = owner.global_position
        p.velocity = Vector2.ZERO
        p.damage = data.get("dps",30)
        p.life = data.get("arm_time",1.0)
