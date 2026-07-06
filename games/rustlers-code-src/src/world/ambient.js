// The little life that makes the valley breathe: chimney smoke, hawks
// wheeling over the mesa, and the crackling campfire at the hideout.
// Cheap on purpose — a few sprites and two flickering cones.

import * as THREE from 'three';
import { registerTarget } from './targets.js';

// Chimney mouths (match the chimneyed buildings in town.js).
const CHIMNEYS = [
  [-12, 6.6, -19.75],  // the bank
  [11.75, 7.5, -19.75], // the hotel
  [-11.5, 5.6, 16.25],  // Doc's workshop
];

const _pos = new THREE.Vector3();

export function createAmbient(scene, effects) {
  // ---- Hawks: three dark gliders circling high over the west valley ----
  const hawks = [];
  const hawkMaterial = new THREE.MeshLambertMaterial({ color: 0x2e2620, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const hawk = new THREE.Group();
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.35), hawkMaterial);
      wing.position.x = side * 0.55;
      wing.rotation.z = side * 0.22;
      hawk.add(wing);
    }
    scene.add(hawk);
    registerTarget(hawk, {
      tag: 'hawk_' + i,
      name: 'Hawk',
      kind: 'living',
      refusalLine: 'Newt would never forgive me.',
    });
    hawks.push({
      group: hawk,
      angle: i * 2.1,
      radius: 22 + i * 9,
      height: 26 + i * 4,
      centerX: -35 + i * 14,
      centerZ: -10 + i * 16,
      speed: 0.14 + i * 0.03,
    });
  }

  // ---- The campfire at the hideout: two flickering flame cones + glow ----
  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.8, 6),
    new THREE.MeshLambertMaterial({ color: 0xe8823a, emissive: 0xd96a20, emissiveIntensity: 1 })
  );
  flameOuter.position.set(-45, 0.6, 30);
  scene.add(flameOuter);
  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.5, 6),
    new THREE.MeshLambertMaterial({ color: 0xffd26e, emissive: 0xffb23a, emissiveIntensity: 1 })
  );
  flameInner.position.set(-45, 0.55, 30);
  scene.add(flameInner);
  const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xff9d3a,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  fireGlow.position.set(-45, 0.9, 30);
  fireGlow.scale.setScalar(3);
  scene.add(fireGlow);

  // ---- Fireflies: tiny drifting lights by the creek and the campfire,
  // only after dark. Twelve additive sprites, nearly free. ----
  const fireflyTexture = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d').createRadialGradient(16, 16, 1, 16, 16, 16);
    g.addColorStop(0, 'rgba(226, 255, 150, 1)');
    g.addColorStop(1, 'rgba(226, 255, 150, 0)');
    const ctx = c.getContext('2d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return c;
  })());
  const fireflies = [];
  for (let i = 0; i < 12; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: fireflyTexture, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sprite.scale.setScalar(0.22);
    scene.add(sprite);
    fireflies.push({
      sprite,
      // Eight haunt the creek bank, four keep the campfire company.
      homeX: i < 8 ? -34 + i * 3.5 : -47 + (i - 8) * 1.6,
      homeZ: i < 8 ? 40 + (i % 3) : 29 + (i % 2) * 2,
      phase: i * 1.7,
    });
  }

  let smokeTimer = 0;
  let fireSmokeTimer = 0;
  let flicker = 0;
  let fireflyTime = 0;

  return {
    update(dt, nightBlend = 0) {
      // Fireflies clock on at dusk.
      fireflyTime += dt;
      const glow = Math.max(0, (nightBlend - 0.55) / 0.45);
      for (const f of fireflies) {
        f.sprite.position.set(
          f.homeX + Math.sin(fireflyTime * 0.7 + f.phase) * 1.6,
          0.8 + Math.sin(fireflyTime * 1.1 + f.phase * 2) * 0.4,
          f.homeZ + Math.cos(fireflyTime * 0.5 + f.phase) * 1.4
        );
        f.sprite.material.opacity =
          glow * (0.45 + 0.55 * Math.max(0, Math.sin(fireflyTime * 2.2 + f.phase * 3)));
      }
      // Hawks glide in lazy circles, banking into the turn.
      for (const h of hawks) {
        h.angle += h.speed * dt;
        h.group.position.set(
          h.centerX + Math.cos(h.angle) * h.radius,
          h.height + Math.sin(h.angle * 2.3) * 1.5,
          h.centerZ + Math.sin(h.angle) * h.radius
        );
        h.group.rotation.y = -h.angle;
        h.group.rotation.z = 0.25;
      }

      // Chimneys puff along contentedly.
      smokeTimer -= dt;
      if (smokeTimer <= 0) {
        smokeTimer = 0.55;
        const [x, y, z] = CHIMNEYS[Math.floor(Math.random() * CHIMNEYS.length)];
        _pos.set(x + (Math.random() - 0.5) * 0.2, y, z);
        effects.spawnSmoke(_pos, 1.1);
      }

      // The fire dances; its smoke rises.
      flicker += dt * 11;
      const f = 1 + Math.sin(flicker) * 0.18 + Math.sin(flicker * 2.7) * 0.1;
      flameOuter.scale.set(f, 1.1 - (f - 1), f);
      flameInner.scale.set(2 - f, f, 2 - f);
      fireGlow.material.opacity = 0.35 + (f - 1) * 0.8;
      fireSmokeTimer -= dt;
      if (fireSmokeTimer <= 0) {
        fireSmokeTimer = 1.3;
        _pos.set(-45, 1.3, 30);
        effects.spawnSmoke(_pos, 0.8);
      }
    },
  };
}
