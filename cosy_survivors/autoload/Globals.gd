extends Node

const SAVE_PATH = "user://save.json"
var rng: RandomNumberGenerator = RandomNumberGenerator.new()
var language := "ja"
var difficulty := 1.0

func _ready():
    rng.randomize()

func set_seed(seed:int) -> void:
    rng.seed = seed

func get_random() -> RandomNumberGenerator:
    return rng
