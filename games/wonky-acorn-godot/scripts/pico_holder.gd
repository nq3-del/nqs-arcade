extends Node3D

## Loads the Pico GLB at runtime and auto-scales / centres him.
## This avoids GLB import quirks (huge or tiny models from Meshy etc.).

@export var model_path: String = "res://assets/models/pico.glb"
@export var target_height: float = 1.6  # how tall Pico should be in metres
@export var stand_on_ground: bool = true


func _ready() -> void:
	var scene: PackedScene = load(model_path)
	if scene == null:
		push_error("Failed to load Pico model from: " + model_path)
		return

	var pico := scene.instantiate()
	add_child(pico)

	# Wait one frame so transforms/meshes settle, then size him
	await get_tree().process_frame
	_auto_size(pico)


func _auto_size(node: Node) -> void:
	var aabb := _calc_aabb(node)
	if aabb.size.y <= 0.0001:
		print("Pico has zero size — skipping auto-resize")
		return

	# Scale to target height
	var scale_factor := target_height / aabb.size.y
	node.scale = Vector3(scale_factor, scale_factor, scale_factor)

	# Recalc aabb after scaling
	aabb = _calc_aabb(node)

	# Centre horizontally
	node.position.x -= (aabb.position.x + aabb.size.x * 0.5)
	node.position.z -= (aabb.position.z + aabb.size.z * 0.5)

	# Stand on ground (bottom of bbox at y=0)
	if stand_on_ground:
		node.position.y -= aabb.position.y

	print("Pico loaded — height: ", aabb.size.y, "m, scale factor: ", scale_factor)


func _calc_aabb(node: Node) -> AABB:
	var bb := AABB()
	var first := true
	var meshes := _find_mesh_instances(node)
	for m in meshes:
		var mi := m as MeshInstance3D
		if mi.mesh == null:
			continue
		var local_aabb := mi.mesh.get_aabb()
		# Transform mesh aabb into the node's local space
		var transformed := mi.transform * local_aabb
		if first:
			bb = transformed
			first = false
		else:
			bb = bb.merge(transformed)
	return bb


func _find_mesh_instances(node: Node) -> Array:
	var result: Array = []
	if node is MeshInstance3D:
		result.append(node)
	for child in node.get_children():
		result.append_array(_find_mesh_instances(child))
	return result
