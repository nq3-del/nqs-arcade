// Chapter 4 — The Vane Gala. Builds Vane's mansion grounds north of town
// (columns, hedges, and of course a golden statue of the man himself),
// runs the finale — statue distraction, study window, the ledger, Vane's
// bluster, the marshal — and raises the ending card when it's done.

import * as THREE from 'three';
import { on } from '../core/events.js';
import { gameState, giveItem } from '../core/gameState.js';
import { registerTarget } from './targets.js';
import { createNpc, updateNpc, npcGreeting } from '../entities/npc.js';
import { codeTier } from '../systems/codeMeter.js';
import npcData from '../data/npcs.json';

function material(color) {
  return new THREE.MeshLambertMaterial({ color });
}

const MANSION_Z = -70;

function buildMansion(scene, colliders, interactions, effects, markers) {
  // The house: grand, white, and slightly too big for its owner's needs.
  const house = new THREE.Mesh(new THREE.BoxGeometry(22, 9, 10), material(0xe8e2d2));
  house.position.set(0, 4.5, MANSION_Z - 8);
  scene.add(house);
  colliders.push({ minX: -11, maxX: 11, minZ: MANSION_Z - 13, maxZ: MANSION_Z - 3 });

  const roof = new THREE.Mesh(new THREE.BoxGeometry(23, 0.6, 11), material(0x7d6f5f));
  roof.position.set(0, 9.3, MANSION_Z - 8);
  scene.add(roof);

  // Columns along the front, because of course there are columns.
  for (let i = -3; i <= 3; i++) {
    const column = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.6, 0.8), material(0xf2ecdc));
    column.position.set(i * 3.2, 4.3, MANSION_Z - 2.6);
    scene.add(column);
  }

  // Hedges framing the forecourt.
  for (const side of [-1, 1]) {
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 16), material(0x3f6b3a));
    hedge.position.set(side * 13, 0.7, MANSION_Z + 6);
    scene.add(hedge);
    colliders.push({ minX: side * 13 - 0.6, maxX: side * 13 + 0.6, minZ: MANSION_Z - 2, maxZ: MANSION_Z + 14 });
  }

  // THE STATUE. Solid gold, twice life size, plaque included.
  const statueGroup = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), material(0xbfb8a8));
  plinth.position.y = 0.7;
  statueGroup.add(plinth);
  const statue = new THREE.Group();
  const sBody = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 0.8), material(0xd9b23a));
  sBody.position.y = 2.5;
  statue.add(sBody);
  const sHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.55), material(0xd9b23a));
  sHead.position.y = 3.9;
  statue.add(sHead);
  const sHat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 10), material(0xd9b23a));
  sHat.position.y = 4.4;
  statue.add(sHat);
  const sArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), material(0xd9b23a));
  sArm.position.set(0.75, 3.1, 0);
  sArm.rotation.z = -0.7; // gesturing grandly at his own house
  statue.add(sArm);
  statueGroup.add(statue);
  statueGroup.position.set(0, 0, MANSION_Z + 8);
  scene.add(statueGroup);
  colliders.push({ minX: -1.1, maxX: 1.1, minZ: MANSION_Z + 6.9, maxZ: MANSION_Z + 9.1 });

  let statueDown = false;
  markers.add(statueGroup, 6, () =>
    gameState.activeQuest === 'ch4_vane_gala' && gameState.questStep === 2 && !statueDown);
  registerTarget(statue, {
    tag: 'vane_statue',
    name: "Vane's golden statue",
    kind: 'lassoable',
    onLasso() {
      if (statueDown) return;
      if (gameState.activeQuest !== 'ch4_vane_gala' || gameState.questStep !== 2) return;
      statueDown = true;
      statue.rotation.x = 1.45; // face down in the begonias
      statue.position.set(0, -0.4, 2.6);
      effects.spawnPuff(statueGroup.position, 3);
      effects.spawnPuff(statue.position.clone().add(statueGroup.position), 2);
    },
  });

  // The study window on the east wing, with its shootable latch.
  const window_ = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 0.15), material(0x2e3640));
  window_.position.set(8, 2.4, MANSION_Z - 2.9);
  scene.add(window_);
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.12), material(0xd9b23a));
  latch.position.set(8.7, 2.4, MANSION_Z - 2.8);
  scene.add(latch);
  let latchShot = false;
  markers.add(window_, 2.2, () =>
    gameState.activeQuest === 'ch4_vane_gala' &&
    ((gameState.questStep === 3 && !latchShot) || gameState.questStep === 4));
  registerTarget(latch, {
    tag: 'study_latch',
    name: 'Study window latch',
    kind: 'shootable',
    onShot(point) {
      if (gameState.activeQuest !== 'ch4_vane_gala' || gameState.questStep !== 3) return;
      latchShot = true;
      latch.visible = false;
      window_.position.y = 3.6; // sash slides up
      effects.spawnPuff(point, 1);
    },
  });

  // The ledger on its little stand, reachable once the window's open.
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), material(0x5a4632));
  stand.position.set(8, 0.55, MANSION_Z - 1.6);
  scene.add(stand);
  const ledger = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.6), material(0x7a2d2d));
  ledger.position.set(8, 1.16, MANSION_Z - 1.6);
  scene.add(ledger);

  interactions.register(
    'take_ledger', stand, 2.4,
    () => (latchShot && gameState.questStep === 4 && gameState.activeQuest === 'ch4_vane_gala'
      ? "Take Vane's ledger" : ''),
    () => {
      ledger.visible = false;
      giveItem('ledger'); // emits item:ledger:collected → the quest advances
    }
  );

  interactions.registerZone('mansion', 0, MANSION_Z + 10, 34, 18);
}

