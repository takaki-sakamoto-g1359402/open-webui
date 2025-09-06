extends Node
## 3択/重み/スタック/排他の最小実装

class_name UpgradeSystem
var stacks := {} # id->count

func roll_three()->Array:
    var cand := []
    for u in Globals.upgrades:
        var id=u.id
        if int(stacks.get(id,0)) >= int(u.get("max_stack",1)):
            continue
        cand.append(u)
    var picks := []
    var pool := cand.duplicate()
    for i in 3:
        if pool.is_empty(): break
        var c = Globals.choose_weighted(pool)
        picks.append(c); pool.erase(c)
    return picks

func apply(player, id:String, value):
    stacks[id] = int(stacks.get(id,0))+1
    match id:
        "move_spd": player.speed *= 1.0 + float(value)
        "cd_red":
            if player.has_node("WeaponSystem"):
                for t in player.get_node("WeaponSystem").timers.values():
                    t.wait_time *= (1.0 - float(value))
        "magnet": player.magnet = (player.magnet if "magnet" in player else 64.0) + float(value)
        _: pass
