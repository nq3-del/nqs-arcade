// Chapter 2 — The Iron Horse Heist. Builds the railhead (track, platform,
// water crane), runs the train sequence, and hosts the game's first big
// moral choice: Vane's private gold sits in the safe next to the town's
// wages. Quest data says WHAT; this file makes the world act it out.

import * as THREE from 'three';
import { on, emit } from '../core/events.js';
import { gameState, takeItem, saveGame } from '../core/gameState.js';
import { registerTarget } from './targets.js';
import { createTrain, TRACK_X } from './train.js';

function material(color) {
  return new THREE.MeshLambertMaterial({ color });
}

// The track itself plus a small boarding platform and water crane.
function buildRailhead(scene, colliders, interactions) {
  // Track bed: one long dark strip with two bright rails on top.
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 190), material(0x584a3a));
  bed.position.set(TRACK_X, 0.06, 0);
  scene.add(bed);
  for (const side of [-0.8, 0.8]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 190), material(0x777777));
    rail.position.set(TRACK_X + side, 0.18, 0);
    scene.add(rail);
  }

  const platform = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 12), material(0x9a8668));
  platform.position.set(TRACK_X - 3.2, 0.25, 30);
  scene.add(platform);
  colliders.push({ minX: TRACK_X - 4.7, maxX: TRACK_X - 1.7, minZ: 24, maxZ: 36 });

  const cranePost = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), material(0x7a6248));
  cranePost.position.set(TRACK_X + 3, 2.5, 24);
  scene.add(cranePost);
  const craneArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 2.4), material(0x7a6248));
  craneArm.position.set(TRACK_X + 3, 4.6, 25);
  scene.add(craneArm);
  colliders.push({ minX: TRACK_X + 2.6, maxX: TRACK_X + 3.4, minZ: 23.6, maxZ: 24.4 });

  interactions.registerZone('railhead', TRACK_X - 5, 30, 14, 20);
}

export function setupChapter2(ctx) {
  const { scene, town, interactions, effects, hud, cole, biscuit, npcs, markers } = ctx;

  buildRailhead(scene, town.colliders, interactions);
  const train = createTrain(scene);

  // Chevrons over the working parts of the heist.
  markers.add(train.rear, 4.2, () =>
    gameState.activeQuest === 'ch2_iron_horse' &&
    (gameState.questStep === 3 || (gameState.questStep === 4 && train.state === 'stopped')));

  const newt = npcs.find((n) => n.def.id === 'newt');

  function chapterActive() {
    return gameState.activeQuest === 'ch2_iron_horse';
  }

  // Newt carries the word when the chapter opens.
  on('quest:started', ({ quest }) => {
    if (quest === 'ch2_iron_horse' && newt) newt.dialogueOverride = 'ch2_briefing';
  });
  on('dialogue:ch2_briefing:completed', () => {
    if (newt) newt.dialogueOverride = null;
  });

  // The train pulls out the moment Cole reaches the railhead. (The quest's
  // own listener may not have advanced the step yet when this fires, so
  // accept either side of the boundary.)
  on('zone:railhead:entered', () => {
    if (chapterActive() && gameState.questStep >= 1 && gameState.questStep <= 2) train.depart();
  });

  // Leaping aboard: only from the saddle, only while it's moving — that's
  // the whole point of a train robbery.
  interactions.register(
    'board_train', train.rear, 5,
    () => {
      if (!chapterActive() || gameState.questStep !== 2) return '';
      if (train.state !== 'rolling') return '';
      return cole.mounted ? 'Leap aboard the pay train' : '';
    },
    () => {
      biscuit.state = 'idle';
      cole.mounted = false;
      train.aboard = true;
      cole.aboard = true;
      effects.spawnPuff(cole.group.position, 1.2);
      hud.showSubtitle('Cole', 'Sorry, Biscuit. No horses on the roof. Railway rules.');
      emit('train:boarded');
    }
  );

  // The coupling — only mid-heist, so nobody strands the quest early.
  registerTarget(train.coupling, {
    tag: 'train_coupling',
    name: 'Coupling',
    kind: 'shootable',
    onShot(point) {
      if (!chapterActive() || gameState.questStep < 3) return;
      train.cut();
      effects.spawnPuff(point, 1.5);
    },
  });

  // The safe door: lasso it clean off once the cars have stopped.
  registerTarget(train.safeDoor, {
    tag: 'safe_door',
    name: 'Safe door',
    kind: 'lassoable',
    onLasso() {
      if (!chapterActive() || gameState.questStep < 4 || train.state !== 'stopped') return;
      train.safeDoor.rotation.z = 1.2; // hangs off its one stubborn hinge
      train.safeDoor.position.y = 0.7;
      effects.spawnPuff(train.rear.position, 1.5);
    },
  });

  // Looking in the safe starts the moral-choice conversation.
  interactions.register(
    'open_safe', train.rear, 3.5,
    () => (chapterActive() && gameState.questStep === 5 ? "See what's in the safe" : ''),
    () => ctx.dialogue.start('ch2_safe')
  );

  // Hopping down — any time after the coupling's cut, not just at the
  // exact story beat (being stuck on a roof reads as a bug, not drama).
  // The quest only listens for the event at its own step, so an early
  // hop-down is simply allowed, never breaking.
  interactions.register(
    'leave_train', train.rear, 6,
    () => (chapterActive() && gameState.questStep >= 3 && cole.aboard && train.state !== 'rolling'
      ? 'Hop down' : ''),
    () => {
      train.aboard = false;
      cole.aboard = false;
      cole.group.position.set(TRACK_X - 4, 0, train.z + 7.4);
      effects.spawnPuff(cole.group.position, 1);
      emit('train:disembarked');
    }
  );

  // Wages go home at the end of the chapter (take only what was taken —
  // and give it back). Folk are grateful; the kitty grows a little.
  on('quest:completed', ({ quest }) => {
    if (quest === 'ch2_iron_horse') {
      takeItem('wages');
      hud.showSubtitle('Newt', 'Mabel handed the wages out! Folk CHEERED. I did my hawk call.', 4);
      saveGame();
    }
  });

  // Saves that resume mid-heist get the cargo parked nearby, not a ghost
  // train halfway round the valley.
  if (chapterActive() && gameState.questStep >= 3) {
    train.parkRearAt(-10);
    // Steps 3–5 happen ON the roof; step 6 onward you belong on the ground
    // (the repair below then marks the hop-down done automatically).
    if (gameState.questStep <= 5) {
      train.aboard = true;
      cole.aboard = true;
      // Resuming on a train roof looks like being frozen — say why.
      hud.showSubtitle('Cole', "Feet stay planted on a train roof. Aiming still works — or hop down (E).", 5);
    }
    if (gameState.questStep >= 5) {
      train.safeDoor.rotation.z = 1.2;
      train.safeDoor.position.y = 0.7;
    }
  }

  // The engine puffs while it works.
  let smokeTimer = 0;
  const smokePos = new THREE.Vector3();

  return {
    update(dt) {
      train.update(dt, cole);

      // Hopped down EARLY (allowed since the coupling's cut)? When the
      // "hop down" step arrives, the deed is already done — say so.
      if (chapterActive() && gameState.questStep === 6 && !cole.aboard) {
        emit('train:disembarked');
      }

      if (train.frontSpeed > 0 || train.state === 'rolling') {
        smokeTimer -= dt;
        if (smokeTimer <= 0) {
          smokeTimer = 0.3;
          smokePos.set(TRACK_X, 3.9, train.frontZ - 2);
          effects.spawnSmoke(smokePos, 1.6);
        }
      }
    },
  };
}
