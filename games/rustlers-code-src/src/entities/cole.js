// Cole "Copper" Calloway as a voxel-style figure: chunky cubes, big head,
// poncho, hat — with swinging arms and legs when he walks. Handles walking
// (W/A/S/D relative to the camera) and sliding along walls.

import * as THREE from 'three';
import { resolveCircle } from '../world/collision.js';

const WALK_SPEED = 5;    // metres per second — brisk frontier stride
const JOG_SPEED = 7.2;   // holding Shift — for when the plan is running late
const TURN_SPEED = 12;   // how snappily Cole turns to face where he's going
const BODY_RADIUS = 0.4; // how wide Cole is for collision purposes
const HEIGHT = 1.75;     // Cole's height — 1 unit = 1 metre

// Scratch objects reused every frame — never `new` inside the frame loop
// (per threejs-performance skill: per-frame allocation causes stutter).
const _move = new THREE.Vector3();

// Soft-edged circle texture for the blob shadow (real-time shadows are
// banned by the performance budget — this reads just as well). Shared with
// Biscuit and the NPCs, so it's exported.
export function makeBlobShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// A limb whose origin sits at its top, so it swings like a pendulum.
function limb(w, h, d, material, x, y, z) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  geometry.translate(0, -h / 2, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

// Creates Cole and adds him to the scene. His group's position is at his
// FEET (origin at base, per asset-pipeline conventions).
export function createCole(scene) {
  const group = new THREE.Group();

  const copper = new THREE.MeshLambertMaterial({ color: 0x9a4a2c });  // shirt
  const denim = new THREE.MeshLambertMaterial({ color: 0x44566b });   // trousers
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a877 });
  const leather = new THREE.MeshLambertMaterial({ color: 0x5c4326 }); // hat, boots
  const bandanaRed = new THREE.MeshLambertMaterial({ color: 0xb03a2e });
  const sage = new THREE.MeshLambertMaterial({ color: 0x5e6b4a });    // poncho

  // Legs and arms swing from their hips/shoulders while walking.
  const legL = limb(0.22, 0.8, 0.26, denim, 0.14, 0.8, 0);
  const legR = limb(0.22, 0.8, 0.26, denim, -0.14, 0.8, 0);
  const armL = limb(0.15, 0.62, 0.2, copper, 0.37, 1.42, 0);
  const armR = limb(0.15, 0.62, 0.2, copper, -0.37, 1.42, 0);
  group.add(legL, legR, armL, armR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.34), copper);
  torso.position.y = 1.11;
  group.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.36), leather);
  belt.position.y = 0.84;
  group.add(belt);

  // The poncho: a weathered sage slab over the shoulders — the silhouette.
  const poncho = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.4, 0.52), sage);
  poncho.position.y = 1.32;
  group.add(poncho);

  // Bandana on his front (-Z side) so you can see which way he's facing.
  const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), bandanaRed);
  bandana.position.set(0, 1.44, -0.26);
  group.add(bandana);

  // The big voxel head, and the hat that makes him Cole.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.42), skin);
  head.position.y = 1.66;
  group.add(head);
  // Eyes: steady, unhurried, slightly narrowed — like the man.
  const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x1d1712 });
  for (const side of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), eyeMaterial);
    eye.position.set(side, 1.7, -0.22);
    group.add(eye);
  }
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.66), leather);
  brim.position.y = 1.87;
  group.add(brim);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.36), leather);
  crown.position.y = 2.0;
  group.add(crown);

  // Blob shadow: flat soft circle hovering just above the ground.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    new THREE.MeshBasicMaterial({
      map: makeBlobShadowTexture(),
      transparent: true,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  group.position.set(0, 0, 2); // spawn mid-street
  scene.add(group);

  return {
    group,
    facing: 0,
    mounted: false,
    aboard: false,
    sitting: null,   // { exitX, exitZ } while parked on a bench or log
    waveTimer: 0,    // a friendly arm in the air (G key)
    vy: 0,           // vertical speed while jumping
    walkCycle: 0,
    limbs: { legL, legR, armL, armR },
  };
}

// A hop of pure enthusiasm. Only from solid ground, own two feet.
export function tryJumpCole(cole) {
  if (cole.mounted || cole.aboard || cole.sitting) return false;
  if (cole.group.position.y > 0.001) return false;
  cole.vy = 5.4;
  return true;
}

// Turn smoothly toward a target angle, taking the short way round.
function turnToward(current, target, dt) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * Math.min(1, TURN_SPEED * dt);
}

// Swing arms and legs in opposite pairs while walking; settle when still.
function animateWalk(cole, dt, moving, speed) {
  const { legL, legR, armL, armR } = cole.limbs;
  // A raised, waggling arm outranks walking arms — manners first.
  if (cole.waveTimer > 0) {
    cole.waveTimer -= dt;
    armL.rotation.x = -2.6;
    armL.rotation.z = Math.sin(cole.waveTimer * 16) * 0.35;
    if (cole.waveTimer <= 0) armL.rotation.z = 0;
  }
  if (moving) {
    cole.walkCycle += dt * 8.5 * (speed / WALK_SPEED);
    const swing = Math.sin(cole.walkCycle) * 0.65;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    if (cole.waveTimer <= 0) armL.rotation.x = -swing * 0.8;
    armR.rotation.x = swing * 0.8;
  } else {
    const settle = 1 - Math.min(1, dt * 10);
    legL.rotation.x *= settle;
    legR.rotation.x *= settle;
    if (cole.waveTimer <= 0) armL.rotation.x *= settle;
    armR.rotation.x *= settle;
  }
}

// Called every frame. cameraYaw = which way the camera faces, so "W" always
// means "away from the camera" — the control style players expect.
export function updateCole(cole, dt, input, cameraYaw, colliders) {
  // While riding, Biscuit is in charge — biscuit.js moves Cole around.
  // While on the train, the train is (see world/train.js).
  if (cole.mounted || cole.aboard) return;

  _move.set(0, 0, 0);
  if (input.isKeyDown('KeyW')) _move.z -= 1;
  if (input.isKeyDown('KeyS')) _move.z += 1;
  if (input.isKeyDown('KeyA')) _move.x -= 1;
  if (input.isKeyDown('KeyD')) _move.x += 1;

  const moving = _move.lengthSq() > 0;

  // Airborne? Gravity settles the argument.
  if (cole.vy !== 0 || cole.group.position.y > 0) {
    cole.group.position.y += cole.vy * dt;
    cole.vy -= 14 * dt;
    if (cole.group.position.y <= 0) {
      cole.group.position.y = 0;
      cole.vy = 0;
    }
  }

  // Sitting a spell: stay put until the player wants to move again.
  if (cole.sitting) {
    if (moving) {
      cole.group.position.set(cole.sitting.exitX, 0, cole.sitting.exitZ);
      cole.sitting = null;
    } else {
      animateWalk(cole, dt, false, WALK_SPEED);
      return;
    }
  }

  const sprinting = input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight') || input.sprintToggle;
  const speed = sprinting ? JOG_SPEED : WALK_SPEED;

  if (moving) {
    _move.normalize();
    _move.applyAxisAngle(THREE.Object3D.DEFAULT_UP, cameraYaw);

    cole.group.position.x += _move.x * speed * dt;
    cole.group.position.z += _move.z * speed * dt;

    // Face the direction of travel (Cole's front is his local -Z).
    cole.facing = turnToward(cole.facing, Math.atan2(-_move.x, -_move.z), dt);
    cole.group.rotation.y = cole.facing;
  }
  animateWalk(cole, dt, moving, speed);

  resolveCircle(cole.group.position, BODY_RADIUS, colliders);
}
