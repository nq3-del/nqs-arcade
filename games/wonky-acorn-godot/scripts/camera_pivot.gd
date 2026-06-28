extends Node3D

## Third-person camera pivot
## Mouse to look, right stick on controller, Q/E to rotate

@export var mouse_sensitivity := 0.004
@export var stick_sensitivity := 2.5
@export var key_rotate_speed := 2.5
@export var min_pitch := -0.9
@export var max_pitch := 0.4

var dragging := false


func _ready() -> void:
	# Use captured mouse mode when in 3D so dragging is smooth
	pass


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		dragging = event.pressed
		if dragging:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		else:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

	if event is InputEventMouseMotion and dragging:
		rotation.y -= event.relative.x * mouse_sensitivity
		rotation.x = clamp(rotation.x - event.relative.y * mouse_sensitivity, min_pitch, max_pitch)


func _process(delta: float) -> void:
	# Right stick on controller (orbit_left / orbit_right)
	var x_dir := Input.get_action_strength("orbit_right") - Input.get_action_strength("orbit_left")
	if abs(x_dir) > 0.05:
		rotation.y -= x_dir * stick_sensitivity * delta

	# Right stick Y (controller axis 3 — pitch)
	var stick_y := 0.0
	if Input.get_connected_joypads().size() > 0:
		stick_y = Input.get_joy_axis(0, JOY_AXIS_RIGHT_Y)
		if abs(stick_y) < 0.15:
			stick_y = 0.0
	if abs(stick_y) > 0.05:
		rotation.x = clamp(rotation.x - stick_y * stick_sensitivity * delta, min_pitch, max_pitch)
