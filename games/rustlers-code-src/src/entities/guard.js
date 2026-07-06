// Vane's lantern men: hired to hold lanterns and look stern. They walk a
// patrol route and, when the chapter says stealth matters, spot Cole if he
// strolls into their lantern light. Getting spotted is never combat — it's
// a firm, comedic walk to the street (tone-and-content skill: peril is
// cartoonish and always has an out).

import * as THREE from 'three';
import { createNpc } from './npc.js';

const WALK_SPEED = 1.6;
const SPOT_DISTANCE = 7;
const SPOT_ANGLE = 0.75; // radians each side of where the guard is facing

const _toCole = new THREE.Vector3();

export function createGuard(scene, id, points) {
  const npc = createNpc(scene, {
    id,
    name: 'Lantern Man',
    color: '6e2f2f',
    hat: '2a1c0c',
    x: points[0][0],
    z: points[0][1],
  });

  // The lantern: a warm glowing box swinging from one hand.
  const lantern = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.22, 0.16),
    new THREE.MeshLambertMaterial({ color: 0xffc873, emissive: 0xff9d3a, emissiveIntensity: 0.9 })
  );
  lantern.position.set(0.45, 0.85, 0);
  npc.group.add(lantern);

  return {
    npc,
    points,
    nextPoint: 1,
    facing: 0,
    cooldown: 0, // grace period after a catch so it can't double-fire

    // active = does being seen matter right now (chapter decides).
    // onSpotted fires once when Cole is caught in the light.
    update(dt, colePosition, active, onSpotted) {
      const pos = this.npc.group.position;

      // March between waypoints, turning to face the way we're going.
      const [tx, tz] = this.points[this.nextPoint];
      const dx = tx - pos.x;
      const dz = tz - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.3) {
        this.nextPoint = (this.nextPoint + 1) % this.points.length;
      } else {
        pos.x += (dx / dist) * WALK_SPEED * dt;
        pos.z += (dz / dist) * WALK_SPEED * dt;
        this.facing = Math.atan2(-dx, -dz);
        // Guards steer their own facing — keep the npc idle sway only.
        this.npc.baseYaw = this.facing;
        this.npc.group.rotation.y = this.facing;
      }
      this.npc.swayTimer += dt;
      this.npc.torso.rotation.z = Math.sin(this.npc.swayTimer * 1.1) * 0.03;

      if (this.cooldown > 0) this.cooldown -= dt;
      if (!active || this.cooldown > 0) return;

      // The lantern light: close enough AND roughly in front.
      _toCole.copy(colePosition).sub(pos);
      _toCole.y = 0;
      if (_toCole.length() > SPOT_DISTANCE) return;
      const angleToCole = Math.atan2(-_toCole.x, -_toCole.z);
      const diff = Math.abs(Math.atan2(Math.sin(angleToCole - this.facing), Math.cos(angleToCole - this.facing)));
      if (diff < SPOT_ANGLE) {
        this.cooldown = 3;
        onSpotted();
      }
    },
  };
}
