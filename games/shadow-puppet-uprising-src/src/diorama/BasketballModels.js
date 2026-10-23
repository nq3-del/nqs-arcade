import * as THREE from 'three';
import { STADIUM_HOOPS } from '../data/basketball.js';
import { FOOTBALL_GOALS } from './SportsCollisions.js';

export function buildFootballGoals(v) {
  for (const { x, z, back, height } of FOOTBALL_GOALS) {
    for (const side of [-1, 1]) v.cylinder(x, height / 2, z + side * 3, 0.1, 0.1, height, '#f0e6c9');
    v.box(x, height, z, 0.2, 0.2, 6.2, '#f0e6c9', v.root, 0.07);
    for (let row = 0; row <= 6; row++) {
      const y = row * height / 6;
      v.tube([[x, y, z - 3], [back, y, z - 3], [back, y, z + 3], [x, y, z + 3]], 0.012, '#d6e8d9');
    }
    for (let col = -3; col <= 3; col += 0.5)
      v.tube([[back, 0.3, z + col], [back, height, z + col], [x, height, z + col]], 0.012, '#d6e8d9');
  }
}

export function buildBasketball(v, x, y, z, flaming = false) {
  const root = v.group(x, y, z);
  const ball = v.mesh(new THREE.SphereGeometry(0.3, 28, 20), '#e57924', root, { roughness: 0.95 });
  ball.name = 'orange-basketball';
  for (const [rx, ry] of [[0, 0], [Math.PI / 2, 0], [0, Math.PI / 2]]) {
    const seam = v.mesh(new THREE.TorusGeometry(0.299, 0.009, 5, 64), '#251c18', root);
    seam.rotation.set(rx, ry, 0);
    seam.name = 'basketball-seam';
  }
  root.name = 'basketball';
  if (flaming) {
    root.name = 'flaming-basketball';
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI * 2 / 10, color = i % 2 ? '#ff351c' : '#168fff';
      const flame = v.mesh(new THREE.ConeGeometry(0.15, 0.8 + (i % 3) * 0.18, 4), color, root,
        { emissive: color, emissiveIntensity: 1.4, transparent: true, opacity: 0.85, depthWrite: false });
      flame.position.set(Math.cos(angle) * 0.22, 0.35, Math.sin(angle) * 0.22);
      flame.rotation.z = -Math.cos(angle) * 0.3;
    }
  }
  return root;
}

export function buildBasketballFire(v, x, z, radius) {
  const root = v.group(x, 0.35, z), flames = [];
  const disk = v.mesh(new THREE.CircleGeometry(radius, 48), '#ef4b21', root,
    { emissive: '#e42616', emissiveIntensity: 0.6, transparent: true, opacity: 0.24, depthWrite: false });
  disk.rotation.x = -Math.PI / 2; disk.castShadow = false;
  v.ring(0, 0.03, 0, radius, '#ff6c2e', root);
  for (let i = 0; i < 25; i++) {
    const angle = i * 2.39996, r = Math.sqrt((i + 0.5) / 25) * radius * 0.9;
    const color = i % 2 ? '#ff4a23' : '#1c9eff';
    const flame = v.mesh(new THREE.ConeGeometry(0.19, 0.65 + i % 3 * 0.18, 4), color, root,
      { emissive: color, emissiveIntensity: 1.3, transparent: true, opacity: 0.8, depthWrite: false });
    flame.position.set(Math.cos(angle) * r, 0.4, Math.sin(angle) * r);flames.push(flame);
  }
  const flash = v.mesh(new THREE.SphereGeometry(1, 18, 12), '#47cfff', root,
    { emissive: '#ff5635', emissiveIntensity: 2, transparent: true, opacity: 0.35, depthWrite: false });
  flash.position.y = 1.3;
  root.userData.flames = flames; root.userData.flash = flash;root.name='basketball-fire-area';
  return root;
}

