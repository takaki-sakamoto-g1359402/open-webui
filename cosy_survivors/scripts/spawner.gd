extends Node
## JSON waves.json で t(秒)到達時にスポーン。boss:true は強化個体。

@export var enemy_scene: PackedScene = preload("res://scenes/Enemy.tscn")
@export var boss_scale := 2.0

var time := 0.0
var active := false
var idx := 0
var running_batches := []

@onready var enemy_pool = $"../EnemyPool"
@onready var player = $"../Player"

func _process(delta):
    if not active: return
    time += delta
    while idx < Globals.waves.size() and Globals.waves[idx].t <= time:
        _schedule(Globals.waves[idx]); idx += 1
    for i in range(running_batches.size()-1, -1, -1):
        var b = running_batches[i]
        b.timer -= delta
        if b.timer <= 0.0:
            b.timer = b.interval
            b.left -= 1
            if b.left >= 0:
                _spawn(b.enemy_id, b.boss)
            else:
                running_batches.remove_at(i)

func _schedule(w):
    running_batches.append({
        "interval": float(w.get("interval",0.5)),
        "timer": 0.0,
        "left": int(w.count)-1,
        "enemy_id": w.enemy_id,
        "boss": bool(w.get("boss",false))
    })
    _spawn(w.enemy_id, bool(w.get("boss",false)))

func _spawn(enemy_id:String, is_boss:bool):
    var e = enemy_pool.fetch()
    e.target = player
    e.is_boss = is_boss
    e.hp = (140 if is_boss else 20)
    e.speed = (60 if is_boss else 80)
    e.scale = Vector2.ONE * (boss_scale if is_boss else 1.0)
    e.global_position = player.global_position + Vector2(900,0).rotated(randf_range(0,TAU))

func randf_range(a,b): return randf()*(b-a)+a
