// Three chickens pecking around outside the stable. They exist for two
// reasons: the town should feel alive, and the game needs living creatures
// nearby to PROVE the reticle refuses to lock onto them (hard rule #1).

import * as THREE from 'three';
import { registerTarget } from '../world/targets.js';
import { emit } from '../core/events.js';

const PEN_RADIUS = 3.5;
const FLEE_DISTANCE = 2.2;

export function createChickens(scene, centerX, centerZ) {
  const white = new THREE.MeshLambertMaterial({ color: 0xf2ede2 });
  const red = new THREE.MeshLambertMaterial({ color: 0xc84b3a });
  const orange = new THREE.MeshLambertMaterial({ color: 0xe0913d });

  const chickens = [];
  for (let i = 0; i < 3; i++) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.3), white);
    body.position.y = 0.18;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), white);
    head.position.set(0, 0.36, -0.14);
    group.add(head);

    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.08), red);
    comb.position.set(0, 0.45, -0.14);
    group.add(comb);

    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.06), orange);
    beak.position.set(0, 0.35, -0.22);
    group.add(beak);

    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x1d1712 });
    for (const side of [-0.05, 0.05]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.02), eyeMaterial);
      eye.position.set(side, 0.38, -0.19);
      group.add(eye);
    }

    group.position.set(
      centerX + (i - 1) * 1.2,
      0,
      centerZ + (i % 2) * 1.5
    );
    scene.add(group);

    registerTarget(group, {
      tag: 'chicken_' + i,
      name: 'Chicken',
      kind: 'living',
      refusalLine: "That bird's done nothing to me.",
    });

    chickens.push({
      group,
      head,
      homeX: group.position.x,
      homeZ: group.position.z,
      // Offset the timers so the three birds don't move in unison.
      timer: i * 1.7,
      heading: i * 2.1,
    });
  }

  return {
    update(dt, colePosition) {
      for (const c of chickens) {
        c.timer += dt;
        // A person barreling in scatters the flock, with commentary.
      if (colePosition) {
        const dx = c.group.position.x - colePosition.x;
        const dz = c.group.position.z - colePosition.z;
        if (dx * dx + dz * dz < FLEE_DISTANCE * FLEE_DISTANCE) {
          c.heading = Math.atan2(dx, dz); // directly away, feathers first
          c.group.position.x += Math.sin(c.heading) * dt * 2.4;
          c.group.position.z += Math.cos(c.heading) * dt * 2.4;
          c.group.rotation.y = c.heading;
          if (c.squawkCooldown === undefined || c.squawkCooldown <= 0) {
            c.squawkCooldown = 2.5;
            emit('audio:cluck');
          }
        }
      }
      if (c.squawkCooldown > 0) c.squawkCooldown -= dt;

      // Peck: the head bobs down sharply every couple of seconds.
        const peck = Math.max(0, Math.sin(c.timer * 3.1));
        c.head.position.y = 0.36 - peck * 0.12;

        // Wander: drift a few steps, turn, repeat — never leaving the pen.
        if (Math.sin(c.timer * 0.5) > 0.3) {
          c.group.position.x += Math.sin(c.heading) * dt * 0.4;
          c.group.position.z += Math.cos(c.heading) * dt * 0.4;
          c.group.rotation.y = Math.atan2(Math.sin(c.heading), Math.cos(c.heading));
        } else if (Math.sin(c.timer * 0.5) < -0.8) {
          c.heading += dt * 2;
        }
        // Gentle pull back toward home so nobody escapes to the mesa.
        const dx = c.homeX - c.group.position.x;
        const dz = c.homeZ - c.group.position.z;
        if (dx * dx + dz * dz > PEN_RADIUS * PEN_RADIUS) {
          c.group.position.x += dx * dt * 0.3;
          c.group.position.z += dz * dt * 0.3;
        }
      }
    },
  };
}
