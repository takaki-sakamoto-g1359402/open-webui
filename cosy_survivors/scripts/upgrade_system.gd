extends Node
class_name UpgradeSystem

var upgrades := []

func _ready():
    var file := FileAccess.open("res://data/upgrades.json", FileAccess.READ)
    if file:
        upgrades = JSON.parse_string(file.get_as_text())
        file.close()

func roll_choices()->Array:
    var pool = []
    for u in upgrades:
        if u.get("exclusive",false) and u.get("stack",0) > 0:
            continue
        pool.append(u)
    var choices = []
    while choices.size() < 3 and pool.size() > 0:
        var total := 0
        for u in pool: total += u.weight
        var pick := Globals.rng.randf()*total
        for u in pool:
            pick -= u.weight
            if pick <= 0:
                choices.append(u)
                pool.erase(u)
                break
    return choices

func apply(id:String):
    for u in upgrades:
        if u.id == id:
            u["stack"] = u.get("stack",0) + 1
            print("upgrade:", id)
            get_parent().apply_upgrade(id, u.value)
            break
