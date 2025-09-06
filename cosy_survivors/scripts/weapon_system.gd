extends Node
## 5武器をJSONで駆動。各武器はTimerで自動発射し、ProjectilePoolを使用。

class_name WeaponSystem

var owner: Node2D
var timers := {} # id -> Timer

func _ready(): pass

func setup(p: Node2D):
    owner = p
    for id in Globals.weapons.keys():
        var t := Timer.new()
        t.autostart = true
        t.one_shot = false
        t.wait_time = max(0.1, float(Globals.weapons[id].get("cooldown",1.0)))
        add_child(t)
        timers[id] = t
        t.timeout.connect(func(): _fire(id))

func _fire(id:String):
    match id:
        "spin":   _spin()
        "beam":   _beam()
        "shot":   _shot()
        "boomer": _boomer()
        "mine":   _mine()

func _spin():
    var d = Globals.weapons["spin"]
    var pool = $"../ProjectilePool"
    for i in 8:
        var p = pool.fetch()
        p.position = owner.global_position
        p.damage = float(d.dps) * 0.15
        p.life = 0.5
        # 軌道は弾側で angle を回す簡易版
        p.set_meta("mode","circle")
        p.set_meta("origin", owner.global_position)
        p.set_meta("radius", float(d.radius))
        p.set_meta("angle", i * TAU/8.0)

func _beam():
    var d = Globals.weapons["beam"]
    var p = $"../ProjectilePool".fetch()
    p.position = owner.global_position
    p.damage = float(d.dps) * 0.3
    p.life = 0.25
    p.set_meta("mode","beam")
    p.set_meta("width", float(d.width))

func _shot():
    var d = Globals.weapons["shot"]
    var pellets := int(d.pellets)
    for i in pellets:
        var p = $"../ProjectilePool".fetch()
        p.position = owner.global_position
        var spread = deg_to_rad(-15.0 + 30.0 * (i/(max(1,pellets-1.0))))
        var dir = Vector2.RIGHT.rotated(spread)
        p.velocity = dir * 420.0
        p.damage = float(d.dps) * 0.20
        p.life = 0.9

func _boomer():
    var d = Globals.weapons["boomer"]
    var p = $"../ProjectilePool".fetch()
    p.position = owner.global_position
    p.damage = float(d.dps) * 0.25
    p.life = 1.2
    p.set_meta("mode","boomer")
    p.set_meta("origin", owner.global_position)
    p.set_meta("range", float(d.range))
    p.set_meta("angle", 0.0)

func _mine():
    var d = Globals.weapons["mine"]
    var p = $"../ProjectilePool".fetch()
    p.position = owner.global_position
    p.damage = float(d.dps) * 0.8
    p.life = 2.5
    p.set_meta("mode","mine")
    p.set_meta("arm", float(d.arm_time))
