// Chapter 1 — The Foreclosure Job. This file owns everything bespoke to the
// chapter: the hideout camp, the strongbox wagon behind the bank, the two
// lantern men, the three escape trick-shots, and the night that falls when
// the job begins. The quest data drives WHAT happens; this file makes the
// world act it out.

import * as THREE from 'three';
import { on, emit } from '../core/events.js';
import { gameState, giveItem, saveGame } from '../core/gameState.js';
import { registerTarget } from './targets.js';
import { createGuard } from '../entities/guard.js';

function material(color) {
  return new THREE.MeshLambertMaterial({ color });
}

// The gang's camp, out west toward the mesa: two tents, a cold campfire,
// a log to sit on. Home.
function buildHideout(scene, colliders, interactions) {
  const wood = material(0x7a6248);
  const canvas = material(0xc9bfa0);

  for (const side of [-1, 1]) {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), canvas);
    tent.position.set(-45 + side * 3, 1.1, 27);
    tent.rotation.y = Math.PI / 4;
    scene.add(tent);
    colliders.push({ minX: tent.position.x - 1.2, maxX: tent.position.x + 1.2, minZ: 25.8, maxZ: 28.2 });
  }

  const fire = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 1.1), material(0x4a3b2a));
  fire.position.set(-45, 0.12, 30);
  scene.add(fire);

  const log = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.45), wood);
  log.position.set(-45, 0.22, 31.8);
  scene.add(log);

  interactions.registerZone('hideout', -45, 29, 14, 12);
}

// The strongbox wagon parked behind the bank, plus its shootable lock and
// the deeds inside.
function buildStrongboxWagon(scene, colliders, interactions, effects, hud, markers) {
  const wood = material(0x6e4a2f);

  const wagon = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.25, 1.5), wood);
  bed.position.y = 0.75;
  wagon.add(bed);
  for (const [wx, wz] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]) {
    const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.14), material(0x4a3b2a));
    wheel.position.set(wx, 0.45, wz);
    wagon.add(wheel);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), material(0x3f4a55));
  box.position.set(-0.4, 1.25, 0);
  wagon.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.8), material(0x333c45));
  lid.position.set(-0.4, 1.65, 0);
  wagon.add(lid);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.1), material(0xd9b23a));
  lock.position.set(-0.4, 1.5, 0.45);
  wagon.add(lock);
  // The deeds: a pale bundle that appears when the box opens.
  const deeds = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.35), material(0xe8dbb5));
  deeds.position.set(-0.4, 1.4, 0);
  deeds.visible = false;
  wagon.add(deeds);

  wagon.position.set(-10, 0, -25.5); // rear of the bank
  scene.add(wagon);
  colliders.push({ minX: -11.4, maxX: -8.6, minZ: -26.3, maxZ: -24.7 });

  let lockShot = false;
  registerTarget(lock, {
    tag: 'strongbox_lock',
    name: 'Strongbox lock',
    kind: 'shootable',
    onShot() {
      if (lockShot) return;
      lockShot = true;
      lock.visible = false;
      lid.position.y = 1.72;
      lid.rotation.z = 0.5;
      deeds.visible = true;
      effects.spawnPuff(lock.getWorldPosition(new THREE.Vector3()), 1);
    },
  });

  interactions.register(
    'take_deeds', wagon, 2.4,
    () => (lockShot && !gameState.inventory.includes('deeds') ? 'Take back the forged deeds' : ''),
    () => {
      deeds.visible = false;
      giveItem('deeds');
      hud.showSubtitle('Cole', "Paper crimes. Vane's speciality.");
    }
  );

  interactions.registerZone('bank_rear', -10, -23.5, 12, 5);

  // Chevrons: over the lock while it needs shooting, over the wagon while
  // the deeds wait inside.
  markers.add(wagon, 2.6, () =>
    gameState.activeQuest === 'ch1_foreclosure_job' &&
    ((gameState.questStep === 2 && !lockShot) || gameState.questStep === 3));

  return { isLockShot: () => lockShot };
}

