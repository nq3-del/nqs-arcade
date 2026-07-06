// Everything outside the town's buildings: the varied desert floor, the
// mesa to the west, farms and a working windmill to the south, Copperhead
// Creek and its bridge, cacti, rocks, fences and a few tumbleweeds who are
// having a lovely time. Static scenery merges into a handful of meshes.

import * as THREE from 'three';
import { box, mergeParts } from './build.js';
import { registerTarget } from './targets.js';

// ---------- The ground ----------
// One subdivided plane, coloured per-vertex: packed-dirt roads, sandy
// desert with gentle variation, and a green tinge along the creek.
const ROADS = [
  { minX: -4, maxX: 4, minZ: -36, maxZ: 36 },     // Main Street
  { minX: 4, maxX: 58, minZ: 26, maxZ: 34 },      // east to the railhead
  { minX: -50, maxX: -4, minZ: 12, maxZ: 20 },    // west to the hideout
  { minX: -3, maxX: 3, minZ: -62, maxZ: -36 },    // north to the mansion
  { minX: -4, maxX: 24, minZ: 46, maxZ: 54 },     // south to the farms
];

function inRect(x, z, r) {
  return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
}

// A speckled sand texture that repeats across the whole floor — the fine
// grain the flat vertex colours were missing. One 256px canvas, made once.
function makeSandTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const shade = Math.random() > 0.5 ? '30, 20, 8' : '255, 250, 235';
    ctx.fillStyle = `rgba(${shade}, ${0.04 + Math.random() * 0.05})`;
    const s = 1 + Math.random() * 2.5;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(48, 48);
  return texture;
}

function buildGround(scene) {
  const geometry = new THREE.PlaneGeometry(300, 300, 90, 90);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const sand = new THREE.Color(0xd2b074);
  const dirt = new THREE.Color(0xb3925c);
  const green = new THREE.Color(0x9aa860);
  const c = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    c.copy(sand);
    // Cheap, stable "noise" from the coordinates — no randomness, so the
    // ground never shimmers between visits.
    const n = Math.sin(x * 0.31) * Math.cos(z * 0.27) + Math.sin(x * 0.07 + z * 0.11);
    c.offsetHSL(0, 0, n * 0.022);
    if (ROADS.some((r) => inRect(x, z, r))) c.copy(dirt).offsetHSL(0, 0, n * 0.015);
    // Creek banks go a little green.
    if (z > 34 && z < 50 && x < -6) c.lerp(green, 0.45);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({ vertexColors: true, map: makeSandTexture() })
  );
  scene.add(ground);
}

// ---------- Scenery ----------
// The valley perimeter: a rugged rock ridge along the north, east and
// south edges (the mesa already seals the west), plus invisible collision
// bands so nobody walks off the map. The far hills rise beyond it, so the
// world ends at a wall of rock with more world painted behind it.
function buildPerimeter(parts, colliders) {
  const EDGE = 91;
  // Rows of chunky rocks with varied heights — a ridge, not a fence.
  for (let i = -96; i <= 96; i += 7) {
    const bump = (Math.abs(i * 13) % 5) - 2; // stable pseudo-variation
    const h = 4 + (Math.abs(i * 7) % 4) + bump;
    // North and south ridges (skip the west corner where the mesa lives).
    if (i > -70) {
      box(parts, i, h / 2, -EDGE - 2, 8.5, h, 6 + bump, 0x96603a, i * 0.7);
      box(parts, i, (h + 1) / 2, EDGE + 2, 8.5, h + 1, 6 - bump, 0x8f5a36, i * 0.9);
    }
    // East ridge (the railhead stays comfortably inside it).
    box(parts, EDGE + 2, (h + 0.5) / 2, i, 6 + bump, h + 0.5, 8.5, 0x9c6440, i * 1.1);
  }
  // The invisible fences, just inside the rocks.
  colliders.push(
    { minX: -100, maxX: 100, minZ: -100, maxZ: -EDGE + 2 }, // north
    { minX: -100, maxX: 100, minZ: EDGE - 2, maxZ: 100 },   // south
    { minX: EDGE - 2, maxX: 100, minZ: -100, maxZ: 100 },   // east
    { minX: -100, maxX: -89, minZ: -100, maxZ: 100 }        // west corners past the mesa
  );
}

