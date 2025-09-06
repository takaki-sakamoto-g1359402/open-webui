extends Node

## Global data and helpers
const SAVE_PATH := "user://save.json"
var rng := RandomNumberGenerator.new()
var language := "ja"
var difficulty := 1.0
var joystick_dir := Vector2.ZERO
var boss_dead := false

signal language_changed

func _ready():
    rng.seed = int(Time.get_ticks_msec())
    TranslationServer.set_locale(language)

func set_seed(seed:int):
    rng.seed = seed

func switch_language(lang:String):
    language = lang
    TranslationServer.set_locale(lang)
    emit_signal("language_changed")
