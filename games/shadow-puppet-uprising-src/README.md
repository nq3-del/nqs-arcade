# The Shadow Puppet Uprising

A local family adventure by **Tony Baloney Studios**, made for a dad and his two creative directors. The working title and undecided character details remain editable.

The game uses an angled, explorable **3D diorama**. Phaser 3 runs scenes, input, timing and the game lifecycle; Three.js renders the storybook world. The two supplied sketches are the hero's two switchable forms. Form B's coat and arm patches are green. Form A's green shapes are separate legs, with the central white/red panel removed from both the cutout and its 3D interpretation.

## Play

On Windows, double-click **RUN-GAME.cmd**. Or, with Node.js 22.12+ / 24 and npm:

```powershell
cd C:\Users\curti\projects\shadow-puppet-uprising
npm install
npm run dev
```

Open the Local URL printed by Vite, normally http://127.0.0.1:5173/. Keep the terminal open while playing. Everything runs locally; there are no accounts, ads, purchases, online chat or remote game assets.

```powershell
npm run build        # production output: dist/
npm run preview      # serve that build
npm test             # save/progression checks
npm run test:browser # campaign runtime checks; start the dev server first
npm run test:coop    # virtual standard controllers + keyboard
npm run test:cinematics # all 42 scenes and recording workflow
npm run test:navigation # route reachability
npm run test:voice   # optional voice-player unit tests
```

The campaign, co-op and visual audit scripts use installed Microsoft Edge on Windows and a dev server at port 5173. Other browser scripts also support Playwright Chromium. Node 24 can use Windows organisation certificates with `$env:NODE_USE_SYSTEM_CA='1'` before npm install; this does not disable TLS verification.

## A roughly 30-minute adventure

The **first-playthrough design target** is 30 minutes: approximately 3 for the Origin, 4½ for each of the five rescue worlds, and 4½ for the finale. This is a pacing budget, not a forced timer. Reading speed, exploration, retries, difficulty and skipping scenes change the duration. A full timed family playtest is still needed to validate it.

Each rescue world now has its own larger layout and four or five missions. Completed missions, puzzle rotations and partial pickups save automatically. Earlier saves are migrated without losing family rescues. Missions and pacing are configurable in `src/data/missions.js`; geography is in `src/data/expeditions.js`.

- **Origin:** learn walking, jumping, both forms, power, dash and portals.
- **Broken Kingdom:** unjam a foundry, power numbered relays and escort Grandad's tool trolley through shadow patrols.
- **Filthy Forest:** ask Grandad to mend pumps, open flower valves and protect a woodland light on its way to Nana.
- **Palace of Perfection:** aim rotating mirrors, find potion ingredients and let Nana befriend confused guards.
- **Fortress of Fury:** distract guards with Mummy, launch the hero from a catapult, clear patrols and pop a barricade.
- **Stadium of Champions:** score football goals, use Form B for basketball hoops, sprint through gates and beat the shadow team.
- **Ultimate Alliance:** all five rescued allies contribute, followed by a dash and a power pop from the hero’s two forms.

Arrival, mission, family-message, pre-boss, rescue and ending scenes use staged actors, moving camera shots, animated props, transformations, breaking rescue cages and captions. Scenes autoplay at a reading pace; pause that with **Read at my pace**. E / Space / controller × or R3 advances, and Skip is always available. These are in-engine cinematics. No voice recordings are supplied yet; captions work without them.

The optional family recording pack is at `http://127.0.0.1:5173/recording-script.html`. It includes 42 scripted scenes, 175 uniquely named voice cues, delivery notes, performer filters and a printable checklist. Add recordings to `public/audio/voice/` using those cue filenames, then run `npm run recordings`; dev and build do this automatically. Missing takes are silent and never requested as broken files. The script is editable in `src/data/cinematics.js`.

## Controls

### Phone and tablet controllers

Start with **RUN-GAME.cmd** (restart it if the game was already running), or `npm run dev`. On the computer, select **Use your phone** below the main menu’s play buttons, or **Settings → Pair phone controller**. Choose Player 1 or Player 2, then scan the QR code using a phone/tablet on the same home Wi-Fi. The controller opens in its browser; no app or account is needed. Close the pairing panel on the computer and resume play.