export function buildBasketballCourts(v) {
  for (const { x, y, z, radius } of STADIUM_HOOPS) {
    v.box(x, 0.3, 9, 6, 0.05, 8, '#c38a68');
    for (const side of [-1, 1]) v.box(x + side * 2.85, 0.34, 9, 0.05, 0.025, 7.8, '#f5e4c8');
    v.box(x, 0.34, 12.85, 5.7, 0.025, 0.05, '#f5e4c8');
    v.ring(x, 0.35, 10.1, 1.25, '#f5e4c8');
    v.cylinder(x, 2.2, z - 1.15, 0.09, 0.12, 4.4, '#cadad6');
    v.box(x, y + 0.5, z - 1.05, 2.4, 1.5, 0.16, '#e8efe8');
    for (const side of [-1, 1]) {
      v.box(x + side * 0.47, y + 0.32, z - 0.95, 0.04, 0.65, 0.025, '#db6638');
      v.box(x, y + 0.32 + side * 0.325, z - 0.95, 0.98, 0.04, 0.025, '#db6638');
    }
    v.box(x, y, z - 0.88, 0.2, 0.09, 0.35, '#d8783a');
    v.ring(x, y, z, radius, '#e87932');
    // Open woven net: there is no invisible disk across the rim.
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      for (const direction of [-1, 1]) {
        const points = [];
        for (let row = 0; row <= 4; row++) {
          const r = radius * (1 - row * 0.105), a = angle + direction * row * Math.PI / 12;
          points.push([x + Math.cos(a) * r, y - row * 0.19, z + Math.sin(a) * r]);
        }
        v.tube(points, 0.013, '#f5f0db');
      }
    }
  }
}

export function buildFootball(v, x, y, z, flaming = false) {
  const root = buildBasketball(v, x, y, z, flaming);
  for (const mesh of [...root.children]) if (['orange-basketball','basketball-seam'].includes(mesh.name)) {
    root.remove(mesh); mesh.geometry.dispose();
  }
  v.mesh(new THREE.SphereGeometry(.3,32,24),'#faf9ed',root);
  const phi=(1+Math.sqrt(5))/2;
  for (const a of [-1,1]) for (const b of [-phi,phi]) for (const xyz of [[0,a,b],[a,b,0],[b,0,a]]) {
    const normal=new THREE.Vector3(...xyz).normalize();
    const panel=v.mesh(new THREE.CircleGeometry(.085,5),'#242b30',root);
    panel.position.copy(normal.clone().multiplyScalar(.299));
    panel.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
  }
  root.name=flaming?'flaming-football':'football';
  return root;
}

