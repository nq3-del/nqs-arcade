// Vane's clockwork prowlers — HORDE EDITION. On ordinary nights the
// assembly line never stops: one winds in every 6 seconds (five per half
// minute) until THIRTY walk the streets at once. At sunrise they all wind
// down where they stand. They are MACHINES — not alive — so the reticle
// locks on and a shot pops them into cogs (hard rule #1 intact: their
// "attack" is a shove and a pinched coin; no health, no blood, no game
// over — cartoon peril with a cartoon out).
//
// Perf: the entire horde is FOUR draw calls — instanced body, instanced
// eyes, instanced wind-up keys, and one Points cloud for the eye-glow.
// Per-instance matrices update each frame; the threejs-performance skill
// calls that cheap, and it is.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { registerTarget } from '../world/targets.js';
import { resolveCircle } from '../world/collision.js';
import { emit } from '../core/events.js';
import { gameState, hasItem, takeItem } from '../core/gameState.js';

const POOL_SIZE = 30;         // the owner asked for thirty. The owner gets thirty.
const SPAWN_INTERVAL = 6;     // seconds between arrivals — five per half-minute
const SHAMBLE_SPEED = 1.6;
const BONK_RANGE = 1.3;
const SEPARATION = 0.75;      // they crowd, but they don't merge
const SALVAGE = 1;            // coins of scrap per pop

const SPAWNS = [
  [-22, -32], [22, 22], [-26, 14], [20, -26], [0, 34],
  [-30, -8], [28, -4], [-12, 30], [14, -34], [-18, -14],
];

const _dir = new THREE.Vector3();
const _color = new THREE.Color();
const _dummy = new THREE.Object3D();

