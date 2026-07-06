// The lasso. While aiming at a 'lassoable' target, press F: a rope whips
// out from Cole, and the target gets tugged (each target decides what a
// tug does — slide, topple, swing open). Rope is a simple sagging line.

import * as THREE from 'three';
import { emit } from '../core/events.js';

const ROPE_SEGMENTS = 12;
const THROW_TIME = 0.5; // seconds the rope stays visible

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _box = new THREE.Box3();
const _mid = new THREE.Vector3();

export function createLasso(scene) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array((ROPE_SEGMENTS + 1) * 3), 3)
  );
  const rope = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xc9a86a, transparent: true })
  );
  rope.visible = false;
  scene.add(rope);

  return {
    timer: 0,
    target: null,

    // Called by main.js when F is pressed while a lassoable target is locked.
    throwAt(cole, target) {
      this.timer = THROW_TIME;
      this.target = target;
      _from.copy(cole.group.position);
      _from.y += 1.5;
      _box.setFromObject(target.object);
      _box.getCenter(_to);
      this.updateRope(1);
      rope.visible = true;
      rope.material.opacity = 1;
      emit('audio:lasso');
      if (target.onLasso) target.onLasso();
      emit('lasso:' + target.tag, { tag: target.tag });
    },

    // Lay the rope points out along a curve with a bit of sag in the middle.
    updateRope(sag) {
      const pos = rope.geometry.attributes.position;
      for (let i = 0; i <= ROPE_SEGMENTS; i++) {
        const t = i / ROPE_SEGMENTS;
        _mid.lerpVectors(_from, _to, t);
        _mid.y -= Math.sin(t * Math.PI) * 0.6 * sag;
        pos.setXYZ(i, _mid.x, _mid.y, _mid.z);
      }
      pos.needsUpdate = true;
    },

    update(dt) {
      if (this.timer > 0) {
        this.timer -= dt;
        rope.material.opacity = Math.max(0, this.timer / THROW_TIME);
        if (this.timer <= 0) {
          rope.visible = false;
          this.target = null;
        }
      }
    },
  };
}
