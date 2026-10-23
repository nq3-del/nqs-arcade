# For our two creative directors

The two supplied sketches are confirmed as **the hero’s two switchable forms**. Their names and real powers remain yours to choose.

| Design | Current state | Editable location |
| --- | --- | --- |
| Form A | First sketch, IMG_4840; central white/red panel removed to leave two separate green legs, in cutout and 3D model | `public/assets/characters/sketch-4840-cutout.png`, `WorldView.character('A')` |
| Form B | Second sketch, IMG_4841; body patches and arm cuffs changed from red to green at your request | `public/assets/characters/sketch-4841-cutout.png`, `WorldView.character('B')` |
| Form powers | Temporary fast dash / high jump and power pop | `HERO_FORMS` in `src/data/config.js` |
| Hero name and origin | No permanent name or fixed backstory; neutral magical spark | `src/data/dioramas.js`, UI text |
| Family appearance | Original simple silhouettes and readable accessories; awaiting portraits | `WorldView.character()` |
| Shadows | Playful purple copies of their owner’s family silhouette | Same generator’s shadow flag |
| Big Boss | Friendly temporary puppet, identity and motivation undecided | `FINAL_BOSS` in config, `character('bigboss')` |
| Dialogue and jokes | Staged scenes, mission beats, optional family recordings | `cinematics.js`, `missions.js`, `CHARACTERS[].rescue` |
| Duration | Approximately 30-minute first-playthrough target, still to be timed by a family | `PACING`, `adventureFor()` in `missions.js` |

Original JPGs are unchanged. Both cutouts have real alpha transparency and opaque white character interiors. The red-body version of Form B is preserved as `sketch-4841-cutout-original.png`. Its head colours were kept unchanged in the green revision. The built-in image generation tool performed background extraction and the colour edit; prompts are recorded in `public/assets/characters/manifest.json`.

The previous Form A cutout is preserved as `sketch-4840-cutout-original.png`. Its green legs and outer striped flaps remain; the space between them is transparent. The image-edit prompts for both forms are recorded in the asset manifest.

The 3D models are interpretations made from original geometry, not finished likenesses or final rigged characters. Their world position, movement and collisions are separate from their appearance, so later art can replace them. Local co-op reuses these existing forms without assigning a new permanent character identity.

The family powers stay as established: Grandad’s judo and repair, Nana’s caring cleansing, Mummy’s funny glamour potions, Leah and Ayla’s harmless nappy slapstick, and Daddy’s football. The reference image guides the miniature, angled-world presentation; no Zelda assets or character designs are used.
