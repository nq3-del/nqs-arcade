extends CharacterBody3D

## Player Controller — Worlds Collide
## Handles movement, jumping, abilities, camera-relative controls.
## Works with PS5, PS4, Switch Pro controllers + keyboard.

@export var speed := 14.0
@export var sprint_multiplier := 1.8
@export var jump_force := 12.0
@export var double_jump := true
@export var gravity := 30.0
@export var rotation_speed := 10.0
@export var acceleration := 8.0
@export var deceleration := 12.0

@export_group("Abilities")
@export var ability_type := "speed_boost"  # speed_boost, rocket_jump, ground_pound
@export var attack_type := "drift"          # drift, nitro_kick, roll

@onready var camera_pivot: Node3D = $CameraPivot
@onready var spring_arm: SpringArm3D = $CameraPivot/SpringArm3D
@onready var camera: Camera3D = $CameraPivot/SpringArm3D/Camera3D
@onready var model: Node3D = $Model
@onready var anim_player: AnimationPlayer = $Model/AnimationPlayer if has_node("Model/AnimationPlayer") else null

var can_double_jump := false
var is_grounded := false
var dash_cooldown := 0.0
var ring_count := 0
var current_zone := "MEADOW VILLAGE"

# Camera
var camera_rotation := 0.0
var camera_pitch := -0.25


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _unhandled_input(event: InputEvent) -> void:
	# Camera control with mouse
	if event is InputEventMouseMotion:
		camera_rotation -= event.relative.x * 0.003
		camera_pitch -= event.relative.y * 0.003
		camera_pitch = clamp(camera_pitch, -0.8, 0.2)

	# Camera control with right stick
	if event is InputEventJoypadMotion:
		if event.axis == JOY_AXIS_RIGHT_X:
			camera_rotation -= event.axis_value * 0.05
		if event.axis == JOY_AXIS_RIGHT_Y:
			camera_pitch -= event.axis_value * 0.03
			camera_pitch = clamp(camera_pitch, -0.8, 0.2)

	# Toggle mouse capture
	if event.is_action_pressed("ui_cancel"):
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _physics_process(delta: float) -> void:
	# ─── Camera ──────────────────────────────────────────
	camera_pivot.rotation.y = camera_rotation
	camera_pivot.rotation.x = camera_pitch
	camera_pivot.global_position = global_position + Vector3(0, 1.5, 0)

	# ─── Gravity ─────────────────────────────────────────
	if not is_on_floor():
		velocity.y -= gravity * delta

	is_grounded = is_on_floor()

	# ─── Input (camera-relative) ─────────────────────────
	var input_dir := Vector2.ZERO
	input_dir.x = Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
	input_dir.y = Input.get_action_strength("move_back") - Input.get_action_strength("move_forward")
	input_dir = input_dir.limit_length(1.0)

	# Get camera-relative direction
	var cam_basis := camera_pivot.global_transform.basis
	var direction := (cam_basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	direction.y = 0
	direction = direction.normalized()

	# Sprint
	var current_speed := speed
	if Input.is_action_pressed("sprint"):
		current_speed *= sprint_multiplier

	# ─── Movement ────────────────────────────────────────
	var target_velocity := direction * current_speed if direction.length() > 0.1 else Vector3.ZERO
	var accel := acceleration if direction.length() > 0.1 else deceleration

	velocity.x = lerp(velocity.x, target_velocity.x, accel * delta)
	velocity.z = lerp(velocity.z, target_velocity.z, accel * delta)

	# ─── Jump ────────────────────────────────────────────
	if Input.is_action_just_pressed("jump"):
		if is_grounded:
			velocity.y = jump_force
			can_double_jump = double_jump
		elif can_double_jump:
			velocity.y = jump_force * 0.8
			can_double_jump = false

	# ─── Abilities ───────────────────────────────────────
	if dash_cooldown > 0:
		dash_cooldown -= delta

	if Input.is_action_just_pressed("ability") and dash_cooldown <= 0:
		_use_ability(direction)

	if Input.is_action_just_pressed("attack") and dash_cooldown <= 0:
		_use_attack(direction)

	# ─── Apply movement ──────────────────────────────────
	move_and_slide()

	# ─── Face movement direction ─────────────────────────
	if direction.length() > 0.1:
		var target_rot := atan2(direction.x, direction.z)
		model.rotation.y = lerp_angle(model.rotation.y, target_rot, rotation_speed * delta)

	# ─── Zone detection ──────────────────────────────────
	_update_zone()

	# ─── Fall reset ──────────────────────────────────────
	if global_position.y < -20:
		global_position = Vector3(0, 5, 0)
		velocity = Vector3.ZERO


func _use_ability(direction: Vector3) -> void:
	var facing := direction if direction.length() > 0.1 else -model.global_transform.basis.z
	facing = facing.normalized()

	match ability_type:
		"speed_boost":
			if is_grounded:
				velocity.x = facing.x * 40.0
				velocity.z = facing.z * 40.0
				dash_cooldown = 0.7
		"rocket_jump":
			if is_grounded:
				velocity.y = jump_force * 2.5
				velocity.x += facing.x * 6.0
				velocity.z += facing.z * 6.0
				dash_cooldown = 0.8
		"ground_pound":
			if not is_grounded:
				velocity.y = -35.0
				velocity.x *= 0.15
				velocity.z *= 0.15
				dash_cooldown = 0.5


func _use_attack(direction: Vector3) -> void:
	var facing := direction if direction.length() > 0.1 else -model.global_transform.basis.z
	facing = facing.normalized()

	match attack_type:
		"drift":
			if is_grounded:
				velocity.x = facing.x * 28.0
				velocity.z = facing.z * 28.0
				dash_cooldown = 0.6
		"nitro_kick":
			if not is_grounded:
				velocity.x = facing.x * 32.0
				velocity.z = facing.z * 32.0
				velocity.y = 3.0
				dash_cooldown = 0.5
		"roll":
			if is_grounded:
				velocity.x = facing.x * 25.0
				velocity.z = facing.z * 25.0
				dash_cooldown = 0.8


func _update_zone() -> void:
	var pos := global_position
	if pos.x < -20 and pos.x > -50 and pos.z > -35:
		current_zone = "FOREST GROVE"
	elif pos.z < -55:
		current_zone = "HILLTOP RUINS"
	elif pos.x > 30 and pos.z < -20:
		current_zone = "CANYON PASS"
	elif pos.x > 25 and pos.y > 8:
		current_zone = "SKY ISLANDS"
	elif pos.x < -15 and pos.z < -30 and pos.z > -55:
		current_zone = "CRYSTAL LAKE"
	else:
		current_zone = "MEADOW VILLAGE"


func collect_ring() -> void:
	ring_count += 1
