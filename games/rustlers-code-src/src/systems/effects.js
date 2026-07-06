// Small visual effects: dust puffs, shot tracers, and spinning signs.
// Everything is pooled and reused — nothing is created during play
// (per threejs-performance skill: no `new` in the frame loop).

import * as THREE from 'three';

const PUFF_COUNT = 10;

function makePuffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(235, 220, 190, 0.9)');
  g.addColorStop(1, 'rgba(235, 220, 190, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createEffects(scene) {
  // --- Dust puff pool ---
  const puffTexture = makePuffTexture();
  const puffs = [];
  for (let i = 0; i < PUFF_COUNT; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: puffTexture, transparent: true, depthWrite: false })
    );
    sprite.visible = false;
    scene.add(sprite);
    puffs.push({ sprite, life: 0 });
  }

  // --- Tracer pool (thin bright lines from Cole to the hit point) ---
  const tracers = [];
  for (let i = 0; i < 4; i++) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xfff0b0, transparent: true })
    );
    line.visible = false;
    scene.add(line);
    tracers.push({ line, life: 0 });
  }

  // --- Muzzle flashes: a hot little spark at the barrel, gone in a blink ---
  const flashes = [];
  for (let i = 0; i < 3; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: puffTexture,
      color: 0xffe9a0,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    sprite.visible = false;
    scene.add(sprite);
    flashes.push({ sprite, life: 0 });
  }

  // --- Things given a decaying spin (the practice sign, the weathervane) ---
  const spinners = [];

  return {
    // color tints the puff (dust is sandy by default; pass a grey for
    // smoke, orange for fire-sparks). life stretches how long it lingers.
    spawnPuff(position, size = 1, color = 0xffffff, life = 0.45) {
      const p = puffs.find((x) => x.life <= 0) || puffs[0];
      p.life = life;
      p.maxLife = life;
      p.sprite.visible = true;
      p.sprite.position.copy(position);
      p.sprite.scale.setScalar(0.5 * size);
      p.sprite.material.opacity = 0.9;
      p.sprite.material.color.setHex(color);
      p.baseSize = size;
      p.rise = 0;
      return p;
    },

    // Smoke drifts upward as it fades; regular dust just hangs.
    spawnSmoke(position, size = 1) {
      const p = this.spawnPuff(position, size, 0x8d8d92, 1.6);
      p.rise = 1.2;
    },

    spawnFlash(position) {
      const f = flashes.find((x) => x.life <= 0) || flashes[0];
      f.life = 0.07;
      f.sprite.visible = true;
      f.sprite.position.copy(position);
      f.sprite.scale.setScalar(0.55);
      f.sprite.material.opacity = 1;
    },

    spawnTracer(from, to) {
      const t = tracers.find((x) => x.life <= 0) || tracers[0];
      t.life = 0.12;
      t.line.visible = true;
      const pos = t.line.geometry.attributes.position;
      pos.setXYZ(0, from.x, from.y, from.z);
      pos.setXYZ(1, to.x, to.y, to.z);
      pos.needsUpdate = true;
      t.line.material.opacity = 1;
    },

    // Give an object a spin that winds down on its own (fun shot feedback).
    addSpin(object3D, speed, axis = 'y') {
      spinners.push({ object: object3D, speed, axis });
    },

    update(dt) {
      for (const p of puffs) {
        if (p.life > 0) {
          p.life -= dt;
          p.sprite.material.opacity = Math.max(0, p.life / (p.maxLife || 0.45)) * 0.9;
          p.sprite.scale.addScalar(dt * 2.2 * (p.baseSize || 1));
          if (p.rise) p.sprite.position.y += p.rise * dt;
          if (p.life <= 0) {
            p.sprite.visible = false;
            p.rise = 0;
          }
        }
      }
      for (const t of tracers) {
        if (t.life > 0) {
          t.life -= dt;
          t.line.material.opacity = Math.max(0, t.life / 0.12);
          if (t.life <= 0) t.line.visible = false;
        }
      }
      for (const f of flashes) {
        if (f.life > 0) {
          f.life -= dt;
          f.sprite.material.opacity = Math.max(0, f.life / 0.07);
          if (f.life <= 0) f.sprite.visible = false;
        }
      }
      for (let i = spinners.length - 1; i >= 0; i--) {
        const s = spinners[i];
        s.object.rotation[s.axis] += s.speed * dt;
        s.speed *= 1 - Math.min(1, dt * 1.5); // wind down
        if (Math.abs(s.speed) < 0.05) spinners.splice(i, 1);
      }
    },
  };
}
