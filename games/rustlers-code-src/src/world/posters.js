// The ten collectible wanted posters — each one a background gag pinned
// somewhere in the valley. Reading one adds it to the journal (J). Find all
// ten and the ending gains a small bonus scene.

import * as THREE from 'three';
import postersData from '../data/posters.json';
import { gameState, saveGame } from '../core/gameState.js';
import { emit } from '../core/events.js';

export function buildPosters(scene, interactions, hud) {
  const paper = new THREE.MeshLambertMaterial({ color: 0xe8dbb5 });
  const wood = new THREE.MeshLambertMaterial({ color: 0x6e5638 });

  for (const def of postersData) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), wood);
    post.position.set(def.x, 0.95, def.z);
    scene.add(post);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), paper);
    sheet.position.set(def.x, 1.45, def.z + 0.08);
    scene.add(sheet);

    // Always readable — a poster on a wall doesn't stop being a poster
    // once you've seen it. It only COUNTS (journal, bonus) the first time.
    interactions.register(
      def.id, post, 2.2,
      'Read the wanted poster',
      () => {
        hud.showSubtitle('Wanted Poster', def.text, 5);
        if (!gameState.posters.includes(def.id)) {
          gameState.posters.push(def.id);
          emit('poster:collected', { id: def.id, count: gameState.posters.length });
          saveGame();
        }
      }
    );
  }
}

export function posterText(id) {
  return postersData.find((p) => p.id === id)?.text || '';
}

export const POSTER_TOTAL = postersData.length;
