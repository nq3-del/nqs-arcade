// The statue running gag, made real estate: as the chapters roll by, more
// golden statues of Cornelius Vane appear around town, each plaque more
// grandiose than the last (tone-and-content skill: maintain the running
// gags, never explain them). After the ending they're marked for melting.

import * as THREE from 'three';
import { on } from '../core/events.js';
import { gameState } from '../core/gameState.js';

const gold = new THREE.MeshLambertMaterial({ color: 0xd9b23a });
const stone = new THREE.MeshLambertMaterial({ color: 0xbfb8a8 });

// Where each statue appears, from which chapter, and what its plaque says.
const STATUES = [
  {
    fromChapter: 2, x: 6, z: 21.5, ry: -0.7,
    plaque: 'CORNELIUS VANE — FRIEND OF PROGRESS. Erected by popular demand. (Demand surveyed, tallied and signed: C. Vane.)',
  },
  {
    fromChapter: 3, x: -6, z: -16, ry: 0.9,
    plaque: 'CORNELIUS VANE — VISIONARY. Rendered taller than actual size, for accuracy.',
  },
  {
    fromChapter: 4, x: 6.5, z: 2.5, ry: -1.2,
    plaque: 'CORNELIUS VANE — BELOVED BY ALL. Survey of one. Margin of error: zero.',
  },
  {
    fromChapter: 4, x: -5.5, z: 16.5, ry: 0.4,
    plaque: 'CORNELIUS VANE THE MAGNIFICENT — This plaque speaks for everyone. It checked.',
  },
];

// After the ledger lands (chapter 5 = post-ending), every plaque changes.
const DECOMMISSIONED =
  'NOTICE OF REMOVAL — statue scheduled for melting. Future career: door hinges and one very fine school bell. The begonias have been informed.';

function buildMiniVane(def) {
  const group = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.4), stone);
  plinth.position.y = 0.5;
  group.add(plinth);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.55), gold);
  body.position.y = 1.75;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.4), gold);
  head.position.y = 2.7;
  group.add(head);
  const hat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), gold);
  hat.position.y = 3;
  group.add(hat);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), gold);
  arm.position.set(0.5, 2.15, 0);
  arm.rotation.z = -0.65; // gesturing grandly, as is tradition
  group.add(arm);
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.ry;
  return group;
}

export function setupStatues(ctx) {
  const { scene, town, interactions, hud } = ctx;
  const placed = new Set();

  function placeDue() {
    for (let i = 0; i < STATUES.length; i++) {
      const def = STATUES[i];
      if (placed.has(i) || gameState.chapter < def.fromChapter) continue;
      placed.add(i);
      const statue = buildMiniVane(def);
      scene.add(statue);
      town.colliders.push({
        minX: def.x - 0.75, maxX: def.x + 0.75,
        minZ: def.z - 0.75, maxZ: def.z + 0.75,
      });
      interactions.register('statue_' + i, statue, 2.4, 'Read the plaque', () => {
        const text = gameState.chapter >= 5 ? DECOMMISSIONED : def.plaque;
        hud.showSubtitle('Plaque', text, 5);
      });
    }
  }

  placeDue();
  on('quest:completed', placeDue);
}
