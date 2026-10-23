# Audit and QA report

Revision: expanded diorama campaign, 22 October 2026. Windows, Node 24, Microsoft Edge.

## Audit findings and changes

| Area | Finding | Implemented response |
| --- | --- | --- |
| Progression | Numbered objective labels could throw during cleanup; old and new mission saves needed reconciliation | Correct label cleanup, revision-aware migration, saved puzzle turns and safe positions; current-objective restart without clearing earlier work |
| World variety | A shared small island and repeated checklist dominated every world | Separate foundry, connected forest groves, tiled palace, fortress, stadium and alliance stage; larger routes, named regions, tailored landmarks and scenery |
| Mission variety | Eight near-identical jobs repeated across rescue worlds | Tool-trolley escort, pump repairs, woodland-light escort, rotating mirror beams, potion recipe, ally-assisted guard encounters, hero catapult, football goals, basketball jumps and sprint gates |
| Story | Captions had little staging or chapter-specific action | Actor staging, moving shot framing, props, hero entrances and switches, rescue-cage breakup, family messages, pre-boss advice and reunion scenes; villain identity remains undecided |
| Navigation | Leaving or recovering an objective was not obvious | Persistent Map button, labelled objective distances, safe-position saves, task checkpoints and Restart this objective in Pause |
| Allies | Summons disappeared too quickly | Five gameplay seconds, following animation, independent cooldowns; pause and story scenes preserve remaining time |
| Co-op/input | Keyboard-only and one player | Standard Gamepad mapping, controller menus/settings, optional two local players, independent forms/allies, shared missions and partner revival |
| Artwork | Form A's green shapes were treated as side panels | Removed the central white/red lower panel from the transparent drawing and model; green legs animate separately; originals preserved |
| Character detail | Very simple silhouettes | More facial detail, clothing seams/accessories, Form B arm/stalk movement, owner-specific shadow silhouettes and restrained confetti |
| Rendering | Expanded scenery could raise draw cost | Static meshes merged by material, cached primitive geometry, soft 2048px shadows; six visual samples measured about 53-60 fps in the automated environment |

## Executed checks

- `npm install`: successful, dependencies up to date.
- `npm run build`: successful Vite production build.
- `npm test`: **6 passing** progression/save tests, including puzzle turns, checkpoint coordinates and co-op settings.
- `npm run test:voice`: **8 passing** tests covering missing recordings, stale callbacks, pause/mute, priority and caption fallback.
- `npm run test:browser`: the new campaign runner exercises the Origin, every mission in all five worlds, normal boss warning/attack/recovery cycles, every rescue, ally unlocks, army removal, reload, all five final contributions, both-form finish, ending and retry. Evidence: `test-results/campaign-report.json`.
- `npm run test:navigation`: dry-ground grid traversal found an approach inside the interaction radius of every objective in all five rescue worlds; also tested switching form during a dash. Evidence: `test-results/navigation-report.json`.
- `npm run test:coop`: virtual standard Gamepad API and real keyboard input verify P2 movement/switching, five-second summon duration, Start pause/resume, partner revival and both finishing attacks delivered by player two. Evidence: `test-results/coop-report.json`.
- `npm run test:cinematics`: **42 scenes / 175 cues**, exact subtitle matching, cleanup, single-step input, two-player restoration, small-screen layout, reduced motion, autoplay, actual browser audio decoding using a test-only tone, and printable recording sheet. Evidence: `test-results/cinematics-report.json`.
- `npm run test:visual`: six worlds and their arrival scenes render without runtime errors. Screenshots: `test-results/audit-world-1.png` through `audit-world-6.png`, and corresponding `audit-cinema-*`. Reviewed forest, palace, stadium and cinematic captures visually. Evidence: `test-results/visual-audit-report.json`.
- `npm run test:production`: compiled game starts, moves, jumps, switches form and pauses; a 390px viewport has no page overflow; development QA hooks are absent. Evidence: `test-results/production-report.json`.
- Asset inspection confirmed real alpha transparency for both drawings and transparency between Form A's green legs. Both original cutouts and the original photographs remain available.

The campaign suite uses controlled positioning and invulnerability, but sends real keyboard actions. Escorts move at their normal speed, ally cooldowns run normally and boss victories use the real state machine. It does not directly complete tasks or subtract boss health. These checks establish functional progression, not a timed first playthrough or difficulty balance. Controller tests emulate the browser Gamepad API; no physical controller has been tested.

