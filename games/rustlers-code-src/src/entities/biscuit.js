// Biscuit — Cole's horse. Wanted posters call him "a bloodthirsty steed";
// he is in fact extremely food-motivated. Whistle (B) and he trots over,
// H mounts/dismounts, and riding is much faster than walking.
// Graybox model built from boxes; real proportions (1 unit = 1 metre).

import * as THREE from 'three';
import { resolveCircle } from '../world/collision.js';
import { emit } from '../core/events.js';

const TROT_SPEED = 8;    // Biscuit answering the whistle
const RIDE_SPEED = 11;   // galloping with Cole aboard — clearly faster than walking
const TURN_SPEED = 7;    // horses corner wider than people
const BODY_RADIUS = 0.7;
const MOUNT_RANGE = 3;   // how close Cole must be to hop on

const _move = new THREE.Vector3(); // frame-loop scratch — never `new` per frame

function leg(material, x, z) {
  // Leg origin at the hip so it can swing like a pendulum while trotting.
  const geometry = new THREE.BoxGeometry(0.16, 0.85, 0.16);
  geometry.translate(0, -0.425, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0.85, z);
  return mesh;
}

export function createBiscuit(scene, blobShadowTexture) {
  const group = new THREE.Group();

  const coat = new THREE.MeshLambertMaterial({ color: 0x8a5a33 });   // biscuit-brown, naturally
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a2417 });   // mane, tail, hooves-ish
  const tack = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });   // saddle leather
  const blanket = new THREE.MeshLambertMaterial({ color: 0xb03a2e }); // saddle blanket

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 1.7), coat);
  body.position.y = 1.15;
  group.add(body);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.35), coat);
  neck.position.set(0, 1.62, -0.72);
  neck.rotation.x = 0.45;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.55), coat);
  head.position.set(0, 1.95, -1.02);
  group.add(head);

  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.25), dark);
  muzzle.position.set(0, 1.9, -1.32);
  group.add(muzzle);

  // Eyes on each side of the head, and the white blaze down the front —
  // the parts of a horse that make it THIS horse.
  const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x1d1712 });
  for (const side of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.07), eyeMaterial);
    eye.position.set(side, 2.0, -1.0);
    group.add(eye);
  }
  const blaze = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.28, 0.03),
    new THREE.MeshLambertMaterial({ color: 0xf2ede2 })
  );
  blaze.position.set(0, 1.98, -1.31);
  group.add(blaze);

  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), coat);
  earL.position.set(0.09, 2.16, -0.95);
  group.add(earL);
  const earR = earL.clone();
  earR.position.x = -0.09;
  group.add(earR);

  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.18), dark);
  mane.position.set(0, 1.75, -0.6);
  mane.rotation.x = 0.45;
  group.add(mane);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), dark);
  tail.position.set(0, 1.25, 0.95);
  tail.rotation.x = -0.4;
  group.add(tail);

  const legs = [
    leg(coat, 0.22, -0.6), leg(coat, -0.22, -0.6),
    leg(coat, 0.22, 0.6), leg(coat, -0.22, 0.6),
  ];
  legs.forEach((l) => group.add(l));

  const saddleBlanket = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.75), blanket);
  saddleBlanket.position.set(0, 1.55, 0.05);
  group.add(saddleBlanket);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.55), tack);
  saddle.position.set(0, 1.64, 0.05);
  group.add(saddle);

  // Blob shadow (real-time shadows are off, per the performance budget).
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.6),
    new THREE.MeshBasicMaterial({ map: blobShadowTexture, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  group.position.set(15, 0, -2); // grazing east of the stable
  group.rotation.y = 1.2;
  scene.add(group);

  return {
    group,
    legs,
    state: 'idle',   // 'idle' | 'coming' | 'mounted'
    facing: 1.2,
    walkCycle: 0,    // drives the leg-swing animation
    grazeTimer: 0,   // drives the idle head-dip
    boostTimer: 0,   // apple sugar rush — extra gallop for a spell
    vy: 0,           // vertical speed while jumping
    neck,
    head,
    muzzle,
  };
}

// The mounted jump — Biscuit provides the spring, Cole provides the hat.
export function tryJumpBiscuit(biscuit) {
  if (biscuit.state !== 'mounted') return false;
  if (biscuit.group.position.y > 0.001) return false;
  biscuit.vy = 5.8;
  return true;
}

function turnToward(current, target, dt) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * Math.min(1, TURN_SPEED * dt);
}

// Swing the legs in diagonal pairs while moving; settle when standing.
function animateLegs(biscuit, dt, moving) {
  if (moving) {
    biscuit.walkCycle += dt * 9;
    const swing = Math.sin(biscuit.walkCycle) * 0.55;
    biscuit.legs[0].rotation.x = swing;
    biscuit.legs[3].rotation.x = swing;
    biscuit.legs[1].rotation.x = -swing;
    biscuit.legs[2].rotation.x = -swing;
  } else {
    for (const l of biscuit.legs) l.rotation.x *= 1 - Math.min(1, dt * 10);
  }
}