export function setupChapter4(ctx) {
  const { scene, town, interactions, effects, hud, dialogue, dayNight, cole, npcs, endingScreen, markers } = ctx;

  buildMansion(scene, town.colliders, interactions, effects, markers);

  let vane = null;
  let marshal = null;
  const doc = npcs.find((n) => n.def.id === 'doc');

  function chapterActive() {
    return gameState.activeQuest === 'ch4_vane_gala';
  }

  function spawnFinaleCast() {
    if (vane) return;
    const vaneDef = npcData.npcs.find((n) => n.id === 'vane');
    vane = createNpc(scene, { ...vaneDef, x: 4, z: MANSION_Z + 2 });
    interactions.register('vane', vane.group, 3, () => {
      if (chapterActive() && gameState.questStep === 5) return 'Face Mr Vane';
      return 'Talk to Cornelius Vane';
    }, () => {
      if (chapterActive() && gameState.questStep === 5) {
        dialogue.start('ch4_vane');
      } else {
        hud.showSubtitle(vaneDef.name, npcGreeting(vane));
      }
    });

    const marshalDef = npcData.npcs.find((n) => n.id === 'marshal');
    marshal = createNpc(scene, marshalDef); // waits at the depot
    interactions.register('marshal', marshal.group, 3, () => {
      if (chapterActive() && gameState.questStep === 6) return 'Hand the ledger to Marshal Reyes';
      return 'Talk to Marshal Reyes';
    }, () => {
      if (chapterActive() && gameState.questStep === 6) {
        dialogue.start('ch4_marshal');
      } else {
        hud.showSubtitle(marshalDef.name, npcGreeting(marshal));
      }
    });
  }

  on('quest:started', ({ quest }) => {
    if (quest === 'ch4_vane_gala') {
      spawnFinaleCast();
      if (doc) doc.dialogueOverride = 'ch4_briefing';
    }
  });
  if (gameState.chapter >= 4) spawnFinaleCast();
  if (chapterActive() && gameState.questStep === 0 && doc) {
    doc.dialogueOverride = 'ch4_briefing';
  }

  // The gala is an evening affair.
  on('dialogue:ch4_briefing:completed', () => {
    if (doc) doc.dialogueOverride = null;
    if (chapterActive()) dayNight.setNight(true);
  });
  if (chapterActive() && gameState.questStep >= 1) {
    dayNight.setNight(true);
    dayNight.blend = 1;
    dayNight.applyBlend();
  }

  // The finale: dawn breaks, and the ending card tells the rest.
  on('quest:completed', ({ quest }) => {
    if (quest !== 'ch4_vane_gala') return;
    dayNight.setNight(false);
    endingScreen.show(codeTier(), gameState.posters.length >= 10, () => {
      hud.showSubtitle('Cole', 'Valley looks different with nobody owning the view.', 4);
    });
  });

  return {
    update(dt) {
      if (vane) updateNpc(vane, dt, cole.group.position);
      if (marshal) updateNpc(marshal, dt, cole.group.position);
    },
  };
}
