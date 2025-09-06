extends Control
signal start_game

func _ready():
    _on_lang()
    Globals.language_changed.connect(_on_lang)
    $VBoxContainer/Play.pressed.connect(_on_play)

func _on_lang():
    $VBoxContainer/Play.text = tr("play")
    $VBoxContainer/Settings.text = tr("settings")
    $VBoxContainer/Upgrades.text = tr("upgrades")
    $VBoxContainer/Quests.text = tr("quests")

func _on_play():
    hide()
    emit_signal("start_game")
