extends CharacterBody3D

## Pico — third-person player controller
## Camera-relative WASD / left stick movement, jump, sprint.

@export var speed := 5.0
@export var sprint_multiplier := 1.8
@export var jump_force := 9.0
@export var gravity := 25.0
@export var rotation_speed := 12.0
@export var accel := 12.0
@export var decel := 14.0

@onready var camera_pivot: Node3D = $CameraPivot
@onready var model_holder: Node3D = $ModelHolder
@onready var follow_cam: Node3D = $CameraPivot/SpringArm3D/Camera3D


func _physics_process(delta: float) -> void:
	# Gravity
	if not is_on_floor():
		velocity.y -= gravity * delta

	# Camera-relative input
	var input_dir := Vector2.ZERO
	input_dir.x = Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
	input_dir.y = Input.get_action_strength("move_back") - Input.get_action_strength("move_forward")
	input_dir = input_dir.limit_length(1.0)

	var cam_basis := camera_pivot.global_transform.basis
	var direction := (cam_basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	direction.y = 0
	direction = direction.normalized()

	# Sprint
	var current_speed := speed
	if Input.is_action_pressed("sprint"):
		current_speed *= sprint_multiplier

	# Accel / decel toward target
	var target_x := direction.x * current_speed if direction.length() > 0.1 else 0.0
	var target_z := direction.z * current_speed if direction.length() > 0.1 else 0.0
	var rate := accel if direction.length() > 0.1 else decel
	velocity.x = move_toward(velocity.x, target_x, rate * delta)
	velocity.z = move_toward(velocity.z, target_z, rate * delta)

	# Jump
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_force

	# Face movement direction
	if direction.length() > 0.1:
		var target_rot := atan2(direction.x, direction.z)
		model_holder.rotation.y = lerp_angle(model_holder.rotation.y, target_rot, rotation_speed * delta)

	move_and_slide()

	# Reset if fall off world
	if global_position.y < -20:
		global_position = Vector3(0, 3, 0)
		velocity = Vector3.ZERO
