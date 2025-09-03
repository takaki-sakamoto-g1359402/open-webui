extends Node

var upgrades = []
var counts = {}
var exclusives = {}

func _ready():
    var f = FileAccess.open("res://data/upgrades.json", FileAccess.READ)
    upgrades = JSON.parse_string(f.get_as_text())
    f.close()
    for u in upgrades:
        counts[u.id] = 0

func roll_upgrade() -> Dictionary:
    var rng = Globals.get_random()
    var total = 0
    for u in upgrades:
        if counts[u.id] < u.max_stack and not exclusives.has(u.id):
            total += u.weight
    var r = rng.randf() * total
    var acc = 0
    for u in upgrades:
        if counts[u.id] < u.max_stack and not exclusives.has(u.id):
            acc += u.weight
            if r <= acc:
                return u
    return upgrades[0]

func show_selection(player) -> void:
    var choices = []
    for i in range(3):
        choices.append(roll_upgrade())
    print("Upgrades:", choices.map(func(u): return u.id))
    var pick = choices[0]
    apply(player, pick)
    print("Chosen:", pick.id)

func apply(player, up:Dictionary) -> void:
    counts[up.id] += 1
    if up.exclusive:
        exclusives[up.id] = true
    match up.id:
        "move_spd":
            player.speed *= 1.0 + up.value
        "area":
            pass
        "cd_red":
            pass
        "magnet":
            pass
        "lucky":
            pass
