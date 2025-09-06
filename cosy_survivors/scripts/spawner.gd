extends Node

@export var player_path := NodePath("../Player")
@export var pool_path := NodePath("../EnemyPool")
var waves := []
var wave_index := 0
var elapsed := 0.0
var active := false

func _ready():
    set_process(true)
    var file := FileAccess.open("res://data/waves.json", FileAccess.READ)
    if file:
        waves = JSON.parse_string(file.get_as_text())
        file.close()

func _process(delta):
    if not active:
        return
    elapsed += delta
    while wave_index < waves.size() and elapsed >= waves[wave_index]["t"]:
        spawn_wave(waves[wave_index])
        wave_index += 1

func spawn_wave(wave):
    var pool = get_node(pool_path)
    for i in range(wave["count"]):
        var e = pool.fetch()
        var player = get_node(player_path)
        e.global_position = player.global_position + Vector2(Globals.rng.randf_range(-200,200), Globals.rng.randf_range(-200,200))
        e.is_boss = wave.get("boss", false)
        e.hp = 10 * (e.is_boss ? 10 : 1)
        e.target = get_node(player_path)
