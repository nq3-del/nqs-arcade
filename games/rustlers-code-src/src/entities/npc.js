// Builds the townsfolk from src/data/npcs.json: a simple graybox person
// (torso, head, hat or hair), an idle sway, and a habit of turning to face
// Cole when he's close. Every NPC registers as 'living' so the reticle
// refuses them (hard rule #1), and as talkable so E starts their dialogue.

import * as THREE from 'three';
import { registerTarget } from '../world/targets.js';
import { codeTier } from '../systems/codeMeter.js';

const _toCole = new THREE.Vector3();

export function createNpc(scene, def) {
  const group = new THREE.Group();

  const outfit = new THREE.MeshLambertMaterial({ color: parseInt(def.color, 16) });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a877 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a2e24 });

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.3), dark);
  legs.position.y = 0.375;
  group.add(legs);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.34), outfit);
  torso.position.y = 1.07;
  group.add(torso);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.18), outfit);
  armL.position.set(0.36, 1.05, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = -0.36;
  group.add(armR);

  // The big voxel head (chunky cubes are the style of the whole cast) —
  // with eyes, because eyes are what make a cube a person.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.38), skin);
  head.position.y = 1.6;
  group.add(head);
  const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x1d1712 });
  for (const side of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.03), eyeMaterial);
    eye.position.set(side, 1.63, -0.2);
    group.add(eye);
  }

  if (def.hat) {
    const hatMat = new THREE.MeshLambertMaterial({ color: parseInt(def.hat, 16) });
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), hatMat);
    brim.position.y = 1.8;
    group.add(brim);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.32), hatMat);
    crown.position.y = 1.92;
    group.add(crown);
  } else {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.4), dark);
    hair.position.y = 1.81;
    group.add(hair);
  }

  // Kids are two-thirds scale; Preacher is a gentle giant.
  if (def.scale) group.scale.setScalar(def.scale);

  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.faceYaw || 0;
  scene.add(group);

  registerTarget(group, {
    tag: 'npc_' + def.id,
    name: def.name,
    kind: 'living',
  });

  return {
    def,
    group,
    torso,
    baseYaw: def.faceYaw || 0,
    swayTimer: Math.random() * 6, // random so the town doesn't sway in unison
    dialogueOverride: null,       // chapters can point an NPC at a new tree
  };
}

// Which conversation should this NPC hold right now?
export function npcDialogueId(npc) {
  return npc.dialogueOverride || npc.def.dialogue;
}

// The tier-appropriate hello (greetLow/greetMid/greetHigh in npcs.json).
export function npcGreeting(npc) {
  const key = { low: 'greetLow', mid: 'greetMid', high: 'greetHigh' }[codeTier()];
  return npc.def[key] || npc.def.greetMid;
}

export function updateNpc(npc, dt, colePosition) {
  npc.swayTimer += dt;
  npc.torso.rotation.z = Math.sin(npc.swayTimer * 1.1) * 0.03;

  // Turn to face Cole when he's near; drift back when he leaves.
  _toCole.subVectors(colePosition, npc.group.position);
  const near = _toCole.lengthSq() < 16;
  const targetYaw = near ? Math.atan2(-_toCole.x, -_toCole.z) : npc.baseYaw;
  const diff = Math.atan2(
    Math.sin(targetYaw - npc.group.rotation.y),
    Math.cos(targetYaw - npc.group.rotation.y)
  );
  npc.group.rotation.y += diff * Math.min(1, dt * 4);
}