The phone has a thumbstick, action buttons, character shortcuts and menu controls. Jump selects in menus; Power goes back; Pause pauses/resumes. For two phones, scan once for each player. For a phone and physical controller, the phone uses the chosen slot and the physical controller takes the remaining slot. Enable **Two players** in Settings before entering/retrying a world. Phone button labels stay fixed even if physical controller buttons are remapped.

If pairing fails, try another computer address in the pairing panel, avoid guest Wi-Fi/VPN isolation, and allow Node.js on the Windows **private** network when prompted. Keep the phone screen awake: local HTTP does not always support automatic screen wake locks. Closing/locking the phone releases input; a detected disconnect pauses the game, and a missed heartbeat releases held controls within 800 ms. Return to the controller and reconnect, or scan again if the game tab was refreshed.

The local WebSocket pairing service runs with both `npm run dev` and `npm run preview`. The Arcade production site also supports internet pairing through its `/api/phone-socket` Vercel endpoint and Redis room coordination. Open **Use your phone** on the computer and scan the QR code; both screens need internet access. Connections recover automatically when Vercel rotates a function or the network drops, and gameplay pauses on a detected disconnect. Phone input is released after 800 ms without a heartbeat. Raw static hosting without the relay still does not provide pairing. No game saves or personal information are sent to Redis.

Checks: `npm run test:phone` tests room isolation, validation and disconnects. `npm run test:phone-browser` exercises real browser pairing/input against a running dev server.

See [CONTROLS.md](CONTROLS.md) for the children’s guide. Click **Full screen** in the toolbar or Settings to expand the game. **Exit full screen** or Escape returns to the window.

| Key | Action |
| --- | --- |
| Arrows / W A D / arrows | Explore in all directions |
| Space | Jump / fly up as Super Goku |
| C | Fly down as Super Goku |
| S / Super button | Transform / return (requires all seven Chaos Emeralds) |
| Q | Switch form at the same position |
| J | Basic attack |
| K | Form A dash / Form B power pop |
| E | Pick up quest items, use stations, enter portals, advance scenes |
| Tab | Cycle rescued allies |
| L | Summon equipped ally |
| Escape | Pause / resume |
| R | Retry after defeat |

The Choose button opens ally selection and descriptions. Each summoned ally stays for **five gameplay seconds**, follows their player and has a separate ability cooldown. Story scenes and pauses preserve the remaining summon time. The original drawings appear in the form indicator. Basic touch buttons are also included.

**PS5 controller:** left stick moves; × jumps / flies up; □ attacks; ○ uses the special ability; △ changes the regular hero’s form, flies down as Goku / Hyper Goku, or takes a regular shot as LeBron / Curry / Vini. D-pad Down celebrates as Vini. L2 chooses the next ally; R2 summons; R3 alone interacts; L3 + R3 together toggles Super Goku. R1 equips LeBron, L1 equips Curry, and D-pad Up equips Vini when unlocked. Options pauses / resumes. In menus, joystick / D-pad chooses, × selects, and ○ goes back. Settings → **Remap controller buttons** changes and saves the layout for both players. See [CONTROLS.md](CONTROLS.md) for the full mapping.

**Local multiplayer:** choose One player / Two players directly in Replay a level, or choose Two players in Settings, then enter or retry a world. The first connected controller is P1 and the second P2; a shared keyboard also works. Each player can select any unlocked character independently, including the same character as their partner. Player labels and arrows identify both heroes. Friendly fire is enabled by default, ignores every invincibility flag, and can be disabled live in Settings. Defeated players respawn after three gameplay seconds, including when friendly fire is off. Enemy attacks still respect invincibility.

## Saving and accessibility

Local storage key: `tony-baloney-shadow-uprising-v1`. Saves include rescues, army removal, stars, mission progress, puzzle turns, safe checkpoint position, chosen ally, ending, settings and active adventure time. Browser/port changes use separate saves. Boss health, temporary ally effects and individual final-battle stages reset on retry. **Map** is always available during gameplay; Pause also offers **Restart this objective**, preserving earlier missions.

