extends Node3D

## ModelLoader — Worlds Collide
## Loads .glb/.gltf files from assets/models/ at runtime.
## Manages the Dash / Turbo / Murphy character roster (press 1, 2, 3 to swap).

const WORLD_MODEL := "res://assets/models/world/level.glb"
const RING_MODEL := "res://assets/models/props/ring.glb"

const ROSTER := [
	{"name": "Dash",   "model": "res://assets/models/kenney_platformer/character-oozi.glb", "tint": Color(1.0, 0.32, 0.20)},
	{"name": "Turbo",  "model": "res://assets/models/kenney_platformer/character-oopi.glb", "tint": Color(0.20, 0.62, 1.00)},
	{"name": "Murphy", "model": "res://assets/models/kenney_platformer/character-oodi.glb", "tint": Color(0.55, 0.30, 0.85)},
]

var current_character := 0

const RING_POSITIONS := [
	Vector3(3, 1.5, -3), Vector3(5, 1.5, -3), Vector3(7, 1.5, -3),
	Vector3(9, 1.5, -5), Vector3(11, 1.5, -5), Vector3(-3, 1.5, -4),
	Vector3(0, 2.5, -15), Vector3(0, 3.5, -25),
	Vector3(5, 4, -8), Vector3(10, 6, -12),
	Vector3(30, 5, -20), Vector3(35, 8, -25),
	Vector3(15, 1.5, 5), Vector3(-10, 1.5, 8),
]


func _ready() -> void:
	_load_world()
	_build_starter_level()
	_apply_character(current_character)
	_spawn_rings()


func _input(event: InputEvent) -> void:
	if not (event is InputEventKey) or not event.pressed or event.echo:
		return
	match event.keycode:
		KEY_1: _apply_character(0)
		KEY_2: _apply_character(1)
		KEY_3: _apply_character(2)


func _load_world() -> void:
	if not ResourceLoader.exists(WORLD_MODEL):
		return
	var scene: PackedScene = load(WORLD_MODEL)
	var instance := scene.instantiate()
	add_child(instance)
	_add_trimesh_collision(instance)
	# Hide the placeholder ground if a world model loaded successfully
	var placeholder := get_tree().current_scene.get_node_or_null("Ground")
	if placeholder:
		placeholder.visible = false
		var col: CollisionShape3D = placeholder.get_node_or_null("CollisionShape3D")
		if col:
			col.disabled = true


func _apply_character(idx: int) -> void:
	if idx < 0 or idx >= ROSTER.size():
		return
	current_character = idx
	var data: Dictionary = ROSTER[idx]
	var player := get_tree().current_scene.get_node_or_null("Player")
	if not player:
		return
	var model_root: Node3D = player.get_node_or_null("Model")
	if not model_root:
		return
	for child in model_root.get_children():
		child.queue_free()
	if not ResourceLoader.exists(data["model"]):
		return
	var scene: PackedScene = load(data["model"])
	var instance := scene.instantiate()
	model_root.add_child(instance)
	_tint_meshes(instance, data["tint"])
	print("Active character: %s" % data["name"])


func _tint_meshes(node: Node, tint: Color) -> void:
	for child in node.get_children():
		if child is MeshInstance3D:
			var mat := StandardMaterial3D.new()
			mat.albedo_color = tint
			mat.roughness = 0.45
			mat.metallic = 0.1
			child.material_override = mat
		_tint_meshes(child, tint)


func _spawn_rings() -> void:
	var ring_scene: PackedScene = load(RING_MODEL) if ResourceLoader.exists(RING_MODEL) else null
	var fallback_mat := _make_ring_material()
	for i in RING_POSITIONS.size():
		var ring := Area3D.new()
		ring.name = "Ring_%d" % i
		ring.position = RING_POSITIONS[i]
		ring.set_script(load("res://scripts/ring.gd"))
		add_child(ring)

		if ring_scene:
			ring.add_child(ring_scene.instantiate())
		else:
			var mesh := MeshInstance3D.new()
			var torus := TorusMesh.new()
			torus.inner_radius = 0.2
			torus.outer_radius = 0.35
			mesh.mesh = torus
			mesh.material_override = fallback_mat
			ring.add_child(mesh)

		var col := CollisionShape3D.new()
		var shape := SphereShape3D.new()
		shape.radius = 0.8
		col.shape = shape
		ring.add_child(col)


func _add_trimesh_collision(node: Node) -> void:
	for child in node.get_children():
		if child is MeshInstance3D:
			child.create_trimesh_collision()
		_add_trimesh_collision(child)


func _build_starter_level() -> void:
	# Skip if a custom world.glb is loaded
	if ResourceLoader.exists(WORLD_MODEL):
		return

	var grass := load("res://assets/models/kenney_platformer/block-grass.glb") as PackedScene
	var grass_tall := load("res://assets/models/kenney_platformer/block-grass-large-tall.glb") as PackedScene
	var tree := load("res://assets/models/kenney_platformer/tree.glb") as PackedScene
	var spring := load("res://assets/models/kenney_platformer/spring.glb") as PackedScene

	var level := Node3D.new()
	level.name = "StarterLevel"
	add_child(level)

	# Central plaza: 13×13 grass tiles around spawn (top surface at y≈1)
	for x in range(-6, 7):
		for z in range(-6, 7):
			_place(grass, level, Vector3(x, 0, z))

	# Forward path along -z to the central elevated rings
	for z in range(-7, -27):
		for x in range(-1, 2):
			_place(grass, level, Vector3(x, 0, z))

	# Stepping platforms ascending the central path (rings at z=-15, z=-25)
	_place(grass, level, Vector3(0, 1, -15))
	_place(grass, level, Vector3(0, 2, -25))

	# Eastern tower (rings at x=30/35, y=5/8)
	for i in 6:
		_place(grass_tall, level, Vector3(28 + i * 2, i, -18 - i * 2))

	# Western ledge (ring at x=-10, z=8)
	for i in 4:
		_place(grass, level, Vector3(-10 - i, 0, 8 - i))

	# Trees scattered around the plaza edge
	var tree_spots := [
		Vector3(-5, 1, -5), Vector3(5, 1, -5),
		Vector3(-5, 1, 5),  Vector3(5, 1, 5),
		Vector3(0, 1, -8),  Vector3(-8, 1, 0), Vector3(8, 1, 0),
	]
	for pos in tree_spots:
		_place(tree, level, pos)

	# Spring near spawn (a fun launch pad)
	_place(spring, level, Vector3(3, 1, 3))

	# Now that we have real ground, hide the flat green placeholder
	var placeholder := get_tree().current_scene.get_node_or_null("Ground")
	if placeholder:
		placeholder.visible = false
		var col: CollisionShape3D = placeholder.get_node_or_null("CollisionShape3D")
		if col:
			col.disabled = true


func _place(scene: PackedScene, parent: Node, pos: Vector3) -> void:
	if scene == null:
		return
	var instance := scene.instantiate()
	instance.position = pos
	parent.add_child(instance)
	_add_trimesh_collision(instance)


func _make_ring_material() -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1, 0.84, 0)
	mat.metallic = 0.9
	mat.roughness = 0.15
	mat.emission_enabled = true
	mat.emission = Color(0.8, 0.6, 0)
	mat.emission_energy_multiplier = 0.5
	return mat