export function buildLeBron(v, curry = false, vini = false) {
  const root = v.group(), body = v.group(0, 0, 0, root);
  const rig = { legs: [], arms: [], stalks: [] };
  const skin = vini ? '#75482e' : curry ? '#bc845a' : '#795033', yellow = vini ? '#f6f5ed' : curry ? '#2461c6' : '#f7bd27', purple = vini ? '#243977' : curry ? '#ffd141' : '#63318a', hair = '#221b18';
  v.box(0, 1.47, 0, 0.9, 0.95, 0.48, yellow, body);
  v.box(0, 1.91, 0.1, 0.4, 0.12, 0.43, purple, body);
  v.box(0, 0.99, 0, 0.93, 0.14, 0.5, purple, body);
  v.cylinder(0, 2.02, 0, 0.16, 0.18, 0.26, skin, body);
  v.sphere(0, 2.35, 0, 0.36, 0.44, 0.33, skin, body);
  v.sphere(0, 2.65, -0.045, 0.35, 0.14, 0.31, hair, body);
  if (!vini) v.sphere(0, 2.15, 0.13, curry ? 0.23 : 0.31, curry ? 0.15 : 0.22, 0.24, hair, body);
  if (vini) for (let i=0;i<10;i++) v.sphere(Math.sin(i*2.4)*.25,2.72+(i%3)*.025,Math.cos(i*2.4)*.2,.09,.1,.09,hair,body);
  v.box(0, 2.27, 0.328, 0.27, 0.085, 0.06, skin, body, 0.02);
  v.box(0, 2.2, 0.36, 0.2, 0.033, 0.025, hair, body, 0.005);
  v.sphere(0, 2.35, 0.32, 0.085, 0.11, 0.095, skin, body);
  for (const side of [-1, 1]) {
    v.sphere(side * 0.36, 2.34, 0, 0.07, 0.13, 0.09, skin, body);
    v.box(side * 0.14, 2.43, 0.306, 0.15, 0.045, 0.035, '#f4ede3', body, 0.005);
    v.box(side * 0.13, 2.43, 0.328, 0.065, 0.047, 0.02, '#201b18', body, 0.005);
    v.box(side * 0.14, 2.51, 0.294, 0.18, 0.04, 0.035, hair, body, 0.005);
    v.box(side * 0.44, 1.45, 0, 0.055, 0.88, 0.49, purple, body, 0.01);
    const leg = v.group(side * 0.24, 0.93, 0, body); rig.legs.push(leg);
    v.box(0, -0.12, 0, 0.43, 0.42, 0.48, yellow, leg);
    v.box(side * 0.17, -0.14, 0, 0.065, 0.4, 0.49, purple, leg, 0.01);
    v.cylinder(0, -0.46, 0, 0.13, 0.1, 0.45, skin, leg);
    v.box(0, vini ? -0.63 : -0.72, 0, 0.19, vini ? 0.43 : 0.24, 0.23, '#f8f2dc', leg);
    v.box(0, -0.87, 0.09, 0.3, 0.19, 0.49, purple, leg);
    v.box(0, -0.95, 0.09, 0.32, 0.055, 0.51, '#f8f2dc', leg, 0.015);
    const arm = v.group(side * 0.57, 1.84, 0, body); rig.arms.push(arm);
    v.sphere(0, -0.1, 0, 0.19, 0.25, 0.2, skin, arm);
    v.cylinder(0, -0.39, 0, 0.15, 0.12, 0.51, !vini && side === -1 ? '#eee9e1' : skin, arm);
    v.sphere(0, -0.7, 0.02, 0.15, 0.19, 0.14, skin, arm);
    if (vini) {
      v.box(0,-.12,0,.36,.3,.38,yellow,arm);
      v.cylinder(-side*.08,-.94,.02,.035,.035,.29,skin,arm);
      v.box(side*.14,-.72,.05,.12,.065,.08,skin,arm,.02);
    }
  }
  // Reuse a single jersey texture across toggles and scene changes.
  const jerseyKey = vini ? 'viniJerseyMaterial' : curry ? 'curryJerseyMaterial' : 'lebronJerseyMaterial';
  if (!v[jerseyKey]) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = yellow; ctx.fillRect(0, 0, 256, 256);
    ctx.textAlign = 'center'; ctx.fillStyle = purple;
    ctx.font = 'bold 36px Arial'; ctx.fillText(vini ? 'VINI JR.' : curry ? 'CURRY' : 'JAMES', 128, 55);
    ctx.font = 'bold 150px Arial'; ctx.strokeStyle = '#fff4d1'; ctx.lineWidth = 7;
    ctx.strokeText(vini ? '7' : curry ? '30' : '23', 128, 205); ctx.fillText(vini ? '7' : curry ? '30' : '23', 128, 205);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    v[jerseyKey] = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
  }
  for (const side of [-1, 1]) {
    const number = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.69), v[jerseyKey]);
    number.position.set(0, 1.49, side * 0.249); number.rotation.y = side < 0 ? Math.PI : 0;
    body.add(number);
  }
  v.bake(body, [...rig.legs, ...rig.arms]);
  for (const limb of [...rig.legs, ...rig.arms]) v.bake(limb);
  const scale = vini ? 0.85 : curry ? 0.87 : 0.95;
  root.scale.setScalar(scale);
  const model = { root, body, rig, kind: vini ? 'vini-jr' : curry ? 'steph-curry' : 'lebron-james', baseScale: scale };
  root.userData.actor = model; v.actors.push(model);
  return model;
}