`tests/campaign.mjs` is the current campaign suite. The former `tests/browser.mjs`, smoke scripts and legacy platformer suites describe older revisions and are not current acceptance tests. Old reports and images remain for comparison; use the evidence filenames above.

## Manual playtest still needed

- A full first run by the family with a stopwatch. **30 minutes is the design target, not a measured result.** Reading, exploration, retries and skipped scenes change it.
- Whether each chapter is enjoyable and varied enough, particularly the escort pace, mirror instructions and sports objectives.
- Unaided route finding, camera occlusion, text size and controller-button understanding for a six-year-old.
- Gentle and Classic combat without invulnerability, the final teamwork sequence and co-op with players far apart.
- Physical Xbox / PlayStation / other controllers, two connected pads, reconnects, and the target browser's standard button mapping.
- Real touch devices, slower laptops, Firefox and Safari. Automated functional checks used desktop Edge.
- Family approval of both 3D interpretations, placeholder family appearances, dialogue and sound levels.
- Timed recordings, listening balance and lip/gesture direction once the family supplies voice takes.

## Known limitations and remaining production work

- No known campaign blocker remained in the completed automated run. This is not a guarantee that all play patterns are bug-free.
- Models and animation remain procedural. Finished AAA character art, fully rigged cinematic performances and a musical score are not delivered.
- The optional voice system and recording script work; **zero family voice recordings are currently installed**. All scenes remain playable with captions.
- Hero names, final powers, origin, family likenesses and the Big Boss's identity, motivation and final design remain editable creative decisions.
- Temporary glamour/friendly effects use posing, particles and behavior rather than fully separate character models.
- Local co-op shares one camera and world. It has no split-screen or network multiplayer. Mobile co-op is not provided.
- Saves belong to the browser origin. Boss health and individual final-battle stages reset on retry; completed missions, rescues and collected stars persist.
- Some scenic furniture is decorative rather than collidable. The environments are larger mission spaces, not a seamless open world.
- Exact 30-minute pacing and the requested production-quality bar require further family playtesting and art review; they are not certified by automated tests.

## Chaos Emeralds, Super Goku and star collection ? 22 October 2026

- `npm test`: 11 tests passed, covering validated saves, exact unique star totals, all-star/story gates, the seven emerald IDs, repeated transformations and flight/gravity.
- `npm run build`: passed.
- Browser fixture `/tests/chaos-runtime.html`: passed the complete star, seven-mission and Super Goku sequence with isolated in-memory storage. All 158 stars were collected through the actual scene pickup logic. Every star had a reachable dry-ground approach within pickup range on a 0.5 m navigation grid. Revisit/reload checks retained exact totals and omitted collected stars. Decorative finale stars and basketball objective stars were replaced with lights and hoops.
- The browser fixture used controlled character positions and deterministic gameplay updates to avoid background-tab timer throttling. It checked all seven seal trials, saved emeralds, S-key handling, gather/scatter timing, original-form restoration, flight ascent/hover/descent/steering, pause, fewer effects and scene cleanup. This is automated verification, not a manual 158-star playthrough.
- Report: `test-results/chaos-runtime-report.txt`. Visual review: `test-results/super-goku-flight.png`. Existing player saves were not used for the fixture.


## Stadium powers, secret characters and multiplayer - 22 October 2026

- `npm test`: 29 tests passed, covering exact Hyper/fire/celebration timers, saved per-player costumes, Daddy-only goal discovery, collision openings, one-hit beams, replay save isolation, first-connected-controller ordering and friendly fire ignoring every invincibility flag.
- `npm run build`: passed after the final implementation changes.
- `/tests/powers-runtime.html`: passed real scene/input checks for the hidden LeBron, Curry and Vini discoveries, equip/unequip keys, proper balls and flaming shots, fire damage/slowdown, Hyper duration/beam, both players wearing each skin together, independent controls, invincibility bypass, three-second respawn, live PvP setting, replayed quests/enemies/bosses and Goku completing Origin replay puzzles.
- `/tests/chaos-runtime.html`: passed again with stadium collision enabled. Every one of the 158 stars had a reachable pickup approach, rendered visibly, counted once and survived reload. All seven emerald missions and transformation/flight checks passed.
- Browser fixtures use isolated memory saves, controlled positions and deterministic gameplay updates. They did not alter the player's saved adventure. These are functional checks, not a full unaided playthrough. Physical controllers still need a hands-on check.
- Evidence: `test-results/powers-runtime-report.txt`, `test-results/chaos-runtime-report.txt`, `test-results/vini-multiplayer.png`.