// A ring of far hills past the playable edge. The fog does the artistry —
// they read as hazy blue silhouettes and give the horizon real depth.
function buildFarHills(parts) {
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + 0.35;
    const radius = 128 + (i % 3) * 8;
    box(
      parts,
      Math.cos(angle) * radius,
      4 + (i % 4) * 2.5,
      Math.sin(angle) * radius,
      42 + (i % 3) * 16,   // width
      10 + (i % 4) * 6,    // height
      16,
      0x8a97a8,            // haze blue — fog finishes the job
      angle + 0.4
    );
  }
}

function buildMesa(parts, colliders) {
  box(parts, -85, 4, -5, 26, 8, 130, 0xa0562f);
  box(parts, -93, 10, -15, 18, 12, 95, 0x8f4a28);
  box(parts, -97, 16, -20, 12, 12, 70, 0xb06438);
  // A few fallen boulders along the base.
  for (const [x, z, s] of [[-70, -20, 1.6], [-71, 8, 1.2], [-69, 34, 1.9], [-72, -44, 1.4]]) {
    box(parts, x, s / 2, z, s * 1.4, s, s * 1.2, 0x9a5a34, x + z);
  }
  colliders.push({ minX: -100, maxX: -71, minZ: -72, maxZ: 62 });
}

function cactus(parts, x, z, height) {
  // The classic voxel saguaro: stacked cubes, one elbow arm.
  const green = 0x3f7a3f;
  const light = 0x4a8a4a;
  const cubes = Math.max(3, Math.round(height / 0.45));
  for (let i = 0; i < cubes; i++) {
    box(parts, x, 0.22 + i * 0.44, z, 0.42, 0.44, 0.42, i % 2 ? green : light);
  }
  box(parts, x + 0.42, height * 0.45, z, 0.42, 0.4, 0.4, green);          // elbow out
  box(parts, x + 0.64, height * 0.45 + 0.4, z, 0.38, 0.5, 0.38, light);   // elbow up
}

function rock(parts, colliders, x, z, size) {
  box(parts, x, size * 0.4, z, size * 1.3, size * 0.8, size, 0x8f8272, x * 0.7 + z * 0.3);
  if (size > 1.2) {
    colliders.push({ minX: x - size * 0.7, maxX: x + size * 0.7, minZ: z - size * 0.55, maxZ: z + size * 0.55 });
  }
}

function fenceRun(parts, x1, z1, x2, z2) {
  const length = Math.hypot(x2 - x1, z2 - z1);
  const count = Math.floor(length / 2.4);
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    box(parts, x1 + (x2 - x1) * t, 0.55, z1 + (z2 - z1) * t, 0.15, 1.1, 0.15, 0x6e5638);
  }
  const midX = (x1 + x2) / 2, midZ = (z1 + z2) / 2;
  const ry = Math.atan2(z2 - z1, x2 - x1);
  const rail = new THREE.BoxGeometry(length, 0.07, 0.09);
  // Two rails, done by hand so they can rotate to the run's angle.
  for (const y of [0.55, 0.9]) {
    const g = rail.clone();
    g.rotateY(-ry);
    g.translate(midX, y, midZ);
    // Paint it fence-brown.
    const n = g.attributes.position.count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { cols[i * 3] = 0.48; cols[i * 3 + 1] = 0.38; cols[i * 3 + 2] = 0.25; }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    parts.push(g);
  }
  rail.dispose();
}

