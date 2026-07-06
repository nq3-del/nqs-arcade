// The Steady Hand aiming system. Hold the right mouse button to aim: the
// camera tucks in over Cole's shoulder and (once Doc's watch is yours) the
// world slows down. The reticle ONLY locks onto inanimate targets — aiming
// at anything living greys it out and Cole says a dry word about it.
// That's hard rule #1, and this file is where the code enforces it.

import * as THREE from 'three';
import { gameState } from '../core/gameState.js';
import { emit } from '../core/events.js';
import { getActiveTargetObjects, findTargetFor } from '../world/targets.js';

const AIM_RANGE = 45;         // metres
const SLOWMO_SCALE = 0.35;    // how much the Steady Hand slows the world

// Cole's refusal lines — rotate through the pool so it never feels like an
// error message (tone-and-content skill). Living targets can override with
// their own line (Biscuit gets his).
const REFUSALS = [
  'Not how we do things.',
  "I don't point iron at folk.",
  'The Code says no. So do I.',
  'Never at a soul. Not once. Not now.',
];

const _raycaster = new THREE.Raycaster();
const _center = new THREE.Vector2(0, 0); // exact middle of the screen
const _candidates = [];
const _muzzle = new THREE.Vector3();
const _freePoint = new THREE.Vector3();

const RAPID_FIRE_INTERVAL = 0.22; // held trigger = a shot every beat

export function createAiming(hud, effects) {
  return {
    isAiming: false,
    timeScale: 1,        // main.js multiplies world time by this
    lockedTarget: null,
    refusalIndex: 0,
    lastDeniedTag: null, // so the refusal line fires once per target, not per frame
    autofireTimer: 0,    // spacing between rapid-fire shots

    // A shot into open scenery: the bullet kicks dust where the camera ray
    // lands (the ground, or 45 metres out). No lock needed — but this only
    // ever runs when nothing living is under the reticle.
    fireFree(cole) {
      const origin = _raycaster.ray.origin;
      const direction = _raycaster.ray.direction;
      let distance = AIM_RANGE;
      if (direction.y < -0.001) {
        distance = Math.min(distance, -origin.y / direction.y);
      }
      _freePoint.copy(direction).multiplyScalar(distance).add(origin);
      _muzzle.copy(cole.group.position);
      _muzzle.y += 1.45;
      effects.spawnTracer(_muzzle, _freePoint);
      effects.spawnFlash(_muzzle);
      effects.spawnPuff(_freePoint, 0.8);
      emit('audio:shot');
      this.autofireTimer = RAPID_FIRE_INTERVAL;
    },

    update(dt, input, camera, cole) {
      // Mouse aiming needs the pointer captured; controllers and touch don't.
      this.isAiming = input.rightMouseDown &&
        (input.isPointerLocked || input.usingGamepad || input.usingTouch);

      if (!this.isAiming) {
        this.timeScale = 1;
        this.lockedTarget = null;
        this.lastDeniedTag = null;
        hud.setReticle('hidden');
        return;
      }

      // Slow-motion is Doc's gift — no watch, no slow-mo.
      this.timeScale = gameState.hasSteadyHand ? SLOWMO_SCALE : 1;

      // One squeeze = one shot; a held trigger keeps a steady beat.
      this.autofireTimer -= dt;
      const wantFire = input.leftMousePressed ||
        (input.shootHeld && this.autofireTimer <= 0);

      // What's under the middle of the screen? Only registered targets are
      // even considered — the raycast never sees the rest of the scene.
      _raycaster.setFromCamera(_center, camera);
      _raycaster.far = AIM_RANGE;
      const hits = _raycaster.intersectObjects(getActiveTargetObjects(_candidates), true);

      this.lockedTarget = null;
      if (hits.length === 0) {
        // Open scenery: free fire is allowed (there's nothing living here).
        hud.setReticle('idle');
        this.lastDeniedTag = null;
        if (wantFire) this.fireFree(cole);
        return;
      }

      const target = findTargetFor(hits[0].object);
      if (!target) {
        hud.setReticle('idle');
        if (wantFire) this.fireFree(cole);
        return;
      }

      // ---- HARD RULE #1: living things can never be locked onto. ----
      if (target.kind === 'living') {
        hud.setReticle('denied', target.name);
        if (this.lastDeniedTag !== target.tag) {
          this.lastDeniedTag = target.tag;
          const line = target.refusalLine || REFUSALS[this.refusalIndex++ % REFUSALS.length];
          hud.showSubtitle('Cole', line);
          emit('audio:denied');
        }
        return;
      }
      this.lastDeniedTag = null;

      // A legitimate target: lock on (the lock is the aim assist).
      this.lockedTarget = target;
      hud.setReticle('locked', target.name);

      if (target.kind === 'shootable' && wantFire) {
        const hitPoint = hits[0].point;
        _muzzle.copy(cole.group.position);
        _muzzle.y += 1.45; // roughly hat height
        effects.spawnTracer(_muzzle, hitPoint);
        effects.spawnFlash(_muzzle);
        effects.spawnPuff(hitPoint, 0.9);
        emit('audio:shot');
        this.autofireTimer = RAPID_FIRE_INTERVAL;
        // The full hit rides along so instanced targets (the prowler
        // horde) can tell WHICH one was struck.
        if (target.onShot) target.onShot(hitPoint, hits[0]);
        emit('shot:' + target.tag, { tag: target.tag });
      }
    },
  };
}
