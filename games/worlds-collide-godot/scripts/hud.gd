extends CanvasLayer

## HUD — Shows character name, rings, zone, mission status

@onready var char_label: Label = $CharLabel
@onready var ring_label: Label = $RingLabel
@onready var zone_label: Label = $ZoneLabel
@onready var mission_label: Label = $MissionLabel

var player: CharacterBody3D = null


func _ready() -> void:
	await get_tree().process_frame
	player = get_tree().get_first_node_in_group("player")


func _process(_delta: float) -> void:
	if not player:
		player = get_tree().get_first_node_in_group("player")
		return

	ring_label.text = "◆ " + str(player.ring_count * 10)
	zone_label.text = player.current_zone