Gentle adventure is the default: eight hearts, slower enemies, lighter boss health and more protection after damage. Classic uses six hearts. Changes apply on entering or retrying a world. Sound, volume and fewer effects are adjustable. All gameplay warnings are visual. Rest stones refill hearts; completing a task restores two. Falls return the hero to safety. Starting fresh asks before clearing progress.

## Architecture

| File / folder | Responsibility |
| --- | --- |
| `src/main.js` | Phaser bootstrap and shared services |
| `src/diorama/DioramaScene.js` | Menu/game scenes, cutscenes, levels, combat interactions, rescue and finale |
| `src/diorama/WorldView.js` | Three.js world, lighting, soft shadows, procedural characters, scenery and effects |
| `src/diorama/Actors.js` | Shared hero state, ground-plane movement, jump buffer, coyote grace, enemies and boss state machines |
| `src/diorama/QuestDirector.js` | Distinct mission mechanics, escort/combat stages, recovery and objective saves (`Adventure.js` is a compatibility export) |
| `src/diorama/WorldScenery.js`, `WorldDetail.js` | Separate world architecture and modelled scenery details |
| `src/diorama/CinemaDirector.js` | Staging, camera shots, subtitles, optional speech, skip/pause cleanup |
| `src/diorama/AllyTeam.js` | Ally selection, cooldowns, support effects and summons |
| `src/data/config.js` | Form abilities, family data, difficulty and undecided villain data |
| `src/data/dioramas.js` | World themes, coordinates and dialogue |
| `src/data/missions.js`, `expeditions.js` | Mission definitions, pacing budget and world routes |
| `src/data/cinematics.js` | Shared subtitle, recording and voice cue catalogue |
| `src/systems/Controllers.js` | Standard Gamepad input, menu navigation and local co-op assignment |
| `src/systems/Voice.js` | Optional local recordings, priority, pause, mute and caption fallback |
| `src/systems/Progress.js` | Validated saves, unlocks and global army suppression |
| `src/systems/Audio.js` | Original synthesised sound effects |
| `src/ui/UI.js` | HTML menus, HUD, settings, ally selection and outcome screens |
| `src/diorama/presentation.css` | Cinematic presentation and responsive styling |
| `public/assets/characters/` | Transparent sketches, original-colour backup and editing manifest |

The hero has one ground position and altitude, independent of the visible costume. Collision uses a ground-plane island, solid props, stepping height and shallow-water rules. Phaser Arcade Physics remains installed for the archived platformer code; the current diorama movement is implemented in `Actors.js`. Static scenery is merged by material to reduce rendering work. No copyrighted game art is used.

The previous 2D implementation remains in `src/scenes/`, `src/entities/`, `src/systems/Art.js` and `src/systems/Allies.js` for reference. These files are **not** loaded by the current entry point. An external backup is also at `../shadow-puppet-uprising-platformer-backup.zip`.

## Creative work and QA

See [CREATIVE-DIRECTORS.md](CREATIVE-DIRECTORS.md) for decisions awaiting the children, and [QA.md](QA.md) for executed tests and remaining manual checks.

The game has procedural artwork and animation. Finished production character models, cinematic acting, recorded voices and a musical score remain creative work. The children's approval of the 3D interpretations is still needed; family portraits and the villain remain editable placeholders. Exact 30-minute pacing, physical controllers and performance across the family's devices need human playtesting. No claim of finished AAA production quality is made.

## Post-story Chaos Emerald adventure

Finish the story and collect every one of the 158 unique stars in all seven stages to open seven side missions on the world map. The Green, Purple, Silver, Blue, Cyan, Yellow and Red Chaos Emeralds each have a three-seal trial. Star IDs are shared by spawning, stage counters and unlock validation in `src/data/chaos.js`; legacy star totals do not bypass completion. Emeralds and partial trial progress persist in the existing save.