// Three one-time escape shots strung along the road west out of town.
// Shooting all three "slows the posse" — nobody chasing ever gets hurt;
// they get inconvenienced, damply.
function buildEscapeShots(scene, colliders, effects, markers) {
  let cleared = 0;
  const clearedOne = () => {
    cleared += 1;
    if (cleared === 3) emit('ch1:obstacles_cleared');
  };
  const escapeStepLive = () =>
    gameState.activeQuest === 'ch1_foreclosure_job' && gameState.questStep === 4;

  // 1. The water-tower valve — on the spout, low enough to actually aim at.
  const valve = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), material(0xd9b23a));
  valve.position.set(0, 4.6, -26.3);
  scene.add(valve);
  const spray = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0x9fc8e8, transparent: true, opacity: 0.7 })
  );
  spray.position.set(0, 4.2, -26.5);
  spray.rotation.x = 0.7;
  spray.visible = false;
  scene.add(spray);
  let valveShot = false;
  markers.add(valve, 1.2, () => escapeStepLive() && !valveShot);
  registerTarget(valve, {
    tag: 'ch1_valve',
    name: 'Water-tower valve',
    kind: 'shootable',
    onShot() {
      if (valveShot) return;
      valveShot = true;
      valve.visible = false;
      spray.visible = true;
      clearedOne();
    },
  });

  // 2. The axle of a hay wagon parked on the west road.
  const hayWagon = new THREE.Group();
  const hayBed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.4), material(0xd9c26b));
  hayBed.position.y = 1.1;
  hayWagon.add(hayBed);
  const axle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.6), material(0x4a3b2a));
  axle.position.y = 0.45;
  hayWagon.add(axle);
  for (const side of [-0.8, 0.8]) {
    const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.14), material(0x4a3b2a));
    wheel.position.set(0, 0.45, side);
    hayWagon.add(wheel);
  }
  hayWagon.position.set(-22, 0, 12);
  hayWagon.rotation.y = 0.9;
  scene.add(hayWagon);
  colliders.push({ minX: -23.4, maxX: -20.6, minZ: 10.8, maxZ: 13.2 });
  let axleShot = false;
  markers.add(hayWagon, 2.6, () => escapeStepLive() && !axleShot);
  registerTarget(axle, {
    tag: 'ch1_axle',
    name: 'Wagon axle',
    kind: 'shootable',
    onShot() {
      if (axleShot) return;
      axleShot = true;
      hayWagon.rotation.z = 0.18; // slumps onto the road behind you
      hayWagon.position.y = -0.2;
      effects.spawnPuff(hayWagon.position, 2);
      clearedOne();
    },
  });

  // 3. The rope holding a stack of crates on the mesa road archway.
  const arch = new THREE.Group();
  for (const side of [-2.2, 2.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 0.4), material(0x7a6248));
    post.position.set(side, 2.2, 0);
    arch.add(post);
    colliders.push({ minX: -32 + side - 0.3, maxX: -32 + side + 0.3, minZ: 19.7, maxZ: 20.3 });
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 0.4), material(0x7a6248));
  beam.position.set(0, 4.4, 0);
  arch.add(beam);
  const crates = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1), material(0xa07a4a));
  crates.position.set(0, 3.6, 0);
  arch.add(crates);
  const rope = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), material(0xc9a86a));
  rope.position.set(0, 4.1, 0.3);
  arch.add(rope);
  arch.position.set(-32, 0, 20);
  arch.rotation.y = 0.5;
  scene.add(arch);
  buildEscapeShots.clearedCount = () => cleared;
  let ropeShot = false;
  markers.add(arch, 5.2, () => escapeStepLive() && !ropeShot);
  registerTarget(rope, {
    tag: 'ch1_rope',
    name: 'Crate rope',
    kind: 'shootable',
    onShot() {
      if (ropeShot) return;
      ropeShot = true;
      rope.visible = false;
      crates.position.y = 0.55; // tumbles down across the road behind you
      crates.rotation.z = 0.3;
      effects.spawnPuff(crates.getWorldPosition(new THREE.Vector3()), 2);
      clearedOne();
    },
  });
}