// A coloured box geometry ready for merging (vertex colours, like build.js).
function colorBox(x, y, z, w, h, d, colorHex, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  _color.setHex(colorHex);
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = _color.r;
    colors[i * 3 + 1] = _color.g;
    colors[i * 3 + 2] = _color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function buildTemplates() {
  const RUST = 0x5c655c;
  const COPPER = 0x9a6a3a;
  const body = mergeGeometries([
    colorBox(0, 0.35, 0, 0.4, 0.7, 0.3, RUST),
    colorBox(0, 1.05, 0, 0.62, 0.7, 0.42, RUST),
    colorBox(0, 1.3, 0, 0.66, 0.1, 0.46, COPPER),
    colorBox(0, 1.62, 0, 0.42, 0.36, 0.4, RUST),
    colorBox(0, 1.9, 0, 0.18, 0.24, 0.18, COPPER),
    colorBox(0.4, 1.0, -0.18, 0.14, 0.6, 0.16, RUST, -0.9),
    colorBox(-0.4, 1.0, -0.18, 0.14, 0.6, 0.16, RUST, -0.9),
  ], false);
  const eyes = mergeGeometries([
    colorBox(0.11, 1.64, -0.21, 0.09, 0.07, 0.03, 0x8aff9a),
    colorBox(-0.11, 1.64, -0.21, 0.09, 0.07, 0.03, 0x8aff9a),
  ], false);
  const key = mergeGeometries([
    colorBox(0, 0, 0.15, 0.08, 0.08, 0.25, COPPER),
    colorBox(0, 0, 0.3, 0.5, 0.12, 0.06, COPPER),
  ], false);
  return { body, eyes, key };
}

export function createTinMen(scene, effects, hud) {
  const templates = buildTemplates();
  const bodyMesh = new THREE.InstancedMesh(
    templates.body, new THREE.MeshLambertMaterial({ vertexColors: true }), POOL_SIZE);
  const eyesMesh = new THREE.InstancedMesh(
    templates.eyes,
    new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x4ad96a, emissiveIntensity: 0.9 }),
    POOL_SIZE);
  const keyMesh = new THREE.InstancedMesh(
    templates.key, new THREE.MeshLambertMaterial({ vertexColors: true }), POOL_SIZE);
  // Instances roam the whole town; skip per-mesh culling so none vanish.
  bodyMesh.frustumCulled = eyesMesh.frustumCulled = keyMesh.frustumCulled = false;
  // The aim raycast tests an InstancedMesh against a bounding sphere that
  // three.js computes ONCE — on the first aim, when every prowler is still
  // parked underground — and never refreshes when instances move. That
  // stale sphere made the whole horde unshootable. One generous sphere,
  // set once, covers the valley wherever they shamble; the per-instance
  // checks inside the raycast still do the precise work.
  bodyMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 250);
  scene.add(bodyMesh, eyesMesh, keyMesh);

  // One Points cloud gives every prowler its eerie glow — a single call.
  const glowPositions = new Float32Array(POOL_SIZE * 3);
  const glowGeometry = new THREE.BufferGeometry();
  glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
  const glowMaterial = new THREE.PointsMaterial({
    color: 0x6aff8a, size: 1.1, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Points(glowGeometry, glowMaterial);
  glow.frustumCulled = false;
  scene.add(glow);

  const units = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    units.push({
      active: false,
      pos: new THREE.Vector3(),
      yaw: 0,
      keySpin: i * 1.3,
      bonkCooldown: 0,
      rattleTimer: 1 + (i % 5),
    });
    glowPositions[i * 3 + 1] = -100; // parked underground until active
  }

  let saidIntro = false;
  let spawnTimer = 3;
  let spawnIndex = 0;

  function pop(unit, point) {
    unit.active = false;
    effects.spawnPuff(point, 2.2, 0xc9a86a);
    effects.spawnPuff(point, 1.2, 0x8d8d92);
    emit('audio:pop');
    gameState.money += SALVAGE;
    emit('money:changed');
  }

  // ONE registered target covers the whole horde — the raycast tells us
  // which instance was hit.
  registerTarget(bodyMesh, {
    tag: 'tinman_horde',
    name: 'Clockwork prowler',
    kind: 'shootable',
    onShot(point, hit) {
      const unit = units[hit?.instanceId];
      if (unit && unit.active) pop(unit, point);
    },
  });

  function trySpawn(cole) {
    const unit = units.find((u) => !u.active);
    if (!unit) return; // thirty on the street — the line waits
    for (let tries = 0; tries < SPAWNS.length; tries++) {
      const [sx, sz] = SPAWNS[spawnIndex % SPAWNS.length];
      spawnIndex += 1;
      const dx = cole.group.position.x - sx;
      const dz = cole.group.position.z - sz;
      if (dx * dx + dz * dz > 64) {
        unit.active = true;
        unit.pos.set(sx + (spawnIndex % 3) - 1, 0, sz + (spawnIndex % 5) - 2);
        unit.bonkCooldown = 1;
        effects.spawnPuff(unit.pos, 1.4, 0x8d8d92);
        if (!saidIntro) {
          saidIntro = true;
          hud.showSubtitle('Cole', "Wind-up prowlers. Vane's doing — Doc's patents, twisted. Not alive. Fair game.", 4.5);
        }
        return;
      }
    }
  }

  return {
    update(dt, cole, dayNight, colliders) {
      const prowlTime = dayNight.blend > 0.8 && dayNight.mode === 'cycle';

      if (prowlTime) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnTimer = SPAWN_INTERVAL;
          trySpawn(cole);
        }
      } else {
        spawnTimer = 3;
      }

      for (let i = 0; i < POOL_SIZE; i++) {
        const unit = units[i];

        if (unit.active && !prowlTime) {
          // Sunrise: every prowler winds down where it stands.
          unit.active = false;
          effects.spawnPuff(unit.pos, 1.4, 0x8d8d92);
        }

        if (!unit.active) {
          _dummy.position.set(0, -100, 0);
          _dummy.scale.setScalar(0.001);
          _dummy.rotation.set(0, 0, 0);
          _dummy.updateMatrix();
          bodyMesh.setMatrixAt(i, _dummy.matrix);
          eyesMesh.setMatrixAt(i, _dummy.matrix);
          keyMesh.setMatrixAt(i, _dummy.matrix);
          glowPositions[i * 3 + 1] = -100;
          continue;
        }

        // Shamble toward Cole...
        _dir.subVectors(cole.group.position, unit.pos);
        _dir.y = 0;
        const distance = _dir.length();
        if (distance > 0.01) {
          _dir.normalize();
          unit.pos.x += _dir.x * SHAMBLE_SPEED * dt;
          unit.pos.z += _dir.z * SHAMBLE_SPEED * dt;
          unit.yaw = Math.atan2(-_dir.x, -_dir.z);
        }
        // ...without merging into one another (a mob, not a blob)...
        for (let j = 0; j < POOL_SIZE; j++) {
          if (j === i || !units[j].active) continue;
          const ox = unit.pos.x - units[j].pos.x;
          const oz = unit.pos.z - units[j].pos.z;
          const d2 = ox * ox + oz * oz;
          if (d2 > 0.0001 && d2 < SEPARATION * SEPARATION) {
            const d = Math.sqrt(d2);
            unit.pos.x += (ox / d) * (SEPARATION - d) * 0.5;
            unit.pos.z += (oz / d) * (SEPARATION - d) * 0.5;
          }
        }
        // ...and never through walls.
        resolveCircle(unit.pos, 0.5, colliders);

        unit.rattleTimer -= dt;
        if (unit.rattleTimer <= 0) {
          unit.rattleTimer = 3 + Math.random() * 3;
          if (distance < 20) emit('audio:rattle');
        }

        // The bonk: a shove and a pinched coin.
        if (unit.bonkCooldown > 0) unit.bonkCooldown -= dt;
        if (distance < BONK_RANGE && unit.bonkCooldown <= 0 && !cole.mounted && !cole.aboard) {
          unit.bonkCooldown = 2.5;
          cole.sitting = null;
          cole.group.position.x += _dir.x * 2.4;
          cole.group.position.z += _dir.z * 2.4;
          resolveCircle(cole.group.position, 0.4, colliders);
          effects.spawnPuff(cole.group.position, 1.4);
          emit('audio:rattle');
          if (hasItem('horseshoe')) {
            // Cold iron: the prowler grabs the horseshoe instead of coins,
            // hates it, and the shoe is spent. Mabel sells more.
            takeItem('horseshoe');
            emit('audio:denied');
            hud.showSubtitle('Cole', 'It grabbed the horseshoe — cold iron, gearbox, read a book. ...Shoe’s gone, though.');
          } else if (gameState.money > 0) {
            gameState.money -= 1;
            emit('money:changed');
            hud.showSubtitle('Cole', 'Hey. It taxes. The tin thing TAXES.');
          } else {
            hud.showSubtitle('Cole', 'Nothing in the pockets, gearbox. Keep walking.');
          }
        }

        // Stamp this prowler's three instance matrices.
        unit.keySpin += dt * 3;
        _dummy.position.copy(unit.pos);
        _dummy.rotation.set(0, unit.yaw, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        bodyMesh.setMatrixAt(i, _dummy.matrix);
        eyesMesh.setMatrixAt(i, _dummy.matrix);
        // The key sits on the back and spins.
        _dummy.position.set(
          unit.pos.x - Math.sin(unit.yaw + Math.PI) * 0.25,
          unit.pos.y + 1.1,
          unit.pos.z - Math.cos(unit.yaw + Math.PI) * 0.25
        );
        _dummy.rotation.set(0, unit.yaw, unit.keySpin);
        _dummy.updateMatrix();
        keyMesh.setMatrixAt(i, _dummy.matrix);

        glowPositions[i * 3] = unit.pos.x;
        glowPositions[i * 3 + 1] = unit.pos.y + 1.64;
        glowPositions[i * 3 + 2] = unit.pos.z;
      }

      bodyMesh.instanceMatrix.needsUpdate = true;
      eyesMesh.instanceMatrix.needsUpdate = true;
      keyMesh.instanceMatrix.needsUpdate = true;
      glowGeometry.attributes.position.needsUpdate = true;
    },
  };
}