function buildFarms(parts, colliders, scene) {
  // Three tidy fields: dark soil, rows of something green and optimistic.
  for (const [fx, fz] of [[-8, 62], [8, 62], [0, 76]]) {
    box(parts, fx, 0.06, fz, 13, 0.12, 9, 0x6b4a33);
    for (let row = -3; row <= 3; row++) {
      box(parts, fx, 0.28, fz + row * 1.2, 12, 0.3, 0.4, 0x5a8a3f);
    }
  }
  // The farmhouse and its red barn.
  box(parts, -18, 1.6, 72, 6, 3.2, 5, 0xc9b892);
  box(parts, -18, 3.4, 72, 6.5, 0.5, 5.5, 0x6b5844);
  colliders.push({ minX: -21, maxX: -15, minZ: 69.5, maxZ: 74.5 });
  box(parts, 20, 2.2, 74, 7, 4.4, 6, 0x8a3a2e);
  box(parts, 20, 4.7, 74, 7.5, 0.6, 6.5, 0x5c2620);
  colliders.push({ minX: 16.5, maxX: 23.5, minZ: 71, maxZ: 77 });

  fenceRun(parts, -26, 56, 28, 56);
  fenceRun(parts, -26, 82, 28, 82);
  fenceRun(parts, -26, 56, -26, 82);
  fenceRun(parts, 28, 56, 28, 82);

  // The windmill tower is static; its rotor spins (returned separately).
  const wx = 26, wz = 62;
  for (const [lx, lz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
    box(parts, wx + lx * 0.7, 3.5, wz + lz * 0.7, 0.2, 7, 0.2, 0x7a6248);
  }
  box(parts, wx, 7.1, wz, 1, 0.9, 1, 0x8a7458);
  colliders.push({ minX: wx - 1, maxX: wx + 1, minZ: wz - 1, maxZ: wz + 1 });

  const rotor = new THREE.Group();
  const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xd8cdb2 });
  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.6), bladeMaterial);
    blade.position.y = 1.4;
    const arm = new THREE.Group();
    arm.rotation.z = (i / 6) * Math.PI * 2;
    arm.add(blade);
    rotor.add(arm);
  }
  rotor.position.set(wx, 7.1, wz - 0.6);
  scene.add(rotor);
  return rotor;
}

// Soft light streaks that scroll along the water — the creek visibly flows.
function makeFlowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = 'rgba(235, 245, 255, 0.5)';
  for (let i = 0; i < 9; i++) {
    ctx.fillRect((i * 29) % 128, (i * 11) % 28, 14 + (i % 3) * 8, 2);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 1);
  return texture;
}

