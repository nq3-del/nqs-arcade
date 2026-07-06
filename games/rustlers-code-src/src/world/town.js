// Copperhead Creek itself: proper western buildings (false fronts, porches,
// awnings, lettered signs), street furniture, lamps and the practice corner.
// Everything static is merged into ONE mesh via build.js — the whole town
// costs a handful of draw calls. Colliders are separate and unchanged by
// looks (asset-pipeline skill: swapping visuals must never break movement).

import * as THREE from 'three';
import { box, mergeParts, makeSign } from './build.js';
import { registerTarget } from './targets.js';
import { emit } from '../core/events.js';

function addCollider(colliders, x, z, width, depth) {
  colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  });
}

// Shade a colour darker/lighter without hand-picking every trim tone.
const _c = new THREE.Color();
function shade(color, factor) {
  _c.setHex(color).multiplyScalar(factor);
  return _c.getHex();
}

// A frontier building: walls, false front, roof, door, windows, porch with
// posts and awning, sometimes a chimney. side = which way it faces the
// street (+1 = faces east, -1 = faces west).
function building(parts, scene, colliders, { x, z, w, h, d, color, side, sign, chimney, gable }, windowGlowSpots) {
  const trim = shade(color, 1.25);
  const dark = shade(color, 0.55);
  const face = x + side * (w / 2); // the street-facing wall's x

  // Foundation skirt: a dark base course so the building sits INTO the
  // ground instead of hovering on it — cheap fake contact shadow.
  box(parts, x, 0.05, z, w + 0.5, 0.12, d + 0.5, shade(color, 0.3));

  box(parts, x, h / 2, z, w, h, d, color);                          // walls
  box(parts, face, h + 0.55, z, 0.16, 1.3, d + 0.3, trim);          // false front
  box(parts, face, h + 1.25, z, 0.2, 0.18, d + 0.5, dark);          // front cap
  box(parts, x, h + 0.08, z, w + 0.3, 0.2, d + 0.3, dark);          // roof slab
  if (gable) {
    // A pitched roof: two tilted slabs meeting at a ridge that runs
    // parallel to the street. Grand buildings earn a proper silhouette.
    const slabW = w * 0.62;
    const tilt = 0.55;
    box(parts, x - w * 0.24, h + 0.62, z, slabW, 0.14, d + 0.5, shade(color, 0.45), 0, tilt);
    box(parts, x + w * 0.24, h + 0.62, z, slabW, 0.14, d + 0.5, shade(color, 0.5), 0, -tilt);
    box(parts, x, h + 1.02, z, 0.3, 0.16, d + 0.55, shade(color, 0.35)); // ridge cap
  }
  box(parts, face + side * 0.03, 1.1, z, 0.1, 2.2, 1.1, 0x241a10);  // door
  box(parts, face + side * 0.03, 1.8, z - d / 4, 0.08, 1.0, 0.8, 0x18242c); // window
  box(parts, face + side * 0.03, 1.8, z + d / 4, 0.08, 1.0, 0.8, 0x18242c); // window
  // Windows glow warm after dark (sprites made after the merge).
  windowGlowSpots.push([face + side * 0.15, 1.8, z - d / 4], [face + side * 0.15, 1.8, z + d / 4]);

  // The porch: deck, posts, awning.
  const porchX = face + side * 0.95;
  box(parts, porchX, 0.07, z, 1.9, 0.14, d * 0.9, shade(0x9a8668, 0.95));
  box(parts, porchX + side * 0.05, 2.6, z, 2.15, 0.12, d * 0.95, dark);
  for (const off of [-d * 0.38, d * 0.38]) {
    box(parts, face + side * 1.8, 1.3, z + off, 0.16, 2.6, 0.16, shade(0x7a6248, 1.1));
  }
  if (chimney) {
    box(parts, x - side * (w / 4), h + 0.7, z - d / 4, 0.5, 1.6, 0.5, 0x6b625a);
  }

  if (sign) {
    makeSign(scene, sign, face + side * 0.22, h + 0.55, z, Math.min(w * 0.72, 4.6),
      side > 0 ? Math.PI / 2 : -Math.PI / 2);
  }

  addCollider(colliders, x, z, w, d);
}

