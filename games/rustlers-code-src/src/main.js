// Boot file: sets up the renderer, camera, lights and the frame loop, then
// wires the game's pieces together (input → player → systems → screen).
// Game logic lives in the other folders — nothing but wiring belongs here.

import * as THREE from 'three';
import { initInput, input } from './core/input.js';
import { gameState, hasSave, loadGame, hasItem, takeItem, saveGame } from './core/gameState.js';
import { on, emit } from './core/events.js';
import { buildTown } from './world/town.js';
import { buildEnvironment } from './world/environment.js';
import { createAmbient } from './world/ambient.js';
import { setupStatues } from './world/statues.js';
import { setupTownTalk } from './world/townTalk.js';
import { createMarkers } from './world/markers.js';
import { createSky } from './world/sky.js';
import { createDayNight } from './world/dayNight.js';
import { setupChapter1 } from './world/chapter1.js';
import { setupChapter2 } from './world/chapter2.js';
import { setupChapter3 } from './world/chapter3.js';
import { setupChapter4 } from './world/chapter4.js';
import { buildPosters, POSTER_TOTAL } from './world/posters.js';
import { createJournal } from './ui/journal.js';
import { createIntro } from './ui/intro.js';
import { createTitleCard } from './ui/titleCard.js';
import { createEndingScreen } from './ui/endingScreen.js';
import { registerTarget } from './world/targets.js';
import { createCole, updateCole, tryJumpCole, makeBlobShadowTexture } from './entities/cole.js';
import { createBiscuit, updateBiscuit, tryJumpBiscuit } from './entities/biscuit.js';
import { createChickens } from './entities/chickens.js';
import { createTinMen } from './entities/tinmen.js';
import { createNpc, updateNpc, npcDialogueId, npcGreeting } from './entities/npc.js';
import { createCameraRig, updateThirdPersonCamera } from './systems/thirdPersonCamera.js';
import { createEffects } from './systems/effects.js';
import { createAiming } from './systems/aiming.js';
import { createLasso } from './systems/lasso.js';
import { createInteractions } from './systems/interaction.js';
import { createDialogue } from './systems/dialogue.js';
import { createQuests } from './systems/quests.js';
import { changeCode } from './systems/codeMeter.js';
import { createAudio } from './core/audio.js';
import { createHud } from './ui/hud.js';
import { createMenu } from './ui/menu.js';
import { createTouchControls } from './ui/touch.js';
import { createDialogueBox } from './ui/dialogueBox.js';
import { createDebugOverlay } from './ui/debugOverlay.js';
import npcData from './data/npcs.json';
import itemData from './data/items.json';

// ---------- Renderer ----------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Cap pixel density at 2 so high-DPI screens don't quadruple the GPU work.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Hard rule from the threejs-performance skill: no real-time shadows, ever.
renderer.shadowMap.enabled = false;
// Film-style colour grading. This is NOT a postprocessing pass (those are
// banned) — it's free maths in the shader, and it makes the flat colours
// sit together like a graded film frame.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// ---------- Scene and camera ----------
const SKY_COLOR = 0x87b5d9; // clear midday sky
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
// Fog the same colour as the sky hides the edge of the world and saves the
// GPU drawing distant detail (threejs-performance skill).
scene.fog = new THREE.Fog(SKY_COLOR, 60, 160);

const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 200
);

// ---------- Lights ----------
// Exactly two lights, per the performance budget: one sun, one sky fill.
const sun = new THREE.DirectionalLight(0xfff2d9, 2.3);
sun.position.set(20, 30, 10);
scene.add(sun);
const skyFill = new THREE.HemisphereLight(0xbfd8ff, 0xc2955c, 1.05);
scene.add(skyFill);
const dayNight = createDayNight(scene, sun, skyFill);

