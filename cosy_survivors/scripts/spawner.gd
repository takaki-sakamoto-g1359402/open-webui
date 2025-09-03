extends Node

var waves = []
var idx := 0
var elapsed := 0.0

func _ready():
    var file = FileAccess.open("res://data/waves.json", FileAccess.READ)
    waves = JSON.parse_string(file.get_as_text())
    file.close()

func _process(delta):
    elapsed += delta
    while idx < waves.size() and elapsed >= float(waves[idx].t):
        spawn_wave(waves[idx])
        idx += 1
    if elapsed >= 600.0:
        print("Run end", elapsed)
        get_tree().quit()

func spawn_wave(w:Dictionary) -> void:
    var rng = Globals.get_random()
    for i in range(int(w.count)):
        var enemy = get_node("/root/Main/EnemyPool").fetch()
        enemy.global_position = global_position + Vector2(rng.randf()*400-200, rng.randf()*400-200)
        enemy.init_enemy(w.enemy_id, w.get("boss", false))
        get_parent().get_node("Enemies").add_child(enemy)
        if w.interval > 0:
            await get_tree().create_timer(w.interval).timeout