function hitchingRail(parts, x, z, ry = 0) {
  // Two posts and a rail, for horses that are theoretically tied to it.
  const dx = Math.cos(ry), dz = Math.sin(ry);
  box(parts, x - dx, 0.5, z - dz, 0.14, 1, 0.14, 0x6e5638);
  box(parts, x + dx, 0.5, z + dz, 0.14, 1, 0.14, 0x6e5638);
  box(parts, x, 0.95, z, dx ? 2.2 : 0.12, 0.1, dz ? 2.2 : 0.12, 0x7a6248);
}

function waterTrough(parts, colliders, x, z) {
  box(parts, x, 0.25, z, 1.6, 0.5, 0.7, 0x6e5638);
  box(parts, x, 0.42, z, 1.4, 0.08, 0.5, 0x4a7fa8); // the water
  addCollider(colliders, x, z, 1.6, 0.7);
}

function barrel(parts, colliders, x, z) {
  // A chunky voxel barrel: body cube with two darker hoop slabs.
  box(parts, x, 0.45, z, 0.6, 0.9, 0.6, 0x6e4a2f);
  box(parts, x, 0.26, z, 0.66, 0.08, 0.66, 0x3a2c1c);
  box(parts, x, 0.66, z, 0.66, 0.08, 0.66, 0x3a2c1c);
  addCollider(colliders, x, z, 0.7, 0.7);
}

function crate(parts, colliders, x, z, ry = 0) {
  box(parts, x, 0.4, z, 0.8, 0.8, 0.8, 0xa07a4a, ry);
  addCollider(colliders, x, z, 0.8, 0.8);
}

// A porch bench. backSide = +1 if the backrest faces east, -1 for west.
// Sitting itself is wired up in main.js (the seat is just geometry here).
function bench(parts, x, z, backSide) {
  box(parts, x, 0.5, z, 0.45, 0.1, 1.5, 0x8a6f4d);                 // seat
  box(parts, x + backSide * 0.24, 0.82, z, 0.1, 0.55, 1.5, 0x7a6248); // backrest
  box(parts, x, 0.25, z - 0.6, 0.4, 0.5, 0.12, 0x5c4a35);          // legs
  box(parts, x, 0.25, z + 0.6, 0.4, 0.5, 0.12, 0x5c4a35);
}

function lampPost(parts, x, z) {
  box(parts, x, 1.6, z, 0.15, 3.2, 0.15, 0x2e2a24);
  box(parts, x, 3.2, z, 0.34, 0.4, 0.34, 0x3a3430);
  box(parts, x, 3.2, z, 0.26, 0.28, 0.26, 0xffd9a0); // the glass
}

function waterTower(parts, colliders, x, z) {
  for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    box(parts, x + lx, 3, z + lz, 0.2, 6, 0.2, 0x6e5638);
  }
  box(parts, x, 3, z, 1.9, 0.15, 0.15, 0x5c4a35);
  box(parts, x, 4.4, z, 0.15, 0.15, 1.9, 0x5c4a35);
  box(parts, x, 6.1, z, 3.6, 0.3, 3.6, 0x5c4a35);        // platform
  box(parts, x, 7.6, z, 3.2, 2.8, 3.2, 0x8a4030);        // the chunky tank
  box(parts, x, 9.15, z, 3.5, 0.3, 3.5, 0x6b3226);       // roof slabs
  box(parts, x, 9.55, z, 2.2, 0.5, 2.2, 0x6b3226);
  box(parts, x, 4.8, z + 1.7, 0.22, 2.6, 0.22, 0x5c4a35); // spout
  addCollider(colliders, x, z, 2.4, 2.4);
}

