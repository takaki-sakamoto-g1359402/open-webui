extends Node

# --- Signals ---
signal level_up_requested(options) # Array[Dictionary]
signal upgrade_chosen(id)
signal language_changed

# --- Save / Options ---
const SAVE_PATH := "user://save.json"
var save := {
    "coins": 0,
    "perma": {},
    "options": {"bgm":0.8,"se":1.0,"vibration":true,"language":"ja"}
}

# --- Runtime globals ---
var rng := RandomNumberGenerator.new()
var difficulty := 1.0
var joystick_dir := Vector2.ZERO
var boss_dead := false

# --- Master data (JSON) ---
var weapons: Dictionary = {}
var waves: Array = []
var upgrades: Array = []
var I18N := {}

func _ready():
    rng.seed = int(Time.get_ticks_msec())
    _load_all()
    switch_language(save.options.language)

func _load_all():
    weapons = _j("res://data/weapons.json")
    waves = _j("res://data/waves.json")
    upgrades = _j("res://data/upgrades.json")
    I18N = _j("res://i18n/%s.json" % (save.options.language if save.options.has("language") else "ja"))
    if FileAccess.file_exists(SAVE_PATH):
        var f = FileAccess.open(SAVE_PATH, FileAccess.READ)
        if f:
            var s = JSON.parse_string(f.get_as_text())
            if typeof(s)==TYPE_DICTIONARY: save = s
            f.close()

func write_save():
    var f = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    if f:
        f.store_string(JSON.stringify(save, "\t"))
        f.close()

func set_seed(seed:int): rng.seed = seed

func switch_language(lang:String):
    save.options.language = lang
    TranslationServer.set_locale(lang)
    I18N = _j("res://i18n/%s.json" % lang)
    emit_signal("language_changed")

func trn(key:String)->String:
    return I18N.get(key, key)

func choose_weighted(arr:Array)->Dictionary:
    var total:=0.0
    for d in arr: total += float(d.get("weight",1.0))
    var pick := rng.randf()*total; var acc:=0.0
    for d in arr:
        acc += float(d.get("weight",1.0))
        if pick <= acc: return d
    return arr.back()

func _j(path:String):
    var f = FileAccess.open(path, FileAccess.READ)
    if f==null: return {}
    var t = f.get_as_text(); f.close()
    return JSON.parse_string(t)