// ---------- Build the world, the player, and the systems ----------
initInput(canvas);
const audio = createAudio();
const hud = createHud(audio);
const dialogueBox = createDialogueBox();
const dialogue = createDialogue(dialogueBox, itemData);
const effects = createEffects(scene);
const town = buildTown(scene, effects);
const environment = buildEnvironment(scene, town.colliders, effects);
const ambient = createAmbient(scene, effects);
const sky = createSky(scene);
dayNight.sky = sky;
dayNight.lampGlows = town.lampGlows;
const cole = createCole(scene);
const biscuit = createBiscuit(scene, makeBlobShadowTexture());
const chickens = createChickens(scene, 14, 3);
const tinmen = createTinMen(scene, effects, hud);
const cameraRig = createCameraRig();
const aiming = createAiming(hud, effects);
const lasso = createLasso(scene);
const interactions = createInteractions(hud);
const quests = createQuests(hud);
const journal = createJournal();
createTitleCard();
const intro = createIntro();
const endingScreen = createEndingScreen();
const menu = createMenu(
  canvas, audio,
  () => dialogue.isOpen || endingScreen.visible || intro.isOpen(),
  // The intro gate: brand-new legends get the storybook first.
  () => {
    if (gameState.flags.introSeen || gameState.completedQuests.length > 0 || gameState.questStep > 0) {
      return false;
    }
    intro.show(() => {
      gameState.flags.introSeen = true;
      saveGame();
      canvas.requestPointerLock();
    });
    return true;
  }
);
const debugOverlay = createDebugOverlay(renderer);
createTouchControls(menu); // appears only on devices that actually touch

// ---------- Townsfolk ----------
const npcs = [];
for (const def of npcData.npcs) {
  if (!def.spawn) continue;
  const npc = createNpc(scene, def);
  npcs.push(npc);
  interactions.register('npc_' + def.id, npc.group, 2.6, 'Talk to ' + def.name, () => {
    const treeId = npcDialogueId(npc);
    if (treeId) {
      dialogue.start(treeId);
    } else {
      hud.showSubtitle(def.name, npcGreeting(npc));
    }
  });
}

// ---------- Biscuit ----------
// Living, so the reticle must refuse him; also accepts apples, obviously.
registerTarget(biscuit.group, {
  tag: 'biscuit',
  name: 'Biscuit',
  kind: 'living',
  refusalLine: "He'd only be offended.",
});
interactions.register(
  'feed_biscuit', biscuit.group, 2.5,
  () => {
    if (cole.mounted) return '';
    return hasItem('apple') ? 'Give Biscuit the apple' : 'Pat Biscuit';
  },
  () => {
    if (hasItem('apple')) {
      takeItem('apple');
      biscuit.boostTimer = 12; // sugar rush: a faster gallop for a spell
      effects.spawnPuff(biscuit.group.position, 1.4);
      hud.showSubtitle('Cole', "Don't tell the wanted posters about this. He'll be insufferable — and fast.");
      changeCode(2, 'kindness to a bloodthirsty steed');
    } else {
      effects.spawnPuff(biscuit.group.position, 0.8);
      hud.showSubtitle('Cole', PAT_LINES[patLineIndex++ % PAT_LINES.length]);
    }
  }
);
const PAT_LINES = [
  'Good horse. Terrible reputation.',
  "He's checking my pockets. There's nothing in my pockets, Biscuit.",
  'Bloodthirsty steed, they say. Fearsome. Yes you are.',
];
let patLineIndex = 0;

// ---------- Sittable spots ----------
// Benches and the campfire log: E parks Cole there; any move key stands
// him back up (see updateCole).
const SIT_SPOTS = [
  { x: 5.7, z: -4.3, y: 0.56, yaw: Math.PI / 2, exitX: 4.6, exitZ: -4.3, label: 'Sit a spell' },
  { x: -5.6, z: 7.8, y: 0.56, yaw: -Math.PI / 2, exitX: -4.5, exitZ: 7.8, label: 'Sit a spell' },
  { x: -45, z: 31.8, y: 0.5, yaw: 0, exitX: -45, exitZ: 30.6, label: 'Sit by the fire' },
];
SIT_SPOTS.forEach((spot, i) => {
  const anchor = new THREE.Object3D();
  anchor.position.set(spot.x, 0.5, spot.z);
  scene.add(anchor);
  interactions.register(
    'sit_' + i, anchor, 2,
    () => (!cole.mounted && !cole.sitting ? spot.label : ''),
    () => {
      cole.sitting = { exitX: spot.exitX, exitZ: spot.exitZ };
      cole.group.position.set(spot.x, spot.y, spot.z);
      cole.group.rotation.y = spot.yaw;
      cole.facing = spot.yaw;
    }
  );
});