// The practice corner: bottles, a spinning sign and a hay bale — dynamic
// targets stay as their own little meshes so they can react when hit.
function addPracticeCorner(parts, scene, colliders, effects) {
  box(parts, -5, 1, 12, 4, 0.1, 0.15, 0x7a6248);   // rail
  box(parts, -6.8, 0.5, 12, 0.15, 1, 0.15, 0x7a6248);
  box(parts, -3.2, 0.5, 12, 0.15, 1, 0.15, 0x7a6248);
  addCollider(colliders, -5, 12, 4, 0.3);
  box(parts, -3.5, 1.1, 14, 0.15, 2.2, 0.15, 0x7a6248); // sign post

  const bottleMaterial = new THREE.MeshLambertMaterial({ color: 0x5f8f6a });
  for (let i = 0; i < 3; i++) {
    // A voxel bottle: chunky body, little neck cube.
    const bottle = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), bottleMaterial);
    body.position.y = -0.04;
    bottle.add(body);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), bottleMaterial);
    neck.position.y = 0.14;
    bottle.add(neck);
    bottle.position.set(-6 + i, 1.22, 12);
    scene.add(bottle);
    registerTarget(bottle, {
      tag: 'practice_bottle_' + i,
      name: 'Bottle',
      kind: 'shootable',
      onShot() {
        bottle.visible = false;
        setTimeout(() => { bottle.visible = true; }, 6000);
      },
    });
  }

  const signBoard = makeSign(scene, 'TRICK SHOTS', -3.5, 2.1, 14.1, 1.7, Math.PI);
  registerTarget(signBoard, {
    tag: 'practice_sign',
    name: 'Practice sign',
    kind: 'shootable',
    onShot() {
      effects.addSpin(signBoard, 14);
    },
  });

  // Tin cans on the fence posts — quick-draw practice for quiet afternoons.
  const canMaterial = new THREE.MeshLambertMaterial({ color: 0x9aa2a8 });
  const canSpots = [-6.8, -3.2]; // the tops of the two rail posts
  for (let i = 0; i < canSpots.length; i++) {
    const can = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), canMaterial);
    can.position.set(canSpots[i], 1.12, 12);
    scene.add(can);
    registerTarget(can, {
      tag: 'tin_can_' + i,
      name: 'Tin can',
      kind: 'shootable',
      onShot(point) {
        can.visible = false;
        effects.spawnPuff(point, 0.6);
        setTimeout(() => { can.visible = true; }, 7000);
      },
    });
  }

  const bale = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xd9c26b })
  );
  bale.position.set(-7, 0.7, 9);
  scene.add(bale);
  let baleDown = false;
  registerTarget(bale, {
    tag: 'practice_bale',
    name: 'Hay bale',
    kind: 'lassoable',
    onLasso() {
      baleDown = !baleDown;
      bale.position.set(baleDown ? -5.5 : -7, baleDown ? 0.25 : 0.7, baleDown ? 10.5 : 9);
      effects.spawnPuff(bale.position, 1.2);
    },
  });
}