function buildCreek(parts, scene) {
  // Copperhead Creek: a calm blue ribbon with a plank bridge on the west road.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(95, 5.5),
    new THREE.MeshLambertMaterial({
      color: 0x4a7fa8, transparent: true, opacity: 0.8, map: makeFlowTexture(),
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-55, 0.04, 42);
  scene.add(water);
  buildCreek.water = water; // handed back to the update loop for shimmer

  // The bridge where the hideout road crosses.
  for (let i = 0; i < 7; i++) {
    box(parts, -42, 0.12, 39.5 + i * 0.9, 3.4, 0.14, 0.7, 0x8a6f4d);
  }
  box(parts, -43.8, 0.55, 42.2, 0.12, 0.8, 6.2, 0x6e5638);
  box(parts, -40.2, 0.55, 42.2, 0.12, 0.8, 6.2, 0x6e5638);
}

// ---------- The whole environment ----------
export function buildEnvironment(scene, colliders, effects) {
  buildGround(scene);

  const parts = [];
  buildPerimeter(parts, colliders);
  buildFarHills(parts);
  buildMesa(parts, colliders);
  buildCreek(parts, scene);
  const water = buildCreek.water;
  const rotor = buildFarms(parts, colliders, scene);

  // Plugging the windmill sets it spinning like it's late for something.
  let rotorBoost = 0;
  registerTarget(rotor, {
    tag: 'windmill',
    name: 'Windmill',
    kind: 'shootable',
    onShot() {
      rotorBoost = 14;
    },
  });

  // Cacti and rocks, scattered with a fixed pattern (stable between visits),
  // kept away from roads and the town square.
  for (let i = 0; i < 34; i++) {
    const angle = i * 2.39996; // golden-angle spiral — even, natural-looking
    const radius = 30 + (i * 7.3) % 60;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.9 - 5;
    if (Math.abs(x) < 16 && Math.abs(z) < 36) continue;      // town
    if (ROADS.some((r) => inRect(x, z, r))) continue;        // roads
    if (x < -66 || (z > 52 && z < 86 && x > -28 && x < 30)) continue; // mesa & farms
    if (i % 3 === 0) {
      rock(parts, colliders, x, z, 0.7 + (i % 5) * 0.35);
    } else {
      cactus(parts, x, z, 1.5 + (i % 4) * 0.4);
    }
  }

  // Grass tufts and the odd desert flower — lush by the creek, dry and
  // sparse out in the flats. Two crossed slats each; all merged.
  for (let i = 0; i < 110; i++) {
    const angle = i * 2.39996 + 1.1;
    const radius = 18 + (i * 5.9) % 78;
    const x = Math.cos(angle) * radius - 10;
    const z = Math.sin(angle) * radius + 8;
    if (Math.abs(x) < 16 && Math.abs(z) < 36) continue;
    if (ROADS.some((r) => inRect(x, z, r))) continue;
    if (x < -66 || (z > 52 && z < 86 && x > -28 && x < 30)) continue;
    const nearCreek = z > 34 && z < 50 && x < -8;
    if (!nearCreek && i % 3 !== 0) continue; // desert stays sparse
    const grassColor = nearCreek ? 0x6f8f4a : 0xb0a068;
    const h = 0.3 + (i % 3) * 0.12;
    box(parts, x, h / 2, z, 0.06, h, 0.3, grassColor, 0.6);
    box(parts, x, h / 2, z, 0.06, h * 0.85, 0.3, grassColor, -0.7);
    if (nearCreek && i % 7 === 0) {
      const petals = [0xd96a8a, 0xe8c84a, 0x9a6ad9][i % 3];
      box(parts, x + 0.15, 0.32, z, 0.04, 0.3, 0.04, 0x5a7a3a);
      box(parts, x + 0.15, 0.5, z, 0.11, 0.09, 0.11, petals);
    }
  }

  mergeParts(scene, parts);

  // Tumbleweeds: three of them, rolling gently east, forever. Also fair
  // game for the reticle — shooting one bursts it into dust, and a fresh
  // one rolls in off the mesa a little later.
  const tumbleweeds = [];
  const weedMaterial = new THREE.MeshLambertMaterial({ color: 0x9a7b4a });
  for (let i = 0; i < 3; i++) {
    const weed = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + i * 0.12, 0), weedMaterial);
    weed.position.set(-60 + i * 25, 0.45, -20 + i * 22);
    scene.add(weed);
    registerTarget(weed, {
      tag: 'tumbleweed_' + i,
      name: 'Tumbleweed',
      kind: 'shootable',
      onShot(point) {
        weed.visible = false;
        effects.spawnPuff(point, 1.6, 0xc9ab6e);
        setTimeout(() => {
          weed.position.x = -110; // a new recruit rolls in off the mesa
          weed.visible = true;
        }, 9000);
      },
    });
    tumbleweeds.push(weed);
  }

  let shimmer = 0;

  return {
    update(dt) {
      rotor.rotation.z += dt * (0.9 + rotorBoost);
      rotorBoost *= 1 - Math.min(1, dt * 1.2); // winds back down
      if (rotorBoost < 0.05) rotorBoost = 0;

      shimmer += dt;
      water.material.opacity = 0.74 + Math.sin(shimmer * 1.7) * 0.06;
      water.material.map.offset.x -= dt * 0.045; // the creek flows west

      for (const weed of tumbleweeds) {
        if (!weed.visible) continue;
        weed.position.x += dt * 1.6;
        weed.rotation.z -= dt * 3.5;
        weed.position.y = 0.45 + Math.abs(Math.sin(weed.position.x * 0.8)) * 0.15;
        if (weed.position.x > 110) weed.position.x = -110; // round again
      }
    },
  };
}
