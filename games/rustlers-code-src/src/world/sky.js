// The sky: a gradient dome (one tiny shader), stars at night, a sun and
// moon that ride the day/night cycle, and a few lazy clouds. Everything
// here is a sprite or a single dome — pennies on the GPU.

import * as THREE from 'three';

const DAY = { top: new THREE.Color(0x5a9bd4), horizon: new THREE.Color(0xcfe0e0) };
const DUSK = { top: new THREE.Color(0x5a4a7a), horizon: new THREE.Color(0xf0a060) }; // sunset
const NIGHT = { top: new THREE.Color(0x0c1322), horizon: new THREE.Color(0x2a3550) };

// A soft radial glow texture, tinted per use (sun, moon, clouds).
function makeGlowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createSky(scene) {
  const uniforms = {
    topColor: { value: DAY.top.clone() },
    horizonColor: { value: DAY.horizon.clone() },
  };

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(185, 20, 12),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      vertexShader: `
        varying float vHeight;
        void main() {
          vHeight = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying float vHeight;
        void main() {
          float t = clamp(vHeight * 1.6, 0.0, 1.0);
          gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
        }
      `,
    })
  );
  scene.add(dome);

  // Stars: one Points cloud scattered over the upper dome, invisible by day.
  const starCount = 220;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const y = 0.18 + Math.random() * 0.8;
    const r = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(theta) * r * 170;
    positions[i * 3 + 1] = y * 170;
    positions[i * 3 + 2] = Math.sin(theta) * r * 170;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0xe8ecff, size: 1.1, transparent: true, opacity: 0,
    fog: false, depthWrite: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // The sun and the moon — big soft sprites that sink and rise with the
  // blend (so story nights get their moon too).
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('rgba(255,244,214,1)', 'rgba(255,214,140,0)'),
    transparent: true, fog: false, depthWrite: false,
  }));
  sun.scale.setScalar(34);
  scene.add(sun);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('rgba(232,238,255,1)', 'rgba(190,205,240,0)'),
    transparent: true, fog: false, depthWrite: false,
  }));
  moon.scale.setScalar(16);
  scene.add(moon);

  // Clouds: half a dozen wide soft sprites, drifting east forever.
  const cloudTexture = makeGlowTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)');
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTexture, transparent: true, fog: false, depthWrite: false,
    }));
    cloud.scale.set(50 + i * 8, 13 + (i % 3) * 4, 1);
    scene.add(cloud);
    clouds.push({
      sprite: cloud,
      offsetX: -150 + i * 55,
      y: 58 + (i % 3) * 9,
      z: -60 + (i * 37) % 130,
    });
  }

  let blendNow = 0;

  return {
    // blend: 0 = day, 1 = night — passing through a golden dusk at 0.5.
    setBlend(blend) {
      blendNow = blend;
      const a = blend < 0.5 ? DAY : DUSK;
      const b = blend < 0.5 ? DUSK : NIGHT;
      const t = blend < 0.5 ? blend * 2 : (blend - 0.5) * 2;
      uniforms.topColor.value.lerpColors(a.top, b.top, t);
      uniforms.horizonColor.value.lerpColors(a.horizon, b.horizon, t);
      starMaterial.opacity = Math.max(0, blend - 0.55) / 0.45;
    },

    // Everything here rides along with the camera so the sky never shows
    // its edges. Called once per frame.
    update(camera, dt) {
      dome.position.copy(camera.position);
      stars.position.x = camera.position.x;
      stars.position.z = camera.position.z;

      // Sun sinks as blend rises; moon does the opposite shift.
      const sunUp = 1 - Math.min(1, blendNow * 2);   // 1 at noon, 0 by dusk
      const moonUp = Math.max(0, blendNow - 0.5) * 2; // 0 until dusk, 1 at night
      sun.position.set(camera.position.x - 85, 14 + sunUp * 105, camera.position.z - 95);
      sun.material.opacity = sunUp; // slips below the ridge as dusk lands
      moon.position.set(camera.position.x + 75, 14 + moonUp * 95, camera.position.z + 80);
      moon.material.opacity = moonUp;

      for (const c of clouds) {
        c.offsetX += dt * 1.3;
        if (c.offsetX > 170) c.offsetX = -170;
        c.sprite.position.set(camera.position.x + c.offsetX, c.y, camera.position.z + c.z - 40);
        c.sprite.material.opacity = 0.5 * (1 - blendNow * 0.75);
      }
    },
  };
}