// Builds the whole town. Returns { colliders, lampGlows } — lampGlows are
// the sprites main.js brightens as night falls.
export function buildTown(scene, effects) {
  const colliders = [];
  const parts = [];
  const windowGlowSpots = []; // filled by building(); becomes sprites below

  // West side of Main Street (buildings face east, side = +1).
  building(parts, scene, colliders, { x: -10, z: -18, w: 8, h: 5, d: 7, color: 0x8b5a2b, side: 1, sign: 'BANK', chimney: true, gable: true }, windowGlowSpots);
  building(parts, scene, colliders, { x: -10, z: -6, w: 6, h: 4, d: 6, color: 0x555c66, side: 1, sign: 'SHERIFF' }, windowGlowSpots);
  building(parts, scene, colliders, { x: -10, z: 6, w: 7, h: 4, d: 6, color: 0x4a7c45, side: 1, sign: 'GENERAL STORE' }, windowGlowSpots);
  building(parts, scene, colliders, { x: -10, z: 18, w: 6, h: 4, d: 7, color: 0x3a7f7a, side: 1, sign: "DOC VEGA'S", chimney: true }, windowGlowSpots);

  // East side (face west, side = -1).
  building(parts, scene, colliders, { x: 10, z: -18, w: 7, h: 6, d: 7, color: 0x8b3a3a, side: -1, sign: 'HOTEL', chimney: true, gable: true }, windowGlowSpots);
  building(parts, scene, colliders, { x: 10, z: -6, w: 6, h: 4, d: 6, color: 0xc2a25a, side: -1, sign: 'STABLE' }, windowGlowSpots);
  building(parts, scene, colliders, { x: 10, z: 6, w: 6, h: 5, d: 6, color: 0xd9d4c7, side: -1, sign: 'CHAPEL', gable: true }, windowGlowSpots);
  building(parts, scene, colliders, { x: 10, z: 18, w: 8, h: 4, d: 6, color: 0x6b6b6b, side: -1, sign: 'DEPOT' }, windowGlowSpots);

  // The chapel gets its little bell gable. The bell itself stays a
  // separate mesh — shooting it rings it (of course shooting it rings it).
  box(parts, 10, 6.4, 6, 1.2, 1.6, 1, 0xd9d4c7);
  box(parts, 10, 7.35, 6, 1.5, 0.3, 1.3, shade(0xd9d4c7, 0.55));
  const bell = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.38, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xb8912f })
  );
  bell.position.set(10, 6.5, 6);
  scene.add(bell);
  registerTarget(bell, {
    tag: 'chapel_bell',
    name: 'Chapel bell',
    kind: 'shootable',
    onShot() {
      effects.addSpin(bell, 6, 'z');
      emit('audio:bell');
      emit('bell:rung');
    },
  });

  // Street furniture.
  bench(parts, 5.7, -4.3, 1);   // the hotel porch — best gossip in town
  bench(parts, -5.6, 7.8, -1);  // outside the general store
  hitchingRail(parts, -6.8, -6, Math.PI / 2);
  hitchingRail(parts, 6.8, -6, Math.PI / 2);
  hitchingRail(parts, 6.8, 18, Math.PI / 2);
  waterTrough(parts, colliders, -6.5, -5.9);
  barrel(parts, colliders, -6, -3);
  barrel(parts, colliders, -5.5, -2.2);
  barrel(parts, colliders, 6.2, 9);
  crate(parts, colliders, 6, -14);
  crate(parts, colliders, 6.9, -14, 0.4);
  crate(parts, colliders, 6.45, -13.2);

  waterTower(parts, colliders, 0, -28);

  // Lamps along the street; their glow sprites wake up at night.
  const lampPositions = [[-6, -12], [6, -1], [-6, 3], [6, 13]];
  for (const [lx, lz] of lampPositions) lampPost(parts, lx, lz);

  addPracticeCorner(parts, scene, colliders, effects);

  mergeParts(scene, parts);

  // The lamp glows: little warm sprites, invisible until dark.
  const glowMaterial = new THREE.SpriteMaterial({
    color: 0xffb45e,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lampGlows = [];
  for (const [lx, lz] of lampPositions) {
    const glow = new THREE.Sprite(glowMaterial.clone());
    glow.position.set(lx, 3.2, lz);
    glow.scale.setScalar(2.4);
    glow.userData.strength = 0.85;
    scene.add(glow);
    lampGlows.push(glow);
  }
  // Windows join the same after-dark rota, gentler than the lamps —
  // the town looks inhabited at night instead of abandoned.
  for (const [wx, wy, wz] of windowGlowSpots) {
    const glow = new THREE.Sprite(glowMaterial.clone());
    glow.position.set(wx, wy, wz);
    glow.scale.setScalar(1.1);
    glow.userData.strength = 0.4;
    scene.add(glow);
    lampGlows.push(glow);
  }

  // Pools of lamplight on the ground beneath each post — night streets
  // get warm little islands to stand in.
  for (const [lx, lz] of lampPositions) {
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffb45e, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(lx, 0.04, lz);
    pool.userData.strength = 0.28;
    scene.add(pool);
    lampGlows.push(pool);
  }

  return { colliders, lampGlows };
}
