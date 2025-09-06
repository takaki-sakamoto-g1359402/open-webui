extends Node

## Simple JSON save/load
var data := {
    "coins":0,
    "perma_upgrades":{},
    "options":{"bgm":1.0,"se":1.0,"lang":"ja"}
}

func load_save():
    var f := FileAccess.open(Globals.SAVE_PATH, FileAccess.READ)
    if f:
        data = JSON.parse_string(f.get_as_text())
        f.close()
    else:
        save()

func save():
    var f := FileAccess.open(Globals.SAVE_PATH, FileAccess.WRITE)
    f.store_string(JSON.stringify(data))
    f.close()
