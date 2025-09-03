extends Node

class Base:
    var owner
    var stats
    var cooldown := 0.0
    func _init(o, s):
        owner = o
        stats = s
        cooldown = 0.0
    func update(delta):
        cooldown -= delta
        if cooldown <= 0:
            fire()
            cooldown = stats["cooldown"]
    func fire():
        pass

class Spin extends Base:
    func fire():
        var pool = owner.get_node("/root/Main/ProjectilePool")
        for i in range(4):
            var dir = Vector2.RIGHT.rotated(i * PI * 0.5)
            var p = pool.fetch()
            p.start(owner.global_position, dir, stats["dps"])
            owner.get_parent().get_node("Projectiles").add_child(p)

class Beam extends Base:
    func fire():
        var pool = owner.get_node("/root/Main/ProjectilePool")
        var p = pool.fetch()
        p.start(owner.global_position, Vector2.RIGHT, stats["dps"], 600, 0.3)
        owner.get_parent().get_node("Projectiles").add_child(p)

class Shot extends Base:
    func fire():
        var rng = Globals.get_random()
        var pool = owner.get_node("/root/Main/ProjectilePool")
        for i in range(stats["pellets"]):
            var dir = Vector2.RIGHT.rotated(rng.randf_range(-0.5,0.5))
            var p = pool.fetch()
            p.start(owner.global_position, dir, stats["dps"])
            owner.get_parent().get_node("Projectiles").add_child(p)

class Boomer extends Base:
    func fire():
        var pool = owner.get_node("/root/Main/ProjectilePool")
        var p = pool.fetch()
        p.start(owner.global_position, Vector2.RIGHT, stats["dps"])
        owner.get_parent().get_node("Projectiles").add_child(p)

class Mine extends Base:
    func fire():
        var pool = owner.get_node("/root/Main/ProjectilePool")
        var p = pool.fetch()
        p.start(owner.global_position, Vector2.ZERO, stats["dps"], 0, stats["arm_time"])
        owner.get_parent().get_node("Projectiles").add_child(p)