// ---------- Start or resume, then wire up the chapters ----------
// Order matters: load the save first (chapters restore their world state
// from it), then set up chapter scripting, then resume the quest listener.
const loaded = hasSave() && loadGame();
if (loaded && gameState.colePosition) {
  cole.group.position.set(gameState.colePosition[0], 0, gameState.colePosition[1]);
}

// Town chatter defaults go in BEFORE the chapter controllers, so an active
// chapter briefing always wins the override.
setupTownTalk(npcs);
setupStatues({ scene, town, interactions, hud });
const markers = createMarkers(scene);

const chapterUpdaters = [
  setupChapter1({ scene, town, interactions, effects, hud, dayNight, cole, npcs, markers }),
  setupChapter2({ scene, town, interactions, effects, hud, cole, biscuit, npcs, dialogue, markers }),
  setupChapter3({ scene, interactions, effects, hud, dialogue, cole }),
  setupChapter4({ scene, town, interactions, effects, hud, dialogue, dayNight, cole, npcs, endingScreen, markers }),
];
buildPosters(scene, interactions, hud);

if (loaded) {
  quests.resume();
} else {
  quests.start('prologue');
}

// A controller pairing up deserves a tip of the hat.
on('gamepad:connected', () => {
  hud.showSubtitle('', 'Controller found — press any button on it to take the reins. L2 aims, R2 shoots.', 4);
});
on('gamepad:nonstandard', () => {
  hud.showSubtitle('', "That controller's layout isn't standard, so it's staying holstered. Keyboard and mouse work as ever.", 5);
});

// Finding the last poster AFTER the story is over still earns the bonus
// scene — the ending card already played, so it gets a card of its own.
on('poster:collected', ({ count }) => {
  if (count >= POSTER_TOTAL && gameState.chapter >= 5) {
    endingScreen.showBonus();
  }
});

// Ringing the chapel bell always gets a word from Preacher.
const BELL_LINES = [
  'That bell rings for everyone, brother. Even them that shot it.',
  "Like the good book probably says: ask not for whom the bell tolls, it's probably you.",
  'Third time today. The Lord admires persistence.',
];
let bellLineIndex = 0;
on('bell:rung', () => {
  hud.showSubtitle('Preacher Boone', BELL_LINES[bellLineIndex++ % BELL_LINES.length], 3);
});

// Remember where Cole is standing whenever the quest system autosaves,
// and take a full save whenever the game pauses.
function stampPosition() {
  gameState.colePosition = [cole.group.position.x, cole.group.position.z];
}
on('quest:step', stampPosition);
on('quest:completed', stampPosition);
on('menu:paused', () => {
  stampPosition();
  saveGame();
});

// ---------- Window resizing ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Frame loop ----------
// Runs ~60 times a second. Rule from the performance skill: never create
// objects in here (no `new`) — that causes stutter. Reuse everything.
const clock = new THREE.Clock();
let hoofDustTimer = 0;
let perimeterLineCooldown = 0;
let edgeLineIndex = 0;
const EDGE_LINES = [
  "Valley ends here. The trouble's all inland.",
  'Rocks say no. Rocks are usually right.',
  "Past that ridge it's all paperwork and other counties.",
];