const GUARD_LINES = [
  "Oi! This is private Vane property, which is most property!",
  'No loitering! Especially not the sneaky kind!',
];

export function setupChapter1(ctx) {
  const { scene, town, interactions, effects, hud, dayNight, cole, npcs, markers } = ctx;
  let guardLineIndex = 0;

  buildHideout(scene, town.colliders, interactions);
  const wagonState = buildStrongboxWagon(scene, town.colliders, interactions, effects, hud, markers);
  buildEscapeShots(scene, town.colliders, effects, markers);
  const clearedCount = buildEscapeShots.clearedCount;

  const guards = [
    createGuard(scene, 'guard_1', [[-14, -23], [-6, -23], [-6, -27], [-14, -27]]),
    createGuard(scene, 'guard_2', [[-4, -20], [-16, -20]]),
  ];

  const doc = npcs.find((n) => n.def.id === 'doc');

  // When the chapter begins, Doc has the real briefing instead of chatter.
  on('quest:started', ({ quest }) => {
    if (quest === 'ch1_foreclosure_job' && doc) doc.dialogueOverride = 'ch1_briefing';
  });

  // The briefing hands over the Steady Hand and brings the night down.
  on('dialogue:ch1_briefing:completed', () => {
    if (doc) doc.dialogueOverride = null;
    if (!gameState.hasSteadyHand) {
      gameState.hasSteadyHand = true;
      hud.showSubtitle('Doc Vega', 'Right pocket. Wind it before bedtime.', 3.5);
      saveGame();
    }
    dayNight.setNight(true);
  });

  // Job done, dawn comes back up on the ride home.
  on('quest:completed', ({ quest }) => {
    if (quest === 'ch1_foreclosure_job') {
      dayNight.setNight(false);
      hud.showSubtitle('Cole', "Deeds go home tomorrow. Quietly. Like we were never there.", 4);
    }
  });

  // Does being seen matter right now? Only during the sneaky middle of Ch1.
  function stealthActive() {
    return (
      gameState.activeQuest === 'ch1_foreclosure_job' &&
      gameState.questStep >= 1 &&
      gameState.questStep <= 3 &&
      !cole.mounted
    );
  }

  function onSpotted() {
    // The comedic escort-out: firm hand, brisk walk, back to the street.
    hud.showSubtitle('Lantern Man', GUARD_LINES[guardLineIndex++ % GUARD_LINES.length], 3);
    effects.spawnPuff(cole.group.position, 1.5);
    cole.group.position.set(-2, 0, -10); // deposited out front, dignity dented
    effects.spawnPuff(cole.group.position, 1.5);
  }

  // If a saved game resumes mid-job, put the night back where it was.
  if (gameState.activeQuest === 'ch1_foreclosure_job' && gameState.questStep >= 1) {
    dayNight.setNight(true);
    dayNight.blend = 1;
    dayNight.applyBlend();
  }

  return {
    update(dt) {
      const active = stealthActive();
      for (const g of guards) g.update(dt, cole.group.position, active, onSpotted);

      // Work done EARLY (a lock shot before the step was listening) must
      // still count — when the step arrives, hand it the finished result.
      if (gameState.activeQuest === 'ch1_foreclosure_job') {
        if (gameState.questStep === 2 && wagonState.isLockShot()) {
          emit('shot:strongbox_lock');
        }
        if (gameState.questStep === 4 && clearedCount() >= 3) {
          emit('ch1:obstacles_cleared');
        }
      }
    },
  };
}