// The idle graze: head dips down now and then, looking for anything edible.
function animateGraze(biscuit, dt) {
  biscuit.grazeTimer += dt;
  const dip = Math.max(0, Math.sin(biscuit.grazeTimer * 0.7)) * 0.55;
  biscuit.neck.rotation.x = 0.45 + dip;
  biscuit.head.position.y = 1.95 - dip * 0.9;
  biscuit.muzzle.position.y = 1.9 - dip * 0.95;
}

export function updateBiscuit(biscuit, dt, input, cole, cameraYaw, colliders) {
  const pos = biscuit.group.position;

  // B = whistle. Biscuit assumes food is involved and commits fully.
  if (input.wasPressed('KeyB') && biscuit.state === 'idle') {
    biscuit.state = 'coming';
    emit('biscuit:whistled');
  }

  // H = mount when close / dismount when riding.
  if (input.wasPressed('KeyH')) {
    if (biscuit.state === 'mounted') {
      biscuit.state = 'idle';
      cole.mounted = false;
      // Set Cole down beside the saddle, then let collision tidy up.
      cole.group.position.set(
        pos.x + Math.cos(biscuit.facing) * 1.2,
        0,
        pos.z - Math.sin(biscuit.facing) * 1.2
      );
      resolveCircle(cole.group.position, 0.4, colliders);
      emit('biscuit:dismounted');
    } else if (cole.group.position.distanceTo(pos) < MOUNT_RANGE) {
      biscuit.state = 'mounted';
      cole.mounted = true;
      emit('biscuit:mounted');
    }
  }

  let moving = false;

  if (biscuit.state === 'coming') {
    // Trot to Cole, stop politely just short of trampling him.
    _move.subVectors(cole.group.position, pos);
    _move.y = 0;
    if (_move.length() > 2.2) {
      _move.normalize();
      pos.x += _move.x * TROT_SPEED * dt;
      pos.z += _move.z * TROT_SPEED * dt;
      biscuit.facing = turnToward(biscuit.facing, Math.atan2(-_move.x, -_move.z), dt);
      moving = true;
    } else {
      biscuit.state = 'idle';
      emit('biscuit:arrived');
    }
  } else if (biscuit.state === 'mounted') {
    // Riding: W/A/S/D relative to the camera, same feel as walking but faster.
    _move.set(0, 0, 0);
    if (input.isKeyDown('KeyW')) _move.z -= 1;
    if (input.isKeyDown('KeyS')) _move.z += 1;
    if (input.isKeyDown('KeyA')) _move.x -= 1;
    if (input.isKeyDown('KeyD')) _move.x += 1;
    if (_move.lengthSq() > 0) {
      _move.normalize();
      _move.applyAxisAngle(THREE.Object3D.DEFAULT_UP, cameraYaw);
      // Apples are rocket fuel, briefly; sprint (Shift or stick-click)
      // asks for the proper gallop.
      const sprinting = input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight') || input.sprintToggle;
      const speed = RIDE_SPEED + (biscuit.boostTimer > 0 ? 3.5 : 0) + (sprinting ? 2.5 : 0);
      pos.x += _move.x * speed * dt;
      pos.z += _move.z * speed * dt;
      biscuit.facing = turnToward(biscuit.facing, Math.atan2(-_move.x, -_move.z), dt);
      moving = true;
    }
  }

  if (biscuit.boostTimer > 0) biscuit.boostTimer -= dt;

  // A horse that can't hop a creek is no horse of Cole's.
  if (biscuit.vy !== 0 || pos.y > 0) {
    pos.y += biscuit.vy * dt;
    biscuit.vy -= 14 * dt;
    if (pos.y <= 0) {
      pos.y = 0;
      biscuit.vy = 0;
    }
  }

  resolveCircle(pos, BODY_RADIUS, colliders);
  biscuit.group.rotation.y = biscuit.facing;

  // Cole rides along: sit him on the saddle, facing where Biscuit faces.
  if (biscuit.state === 'mounted') {
    cole.group.position.set(pos.x, pos.y + 1.05, pos.z);
    cole.group.rotation.y = biscuit.facing;
    cole.facing = biscuit.facing;
  }

  animateLegs(biscuit, dt, moving);
  if (biscuit.state === 'idle') {
    animateGraze(biscuit, dt);
  } else {
    // Head up and attentive while working.
    biscuit.neck.rotation.x += (0.45 - biscuit.neck.rotation.x) * Math.min(1, dt * 6);
    biscuit.head.position.y += (1.95 - biscuit.head.position.y) * Math.min(1, dt * 6);
    biscuit.muzzle.position.y += (1.9 - biscuit.muzzle.position.y) * Math.min(1, dt * 6);
  }
}
