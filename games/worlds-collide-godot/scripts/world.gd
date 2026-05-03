extends Node3D

## World — Manages the open world environment
## Spawns trees, rings, platforms, and handles environment animation


func _ready() -> void:
	# World is set up in the scene tree (main.tscn)
	# This script handles any runtime world logic
	pass


func _process(delta: float) -> void:
	# Animate water
	var water := get_node_or_null("Water")
	if water:
		water.rotation.y += 0.01 * delta