Collect all seven to unlock Super Goku. S / Super / controller L3 + R3 starts the screen-wide emerald orbit and convergence. The character changes only when the gems arrive. S again scatters the gems and restores the original form without spending emeralds. Space / controller × rises, C / △ descends, and releasing altitude controls hovers. Ground-plane steering uses the arrows (or W / A / D plus Down Arrow); S is reserved for Super. Transformations use gameplay time, respect pause and fewer effects, and are removed on scene changes.

`npm test` includes Chaos unlock/save tests. With the dev server running, `/tests/chaos-runtime.html` runs the mission, transformation and flight regression fixture using an isolated in-memory save. It never modifies the player's local storage.


## Powers, sports and replay

K activates Hyper Goku for 15 seconds with a 5-second cooldown after it ends. Hyper has blue hair, a pointed blue aura and a giant J beam that defeats every hostile it intersects. Super and Hyper both fly and ignore enemy damage.

Hidden stadium discoveries unlock additional saved costumes. Their instructions only appear after discovery. Sports shots use animated balls and real goal/rim coordinates; super shots explode for 12 damage and leave a radius of 4 for 5 seconds, dealing 2 damage per second and slowing enemies by 20%. Each super shot has a 5-second cooldown. Hoops, backboards, supports and football goal frames have solid collision, with open scoring entrances.

Replay a completed level with an unlocked character from the menu or map. Replay resets its quests, enemies and boss in a private progress copy. The real story/checkpoint stays unchanged; new unique stars and costume discoveries still save.

`npm test` also checks powers, sports, replay isolation, controller order and multiplayer damage/respawns. `/tests/powers-runtime.html` runs browser regression checks using an isolated in-memory save, plus visual preview buttons.

## Shadow Mayhem

Choose **World map → Shadow Mayhem** after beating the game and unlocking all characters: both hero forms, Super Goku/Hyper Goku, LeBron James, Steph Curry, Vini Jr. and Handsome Squidward, with all five allies rescued.

- 5,000 puppets start the run, then up to 5,000 arrive every 30 seconds.
- At most 500,000 ordinary puppets roam at once; defeating them makes room at the next wave.
- 50,000 Ultimate Shadow Bosses arrive every 60 seconds, separately from the puppet cap.
- No time limit, final wave or total defeat limit. The HUD counts puppet and boss defeats.
- Choose one or two players; both fight the shadows, and the Settings PvP toggle also enables attacks and family abilities against each other. Defeated players respawn after three seconds.
- Pause freezes the wave timers. Use Map to leave; a new visit starts a fresh run. Your story checkpoint stays saved.

Triangle / T now shoots a regular basketball or football as LeBron, Curry or Vini in any world. Near a stadium hoop or goal it aims for a score; elsewhere it fires forwards and can hit shadows. Circle / K uses the flaming shot.

Controller menus: use either stick or the D-pad to move; hold to scroll. X selects. On a dropdown or slider, X enters adjustment, directions change the value, and X or Circle finishes. Circle goes back; Options pauses/resumes. All story buttons, header buttons, level/replay/Mayhem pickers, settings, characters and allies are reachable. When the browser blocks controller-triggered native fullscreen, the game expands to fill the window.

At extreme Mayhem populations the game batches enemy AI and draws a representative crowd. Every spawned enemy still has its own position and health; damage and defeat counting include the full population.


### Handsome Squidward — Ultimate Rizzler

Shoot Hyper Goku’s beam at a round wall mirror beside the drawers in the Palace of Perfection. The unlock message confirms the skin is permanently saved. D-pad Left equips or unequips it for either player; keyboard H for P1, O for P2. It is also in Characters and replay selection. This cosmetic skin can walk, jump and interact, but cannot attack, summon allies or use powers.

Mummy’s potion overlays Handsome Squidward on nearby enemies for eight seconds, including bosses and the Mayhem crowd. With PvP on, Mummy transforms the opposing player for four seconds, Nana prevents attacks for three seconds, Grandad throws them, Leah damages them, and Daddy’s football can hit them. These family attacks do not affect the other player when PvP is off.
