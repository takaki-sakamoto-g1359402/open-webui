extends Node

const PATH = "user://save.json"
var data = {
    "coins":0,
    "upgrades":{},
    "options":{"bgm":1.0,"se":1.0,"vibrate":true}
}

func load() -> void:
    if FileAccess.file_exists(PATH):
        var f = FileAccess.open(PATH, FileAccess.READ)
        data = JSON.parse_string(f.get_as_text())
        f.close()

func save() -> void:
    var f = FileAccess.open(PATH, FileAccess.WRITE)
    f.store_string(JSON.stringify(data))
    f.close()
