extends Node3D

## Simple orbit camera — drag mouse or use A/D to rotate around Pico.
## Mouse wheel to zoom.

@export var distance := 4.0
@export var min_distance := 1.5
@export var max_distance := 10.0
@export var height := 1.0
@export var rotation_speed := 2.0
@export var mouse_sensitivity := 0.005

var angle := 0.0
var pitch := -0.15
var dragging := false


func _ready() -> void:
	_update_position()


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			dragging = event.pressed
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP:
			distance = clamp(distance - 0.5, min_distance, max_distance)
			_update_position()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			distance = clamp(distance + 0.5, min_distance, max_distance)
			_update_position()

	if event is InputEventMouseMotion and dragging:
		angle -= event.relative.x * mouse_sensitivity
		pitch = clamp(pitch - event.relative.y * mouse_sensitivity, -1.2, 0.5)
		_update_position()


func _process(delta: float) -> void:
	var input_dir := 0.0
	if Input.is_action_pressed("orbit_left"):
		input_dir -= 1.0
	if Input.is_action_pressed("orbit_right"):
		input_dir += 1.0
	if input_dir != 0.0:
		angle -= input_dir * rotation_speed * delta
		_update_position()


func _update_position() -> void:
	var x := sin(angle) * cos(pitch) * distance
	var z := cos(angle) * cos(pitch) * distance
	var y := sin(-pitch) * distance + height
	position = Vector3(x, y, z)
	look_at(Vector3(0, height, 0), Vector3.UP)
