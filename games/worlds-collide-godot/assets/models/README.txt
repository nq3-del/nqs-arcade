Worlds Collide — Models
========================

Drop .glb / .gltf files into the subfolders below. The game's ModelLoader
script reads from these paths at runtime — no code changes needed.

  character/player.glb     -> replaces the capsule placeholder for the player
  world/level.glb          -> becomes the entire world geometry (trees, terrain,
                              platforms, etc.) with auto-generated collision
  props/ring.glb           -> used for every collectible ring
  props/platform.glb       -> used by ModelLoader if you ever switch back to
                              individually-placed platforms

If a file is missing, the game falls back to a simple placeholder so it
still runs.

Free, ready-to-use packs (CC0):
  - Kenney Platformer Kit:    https://kenney.nl/assets/platformer-kit
  - Kenney Mini Characters 1: https://kenney.nl/assets/mini-characters-1
  - Quaternius Ultimate Nature: https://quaternius.com/packs/ultimatenature.html

After dropping new files in, open the project once in the Godot editor so it
imports them, then F5 to play.
