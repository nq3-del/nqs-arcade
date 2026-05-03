extends Area3D

## Ring collectible — spins and floats, collected on player contact

@export var spin_speed := 2.0
@export var float_amplitude := 0.15
@export var float_speed := 3.0

var base_y := 0.0
var collected := false


func _ready() -> void:
	base_y = global_position.y
	body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	if collected:
		return
	rotation.y += spin_speed * delta
	global_position.y = base_y + sin(Time.get_ticks_msec() * 0.001 * float_speed) * float_amplitude


func _on_body_entered(body: Node3D) -> void:
	if collected:
		return
	if body.has_method("collect_ring"):
		collected = true
		body.collect_ring()
		# Quick scale-down animation then free
		var tween := create_tween()
		tween.tween_property(self, "scale", Vector3.ZERO, 0.2)
		tween.tween_callback(queue_free)
