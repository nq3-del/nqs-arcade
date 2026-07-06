// Objective markers: a small golden chevron that bobs above whatever the
// story wants shot, lassoed or grabbed RIGHT NOW. Each marker owns a rule
// ("show me while this step is live and the thing isn't done") — chapters
// register them, this file just draws and bobs.

import * as THREE from 'three';

const BOB_HEIGHT = 0.3;

export function createMarkers(scene) {
  const markers = [];
  const material = new THREE.MeshBasicMaterial({
    color: 0xffd26e,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  let time = 0;

  return {
    // target: an Object3D to hover over. height: metres above its origin.
    // isActive: () => boolean — evaluated every frame.
    add(target, height, isActive) {
      const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), material);
      chevron.rotation.x = Math.PI; // point DOWN at the thing
      chevron.visible = false;
      scene.add(chevron);
      markers.push({ chevron, target, height, isActive, phase: markers.length * 1.3 });
    },

    update(dt) {
      time += dt;
      for (const m of markers) {
        const show = m.isActive();
        m.chevron.visible = show;
        if (!show) continue;
        m.chevron.position.set(
          m.target.position.x,
          m.target.position.y + m.height + Math.sin(time * 2.4 + m.phase) * BOB_HEIGHT,
          m.target.position.z
        );
        m.chevron.rotation.y = time * 1.5;
      }
    },
  };
}
