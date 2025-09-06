extends Area2D
## 軽量弾。meta に mode/origin/radius/angle/arm などを受け取り挙動を切替。

var velocity := Vector2.ZERO
var damage := 10.0
var life := 1.0
var pool = null

func _ready():
    body_entered.connect(_on_hit)

func _process(delta):
    life -= delta
    var mode = get_meta("mode","bullet")
    match mode:
        "bullet":
            position += velocity * delta
        "beam":
            # 可視は簡略、当たりはArea2Dで拾う
            modulate.a = 0.6
        "circle":
            var o = get_meta("origin", position)
            var r = float(get_meta("radius", 64.0))
            var a = float(get_meta("angle", 0.0)) + 4.0*delta
            set_meta("angle", a)
            global_position = o + Vector2(r,0).rotated(a)
        "boomer":
            var o2 = get_meta("origin", position)
            var range = float(get_meta("range", 280.0))
            var ang = float(get_meta("angle",0.0)) + 2.0*delta
            set_meta("angle", ang)
            global_position = o2 + Vector2(range * sin(ang), 0).rotated(ang)
        "mine":
            var arm := float(get_meta("arm",0.8)) - (get_meta("armed_t",0.0) as float)
            set_meta("armed_t", (get_meta("armed_t",0.0) as float) + delta)
            # アーム後の小爆発を簡易化（当たりはArea2D）
    if life <= 0: _recycle()

func _on_hit(body):
    if body.has_method("hit"):
        body.hit(damage)
    _recycle()

func _recycle():
    if pool: pool.recycle(self)