function frame() {
  // Real time since last frame, capped so a backgrounded tab doesn't cause
  // a huge jump when the player comes back.
  const dt = Math.min(clock.getDelta(), 0.1);
  // Read the controller (if any) before anything else asks about input.
  input.pollGamepad(dt);

  // Options/Start on the pad opens and closes the pause menu.
  if (input.wasPressed('Pause') && !dialogue.isOpen && !intro.isOpen() && !endingScreen.visible) {
    menu.togglePause();
  }
  // World time: slowed while the Steady Hand is working, paused entirely
  // during conversations, menus, the intro and the ending. UI uses real time.
  const talking = dialogue.isOpen || menu.isOpen() || endingScreen.visible || intro.isOpen();
  const worldDt = talking ? 0 : dt * aiming.timeScale;

  if (!talking) {
    aiming.update(dt, input, camera, cole);
    if (aiming.lockedTarget?.kind === 'lassoable' && input.wasPressed('KeyF')) {
      lasso.throwAt(cole, aiming.lockedTarget);
    }
  } else {
    hud.setReticle('hidden');
  }

  // G = wave howdy at whoever's closest (they'll answer by reputation).
  if (!talking && input.wasPressed('KeyG')) {
    let nearest = null;
    let nearestDist = 36; // within 6 metres
    for (const npc of npcs) {
      if (!npc.group.visible) continue;
      const d = npc.group.position.distanceToSquared(cole.group.position);
      if (d < nearestDist) {
        nearest = npc;
        nearestDist = d;
      }
    }
    if (nearest) {
      cole.waveTimer = 0.9;
      hud.showSubtitle(nearest.def.name, npcGreeting(nearest));
    }
  }

  // JUMP: Space any time — and the use button doubles as jump when
  // there's nothing nearby to use (so controller Cross/A hops too).
  if (!talking && (input.wasPressed('Space') ||
      (input.wasPressed('KeyE') && !interactions.promptActive))) {
    const jumped = cole.mounted ? tryJumpBiscuit(biscuit) : tryJumpCole(cole);
    if (jumped) {
      effects.spawnPuff(cole.mounted ? biscuit.group.position : cole.group.position, 0.8, 0xd8c49a);
      emit('audio:jump');
    }
  }

  updateCole(cole, worldDt, input, cameraRig.yaw, town.colliders);
  updateBiscuit(biscuit, worldDt, input, cole, cameraRig.yaw, town.colliders);
  chickens.update(worldDt, cole.group.position);
  tinmen.update(worldDt, cole, dayNight, town.colliders);

  // After dark the townsfolk head indoors (windows glow instead) — unless
  // the story is waiting on them, or they're the night-owl sort.
  const townAsleep = dayNight.blend > 0.75;
  const activeTriggers = quests.currentTriggers();
  for (const npc of npcs) {
    npc.group.visible = !townAsleep ||
      !!npc.def.nightOwl ||
      activeTriggers.includes('dialogue:' + npcDialogueId(npc) + ':completed');
    if (npc.group.visible) updateNpc(npc, worldDt, cole.group.position);
  }

  // A dry word for anyone testing the edge of the map.
  if (perimeterLineCooldown > 0) perimeterLineCooldown -= dt;
  const nearEdge = Math.abs(cole.group.position.x) > 84 || Math.abs(cole.group.position.z) > 84;
  if (nearEdge && perimeterLineCooldown <= 0 && !talking) {
    perimeterLineCooldown = 30;
    hud.showSubtitle('Cole', EDGE_LINES[edgeLineIndex++ % EDGE_LINES.length]);
  }
  interactions.update(dt, input, cole, talking);
  markers.update(dt);
  for (const c of chapterUpdaters) c.update(worldDt);
  // Camera LAST among the movers: it must see where everyone ended up this
  // frame, or it aims one frame behind — which reads as shake at a gallop.
  updateThirdPersonCamera(cameraRig, camera, dt, input, cole.group.position, aiming.isAiming);
  dayNight.update(dt);
  environment.update(worldDt);
  ambient.update(worldDt, dayNight.blend);
  sky.update(camera, dt);
  effects.update(dt);
  lasso.update(dt);
  hud.update(dt);
  hud.setAimVignette(cameraRig.aimBlend);

  const anyMoveKey = input.isKeyDown('KeyW') || input.isKeyDown('KeyA') ||
    input.isKeyDown('KeyS') || input.isKeyDown('KeyD');
  // Stick-click sprint switches itself off when you stop moving.
  if (!anyMoveKey) input.sprintToggle = false;
  const ridingHard = cole.mounted && anyMoveKey;

  // Quest steps that ask you to mount up skip themselves if you already
  // are — no dismounting to satisfy paperwork.
  if (cole.mounted && quests.currentTriggers().includes('biscuit:mounted')) {
    emit('biscuit:mounted');
  }

  // Galloping kicks up dust at Biscuit's heels.
  if (ridingHard && worldDt > 0) {
    hoofDustTimer -= worldDt;
    if (hoofDustTimer <= 0) {
      hoofDustTimer = 0.18;
      effects.spawnPuff(biscuit.group.position, 0.9, 0xd8c49a);
    }
  }

  audio.update(dt, {
    riding: ridingHard,
    nightBlend: dayNight.blend,
    slowmo: aiming.isAiming && gameState.hasSteadyHand,
  });

  renderer.render(scene, camera);
  debugOverlay.tick(dt);
  input.endFrame();
}
renderer.setAnimationLoop(frame);
