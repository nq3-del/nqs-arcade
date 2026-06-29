// ═══════════════════════════════════════════════════════
// DIARY OF A WONKY ACORN — Three.js 3D browser game
// Loads the real Pico model, third-person camera,
// keyboard + gamepad controls.
// ═══════════════════════════════════════════════════════

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── Loading UI ───────────────────────────────────────
const loadingEl = document.getElementById('loading');
const barFill = document.getElementById('bar-fill');
const statusEl = document.getElementById('loading-status');
const hudEl = document.getElementById('hud');
function setLoading(pct, msg) {
  if (barFill) barFill.style.width = pct + '%';
  if (msg && statusEl) statusEl.textContent = msg;
}

function showFatalError(message, hint) {
  if (statusEl) statusEl.innerHTML = '<strong style="color:#FF5252">' + message + '</strong>' + (hint ? '<br><br><span style="font-weight:normal;color:rgba(255,255,255,0.7)">' + hint + '</span>' : '');
  if (barFill) {
    barFill.style.width = '100%';
    barFill.style.background = 'linear-gradient(90deg,#E53935,#B71C1C)';
  }
}

// File:// detection — Chrome/Safari can't fetch local GLB/font assets reliably
if (location.protocol === 'file:') {
  showFatalError(
    'This game must be opened through a web server.',
    'Open Terminal in this folder and run:<br><code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px">python3 -m http.server 8765</code><br>Then visit <code>http://localhost:8765/</code>'
  );
  throw new Error('file:// protocol not supported');
}

// WebGL availability check — fail gracefully instead of cryptic console error
{
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
  if (!gl) {
    showFatalError(
      'WebGL is not available in this browser.',
      'Try enabling hardware acceleration in your browser settings, or open the game in Chrome or Safari.'
    );
    throw new Error('No WebGL support');
  }
}

setLoading(8, 'Setting up the world…');

// ─── Renderer ─────────────────────────────────────────
const canvas = document.getElementById('renderCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ─── Scene ────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
// Fog colour matches the sky bottomColor so the horizon blends seamlessly
scene.fog = new THREE.Fog(0xCDE7F5, 50, 140);

// ─── Sky (gradient via vertex colors on inverted sphere) ──
{
  const skyGeo = new THREE.SphereGeometry(200, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x3C8DD9) },
      bottomColor: { value: new THREE.Color(0xCDE7F5) },
      offset: { value: 33 },
      exponent: { value: 0.7 }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -1;  // draw first
  sky.frustumCulled = false;
  scene.add(sky);
}

// ─── Lighting ─────────────────────────────────────────
const hemi = new THREE.HemisphereLight(0xddeeff, 0x4a5a30, 0.7);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4dd, 1.5);
sun.position.set(15, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 150;
// Expanded to cover the 100×100 world plus margin (trees go out to ±30)
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
sun.shadow.bias = -0.0005;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

// ─── Ground ───────────────────────────────────────────
// Flat plane, 1x1 segments — wasted vertex shading on subdivided flat geo
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x5C9A47,
  roughness: 0.95,
  metalness: 0.0
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grass bumps (squashed spheres sitting ON the ground, not buried under it)
const grassMat = new THREE.MeshStandardMaterial({ color: 0x73B056, roughness: 0.9 });
for (let i = 0; i < 50; i++) {
  const sz = 0.4 + Math.random() * 0.6;
  const bump = new THREE.Mesh(new THREE.SphereGeometry(sz, 10, 8), grassMat);
  bump.scale.y = 0.35;
  // Place so bottom of squashed sphere touches y=0 — visible nub above ground
  bump.position.set((Math.random() - 0.5) * 80, sz * 0.35 * 0.5, (Math.random() - 0.5) * 80);
  bump.castShadow = true;
  bump.receiveShadow = true;
  scene.add(bump);
}

// Trees
function makeTree(x, z) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4A2E1A, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2E6B22, roughness: 0.85 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 2.4, 12), trunkMat);
  trunk.position.set(x, 1.2, z);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  const leaves1 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 12), leafMat);
  leaves1.position.set(x, 3.0, z);
  leaves1.castShadow = true;
  scene.add(leaves1);

  const leaves2 = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 12), leafMat);
  leaves2.position.set(x + 0.4, 3.6, z + 0.2);
  leaves2.castShadow = true;
  scene.add(leaves2);

  const leaves3 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 10), leafMat);
  leaves3.position.set(x - 0.3, 3.8, z - 0.25);
  leaves3.castShadow = true;
  scene.add(leaves3);
}
const treePositions = [
  [-15, -8], [12, -12], [-20, 5], [18, 8], [-8, -22],
  [22, -3], [-25, -15], [5, 18], [-12, 15], [25, 18],
  [-30, -2], [30, 12], [-3, -30], [10, -25]
];
treePositions.forEach(p => makeTree(p[0], p[1]));
// Collision colliders for trees — Pico can't walk through trunks
// Radius is bigger than the trunk (~0.45) because the leaf canopy
// is wide and it feels wrong to walk under it. 1.5 = full canopy stop.
const TREE_COLLIDE_RADIUS = 1.4;
const treeColliders = treePositions.map(p => ({ x: p[0], z: p[1], r: TREE_COLLIDE_RADIUS }));

// Flowers (random sprinkles of color)
const flowerColors = [0xFF6B9D, 0xFFD93D, 0xFFFFFF, 0xFFA500, 0xE040FB, 0xFF5252];
const stemMat = new THREE.MeshStandardMaterial({ color: 0x2E6B22, roughness: 0.9 });
for (let i = 0; i < 60; i++) {
  const x = (Math.random() - 0.5) * 80;
  const z = (Math.random() - 0.5) * 80;
  // Skip if too close to center (Pico's spawn)
  if (Math.hypot(x, z) < 3) continue;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), stemMat);
  stem.position.set(x, 0.15, z);
  scene.add(stem);

  const petalMat = new THREE.MeshStandardMaterial({
    color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
    roughness: 0.5
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), petalMat);
  head.position.set(x, 0.35, z);
  scene.add(head);
}

// Mushrooms (red with white spots vibe — small + cute)
const mushStemMat = new THREE.MeshStandardMaterial({ color: 0xFFF8E1, roughness: 0.85 });
const mushCapMat = new THREE.MeshStandardMaterial({ color: 0xE53935, roughness: 0.6 });
for (let i = 0; i < 15; i++) {
  const x = (Math.random() - 0.5) * 70;
  const z = (Math.random() - 0.5) * 70;
  if (Math.hypot(x, z) < 4) continue;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 8), mushStemMat);
  stem.position.set(x, 0.11, z);
  stem.castShadow = true;
  scene.add(stem);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), mushCapMat);
  cap.position.set(x, 0.25, z);
  cap.castShadow = true;
  scene.add(cap);
}

// ═══════════════════════════════════════════════════════
// CITY BACKDROP — distant buildings ringing the playable area
// per SCRIPT.md: family moves to a CITY, not a meadow
// ═══════════════════════════════════════════════════════
(function buildCityRing() {
  const buildingColors = [0x6B7A8A, 0x9C8F7E, 0xC4B198, 0x7E8B97, 0x5F6973, 0xA48E76, 0x88959E];
  const facadeMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  // Tall slabs spread in a wide circle ~70m out, far enough that the meadow looks like a city park
  const RADIUS = 70;
  const COUNT = 26;
  for (let i = 0; i < COUNT; i++) {
    const angle = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const r = RADIUS + (Math.random() - 0.5) * 10;
    const cx = Math.cos(angle) * r;
    const cz = Math.sin(angle) * r;
    // Random building dimensions — keeps the skyline varied
    const bw = 5 + Math.random() * 9;
    const bd = 5 + Math.random() * 9;
    const bh = 8 + Math.random() * 22;
    const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
    const building = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), facadeMat(color));
    building.position.set(cx, bh / 2, cz);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    // Tiny "windows" — sprinkle of dark + glowing rectangles on the front-facing side
    const winCount = Math.floor(bh / 1.4) * Math.floor(bw / 1.4);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x1a2030,
      emissive: 0xFFE085,
      emissiveIntensity: 0.5
    });
    for (let w = 0; w < winCount; w++) {
      const wx = (Math.random() - 0.5) * (bw - 0.8);
      const wy = (Math.random() - 0.5) * (bh - 1.4);
      const facingOut = new THREE.Vector3(cx, 0, cz).normalize();
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.85), winMat);
      win.position.set(
        cx - facingOut.x * (bd * 0.5 + 0.02) + (-facingOut.z) * wx,
        bh / 2 + wy,
        cz - facingOut.z * (bd * 0.5 + 0.02) + facingOut.x * wx
      );
      win.lookAt(0, win.position.y, 0);
      scene.add(win);
    }
  }
})();

// Floating clouds in the sky for atmosphere — drift slowly across the meadow
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
const drifters = [];  // {mesh, driftSpeed}
for (let i = 0; i < 10; i++) {
  const cloud = new THREE.Group();
  const x = (Math.random() - 0.5) * 200;
  const z = (Math.random() - 0.5) * 200;
  const y = 22 + Math.random() * 18;
  for (let j = 0; j < 4; j++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random() * 1.5, 8, 6), cloudMat);
    puff.position.set(j * 2.5 - 3 + Math.random(), Math.random() * 1, Math.random() * 1);
    puff.scale.y = 0.5;
    cloud.add(puff);
  }
  cloud.position.set(x, y, z);
  scene.add(cloud);
  drifters.push({ mesh: cloud, speed: 0.3 + Math.random() * 0.5 });
}

// Cloud drift + objective star animation — runs at constant rate
let _cloudRaf = null;
let _cloudLastT = performance.now();
let objectiveReached = false;
function driftClouds() {
  _cloudRaf = requestAnimationFrame(driftClouds);
  const now = performance.now();
  const dt = Math.min(0.05, (now - _cloudLastT) / 1000);
  _cloudLastT = now;
  for (const d of drifters) {
    d.mesh.position.x += d.speed * dt;
    if (d.mesh.position.x > 110) d.mesh.position.x = -110;
  }
  // Objective star bounce + rotate
  const star = scene.userData.objectiveStar;
  if (star && star.visible) {
    star.rotation.y = now * 0.002;
    star.rotation.x = Math.sin(now * 0.003) * 0.2;
    star.position.y = star.userData.baseY = star.userData.baseY ?? star.position.y;
    star.position.y = star.userData.baseY + Math.sin(now * 0.003) * 0.18;
  }
}
driftClouds();

// ═══════════════════════════════════════════════════════
// BEDROOM (cutscene location — built at offset so it doesn't overlap the meadow)
// ═══════════════════════════════════════════════════════
const BEDROOM_ORIGIN = new THREE.Vector3(0, 0, -200);
const bedroomGroup = new THREE.Group();
bedroomGroup.position.copy(BEDROOM_ORIGIN);
scene.add(bedroomGroup);

(function buildBedroom() {
  // Materials
  const wallMat   = new THREE.MeshStandardMaterial({ color: 0xF6E4C0, roughness: 0.9 });
  const floorMat  = new THREE.MeshStandardMaterial({ color: 0xB07A48, roughness: 0.7 });
  const rugMat    = new THREE.MeshStandardMaterial({ color: 0xD16A6A, roughness: 0.95 });
  const woodMat   = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.6 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x6FAEDC, roughness: 0.8 });
  const pillowMat  = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.85 });
  const clockBodyMat = new THREE.MeshStandardMaterial({ color: 0xCC0000, roughness: 0.4, metalness: 0.2 });
  const clockFaceMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3 });
  const bellMat    = new THREE.MeshStandardMaterial({ color: 0xDDB347, roughness: 0.2, metalness: 0.85 });
  const windowMat  = new THREE.MeshStandardMaterial({ color: 0xB3E0F2, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.7 });
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0xEFCD79, roughness: 0.95, side: THREE.DoubleSide });

  const ROOM_W = 8, ROOM_D = 8, ROOM_H = 4;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  bedroomGroup.add(floor);

  // Rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, 0.5);
  bedroomGroup.add(rug);

  // Walls (3 sides + back wall — leave front "open" so camera can look in)
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  wallBack.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  wallBack.receiveShadow = true;
  bedroomGroup.add(wallBack);

  const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  wallLeft.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.receiveShadow = true;
  bedroomGroup.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  wallRight.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.receiveShadow = true;
  bedroomGroup.add(wallRight);

  // Ceiling — slightly darker
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xEEDFB8, roughness: 0.95 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_H;
  bedroomGroup.add(ceiling);

  // Window in the back wall
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.15), woodMat);
  winFrame.position.set(0, 2.5, -ROOM_D / 2 + 0.07);
  winFrame.receiveShadow = true;
  bedroomGroup.add(winFrame);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.4), windowMat);
  winGlass.position.set(0, 2.5, -ROOM_D / 2 + 0.16);
  bedroomGroup.add(winGlass);
  // Window cross
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), woodMat);
  crossV.position.set(0, 2.5, -ROOM_D / 2 + 0.17);
  bedroomGroup.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.08), woodMat);
  crossH.position.set(0, 2.5, -ROOM_D / 2 + 0.17);
  bedroomGroup.add(crossH);
  // Curtains
  const curtainL = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.0), curtainMat);
  curtainL.position.set(-1.3, 2.5, -ROOM_D / 2 + 0.2);
  bedroomGroup.add(curtainL);
  const curtainR = curtainL.clone();
  curtainR.position.x = 1.3;
  bedroomGroup.add(curtainR);

  // Bed — frame, mattress, blanket, pillow
  const bedGroup = new THREE.Group();
  bedGroup.position.set(-2.4, 0, -1.5);
  bedroomGroup.add(bedGroup);

  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 3.4), woodMat);
  bedFrame.position.y = 0.2;
  bedFrame.castShadow = true;
  bedFrame.receiveShadow = true;
  bedGroup.add(bedFrame);

  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 3.2), pillowMat);
  mattress.position.y = 0.55;
  mattress.castShadow = true;
  mattress.receiveShadow = true;
  bedGroup.add(mattress);

  const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 2.2), blanketMat);
  blanket.position.set(0, 0.74, 0.4);
  blanket.castShadow = true;
  bedGroup.add(blanket);

  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.8), pillowMat);
  pillow.position.set(0, 0.78, -1.2);
  pillow.castShadow = true;
  bedGroup.add(pillow);

  // Headboard
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.18), woodMat);
  headboard.position.set(0, 1.0, -1.8);
  headboard.castShadow = true;
  bedGroup.add(headboard);

  // Bedside table
  const tableGroup = new THREE.Group();
  tableGroup.position.set(-0.6, 0, -2.6);
  bedroomGroup.add(tableGroup);

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.7), woodMat);
  tableTop.position.y = 0.95;
  tableTop.castShadow = true;
  tableGroup.add(tableTop);
  // Table legs
  for (const [lx, lz] of [[-0.38, -0.28], [0.38, -0.28], [-0.38, 0.28], [0.38, 0.28]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.92, 0.06), woodMat);
    leg.position.set(lx, 0.46, lz);
    leg.castShadow = true;
    tableGroup.add(leg);
  }

  // Alarm clock on the table — body + face + 2 bells + clapper
  const alarmGroup = new THREE.Group();
  alarmGroup.position.set(0, 1.18, 0);
  tableGroup.add(alarmGroup);
  // Body (cylindrical bell-clock)
  const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 24), clockBodyMat);
  clockBody.rotation.x = Math.PI / 2;
  clockBody.castShadow = true;
  alarmGroup.add(clockBody);
  // Face
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), clockFaceMat);
  clockFace.position.z = 0.085;
  alarmGroup.add(clockFace);
  // Clock hands
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.005), new THREE.MeshStandardMaterial({ color: 0x000 }));
  hourHand.position.set(0, 0.04, 0.09);
  alarmGroup.add(hourHand);
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.15, 0.005), new THREE.MeshStandardMaterial({ color: 0x000 }));
  minHand.position.set(0, 0.06, 0.09);
  alarmGroup.add(minHand);
  // Bells on top
  const bellL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), bellMat);
  bellL.position.set(-0.13, 0.22, 0);
  bellL.castShadow = true;
  alarmGroup.add(bellL);
  const bellR = bellL.clone();
  bellR.position.x = 0.13;
  alarmGroup.add(bellR);
  // Feet
  for (const fx of [-0.16, 0.16]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.08), clockBodyMat);
    foot.position.set(fx, -0.105, 0);
    alarmGroup.add(foot);
  }
  // Save a reference so the cutscene can wiggle the clock when it rings
  bedroomGroup.userData.alarmGroup = alarmGroup;

  // Warm bedroom point light — no shadow casting (perf on 2015 Mac)
  const lamp = new THREE.PointLight(0xFFE0A0, 1.4, 12);
  lamp.position.set(2, 3.5, 2);
  bedroomGroup.add(lamp);

  // A small lamp model on the table
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xFFE0A0, emissive: 0xFFCC66, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
  lampShade.position.set(0.3, 1.35, 0);
  tableGroup.add(lampShade);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.5 }));
  lampStem.position.set(0.3, 1.1, 0);
  tableGroup.add(lampStem);

  // Rug under the bed — different pattern
  const bedRug = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x6B8E5B, roughness: 0.95 }));
  bedRug.rotation.x = -Math.PI / 2;
  bedRug.position.set(-2.4, 0.01, 0.6);
  bedroomGroup.add(bedRug);

  // Toys/picture frame on the back wall
  const picFrame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.05), woodMat);
  picFrame.position.set(2.4, 2.3, -ROOM_D / 2 + 0.05);
  bedroomGroup.add(picFrame);
  const picCanvas = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshStandardMaterial({ color: 0x4CAF50 }));
  picCanvas.position.set(2.4, 2.3, -ROOM_D / 2 + 0.08);
  bedroomGroup.add(picCanvas);
})();

// Hide the bedroom by default — cutscene will toggle it on
bedroomGroup.visible = false;

// ═══════════════════════════════════════════════════════
// KITCHEN (round 2 of cutscene — at a separate offset)
// ═══════════════════════════════════════════════════════
const KITCHEN_ORIGIN = new THREE.Vector3(0, 0, -400);
const kitchenGroup = new THREE.Group();
kitchenGroup.position.copy(KITCHEN_ORIGIN);
scene.add(kitchenGroup);

function makeParentAcorn(opts) {
  // Simple primitive-based acorn parent (granny/grampa)
  // Built so they're recognizably acorns but visually distinct from Pico
  const group = new THREE.Group();
  const c = opts.colors;

  // Shell — slightly squat sphere, body color
  const shellGeo = new THREE.SphereGeometry(0.45, 18, 16);
  const shellMat = new THREE.MeshStandardMaterial({ color: c.shell, roughness: 0.65 });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.position.y = 0.6;
  shell.scale.set(1, 1.05, 0.95);
  shell.castShadow = true;
  group.add(shell);

  // Cap — half-sphere, cap color
  const capGeo = new THREE.SphereGeometry(0.46, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const capMat = new THREE.MeshStandardMaterial({ color: c.cap, roughness: 0.7 });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 0.9;
  cap.castShadow = true;
  group.add(cap);

  // Tiny stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.04, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0x5A3A20, roughness: 0.8 })
  );
  stem.position.y = 1.18;
  group.add(stem);

  // Belly patch (peach oval like Pico)
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 14, 12),
    new THREE.MeshStandardMaterial({ color: c.belly, roughness: 0.7 })
  );
  belly.position.set(0, 0.55, 0.35);
  belly.scale.set(0.85, 0.7, 0.4);
  group.add(belly);

  // Eyes
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const eyePupil = new THREE.MeshBasicMaterial({ color: 0x000 });
  for (const ex of [-0.13, 0.13]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), eyeWhite);
    w.position.set(ex, 0.78, 0.36);
    group.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), eyePupil);
    p.position.set(ex, 0.78, 0.41);
    group.add(p);
  }

  // Smile arc
  const smileGeo = new THREE.TorusGeometry(0.07, 0.012, 8, 14, Math.PI);
  const smile = new THREE.Mesh(smileGeo, new THREE.MeshBasicMaterial({ color: 0x222 }));
  smile.position.set(0, 0.62, 0.43);
  smile.rotation.z = Math.PI;
  group.add(smile);

  // Tiny stick arms
  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
  const armMat = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.75 });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.rotation.z = Math.PI / 3.5;
  armL.position.set(-0.45, 0.5, 0);
  armL.castShadow = true;
  group.add(armL);
  const armR = armL.clone();
  armR.rotation.z = -Math.PI / 3.5;
  armR.position.x = 0.45;
  group.add(armR);

  // Tiny stick legs
  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8);
  const legL = new THREE.Mesh(legGeo, armMat);
  legL.position.set(-0.18, 0.18, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.18;
  group.add(legR);

  // Shoes
  const shoeMat = new THREE.MeshStandardMaterial({ color: c.shoes, roughness: 0.5 });
  const shoeGeo = new THREE.BoxGeometry(0.16, 0.08, 0.22);
  for (const sx of [-0.18, 0.18]) {
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(sx, 0.04, 0.05);
    shoe.castShadow = true;
    group.add(shoe);
  }

  // Granny: little flower on cap. Grampa: bushy moustache
  if (opts.kind === 'granny') {
    const flowerCenter = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xFFD740 }));
    flowerCenter.position.set(0.18, 1.04, 0);
    group.add(flowerCenter);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xFF6B9D, roughness: 0.6 }));
      petal.position.set(0.18 + Math.cos(angle) * 0.08, 1.04, Math.sin(angle) * 0.08);
      group.add(petal);
    }
    // White hair tufts under the cap
    const hair1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xEDEDED, roughness: 0.85 }));
    hair1.position.set(-0.4, 0.92, 0.1);
    group.add(hair1);
    const hair2 = hair1.clone();
    hair2.position.x = 0.4;
    group.add(hair2);
  } else {
    // Grampa: white moustache + tiny glasses
    const moustache = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.025, 6, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xEDEDED, roughness: 0.85 })
    );
    moustache.position.set(0, 0.64, 0.42);
    moustache.rotation.z = Math.PI;
    moustache.rotation.x = -0.25;
    group.add(moustache);
    // Glasses (two rings)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x333, roughness: 0.4 });
    for (const rx of [-0.13, 0.13]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16), ringMat);
      ring.position.set(rx, 0.78, 0.44);
      group.add(ring);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), ringMat);
    bridge.position.set(0, 0.78, 0.44);
    group.add(bridge);
  }

  group.userData.shell = shell;
  return group;
}

(function buildKitchen() {
  // Materials
  const wallMat   = new THREE.MeshStandardMaterial({ color: 0xFFF1D0, roughness: 0.9 });
  const floorMat  = new THREE.MeshStandardMaterial({ color: 0xBEAA82, roughness: 0.7 });
  const woodMat   = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.65 });
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xE0E8DC, roughness: 0.6 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xF8F4ED, roughness: 0.4 });
  const fridgeMat  = new THREE.MeshStandardMaterial({ color: 0xF5F1EA, roughness: 0.35, metalness: 0.2 });

  const ROOM_W = 10, ROOM_D = 9, ROOM_H = 4;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  kitchenGroup.add(floor);

  // Walls
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  wallBack.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  wallBack.receiveShadow = true;
  kitchenGroup.add(wallBack);

  const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  wallLeft.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.receiveShadow = true;
  kitchenGroup.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  wallRight.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.receiveShadow = true;
  kitchenGroup.add(wallRight);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshStandardMaterial({ color: 0xF5E8C0, roughness: 0.9 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_H;
  kitchenGroup.add(ceiling);

  // Window on back wall
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.15), woodMat);
  winFrame.position.set(-2.5, 2.6, -ROOM_D / 2 + 0.08);
  kitchenGroup.add(winFrame);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xCFEFFC, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.75 }));
  winGlass.position.set(-2.5, 2.6, -ROOM_D / 2 + 0.18);
  kitchenGroup.add(winGlass);

  // Counter + cabinets along back wall
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.1, 0.9), counterMat);
  counterTop.position.set(1.2, 1.0, -ROOM_D / 2 + 0.55);
  counterTop.castShadow = true;
  counterTop.receiveShadow = true;
  kitchenGroup.add(counterTop);
  const cabinets = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.9, 0.8), cabinetMat);
  cabinets.position.set(1.2, 0.5, -ROOM_D / 2 + 0.5);
  cabinets.castShadow = true;
  cabinets.receiveShadow = true;
  kitchenGroup.add(cabinets);
  // Cabinet handles
  for (const cx of [-1.0, 0, 1.0, 2.0, 3.0]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0x333, metalness: 0.7, roughness: 0.4 }));
    handle.rotation.z = Math.PI / 2;
    handle.position.set(cx, 0.5, -ROOM_D / 2 + 0.1);
    kitchenGroup.add(handle);
  }

  // Fridge
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.9), fridgeMat);
  fridge.position.set(4.0, 1.1, -ROOM_D / 2 + 0.6);
  fridge.castShadow = true;
  fridge.receiveShadow = true;
  kitchenGroup.add(fridge);
  // Fridge handle
  const fridgeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x222 }));
  fridgeHandle.position.set(3.6, 1.5, -ROOM_D / 2 + 1.07);
  kitchenGroup.add(fridgeHandle);

  // Round dining table (centerpiece)
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.1, 32), woodMat);
  tableTop.position.set(0, 0.9, 1.0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  kitchenGroup.add(tableTop);
  // Central pedestal
  const tablePed = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 16), woodMat);
  tablePed.position.set(0, 0.45, 1.0);
  tablePed.castShadow = true;
  kitchenGroup.add(tablePed);
  // Base disk
  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24), woodMat);
  tableBase.position.set(0, 0.04, 1.0);
  tableBase.castShadow = true;
  kitchenGroup.add(tableBase);

  // Chairs around the table (3 sides)
  function makeChair(x, z, rotY) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = rotY;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), woodMat);
    seat.position.y = 0.55;
    seat.castShadow = true;
    chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.08), woodMat);
    back.position.set(0, 0.95, -0.31);
    back.castShadow = true;
    chair.add(back);
    for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), woodMat);
      leg.position.set(lx, 0.275, lz);
      leg.castShadow = true;
      chair.add(leg);
    }
    return chair;
  }
  kitchenGroup.add(makeChair(0, 2.6, 0));         // Pico's chair (front)
  kitchenGroup.add(makeChair(-1.6, 1.0, Math.PI / 2));   // Granny mum (left)
  kitchenGroup.add(makeChair(1.6, 1.0, -Math.PI / 2));   // Grampa dad (right)

  // Plates with pancake stacks + syrup
  function makePancakeStack(x, z) {
    const stack = new THREE.Group();
    stack.position.set(x, 0.96, z);
    // Plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 }));
    plate.position.y = 0.02;
    plate.castShadow = true;
    plate.receiveShadow = true;
    stack.add(plate);
    // Three pancakes
    for (let i = 0; i < 3; i++) {
      const pc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 - i * 0.005, 0.22 - i * 0.005, 0.06, 18),
        new THREE.MeshStandardMaterial({ color: 0xCC8B4E, roughness: 0.8 })
      );
      pc.position.y = 0.06 + i * 0.06;
      pc.castShadow = true;
      stack.add(pc);
    }
    // Syrup pool on top — flatter & translucent amber
    const syrup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.18, 0.04, 18),
      new THREE.MeshStandardMaterial({ color: 0x6B3A12, roughness: 0.2, transparent: true, opacity: 0.85, emissive: 0x2A1505, emissiveIntensity: 0.15 })
    );
    syrup.position.y = 0.27;
    stack.add(syrup);
    // Pat of butter
    const butter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), new THREE.MeshStandardMaterial({ color: 0xFFF59D, roughness: 0.5 }));
    butter.position.y = 0.31;
    stack.add(butter);
    return stack;
  }
  kitchenGroup.add(makePancakeStack(0, 1.7));   // Pico's plate
  kitchenGroup.add(makePancakeStack(-0.9, 1.0));  // Mum's plate
  kitchenGroup.add(makePancakeStack(0.9, 1.0));   // Dad's plate

  // Syrup bottle in centre of table
  const syrupBottle = new THREE.Group();
  syrupBottle.position.set(0, 0.96, 1.0);
  const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 14), new THREE.MeshStandardMaterial({ color: 0xC8761E, roughness: 0.25, transparent: true, opacity: 0.85 }));
  bottleBody.position.y = 0.125;
  syrupBottle.add(bottleBody);
  const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0x444 }));
  bottleCap.position.y = 0.29;
  syrupBottle.add(bottleCap);
  kitchenGroup.add(syrupBottle);

  // Parents — granny mum (left chair) and grampa dad (right chair)
  const granny = makeParentAcorn({
    kind: 'granny',
    colors: { shell: 0xE6C99B, cap: 0x8B5A2B, belly: 0xFFE4D1, skin: 0xF0C9A8, shoes: 0x6B4632 }
  });
  granny.position.set(-1.6, 0, 1.0);   // sitting at chair (but standing for simplicity)
  granny.rotation.y = Math.PI / 2;       // facing the table (right)
  granny.scale.setScalar(0.64);   // shorter than Pico
  kitchenGroup.add(granny);

  const grampa = makeParentAcorn({
    kind: 'grampa',
    colors: { shell: 0xB89070, cap: 0x5A3A20, belly: 0xE8C9A8, skin: 0xD9B08A, shoes: 0x3A2818 }
  });
  grampa.position.set(1.6, 0, 1.0);
  grampa.rotation.y = -Math.PI / 2;      // facing the table (left)
  grampa.scale.setScalar(0.68);   // shorter than Pico
  kitchenGroup.add(grampa);

  // Save references for the cutscene
  kitchenGroup.userData.granny = granny;
  kitchenGroup.userData.grampa = grampa;

  // Warm kitchen ceiling light — no shadows for perf
  const ceilingLight = new THREE.PointLight(0xFFE4B0, 1.6, 14);
  ceilingLight.position.set(0, 3.5, 1.0);
  kitchenGroup.add(ceilingLight);

  // Window light from outside
  const winLight = new THREE.PointLight(0xCFE0F8, 0.6, 8);
  winLight.position.set(-2.5, 2.6, -2);
  kitchenGroup.add(winLight);

  // Tear water — translucent blue plane that rises during the meltdown
  const tearWater = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_W - 0.1, 0.05, ROOM_D - 0.1),
    new THREE.MeshStandardMaterial({
      color: 0x4FB7E5,
      roughness: 0.05,
      metalness: 0.6,
      transparent: true,
      opacity: 0.55,
      emissive: 0x1B5C8A,
      emissiveIntensity: 0.05
    })
  );
  tearWater.position.set(0, -0.05, 0);  // starts under the floor (invisible)
  tearWater.visible = false;
  kitchenGroup.add(tearWater);
  kitchenGroup.userData.tearWater = tearWater;
})();

// Hide kitchen by default
kitchenGroup.visible = false;

// ═══════════════════════════════════════════════════════
// THE NEW HOUSE — full interior: bedroom (upstairs) + stairs + downstairs
// (entrance hall, living room, kitchen) + front door that exits to the meadow.
// ═══════════════════════════════════════════════════════
const NEW_BEDROOM_ORIGIN = new THREE.Vector3(0, 0, -600);
const newBedroomGroup = new THREE.Group();
newBedroomGroup.position.copy(NEW_BEDROOM_ORIGIN);
scene.add(newBedroomGroup);

// ─── Floor-height map ─────────────────────────────────
// Returns the Y the player's feet should rest on at the given LOCAL XZ
// (relative to NEW_BEDROOM_ORIGIN). Walking upstairs/downstairs is just
// the staircase stepping up the Y value.
const UPSTAIRS_Y = 3.2;
const NUM_STAIRS = 6;
const STAIR_TOP_LZ = -1;    // top of staircase (upstairs side)
const STAIR_BOT_LZ = 3.2;   // bottom of staircase (downstairs side)
const STAIR_RUN = STAIR_BOT_LZ - STAIR_TOP_LZ;   // 4.2m of horizontal travel
const STAIR_RISE = UPSTAIRS_Y / NUM_STAIRS;       // per-step rise
const STAIR_HALFW = 1.4;
function getHouseFloorY(localX, localZ, currentY) {
  // Upstairs bedroom area: only when player is ALREADY upstairs
  // (otherwise the kitchen — which sits BELOW the upstairs floor in the same XZ
  // region — would lift the player onto the upstairs floor).
  // X range matches the full upstairs floor (±5, the house half-width).
  if (currentY > 1.5 && localZ <= STAIR_TOP_LZ && localZ >= -8 && Math.abs(localX) <= 5) {
    return UPSTAIRS_Y;
  }
  // Staircase: 6 steps descending from y=UPSTAIRS_Y at lz=STAIR_TOP_LZ to y=0 at lz=STAIR_BOT_LZ
  if (localZ > STAIR_TOP_LZ && localZ < STAIR_BOT_LZ && Math.abs(localX) <= STAIR_HALFW) {
    const tz = (localZ - STAIR_TOP_LZ) / STAIR_RUN;        // 0..1 across the run
    const stepIdx = Math.min(NUM_STAIRS - 1, Math.floor(tz * NUM_STAIRS));
    return UPSTAIRS_Y - (stepIdx + 1) * STAIR_RISE;
  }
  // Downstairs (entrance, living, kitchen) — everything else inside the house
  return 0;
}

(function buildNewHouse() {
  // ───────── Materials ─────────
  // DoubleSide on the walls so the camera (which can sit just outside the
  // wall in tight rooms) still sees opaque wall instead of the sky beyond.
  const wallMat   = new THREE.MeshStandardMaterial({ color: 0xE8E4DA, roughness: 0.92, side: THREE.DoubleSide });
  const wallWarmMat = new THREE.MeshStandardMaterial({ color: 0xE6CDA8, roughness: 0.9, side: THREE.DoubleSide });  // downstairs (warmer)
  const floorWood = new THREE.MeshStandardMaterial({ color: 0xC9A77C, roughness: 0.65 });
  const floorPlank = new THREE.MeshStandardMaterial({ color: 0xA47B4A, roughness: 0.75 });  // downstairs darker plank
  const trimMat   = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.7 });
  const boxMat    = new THREE.MeshStandardMaterial({ color: 0xB48A60, roughness: 0.85 });
  const boxTapeMat = new THREE.MeshStandardMaterial({ color: 0xC8A878, roughness: 0.6 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xE8F4FC, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.95, emissive: 0xFFE5B8, emissiveIntensity: 0.15 });
  const stairTreadMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.7 });
  const stairRiserMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1E, roughness: 0.7 });
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x6FA8B0, roughness: 0.85 });
  const sofaCushionMat = new THREE.MeshStandardMaterial({ color: 0xF5E6C8, roughness: 0.85 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0xC2453E, roughness: 0.85 });
  const woodTrim = new THREE.MeshStandardMaterial({ color: 0x6B4632, roughness: 0.75 });
  const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xF1F1EE, roughness: 0.4, metalness: 0.45 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xDDD4C0, roughness: 0.65 });
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xE9DBB6, roughness: 0.8 });
  const fireBrick = new THREE.MeshStandardMaterial({ color: 0x8B3A2A, roughness: 0.9 });
  const fireDark = new THREE.MeshStandardMaterial({ color: 0x1A0F0A, roughness: 0.95 });
  const tvMat = new THREE.MeshStandardMaterial({ color: 0x0A0A12, roughness: 0.25, metalness: 0.3 });

  // ───────── Layout constants (local coords; group origin is at NEW_BEDROOM_ORIGIN) ─────────
  // House footprint: x in [-5, 5], z in [-8, 8]  (10 wide × 16 deep)
  const H_HW = 5;          // half width
  const UP_BACK = -8;      // upstairs back wall (also house north wall)
  const UP_FRONT = -1;     // upstairs floor ends here (top of stairs)
  const DOWN_BACK = -1;    // downstairs ceiling above this (= upstairs floor area)
  const DOWN_FRONT = 8;    // house south wall (front door)
  const UPSTAIRS_CEIL = UPSTAIRS_Y + 2.6;     // upstairs ceiling height
  const DOWNSTAIRS_CEIL = UPSTAIRS_Y - 0.2;   // downstairs ceiling = bottom of upstairs floor
  // STAIR_TOP_LZ/STAIR_BOT_LZ defined above the IIFE

  // ───────── UPSTAIRS BEDROOM ─────────
  // Floor (raised at y=UPSTAIRS_Y) covering the bedroom area
  // DoubleSide so it also acts as the KITCHEN's ceiling (kitchen sits under it).
  const upFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(H_HW * 2, UP_FRONT - UP_BACK),
    new THREE.MeshStandardMaterial({ color: 0xC9A77C, roughness: 0.65, side: THREE.DoubleSide })
  );
  upFloor.rotation.x = -Math.PI / 2;
  upFloor.position.set(0, UPSTAIRS_Y, (UP_BACK + UP_FRONT) / 2);
  upFloor.receiveShadow = true;
  newBedroomGroup.add(upFloor);

  // North (back) wall — FULL height (downstairs + upstairs in one piece)
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(H_HW * 2, UPSTAIRS_CEIL), wallMat);
  wallBack.position.set(0, UPSTAIRS_CEIL / 2, UP_BACK);
  wallBack.receiveShadow = true;
  newBedroomGroup.add(wallBack);

  // East + West walls — FULL house length AND FULL height, so the kitchen
  // (downstairs, z<-1) has the same enclosure as the upstairs bedroom.
  const upWallLen = UP_FRONT - UP_BACK;
  const fullHouseLen = DOWN_FRONT - UP_BACK;
  const sideWallW = new THREE.Mesh(new THREE.PlaneGeometry(fullHouseLen, UPSTAIRS_CEIL), wallMat);
  sideWallW.position.set(-H_HW, UPSTAIRS_CEIL / 2, (UP_BACK + DOWN_FRONT) / 2);
  sideWallW.rotation.y = Math.PI / 2;
  sideWallW.receiveShadow = true;
  newBedroomGroup.add(sideWallW);
  const sideWallE = sideWallW.clone();
  sideWallE.position.x = H_HW;
  sideWallE.rotation.y = -Math.PI / 2;
  newBedroomGroup.add(sideWallE);

  // South wall of upstairs has a doorway in the middle (Pico's bedroom door
  // opens onto the landing). Build two wall segments either side of the door.
  const DOOR_W = 1.6, DOOR_H = 2.2;
  const segLen = (H_HW * 2 - DOOR_W) / 2;
  const upWallSL = new THREE.Mesh(new THREE.PlaneGeometry(segLen, UPSTAIRS_CEIL - UPSTAIRS_Y), wallMat);
  upWallSL.position.set(-(DOOR_W / 2 + segLen / 2), (UPSTAIRS_Y + UPSTAIRS_CEIL) / 2, UP_FRONT);
  upWallSL.rotation.y = Math.PI;
  newBedroomGroup.add(upWallSL);
  const upWallSR = upWallSL.clone();
  upWallSR.position.x = (DOOR_W / 2 + segLen / 2);
  newBedroomGroup.add(upWallSR);
  // Lintel above the doorway
  const upDoorLintel = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, UPSTAIRS_CEIL - UPSTAIRS_Y - DOOR_H), wallMat);
  upDoorLintel.position.set(0, UPSTAIRS_Y + DOOR_H + (UPSTAIRS_CEIL - UPSTAIRS_Y - DOOR_H) / 2, UP_FRONT);
  upDoorLintel.rotation.y = Math.PI;
  newBedroomGroup.add(upDoorLintel);
  // Door frame (visible trim around the doorway)
  const doorTrimMat = new THREE.MeshStandardMaterial({ color: 0xC9A77C, roughness: 0.7 });
  for (const fx of [-DOOR_W / 2, DOOR_W / 2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, DOOR_H, 0.12), doorTrimMat);
    post.position.set(fx, UPSTAIRS_Y + DOOR_H / 2, UP_FRONT);
    newBedroomGroup.add(post);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.16, 0.08, 0.12), doorTrimMat);
  top.position.set(0, UPSTAIRS_Y + DOOR_H, UP_FRONT);
  newBedroomGroup.add(top);

  // Upstairs ceiling
  const upCeil = new THREE.Mesh(new THREE.PlaneGeometry(H_HW * 2, upWallLen), new THREE.MeshStandardMaterial({ color: 0xF5EFDD, roughness: 0.92 }));
  upCeil.rotation.x = Math.PI / 2;
  upCeil.position.set(0, UPSTAIRS_CEIL, (UP_BACK + UP_FRONT) / 2);
  newBedroomGroup.add(upCeil);

  // FULL ROOF — covers the whole house footprint at UPSTAIRS_CEIL so the player
  // never sees sky through any ceiling gap (especially over the stairwell).
  // BackSide so it renders from below (looking up from inside).
  const fullRoof = new THREE.Mesh(
    new THREE.PlaneGeometry(H_HW * 2 + 0.2, DOWN_FRONT - UP_BACK + 0.2),
    new THREE.MeshStandardMaterial({ color: 0xF5EFDD, roughness: 0.92, side: THREE.DoubleSide })
  );
  fullRoof.rotation.x = Math.PI / 2;
  fullRoof.position.set(0, UPSTAIRS_CEIL + 0.05, (UP_BACK + DOWN_FRONT) / 2);
  newBedroomGroup.add(fullRoof);

  // Window on back wall (sun streams in)
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.0, 0.15), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.7 }));
  winFrame.position.set(0, UPSTAIRS_Y + 1.4, UP_BACK + 0.08);
  newBedroomGroup.add(winFrame);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.6), windowMat);
  winGlass.position.set(0, UPSTAIRS_Y + 1.4, UP_BACK + 0.18);
  newBedroomGroup.add(winGlass);
  for (const cx of [-0.65, 0, 0.65]) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.04), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.7 }));
    v.position.set(cx, UPSTAIRS_Y + 1.4, UP_BACK + 0.2);
    newBedroomGroup.add(v);
  }
  // Warm window light
  const winLight = new THREE.PointLight(0xFFE5B8, 1.4, 14);
  winLight.position.set(0, UPSTAIRS_Y + 1.6, UP_BACK + 1);
  newBedroomGroup.add(winLight);

  // ───────── Cardboard moving boxes (upstairs) ─────────
  function makeBox(x, z, w, h, d, rotY = 0, label = '') {
    const grp = new THREE.Group();
    grp.position.set(x, UPSTAIRS_Y + h / 2, z);
    grp.rotation.y = rotY;
    grp.userData.label = label;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat);
    body.castShadow = true;
    body.receiveShadow = true;
    grp.add(body);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.04, d * 0.25), boxTapeMat);
    tape.position.y = h / 2 + 0.005;
    grp.add(tape);
    if (label) {
      const labelW = w * 0.55, labelH = h * 0.4;
      const tex = makeLabelTexture(label);
      const labelEl = new THREE.Mesh(new THREE.PlaneGeometry(labelW, labelH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
      labelEl.position.set(0, 0, d / 2 + 0.005);
      grp.add(labelEl);
    }
    return grp;
  }
  function makeLabelTexture(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 36px Nunito, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  newBedroomGroup.add(makeBox(-2.4, -6.0, 1.2, 0.9, 1.0, 0.12, 'CLOTHES'));
  newBedroomGroup.add(makeBox(-2.3, -2.5, 1.0, 0.7, 0.9, -0.2,  'TOYS'));
  newBedroomGroup.add(makeBox( 0.0, -3.0, 1.4, 1.0, 1.1, 0.3,   'BOOKS'));
  newBedroomGroup.add(makeBox( 1.8, -2.2, 0.9, 0.7, 0.8, -0.15, 'STUFF'));

  // Empty bed frame against the east wall
  const bareFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 3.0), woodTrim);
  bareFrame.position.set(3.0, UPSTAIRS_Y + 0.2, -5.5);
  bareFrame.castShadow = true; bareFrame.receiveShadow = true;
  newBedroomGroup.add(bareFrame);
  const bareHead = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.18), woodTrim);
  bareHead.position.set(3.0, UPSTAIRS_Y + 0.9, -6.9);
  newBedroomGroup.add(bareHead);

  // ───────── STAIRCASE (visible step geometry) ─────────
  // 6 treads + risers from y=UPSTAIRS_Y at z=STAIR_TOP_LZ down to y=0 at z=STAIR_BOT_LZ
  const stairW = STAIR_HALFW * 2;
  const tread_depth = STAIR_RUN / NUM_STAIRS;
  for (let i = 0; i < NUM_STAIRS; i++) {
    const treadY = UPSTAIRS_Y - (i + 1) * STAIR_RISE;
    const treadZ = STAIR_TOP_LZ + i * tread_depth + tread_depth / 2;
    // Tread (the flat part you stand on)
    const tread = new THREE.Mesh(new THREE.BoxGeometry(stairW, 0.06, tread_depth), stairTreadMat);
    tread.position.set(0, treadY + 0.03, treadZ);
    tread.castShadow = true; tread.receiveShadow = true;
    newBedroomGroup.add(tread);
    // Riser (the vertical face under each tread)
    const riser = new THREE.Mesh(new THREE.BoxGeometry(stairW, STAIR_RISE, 0.04), stairRiserMat);
    riser.position.set(0, treadY + STAIR_RISE / 2, treadZ - tread_depth / 2);
    newBedroomGroup.add(riser);
  }
  // Stair banisters along both sides
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, STAIR_RUN * 1.1, 8), woodTrim);
    rail.position.set(side * STAIR_HALFW, UPSTAIRS_Y / 2 + 0.95, (STAIR_TOP_LZ + STAIR_BOT_LZ) / 2);
    rail.rotation.x = Math.atan2(UPSTAIRS_Y, STAIR_RUN);
    newBedroomGroup.add(rail);
    // Newel posts
    for (const z of [STAIR_TOP_LZ, STAIR_BOT_LZ]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), woodTrim);
      const isTop = z === STAIR_TOP_LZ;
      post.position.set(side * STAIR_HALFW, (isTop ? UPSTAIRS_Y + 0.6 : 0.6), z);
      newBedroomGroup.add(post);
    }
  }

  // ───────── DOWNSTAIRS — floor, walls, ceiling ─────────
  const downLen = DOWN_FRONT - DOWN_BACK;
  const downFloor = new THREE.Mesh(new THREE.PlaneGeometry(H_HW * 2, downLen), floorPlank);
  downFloor.rotation.x = -Math.PI / 2;
  downFloor.position.set(0, 0.01, (DOWN_BACK + DOWN_FRONT) / 2);
  downFloor.receiveShadow = true;
  newBedroomGroup.add(downFloor);
  // Downstairs ceiling (under the upstairs floor area only — open above the stairs/landing)
  const downCeil = new THREE.Mesh(new THREE.PlaneGeometry(H_HW * 2, DOWN_FRONT - STAIR_BOT_LZ), new THREE.MeshStandardMaterial({ color: 0xF5EFDD, roughness: 0.92 }));
  downCeil.rotation.x = Math.PI / 2;
  downCeil.position.set(0, DOWNSTAIRS_CEIL, (STAIR_BOT_LZ + DOWN_FRONT) / 2);
  newBedroomGroup.add(downCeil);

  // (downstairs east/west walls are now part of the unified full-height
  //  sideWallW / sideWallE above — no separate downstairs side walls needed)

  // South wall (FRONT of the house) has a door in the middle
  const FRONT_DOOR_W = 1.8, FRONT_DOOR_H = 2.5;
  const fsegLen = (H_HW * 2 - FRONT_DOOR_W) / 2;
  const downWallSL = new THREE.Mesh(new THREE.PlaneGeometry(fsegLen, DOWNSTAIRS_CEIL), wallWarmMat);
  downWallSL.position.set(-(FRONT_DOOR_W / 2 + fsegLen / 2), DOWNSTAIRS_CEIL / 2, DOWN_FRONT);
  downWallSL.rotation.y = Math.PI;
  newBedroomGroup.add(downWallSL);
  const downWallSR = downWallSL.clone();
  downWallSR.position.x = FRONT_DOOR_W / 2 + fsegLen / 2;
  newBedroomGroup.add(downWallSR);
  const downDoorLintel = new THREE.Mesh(new THREE.PlaneGeometry(FRONT_DOOR_W, DOWNSTAIRS_CEIL - FRONT_DOOR_H), wallWarmMat);
  downDoorLintel.position.set(0, FRONT_DOOR_H + (DOWNSTAIRS_CEIL - FRONT_DOOR_H) / 2, DOWN_FRONT);
  downDoorLintel.rotation.y = Math.PI;
  newBedroomGroup.add(downDoorLintel);
  // Front door panel (visual, with handle)
  const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(FRONT_DOOR_W - 0.08, FRONT_DOOR_H - 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x2C5C3E, roughness: 0.55 }));
  frontDoor.position.set(0, FRONT_DOOR_H / 2, DOWN_FRONT - 0.06);
  frontDoor.castShadow = true;
  newBedroomGroup.add(frontDoor);
  const doorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xC9B048, roughness: 0.2, metalness: 0.85 }));
  doorHandle.position.set(0.6, 1.1, DOWN_FRONT - 0.1);
  newBedroomGroup.add(doorHandle);
  newBedroomGroup.userData.frontDoorPos = new THREE.Vector3(0, 0, DOWN_FRONT - 0.5);

  // North wall of downstairs has the staircase opening + an alcove for kitchen on the east side
  // Build a back wall behind the kitchen (under the upstairs floor, north of the stairs)
  // The space under the upstairs floor (between DOWN_BACK and STAIR_TOP_LZ on z, full width)
  // is the kitchen area. We need a back wall at z=DOWN_BACK only where the kitchen extends.
  const kitchenBackLen = H_HW * 2;
  // Actually since the kitchen sits UNDER the upstairs floor, the "back wall" of the kitchen
  // is shared with the upstairs back wall area. Use a low partition wall to separate kitchen from stairs.
  // We'll skip a downstairs north wall — the upstairs floor IS the ceiling there.

  // ───────── DOWNSTAIRS LAYOUT ─────────
  // Visual zones (no walls between them — open-plan):
  //   Kitchen alcove:    z ∈ [DOWN_BACK..STAIR_BOT_LZ], under the upstairs floor (low ceiling)
  //   Living room:       z ∈ [STAIR_BOT_LZ..5], full ceiling height
  //   Entrance hall:     z ∈ [5..DOWN_FRONT], near the front door

  // ─── Kitchen (under upstairs floor, north end) ───
  // L-shaped counter along the east wall
  const cntH = 0.92;
  const cntDepth = 0.6;
  const cntE = new THREE.Mesh(new THREE.BoxGeometry(cntDepth, cntH, 4.2), cabinetMat);
  cntE.position.set(H_HW - cntDepth / 2, cntH / 2, -1.5);
  cntE.castShadow = true; cntE.receiveShadow = true;
  newBedroomGroup.add(cntE);
  // Counter top (slightly thicker, lighter colour)
  const cntETop = new THREE.Mesh(new THREE.BoxGeometry(cntDepth + 0.04, 0.05, 4.24), counterMat);
  cntETop.position.set(H_HW - cntDepth / 2, cntH + 0.025, -1.5);
  newBedroomGroup.add(cntETop);
  // Counter along the north wall (return of the L)
  const cntN = new THREE.Mesh(new THREE.BoxGeometry(3.0, cntH, cntDepth), cabinetMat);
  cntN.position.set(H_HW - cntDepth / 2 - 1.5, cntH / 2, DOWN_BACK + cntDepth / 2);
  newBedroomGroup.add(cntN);
  const cntNTop = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.05, cntDepth + 0.04), counterMat);
  cntNTop.position.set(H_HW - cntDepth / 2 - 1.5, cntH + 0.025, DOWN_BACK + cntDepth / 2);
  newBedroomGroup.add(cntNTop);
  // Sink (sunken into east counter)
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: 0xB8C5CC, roughness: 0.3, metalness: 0.6 }));
  sink.position.set(H_HW - cntDepth / 2, cntH + 0.01, -1.5);
  newBedroomGroup.add(sink);
  // Tap
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xC8CCD2, roughness: 0.2, metalness: 0.85 }));
  tap.position.set(H_HW - cntDepth / 2 + 0.15, cntH + 0.2, -1.5);
  newBedroomGroup.add(tap);
  // Hob (on the east counter, south of the sink)
  const hob = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.3, metalness: 0.6 }));
  hob.position.set(H_HW - cntDepth / 2, cntH + 0.04, 0.2);
  newBedroomGroup.add(hob);
  // 4 hob circles
  for (const [hx, hz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
    const circle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.005, 16), new THREE.MeshStandardMaterial({ color: 0x444, roughness: 0.6 }));
    circle.position.set(H_HW - cntDepth / 2 + hx, cntH + 0.06, 0.2 + hz);
    newBedroomGroup.add(circle);
  }
  // Fridge (on the north counter, west end)
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.7), fridgeMat);
  fridge.position.set(H_HW - cntDepth - 2.6, 0.95, DOWN_BACK + 0.35);
  fridge.castShadow = true; fridge.receiveShadow = true;
  newBedroomGroup.add(fridge);
  // Fridge handle
  const fridgeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), new THREE.MeshStandardMaterial({ color: 0x888, roughness: 0.3, metalness: 0.85 }));
  fridgeHandle.position.set(H_HW - cntDepth - 2.6 + 0.42, 1.0, DOWN_BACK + 0.7);
  newBedroomGroup.add(fridgeHandle);
  // Fridge magnets (colourful)
  for (let i = 0; i < 5; i++) {
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.01), new THREE.MeshStandardMaterial({ color: [0xFFD740, 0xE54B4B, 0x4BAFFF, 0x4BE585, 0xF59442][i] }));
    mag.position.set(H_HW - cntDepth - 2.6 + (i - 2) * 0.14, 1.4, DOWN_BACK + 0.71);
    newBedroomGroup.add(mag);
  }
  // Wall cabinets above the east counter
  for (let i = 0; i < 3; i++) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 1.2), cabinetMat);
    cab.position.set(H_HW - cntDepth / 2, 2.05, -3.0 + i * 1.3);
    cab.castShadow = true;
    newBedroomGroup.add(cab);
  }
  // Pendant light over the kitchen
  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.18, 18), new THREE.MeshStandardMaterial({ color: 0xCC9C5A, roughness: 0.4, metalness: 0.5 }));
  pendant.position.set(H_HW - 1.4, 2.7, -1.0);
  newBedroomGroup.add(pendant);
  const pendantLight = new THREE.PointLight(0xFFD7A0, 1.2, 6);
  pendantLight.position.set(H_HW - 1.4, 2.5, -1.0);
  newBedroomGroup.add(pendantLight);

  // ─── Living room (south of the stairs, full height) ───
  // Big rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.5), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-1.0, 0.02, 4.0);
  newBedroomGroup.add(rug);
  // Sofa (back against the east wall, facing west toward the TV)
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 2.6), sofaMat);
  sofaBase.position.set(H_HW - 0.7, 0.25, 4.0);
  sofaBase.castShadow = true; sofaBase.receiveShadow = true;
  newBedroomGroup.add(sofaBase);
  // Sofa back
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 2.6), sofaMat);
  sofaBack.position.set(H_HW - 0.25, 0.7, 4.0);
  sofaBack.castShadow = true;
  newBedroomGroup.add(sofaBack);
  // Sofa cushions
  for (let i = -1; i <= 1; i++) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), sofaCushionMat);
    cushion.position.set(H_HW - 0.85, 0.59, 4.0 + i * 0.85);
    cushion.castShadow = true;
    newBedroomGroup.add(cushion);
  }
  // Sofa arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.3), sofaMat);
    arm.position.set(H_HW - 0.7, 0.55, 4.0 + side * 1.45);
    newBedroomGroup.add(arm);
  }
  // Throw pillow
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.4), new THREE.MeshStandardMaterial({ color: 0xE54B4B, roughness: 0.85 }));
  pillow.position.set(H_HW - 0.85, 0.82, 4.7);
  pillow.rotation.y = 0.3;
  newBedroomGroup.add(pillow);

  // TV stand (against the west wall, facing east toward the sofa)
  const tvStand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.8), new THREE.MeshStandardMaterial({ color: 0x4A3220, roughness: 0.75 }));
  tvStand.position.set(-H_HW + 0.25, 0.28, 4.0);
  tvStand.castShadow = true; tvStand.receiveShadow = true;
  newBedroomGroup.add(tvStand);
  // TV
  const tv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 1.5), tvMat);
  tv.position.set(-H_HW + 0.45, 1.1, 4.0);
  tv.castShadow = true;
  newBedroomGroup.add(tv);
  // TV screen glow (a faintly emissive plane on the screen side)
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.85), new THREE.MeshBasicMaterial({ color: 0x6FA8C8 }));
  tvScreen.position.set(-H_HW + 0.495, 1.1, 4.0);
  tvScreen.rotation.y = Math.PI / 2;
  newBedroomGroup.add(tvScreen);

  // Coffee table (between sofa and TV)
  const coffeeTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 1.4), woodTrim);
  coffeeTop.position.set(2.5, 0.45, 4.0);
  coffeeTop.castShadow = true;
  newBedroomGroup.add(coffeeTop);
  for (const [tlx, tlz] of [[-0.38, -0.6], [0.38, -0.6], [-0.38, 0.6], [0.38, 0.6]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), woodTrim);
    leg.position.set(2.5 + tlx, 0.21, 4.0 + tlz);
    newBedroomGroup.add(leg);
  }
  // Cup of tea on the coffee table
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 }));
  mug.position.set(2.5, 0.55, 3.7);
  newBedroomGroup.add(mug);
  const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 }));
  mugHandle.position.set(2.58, 0.55, 3.7);
  mugHandle.rotation.y = Math.PI / 2;
  newBedroomGroup.add(mugHandle);

  // Fireplace on the south-west corner area (between TV stand and front-door wall)
  const fireWidth = 1.6, fireHeight = 1.6, fireDepth = 0.5;
  const firePlace = new THREE.Mesh(new THREE.BoxGeometry(fireDepth, fireHeight, fireWidth), fireBrick);
  firePlace.position.set(-H_HW + fireDepth / 2, fireHeight / 2, 6.5);
  firePlace.castShadow = true; firePlace.receiveShadow = true;
  newBedroomGroup.add(firePlace);
  // Fireplace opening (black inset)
  const fireMouth = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.9), fireDark);
  fireMouth.position.set(-H_HW + fireDepth + 0.001, 0.6, 6.5);
  fireMouth.rotation.y = Math.PI / 2;
  newBedroomGroup.add(fireMouth);
  // Fire glow (warm light)
  const fireLight = new THREE.PointLight(0xFF8844, 1.6, 5);
  fireLight.position.set(-H_HW + 0.7, 0.5, 6.5);
  newBedroomGroup.add(fireLight);
  // Animated "fire" — 3 small flickering planes (subtle, no real animation, just emissive)
  for (let i = 0; i < 3; i++) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8), new THREE.MeshBasicMaterial({ color: [0xFF6A1A, 0xFFC04B, 0xFF8333][i] }));
    flame.position.set(-H_HW + 0.4, 0.3 + i * 0.05, 6.5 + (i - 1) * 0.15);
    newBedroomGroup.add(flame);
  }
  // Mantelpiece + family photo
  const mantel = new THREE.Mesh(new THREE.BoxGeometry(fireDepth + 0.2, 0.08, fireWidth + 0.4), woodTrim);
  mantel.position.set(-H_HW + (fireDepth + 0.2) / 2, fireHeight, 6.5);
  newBedroomGroup.add(mantel);
  const photoFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.6), woodTrim);
  photoFrame.position.set(-H_HW + 0.55, fireHeight + 0.25, 6.5);
  newBedroomGroup.add(photoFrame);

  // Bookshelf along the south-east area
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 1.4), woodTrim);
  shelf.position.set(H_HW - 0.2, 0.9, 6.5);
  shelf.castShadow = true;
  newBedroomGroup.add(shelf);
  // Books on the shelf — colourful spines
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 7; i++) {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.16), new THREE.MeshStandardMaterial({ color: [0xE54B4B, 0xFFD740, 0x4BAFFF, 0x4BE585, 0xF59442, 0x9C5BE0, 0xEC5B98][i % 7], roughness: 0.7 }));
      bk.position.set(H_HW - 0.3, 0.3 + r * 0.4, 5.85 + i * 0.18);
      newBedroomGroup.add(bk);
    }
  }

  // ─── Entrance hall (near the front door) ───
  // Coat rack
  const coatRack = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), woodTrim);
  coatRack.position.set(-H_HW + 0.5, 0.9, DOWN_FRONT - 0.6);
  newBedroomGroup.add(coatRack);
  const coatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), woodTrim);
  coatBase.position.set(-H_HW + 0.5, 0.04, DOWN_FRONT - 0.6);
  newBedroomGroup.add(coatBase);
  // 4 hooks at the top
  for (let i = 0; i < 4; i++) {
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.15), woodTrim);
    const ang = (i / 4) * Math.PI * 2;
    hook.position.set(-H_HW + 0.5 + Math.cos(ang) * 0.08, 1.7, DOWN_FRONT - 0.6 + Math.sin(ang) * 0.08);
    newBedroomGroup.add(hook);
  }
  // Yellow coat hanging on the rack (Pico's)
  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0xFFD740, roughness: 0.7 }));
  coat.position.set(-H_HW + 0.6, 1.2, DOWN_FRONT - 0.6);
  newBedroomGroup.add(coat);
  // Door mat
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshStandardMaterial({ color: 0x6A4A30, roughness: 0.9 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.015, DOWN_FRONT - 0.55);
  newBedroomGroup.add(mat);
  // Small entrance table with a bowl of keys
  const enTable = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.8), woodTrim);
  enTable.position.set(H_HW - 0.3, 0.375, DOWN_FRONT - 0.8);
  newBedroomGroup.add(enTable);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9C5BE0, roughness: 0.6 }));
  bowl.position.set(H_HW - 0.3, 0.78, DOWN_FRONT - 0.8);
  newBedroomGroup.add(bowl);
  // Framed wall art above the entrance table
  const wallArt = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0xF9F4E8 }));
  wallArt.position.set(H_HW - 0.05, 1.6, DOWN_FRONT - 0.8);
  wallArt.rotation.y = -Math.PI / 2;
  newBedroomGroup.add(wallArt);

  // ─── Light fixtures downstairs ───
  // Ceiling light in living room
  const livingLight = new THREE.PointLight(0xFFE8C8, 1.2, 10);
  livingLight.position.set(0, DOWNSTAIRS_CEIL - 0.3, 4.5);
  newBedroomGroup.add(livingLight);
  // Soft fill light near the front door
  const entranceLight = new THREE.PointLight(0xFFEFD0, 0.7, 6);
  entranceLight.position.set(0, 2.4, DOWN_FRONT - 1.2);
  newBedroomGroup.add(entranceLight);

  // ─── House interior wall colliders ─────────
  // List of axis-aligned rectangles (local coords) Pico can't walk through.
  // Each entry: {minX, maxX, minZ, maxZ, minY?: optional floor (for collider that only applies at certain heights)}
  const colliders = [];
  // East wall (full house length)
  colliders.push({ minX: H_HW - 0.1, maxX: H_HW + 0.5, minZ: UP_BACK, maxZ: DOWN_FRONT });
  // West wall
  colliders.push({ minX: -H_HW - 0.5, maxX: -H_HW + 0.1, minZ: UP_BACK, maxZ: DOWN_FRONT });
  // North wall (back of house)
  colliders.push({ minX: -H_HW, maxX: H_HW, minZ: UP_BACK - 0.5, maxZ: UP_BACK + 0.1 });
  // South wall (front of house) — with door gap (door is x in [-0.9, 0.9])
  colliders.push({ minX: -H_HW, maxX: -FRONT_DOOR_W / 2, minZ: DOWN_FRONT - 0.1, maxZ: DOWN_FRONT + 0.5 });
  colliders.push({ minX: FRONT_DOOR_W / 2, maxX: H_HW, minZ: DOWN_FRONT - 0.1, maxZ: DOWN_FRONT + 0.5 });
  // Upstairs south wall (everywhere except the doorway)
  colliders.push({ minX: -H_HW, maxX: -DOOR_W / 2, minZ: UP_FRONT - 0.1, maxZ: UP_FRONT + 0.1, minY: UPSTAIRS_Y });
  colliders.push({ minX: DOOR_W / 2, maxX: H_HW, minZ: UP_FRONT - 0.1, maxZ: UP_FRONT + 0.1, minY: UPSTAIRS_Y });
  // Kitchen counter — east counter
  colliders.push({ minX: H_HW - cntDepth - 0.05, maxX: H_HW, minZ: -3.6, maxZ: 0.6, maxY: cntH });
  // Kitchen counter — north counter
  colliders.push({ minX: H_HW - cntDepth - 3.0, maxX: H_HW - cntDepth, minZ: DOWN_BACK, maxZ: DOWN_BACK + cntDepth + 0.05, maxY: cntH });
  // Fridge
  colliders.push({ minX: H_HW - cntDepth - 3.1, maxX: H_HW - cntDepth - 2.1, minZ: DOWN_BACK, maxZ: DOWN_BACK + 0.7 });
  // Sofa
  colliders.push({ minX: H_HW - 1.2, maxX: H_HW, minZ: 2.7, maxZ: 5.3 });
  // Coffee table
  colliders.push({ minX: 2.05, maxX: 2.95, minZ: 3.3, maxZ: 4.7, maxY: 0.5 });
  // TV stand
  colliders.push({ minX: -H_HW, maxX: -H_HW + 0.55, minZ: 3.1, maxZ: 4.9 });
  // Fireplace
  colliders.push({ minX: -H_HW, maxX: -H_HW + fireDepth, minZ: 6.5 - fireWidth / 2, maxZ: 6.5 + fireWidth / 2 });
  // Bookshelf
  colliders.push({ minX: H_HW - 0.45, maxX: H_HW, minZ: 5.8, maxZ: 7.2 });
  // Entrance table
  colliders.push({ minX: H_HW - 0.55, maxX: H_HW, minZ: DOWN_FRONT - 1.2, maxZ: DOWN_FRONT - 0.4 });
  // Upstairs furniture — bed frame
  colliders.push({ minX: 2.05, maxX: 3.95, minZ: -7.0, maxZ: -4.0, minY: UPSTAIRS_Y });
  newBedroomGroup.userData.houseColliders = colliders;

  // ─── Box collider list (for the original Ch.2 unpacking mini-objective) ───
  const boxes = [];
  const colliderMap = new Map();
  newBedroomGroup.traverse(o => {
    if (o.isMesh && o.material === boxMat) {
      boxes.push(o);
      const g = o.parent;
      const key = `${g.position.x.toFixed(2)},${g.position.z.toFixed(2)}`;
      const params = o.geometry.parameters;
      const halfW = (params.width || 1) / 2;
      const halfD = (params.depth || 1) / 2;
      const existing = colliderMap.get(key);
      if (existing) {
        existing.halfW = Math.max(existing.halfW, halfW);
        existing.halfD = Math.max(existing.halfD, halfD);
      } else {
        colliderMap.set(key, { x: g.position.x, z: g.position.z, halfW, halfD });
      }
    }
  });
  newBedroomGroup.userData.boxes = boxes;
  newBedroomGroup.userData.boxColliders = Array.from(colliderMap.values());
})();

newBedroomGroup.visible = false;

// MUM (Granny acorn) — appears in the new house entrance hall for the Ch.4 errand.
// Hidden by default; revealed by beginChapter4().
const houseMum = makeParentAcorn({
  kind: 'granny',
  colors: { shell: 0xE6C99B, cap: 0x8B5A2B, belly: 0xFFE4D1, skin: 0xF0C9A8, shoes: 0x6B4632 }
});
houseMum.scale.setScalar(0.64);
houseMum.position.set(NEW_BEDROOM_ORIGIN.x + 1.0, 0, NEW_BEDROOM_ORIGIN.z + 6.0);
houseMum.rotation.y = 0;
houseMum.visible = false;
scene.add(houseMum);

// ═══════════════════════════════════════════════════════
// CONKER HEIGHTS HIGH SCHOOL — visible exterior in the meadow.
// Pico walks up to it for the start of Ch.3 (his first day).
// ═══════════════════════════════════════════════════════
const SCHOOL_STOREFRONT_POS = new THREE.Vector3(-26, 0, -8);
const schoolStorefront = new THREE.Group();
schoolStorefront.position.copy(SCHOOL_STOREFRONT_POS);
scene.add(schoolStorefront);
(function buildSchoolStorefront() {
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x9B5A3E, roughness: 0.85 });
  const trimMat  = new THREE.MeshStandardMaterial({ color: 0xE8DDC8, roughness: 0.7 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xDDF5FF, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.6 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x3A2818, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3A3A38, roughness: 0.85 });
  const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0xC8CCD2, roughness: 0.3, metalness: 0.5 });
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xE54B4B, roughness: 0.7 });
  const W = 10, D = 6, H = 7;

  // Main building body (two storey, taller than butcher)
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), brickMat);
  body.position.set(0, H / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  schoolStorefront.add(body);
  // Trim band at first-floor level
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.25, D + 0.3), trimMat);
  trim.position.set(0, 3.4, 0);
  schoolStorefront.add(trim);
  // Roof trim
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.4), trimMat);
  topTrim.position.set(0, H - 0.15, 0);
  schoolStorefront.add(topTrim);
  // Flat roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.2, D + 0.2), roofMat);
  roof.position.set(0, H, 0);
  schoolStorefront.add(roof);

  // Windows — grid of 6 (2 rows × 3) on the front face
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const wx = -3 + col * 3;
      const wy = 2 + row * 2.5;
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.15), trimMat);
      winFrame.position.set(wx, wy, D / 2 + 0.05);
      schoolStorefront.add(winFrame);
      const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.95), windowMat);
      winGlass.position.set(wx, wy, D / 2 + 0.13);
      schoolStorefront.add(winGlass);
      // Cross
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), trimMat);
      cross.position.set(wx, wy, D / 2 + 0.15);
      schoolStorefront.add(cross);
    }
  }

  // Big double doors (centre front)
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 0.2), doorMat);
  doorL.position.set(-0.55, 1.3, D / 2 + 0.06);
  doorL.castShadow = true;
  schoolStorefront.add(doorL);
  const doorR = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 0.2), doorMat);
  doorR.position.set(0.55, 1.3, D / 2 + 0.06);
  doorR.castShadow = true;
  schoolStorefront.add(doorR);
  // Brass handles
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xDDB347, roughness: 0.3, metalness: 0.85 });
  const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), handleMat);
  handleL.position.set(-0.15, 1.3, D / 2 + 0.18);
  schoolStorefront.add(handleL);
  const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), handleMat);
  handleR.position.set(0.15, 1.3, D / 2 + 0.18);
  schoolStorefront.add(handleR);

  // Big steps leading up to the door
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18, 0.6 - i * 0.1), trimMat);
    step.position.set(0, 0.09 + i * 0.18, D / 2 + 1.2 - i * 0.55);
    step.castShadow = true;
    schoolStorefront.add(step);
  }

  // BIG SIGN above the door — "CONKER HEIGHTS HIGH"
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.2, 0.25), trimMat);
  signBack.position.set(0, 5.5, D / 2 + 0.15);
  schoolStorefront.add(signBack);
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024; signCanvas.height = 200;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#E8DDC8';
  sctx.fillRect(0, 0, 1024, 200);
  sctx.fillStyle = '#1a1a2e';
  sctx.font = 'bold 78px Nunito, sans-serif';
  sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
  sctx.fillText('CONKER HEIGHTS', 512, 80);
  sctx.font = 'bold 56px Nunito, sans-serif';
  sctx.fillStyle = '#7A3E2A';
  sctx.fillText('HIGH SCHOOL', 512, 150);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signPanel = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.15), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
  signPanel.position.set(0, 5.5, D / 2 + 0.28);
  schoolStorefront.add(signPanel);

  // Flagpole + flag on the roof
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8), flagPoleMat);
  flagPole.position.set(-4, H + 1.25, 0);
  schoolStorefront.add(flagPole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), flagMat);
  flag.position.set(-3.55, H + 2, 0);
  schoolStorefront.add(flag);

  // Paving in front
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, 3.5), new THREE.MeshStandardMaterial({ color: 0xA09890, roughness: 0.85 }));
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(0, 0.02, D / 2 + 1.75);
  schoolStorefront.add(paving);

  schoolStorefront.userData.doorWorldPos = new THREE.Vector3(SCHOOL_STOREFRONT_POS.x, 0, SCHOOL_STOREFRONT_POS.z + D / 2 + 1.5);
})();

// ═══════════════════════════════════════════════════════
// BUTCHER STOREFRONT — visible exterior in the meadow.
// Pico walks up to it during Ch.4 to enter the butcher shop interior.
// ═══════════════════════════════════════════════════════
const BUTCHER_STOREFRONT_POS = new THREE.Vector3(14, 0, -8);
const butcherStorefront = new THREE.Group();
butcherStorefront.position.copy(BUTCHER_STOREFRONT_POS);
scene.add(butcherStorefront);
(function buildButcherStorefront() {
  // 2-storey corner building with a striped awning + signage. Tall and a bit
  // looming so it stands out in the meadow.
  const brickMat = new THREE.MeshStandardMaterial({ color: 0xA9763F, roughness: 0.85 });  // warm nutty amber (was butcher red)
  const trimMat  = new THREE.MeshStandardMaterial({ color: 0xF1F1EE, roughness: 0.6 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xDDF5FF, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.6 });
  const awningMat = new THREE.MeshStandardMaterial({ color: 0x4C6B3A, roughness: 0.75 });  // cosy green awning
  const awningStripe = new THREE.MeshStandardMaterial({ color: 0xF1F1EE, roughness: 0.75 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4A2818, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2A2A28, roughness: 0.85 });
  const W = 8, D = 7, H = 6.5;

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), brickMat);
  body.position.set(0, H / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  butcherStorefront.add(body);
  // White trim around the top
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.4), trimMat);
  topTrim.position.set(0, H - 0.15, 0);
  butcherStorefront.add(topTrim);
  // Hipped tile roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(W * 0.9, 1.6, 4), roofMat);
  roof.position.set(0, H + 0.8, 0);
  roof.rotation.y = Math.PI / 4;
  butcherStorefront.add(roof);
  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), brickMat);
  chimney.position.set(W / 4, H + 1.0, -D / 4);
  butcherStorefront.add(chimney);

  // Big front window
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.4, 0.2), trimMat);
  winFrame.position.set(-1.5, 2.2, D / 2 + 0.08);
  butcherStorefront.add(winFrame);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), windowMat);
  winGlass.position.set(-1.5, 2.2, D / 2 + 0.2);
  butcherStorefront.add(winGlass);
  // Window cross
  const winCross1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 0.04), trimMat);
  winCross1.position.set(-1.5, 2.2, D / 2 + 0.22);
  butcherStorefront.add(winCross1);
  const winCross2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.04), trimMat);
  winCross2.position.set(-1.5, 2.2, D / 2 + 0.22);
  butcherStorefront.add(winCross2);

  // Striped awning above the window
  for (let i = 0; i < 7; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 1.2), i % 2 === 0 ? awningMat : awningStripe);
    stripe.position.set(-1.5 + (i - 3) * 0.6, 3.6, D / 2 + 0.6);
    stripe.rotation.x = -0.2;
    butcherStorefront.add(stripe);
  }

  // Front door (entrance for Ch.5)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.18), doorMat);
  door.position.set(2.2, 1.3, D / 2 + 0.06);
  door.castShadow = true;
  butcherStorefront.add(door);
  // Door handle
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshStandardMaterial({ color: 0xDDB347, roughness: 0.3, metalness: 0.85 }));
  handle.position.set(2.7, 1.3, D / 2 + 0.18);
  butcherStorefront.add(handle);
  // Step
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.7), trimMat);
  step.position.set(2.2, 0.09, D / 2 + 0.45);
  butcherStorefront.add(step);

  // BIG SIGN above the awning — "SCRATCHETT & SONS"
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 0.2), trimMat);
  signBack.position.set(0, 5.0, D / 2 + 0.15);
  butcherStorefront.add(signBack);
  // Canvas-based sign text
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024; signCanvas.height = 160;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#F1F1EE';
  sctx.fillRect(0, 0, 1024, 160);
  sctx.fillStyle = '#1a1a2e';
  sctx.font = 'bold 76px Nunito, sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('SCRATCHETT & SONS', 512, 84);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signPanel = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.95), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
  signPanel.position.set(0, 5.0, D / 2 + 0.26);
  butcherStorefront.add(signPanel);

  // Acorn emblem hanging by the sign (Scratchett's nut-shop badge — no cleaver)
  const emblemNut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), new THREE.MeshStandardMaterial({ color: 0xC98A4B, roughness: 0.7 }));
  emblemNut.scale.set(1, 1.25, 1);
  emblemNut.position.set(-3.5, 5.55, D / 2 + 0.3);
  butcherStorefront.add(emblemNut);
  const emblemCap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
  emblemCap.position.set(-3.5, 5.78, D / 2 + 0.3);
  butcherStorefront.add(emblemCap);

  // Sidewalk / paving in front
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, 3), new THREE.MeshStandardMaterial({ color: 0xA09890, roughness: 0.85 }));
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(0, 0.02, D / 2 + 1.5);
  butcherStorefront.add(paving);

  butcherStorefront.userData.doorWorldPos = new THREE.Vector3(BUTCHER_STOREFRONT_POS.x + 2.2, 0, BUTCHER_STOREFRONT_POS.z + D / 2 + 0.6);
})();

// ═══════════════════════════════════════════════════════
// CONKER HEIGHTS HIGH (Ch.3 — school hallway)
// ═══════════════════════════════════════════════════════
const SCHOOL_ORIGIN = new THREE.Vector3(0, 0, -800);
const schoolGroup = new THREE.Group();
schoolGroup.position.copy(SCHOOL_ORIGIN);
scene.add(schoolGroup);

// Reusable label texture helper (used by school + later market posters)
function makeLabelTextureSchool(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = color || '#1a1a2e';
  ctx.font = 'bold 36px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

(function buildSchool() {
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xBBA88E, roughness: 0.6 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xD9DFCB, roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x586066, roughness: 0.7 });
  const lockerMat = new THREE.MeshStandardMaterial({ color: 0x4A6B85, roughness: 0.5, metalness: 0.2 });
  const lockerLineMat = new THREE.MeshStandardMaterial({ color: 0x35536B, roughness: 0.5, metalness: 0.2 });
  const lockerHandleMat = new THREE.MeshStandardMaterial({ color: 0xE8DA9B, roughness: 0.4, metalness: 0.7 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1E, roughness: 0.55 });
  const doorGlassMat = new THREE.MeshStandardMaterial({ color: 0xB3E0F2, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.7 });
  const corkMat = new THREE.MeshStandardMaterial({ color: 0xC4956C, roughness: 0.95 });

  const HALL_W = 6, HALL_LEN = 24, HALL_H = 4.5;

  // Floor + centre stripe
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, HALL_LEN), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  schoolGroup.add(floor);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.2, HALL_LEN), trimMat);
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.y = 0.005;
  schoolGroup.add(stripe);

  // Walls
  const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(HALL_LEN, HALL_H), wallMat);
  wallLeft.position.set(-HALL_W / 2, HALL_H / 2, 0);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.receiveShadow = true;
  schoolGroup.add(wallLeft);
  const wallRight = wallLeft.clone();
  wallRight.position.x = HALL_W / 2;
  wallRight.rotation.y = -Math.PI / 2;
  schoolGroup.add(wallRight);
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, HALL_H), wallMat);
  wallBack.position.set(0, HALL_H / 2, -HALL_LEN / 2);
  wallBack.receiveShadow = true;
  schoolGroup.add(wallBack);

  // Ceiling + lights
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, HALL_LEN), new THREE.MeshStandardMaterial({ color: 0xE5E7DA, roughness: 0.9 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = HALL_H;
  schoolGroup.add(ceiling);
  for (let lz = -10; lz <= 10; lz += 4) {
    const ceilLight = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.6), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFE7B0, emissiveIntensity: 0.6 }));
    ceilLight.position.set(0, HALL_H - 0.05, lz);
    schoolGroup.add(ceilLight);
  }
  const hallLight = new THREE.PointLight(0xFFE5B8, 1.4, 30);
  hallLight.position.set(0, HALL_H - 0.4, 0);
  schoolGroup.add(hallLight);

  // Skirting
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, HALL_LEN), trimMat);
    skirt.position.set(side * HALL_W / 2 + side * -0.02, 0.09, 0);
    schoolGroup.add(skirt);
  }

  // Locker builder
  function makeLocker(x, z, faceY) {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    grp.rotation.y = faceY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 0.4), lockerMat);
    body.position.y = 1.05;
    body.castShadow = true;
    body.receiveShadow = true;
    grp.add(body);
    for (const sy of [0.5, 1.7]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.42), lockerLineMat);
      seam.position.y = sy;
      grp.add(seam);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), lockerHandleMat);
    handle.position.set(0.15, 1.1, 0.22);
    grp.add(handle);
    return grp;
  }
  // Lockers along both walls (with a gap for door + corkboard on the right)
  for (let lz = -10; lz <= 10; lz += 0.55) {
    schoolGroup.add(makeLocker(-HALL_W / 2 + 0.22, lz, Math.PI / 2));
  }
  for (let lz = -10; lz <= 10; lz += 0.55) {
    if (lz > -1.5 && lz < 3.5) continue;
    schoolGroup.add(makeLocker(HALL_W / 2 - 0.22, lz, -Math.PI / 2));
  }

  // Classroom door (right wall, near centre)
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 1.4), trimMat);
  doorFrame.position.set(HALL_W / 2 - 0.05, 1.2, 1);
  schoolGroup.add(doorFrame);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 1.2), doorMat);
  door.position.set(HALL_W / 2 - 0.03, 1.1, 1);
  door.castShadow = true;
  schoolGroup.add(door);
  const doorWin = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), doorGlassMat);
  doorWin.position.set(HALL_W / 2 - 0.02, 1.7, 1);
  doorWin.rotation.y = -Math.PI / 2;
  schoolGroup.add(doorWin);

  // CORKBOARD — "MISSING — HAVE YOU SEEN THESE ACORNS?"
  const corkBg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), corkMat);
  corkBg.position.set(HALL_W / 2 - 0.02, 1.6, -0.5);
  corkBg.rotation.y = -Math.PI / 2;
  schoolGroup.add(corkBg);
  const corkFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, 1.45), trimMat);
  corkFrame.position.set(HALL_W / 2 - 0.04, 1.6, -0.5);
  schoolGroup.add(corkFrame);
  const corkTitleTex = makeLabelTextureSchool('MISSING', '#E53935');
  const corkTitleEl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.18), new THREE.MeshStandardMaterial({ map: corkTitleTex, roughness: 0.7 }));
  corkTitleEl.position.set(HALL_W / 2 - 0.03, 1.95, -0.5);
  corkTitleEl.rotation.y = -Math.PI / 2;
  schoolGroup.add(corkTitleEl);
  for (let i = 0; i < 3; i++) {
    const post = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.4), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.6 }));
    post.position.set(HALL_W / 2 - 0.02, 1.7, -0.85 + i * 0.35);
    post.rotation.y = -Math.PI / 2;
    schoolGroup.add(post);
    const silhouette = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), new THREE.MeshBasicMaterial({ color: 0x444 }));
    silhouette.position.set(HALL_W / 2 - 0.012, 1.75, -0.85 + i * 0.35);
    silhouette.rotation.y = -Math.PI / 2;
    schoolGroup.add(silhouette);
  }

  schoolGroup.userData.corkboardPos = new THREE.Vector3(HALL_W / 2 - 0.5, 1.6, -0.5);
})();

// ─── NPC builders ──────────────────────────────────────
// Brunk — big glossy conker (horse chestnut). School bully turned ally later.
function makeBrunk() {
  const grp = new THREE.Group();
  // Body — glossy red-brown sphere
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x6E2A12, roughness: 0.25, metalness: 0.5 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.65, 22, 18), shellMat);
  shell.position.y = 0.75;
  shell.scale.set(1, 1.05, 0.95);
  shell.castShadow = true;
  grp.add(shell);
  // The pale "eye" patch where a conker meets the husk
  const eyeSpot = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 14), new THREE.MeshStandardMaterial({ color: 0xC9A77C, roughness: 0.7 }));
  eyeSpot.position.set(0, 0.45, 0.52);
  eyeSpot.scale.set(0.9, 0.75, 0.25);
  grp.add(eyeSpot);
  // Eyes (small, angry)
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111 });
  for (const ex of [-0.15, 0.15]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), eyeWhiteMat);
    w.position.set(ex, 0.95, 0.5);
    grp.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), pupilMat);
    p.position.set(ex, 0.93, 0.56);
    grp.add(p);
  }
  // Eyebrows — angry V
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0x2A1208 }));
    brow.position.set(side * 0.15, 1.08, 0.5);
    brow.rotation.z = side * -0.4;
    grp.add(brow);
  }
  // Smirk
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 14, Math.PI), new THREE.MeshBasicMaterial({ color: 0x111 }));
  mouth.position.set(0, 0.75, 0.55);
  grp.add(mouth);
  // Stick limbs in a slightly darker red-brown
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x4A1808, roughness: 0.7 });
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), limbMat);
    arm.rotation.z = side * Math.PI / 4;
    arm.position.set(side * 0.6, 0.7, 0);
    arm.castShadow = true;
    grp.add(arm);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), limbMat);
    leg.position.set(side * 0.18, 0.2, 0);
    leg.castShadow = true;
    grp.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.24), new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.5 }));
    shoe.position.set(side * 0.18, 0.04, 0.05);
    shoe.castShadow = true;
    grp.add(shoe);
  }
  grp.userData.shell = shell;
  return grp;
}

// Hazel — small acorn with round glasses + notebook. Fast, fearless, friendly.
function makeHazel() {
  const grp = new THREE.Group();
  // Shell (smaller than Pico, cream/tan)
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xE6C99B, roughness: 0.65 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 22, 18), shellMat);
  shell.position.y = 0.55;
  shell.scale.set(0.95, 1.05, 0.9);
  shell.castShadow = true;
  grp.add(shell);
  // Cap (darker brown, smaller)
  const capMat = new THREE.MeshStandardMaterial({ color: 0x6B4A26, roughness: 0.75 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
  cap.position.y = 0.82;
  cap.castShadow = true;
  grp.add(cap);
  // Tiny stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x5A3A20, roughness: 0.8 }));
  stem.position.y = 1.06;
  grp.add(stem);
  // Belly patch
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), new THREE.MeshStandardMaterial({ color: 0xFFE4D1, roughness: 0.7 }));
  belly.position.set(0, 0.5, 0.32);
  belly.scale.set(0.85, 0.7, 0.4);
  grp.add(belly);
  // Eyes
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111 });
  for (const ex of [-0.13, 0.13]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), eyeWhiteMat);
    w.position.set(ex, 0.7, 0.33);
    grp.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), pupilMat);
    p.position.set(ex, 0.7, 0.38);
    grp.add(p);
  }
  // Round glasses (signature!)
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x333, roughness: 0.4 });
  for (const ex of [-0.13, 0.13]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 6, 18), ringMat);
    ring.position.set(ex, 0.7, 0.41);
    grp.add(ring);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), ringMat);
  bridge.position.set(0, 0.7, 0.41);
  grp.add(bridge);
  // Smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14, Math.PI), new THREE.MeshBasicMaterial({ color: 0x222 }));
  smile.position.set(0, 0.56, 0.4);
  smile.rotation.z = Math.PI;
  grp.add(smile);
  // Stick limbs
  const limbMat = new THREE.MeshStandardMaterial({ color: 0xF0C9A8, roughness: 0.75 });
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), limbMat);
    arm.rotation.z = side * Math.PI / 3.5;
    arm.position.set(side * 0.4, 0.45, 0);
    arm.castShadow = true;
    grp.add(arm);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8), limbMat);
    leg.position.set(side * 0.15, 0.16, 0);
    leg.castShadow = true;
    grp.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.2), new THREE.MeshStandardMaterial({ color: 0xCC5577, roughness: 0.5 }));
    shoe.position.set(side * 0.15, 0.03, 0.04);
    shoe.castShadow = true;
    grp.add(shoe);
  }
  // Notebook in one hand (small box)
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.04), new THREE.MeshStandardMaterial({ color: 0xCC2222, roughness: 0.6 }));
  notebook.position.set(0.55, 0.32, 0.1);
  notebook.rotation.z = -0.2;
  grp.add(notebook);
  grp.userData.shell = shell;
  return grp;
}

// Mr. Pemberton-Pine — older, distinguished. We'll style him as a tall walnut.
function makePembertonPine() {
  const grp = new THREE.Group();
  // Body (large walnut — ridged, darker brown)
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x8B6B3F, roughness: 0.75 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 22, 18), shellMat);
  shell.position.y = 0.75;
  shell.scale.set(1, 1.25, 0.95);
  shell.castShadow = true;
  grp.add(shell);
  // Walnut ridge running vertically down the front
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.2, 0.025), new THREE.MeshStandardMaterial({ color: 0x5A4423, roughness: 0.8 }));
  ridge.position.set(0, 0.75, 0.55);
  grp.add(ridge);
  // Tweed jacket "lapels" (two trapezoid panels)
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x3F4F35, roughness: 0.85 });
  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.08), jacketMat);
    lapel.position.set(side * 0.2, 0.55, 0.5);
    lapel.rotation.z = side * 0.15;
    grp.add(lapel);
  }
  // Eyes
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111 });
  for (const ex of [-0.15, 0.15]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), eyeWhiteMat);
    w.position.set(ex, 1.0, 0.45);
    grp.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), pupilMat);
    p.position.set(ex, 1.0, 0.5);
    grp.add(p);
  }
  // Half-moon reading glasses
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xC8A23A, roughness: 0.4, metalness: 0.5 });
  for (const ex of [-0.15, 0.15]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 18, Math.PI), ringMat);
    ring.position.set(ex, 0.97, 0.53);
    ring.rotation.z = Math.PI;
    grp.add(ring);
  }
  // Thin pointed beard
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0xDFDFDF, roughness: 0.85 }));
  beard.position.set(0, 0.7, 0.55);
  beard.rotation.x = 0.3;
  grp.add(beard);
  // Stick limbs
  const limbMat = new THREE.MeshStandardMaterial({ color: 0xC9A77C, roughness: 0.75 });
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), limbMat);
    arm.rotation.z = side * Math.PI / 4;
    arm.position.set(side * 0.5, 0.6, 0);
    arm.castShadow = true;
    grp.add(arm);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), limbMat);
    leg.position.set(side * 0.18, 0.25, 0);
    leg.castShadow = true;
    grp.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.24), new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.5 }));
    shoe.position.set(side * 0.18, 0.04, 0.05);
    shoe.castShadow = true;
    grp.add(shoe);
  }
  grp.userData.shell = shell;
  return grp;
}

// Instantiate Ch.3 NPCs and park them off-frame until their beats fire
const brunk = makeBrunk();
brunk.position.set(SCHOOL_ORIGIN.x, 0, SCHOOL_ORIGIN.z - 12);  // way down the hallway (off-screen)
brunk.visible = false;
scene.add(brunk);

const hazel = makeHazel();
hazel.position.set(SCHOOL_ORIGIN.x - 1.5, 0, SCHOOL_ORIGIN.z + 2);
hazel.scale.setScalar(0.76);   // a bit smaller than Pico
hazel.visible = false;
scene.add(hazel);

const pemberton = makePembertonPine();
pemberton.position.set(SCHOOL_ORIGIN.x + 2.5, 0, SCHOOL_ORIGIN.z + 1);  // by his classroom door
pemberton.rotation.y = -Math.PI / 2;   // facing into the hallway
pemberton.visible = false;
scene.add(pemberton);

schoolGroup.visible = false;

// ═══════════════════════════════════════════════════════
// SAWBONES & SONS, FAMILY BUTCHER (Ch.5)
// ═══════════════════════════════════════════════════════
const BUTCHER_ORIGIN = new THREE.Vector3(0, 0, -1000);
const butcherShopGroup = new THREE.Group();
butcherShopGroup.position.copy(BUTCHER_ORIGIN);
scene.add(butcherShopGroup);

(function buildButcherShop() {
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xF0F0E8, roughness: 0.35, metalness: 0.05 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xE8E4DC, roughness: 0.8 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xCFD3D8, roughness: 0.25, metalness: 0.6 });
  const counterBaseMat = new THREE.MeshStandardMaterial({ color: 0x646A70, roughness: 0.4, metalness: 0.3 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5A3A1E, roughness: 0.7 });
  const hookMat = new THREE.MeshStandardMaterial({ color: 0xC8CCD2, roughness: 0.3, metalness: 0.85 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x3A2818, roughness: 0.6 });

  const SHOP_W = 12, SHOP_D = 14, SHOP_H = 4;

  // Checkerboard floor
  const tileLightMat = new THREE.MeshStandardMaterial({ color: 0xD9D5CB, roughness: 0.35 });
  for (let x = -SHOP_W / 2; x < SHOP_W / 2; x += 1) {
    for (let z = -SHOP_D / 2; z < SHOP_D / 2; z += 1) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ((Math.floor(x) + Math.floor(z)) % 2 === 0) ? tileMat : tileLightMat);
      t.rotation.x = -Math.PI / 2;
      t.position.set(x + 0.5, 0.01, z + 0.5);
      t.receiveShadow = true;
      butcherShopGroup.add(t);
    }
  }

  // Walls
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(SHOP_W, SHOP_H), wallMat);
  wallBack.position.set(0, SHOP_H / 2, -SHOP_D / 2);
  wallBack.receiveShadow = true;
  butcherShopGroup.add(wallBack);
  const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(SHOP_D, SHOP_H), wallMat);
  wallLeft.position.set(-SHOP_W / 2, SHOP_H / 2, 0);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.receiveShadow = true;
  butcherShopGroup.add(wallLeft);
  const wallRight = wallLeft.clone();
  wallRight.position.x = SHOP_W / 2;
  wallRight.rotation.y = -Math.PI / 2;
  butcherShopGroup.add(wallRight);
  // Front wall with door gap
  const frontWallL = new THREE.Mesh(new THREE.PlaneGeometry(SHOP_W / 2 - 1, SHOP_H), wallMat);
  frontWallL.position.set(-SHOP_W / 4 - 0.5, SHOP_H / 2, SHOP_D / 2);
  frontWallL.rotation.y = Math.PI;
  butcherShopGroup.add(frontWallL);
  const frontWallR = frontWallL.clone();
  frontWallR.position.x = SHOP_W / 4 + 0.5;
  butcherShopGroup.add(frontWallR);
  // Door
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 0.12), woodMat);
  doorFrame.position.set(0, 1.5, SHOP_D / 2);
  butcherShopGroup.add(doorFrame);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.08), doorMat);
  doorPanel.position.set(0, 1.3, SHOP_D / 2 + 0.05);
  butcherShopGroup.add(doorPanel);
  // Bell over the door
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xDDB347, roughness: 0.25, metalness: 0.85 });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), bellMat);
  bell.position.set(0, 2.9, SHOP_D / 2 - 0.2);
  butcherShopGroup.add(bell);
  butcherShopGroup.userData.bell = bell;

  // Ceiling + cold lighting
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(SHOP_W, SHOP_D), new THREE.MeshStandardMaterial({ color: 0xE5E5DC, roughness: 0.9 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = SHOP_H;
  butcherShopGroup.add(ceiling);
  const coldLight = new THREE.PointLight(0xDCE9F5, 1.4, 22);
  coldLight.position.set(0, SHOP_H - 0.4, 0);
  butcherShopGroup.add(coldLight);
  const coldLight2 = new THREE.PointLight(0xDCE9F5, 0.9, 16);
  coldLight2.position.set(0, SHOP_H - 0.4, -4);
  butcherShopGroup.add(coldLight2);

  // Stainless steel counter spanning the room
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(SHOP_W - 2, 0.18, 1.6), counterMat);
  counterTop.position.set(0, 1.05, -2.5);
  counterTop.castShadow = true;
  counterTop.receiveShadow = true;
  butcherShopGroup.add(counterTop);
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(SHOP_W - 2, 1.0, 1.4), counterBaseMat);
  counterBase.position.set(0, 0.5, -2.5);
  counterBase.castShadow = true;
  butcherShopGroup.add(counterBase);
  // Glass display front
  const displayGlass = new THREE.Mesh(new THREE.PlaneGeometry(SHOP_W - 2, 0.85), new THREE.MeshStandardMaterial({ color: 0xDDF5FF, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.35 }));
  displayGlass.position.set(0, 0.55, -2.5 + 0.71);
  butcherShopGroup.add(displayGlass);
  // Baskets of acorns in the display (Scratchett hoards the plumpest ones)
  const dispNutMat = new THREE.MeshStandardMaterial({ color: 0xC98A4B, roughness: 0.7 });
  const dispCapMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
  for (let i = -3; i <= 3; i++) {
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.32, 14), new THREE.MeshStandardMaterial({ color: 0x9C7849, roughness: 0.85 }));
    basket.position.set(i * 1.3, 0.34, -2.6);
    basket.castShadow = true;
    butcherShopGroup.add(basket);
    for (let n = 0; n < 5; n++) {
      const ox = (Math.random() - 0.5) * 0.5, oz = (Math.random() - 0.5) * 0.4;
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), dispNutMat);
      nut.scale.set(1, 1.25, 1);
      nut.position.set(i * 1.3 + ox, 0.52, -2.6 + oz);
      butcherShopGroup.add(nut);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), dispCapMat);
      cap.position.set(i * 1.3 + ox, 0.6, -2.6 + oz);
      butcherShopGroup.add(cap);
    }
  }
  // A fat collecting sack of acorns on the counter (no chopping block, no blade)
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), new THREE.MeshStandardMaterial({ color: 0xB39B6E, roughness: 0.95 }));
  sack.scale.set(1, 1.2, 1);
  sack.position.set(2.5, 1.68, -2.5);   // sits on the counter top (~1.14), not sunk into it
  sack.castShadow = true;
  butcherShopGroup.add(sack);
  const sackTie = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 14), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
  sackTie.position.set(2.5, 2.05, -2.5);
  sackTie.rotation.x = Math.PI / 2;
  butcherShopGroup.add(sackTie);

  // Hanging tied bundles of dried acorns + strings of little nuts (cosy dressing)
  const bundleMat = new THREE.MeshStandardMaterial({ color: 0xA9742F, roughness: 0.8 });
  const stringNutMat = new THREE.MeshStandardMaterial({ color: 0xC98A4B, roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const hx = -4.5 + (i * 1.8);
    const hz = -5.5 - (i % 2) * 1.5;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), hookMat);
    chain.position.set(hx, SHOP_H - 0.85, hz);
    butcherShopGroup.add(chain);
    if (i % 2 === 0) {
      const bundle = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), bundleMat);
      bundle.position.set(hx, SHOP_H - 1.45, hz);
      bundle.scale.set(0.9, 1.4, 0.9);
      bundle.castShadow = true;
      butcherShopGroup.add(bundle);
    } else {
      for (let s = 0; s < 6; s++) {
        const nut = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), stringNutMat);
        nut.scale.set(1, 1.2, 1);
        nut.position.set(hx, SHOP_H - 1.2 - s * 0.18, hz);
        nut.castShadow = true;
        butcherShopGroup.add(nut);
      }
    }
  }

  // Posters on back wall
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshStandardMaterial({ color: 0xF9F4E8, roughness: 0.85 }));
  poster.position.set(-3, 2.4, -SHOP_D / 2 + 0.05);
  butcherShopGroup.add(poster);
  const poster2 = poster.clone();
  poster2.position.x = 3;
  butcherShopGroup.add(poster2);

  // Crate stack on the side
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x9C7849, roughness: 0.85 });
  for (let i = 0; i < 3; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), crateMat);
    crate.position.set(SHOP_W / 2 - 0.6, 0.45 + i * 0.92, -SHOP_D / 2 + 1.2);
    crate.rotation.y = (Math.random() - 0.5) * 0.2;
    crate.castShadow = true;
    crate.receiveShadow = true;
    butcherShopGroup.add(crate);
  }

  butcherShopGroup.userData.doorPos = new THREE.Vector3(0, 0, SHOP_D / 2 - 0.5);
})();

butcherShopGroup.visible = false;

// ═══════════════════════════════════════════════════════
// THE BUTCHER (Ch.5 antagonist)
// ═══════════════════════════════════════════════════════
function makeButcher() {
  const grp = new THREE.Group();
  const apronMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xC53B2F, roughness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xD9A382, roughness: 0.6 });
  const trouserMat = new THREE.MeshStandardMaterial({ color: 0x2A2622, roughness: 0.8 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1A1612, roughness: 0.5 });

  // Massive torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.2), shirtMat);
  torso.position.y = 2.4;
  torso.castShadow = true;
  grp.add(torso);
  // Apron
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.95), apronMat);
  apron.position.set(0, 2.4, 0.61);
  grp.add(apron);
  for (const sx of [-0.5, 0.5]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.05), apronMat);
    strap.position.set(sx, 3.4, 0.62);
    grp.add(strap);
  }
  // Legs + boots
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 1.4, 12), trouserMat);
    leg.position.set(side * 0.4, 0.7, 0);
    leg.castShadow = true;
    grp.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.7), bootMat);
    boot.position.set(side * 0.4, 0.12, 0.06);
    boot.castShadow = true;
    grp.add(boot);
  }
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16), skinMat);
  head.position.y = 3.9;
  head.castShadow = true;
  grp.add(head);
  // Moustache
  const moustache = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.18), new THREE.MeshStandardMaterial({ color: 0x2A1612, roughness: 0.85 }));
  moustache.position.set(0, 3.78, 0.42);
  grp.add(moustache);
  // Eyes
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111 });
  for (const ex of [-0.18, 0.18]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), eyeWhiteMat);
    w.position.set(ex, 4.0, 0.43);
    grp.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), pupilMat);
    p.position.set(ex, 4.0, 0.49);
    grp.add(p);
  }
  // Huge friendly grin
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 18, Math.PI), new THREE.MeshBasicMaterial({ color: 0x111 }));
  smile.position.set(0, 3.65, 0.45);
  smile.rotation.z = Math.PI;
  grp.add(smile);
  // White butcher's cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 24), apronMat);
  cap.position.y = 4.4;
  cap.castShadow = true;
  grp.add(cap);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), apronMat);
  capTop.position.y = 4.62;
  grp.add(capTop);
  // Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.2, 12), shirtMat);
    arm.position.set(side * 0.95, 2.8, 0);
    arm.castShadow = true;
    grp.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skinMat);
    hand.position.set(side * 0.95, 2.15, 0);
    hand.castShadow = true;
    grp.add(hand);
  }
  // CLEAVER in the right hand
  const cleaverBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0xDDE2E8, roughness: 0.15, metalness: 0.9 }));
  cleaverBlade.position.set(0.95, 2.4, 0.35);
  cleaverBlade.castShadow = true;
  grp.add(cleaverBlade);
  const cleaverHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), new THREE.MeshStandardMaterial({ color: 0x5A3A1E, roughness: 0.7 }));
  cleaverHandle.position.set(0.95, 2.0, 0.35);
  grp.add(cleaverHandle);
  grp.userData.cleaverBlade = cleaverBlade;
  grp.userData.cleaverHandle = cleaverHandle;
  return grp;
}

const butcher = makeSquirrel();   // Scratchett also stars in the Ch.5 story chase (no cleaver)
butcher.visible = false;
scene.add(butcher);

// ═══════════════════════════════════════════════════════
// SCRATCHETT THE SQUIRREL — free-play antagonist (comedic, non-violent)
// A humanoid, funny-weird squirrel nut-hoarder. Holds an acorn for the
// "caught" close-up. No weapons — pure cartoon menace, gentle for under-11s.
// ═══════════════════════════════════════════════════════
function makeSquirrel() {
  const grp = new THREE.Group();
  const furMat   = new THREE.MeshStandardMaterial({ color: 0x9B5A2B, roughness: 0.8 });
  const furDark  = new THREE.MeshStandardMaterial({ color: 0x7A4420, roughness: 0.85 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xF0DCC0, roughness: 0.8 });
  const vestMat  = new THREE.MeshStandardMaterial({ color: 0x4C6B3A, roughness: 0.7 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x120D08 });
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xFFF6E0, roughness: 0.5 });
  const acornCapM = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
  const acornNutM = new THREE.MeshStandardMaterial({ color: 0xC98A4B, roughness: 0.7 });

  // Legs + feet
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.0, 12), furMat);
    leg.position.set(side * 0.3, 0.5, 0);
    leg.castShadow = true; grp.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.6), furDark);
    foot.position.set(side * 0.3, 0.09, 0.12);
    foot.castShadow = true; grp.add(foot);
  }
  // Pear-shaped torso + cream belly + little waistcoat
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 16), furMat);
  torso.scale.set(1, 1.25, 0.95); torso.position.y = 1.55; torso.castShadow = true; grp.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), bellyMat);
  belly.scale.set(1, 1.2, 0.6); belly.position.set(0, 1.5, 0.42); grp.add(belly);
  const vest = new THREE.Mesh(new THREE.SphereGeometry(0.64, 18, 16), vestMat);
  vest.scale.set(1.02, 0.7, 0.98); vest.position.set(0, 1.85, 0); grp.add(vest);

  // Big bushy tail — stacked spheres curving up behind
  const tail = new THREE.Group();
  for (const [tx, ty, tz, tr] of [
    [0, 0.4, -0.7, 0.42], [0, 0.95, -0.95, 0.5], [0, 1.6, -1.0, 0.56],
    [0, 2.25, -0.85, 0.54], [0, 2.7, -0.45, 0.46], [0, 2.85, 0.05, 0.34]
  ]) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(tr, 14, 12), furDark);
    seg.position.set(tx, ty, tz); seg.castShadow = true; tail.add(seg);
  }
  grp.add(tail); grp.userData.tail = tail;

  // Arms + paws clasped front (greedy collector)
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 10), furMat);
    arm.position.set(side * 0.6, 1.65, 0.2);
    arm.rotation.x = -0.5; arm.rotation.z = side * 0.25;
    arm.castShadow = true; grp.add(arm);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), furDark);
    paw.position.set(side * 0.42, 1.32, 0.5); paw.castShadow = true; grp.add(paw);
  }

  // Head + chubby hoarder cheeks + muzzle + nose + buck teeth
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16), furMat);
  head.position.y = 2.65; head.castShadow = true; grp.add(head);
  for (const cx of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), furMat);
    cheek.position.set(cx * 0.3, 2.5, 0.28); grp.add(cheek);
  }
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), bellyMat);
  muzzle.scale.set(1, 0.8, 1); muzzle.position.set(0, 2.5, 0.42); grp.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), pupilMat);
  nose.position.set(0, 2.56, 0.62); grp.add(nose);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.04), toothMat);
  teeth.position.set(0, 2.38, 0.6); grp.add(teeth);
  // Tufted ears
  for (const ex of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 10), furMat);
    ear.position.set(ex * 0.28, 3.05, -0.05); ear.rotation.z = ex * -0.2;
    ear.castShadow = true; grp.add(ear);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 8), furDark);
    tuft.position.set(ex * 0.28, 3.32, -0.05); tuft.rotation.z = ex * -0.2; grp.add(tuft);
  }
  // Big eyes (a touch oversized = a hint of creepy, but cartoon)
  for (const ex of [-0.2, 0.2]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), eyeWhite);
    w.position.set(ex, 2.72, 0.36); grp.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), pupilMat);
    p.position.set(ex, 2.72, 0.46); grp.add(p);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(ex + 0.03, 2.76, 0.51); grp.add(glint);
  }

  // The acorn he covets — used in the catch close-up
  const acorn = new THREE.Group();
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), acornNutM);
  nut.scale.set(1, 1.25, 1); acorn.add(nut);
  const acap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), acornCapM);
  acap.position.y = 0.13; acorn.add(acap);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), acornCapM);
  stalk.position.y = 0.22; acorn.add(stalk);
  acorn.position.set(0.42, 1.32, 0.6); grp.add(acorn);
  grp.userData.acorn = acorn; grp.userData.head = head;
  return grp;
}

const squirrel = makeSquirrel();
squirrel.visible = false;
scene.add(squirrel);
const squirrelInJail = makeSquirrel();
squirrelInJail.scale.setScalar(0.92);
squirrelInJail.visible = false;
scene.add(squirrelInJail);

// Post-game tidy bedroom: a neat stack of empty, flattened boxes piled in the
// back-left corner — shown only in free-play (replaces the scattered moving boxes).
const tidyBoxPile = new THREE.Group();
{
  const flatMat = new THREE.MeshStandardMaterial({ color: 0xB48A60, roughness: 0.88 });
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xC8A878, roughness: 0.6 });
  const stack = [
    [-4.0,  -7.0,  1.4, 0.22, 1.0,  0.05, true],
    [-3.7,  -7.05, 1.3, 0.20, 0.95, -0.10, true],
    [-3.95, -7.0,  1.2, 0.20, 0.9,  0.18, false],
    [-3.75, -6.35, 1.35, 0.22, 1.0, 0.30, false],
  ];
  let layer = 0;
  stack.forEach(([x, z, w, h, d, rot, onFloor]) => {
    const y = onFloor ? UPSTAIRS_Y + h / 2 : UPSTAIRS_Y + h / 2 + (++layer) * 0.24;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat);
    box.position.set(x, y, z); box.rotation.y = rot;
    box.castShadow = true; box.receiveShadow = true; tidyBoxPile.add(box);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.03, d * 0.3), tapeMat);
    tape.position.set(x, y + h / 2 + 0.01, z); tape.rotation.y = rot; tidyBoxPile.add(tape);
  });
}
tidyBoxPile.visible = false;
newBedroomGroup.add(tidyBoxPile);

// Swap the bedroom between "mid-move" (scattered labelled boxes) and
// "post-game" (tidy, empty boxes piled in the corner).
function setRoomPostGame(on) {
  const LABELS = ['CLOTHES', 'TOYS', 'BOOKS', 'STUFF'];
  if (!newBedroomGroup.userData.movingBoxGroups) {
    newBedroomGroup.userData.movingBoxGroups = newBedroomGroup.children.filter(
      c => c.isGroup && c.userData && LABELS.includes(c.userData.label)
    );
  }
  for (const g of newBedroomGroup.userData.movingBoxGroups) g.visible = !on;
  tidyBoxPile.visible = on;
}

// ═══════════════════════════════════════════════════════
// THE JAIL (free-play unlock — Butcher is locked up after Ch.6 ending)
// ═══════════════════════════════════════════════════════
const JAIL_POS = new THREE.Vector3(20, 0, 14);
const jailGroup = new THREE.Group();
jailGroup.position.copy(JAIL_POS);
scene.add(jailGroup);
(function buildJail() {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7C7872, roughness: 0.95 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x5F5C58, roughness: 0.9 });
  const stoneMossy = new THREE.MeshStandardMaterial({ color: 0x6E7B5C, roughness: 0.95 });
  const barMat = new THREE.MeshStandardMaterial({ color: 0x2A2A28, roughness: 0.4, metalness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3A3A38, roughness: 0.85 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x9C9893, roughness: 0.95 });
  const signMat = new THREE.MeshStandardMaterial({ color: 0xE8DDC8, roughness: 0.85 });
  const strawMat = new THREE.MeshStandardMaterial({ color: 0xD4B570, roughness: 0.95 });
  const W = 7, D = 6, H = 4.5;

  // Stone floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.receiveShadow = true;
  jailGroup.add(floor);

  // Back, east, west walls (stone, full)
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.4), stoneMat);
  wallBack.position.set(0, H / 2, -D / 2);
  wallBack.castShadow = true;
  wallBack.receiveShadow = true;
  jailGroup.add(wallBack);
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.4, H, D), stoneMat);
  wallW.position.set(-W / 2, H / 2, 0);
  wallW.castShadow = true;
  jailGroup.add(wallW);
  const wallE = wallW.clone();
  wallE.position.x = W / 2;
  jailGroup.add(wallE);

  // Individual stones for texture variation on the front edges
  for (let i = 0; i < 10; i++) {
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(0.5 + Math.random() * 0.3, 0.45, 0.1),
      i % 3 === 0 ? stoneMossy : (i % 2 === 0 ? stoneMat : stoneDark)
    );
    const onWest = i < 5;
    stone.position.set(onWest ? -W / 2 - 0.15 : W / 2 + 0.15, 0.4 + i % 5 * 0.85, -D / 2 + 0.4 + (i % 3) * 0.5);
    jailGroup.add(stone);
  }

  // Sloped tile roof (two pitches)
  const roof1 = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.18, D / 2 + 0.4), roofMat);
  roof1.position.set(0, H + 0.4, -D / 4);
  roof1.rotation.x = -0.25;
  roof1.castShadow = true;
  jailGroup.add(roof1);
  const roof2 = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.18, D / 2 + 0.4), roofMat);
  roof2.position.set(0, H + 0.4, D / 4);
  roof2.rotation.x = 0.25;
  roof2.castShadow = true;
  jailGroup.add(roof2);
  // Roof ridge
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.15, 0.25), stoneDark);
  ridge.position.set(0, H + 0.7, 0);
  jailGroup.add(ridge);
  // Top trim
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.25, D + 0.2), stoneDark);
  topTrim.position.y = H - 0.15;
  jailGroup.add(topTrim);

  // Stone CHIMNEY on the back
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), stoneMat);
  chimney.position.set(W / 3, H + 1.0, -D / 2 - 0.1);
  jailGroup.add(chimney);
  const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.85), stoneDark);
  chimneyTop.position.set(W / 3, H + 1.7, -D / 2 - 0.1);
  jailGroup.add(chimneyTop);
  // Small puff of grey "smoke" (purely decorative — a cloud-style sphere stack)
  for (let i = 0; i < 3; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18 + i * 0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0xC8CCD0, roughness: 1 }));
    puff.position.set(W / 3 + i * 0.1, H + 2 + i * 0.18, -D / 2 - 0.1);
    jailGroup.add(puff);
  }

  // BARS — thicker + decorative spikes on top
  for (let i = 0; i <= 10; i++) {
    const x = -W / 2 + i * (W / 10);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H, 10), barMat);
    bar.position.set(x, H / 2, D / 2);
    bar.castShadow = true;
    jailGroup.add(bar);
    // Spike
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), barMat);
    spike.position.set(x, H + 0.09, D / 2);
    jailGroup.add(spike);
  }
  // Horizontal cross-bars at 3 heights
  for (const y of [0.4, H / 2, H - 0.4]) {
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, W, 10), barMat);
    cross.position.set(0, y, D / 2);
    cross.rotation.z = Math.PI / 2;
    jailGroup.add(cross);
  }
  // Heavy padlock + chain at the centre
  const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0xC8B348, roughness: 0.3, metalness: 0.9 }));
  padlock.position.set(0, 2, D / 2 + 0.08);
  padlock.castShadow = true;
  jailGroup.add(padlock);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0xC8B348, roughness: 0.3, metalness: 0.9 }));
  shackle.position.set(0, 2.18, D / 2 + 0.08);
  shackle.rotation.x = Math.PI / 2;
  jailGroup.add(shackle);

  // SIGN above the bars — "JAIL"
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.8, 0.18), signMat);
  signBack.position.set(0, H + 1.3, D / 2 + 0.1);
  jailGroup.add(signBack);
  const sc = document.createElement('canvas');
  sc.width = 512; sc.height = 128;
  const ctx = sc.getContext('2d');
  ctx.fillStyle = '#E8DDC8'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 92px Nunito, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('JAIL', 256, 70);
  ctx.font = 'italic 28px Nunito, sans-serif';
  ctx.fillStyle = '#7A3E2A';
  ctx.fillText('— meadow correctional —', 256, 115);
  const signTex = new THREE.CanvasTexture(sc);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.7), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
  signPanel.position.set(0, H + 1.3, D / 2 + 0.21);
  jailGroup.add(signPanel);
  // Two small lanterns either side of the sign
  for (const lx of [-1.6, 1.6]) {
    const lantBracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), barMat);
    lantBracket.position.set(lx, H + 0.5, D / 2 + 0.2);
    jailGroup.add(lantBracket);
    const lant = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6, emissive: 0xFFD740, emissiveIntensity: 0.6 }));
    lant.position.set(lx, H + 0.85, D / 2 + 0.2);
    jailGroup.add(lant);
    const lantLight = new THREE.PointLight(0xFFD7A0, 0.6, 5);
    lantLight.position.set(lx, H + 0.85, D / 2 + 0.4);
    jailGroup.add(lantLight);
  }

  // Tiny barred WINDOW on the back wall
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.5), stoneDark);
  winFrame.position.set(-W / 4, H - 1.2, -D / 2 - 0.1);
  jailGroup.add(winFrame);
  const winHole = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.06), new THREE.MeshBasicMaterial({ color: 0x0A0A12 }));
  winHole.position.set(-W / 4, H - 1.2, -D / 2 - 0.3);
  jailGroup.add(winHole);
  for (let i = 0; i < 3; i++) {
    const wbar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), barMat);
    wbar.position.set(-W / 4 + (i - 1) * 0.2, H - 1.2, -D / 2 - 0.31);
    jailGroup.add(wbar);
  }

  // ── Cell interior ──
  // Bed cot with straw mattress + grey blanket
  const cotFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.0), new THREE.MeshStandardMaterial({ color: 0x5A4030, roughness: 0.85 }));
  cotFrame.position.set(-1.4, 0.15, -D / 2 + 0.7);
  jailGroup.add(cotFrame);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.9), strawMat);
  mattress.position.set(-1.4, 0.39, -D / 2 + 0.7);
  jailGroup.add(mattress);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.95), new THREE.MeshStandardMaterial({ color: 0x4A5868, roughness: 0.9 }));
  blanket.position.set(-1.2, 0.51, -D / 2 + 0.7);
  jailGroup.add(blanket);
  // Tiny pillow
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0xE8E4DC, roughness: 0.8 }));
  pillow.position.set(-2.2, 0.51, -D / 2 + 0.7);
  jailGroup.add(pillow);

  // Wood bucket
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.35, 14), new THREE.MeshStandardMaterial({ color: 0x6B4632, roughness: 0.85 }));
  bucket.position.set(2.2, 0.17, -D / 2 + 0.4);
  jailGroup.add(bucket);

  // Wall calendar with tally marks (drawn on canvas)
  const calCanvas = document.createElement('canvas');
  calCanvas.width = 256; calCanvas.height = 256;
  const cctx = calCanvas.getContext('2d');
  cctx.fillStyle = '#F0E8D0'; cctx.fillRect(0, 0, 256, 256);
  cctx.strokeStyle = '#3A2818'; cctx.lineWidth = 6;
  cctx.strokeRect(8, 8, 240, 240);
  cctx.fillStyle = '#3A2818';
  cctx.font = 'bold 24px Nunito, sans-serif';
  cctx.textAlign = 'center';
  cctx.fillText('DAYS HERE', 128, 40);
  // Tally marks
  cctx.lineWidth = 4;
  for (let r = 0; r < 4; r++) {
    for (let g = 0; g < 4; g++) {
      const x = 40 + g * 50, y = 80 + r * 40;
      cctx.beginPath();
      for (let i = 0; i < 4; i++) {
        cctx.moveTo(x + i * 6, y);
        cctx.lineTo(x + i * 6, y + 24);
      }
      cctx.moveTo(x - 4, y + 6);
      cctx.lineTo(x + 22, y + 18);
      cctx.stroke();
    }
  }
  const calTex = new THREE.CanvasTexture(calCanvas);
  calTex.colorSpace = THREE.SRGBColorSpace;
  const calendar = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: calTex, roughness: 0.85 }));
  calendar.position.set(W / 2 - 0.21, 2.0, -1.2);
  calendar.rotation.y = -Math.PI / 2;
  jailGroup.add(calendar);

  // Floor strewn with straw
  for (let i = 0; i < 12; i++) {
    const straw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.06), strawMat);
    straw.position.set(-W / 2 + 0.5 + Math.random() * (W - 1), 0.02, -D / 2 + 0.5 + Math.random() * (D - 1));
    straw.rotation.y = Math.random() * Math.PI;
    jailGroup.add(straw);
  }

  // Inside light (dim)
  const innerLight = new THREE.PointLight(0xFFCC8A, 0.7, 6);
  innerLight.position.set(0, H - 0.5, 0);
  jailGroup.add(innerLight);

  // ── Outside the jail ──
  // Cobbled path leading up to the bars
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 4), new THREE.MeshStandardMaterial({ color: 0x8E8580, roughness: 0.95 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.015, D / 2 + 2);
  jailGroup.add(path);
  // Individual cobble darker squares for texture
  for (let i = 0; i < 14; i++) {
    const cobble = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.45), new THREE.MeshStandardMaterial({ color: 0x6E665E, roughness: 0.95 }));
    cobble.position.set(-0.8 + (i % 3) * 0.8, 0.025, D / 2 + 0.4 + Math.floor(i / 3) * 0.8);
    jailGroup.add(cobble);
  }

  // Hedges along both sides of the path
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x3A6E2A, roughness: 0.9 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const hedge = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), hedgeMat);
      hedge.position.set(side * 1.8, 0.4, D / 2 + 0.8 + i * 0.9);
      hedge.castShadow = true;
      jailGroup.add(hedge);
    }
  }

  // WANTED poster pinned to a fence post outside
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x5A3A1E, roughness: 0.8 }));
  post.position.set(-2.6, 0.9, D / 2 + 2.5);
  jailGroup.add(post);
  const posterCanvas = document.createElement('canvas');
  posterCanvas.width = 256; posterCanvas.height = 384;
  const pctx = posterCanvas.getContext('2d');
  pctx.fillStyle = '#F2E5C2'; pctx.fillRect(0, 0, 256, 384);
  pctx.strokeStyle = '#3A2818'; pctx.lineWidth = 8;
  pctx.strokeRect(8, 8, 240, 368);
  pctx.fillStyle = '#3A2818';
  pctx.font = 'bold 56px Nunito, sans-serif';
  pctx.textAlign = 'center';
  pctx.fillText('WANTED', 128, 70);
  pctx.font = 'italic 22px Nunito, sans-serif';
  pctx.fillText('NO LONGER', 128, 100);
  pctx.font = 'bold 38px Nunito, sans-serif';
  pctx.fillText('SCRATCHETT', 128, 250);
  pctx.font = 'bold 22px Nunito, sans-serif';
  pctx.fillText('Acorn Thief · Caught', 128, 290);
  pctx.font = 'italic 18px Nunito, sans-serif';
  pctx.fillText('Reward: 0 acorns', 128, 330);
  pctx.fillStyle = '#C53B2F';
  pctx.font = 'bold 56px Nunito, sans-serif';
  pctx.save();
  pctx.translate(128, 180); pctx.rotate(-0.3);
  pctx.fillText('CAUGHT!', 0, 0);
  pctx.restore();
  const posterTex = new THREE.CanvasTexture(posterCanvas);
  posterTex.colorSpace = THREE.SRGBColorSpace;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.85 }));
  poster.position.set(-2.6, 1.4, D / 2 + 2.55);
  jailGroup.add(poster);

  // Reference position for the tease trigger
  jailGroup.userData.barsWorldPos = new THREE.Vector3(JAIL_POS.x, 1, JAIL_POS.z + D / 2 + 1);
})();
jailGroup.visible = false;  // Hidden until free-play unlocks

// Free-play SIGN POST in the meadow (also unlocks at the same time)
const freeplaySignPost = new THREE.Group();
freeplaySignPost.position.set(2, 0, 2);
scene.add(freeplaySignPost);
(function buildSignPost() {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4632, roughness: 0.85 });
  const arrowMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 10), woodMat);
  post.position.y = 1.2;
  post.castShadow = true;
  freeplaySignPost.add(post);
  function makeArrow(label, dir, color, yOff) {
    const grp = new THREE.Group();
    grp.position.y = yOff;
    grp.rotation.y = dir;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 0.06), arrowMat(color));
    plank.position.x = 0.55;
    grp.add(plank);
    // Point at the tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 4), arrowMat(color));
    tip.position.x = 1.18;
    tip.rotation.z = -Math.PI / 2;
    tip.rotation.y = Math.PI / 4;
    grp.add(tip);
    // Label
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const cx = c.getContext('2d');
    cx.fillStyle = '#FFFFFF';
    cx.font = 'bold 36px Nunito, sans-serif';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(label, 128, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const txt = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    txt.position.set(0.55, 0, 0.04);
    grp.add(txt);
    return grp;
  }
  // 4 directional arrows pointing at the buildings + jail
  // Compute approx direction from sign post (2, 0, 2) to each location
  function pointAt(targetX, targetZ) {
    return Math.atan2(targetX - 2, targetZ - 2);
  }
  freeplaySignPost.add(makeArrow('HOUSE',   pointAt(-12, -12),  0xC53B2F, 1.95));
  freeplaySignPost.add(makeArrow('SCHOOL',  pointAt(-26, -8),   0x7A3E2A, 1.6));
  freeplaySignPost.add(makeArrow('SHOP',    pointAt(14, -8),    0xB5732E, 1.25));
  freeplaySignPost.add(makeArrow('JAIL',    pointAt(20, 14),    0x444444, 0.9));
})();
freeplaySignPost.visible = false;
// Collider on the sign post so nothing walks through it
treeColliders.push({ x: 2, z: 2, r: 0.35 });

// ═══════════════════════════════════════════════════════
// MORE TOWN — extra buildings, props & collectible acorns
// (decor is always visible; collectibles + reactions are free-play only)
// ═══════════════════════════════════════════════════════
const townExtras = new THREE.Group();
scene.add(townExtras);

const townBuildings = [];   // {x, z (approach point), line, said}
function addTownBuilding(x, z, w, d, h, bodyColor, roofColor, signText, accentColor, approachLine) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  townExtras.add(g);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xF1F1EE, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.85 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0xDDF5FF, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.6 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4A2818, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const tt = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.28, d + 0.3), trimMat);
  tt.position.y = h - 0.14; g.add(tt);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.4, 4), roofMat);
  roof.position.y = h + 0.7; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.16), doorMat);
  door.position.set(0, 1.1, d / 2 + 0.05); g.add(door);
  for (const wx of [-w * 0.28, w * 0.28]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.2), winMat);
    win.position.set(wx, 1.7, d / 2 + 0.06); g.add(win);
  }
  const awn = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.8), new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.75 }));
  awn.position.set(0, 2.7, d / 2 + 0.45); awn.rotation.x = -0.2; g.add(awn);
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 96;
  const sx = sc.getContext('2d');
  sx.fillStyle = '#F1F1EE'; sx.fillRect(0, 0, 512, 96);
  sx.fillStyle = '#1a1a2e'; sx.font = 'bold 50px Nunito, sans-serif';
  sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.fillText(signText, 256, 52);
  const tex = new THREE.CanvasTexture(sc); tex.colorSpace = THREE.SRGBColorSpace;
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.9, 0.16), trimMat);
  signBack.position.set(0, h - 0.6, d / 2 + 0.18); g.add(signBack);
  const signPanel = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.88, 0.8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  signPanel.position.set(0, h - 0.6, d / 2 + 0.27); g.add(signPanel);
  treeColliders.push({ x, z, r: Math.max(w, d) / 2 + 0.2 });
  townBuildings.push({ x, z: z + d / 2 + 1.4, line: approachLine, said: 0 });
}
addTownBuilding(-22, 7, 7, 6, 5.5, 0x6E8BB0, 0x33405A, 'LIBRARY', 0x3E5C8A, 'The library! Hazel says it has every book in the city.');
addTownBuilding(8, 17, 7, 6, 5, 0xE0A85C, 0x8A5A2A, 'BAKERY', 0xC0392B, 'Mmm — fresh acorn-bread. Smells just like home.');
addTownBuilding(-8, 18, 6.5, 6, 5, 0x7FB069, 0x3E6B2A, 'TOY SHOP', 0xE0C341, 'Whoa! A whole window of toys. Maybe after the mystery…');
addTownBuilding(25, 3, 7, 6, 7, 0xC98AAB, 0x6B3A5A, 'CLOCK TOWER', 0x8A5A7A, 'The big clock chimes right across the whole meadow!');
addTownBuilding(27, -13, 6, 5.5, 5, 0x8AB0C9, 0x3A5A6B, 'POST OFFICE', 0x3A6B8A, 'Maybe I\'ll send a letter to my friends in Acornville.');

// One fetch side-mission per new building: find the lost item, bring it back.
// bi indexes townBuildings in creation order (0 Library … 4 Post Office).
const buildingMissions = [
  { name: 'The Library Book', bi: 0, ask: '(Librarian) Oh dear — a book has gone missing! Could you find it for me?', thanks: '(Librarian) My book! Bless you, dear.', ix: 6, iz: 5, color: 0x6E8BB0 },
  { name: 'The Runaway Bun', bi: 1, ask: '(Baker) A fresh bun rolled right out the door! Fetch it back?', thanks: '(Baker) My bun! You\'re a star.', ix: -3, iz: 9, color: 0xE0A85C },
  { name: 'The Missing Teddy', bi: 2, ask: '(Toymaker) A teddy went missing from the window. Find it?', thanks: '(Toymaker) Teddy\'s home! Thank you!', ix: 13, iz: 7, color: 0x7FB069 },
  { name: 'The Fallen Cog', bi: 3, ask: '(Clockkeeper) A cog fell off the great clock! Bring it back?', thanks: '(Clockkeeper) Tick-tock once more! Thank you.', ix: 18, iz: 4, color: 0xC98AAB },
  { name: 'The Stray Letter', bi: 4, ask: '(Postmaster) A letter blew away in the wind! Could you catch it?', thanks: '(Postmaster) Delivered at last. Thank you!', ix: 15, iz: 13, color: 0x8AB0C9 },
];
for (const m of buildingMissions) {
  const marker = new THREE.Group(); marker.position.set(m.ix, 0, m.iz);
  const icon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), new THREE.MeshStandardMaterial({ color: m.color, emissive: m.color, emissiveIntensity: 0.5, roughness: 0.5 }));
  icon.position.y = 0.7; marker.add(icon);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 4), new THREE.MeshBasicMaterial({ color: 0xFFE36B })); beam.position.y = 1.5; beam.rotation.x = Math.PI; marker.add(beam);
  marker.visible = false; townExtras.add(marker);
  m.marker = marker; m.icon = icon; m.state = 'todo';
}

// ── Central fountain ──
const fountain = new THREE.Group();
fountain.position.set(6, 0, 8);
townExtras.add(fountain);
(function buildFountain() {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xBFC4C9, roughness: 0.9 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x5BC6E8, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.8 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.6, 20), stoneMat);
  basin.position.y = 0.3; basin.castShadow = true; fountain.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.1, 20), waterMat);
  water.position.y = 0.58; fountain.add(water);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.2, 12), stoneMat);
  pillar.position.y = 1.1; fountain.add(pillar);
  const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 0.3, 16), stoneMat);
  topBowl.position.y = 1.7; fountain.add(topBowl);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), waterMat);
    drop.position.set(Math.cos(a) * 0.9, 1.3 + (i % 3) * 0.15, Math.sin(a) * 0.9);
    fountain.add(drop);
  }
})();
treeColliders.push({ x: 6, z: 8, r: 2.1 });

// ── Benches + lamp posts ──
function addBench(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; townExtras.add(g);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8A5A2E, roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), woodMat); seat.position.y = 0.5; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), woodMat); back.position.set(0, 0.75, -0.2); g.add(back);
  for (const lx of [-0.7, 0.7]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), woodMat); leg.position.set(lx, 0.25, 0); g.add(leg); }
  treeColliders.push({ x, z, r: 0.85 });
}
addBench(4, 5, 0); addBench(-4, 11, 0.6); addBench(12, 6, -0.5);

function addLamp(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); townExtras.add(g);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2A2A30, roughness: 0.6, metalness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 10), poleMat); pole.position.y = 1.6; pole.castShadow = true; g.add(pole);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshStandardMaterial({ color: 0xFFF1B8, emissive: 0xFFD86B, emissiveIntensity: 0.8 })); lantern.position.y = 3.3; g.add(lantern);
  treeColliders.push({ x, z, r: 0.3 });
}
addLamp(2, 6); addLamp(11, 11); addLamp(-6, 6); addLamp(16, 2);

// ── Bouncy mushroom jump-pads ──
const bouncePads = [];   // {x, z, g}
function addMushroom(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); townExtras.add(g);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xF0E6D2, roughness: 0.8 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xE05B4B, roughness: 0.7 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.6, 12), stemMat); stem.position.y = 0.3; stem.castShadow = true; g.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat); cap.position.y = 0.6; cap.scale.set(1, 0.7, 1); g.add(cap);
  for (let i = 0; i < 5; i++) { const spot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), new THREE.MeshStandardMaterial({ color: 0xFFFFFF })); const a = (i / 5) * Math.PI * 2; spot.position.set(Math.cos(a) * 0.35, 0.79, Math.sin(a) * 0.35); spot.rotation.x = -Math.PI / 2; g.add(spot); }
  g.userData.cap = cap;
  bouncePads.push({ x, z, g });
}
addMushroom(-2, 13); addMushroom(15, 10); addMushroom(9, -3);

// ── Collectible acorns (free-play) ──
const collectibles = [];   // {g, x, z, golden, collected}
let acornsCollected = 0;
const acornGroup = new THREE.Group();
acornGroup.visible = false;   // shown only in free-play
scene.add(acornGroup);
function addCollectibleAcorn(x, z, golden) {
  const g = new THREE.Group(); g.position.set(x, 0.7, z); acornGroup.add(g);
  const nutMat = new THREE.MeshStandardMaterial({ color: golden ? 0xFFD740 : 0xC98A4B, roughness: golden ? 0.3 : 0.7, metalness: golden ? 0.6 : 0, emissive: golden ? 0xFFB300 : 0x000000, emissiveIntensity: golden ? 0.45 : 0 });
  const capMat = new THREE.MeshStandardMaterial({ color: golden ? 0xB8860B : 0x6B4226, roughness: 0.7 });
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), nutMat); nut.scale.set(1, 1.3, 1); nut.castShadow = true; g.add(nut);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat); cap.position.y = 0.22; g.add(cap);
  collectibles.push({ g, x, z, golden, collected: false });
}
const ACORN_SPOTS = [[-3,4],[5,-3],[10,4],[-9,9],[3,11],[13,8],[-12,3],[0,-6],[18,6],[-15,11],[7,14],[-5,-2]];
for (const sp of ACORN_SPOTS) addCollectibleAcorn(sp[0], sp[1], false);
addCollectibleAcorn(JAIL_POS.x - 4, JAIL_POS.z + 4, true);   // golden acorn near the jail → provokes Scratchett

// Little HUD counter for collected acorns
let acornHudEl = null;
function setAcornHud(show) {
  if (!acornHudEl) {
    acornHudEl = document.createElement('div');
    acornHudEl.id = 'acorn-hud';
    const wrap = document.querySelector('.game-wrapper');
    if (wrap) wrap.appendChild(acornHudEl);
  }
  acornHudEl.textContent = `🌰 ${acornsCollected} / ${collectibles.length}`;
  acornHudEl.classList.toggle('show', !!show);
}

// ═══════════════════════════════════════════════════════
// EXTRA WORLDS + FAST TRAVEL (free-play) — placed far apart so each
// world is naturally out of view of the others (camera far plane = 500).
// ═══════════════════════════════════════════════════════
const ACORNVILLE_ORIGIN = new THREE.Vector3(0, 0, 2000);
const worldSpinners = [];   // {mesh, speed, axis} — rotated each free-play frame

// ── ACORNVILLE WORLD — Pico's cosy golden hometown (fast-travel from the city) ──
const acornvilleWorld = new THREE.Group();
acornvilleWorld.position.copy(ACORNVILLE_ORIGIN);
scene.add(acornvilleWorld);
(function buildAcornville() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0xC9A24A, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; acornvilleWorld.add(ground);
  // rolling golden-green hills around the edges
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x9FC85E, roughness: 0.95 });
  for (const h of [[-30, -34, 14], [28, -38, 18], [-40, 10, 16], [38, 16, 14], [0, -46, 20]]) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(h[2], 16, 12), hillMat);
    hill.position.set(h[0], -h[2] * 0.55, h[1]); hill.scale.set(1, 0.5, 1); acornvilleWorld.add(hill);
  }
  // big leafy oak trees
  function oak(x, z, s) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); acornvilleWorld.add(g);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3, 8), new THREE.MeshStandardMaterial({ color: 0x7A5230, roughness: 0.85 })); trunk.position.y = 1.5; trunk.castShadow = true; g.add(trunk);
    for (const c of [[0, 3.4, 0, 2], [-1.3, 3, 0.4, 1.4], [1.2, 3.1, -0.3, 1.5], [0.2, 4.1, 0.5, 1.3]]) {
      const blob = new THREE.Mesh(new THREE.SphereGeometry(c[3], 12, 10), new THREE.MeshStandardMaterial({ color: 0x5A9A3A, roughness: 0.85 })); blob.position.set(c[0], c[1], c[2]); blob.castShadow = true; g.add(blob);
    }
    treeColliders.push({ x: ACORNVILLE_ORIGIN.x + x, z: ACORNVILLE_ORIGIN.z + z, r: 0.7 * s });
  }
  oak(-14, -6, 1.3); oak(16, 4, 1.1); oak(-8, 12, 1); oak(22, -10, 1.2); oak(6, -16, 1);
  // cosy acorn-shaped cottages (domed body + acorn-cap roof + little door)
  function acornHouse(x, z, bodyCol, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; acornvilleWorld.add(g);
    const body = new THREE.Mesh(new THREE.SphereGeometry(2, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.85 }));
    body.scale.set(1, 1.1, 1); body.castShadow = true; g.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(2.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.5), new THREE.MeshStandardMaterial({ color: 0x7A4B26, roughness: 0.9 }));
    cap.position.y = 1.7; cap.scale.set(1, 0.6, 1); g.add(cap);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x5A3A1E })); stalk.position.y = 2.7; g.add(stalk);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.12), new THREE.MeshStandardMaterial({ color: 0x4A2818 })); door.position.set(0, 0.65, 2); g.add(door);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), new THREE.MeshStandardMaterial({ color: 0xFFE9A8, emissive: 0xFFD86B, emissiveIntensity: 0.3 })); win.position.set(1, 1.2, 1.55); g.add(win);
    treeColliders.push({ x: ACORNVILLE_ORIGIN.x + x, z: ACORNVILLE_ORIGIN.z + z, r: 2.1 });
  }
  acornHouse(-18, 2, 0xD98C5A, 0.3); acornHouse(14, -2, 0xCFA06A, -0.4); acornHouse(-4, -14, 0xC98A4B, 0.1); acornHouse(20, 10, 0xE0A85C, -0.2);
  // windmill with spinning sails
  const mill = new THREE.Group(); mill.position.set(-24, 0, -16); acornvilleWorld.add(mill);
  const millBody = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.9, 5, 12), new THREE.MeshStandardMaterial({ color: 0xE8DCC0, roughness: 0.9 })); millBody.position.y = 2.5; millBody.castShadow = true; mill.add(millBody);
  const millRoof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 12), new THREE.MeshStandardMaterial({ color: 0x8A3A2A })); millRoof.position.y = 5.7; mill.add(millRoof);
  const sails = new THREE.Group(); sails.position.set(0, 4, 2); mill.add(sails);
  for (let i = 0; i < 4; i++) { const sg = new THREE.Group(); sg.rotation.z = (i / 4) * Math.PI * 2; const sail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0xC97A3A })); sail.position.y = 1.6; sg.add(sail); sails.add(sg); }
  worldSpinners.push({ mesh: sails, speed: 0.5, axis: 'z' });
  treeColliders.push({ x: ACORNVILLE_ORIGIN.x - 24, z: ACORNVILLE_ORIGIN.z - 16, r: 1.9 });
  // village pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshStandardMaterial({ color: 0x4FA6C4, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.9 })); pond.rotation.x = -Math.PI / 2; pond.position.set(10, 0.02, 18); acornvilleWorld.add(pond);
  // wildflowers dotted about
  const flowerCols = [0xE8536B, 0xF0C53A, 0xB06BD8, 0xFFFFFF];
  for (let i = 0; i < 40; i++) {
    const fx = (Math.random() - 0.5) * 72, fz = (Math.random() - 0.5) * 72;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), new THREE.MeshStandardMaterial({ color: 0x4A8A2A })); stem.position.set(fx, 0.2, fz); acornvilleWorld.add(stem);
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: flowerCols[i % 4] })); flower.position.set(fx, 0.42, fz); acornvilleWorld.add(flower);
  }
  // "ACORNVILLE" welcome sign at the entrance
  const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 128;
  const sctx = signCanvas.getContext('2d'); sctx.fillStyle = '#F6E7C2'; sctx.fillRect(0, 0, 512, 128);
  sctx.strokeStyle = '#7A4B26'; sctx.lineWidth = 10; sctx.strokeRect(8, 8, 496, 112);
  sctx.fillStyle = '#5A3A1E'; sctx.font = 'bold 56px Nunito, sans-serif'; sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
  sctx.fillText('ACORNVILLE', 256, 66);
  const signTex = new THREE.CanvasTexture(signCanvas); signTex.colorSpace = THREE.SRGBColorSpace;
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x6B4632 })); signPost.position.set(0, 1.2, 15); acornvilleWorld.add(signPost);
  const signPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 })); signPanel.position.set(0, 2.2, 15); acornvilleWorld.add(signPanel);
  // warm low sun
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 16), new THREE.MeshBasicMaterial({ color: 0xFFE8A0 })); sun.position.set(20, 26, -44); acornvilleWorld.add(sun);
})();

// ── Acornville villagers — little acorn folk wandering, hopping and playing ──
function makeVillager(bodyCol) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 12), new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.7 }));
  body.scale.set(1, 1.3, 1); body.position.y = 0.65; body.castShadow = true; g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), new THREE.MeshStandardMaterial({ color: 0xF0DCC0, roughness: 0.8 }));
  belly.scale.set(1, 1.2, 0.5); belly.position.set(0, 0.6, 0.34); g.add(belly);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
  cap.position.y = 1.02; cap.scale.set(1, 0.7, 1); g.add(cap);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0x5A3A1E })); stalk.position.y = 1.3; g.add(stalk);
  for (const ex of [-0.16, 0.16]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x120D08 })); e.position.set(ex, 0.78, 0.44); g.add(e); }
  for (const fx of [-0.18, 0.18]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshStandardMaterial({ color: bodyCol })); f.position.set(fx, 0.13, 0.08); g.add(f); }
  return g;
}
const villagers = [];
const VILLAGER_COLS = [0xC98A4B, 0xD98C5A, 0xE0A85C, 0xCFA06A, 0xB07A3A, 0xE8C088, 0xC07848];
for (let i = 0; i < 8; i++) {
  const g = makeVillager(VILLAGER_COLS[i % VILLAGER_COLS.length]);
  g.position.set((Math.random() - 0.5) * 50, 0, (Math.random() - 0.5) * 50);
  acornvilleWorld.add(g);
  villagers.push({ g, tx: (Math.random() - 0.5) * 50, tz: (Math.random() - 0.5) * 50, speed: 1.6 + (i % 3) * 1.4, phase: i });
}
// Autumn: warm drifting leaves over Acornville
const leafGroup = new THREE.Group(); acornvilleWorld.add(leafGroup);
const LEAF_COLS = [0xCC6B2A, 0xD89A3A, 0xB5482A, 0xE0B84A];
for (let i = 0; i < 36; i++) {
  const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.16, 5), new THREE.MeshStandardMaterial({ color: LEAF_COLS[i % 4], side: THREE.DoubleSide, roughness: 0.9 }));
  leaf.position.set((Math.random() - 0.5) * 60, Math.random() * 12, (Math.random() - 0.5) * 60);
  leaf.userData = { sp: 0.8 + Math.random() * 1.2, sway: Math.random() * 6, rot: (Math.random() - 0.5) * 2 };
  leafGroup.add(leaf);
}
function updateVillagers(dt) {
  const now = performance.now();
  for (const lf of leafGroup.children) {
    lf.position.y -= lf.userData.sp * dt;
    lf.position.x += Math.sin(now * 0.001 + lf.userData.sway) * 0.4 * dt;
    lf.rotation.z += lf.userData.rot * dt; lf.rotation.x += dt;
    if (lf.position.y < 0.1) { lf.position.y = 12; lf.position.x = (Math.random() - 0.5) * 60; lf.position.z = (Math.random() - 0.5) * 60; }
  }
  for (const v of villagers) {
    const dx = v.tx - v.g.position.x, dz = v.tz - v.g.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      v.tx = (Math.random() - 0.5) * 55; v.tz = (Math.random() - 0.5) * 55;
    } else {
      v.g.position.x += (dx / d) * v.speed * dt;
      v.g.position.z += (dz / d) * v.speed * dt;
      v.g.rotation.y = Math.atan2(dx, dz);
      v.g.position.y = Math.abs(Math.sin(now * 0.006 * v.speed + v.phase)) * 0.22;   // happy hops
    }
  }
}

// ── Fast travel between worlds ──
const WORLDS = {
  meadow: { name: 'The Meadow', spawn: new THREE.Vector3(0, 0, 0) },
  acornville: { name: 'Acornville', spawn: new THREE.Vector3(ACORNVILLE_ORIGIN.x, 0, ACORNVILLE_ORIGIN.z + 18) },
};
let currentWorld = 'meadow';
let travelMenuOpen = false;

async function travelTo(key) {
  const w = WORLDS[key]; if (!w || controlsLocked) return;
  closeTravelMenu();
  controlsLocked = true;
  if (!quest.portalOpen) reJailSquirrel();   // cancel any chase, but leave a freed Scratchett be
  showFade(true);
  await sleep(700);
  newBedroomGroup.visible = false; schoolGroup.visible = false; butcherShopGroup.visible = false;
  currentWorld = key;
  player.position.copy(w.spawn); player.position.y = 0;
  facingY = 0; player.rotation.y = 0; playerVel.set(0, 0, 0); grounded = true;
  camState.target.set(w.spawn.x, 1.2, w.spawn.z); camState.distance = 7; camState.yaw = 0; camState.pitch = 0.28;
  updateCamera();
  await sleep(200);
  showFade(false);
  controlsLocked = false;
  if (key === 'meadow' && quest.bonusReady && !bonusActive && bonusBeaten() < BONUS_NAMES.length) {
    setObjective('Something\'s wrong in the city…');
    setTimeout(() => triggerNextBonus(), 1200);
    return;
  }
  setTimeout(() => showSpeech(`Welcome to ${w.name}!`, 2600), 400);
  if (key === 'acornville') setObjective('Home at last! Step through the portal by your old house to head back.');
  else setObjective('Free play — explore the meadow.');
}

function openTravelMenu() {
  if (!freePlayMode || controlsLocked || paused || travelMenuOpen || !quest.portalOpen) return;
  travelMenuOpen = true;
  let menu = document.getElementById('travel-menu');
  if (!menu) { menu = document.createElement('div'); menu.id = 'travel-menu'; document.querySelector('.game-wrapper').appendChild(menu); }
  menu.innerHTML = '<div class="travel-title">🗺️ FAST TRAVEL</div>' +
    Object.keys(WORLDS).map(k => `<button class="travel-opt" data-world="${k}">${WORLDS[k].name}${k === currentWorld ? ' — here' : ''}</button>`).join('') +
    '<button class="travel-close" id="travel-close">Cancel</button>';
  menu.classList.add('show');
  menu.querySelectorAll('.travel-opt').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.world;
    if (k !== currentWorld) travelTo(k); else closeTravelMenu();
  }));
  const c = document.getElementById('travel-close'); if (c) c.addEventListener('click', closeTravelMenu);
}
function closeTravelMenu() {
  travelMenuOpen = false;
  const menu = document.getElementById('travel-menu');
  if (menu) menu.classList.remove('show');
}

// Persistent on-screen Travel button (free-play)
let travelBtnEl = null;
function setTravelButton(show) {
  if (!travelBtnEl) {
    travelBtnEl = document.createElement('button');
    travelBtnEl.id = 'travel-btn';
    travelBtnEl.type = 'button';
    travelBtnEl.textContent = '🗺️ Travel';
    const wrap = document.querySelector('.game-wrapper');
    if (wrap) wrap.appendChild(travelBtnEl);
    travelBtnEl.addEventListener('click', () => { travelMenuOpen ? closeTravelMenu() : openTravelMenu(); });
  }
  travelBtnEl.classList.toggle('show', !!show);
}

// ═══════════════════════════════════════════════════════
// SIDE MISSIONS + THE ACORNVILLE PORTAL QUEST
// 3 meadow side missions → deal at Scratchett's cell → collect every
// acorn → he peacefully breaks out and opens a portal home to Acornville.
// ═══════════════════════════════════════════════════════
let quest = { missionsDone: 0, sm1: false, sm2: false, sm3: false, shopsVisited: new Set(), padsBounced: new Set(), dealAccepted: false, portalOpen: false, announced3: false };
function resetQuest() {
  quest = { missionsDone: 0, dealAccepted: false, portalOpen: false, announced3: false };
  for (const m of buildingMissions) { m.state = 'todo'; if (m.marker) m.marker.visible = false; }
  for (const m of acornvilleMissions) { m.state = 'todo'; if (m.marker) m.marker.visible = false; }
  for (const c of collectibles) { c.collected = false; c.g.visible = true; }
  acornsCollected = 0;
  meadowPortal.visible = false;
  currentWorld = 'meadow';
  setTravelButton(false);
}
function setObjective(text) {
  const objEl = document.getElementById('hud-objective');
  if (objEl) { objEl.classList.remove('hide'); objEl.querySelector('.objective-text').textContent = text; }
}
function onMissionDone(name) {
  quest.missionsDone++;
  playTone({ freq: 1046, dur: 0.18, type: 'sine', volume: 0.18 });
  showSpeech(`✅ Side mission done: ${name}! (${quest.missionsDone}/${buildingMissions.length})`, 3400);
  if (quest.missionsDone >= buildingMissions.length && !quest.announced3) {
    quest.announced3 = true;
    setTimeout(() => showSpeech('Every shop helped! Now — maybe Scratchett in the jail has a deal for you…', 4000), 1800);
  }
}

// North face button glyph (Triangle / X-Switch / Y-Xbox), or keyboard E
function northButtonLabel() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const id = (pad.id || '').toLowerCase();
    if (id.includes('dualsense') || id.includes('dualshock') || id.includes('sony') || id.includes('054c') || id.includes('0ce6') || id.includes('09cc') || id.includes('05c4')) return '△ Triangle';
    if (id.includes('057e') || id.includes('nintendo') || id.includes('switch') || id.includes('joy-con') || id.includes('pro controller')) return 'X';
    if (id.includes('xbox') || id.includes('xinput') || id.includes('045e') || id.includes('microsoft')) return 'Y';
    return 'Y';
  }
  return 'E';
}
function nearJailBars() {
  if (!jailGroup.userData || !jailGroup.userData.barsWorldPos) return false;
  const bp = jailGroup.userData.barsWorldPos;
  return Math.hypot(player.position.x - bp.x, player.position.z - bp.z) < 1.9;
}
function canMakeDeal() {
  return freePlayMode && !controlsLocked && !paused && quest.missionsDone >= buildingMissions.length && !quest.dealAccepted && squirrelInJail.visible && nearJailBars();
}
async function tryDeal() {
  if (!canMakeDeal()) return;
  quest.dealAccepted = true;
  setTauntPrompt(false);
  await showSpeechFromNPC('squirrel', 'Wait — don\'t taunt me, HELP me! Let me out and I\'ll open a magic portal home to Acornville!', 4400);
  await showSpeech('…A portal? Back to my old home?', 2400);
  await showSpeechFromNPC('squirrel', 'Bring me every last acorn in the meadow. Every one! Then I\'ll have the magic to open it.', 4400);
  setObjective(`Collect every acorn for Scratchett (${acornsCollected}/${collectibles.length})`);
  if (acornsCollected >= collectibles.length) completeDeal();   // already got them all
}
function completeDeal() {
  if (quest.portalOpen) return;
  quest.portalOpen = true;
  squirrelInJail.visible = false;
  squirrelEscaped = false; squirrelEscaping = false;
  squirrel.visible = true; squirrel.position.set(JAIL_POS.x, 0, JAIL_POS.z + 4); squirrel.rotation.y = Math.PI;
  meadowPortal.visible = true;
  setTravelButton(true);   // unlock the fast-travel button + M-menu now both worlds are reachable
  playTone({ freq: 1320, dur: 0.4, type: 'sine', volume: 0.2 });
  setTimeout(() => playTone({ freq: 1760, dur: 0.5, type: 'sine', volume: 0.18 }), 200);
  (async () => {
    await showSpeechFromNPC('squirrel', 'YES! Free at last — and a deal\'s a deal!', 3000);
    await showSpeechFromNPC('squirrel', 'There — a portal, right beside your house. It\'ll take you home to Acornville. Off you pop!', 4600);
    setObjective('Step through the portal beside your house → Acornville');
  })();
}

// ── Portals ──
function makePortal() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.22, 12, 32), new THREE.MeshStandardMaterial({ color: 0x9B6BFF, emissive: 0x7A3AFF, emissiveIntensity: 0.85, metalness: 0.4, roughness: 0.3 }));
  ring.position.y = 1.7; g.add(ring);
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(1.25, 24), new THREE.MeshBasicMaterial({ color: 0xC9A8FF, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  swirl.position.y = 1.7; g.add(swirl);
  g.userData.swirl = swirl;
  return g;
}
const MEADOW_PORTAL_POS = new THREE.Vector3(-6, 0, -9);   // right of Pico's new house
const meadowPortal = makePortal();
meadowPortal.position.copy(MEADOW_PORTAL_POS);
meadowPortal.visible = false;
scene.add(meadowPortal);
const acornvillePortal = makePortal();
acornvillePortal.position.set(5, 0, 16);   // local: right at the entrance/welcome sign, where you arrive — unmissable
acornvilleWorld.add(acornvillePortal);
const ACORNVILLE_PORTAL_WORLD = new THREE.Vector3(ACORNVILLE_ORIGIN.x + 5, 0, ACORNVILLE_ORIGIN.z + 16);

// ── Acornville side quests (same fetch pattern, hometown-flavoured) ──
// Givers are Acornville landmarks; positions are LOCAL to ACORNVILLE_ORIGIN.
const acornvilleMissions = [
  { name: 'The Picnic Basket', gx: -18, gz: 2, ix: -10, iz: 11, ask: '(Neighbour) I left my picnic basket out in the fields! Could you fetch it?', thanks: '(Neighbour) My basket! Lovely — thank you, Pico.', color: 0xE0A85C },
  { name: 'Granny\'s Wool', gx: 14, gz: -2, ix: 6, iz: -11, ask: '(Granny) Oh — my ball of wool rolled clean away! Be a dear?', thanks: '(Granny) Bless you, sweetheart.', color: 0xE8536B },
  { name: 'The Windmill Sail', gx: -24, gz: -16, ix: -12, iz: -6, ask: '(Miller) A sail-cloth blew off in the wind! Spot it for me?', thanks: '(Miller) Grand! She\'ll turn again now.', color: 0xC97A3A },
  { name: 'The Toy Boat', gx: 10, gz: 18, ix: 18, iz: 8, ask: '(Child) My little boat drifted right across the pond! Can you get it?', thanks: '(Child) My boat! Yay! Thank you!', color: 0x3AA8D8 },
];
for (const m of acornvilleMissions) {
  const marker = new THREE.Group(); marker.position.set(m.ix, 0, m.iz);
  const icon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), new THREE.MeshStandardMaterial({ color: m.color, emissive: m.color, emissiveIntensity: 0.5, roughness: 0.5 }));
  icon.position.y = 0.7; marker.add(icon);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 4), new THREE.MeshBasicMaterial({ color: 0xFFE36B })); beam.position.y = 1.5; beam.rotation.x = Math.PI; marker.add(beam);
  marker.visible = false; acornvilleWorld.add(marker);
  m.marker = marker; m.icon = icon; m.state = 'todo';
}
function updateAcornvilleMissions(px, pz) {
  for (const m of acornvilleMissions) {
    if (m.state === 'done') continue;
    const gwx = ACORNVILLE_ORIGIN.x + m.gx, gwz = ACORNVILLE_ORIGIN.z + m.gz;
    const iwx = ACORNVILLE_ORIGIN.x + m.ix, iwz = ACORNVILLE_ORIGIN.z + m.iz;
    if (m.state === 'todo' && Math.hypot(px - gwx, pz - gwz) < 3) {
      m.state = 'find'; m.marker.visible = true;
      showSpeech(m.ask, 3800);
      setObjective(`${m.name}: follow the glowing marker`);
    } else if (m.state === 'find' && Math.hypot(px - iwx, pz - iwz) < 1.3) {
      m.state = 'return'; m.marker.visible = false;
      playTone({ freq: 880, dur: 0.12, type: 'sine', volume: 0.15 });
      showSpeech('Got it! Take it back.', 2400);
      setObjective(`${m.name}: bring it back`);
    } else if (m.state === 'return' && Math.hypot(px - gwx, pz - gwz) < 3) {
      m.state = 'done';
      playTone({ freq: 1046, dur: 0.18, type: 'sine', volume: 0.18 });
      showSpeech(m.thanks, 3000);
      const c = acornvilleMissions.filter(x => x.state === 'done').length;
      setObjective(`Acornville quests: ${c}/${acornvilleMissions.length}`);
      if (c >= acornvilleMissions.length && !quest.acornvilleAllDone) {
        quest.acornvilleAllDone = true;
        quest.bonusReady = true;
        setTimeout(() => showSpeech('You\'ve helped all of Acornville! …but something feels wrong back in the city. Hurry home!', 4800), 1500);
      }
    }
  }
}

// A second Butcher instance lives inside the jail during free-play
const butcherInJail = makeSquirrel();  // legacy (free-play now uses squirrelInJail) — kept harmless
butcherInJail.scale.setScalar(0.85);
butcherInJail.visible = false;
scene.add(butcherInJail);

// ═══════════════════════════════════════════════════════
// NEW HOUSE in the meadow — Pico's new home
// ═══════════════════════════════════════════════════════
(function buildNewHouse() {
  const houseGroup = new THREE.Group();
  // Position the house at one end of the meadow, leaving an open garden in front of it
  houseGroup.position.set(-12, 0, -12);
  scene.add(houseGroup);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xF7E6C7, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9C3A2A, roughness: 0.75 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4E2A12, roughness: 0.65 });
  const winMat  = new THREE.MeshStandardMaterial({ color: 0x9DD9F2, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.75 });
  const winFrameMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.6 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });

  const W = 6, D = 5, H1 = 3, H2 = 3;
  const totalH = H1 + H2;

  // Main house body — 2 storeys
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, totalH, D), wallMat);
  body.position.y = totalH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  houseGroup.add(body);

  // Floor divider trim (between 1st and 2nd storey)
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.15, D + 0.1), trimMat);
  trim.position.y = H1;
  trim.castShadow = true;
  houseGroup.add(trim);

  // Pitched roof — two slanted planes plus end triangles
  const roofPitchA = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.15, D / 2 + 0.5), roofMat);
  roofPitchA.position.set(0, totalH + 0.7, -D / 4);
  roofPitchA.rotation.x = -Math.PI * 0.18;
  roofPitchA.castShadow = true;
  houseGroup.add(roofPitchA);
  const roofPitchB = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.15, D / 2 + 0.5), roofMat);
  roofPitchB.position.set(0, totalH + 0.7, D / 4);
  roofPitchB.rotation.x = Math.PI * 0.18;
  roofPitchB.castShadow = true;
  houseGroup.add(roofPitchB);
  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.0, 0.45), new THREE.MeshStandardMaterial({ color: 0x886666, roughness: 0.9 }));
  chimney.position.set(W * 0.3, totalH + 1.3, -D * 0.1);
  chimney.castShadow = true;
  houseGroup.add(chimney);

  // Front door (centered)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.12), doorMat);
  door.position.set(0, 1.0, D / 2 + 0.07);
  door.castShadow = true;
  houseGroup.add(door);
  // Door knob
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshStandardMaterial({ color: 0xC8A23A, metalness: 0.8, roughness: 0.3 }));
  knob.position.set(0.4, 1.0, D / 2 + 0.14);
  houseGroup.add(knob);
  // Welcome mat
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.6), new THREE.MeshStandardMaterial({ color: 0x6F4E2E, roughness: 0.95 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.005, D / 2 + 0.45);
  houseGroup.add(mat);

  // Windows — 2 ground floor (either side of door), 2 upper floor
  function addWindow(x, y) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.08), winFrameMat);
    frame.position.set(x, y, D / 2 + 0.05);
    houseGroup.add(frame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.78), winMat);
    glass.position.set(x, y, D / 2 + 0.1);
    houseGroup.add(glass);
    // Cross
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.78, 0.04), winFrameMat);
    cv.position.set(x, y, D / 2 + 0.11);
    houseGroup.add(cv);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.04), winFrameMat);
    ch.position.set(x, y, D / 2 + 0.11);
    houseGroup.add(ch);
  }
  addWindow(-2.0, 1.4);   // ground left
  addWindow( 2.0, 1.4);   // ground right
  addWindow(-1.6, 4.4);   // upper left
  addWindow( 1.6, 4.4);   // upper right

  // Small porch step
  const step = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 0.5), new THREE.MeshStandardMaterial({ color: 0xB0A48B, roughness: 0.85 }));
  step.position.set(0, 0.1, D / 2 + 0.25);
  step.receiveShadow = true;
  houseGroup.add(step);

  // ── Picket fence around a small garden plot in front of the house ──
  // Garden = the meadow area visible from the path
  const fenceY = 0.5;
  const POST_SPACING = 1.0;
  function addFenceSegment(x1, z1, x2, z2) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const segments = Math.floor(len / POST_SPACING);
    const angle = Math.atan2(z2 - z1, x2 - x1);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      // Picket
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), fenceMat);
      picket.position.set(px, fenceY, pz);
      picket.castShadow = true;
      houseGroup.add(picket);
      // Pointy tip
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 4), fenceMat);
      tip.position.set(px, fenceY + 0.4, pz);
      tip.rotation.y = Math.PI / 4;
      houseGroup.add(tip);
    }
    // Horizontal rails (top and bottom)
    for (const railY of [fenceY - 0.15, fenceY + 0.2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), fenceMat);
      rail.position.set((x1 + x2) / 2, railY, (z1 + z2) / 2);
      rail.rotation.y = -angle;
      houseGroup.add(rail);
    }
  }
  // 3-sided fence (front + 2 sides), leaving the back open
  addFenceSegment(-4.5, D / 2 + 4, 4.5, D / 2 + 4);     // front
  addFenceSegment(-4.5, D / 2 + 4, -4.5, D / 2 + 0.5);  // left side
  addFenceSegment( 4.5, D / 2 + 4,  4.5, D / 2 + 0.5);  // right side

  // Mailbox by the gate
  const mailPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x4E2A12, roughness: 0.7 }));
  mailPost.position.set(-3.8, 0.5, D / 2 + 3.8);
  mailPost.castShadow = true;
  houseGroup.add(mailPost);
  const mailbox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0x3F6FB5, roughness: 0.5 }));
  mailbox.position.set(-3.8, 1.1, D / 2 + 3.8);
  mailbox.castShadow = true;
  houseGroup.add(mailbox);
  const mailFlag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.18), new THREE.MeshStandardMaterial({ color: 0xCC2222 }));
  mailFlag.position.set(-3.6, 1.18, D / 2 + 3.8);
  houseGroup.add(mailFlag);

  // Stone path from gate to door
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xB0A48B, roughness: 0.95 });
  for (let i = 0; i < 6; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.6), pathMat);
    slab.position.set(0, 0.03, D / 2 + 3.6 - i * 0.5);
    slab.receiveShadow = true;
    houseGroup.add(slab);
  }

  // Floating objective marker above the door — bouncing glowing star
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xFFD740,
    emissive: 0xFFA000,
    emissiveIntensity: 0.8,
    metalness: 0.5,
    roughness: 0.2
  });
  const starGeo = new THREE.OctahedronGeometry(0.35, 0);
  const star = new THREE.Mesh(starGeo, starMat);
  star.position.set(0, totalH + 0.5, D / 2 + 1.2);
  star.castShadow = true;
  houseGroup.add(star);
  scene.userData.objectiveStar = star;
  scene.userData.objectiveStarPos = new THREE.Vector3();
  star.getWorldPosition(scene.userData.objectiveStarPos);

  // Save reference so the cutscene can spawn the player on the welcome mat
  scene.userData.newHouseGroup = houseGroup;
  scene.userData.newHouseSpawn = new THREE.Vector3(-12, 0, -12 + D / 2 + 3.5);  // just inside the front gate
  // AABB collider for the house body (Pico can't walk through walls)
  scene.userData.houseCollider = {
    minX: -12 - W / 2 - 0.2,
    maxX: -12 + W / 2 + 0.2,
    minZ: -12 - D / 2 - 0.2,
    maxZ: -12 + D / 2 + 0.2
  };
})();

// ─── Camera ───────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

// Camera orbit state (manually managed for full control)
const camState = {
  target: new THREE.Vector3(0, 1, 0),
  distance: 5.0,
  yaw: 0,
  pitch: 0.35,
  minDist: 2.5,
  maxDist: 12,
  minPitch: 0.05,
  maxPitch: 1.2
};

// Camera shake state (additive offset that decays each frame)
const shake = { intensity: 0, decayPerSec: 4 };
function addShake(amount) { shake.intensity = Math.min(0.6, shake.intensity + amount); }

function updateCamera() {
  const x = Math.sin(camState.yaw) * Math.cos(camState.pitch) * camState.distance;
  const z = Math.cos(camState.yaw) * Math.cos(camState.pitch) * camState.distance;
  const y = Math.sin(camState.pitch) * camState.distance;
  let sx = 0, sy = 0, sz = 0;
  if (shake.intensity > 0.001) {
    sx = (Math.random() - 0.5) * shake.intensity;
    sy = (Math.random() - 0.5) * shake.intensity;
    sz = (Math.random() - 0.5) * shake.intensity;
  }
  let cx = camState.target.x + x + sx;
  let cy = camState.target.y + y + sy;
  let cz = camState.target.z + z + sz;
  // Inside the house? Keep the camera within the building shell so it never
  // slips behind a wall (the rooms are small and there's no camera collision,
  // so a distance-6 orbit cam would otherwise end up outside, showing wall).
  if (newBedroomGroup.visible) {
    const ox = NEW_BEDROOM_ORIGIN.x, oz = NEW_BEDROOM_ORIGIN.z;
    cx = clamp(cx, ox - 4.5, ox + 4.5);
    cz = clamp(cz, oz - 7.5, oz + 7.5);
    cy = clamp(cy, 0.6, 5.5);
  }
  camera.position.set(cx, cy, cz);
  camera.lookAt(camState.target);
}

// Mouse drag controls
let rightDragging = false;
let lastMouseX = 0, lastMouseY = 0;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
  if (e.button === 2) {
    rightDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});
window.addEventListener('mouseup', () => { rightDragging = false; });
window.addEventListener('mousemove', e => {
  if (!rightDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  camState.yaw -= dx * 0.005;
  camState.pitch = clamp(camState.pitch - dy * 0.005, camState.minPitch, camState.maxPitch);
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camState.distance = clamp(camState.distance + e.deltaY * 0.01, camState.minDist, camState.maxDist);
}, { passive: false });

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ─── Input ────────────────────────────────────────────
const keys = {};

function toggleDance() {
  if (!mixer || !pico) return;
  // Cycle through the fun dance pack, each plays for ~6s before auto state resumes
  let name;
  for (let i = 0; i < FUN_DANCES.length; i++) {
    const candidate = FUN_DANCES[(danceQueueIndex + i) % FUN_DANCES.length];
    if (actions[candidate]) { name = candidate; break; }
  }
  if (!name) return;
  danceQueueIndex = (danceQueueIndex + 1) % FUN_DANCES.length;
  manualDance = name;
  manualDanceUntil = performance.now() + 6000;  // 6s of dancing then back to auto
  // If the mixer was paused (idle-still), wake it so the dance actually plays
  if (mixer.timeScale === 0) setStillMode(false);
  playAction(name, 0.2);
  // Reset idle timer so the auto state machine doesn't immediately re-pause
  idleStartTime = 0;
  console.log('Dance:', name);
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyT') toggleDance();
  if (e.code === 'KeyR') resetPlayer();
  if (e.code === 'KeyY') tryTaunt();   // taunt Scratchett at the jail (free-play)
  if (e.code === 'KeyE') tryDeal();    // make the portal deal at the cell (after 5 missions)
  if (e.code === 'KeyM') openTravelMenu();   // fast-travel menu (once the portal's unlocked)
});

function resetPlayer() {
  player.position.set(0, 0, 0);
  playerVel.set(0, 0, 0);
  facingY = 0;
  player.rotation.y = 0;
  grounded = true;
}
window.addEventListener('keyup', e => { keys[e.code] = false; });

// If the window loses focus (alt-tab, etc.), clear all keys so Pico doesn't run forever
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
});

// ─── Touch controls (mobile / iPad) ───────────────────
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const touchInput = { x: 0, y: 0, jump: false, sprint: false };

if (isTouch) {
  const touchEl = document.getElementById('touch-controls');
  const stick = document.getElementById('touch-stick');
  const knob = document.getElementById('touch-stick-knob');
  const jumpBtn = document.getElementById('touch-jump');
  const danceBtn = document.getElementById('touch-dance');

  if (touchEl) touchEl.classList.add('show');

  let stickId = null;
  let stickCenter = { x: 0, y: 0 };
  const STICK_R = 70;
  const KNOB_R = 50;

  function setKnob(dx, dy) {
    const len = Math.hypot(dx, dy);
    const max = STICK_R - 15;
    let nx = dx, ny = dy;
    if (len > max) {
      nx = (dx / len) * max;
      ny = (dy / len) * max;
    }
    knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    touchInput.x = nx / max;  // -1..1
    touchInput.y = ny / max;
  }

  function resetKnob() {
    knob.style.transform = 'translate(-50%, -50%)';
    touchInput.x = 0;
    touchInput.y = 0;
  }

  if (stick) {
    stick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      stickId = t.identifier;
      const rect = stick.getBoundingClientRect();
      stickCenter.x = rect.left + rect.width / 2;
      stickCenter.y = rect.top + rect.height / 2;
      setKnob(t.clientX - stickCenter.x, t.clientY - stickCenter.y);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (stickId === null) return;
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          setKnob(t.clientX - stickCenter.x, t.clientY - stickCenter.y);
          e.preventDefault();
        }
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          stickId = null;
          resetKnob();
        }
      }
    });

    window.addEventListener('touchcancel', () => {
      stickId = null;
      resetKnob();
    });
  }

  if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); touchInput.jump = true; }, { passive: false });
    jumpBtn.addEventListener('touchend', e => { e.preventDefault(); touchInput.jump = false; }, { passive: false });
  }
  if (danceBtn) {
    danceBtn.addEventListener('touchstart', e => { e.preventDefault(); toggleDance(); }, { passive: false });
  }
  // SPRINT — toggle on/off (tap to lock so the user doesn't have to hold)
  const sprintBtn = document.getElementById('touch-sprint');
  if (sprintBtn) {
    sprintBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      touchInput.sprint = !touchInput.sprint;
      sprintBtn.classList.toggle('active', touchInput.sprint);
    }, { passive: false });
  }
  // PAUSE button in the top-right corner — guard against touchstart+click double-fire
  const pauseBtn = document.getElementById('touch-pause');
  if (pauseBtn) {
    let pauseDebounce = 0;
    const tryTogglePause = () => {
      const now = performance.now();
      if (now - pauseDebounce < 250) return;   // ignore second tap within 250ms
      pauseDebounce = now;
      if (!controlsLocked) setPaused(!paused);
    };
    pauseBtn.addEventListener('touchstart', e => { e.preventDefault(); tryTogglePause(); }, { passive: false });
    pauseBtn.addEventListener('click', tryTogglePause);
  }
}

const gamepadPrev = { dance: false, start: false, taunt: false };
function readInput() {
  // During cutscenes the player can't drive Pico
  if (controlsLocked) return { mx: 0, mz: 0, sprint: false, jump: false };

  let mx = 0, mz = 0;
  if (keys['KeyA']) mx -= 1;
  if (keys['KeyD']) mx += 1;
  if (keys['KeyW']) mz -= 1;
  if (keys['KeyS']) mz += 1;

  let sprint = keys['ShiftLeft'] || keys['ShiftRight'];
  let jump = keys['Space'];

  // Touch joystick
  if (Math.abs(touchInput.x) > 0.05 || Math.abs(touchInput.y) > 0.05) {
    mx = touchInput.x;
    mz = touchInput.y;
  }
  if (touchInput.jump) jump = true;
  if (touchInput.sprint) sprint = true;

  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && pads[0];
  if (pad) {
    const lx = pad.axes[0] || 0;
    const ly = pad.axes[1] || 0;
    if (Math.abs(lx) > 0.15) mx = lx;
    if (Math.abs(ly) > 0.15) mz = ly;

    const rx = pad.axes[2] || 0;
    const ry = pad.axes[3] || 0;
    if (Math.abs(rx) > 0.15) camState.yaw -= rx * 0.035;
    if (Math.abs(ry) > 0.15) camState.pitch = clamp(camState.pitch - ry * 0.025, camState.minPitch, camState.maxPitch);

    if (pad.buttons[7] && pad.buttons[7].pressed) sprint = true;  // R2
    if (pad.buttons[0] && pad.buttons[0].pressed) jump = true;    // Cross
    // North face button (Triangle / X-Switch / Y-Xbox) — make a deal at the cell, else dance
    if (pad.buttons[3] && pad.buttons[3].pressed && !gamepadPrev.dance) {
      if (canMakeDeal()) tryDeal(); else toggleDance();
    }
    gamepadPrev.dance = !!(pad.buttons[3] && pad.buttons[3].pressed);
    // West face button (Square / X / Y) — taunt Scratchett, edge-triggered
    if (pad.buttons[2] && pad.buttons[2].pressed && !gamepadPrev.taunt) {
      tryTaunt();
    }
    gamepadPrev.taunt = !!(pad.buttons[2] && pad.buttons[2].pressed);
    // Options / Start (button 9) — toggle pause, edge-triggered
    if (pad.buttons[9] && pad.buttons[9].pressed && !gamepadPrev.start) {
      if (!controlsLocked) setPaused(!paused);
    }
    gamepadPrev.start = !!(pad.buttons[9] && pad.buttons[9].pressed);
  }

  // Clamp diagonal
  const mag = Math.sqrt(mx * mx + mz * mz);
  if (mag > 1) { mx /= mag; mz /= mag; }

  return { mx, mz, sprint, jump };
}

// ─── Load Pico ────────────────────────────────────────
setLoading(25, 'Loading Pico…');

const loader = new GLTFLoader();
// `player` is a parent Group whose origin is at Pico's FEET on the ground.
// `pico` is the imported gltf model nested inside, offset so model feet align with parent origin.
const player = new THREE.Group();
player.name = 'player';
scene.add(player);

let pico = null;
let mixer = null;
let animationsLoaded = false;
let modelLoaded = false;
let startButtonRevealed = false;

function revealStartButton() {
  // Both async loads must finish before we let the player tap to begin —
  // otherwise the intro cutscene runs with no actions[] map and Pico stays in T-pose.
  if (!animationsLoaded || !modelLoaded) return;
  if (startButtonRevealed) return;
  startButtonRevealed = true;
  setLoading(100, 'Tap to begin!');
  const startBtn = document.getElementById('start-btn');
  let chosen = false;
  const pickIntro = () => {
    if (chosen) return;
    chosen = true;
    beginIntro();
  };
  if (startBtn) {
    startBtn.textContent = 'Tap to begin';
    startBtn.classList.add('show');
    startBtn.addEventListener('click', pickIntro);
  } else {
    beginIntro();
  }

  // If the player has already beaten the game, also offer "Continue Free Play"
  let freeplayUnlocked = false;
  try { freeplayUnlocked = localStorage.getItem('wonkyAcorn_freeplayUnlocked') === '1'; } catch (e) {}
  if (freeplayUnlocked) {
    const loadingCard = document.querySelector('#loading .loading-card');
    if (loadingCard && !document.getElementById('freeplay-btn')) {
      const fpBtn = document.createElement('button');
      fpBtn.id = 'freeplay-btn';
      fpBtn.type = 'button';
      fpBtn.textContent = '🌰 Continue Free Play';
      fpBtn.style.cssText = 'display:block;margin:12px auto 0;padding:12px 28px;font-family:Nunito,sans-serif;font-weight:900;font-size:14px;background:transparent;color:#FFE99C;border:2px solid rgba(255,215,64,0.5);border-radius:999px;cursor:pointer;letter-spacing:0.5px';
      fpBtn.addEventListener('click', () => {
        if (chosen) return;
        chosen = true;
        ensureAudio();
        // Reveal Pico fully then jump straight to free-play
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        enterFreePlay();
      });
      loadingCard.appendChild(fpBtn);
    }
  }
}
// animation state machine
const actions = {};         // name -> AnimationAction
let currentActionName = null;
let danceQueueIndex = 0;    // for cycling fun dances with T key
const FUN_DANCES = [
  'Bubble_Dance', 'All_Night_Dance', 'Boom_Dance', 'Cardio_Dance',
  'FunnyDancing_02', 'FunnyDancing_03', 'Gangnam_Groove', 'Bass_Beats',
  'Big_Wave_Hello', 'Kung_Fu_Punch', 'One_Arm_Handstand', 'Breakdance_1990'
];
let manualDance = null;     // if set, override automatic state machine
let manualDanceUntil = 0;   // ms timestamp when manual dance returns to auto
const playerVel = new THREE.Vector3();
let grounded = true;
let facingY = 0;
const TARGET_HEIGHT = 1.05;  // Pico — smaller so he's not a giant in buildings, still tallest acorn

loader.load(
  'assets/models/pico.glb',
  (gltf) => {
    pico = gltf.scene;

    // Compute bounding box (pre-scale, world-space at model's current transform)
    const box = new THREE.Box3().setFromObject(pico);
    const size = new THREE.Vector3();
    box.getSize(size);
    const height = size.y;

    // Detect empty/broken GLB before continuing — better than silent invisible player
    let meshCount = 0;
    pico.traverse(o => { if (o.isMesh) meshCount++; });
    if (meshCount === 0 || !(height > 0) || !isFinite(height)) {
      console.error('Pico GLB loaded but contains no usable meshes', { meshCount, height });
      showFatalError(
        'Pico\'s 3D model is empty or broken.',
        'Try reloading the page. If it keeps happening, the model file may need to be re-downloaded.'
      );
      pico = null;
      return;
    }

    let scale = 1;
    if (height > 0 && isFinite(height)) {
      scale = TARGET_HEIGHT / height;
      pico.scale.setScalar(scale);
    }

    // After scaling, recompute the bounding box and offset pico DOWN
    // so its feet land at player.position (which is at world (0,0,0)).
    const newBox = new THREE.Box3().setFromObject(pico);
    pico.position.y -= newBox.min.y;

    // Enable shadows — character casts but does NOT receive (avoids shadow acne on small face meshes)
    pico.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    });

    // Add to the player Group (not the scene directly).
    // Player.position now represents feet-on-ground.
    player.add(pico);
    modelLoaded = true;

    // (picoStill removed — Noah wants the regular animated Pico always.
    //  Cutscene/idle "stillness" is now done by pausing the mixer.)

    // pico.glb's built-in is just T-pose (1 frame). Real animations live in pico_anims.glb (20+ clips).
    mixer = new THREE.AnimationMixer(pico);

    setLoading(80, 'Loading animations…');
    loader.load(
      'assets/models/pico_anims.glb',
      (animGltf) => {
        if (animGltf.animations && animGltf.animations.length > 0) {
          for (const clip of animGltf.animations) {
            actions[clip.name] = mixer.clipAction(clip);
            console.log('  loaded animation:', clip.name, 'duration:', clip.duration.toFixed(2));
          }
          console.log('Total animations loaded:', Object.keys(actions).length);
          playAction('Bubble_Dance');
        }
        // Now that animations are ready, reveal the Tap to begin button
        animationsLoaded = true;
        revealStartButton();
      },
      undefined,
      (err) => {
        console.warn('Animations file failed to load — Pico will be a T-pose statue:', err);
        animationsLoaded = true;
        revealStartButton();
      }
    );

    // Don't reveal the start button until BOTH the Pico model and the
    // animations GLB are loaded — otherwise the player can click into a
    // T-posed cutscene where playAction silently no-ops.
    setLoading(95, 'Loading animations…');
    setTimeout(() => {
      // If the user clicked "Load" in the pause menu before this reload,
      // jump straight to the saved checkpoint and skip the start screen.
      if (applyPendingLoadIfAny()) return;
      // If animations finished loading before the model, this will run now;
      // otherwise the anim-load callback will call it
      revealStartButton();
    }, 300);
  },
  (xhr) => {
    if (xhr.lengthComputable) {
      const pct = 25 + (xhr.loaded / xhr.total) * 65;
      setLoading(pct, 'Loading Pico…');
    }
  },
  (err) => {
    console.error('Failed to load Pico:', err);
    showFatalError(
      'Could not load Pico.',
      'Check your internet connection and reload the page.'
    );
  }
);

// ─── Game loop ────────────────────────────────────────
const clock = new THREE.Clock();
const TURN_SPEED = 12;
const ACCEL = 14;
const DECEL = 16;
const WALK_SPEED = 4.5;
const SPRINT_MULT = 1.8;
const JUMP_FORCE = 8;
const GRAVITY = 22;
let prevJump = false;
let rafHandle = null;

// Frame-rate-independent exponential smoothing factor
function smooth(rate, dt) { return 1 - Math.exp(-rate * dt); }

// "Still mode" used during cutscenes + brief idle moments.
// Noah wants ALWAYS the regular animated Pico (no static swap), so this is
// implemented by pausing the animation mixer in place. Pico freezes mid-pose.
function setStillMode(on) {
  if (!mixer) return;
  if (on) {
    // Pause the rig — Pico stays in whatever pose he was last in
    mixer.timeScale = 0;
  } else {
    mixer.timeScale = 1;
    currentActionName = null;  // let the state machine re-pick a clip
  }
}

// Crossfade to a named animation. Safe to call every frame — it ignores no-op transitions.
function playAction(name, fadeTime = 0.25, opts = {}) {
  if (!mixer || !actions[name] || currentActionName === name) return;
  const next = actions[name];
  next.reset();
  next.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, opts.once ? 1 : Infinity);
  if (opts.once) next.clampWhenFinished = true;
  next.timeScale = opts.speed || 1;
  next.enabled = true;
  next.fadeIn(fadeTime);
  next.play();
  if (currentActionName && actions[currentActionName]) {
    actions[currentActionName].fadeOut(fadeTime);
  }
  currentActionName = name;
}

// Track when the player became idle so Pico only dances after 10s of no input.
// Idle (< 10s) → static Pico standing pose. Idle (≥ 10s) → Bubble_Dance.
let idleStartTime = 0;
let lastControlsLocked = false;
const IDLE_BEFORE_DANCE_MS = 10000;

// Decide which animation should be playing based on the current player state
function chooseAnimationState({ moving, grounded, sprinting, speed }) {
  // Manual override (T to dance, cutscene wave, etc.) — let it play until time expires
  if (manualDance && performance.now() < manualDanceUntil) {
    return manualDance;
  }
  manualDance = null;

  if (!grounded) {
    idleStartTime = 0;
    return 'Basic_Jump';
  }
  if (moving) {
    idleStartTime = 0;
    if (sprinting && actions['Running']) return 'Running';
    if (actions['Walking']) return 'Walking';
  }
  // Player is idle (standing still). Track how long they've been idle.
  if (idleStartTime === 0) idleStartTime = performance.now();
  const idleMs = performance.now() - idleStartTime;
  if (idleMs >= IDLE_BEFORE_DANCE_MS) return 'Bubble_Dance';
  // Brief idle — return special key meaning "freeze pose / static Pico"
  return '__idle_still__';
}

function tick() {
  rafHandle = requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  // Decay camera shake toward 0
  if (shake.intensity > 0) {
    shake.intensity = Math.max(0, shake.intensity - shake.decayPerSec * dt);
  }

  if (pico) {
    const input = readInput();

    // Camera-relative move direction
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveDir = new THREE.Vector3();
    if (Math.abs(input.mx) > 0.05 || Math.abs(input.mz) > 0.05) {
      moveDir.addScaledVector(camRight, input.mx);
      moveDir.addScaledVector(camForward, -input.mz);
      if (moveDir.length() > 1) moveDir.normalize();
    }
    const moving = moveDir.length() > 0.1;

    const speed = WALK_SPEED * (input.sprint ? SPRINT_MULT : 1);
    const targetX = moveDir.x * speed;
    const targetZ = moveDir.z * speed;
    const rate = moving ? ACCEL : DECEL;
    playerVel.x += (targetX - playerVel.x) * smooth(rate, dt);
    playerVel.z += (targetZ - playerVel.z) * smooth(rate, dt);

    // Gravity + jump
    if (!grounded) playerVel.y -= GRAVITY * dt;
    if (input.jump && !prevJump && grounded) {
      playerVel.y = JUMP_FORCE;
      grounded = false;
    }
    prevJump = input.jump;

    // Apply velocity to the PLAYER (parent group), not the pico model.
    // player.position.y == 0 means feet are on ground.
    player.position.x += playerVel.x * dt;
    player.position.y += playerVel.y * dt;
    player.position.z += playerVel.z * dt;

    // Determine the floor Y at the player's XZ. Inside the new house this is
    // the staircase height (upstairs Y on the bedroom floor, 0 downstairs, and
    // graduated on the stairs themselves).
    let floorY = 0;
    if (newBedroomGroup.visible) {
      const lx = player.position.x - NEW_BEDROOM_ORIGIN.x;
      const lz = player.position.z - NEW_BEDROOM_ORIGIN.z;
      // Only treat house geometry as ground if the player is inside the footprint
      if (lx >= -5.2 && lx <= 5.2 && lz >= -8.2 && lz <= 8.2) {
        floorY = getHouseFloorY(lx, lz, player.position.y);
      }
    }
    const STEP_SNAP_DOWN = 0.8;   // up to ~1.5 stair-rises — walking down feels smooth, big falls still fall
    if (player.position.y <= floorY) {
      // Below or at floor — push up to floor (handles walking UP stairs too)
      if (!grounded && playerVel.y < -3) {
        addShake(Math.min(0.25, Math.abs(playerVel.y) * 0.025));
        emitDust(player.position.x, player.position.z);
        emitDust(player.position.x + 0.3, player.position.z);
        emitDust(player.position.x - 0.3, player.position.z);
      }
      player.position.y = floorY;
      playerVel.y = 0;
      grounded = true;
    } else if (grounded && playerVel.y <= 0 && (player.position.y - floorY) <= STEP_SNAP_DOWN) {
      // Walking onto a slightly lower step — snap down instead of becoming airborne
      player.position.y = floorY;
      playerVel.y = 0;
      grounded = true;
    } else {
      // Above the floor and out of step-snap range — actually airborne
      grounded = false;
    }

    // Butcher storefront collision — solid building exterior
    {
      const sf = BUTCHER_STOREFRONT_POS;
      const r = 0.4, halfW = 4.2, halfD = 3.7;
      const px = player.position.x, pz = player.position.z;
      if (px > sf.x - halfW - r && px < sf.x + halfW + r && pz > sf.z - halfD - r && pz < sf.z + halfD + r) {
        const oL = (px + r) - (sf.x - halfW);
        const oR = (sf.x + halfW) - (px - r);
        const oF = (pz + r) - (sf.z - halfD);
        const oB = (sf.z + halfD) - (pz - r);
        const m = Math.min(oL, oR, oF, oB);
        if (m === oL)      { player.position.x = sf.x - halfW - r; if (playerVel.x > 0) playerVel.x = 0; }
        else if (m === oR) { player.position.x = sf.x + halfW + r; if (playerVel.x < 0) playerVel.x = 0; }
        else if (m === oF) { player.position.z = sf.z - halfD - r; if (playerVel.z > 0) playerVel.z = 0; }
        else               { player.position.z = sf.z + halfD + r; if (playerVel.z < 0) playerVel.z = 0; }
      }
    }
    // School storefront collision
    {
      const sf = SCHOOL_STOREFRONT_POS;
      const r = 0.4, halfW = 5.2, halfD = 3.2;
      const px = player.position.x, pz = player.position.z;
      if (px > sf.x - halfW - r && px < sf.x + halfW + r && pz > sf.z - halfD - r && pz < sf.z + halfD + r) {
        const oL = (px + r) - (sf.x - halfW);
        const oR = (sf.x + halfW) - (px - r);
        const oF = (pz + r) - (sf.z - halfD);
        const oB = (sf.z + halfD) - (pz - r);
        const m = Math.min(oL, oR, oF, oB);
        if (m === oL)      { player.position.x = sf.x - halfW - r; if (playerVel.x > 0) playerVel.x = 0; }
        else if (m === oR) { player.position.x = sf.x + halfW + r; if (playerVel.x < 0) playerVel.x = 0; }
        else if (m === oF) { player.position.z = sf.z - halfD - r; if (playerVel.z > 0) playerVel.z = 0; }
        else               { player.position.z = sf.z + halfD + r; if (playerVel.z < 0) playerVel.z = 0; }
      }
    }

    // House collision (AABB) — Pico can't walk through walls
    const house = scene.userData.houseCollider;
    if (house) {
      const px = player.position.x;
      const pz = player.position.z;
      const r = 0.4;
      if (px > house.minX - r && px < house.maxX + r && pz > house.minZ - r && pz < house.maxZ + r) {
        // Find shortest push-out distance on each axis
        const overlapL = (px + r) - house.minX;  // push left
        const overlapR = house.maxX - (px - r);  // push right
        const overlapF = (pz + r) - house.minZ;  // push forward (-z)
        const overlapB = house.maxZ - (pz - r);  // push back (+z)
        const minOverlap = Math.min(overlapL, overlapR, overlapF, overlapB);
        if (minOverlap === overlapL)       { player.position.x = house.minX - r; if (playerVel.x > 0) playerVel.x = 0; }
        else if (minOverlap === overlapR)  { player.position.x = house.maxX + r; if (playerVel.x < 0) playerVel.x = 0; }
        else if (minOverlap === overlapF)  { player.position.z = house.minZ - r; if (playerVel.z > 0) playerVel.z = 0; }
        else                               { player.position.z = house.maxZ + r; if (playerVel.z < 0) playerVel.z = 0; }
      }
    }

    // Butcher shop wall collision
    if (butcherShopGroup.visible) {
      const PR = 0.4;
      const HW = 12 / 2 - 0.3;
      const HL = 14 / 2 - 0.3;
      const localX = player.position.x - BUTCHER_ORIGIN.x;
      const localZ = player.position.z - BUTCHER_ORIGIN.z;
      if (localX < -HW + PR) { player.position.x = BUTCHER_ORIGIN.x + (-HW + PR); if (playerVel.x < 0) playerVel.x = 0; }
      if (localX >  HW - PR) { player.position.x = BUTCHER_ORIGIN.x + ( HW - PR); if (playerVel.x > 0) playerVel.x = 0; }
      if (localZ < -HL + PR) { player.position.z = BUTCHER_ORIGIN.z + (-HL + PR); if (playerVel.z < 0) playerVel.z = 0; }
      // South wall has the door gap — allow exit through it (door at local x=0, width 2.2)
      if (localZ > HL - PR && Math.abs(localX) > 1.1 + PR) {
        player.position.z = BUTCHER_ORIGIN.z + (HL - PR);
        if (playerVel.z > 0) playerVel.z = 0;
      }
      // Counter blocks the back half — Pico can't go behind it
      // Counter is at local z=-2.5, depth 1.6, so it spans z=[-3.3, -1.7]
      if (localZ < -1.7 + PR && Math.abs(localX) < 5) {
        player.position.z = BUTCHER_ORIGIN.z + (-1.7 + PR);
        if (playerVel.z < 0) playerVel.z = 0;
      }
    }

    // School hallway wall collision (only when inside the school)
    if (schoolGroup.visible) {
      const PR = 0.4;
      const HW = 6 / 2 - 0.5;     // hallway half-width minus locker depth
      const HL = 24 / 2 - 0.5;    // hallway half-length minus end wall
      const localX = player.position.x - SCHOOL_ORIGIN.x;
      const localZ = player.position.z - SCHOOL_ORIGIN.z;
      // Push back from side walls
      if (localX < -HW + PR) { player.position.x = SCHOOL_ORIGIN.x + (-HW + PR); if (playerVel.x < 0) playerVel.x = 0; }
      if (localX >  HW - PR) { player.position.x = SCHOOL_ORIGIN.x + ( HW - PR); if (playerVel.x > 0) playerVel.x = 0; }
      // Push back from end walls
      if (localZ < -HL + PR) { player.position.z = SCHOOL_ORIGIN.z + (-HL + PR); if (playerVel.z < 0) playerVel.z = 0; }
      if (localZ >  HL - PR) { player.position.z = SCHOOL_ORIGIN.z + ( HL - PR); if (playerVel.z > 0) playerVel.z = 0; }
    }

    // New-bedroom box collision (only when player is inside that room)
    if (newBedroomGroup.visible && newBedroomGroup.userData.boxColliders) {
      const PR = 0.4;
      for (const c of newBedroomGroup.userData.boxColliders) {
        const localX = player.position.x - NEW_BEDROOM_ORIGIN.x;
        const localZ = player.position.z - NEW_BEDROOM_ORIGIN.z;
        const minX = c.x - c.halfW, maxX = c.x + c.halfW;
        const minZ = c.z - c.halfD, maxZ = c.z + c.halfD;
        if (localX > minX - PR && localX < maxX + PR && localZ > minZ - PR && localZ < maxZ + PR) {
          const overlapL = (localX + PR) - minX;
          const overlapR = maxX - (localX - PR);
          const overlapF = (localZ + PR) - minZ;
          const overlapB = maxZ - (localZ - PR);
          const minOv = Math.min(overlapL, overlapR, overlapF, overlapB);
          if (minOv === overlapL)      { player.position.x = NEW_BEDROOM_ORIGIN.x + minX - PR; if (playerVel.x > 0) playerVel.x = 0; }
          else if (minOv === overlapR) { player.position.x = NEW_BEDROOM_ORIGIN.x + maxX + PR; if (playerVel.x < 0) playerVel.x = 0; }
          else if (minOv === overlapF) { player.position.z = NEW_BEDROOM_ORIGIN.z + minZ - PR; if (playerVel.z > 0) playerVel.z = 0; }
          else                          { player.position.z = NEW_BEDROOM_ORIGIN.z + maxZ + PR; if (playerVel.z < 0) playerVel.z = 0; }
        }
      }
    }

    // House wall + furniture colliders (run alongside the box colliders)
    if (newBedroomGroup.visible && newBedroomGroup.userData.houseColliders) {
      const PR = 0.35;
      const localX = player.position.x - NEW_BEDROOM_ORIGIN.x;
      const localZ = player.position.z - NEW_BEDROOM_ORIGIN.z;
      const py = player.position.y;
      for (const c of newBedroomGroup.userData.houseColliders) {
        // Some colliders only block above a certain Y (e.g. upstairs walls when downstairs)
        // or below a certain Y (e.g. counter is jump-overable in theory)
        if (c.minY != null && py + 1.0 < c.minY) continue;   // collider is above player's head
        if (c.maxY != null && py > c.maxY) continue;          // player is above this collider
        if (localX > c.minX - PR && localX < c.maxX + PR && localZ > c.minZ - PR && localZ < c.maxZ + PR) {
          const overlapL = (localX + PR) - c.minX;
          const overlapR = c.maxX - (localX - PR);
          const overlapF = (localZ + PR) - c.minZ;
          const overlapB = c.maxZ - (localZ - PR);
          const minOv = Math.min(overlapL, overlapR, overlapF, overlapB);
          if (minOv === overlapL)      { player.position.x = NEW_BEDROOM_ORIGIN.x + c.minX - PR; if (playerVel.x > 0) playerVel.x = 0; }
          else if (minOv === overlapR) { player.position.x = NEW_BEDROOM_ORIGIN.x + c.maxX + PR; if (playerVel.x < 0) playerVel.x = 0; }
          else if (minOv === overlapF) { player.position.z = NEW_BEDROOM_ORIGIN.z + c.minZ - PR; if (playerVel.z > 0) playerVel.z = 0; }
          else                          { player.position.z = NEW_BEDROOM_ORIGIN.z + c.maxZ + PR; if (playerVel.z < 0) playerVel.z = 0; }
        }
      }

      // Front-door exit trigger — when player walks south past the front door, leave the house
      if (localZ >= 7.8 && Math.abs(localX) <= 0.9 && py < 0.5 && !controlsLocked) {
        // During Ch.4, gate the exit on having spoken to Mum first
        if (ch4Phase === 'mumWait') {
          // Show a hint and bounce Pico back inside instead of leaving
          showSpeech('I should talk to Mum first.', 1800);
          player.position.z = NEW_BEDROOM_ORIGIN.z + 7.5;
          if (playerVel.z > 0) playerVel.z = 0;
        } else {
          exitHouseToMeadow();
        }
      }
    }

    // Tree collision — push player out of any tree trunk they walk into
    const PLAYER_RADIUS = 0.4;
    for (const t of treeColliders) {
      const dx = player.position.x - t.x;
      const dz = player.position.z - t.z;
      const dist = Math.hypot(dx, dz);
      const minDist = t.r + PLAYER_RADIUS;
      if (dist < minDist && dist > 0.001) {
        const push = (minDist - dist) / dist;
        player.position.x += dx * push;
        player.position.z += dz * push;
        // Cancel any inward velocity
        const inwardVel = -(playerVel.x * dx + playerVel.z * dz) / dist;
        if (inwardVel > 0) {
          playerVel.x += (dx / dist) * inwardVel;
          playerVel.z += (dz / dist) * inwardVel;
        }
      }
    }

    // Soft boundary — keep Pico within the playable meadow (45m radius)
    // ONLY active when no cutscene-only room is visible. Without this gate,
    // the boundary yanks Pico back from bedroom (z=-200), kitchen (z=-400),
    // new bedroom (z=-600), and school (z=-800) every frame.
    const inOutdoorMeadow = !bedroomGroup.visible &&
                            !kitchenGroup.visible &&
                            !newBedroomGroup.visible &&
                            !schoolGroup.visible &&
                            !butcherShopGroup.visible;
    if (inOutdoorMeadow) {
      // Boundary is relative to the CURRENT world's centre, so Acornville
      // (centred at z≈2000) isn't yanked back toward the meadow.
      const cx = (currentWorld === 'acornville') ? ACORNVILLE_ORIGIN.x : 0;
      const cz = (currentWorld === 'acornville') ? ACORNVILLE_ORIGIN.z : 0;
      const WORLD_RADIUS = 45;
      const dxC = player.position.x - cx, dzC = player.position.z - cz;
      const distFromCenter = Math.hypot(dxC, dzC);
      if (distFromCenter > WORLD_RADIUS) {
        const scale = WORLD_RADIUS / distFromCenter;
        player.position.x = cx + dxC * scale;
        player.position.z = cz + dzC * scale;
        const outwardX = dxC / distFromCenter, outwardZ = dzC / distFromCenter;
        const outwardVel = playerVel.x * outwardX + playerVel.z * outwardZ;
        if (outwardVel > 0) {
          playerVel.x -= outwardX * outwardVel;
          playerVel.z -= outwardZ * outwardVel;
        }
      }
    }

    // Face movement direction (rotate the player group)
    if (moving) {
      const targetFacing = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetFacing - facingY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facingY += diff * smooth(TURN_SPEED, dt);
      player.rotation.y = facingY;
    }

    // Animation state machine — pick clip based on player state, crossfade
    const horizontalSpeed = Math.hypot(playerVel.x, playerVel.z);
    const state = {
      moving: horizontalSpeed > 0.5,
      grounded: grounded,
      sprinting: input.sprint,
      speed: horizontalSpeed
    };
    // Detect transition from cutscene (locked) to free roam (unlocked) and
    // reset any leftover dance/idle state from the cutscene
    if (!controlsLocked && lastControlsLocked) {
      manualDance = null;
      idleStartTime = 0;
    }
    lastControlsLocked = controlsLocked;

    const wantAction = chooseAnimationState(state);
    // Special key means "stop animating, Pico stays in current pose"
    // (used for the first 10s of idle so Pico doesn't dance by default).
    // We only auto-toggle still mode during free roam — cutscenes manage their own.
    if (!controlsLocked) {
      const mixerPaused = mixer && mixer.timeScale === 0;
      if (wantAction === '__idle_still__') {
        if (!mixerPaused) setStillMode(true);
      } else if (wantAction) {
        if (mixerPaused) setStillMode(false);
        playAction(wantAction);
      }
    }

    // Sync walk/run animation speed to actual movement speed (reduces foot sliding)
    if (actions['Walking'] && currentActionName === 'Walking') {
      actions['Walking'].timeScale = Math.max(0.7, horizontalSpeed / WALK_SPEED);
    }
    if (actions['Running'] && currentActionName === 'Running') {
      actions['Running'].timeScale = Math.max(0.8, horizontalSpeed / (WALK_SPEED * SPRINT_MULT));
    }

    // Tick mixer last so the chosen action is reflected this frame
    if (mixer) mixer.update(dt);

    // Camera follow — target is roughly Pico's head height (~1m above feet).
    // Suppressed during the squirrel close-up so it can hold its own framing.
    if (!closeUpActive) {
      camState.target.lerp(
        new THREE.Vector3(player.position.x, player.position.y + 1, player.position.z),
        smooth(8, dt)
      );
    }

    // Dynamic zone label based on Pico's position
    updateZoneLabel();
    // Unpacking mini-objective inside the new bedroom
    checkBoxTouches();
    // Ch.3 hallway triggers
    checkSchoolTriggers();
    // Hazel follows Pico once she's joined the party
    updateHazelFollow(dt);
    // Walk-to-school trigger (Ch.2 → Ch.3 bridge)
    checkWalkToSchoolTrigger();
    // Ch.4 errand triggers (talk to Mum, walk to storefront)
    checkChapter4Triggers();
    // Ch.5 butcher chase
    checkButcherChase(dt);
    // Free-play triggers (after Ch.6 ending)
    checkFreePlayTriggers();
    updateSquirrelChase(dt);
    updateTownExtras(dt);
    updateBonusChase(dt);
    updateP2(dt);
  }

  updateCamera();
  renderer.render(scene, camera);
}
tick();

// Pause render loop when the tab is hidden — saves battery + heat.
// Don't auto-restart if the user is in the pause menu (let them resume manually).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (rafHandle) cancelAnimationFrame(rafHandle);
    rafHandle = null;
  } else if (!rafHandle && !paused) {
    clock.getDelta();
    tick();
  }
});

// ─── Resize ───────────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  // Refresh pixel ratio in case the window moved between displays of different DPI
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Controller connect notice
window.addEventListener('gamepadconnected', e => {
  console.log('Gamepad connected:', e.gamepad.id);
});

// ═══════════════════════════════════════════════════════
// AUDIO — tiny Web Audio synth, no assets needed
// ═══════════════════════════════════════════════════════
let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('Web Audio not available');
    return null;
  }
  return audioCtx;
}

function playTone({ freq = 440, dur = 0.15, type = 'sine', volume = 0.18, attack = 0.005, release = 0.05 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur + release);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur + release + 0.01);
}

// Sound preset library
const SFX = {
  alarmBeep: () => {
    // Two-tone alarm: high → low → high → low...
    playTone({ freq: 1200, dur: 0.12, type: 'square', volume: 0.12 });
    setTimeout(() => playTone({ freq: 900, dur: 0.12, type: 'square', volume: 0.12 }), 130);
  },
  alarmRing: () => {
    // Repeating alarm beep — returns a stop function
    const id = setInterval(SFX.alarmBeep, 280);
    return () => clearInterval(id);
  },
  jump: () => {
    // Quick pitch slide up
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  },
  step: () => {
    // Short soft tap — slight pitch variation per call so it doesn't feel robotic
    playTone({ freq: 130 + Math.random() * 30, dur: 0.05, type: 'sine', volume: 0.07, attack: 0.002, release: 0.04 });
  },
  ready: () => {
    // Triumphant "I'M READY!" stinger — major chord arpeggio
    playTone({ freq: 523, dur: 0.18, type: 'triangle', volume: 0.18 });          // C5
    setTimeout(() => playTone({ freq: 659, dur: 0.18, type: 'triangle', volume: 0.18 }), 100);  // E5
    setTimeout(() => playTone({ freq: 784, dur: 0.32, type: 'triangle', volume: 0.22 }), 200);  // G5
  }
};

// ═══════════════════════════════════════════════════════
// FOOTSTEP DUST PARTICLES
// ═══════════════════════════════════════════════════════
const dustParticles = [];
const dustGeo = new THREE.SphereGeometry(0.06, 6, 5);
let lastStepDist = 0;

// Golden sparkle burst — used for box unpacking + objective hits
const sparkleParticles = [];
const sparkleGeo = new THREE.OctahedronGeometry(0.06, 0);
function emitSparkles(x, y, z) {
  for (let i = 0; i < 14; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xFFD740,
      transparent: true,
      opacity: 1
    });
    const p = new THREE.Mesh(sparkleGeo, mat);
    p.position.set(x, y, z);
    const speed = 1.8 + Math.random() * 1.6;
    const ang = Math.random() * Math.PI * 2;
    const upBias = 1.2 + Math.random() * 1.4;
    scene.add(p);
    sparkleParticles.push({
      mesh: p,
      mat,
      life: 0,
      maxLife: 0.7 + Math.random() * 0.4,
      vx: Math.cos(ang) * speed,
      vy: upBias,
      vz: Math.sin(ang) * speed,
      spin: (Math.random() - 0.5) * 8
    });
  }
}

function updateSparkles(dt) {
  for (let i = sparkleParticles.length - 1; i >= 0; i--) {
    const p = sparkleParticles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      scene.remove(p.mesh);
      p.mat.dispose();
      sparkleParticles.splice(i, 1);
      continue;
    }
    const t = p.life / p.maxLife;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.vy -= 4 * dt;  // gravity
    p.mesh.rotation.y += p.spin * dt;
    p.mesh.rotation.x += p.spin * 0.7 * dt;
    p.mat.opacity = 1 - t;
    p.mesh.scale.setScalar(1 - t * 0.4);
  }
}

function emitDust(x, z) {
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xCDB69E,
      transparent: true,
      opacity: 0.55
    });
    const p = new THREE.Mesh(dustGeo, mat);
    p.position.set(
      x + (Math.random() - 0.5) * 0.25,
      0.05 + Math.random() * 0.1,
      z + (Math.random() - 0.5) * 0.25
    );
    p.scale.setScalar(0.5 + Math.random() * 0.5);
    scene.add(p);
    dustParticles.push({
      mesh: p,
      mat: mat,
      life: 0,
      maxLife: 0.45 + Math.random() * 0.25,
      vx: (Math.random() - 0.5) * 0.7,
      vy: 0.4 + Math.random() * 0.4,
      vz: (Math.random() - 0.5) * 0.7
    });
  }
}

function updateDust(dt) {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      scene.remove(p.mesh);
      p.mat.dispose();
      dustParticles.splice(i, 1);
      continue;
    }
    const t = p.life / p.maxLife;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.vy -= 1.2 * dt;  // soft gravity
    p.mat.opacity = (1 - t) * 0.55;
    p.mesh.scale.setScalar((0.5 + 0.5 * t));
  }
}

// Hook footsteps into the game loop — call this whenever Pico moves on ground
function maybeEmitFootstep() {
  if (!grounded || !pico) return;
  const traveled = Math.hypot(playerVel.x, playerVel.z);
  if (traveled < 0.5) { lastStepDist = 0; return; }
  // Accumulate distance traveled per frame; emit step every ~0.9 units of distance
  const dt = clock.getDelta ? Math.min(0.05, 0.016) : 0.016;
  lastStepDist += traveled * dt;
  // Sprinting → tighter step cadence
  const stepInterval = currentActionName === 'Running' ? 0.55 : 0.85;
  if (lastStepDist >= stepInterval) {
    emitDust(player.position.x, player.position.z);
    SFX.step();
    lastStepDist = 0;
  }
}

// Wire dust into the game loop. Inject via override of mixer update; simpler: tap the global tick.
const _origTick = tick;
// Wrap tick to add dust updates + footsteps
// (Can't easily wrap; instead use rAF observer)
let _dustRaf = null;
function dustLoop() {
  _dustRaf = requestAnimationFrame(dustLoop);
  const dt = Math.min(0.05, 1/60);  // fixed tick is fine for particle visuals
  updateDust(dt);
  updateSparkles(dt);
  maybeEmitFootstep();
}
dustLoop();

// ═══════════════════════════════════════════════════════
// CUTSCENE SYSTEM
// ═══════════════════════════════════════════════════════
let controlsLocked = true;  // locked until first cutscene completes
let stopAlarm = null;

// Cutscene cancellation — Esc-skip flips this on; sleep() + showSpeech()
// resolve immediately so async cutscenes race to their end without blocking.
// Cutscene functions can also short-circuit by checking `cutsceneCancelled`.
let cutsceneCancelled = false;
function sleep(ms) {
  if (cutsceneCancelled) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Character voices via SpeechSynthesis API ────────────────
// No audio files needed — uses the OS's built-in TTS voices. Each
// character gets a distinct pitch + rate so they sound different.
const VOICE_PRESETS = {
  pico:      { rate: 1.15, pitch: 1.6, volume: 0.9 },   // little kid acorn — high + bright
  granny:    { rate: 0.9,  pitch: 1.3, volume: 0.85 },  // older lady — kindly + slow-ish
  grampa:    { rate: 0.8,  pitch: 0.65,volume: 0.9 },   // older man — slow + low
  hazel:     { rate: 1.4,  pitch: 1.4, volume: 0.85 },  // fast-talking + bright girl
  brunk:     { rate: 0.85, pitch: 0.5, volume: 0.95 },  // big bully chestnut — low + slow
  pemberton: { rate: 0.95, pitch: 0.9, volume: 0.85 },  // teacher — measured
  butcher:   { rate: 0.95, pitch: 0.55,volume: 0.95 },  // menacing + sing-song
  squirrel:  { rate: 1.5,  pitch: 1.9, volume: 0.9 },   // Scratchett — fast, high, chittery
  narrator:  { rate: 1.0,  pitch: 1.0, volume: 0.8 }    // fallback
};
// Try to pick voices preferring a few accents for variety. The browser
// will fall back to its default if none match.
let cachedVoices = null;
function pickVoice(preset, charKey) {
  if (!('speechSynthesis' in window)) return null;
  if (!cachedVoices || cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  if (!cachedVoices || cachedVoices.length === 0) return null;
  // English voices only — sort to prefer named voices that match the character
  const englishVoices = cachedVoices.filter(v => v.lang && v.lang.startsWith('en'));
  if (englishVoices.length === 0) return cachedVoices[0];
  // Preferred per character (different OS exposes different sets — these are common)
  const prefs = {
    pico:      ['Karen', 'Samantha', 'Allison', 'Susan', 'Junior'],
    granny:    ['Karen', 'Tessa', 'Samantha', 'Moira'],
    grampa:    ['Daniel', 'Fred', 'Ralph', 'Albert', 'Bruce'],
    hazel:     ['Karen', 'Allison', 'Susan', 'Vicki', 'Princess'],
    brunk:     ['Fred', 'Ralph', 'Bruce', 'Albert'],
    pemberton: ['Daniel', 'Oliver', 'Aaron'],
    butcher:   ['Bahh', 'Bad News', 'Fred', 'Ralph', 'Bruce', 'Daniel'],
    squirrel:  ['Junior', 'Karen', 'Allison', 'Princess', 'Samantha'],
    narrator:  ['Samantha', 'Karen']
  };
  const want = prefs[charKey] || [];
  for (const name of want) {
    const v = englishVoices.find(vv => vv.name === name || vv.name.includes(name));
    if (v) return v;
  }
  return englishVoices[0];
}
// Re-cache when voices load (some browsers load voices async)
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoices = null; };
}

let voicesOn = (() => { try { return localStorage.getItem('wonkyAcorn_voicesOn') === '1'; } catch (e) { return false; } })();   // default OFF — opt-in
let _currentUtterance = null;
function speak(text, charKey = 'pico') {
  if (muted || !voicesOn) return;
  if (!('speechSynthesis' in window)) return;
  // Cancel any in-progress utterance so dialogue doesn't overlap
  try { window.speechSynthesis.cancel(); } catch (e) {}
  // Strip stage directions in parentheses like "(small smile)" or italic asides
  const clean = String(text)
    .replace(/\([^)]*\)/g, ' ')   // remove (smiles), (quietly), etc.
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return;
  const preset = VOICE_PRESETS[charKey] || VOICE_PRESETS.narrator;
  const u = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice(preset, charKey);
  if (voice) u.voice = voice;
  u.rate = preset.rate;
  u.pitch = preset.pitch;
  u.volume = preset.volume;
  u.lang = (voice && voice.lang) || 'en-US';
  _currentUtterance = u;
  u.onend = () => { if (_currentUtterance === u) _currentUtterance = null; };
  try { window.speechSynthesis.speak(u); } catch (e) {}
}

function showSpeech(text, duration = 2000) {
  speak(text, 'pico');   // Pico is the player character — default voice
  return showSpeechBubble({ text, duration });
}

// Core speech-bubble function — also handles click-to-advance + NPC labels
function showSpeechBubble({ text, duration = 2000, npcName = null, npcColor = null }) {
  if (cutsceneCancelled) return Promise.resolve();
  const bubble = document.getElementById('speech-bubble');
  const span = document.getElementById('speech-text');
  if (!bubble || !span) return Promise.resolve();
  if (npcName) {
    span.innerHTML = `<span style="display:block;font-size:14px;font-weight:900;color:${npcColor || '#555'};letter-spacing:1px;margin-bottom:6px">${npcName}</span>${text}`;
  } else {
    span.textContent = text;
  }
  bubble.classList.remove('hide');
  bubble.classList.add('show');

  return new Promise(resolve => {
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      bubble.classList.remove('show');
      bubble.classList.add('hide');
      window.removeEventListener('click', advance);
      window.removeEventListener('keydown', advanceKey);
      setTimeout(resolve, 320);
    }
    function advance(e) {
      // Don't advance on the very first click that originated the cutscene
      if (e && e.target && e.target.id === 'start-btn') return;
      finish();
    }
    function advanceKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        finish();
      }
    }
    // Auto-advance after duration
    setTimeout(finish, duration);
    // Or user can tap/click/press space to advance early
    // Use a tiny delay so the click that triggered the cutscene doesn't immediately advance
    setTimeout(() => {
      window.addEventListener('click', advance);
      window.addEventListener('keydown', advanceKey);
    }, 200);
  });
}

function showFade(on) {
  const f = document.getElementById('fade-overlay');
  if (!f) return;
  if (on) f.classList.add('show');
  else f.classList.remove('show');
}

async function beginIntro() {
  // User just tapped "Tap to begin" — wake the audio context (browsers require user gesture)
  ensureAudio();
  setCheckpoint('intro');
  cutsceneCancelled = false;

  // Switch to still-pose Pico for the cutscene — no dancing/waving/sad sighs
  setStillMode(true);

  // ── Move Pico into the bedroom and frame the camera for an interior shot ──
  bedroomGroup.visible = true;
  player.position.copy(BEDROOM_ORIGIN);
  player.position.y = 0;
  facingY = 0;
  player.rotation.y = 0;
  playerVel.set(0, 0, 0);
  grounded = true;
  // Camera tuned for the bedroom: 3/4 view from the open front of the room
  // looking past the bed toward the back wall + window
  camState.target.copy(BEDROOM_ORIGIN);
  camState.target.y = 1.2;
  camState.distance = 5.5;
  camState.pitch = 0.25;
  camState.yaw = 0.6;  // right-front 3/4 view with bed + alarm visible on the left
  // Snap camera immediately to its new position so we don't see the lerp
  updateCamera();

  // Hide loading + show title card
  loadingEl.classList.add('fade');
  setTimeout(() => { loadingEl.style.display = 'none'; }, 600);

  const titleCard = document.getElementById('title-card');
  if (titleCard) {
    titleCard.classList.add('show');
    await sleep(3200);
    titleCard.classList.add('fade-out');
    await sleep(1000);
    titleCard.style.display = 'none';
  }

  // Tiny breather so the player can take in the bedroom
  await sleep(600);

  // ── Alarm starts ringing, clock wiggles ──
  stopAlarm = SFX.alarmRing();
  const alarmGroup = bedroomGroup.userData.alarmGroup;
  const ringStart = performance.now();
  const ringStop = ringStart + 1300;
  function wiggleAlarm() {
    if (!alarmGroup) return;
    if (performance.now() >= ringStop) {
      alarmGroup.rotation.z = 0;
      return;
    }
    const t = (performance.now() - ringStart) / 1000;
    alarmGroup.rotation.z = Math.sin(t * 40) * 0.18;
    requestAnimationFrame(wiggleAlarm);
  }
  wiggleAlarm();
  await sleep(1300);
  if (stopAlarm) { stopAlarm(); stopAlarm = null; }

  // ── Pico jumps out of bed and yells "I'M READY!" ──
  // Swap to animated Pico so the jump clip actually plays
  setStillMode(false);
  if (actions['Basic_Jump']) {
    playAction('Basic_Jump', 0.15, { once: true });
    if (grounded) {
      playerVel.y = 7;
      grounded = false;
    }
  }
  SFX.jump();
  await sleep(180);
  SFX.ready();
  await showSpeech("I'M READY!", 1600);
  // Back to still pose for the rest of the cutscene
  setStillMode(true);

  // ── Fade to kitchen ──
  showFade(true);
  await sleep(900);
  bedroomGroup.visible = false;
  kitchenGroup.visible = true;
  // Move Pico into the kitchen at his chair (front of table)
  player.position.copy(KITCHEN_ORIGIN);
  player.position.z += 2.6;       // sitting at the front chair
  facingY = Math.PI;              // facing the table (and parents)
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;

  // Camera framing: wide shot of the family at the table
  camState.target.copy(KITCHEN_ORIGIN);
  camState.target.y = 1.2;
  camState.target.z += 1.4;
  camState.distance = 6.0;
  camState.yaw = 0;               // looking down -Z (toward back wall + parents on either side)
  camState.pitch = 0.32;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(800);


  // Make granny/grampa do a gentle bob to look alive
  const granny = kitchenGroup.userData.granny;
  const grampa = kitchenGroup.userData.grampa;
  let parentBobActive = true;
  const parentBobStart = performance.now();
  (function bobParents() {
    if (!parentBobActive) return;
    const t = (performance.now() - parentBobStart) / 1000;
    if (granny) granny.position.y = Math.sin(t * 2.5) * 0.04;
    if (grampa) grampa.position.y = Math.sin(t * 2.5 + 0.5) * 0.04;
    requestAnimationFrame(bobParents);
  })();

  // ── Dialogue beats ──
  await showSpeech('Pancakes! My favourite!', 1800);
  await sleep(400);
  await showSpeechFromNPC('granny', '— Sit down, sweetheart. We need to talk.', 2400);
  await sleep(400);
  await showSpeechFromNPC('grampa', 'Bad news, son… we\'re moving.', 2400);
  await sleep(400);
  await showSpeechFromNPC('grampa', 'Pack up and say your goodbyes.', 2200);
  await sleep(300);

  // Pico's reaction — big NOOOO speech
  await showSpeech('NOOOOOOOOOOOO!', 2400);
  await sleep(300);
  await showSpeechFromNPC('granny', 'It\'s a lovely flat, sweetheart. Right in the heart of the city.', 2800);
  await showSpeech('...the city?', 1700);

  // ── Tear flood ──
  // Water rises from the floor until it's just below the table top
  addShake(0.15);  // tiny world shake from Pico's outburst
  const tearWater = kitchenGroup.userData.tearWater;
  if (tearWater) {
    tearWater.visible = true;
    const TARGET_WATER_Y = 0.7;     // just below the table top at y≈0.9
    const RISE_DURATION = 2400;
    const riseStart = performance.now();
    await new Promise(resolve => {
      function step() {
        const t = Math.min(1, (performance.now() - riseStart) / RISE_DURATION);
        // Ease-out so it slows as it tops out
        const eased = 1 - Math.pow(1 - t, 2);
        const newHeight = TARGET_WATER_Y * eased;
        tearWater.scale.y = Math.max(0.1, newHeight / 0.05);  // scale Y of the 0.05-thick box
        tearWater.position.y = newHeight / 2;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }
      step();
    });

    // Gentle ripple — keep water swaying after it's settled
    const rippleStart = performance.now();
    let rippleActive = true;
    (function ripple() {
      if (!rippleActive) return;
      const t = (performance.now() - rippleStart) / 1000;
      const baseY = (0.7) / 2;
      tearWater.position.y = baseY + Math.sin(t * 1.8) * 0.02;
      requestAnimationFrame(ripple);
    })();
    kitchenGroup.userData.stopRipple = () => { rippleActive = false; };
  }

  await sleep(400);

  // ── Soggy pancake joke ──
  await sleep(900);
  await showSpeech('Could do with a little less salt.', 2600);
  await sleep(500);

  parentBobActive = false;
  if (kitchenGroup.userData.stopRipple) kitchenGroup.userData.stopRipple();

  // ── Drive away (quick black-screen transition with engine sound) ──
  showFade(true);
  await sleep(1100);
  // Play a quick low engine rumble while the screen is black
  const engineDur = 1.8;
  for (let i = 0; i < 6; i++) {
    setTimeout(() => playTone({ freq: 80 + i * 6, dur: 0.4, type: 'sawtooth', volume: 0.08 }), i * 280);
  }
  await sleep(engineDur * 1000);

  // ── Arrive at the new house (meadow) ──
  kitchenGroup.visible = false;
  if (tearWater) {
    tearWater.visible = false;
    tearWater.scale.y = 0.1;
    tearWater.position.y = -0.05;
  }
  // Spawn just inside the front gate of the new house, facing the house
  const spawn = scene.userData.newHouseSpawn || new THREE.Vector3(0, 0, 0);
  player.position.copy(spawn);
  facingY = Math.PI;            // face the house (which is in the -Z direction from spawn)
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.copy(spawn);
  camState.target.y = 1;
  camState.distance = 8;        // pull back to show Pico + the house behind him in frame
  camState.yaw = 0;             // camera behind player (player faces -Z toward house)
  camState.pitch = 0.35;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(800);

  // Brief "welcome" caption
  await showSpeechFromNPC('granny', 'Go on in and unpack, sweetheart. We\'ll be in in a minute.', 3200);
  await sleep(400);

  // Hand control over to the player — swap back to animated Pico so he walks
  manualDance = null;
  setStillMode(false);
  controlsLocked = false;
  hudEl.classList.add('show');
  try { localStorage.setItem('wonkyAcornIntroSeen', '1'); } catch (e) {}
}

// Skip the whole intro — drop straight into free roam at the new house
async function beginQuickStart() {
  ensureAudio();
  loadingEl.classList.add('fade');
  setTimeout(() => { loadingEl.style.display = 'none'; }, 600);
  await sleep(400);

  const spawn = scene.userData.newHouseSpawn || new THREE.Vector3(0, 0, 0);
  player.position.copy(spawn);
  facingY = Math.PI;
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.copy(spawn);
  camState.target.y = 1;
  camState.distance = 8;
  camState.yaw = 0;
  camState.pitch = 0.35;
  updateCamera();
  showFade(false);
  controlsLocked = false;
  hudEl.classList.add('show');
}

// Helper: show a speech bubble tagged with an NPC name
function showSpeechFromNPC(who, text, duration = 2000) {
  const labels = {
    granny:    { name: 'MUM',          color: '#D16A6A' },
    grampa:    { name: 'DAD',          color: '#5A3A20' },
    hazel:     { name: 'HAZEL',        color: '#5BAAEF' },
    brunk:     { name: 'BRUNK',        color: '#7C5B2E' },
    pemberton: { name: 'MR. PEMBERTON', color: '#2C5C3E' },
    butcher:   { name: 'BUTCHER',      color: '#8B3A2A' },
    squirrel:  { name: 'SCRATCHETT',   color: '#9B5A2B' }
  };
  const label = labels[who] || { name: who.toUpperCase(), color: '#555' };
  speak(text, who);   // pick the NPC's voice preset
  return showSpeechBubble({ text, duration, npcName: label.name, npcColor: label.color });
}

// ═══════════════════════════════════════════════════════
// PAUSE MENU — Esc or P during free roam to pause
// ═══════════════════════════════════════════════════════
let paused = false;
let muted = (() => { try { return localStorage.getItem('wonkyAcornMuted') === '1'; } catch (e) { return false; } })();
// Apply saved mute state after audio context is created
if (muted) {
  setTimeout(() => {
    const ctx = ensureAudio();
    if (ctx) ctx.suspend();
  }, 0);
}

function setPaused(v) {
  paused = v;
  // Pause/resume the current voice line too
  if ('speechSynthesis' in window) {
    try { v ? window.speechSynthesis.pause() : window.speechSynthesis.resume(); } catch (e) {}
  }
  const menu = document.getElementById('pause-menu');
  if (menu) {
    if (v) menu.classList.add('show');
    else menu.classList.remove('show');
  }
  // Refresh the Replay Chapters lock state every time the menu opens
  if (v && typeof refreshReplayLock === 'function') refreshReplayLock();
  if (v && typeof update2PLabel === 'function') update2PLabel();
  // Sync the mute button label to current state
  const muteBtn = document.getElementById('pause-mute');
  if (muteBtn) muteBtn.textContent = muted ? 'Unmute Sound' : 'Mute Sound';
  if (v) {
    // Pause render loop to save battery (dust loop keeps running for particle decay)
    if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }
  } else if (!rafHandle) {
    clock.getDelta();
    tick();
  }
}

function toggleMute() {
  muted = !muted;
  const ctx = ensureAudio();
  if (ctx) {
    if (muted) ctx.suspend();
    else ctx.resume();
  }
  const btn = document.getElementById('pause-mute');
  if (btn) btn.textContent = muted ? 'Unmute Sound' : 'Mute Sound';
  try { localStorage.setItem('wonkyAcornMuted', muted ? '1' : '0'); } catch (e) {}
}

// ─────────────────────────────────────────────────────
// SAVE SYSTEM — Kirby-style, 3 file slots in localStorage
// ─────────────────────────────────────────────────────
const SAVE_SLOT_KEYS = ['wonkyAcorn_save_1', 'wonkyAcorn_save_2', 'wonkyAcorn_save_3'];
const PENDING_LOAD_KEY = 'wonkyAcorn_pendingLoad';

// Current in-game progress checkpoint — updated as Pico moves through the story.
// One of: 'intro' | 'newhouse' | 'school' | 'butcher' | 'ending'
let currentCheckpoint = 'intro';
function setCheckpoint(c, autoSave) {
  currentCheckpoint = c;
  // Past Ch.1: kill the first-arrival objective star so it doesn't reappear
  // after a save-load and re-trigger the bedroom cutscene
  if (c !== 'intro') {
    const star = scene.userData && scene.userData.objectiveStar;
    if (star) star.visible = false;
    objectiveReached = true;
  }
  if (autoSave) {
    const active = localStorage.getItem('wonkyAcorn_activeSlot');
    if (active && SAVE_SLOT_KEYS[+active - 1]) saveToSlot(+active);
  }
}

const CHECKPOINT_LABELS = {
  intro:    'Ch. 1 — The Move',
  newhouse: 'Ch. 2 — Big City (new house)',
  school:   'Ch. 3 — First day at Conker Heights High',
  butcher:  'Ch. 5 — Scratchett & Sons',
  ending:   'Ch. 6 — Investigation'
};

function readSlot(n) {
  try {
    const raw = localStorage.getItem(SAVE_SLOT_KEYS[n - 1]);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function saveToSlot(n) {
  const data = {
    checkpoint: currentCheckpoint,
    label: CHECKPOINT_LABELS[currentCheckpoint] || currentCheckpoint,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(SAVE_SLOT_KEYS[n - 1], JSON.stringify(data));
    localStorage.setItem('wonkyAcorn_activeSlot', String(n));
    renderSlots();
  } catch (e) { console.warn('save failed', e); }
}
function deleteSlot(n) {
  try {
    localStorage.removeItem(SAVE_SLOT_KEYS[n - 1]);
    const active = localStorage.getItem('wonkyAcorn_activeSlot');
    if (active === String(n)) localStorage.removeItem('wonkyAcorn_activeSlot');
    renderSlots();
  } catch (e) {}
}
function loadSlot(n) {
  const data = readSlot(n);
  if (!data) return;
  // Defer until the next page load so we start in a clean state
  try {
    localStorage.setItem(PENDING_LOAD_KEY, JSON.stringify(data));
    localStorage.setItem('wonkyAcorn_activeSlot', String(n));
    localStorage.setItem('wonkyAcornIntroSeen', '1');   // skip the intro tap-to-begin
  } catch (e) {}
  location.reload();
}
function renderSlots() {
  const active = localStorage.getItem('wonkyAcorn_activeSlot');
  document.querySelectorAll('.save-slot').forEach(slotEl => {
    const n = +slotEl.dataset.slot;
    const data = readSlot(n);
    const chapterEl = slotEl.querySelector('.slot-chapter');
    const metaEl = slotEl.querySelector('.slot-meta');
    const loadBtn = slotEl.querySelector('.slot-load');
    const delBtn = slotEl.querySelector('.slot-delete');
    if (data) {
      slotEl.classList.add('has-data');
      chapterEl.textContent = data.label || data.checkpoint;
      const when = new Date(data.savedAt);
      const today = new Date();
      const isToday = when.toDateString() === today.toDateString();
      const dateStr = isToday
        ? `today ${when.getHours().toString().padStart(2, '0')}:${when.getMinutes().toString().padStart(2, '0')}`
        : when.toLocaleString();
      metaEl.textContent = `Saved ${dateStr}`;
      loadBtn.disabled = false;
      delBtn.disabled = false;
    } else {
      slotEl.classList.remove('has-data');
      chapterEl.textContent = '—';
      metaEl.textContent = 'Empty slot';
      loadBtn.disabled = true;
      delBtn.disabled = true;
    }
    slotEl.classList.toggle('active', active === String(n));
  });
}

// Apply a pending load (set by loadSlot before reload) once the page is ready
function applyPendingLoadIfAny() {
  let pending;
  try {
    const raw = localStorage.getItem(PENDING_LOAD_KEY);
    if (!raw) return false;
    pending = JSON.parse(raw);
    localStorage.removeItem(PENDING_LOAD_KEY);
  } catch (e) { return false; }
  // Hide the loading screen + jump straight to the saved checkpoint
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  setTimeout(() => {
    switch (pending.checkpoint) {
      case 'newhouse': enterNewBedroom(); break;
      case 'school':   beginChapter3(); break;
      case 'butcher':  beginChapter5(); break;
      case 'ending':   beginChapter6(); break;
      case 'intro':
      default:         beginIntro(); break;
    }
  }, 100);
  return true;
}

// Replay Chapters stays LOCKED until the player beats the game (sees the
// Congratulations card, which sets wonkyAcorn_freeplayUnlocked = '1').
function isReplayUnlocked() {
  try { return localStorage.getItem('wonkyAcorn_freeplayUnlocked') === '1'; } catch (e) { return false; }
}
// Refresh the locked/unlocked look of the Replay tab, the GAME-tab shortcut,
// the panel intro, and every chapter row. Called whenever the pause menu opens.
function refreshReplayLock() {
  const unlocked = isReplayUnlocked();
  const tab = document.querySelector('.pause-tab[data-tab="replay"]');
  const shortcut = document.getElementById('pause-replay-shortcut');
  const intro = document.querySelector('.pause-panel[data-panel="replay"] .panel-intro');
  if (tab) {
    tab.disabled = !unlocked;
    tab.classList.toggle('locked', !unlocked);
    tab.textContent = unlocked ? 'REPLAY CHAPTERS' : '🔒 REPLAY CHAPTERS';
  }
  if (shortcut) {
    shortcut.disabled = !unlocked;
    shortcut.classList.toggle('locked', !unlocked);
    shortcut.textContent = unlocked
      ? '📖 Replay Chapters'
      : '🔒 Replay Chapters — beat the game to unlock';
  }
  if (intro) {
    intro.textContent = unlocked
      ? 'You beat the game! Jump back to the start of any chapter below.'
      : 'Locked — finish the story and reach the Congratulations screen to unlock chapter replay.';
  }
  document.querySelectorAll('.replay-row').forEach(r => {
    r.disabled = !unlocked;
    r.classList.toggle('locked', !unlocked);
  });
  // Bonus chapters: hidden in the list until you've beaten them
  const beatenN = bonusBeaten();
  for (let i = 1; i <= 4; i++) {
    const row = document.querySelector(`.replay-row[data-replay="bonus${i}"]`);
    if (row) row.style.display = (beatenN >= i) ? '' : 'none';
  }
}

// Wire pause menu — tabs + game actions + save slots
{
  // Tab switching
  document.querySelectorAll('.pause-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      // Replay Chapters is gated behind beating the game
      if (tab === 'replay' && !isReplayUnlocked()) return;
      document.querySelectorAll('.pause-tab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.pause-panel').forEach(p => {
        p.classList.toggle('hide', p.dataset.panel !== tab);
      });
      if (tab === 'save') renderSlots();
    });
  });

  // GAME panel
  const resumeBtn = document.getElementById('pause-resume');
  if (resumeBtn) resumeBtn.addEventListener('click', () => setPaused(false));
  const muteBtn = document.getElementById('pause-mute');
  if (muteBtn) muteBtn.addEventListener('click', toggleMute);
  // Voices toggle (per-character TTS via SpeechSynthesis)
  const voicesBtn = document.getElementById('pause-voices');
  function syncVoicesLabel() {
    if (voicesBtn) voicesBtn.textContent = `Character Voices: ${voicesOn ? 'ON' : 'OFF'}`;
  }
  syncVoicesLabel();
  if (voicesBtn) voicesBtn.addEventListener('click', () => {
    voicesOn = !voicesOn;
    try { localStorage.setItem('wonkyAcorn_voicesOn', voicesOn ? '1' : '0'); } catch (e) {}
    if (!voicesOn && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    syncVoicesLabel();
  });

  // Shortcut on the GAME tab → switches to the REPLAY tab (locked until beaten)
  const replayShortcut = document.getElementById('pause-replay-shortcut');
  if (replayShortcut) replayShortcut.addEventListener('click', () => {
    if (!isReplayUnlocked()) return;
    const replayTab = document.querySelector('.pause-tab[data-tab="replay"]');
    if (replayTab) replayTab.click();
  });
  const twoPBtn = document.getElementById('pause-2p');
  if (twoPBtn) twoPBtn.addEventListener('click', toggle2Player);
  const resetBtn = document.getElementById('pause-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (confirm('Delete ALL save files and reload?')) {
      try {
        for (const k of SAVE_SLOT_KEYS) localStorage.removeItem(k);
        localStorage.removeItem('wonkyAcorn_activeSlot');
        localStorage.removeItem('wonkyAcornIntroSeen');
      } catch (e) {}
      location.reload();
    }
  });

  // REPLAY CHAPTERS panel — wire each replay row to jump to that chapter
  document.querySelectorAll('.replay-row').forEach(row => {
    row.addEventListener('click', () => {
      if (!isReplayUnlocked()) return;
      const target = row.dataset.replay;
      // Close the pause menu first so the replay cutscene plays cleanly
      setPaused(false);
      // Reset state common to chapter starts
      freePlayMode = false;
      squirrelEscaped = false;
      squirrelEscaping = false;
      squirrelCatching = false;
      closeUpActive = false;
      warnCount = 0;
      walkingToSchool = false;
      ch4Phase = 'idle';
      ch5Phase = 'idle';
      ch3Phase = 'idle';
      jailGroup.visible = false;
      freeplaySignPost.visible = false;
      butcherInJail.visible = false;
      squirrelInJail.visible = false;
      squirrel.visible = false;
      setTauntPrompt(false);
      setRoomPostGame(false);   // story replays show the scattered moving boxes
      resetQuest();
      acornGroup.visible = false;   // collectibles are free-play only
      if (acornHudEl) acornHudEl.classList.remove('show');
      // Clear ALL scene visibility so we don't see ghosts of the previous chapter
      bedroomGroup.visible = false;
      kitchenGroup.visible = false;
      newBedroomGroup.visible = false;
      schoolGroup.visible = false;
      butcherShopGroup.visible = false;
      butcher.visible = false;
      hazel.visible = false;
      brunk.visible = false;
      pemberton.visible = false;
      houseMum.visible = false;
      hazel.userData.following = false;
      if (jailGroup.userData) jailGroup.userData.lastTaunt = null;
      // Dispatch to the chapter starter
      switch (target) {
        case 'intro':    beginIntro(); break;
        case 'newhouse': enterNewBedroom(); break;
        case 'school':   beginChapter3(); break;
        case 'errand':   beginChapter4(); break;
        case 'butcher':  beginChapter5(); break;
        case 'ending':   beginChapter6(); break;
        case 'bonus1':   bonusReplay = true; bonusActive = false; beginBonus1(); break;
        case 'bonus2':   bonusReplay = true; bonusActive = false; beginBonus2(); break;
        case 'bonus3':   bonusReplay = true; bonusActive = false; beginBonus3(); break;
        case 'bonus4':   bonusReplay = true; bonusActive = false; beginBonus4(); break;
      }
    });
  });

  // SAVE panel — wire per-slot buttons via delegation
  document.querySelectorAll('.save-slot').forEach(slotEl => {
    const n = +slotEl.dataset.slot;
    slotEl.querySelector('.slot-save').addEventListener('click', () => {
      const existing = readSlot(n);
      if (existing && !confirm(`Overwrite File ${n}? (${existing.label})`)) return;
      saveToSlot(n);
    });
    slotEl.querySelector('.slot-load').addEventListener('click', (e) => {
      if (confirm(`Load File ${n}? Current unsaved progress will be lost.`)) {
        e.currentTarget.disabled = true;   // prevent rapid double-clicks racing the reload
        loadSlot(n);
      }
    });
    slotEl.querySelector('.slot-delete').addEventListener('click', () => {
      if (confirm(`Delete File ${n}? This cannot be undone.`)) deleteSlot(n);
    });
  });

  // Render once on boot so the UI shows the right state if user opens straight to SAVE
  renderSlots();
}

window.addEventListener('keydown', e => {
  // P or Esc during free roam toggles pause
  if ((e.code === 'KeyP' || e.code === 'Escape') && !controlsLocked) {
    e.preventDefault();
    setPaused(!paused);
    return;
  }
});

// Allow skipping the cutscene with Escape
window.addEventListener('keydown', e => {
  if (e.code === 'Escape' && controlsLocked) {
    // Don't let Esc clobber an end-of-chapter card — those have their own
    // Continue button and shouldn't be skip-dismissed mid-display.
    const titleCard = document.getElementById('title-card');
    if (titleCard && titleCard.style.display !== 'none' &&
        titleCard.textContent && /END OF|THE END/i.test(titleCard.textContent)) {
      return;
    }
    console.log('Cutscene skipped');
    // Flip the cancellation flag — sleep() and showSpeechBubble() will resolve
    // immediately, letting the cutscene race through to its natural end state
    // (which lands the player exactly where the cutscene was going to leave them).
    cutsceneCancelled = true;
    // Also stop any voice line that was speaking
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    if (stopAlarm) { stopAlarm(); stopAlarm = null; }
    // Hide the visible UI bubble so the speed-run isn't visible
    const bubble = document.getElementById('speech-bubble');
    if (bubble) { bubble.classList.remove('show'); bubble.classList.add('hide'); }
    // Also dismiss any title card that's currently up (chapter intro overlay)
    if (titleCard && !/END OF|THE END/i.test(titleCard.textContent || '')) {
      titleCard.style.display = 'none';
    }
    showFade(false);
    loadingEl.style.display = 'none';
    hudEl.classList.add('show');
  }
});

// ═══════════════════════════════════════════════════════
// AMBIENT BIRDS — synth chirps in the meadow
// ═══════════════════════════════════════════════════════
function birdChirp() {
  const ctx = ensureAudio();
  if (!ctx) return;
  // 2-3 quick rising notes
  const baseFreq = 1800 + Math.random() * 800;
  const noteCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < noteCount; i++) {
    const t0 = ctx.currentTime + i * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, t0 + 0.07);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.04, t0 + 0.01);
    gain.gain.linearRampToValueAtTime(0, t0 + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  }
}

function scheduleNextBird() {
  // Only chirp during free roam (not during cutscene)
  const delay = 3000 + Math.random() * 8000;
  setTimeout(() => {
    if (!controlsLocked) birdChirp();
    scheduleNextBird();
  }, delay);
}
scheduleNextBird();

// ═══════════════════════════════════════════════════════
// DYNAMIC ZONE LABEL — shows where Pico is in the HUD
// ═══════════════════════════════════════════════════════
let lastZoneLabel = '';
function updateZoneLabel() {
  if (!pico) return;
  const px = player.position.x;
  const pz = player.position.z;
  let zone;
  // Scratchett's shop?
  if (butcherShopGroup.visible &&
      Math.abs(pz - BUTCHER_ORIGIN.z) < 10 &&
      Math.abs(px - BUTCHER_ORIGIN.x) < 8) {
    zone = 'SCRATCHETT & SONS';
  } else if (schoolGroup.visible &&
      Math.abs(pz - SCHOOL_ORIGIN.z) < 15 &&
      Math.abs(px - SCHOOL_ORIGIN.x) < 6) {
    zone = 'CONKER HEIGHTS HIGH';
  } else if (newBedroomGroup.visible &&
      Math.abs(pz - NEW_BEDROOM_ORIGIN.z) < 9 &&
      Math.abs(px - NEW_BEDROOM_ORIGIN.x) < 6) {
    const lz = pz - NEW_BEDROOM_ORIGIN.z;
    if (lz <= -1) zone = 'PICO\'S NEW ROOM';
    else if (lz < 3.2) zone = 'STAIRS';
    else if (lz < 6) {
      const lx = px - NEW_BEDROOM_ORIGIN.x;
      if (lx > 1.5) zone = 'LIVING ROOM';
      else if (lx < -1.5) zone = 'LIVING ROOM';
      else zone = 'LIVING ROOM';
    }
    else zone = 'ENTRANCE HALL';
  } else {
    // Distance to the new house front gate area
    const distToHouse = Math.hypot(px - (-12), pz - (-6.5));
    if (distToHouse < 5) zone = 'PICO\'S GARDEN';
    else if (distToHouse < 12) zone = 'NEW NEIGHBOURHOOD';
    else if (Math.hypot(px, pz) > 35) zone = 'EDGE OF THE MEADOW';
    else zone = 'THE MEADOW';
  }

  if (zone !== lastZoneLabel) {
    lastZoneLabel = zone;
    const el = document.querySelector('.hud-zone');
    if (el) el.textContent = zone;
  }

  // Objective: walk into the new house door — only ever fires once, and ONLY
  // during the first-arrival sequence (Ch.1 intro). After Ch.2 the player can
  // walk past the house exterior without re-triggering the bedroom cutscene.
  if (!objectiveReached && currentCheckpoint === 'intro') {
    const distToDoor = Math.hypot(px - (-12), pz - (-9.5));  // door is at house front
    if (distToDoor < 1.5) {
      objectiveReached = true;
      const star = scene.userData.objectiveStar;
      if (star) star.visible = false;
      const objEl = document.getElementById('hud-objective');
      if (objEl) objEl.classList.add('hide');
      enterNewBedroom();
    }
  }
}

// ═══════════════════════════════════════════════════════
// NEW BEDROOM — touch-the-boxes mini-objective
// ═══════════════════════════════════════════════════════
const BOX_MEMORIES = {
  CLOTHES: 'My favourite jumper… still smells like home.',
  TOYS:    'My old toys! I should\'ve packed these better.',
  BOOKS:   '“Treasure Island”… I read this every night in Acornville.',
  STUFF:   'I don\'t even remember what\'s in this one.'
};
let allBoxesTouched = false;
let pendingBoxLine = null;
function checkBoxTouches() {
  // Free-play tidies the room (boxes hidden) — the touch mini-objective is Ch.2-only
  if (!newBedroomGroup.visible || allBoxesTouched || freePlayMode) return;
  const boxes = newBedroomGroup.userData.boxes;
  if (!boxes || boxes.length === 0) return;

  // Pico's position in NEW_BEDROOM local space
  const localX = player.position.x - NEW_BEDROOM_ORIGIN.x;
  const localZ = player.position.z - NEW_BEDROOM_ORIGIN.z;

  let touchedCount = 0;
  for (const box of boxes) {
    if (box.userData.touched) {
      touchedCount++;
      continue;
    }
    const bx = box.parent.position.x;        // box body is inside a Group at this offset
    const bz = box.parent.position.z;
    const dist = Math.hypot(localX - bx, localZ - bz);
    if (dist < 1.4) {
      box.userData.touched = true;
      touchedCount++;
      // Visual: small emissive flash + scale punch
      box.material.emissive = new THREE.Color(0xFFD740);
      box.material.emissiveIntensity = 0.4;
      box.parent.userData.bumpStart = performance.now();
      // Sparkle burst at the box's world position
      const worldX = NEW_BEDROOM_ORIGIN.x + box.parent.position.x;
      const worldY = box.parent.position.y + 0.4;
      const worldZ = NEW_BEDROOM_ORIGIN.z + box.parent.position.z;
      emitSparkles(worldX, worldY, worldZ);
      // Sound
      playTone({ freq: 660, dur: 0.12, type: 'triangle', volume: 0.18 });
      setTimeout(() => playTone({ freq: 880, dur: 0.12, type: 'triangle', volume: 0.15 }), 80);
      // Pico says something specific to this box (only one line per "burst")
      const memory = BOX_MEMORIES[box.parent.userData.label];
      if (memory && !pendingBoxLine) {
        pendingBoxLine = memory;
      }
    }
  }

  // Flush at most one box-memory line per frame to avoid overlapping bubbles
  if (pendingBoxLine) {
    const line = pendingBoxLine;
    pendingBoxLine = null;
    showSpeech(line, 2400);
  }

  // Update objective text
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.querySelector('.objective-text').textContent = `Touch each box (${touchedCount}/${boxes.length})`;
  }

  // Bump animation for recently-touched boxes
  for (const box of boxes) {
    if (box.parent.userData.bumpStart) {
      const t = (performance.now() - box.parent.userData.bumpStart) / 1000;
      if (t < 0.4) {
        const s = 1 + Math.sin(t * Math.PI / 0.4) * 0.08;
        box.scale.setScalar(s);
      } else {
        box.scale.setScalar(1);
        delete box.parent.userData.bumpStart;
      }
    }
  }

  if (touchedCount === boxes.length) {
    allBoxesTouched = true;
    onAllBoxesTouched();
  }
}

async function onAllBoxesTouched() {
  controlsLocked = true;
  const objEl = document.getElementById('hud-objective');
  if (objEl) objEl.classList.add('hide');
  await sleep(500);

  // ── Ch.2.3 — City Night (bedtime) ──
  showFade(true);
  await sleep(900);

  // Dim the bedroom for night: cool blue ambient + replace warm window light with moonlight
  // Find the existing window light and modify it
  let nightLight = null;
  newBedroomGroup.traverse(o => {
    if (o.isPointLight && !o.userData.isMoon) {
      o.userData.originalIntensity = o.intensity;
      o.userData.originalColor = o.color.getHex();
      o.intensity = 0.4;
      o.color.setHex(0x6688CC);  // cool moonlit blue
      nightLight = o;
    }
  });
  // Camera angle for the bedtime shot — lower, more intimate (upstairs!)
  camState.target.set(NEW_BEDROOM_ORIGIN.x, UPSTAIRS_Y + 1.0, NEW_BEDROOM_ORIGIN.z - 3);
  camState.distance = 5;
  camState.pitch = 0.22;
  camState.yaw = 0;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(600);

  // Pico says he can't sleep
  await showSpeech('It\'s too loud. I can\'t hear the trees.', 2600);
  await showSpeechFromNPC('granny', 'I know, sweetheart. New places are loud until they\'re home.', 3000);
  await showSpeech('When does it stop being new?', 2200);
  await showSpeechFromNPC('granny', 'When you\'ve got a reason to look forward to tomorrow.', 3000);

  // Soft "kiss on cap" beat — tiny chime
  playTone({ freq: 1320, dur: 0.25, type: 'sine', volume: 0.12, attack: 0.02, release: 0.2 });
  await sleep(600);

  // "Lights out" — full fade to black
  showFade(true);
  if (nightLight) nightLight.intensity = 0;
  await sleep(1400);

  // The brave whisper in the dark
  await showSpeech('...High school tomorrow.', 2400);

  // End-of-Ch.2 card with Continue → Ch.3 button (per SCRIPT.md)
  await sleep(800);
  const endHTML = `
    <div style="text-align:center;font-family:'Nunito',sans-serif;color:#fff;padding:40px">
      <div style="font-size:14px;letter-spacing:8px;color:#FFD740;margin-bottom:14px">END OF CHAPTER 2</div>
      <h2 style="font-size:48px;font-weight:900;margin-bottom:18px">The Big City</h2>
      <p style="font-size:15px;color:rgba(255,255,255,0.6);max-width:520px;margin:0 auto 24px;line-height:1.6">
        Tomorrow Pico starts at Conker Heights High.<br>
        He'll meet a fast-talking acorn called Hazel,<br>
        a bully called Brunk… and a corkboard of missing kids.
      </p>
      <button id="continue-ch3" type="button" style="margin:14px 8px 0;padding:14px 32px;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;background:linear-gradient(135deg,#FFD740,#FFC107);color:#1a1a2e;border:none;border-radius:999px;cursor:pointer;box-shadow:0 8px 28px rgba(255,193,7,0.4)">
        Continue → Chapter 3
      </button>
      <button id="end-restart" type="button" style="margin:14px 8px 0;padding:14px 28px;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;background:transparent;color:rgba(255,255,255,0.7);border:1.5px solid rgba(255,255,255,0.3);border-radius:999px;cursor:pointer">
        Restart
      </button>
    </div>
  `;
  const card = document.querySelector('#title-card');
  if (card) {
    card.innerHTML = endHTML;
    card.classList.remove('fade-out');
    card.style.display = 'flex';
    card.classList.add('show');
    const continueBtn = document.getElementById('continue-ch3');
    if (continueBtn) continueBtn.addEventListener('click', () => {
      card.classList.add('fade-out');
      setTimeout(() => { card.style.display = 'none'; }, 1000);
      beginWalkToSchool();
    });
    const restartBtn = document.getElementById('end-restart');
    if (restartBtn) restartBtn.addEventListener('click', () => location.reload());
  }
}

// ═══════════════════════════════════════════════════════
// WALK TO SCHOOL — bridge between Ch.2 bedtime and Ch.3 first day
// ═══════════════════════════════════════════════════════
let walkingToSchool = false;
async function beginWalkToSchool() {
  controlsLocked = true;
  cutsceneCancelled = false;
  setStillMode(true);
  showFade(true);
  await sleep(1100);

  // Hide all interior scenes
  bedroomGroup.visible = false;
  kitchenGroup.visible = false;
  newBedroomGroup.visible = false;
  schoolGroup.visible = false;
  butcherShopGroup.visible = false;
  houseMum.visible = false;
  hazel.visible = false;
  brunk.visible = false;
  pemberton.visible = false;

  // Spawn Pico outside the new house, facing the school
  player.position.set(-12, 0, -6);
  player.position.y = 0;
  facingY = -Math.PI / 2;  // facing west toward the school
  player.rotation.y = -Math.PI / 2;
  playerVel.set(0, 0, 0);
  grounded = true;

  // Camera behind Pico (east of him, since he faces west)
  camState.target.set(player.position.x, 1.1, player.position.z);
  camState.distance = 6;
  camState.yaw = Math.PI / 2;
  camState.pitch = 0.22;
  updateCamera();

  await sleep(200);
  showOverlayCard('Next morning.', 1800);
  await sleep(500);
  showFade(false);
  await sleep(1200);

  // Update HUD
  lastZoneLabel = '';
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.classList.remove('hide');
    objEl.querySelector('.objective-text').textContent = 'Walk to Conker Heights High';
  }

  walkingToSchool = true;
  setStillMode(false);
  controlsLocked = false;
}

function checkWalkToSchoolTrigger() {
  if (!walkingToSchool) return;
  // Don't fire while another interior is visible (loaded mid-flow)
  if (newBedroomGroup.visible || schoolGroup.visible || butcherShopGroup.visible) return;
  const dx = player.position.x - schoolStorefront.userData.doorWorldPos.x;
  const dz = player.position.z - schoolStorefront.userData.doorWorldPos.z;
  if (Math.hypot(dx, dz) < 2.2) {
    walkingToSchool = false;
    beginChapter3();
  }
}

// ═══════════════════════════════════════════════════════
// CHAPTER 3 — FIRST DAY AT CONKER HEIGHTS HIGH
// ═══════════════════════════════════════════════════════
async function beginChapter3() {
  controlsLocked = true;
  setCheckpoint('school');
  cutsceneCancelled = false;
  setStillMode(true);
  // Reset NPC state so a fresh Ch.3 start (or load) is clean
  brunk.visible = false;
  hazel.visible = false;
  pemberton.visible = false;
  hazel.userData.following = false;
  ch3Phase = 'idle';
  showFade(true);
  await sleep(1100);

  // Hide previous rooms, show school
  newBedroomGroup.visible = false;
  schoolGroup.visible = true;
  manualDance = null;

  // Place Pico just inside the hallway, facing down it
  player.position.copy(SCHOOL_ORIGIN);
  player.position.z += 9;            // near one end of the long hallway
  facingY = Math.PI;                 // facing toward -Z (down the hallway)
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.copy(player.position);
  camState.target.y = 1.4;
  camState.distance = 6.5;
  camState.yaw = 0;                  // camera behind player
  camState.pitch = 0.28;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(700);

  // Zone + objective
  lastZoneLabel = '';
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.classList.remove('hide');
    objEl.querySelector('.objective-text').textContent = 'Walk down the hallway';
  }

  // Opening line — overwhelmed, lost
  await showSpeech('Conker Heights High. Just stay invisible.', 2600);

  ch3Phase = 'walking';
  setStillMode(false);  // back to animated so the player can walk
  controlsLocked = false;
}

// Ch.3 phase tracking
let ch3Phase = 'idle';   // idle | walking | brunk | hazel | freeRoam | corkboard | done

async function ch3Trigger_brunk() {
  if (ch3Phase !== 'walking') return;
  ch3Phase = 'brunk';
  controlsLocked = true;
  setStillMode(true);   // Pico freezes — Brunk does all the moving

  // Brunk barrels in from the back of the hallway
  brunk.visible = true;
  brunk.position.set(SCHOOL_ORIGIN.x, 0, SCHOOL_ORIGIN.z - 12);
  brunk.rotation.y = 0;  // facing +Z (toward Pico)

  // Walk Brunk toward Pico over ~1.8 seconds
  const startZ = brunk.position.z;
  const endZ = player.position.z + 0.7;
  const dur = 1800;
  const t0 = performance.now();
  await new Promise(resolve => {
    function step() {
      const t = Math.min(1, (performance.now() - t0) / dur);
      brunk.position.z = startZ + (endZ - startZ) * t;
      // Bobbing walk
      brunk.position.y = Math.abs(Math.sin(t * Math.PI * 6)) * 0.06;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    step();
  });

  // Impact: shake + dust + Pico bumped sideways
  addShake(0.3);
  emitDust(player.position.x, player.position.z);
  emitDust(player.position.x + 0.2, player.position.z + 0.2);
  playTone({ freq: 100, dur: 0.25, type: 'sawtooth', volume: 0.25 });

  await showSpeechFromNPC('brunk', 'Watch it, soft-shell.', 1800);

  // Brunk keeps walking past + offstage
  const exitT0 = performance.now();
  await new Promise(resolve => {
    function step() {
      const t = Math.min(1, (performance.now() - exitT0) / 1400);
      brunk.position.z = endZ + (12 - 0) * t;
      brunk.position.y = Math.abs(Math.sin(t * Math.PI * 5)) * 0.05;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    step();
  });
  brunk.visible = false;

  await showSpeech('(to himself) Reason to look forward to tomorrow. Right.', 2800);

  ch3Trigger_hazel();
}

async function ch3Trigger_hazel() {
  ch3Phase = 'hazel';

  // Hazel slides in from the left side of Pico
  hazel.position.set(player.position.x - 3, 0, player.position.z + 0.2);
  hazel.rotation.y = Math.PI / 2;   // facing Pico
  hazel.visible = true;

  // Walk Hazel up to Pico
  const startX = hazel.position.x;
  const endX = player.position.x - 1.2;
  const t0 = performance.now();
  await new Promise(resolve => {
    function step() {
      const t = Math.min(1, (performance.now() - t0) / 1100);
      hazel.position.x = startX + (endX - startX) * t;
      hazel.position.y = Math.abs(Math.sin(t * Math.PI * 5)) * 0.04;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    step();
  });

  await showSpeechFromNPC('hazel', 'Ignore Brunk. He\'s ninety percent shell and ten percent echo.', 3200);
  await showSpeechFromNPC('hazel', 'You\'re new, right? Obviously you\'re new, nobody holds a map like that unless they\'re new. I\'m Hazel.', 4500);
  await showSpeech('I\'m— Pico.', 1800);
  await showSpeechFromNPC('hazel', 'Pico. Good name. Short. Efficient. Okay, we\'re friends now, that\'s decided, keep up —', 4200);
  SFX.ready();

  // Pico waves at Hazel — switch to animated for the wave only
  setStillMode(false);
  if (actions['Big_Wave_Hello']) {
    playAction('Big_Wave_Hello', 0.25);
  }
  await showSpeech('(a real smile, his first in the city) …Okay.', 2800);

  // Hazel falls in behind Pico — she'll follow him via the followLoop
  hazel.userData.following = true;

  // Free roam toward the corkboard — keep Pico animated so he can walk
  ch3Phase = 'freeRoam';
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.querySelector('.objective-text').textContent = 'Walk to the MISSING corkboard';
  }
  controlsLocked = false;
}

async function ch3Trigger_corkboard() {
  if (ch3Phase !== 'freeRoam') return;
  ch3Phase = 'corkboard';
  controlsLocked = true;
  setStillMode(true);   // dialogue beat — Pico stands still

  // Frame camera to face the corkboard
  camState.distance = 4.5;
  camState.yaw = Math.PI / 2 + 0.2;  // looking at the right wall
  camState.pitch = 0.2;

  await showSpeechFromNPC('hazel', 'Three from our year. Since autumn.', 2400);
  await showSpeech('Where\'d they go?', 2000);
  await showSpeechFromNPC('hazel', 'Teachers say "moved away." Nobody moves away in the middle of a Tuesday and leaves their locker open.', 4400);

  // Pemberton-Pine leans out of his classroom
  pemberton.visible = true;
  await showSpeechFromNPC('pemberton', 'Move along now, you two. And Pico — welcome.', 3000);
  await showSpeechFromNPC('pemberton', 'Do stay where it\'s busy. The city\'s no place for an acorn on his own.', 3400);
  await sleep(400);
  pemberton.visible = false;     // goes back into the classroom

  await showSpeechFromNPC('hazel', '(whisper) See? Even he knows something.', 2800);

  ch3Phase = 'done';
  endChapter3();
}

// ═══════════════════════════════════════════════════════
// CHAPTER 5 — THE BUTCHER (Sawbones & Sons)
// ═══════════════════════════════════════════════════════
let ch5Phase = 'idle';   // idle | meeting | chase | escaped | caught
let butcherChaseSpeed = 3.0;

// ═══════════════════════════════════════════════════════
// CHAPTER 4 — THE ERRAND (mum sends Pico to the butcher's)
// ═══════════════════════════════════════════════════════
let ch4Phase = 'idle';   // idle | mumWait | mumTalking | toButcher | done
async function beginChapter4() {
  controlsLocked = true;
  setCheckpoint('newhouse');
  cutsceneCancelled = false;
  setStillMode(true);
  // Reset Ch.3 NPC state in case the player came in from a save mid-school
  hazel.userData.following = false;
  hazel.visible = false;
  brunk.visible = false;
  pemberton.visible = false;
  ch4Phase = 'idle';
  restoreHouseLights();   // morning again
  showFade(true);
  await sleep(1100);

  // Hide other scenes
  schoolGroup.visible = false;
  hazel.visible = false;
  pemberton.visible = false;
  butcherShopGroup.visible = false;
  butcher.visible = false;
  // Show the new house interior + Mum
  newBedroomGroup.visible = true;
  houseMum.visible = true;

  // Place Pico at the BOTTOM of the stairs, facing the living room (+Z south)
  player.position.set(NEW_BEDROOM_ORIGIN.x, 0, NEW_BEDROOM_ORIGIN.z + 3.6);
  facingY = Math.PI;
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;

  // Camera BEHIND Pico (north of him, looking south toward the living room).
  // Pico faces +Z (south); camera at -Z (north) of him → W key = forward = south.
  camState.target.set(player.position.x, 1.0, player.position.z);
  camState.distance = 6;
  camState.yaw = Math.PI;
  camState.pitch = 0.22;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(600);

  // Objective
  lastZoneLabel = '';
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.classList.remove('hide');
    objEl.querySelector('.objective-text').textContent = 'Talk to Mum';
  }

  ch4Phase = 'mumWait';
  setStillMode(false);
  controlsLocked = false;
}

async function ch4_talkToMum() {
  if (ch4Phase !== 'mumWait') return;
  ch4Phase = 'mumTalking';
  controlsLocked = true;
  setStillMode(true);

  // Face Pico toward Mum
  const dx = houseMum.position.x - player.position.x;
  const dz = houseMum.position.z - player.position.z;
  facingY = Math.atan2(dx, dz);
  player.rotation.y = facingY;

  await showSpeechFromNPC('granny', 'There he is — my brave boy! Made a whole friend on your very first day.', 3600);
  await showSpeech('Her name\'s Hazel! She talks like a kettle.', 2600);
  await showSpeechFromNPC('granny', '(laughing) Then tonight we celebrate — our first proper dinner in the new city!', 3800);
  await showSpeechFromNPC('granny', 'The pot\'s on… but I\'m short one thing: a big bag of chestnuts for the roast.', 3800);
  await showSpeechFromNPC('granny', 'The freshest in the city are at Scratchett\'s — the little shop on the corner. Could you pop down for me?', 4600);
  await showSpeech('On my own?', 1800);
  await showSpeechFromNPC('granny', 'You\'re a city acorn now! Straight there, straight back, and you\'ll be just fine.', 3800);
  await showSpeech('…Okay, Mum. Straight there, straight back!', 2600);

  // Update objective and let player roam
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.querySelector('.objective-text').textContent = 'Walk to Scratchett\'s shop';
  }

  ch4Phase = 'toButcher';
  setStillMode(false);
  controlsLocked = false;
}

// Per-frame proximity check during Ch.4
function checkChapter4Triggers() {
  if (ch4Phase === 'mumWait') {
    if (!newBedroomGroup.visible || !houseMum.visible) return;
    const dx = player.position.x - houseMum.position.x;
    const dz = player.position.z - houseMum.position.z;
    if (Math.hypot(dx, dz) < 1.8) ch4_talkToMum();
  } else if (ch4Phase === 'toButcher') {
    // Pico needs to walk to Scratchett's storefront in the meadow
    if (newBedroomGroup.visible || butcherShopGroup.visible) return;
    const dx = player.position.x - butcherStorefront.userData.doorWorldPos.x;
    const dz = player.position.z - butcherStorefront.userData.doorWorldPos.z;
    if (Math.hypot(dx, dz) < 2.0) {
      ch4Phase = 'done';
      beginChapter5();
    }
  }
}

async function beginChapter5() {
  controlsLocked = true;
  setCheckpoint('butcher');
  cutsceneCancelled = false;
  setStillMode(true);
  houseMum.visible = false;
  newBedroomGroup.visible = false;
  // Detach Hazel — she follows in Ch.3 but shouldn't tag along inside the shop
  hazel.userData.following = false;
  hazel.visible = false;
  showFade(true);
  await sleep(1100);

  // Hide other rooms
  schoolGroup.visible = false;
  hazel.visible = false;
  pemberton.visible = false;
  butcherShopGroup.visible = true;

  // Place Pico inside the shop, facing the counter (-Z)
  player.position.copy(BUTCHER_ORIGIN);
  player.position.z += 3.5;   // near the front door, facing into the shop
  facingY = Math.PI;          // facing the back (counter side)
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;

  // Place the Butcher behind the counter, facing Pico
  butcher.position.copy(BUTCHER_ORIGIN);
  butcher.position.z -= 4.2;   // behind counter
  butcher.rotation.y = 0;       // facing +Z (toward Pico)
  butcher.visible = true;

  // Camera framing: side-on 2-shot so we can see Pico AND the Butcher
  // (yaw=0 was pointing the camera straight through the door — bad)
  camState.target.set(0, 1.6, BUTCHER_ORIGIN.z - 0.6);  // midway between them, slightly raised
  camState.distance = 6;
  camState.yaw = -Math.PI / 2;   // camera on the west side, looking east
  camState.pitch = 0.12;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(600);

  // Update HUD
  lastZoneLabel = '';
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.classList.remove('hide');
    objEl.querySelector('.objective-text').textContent = 'Buy chestnuts for Mum';
  }

  // ── 5.1: The Counter (per SCRIPT.md) ──
  ch5Phase = 'meeting';

  // Ding the bell sound effect
  playTone({ freq: 2100, dur: 0.18, type: 'sine', volume: 0.18, attack: 0.005, release: 0.18 });
  setTimeout(() => playTone({ freq: 2600, dur: 0.18, type: 'sine', volume: 0.15, attack: 0.005, release: 0.2 }), 80);
  // Wiggle the bell briefly
  const bell = butcherShopGroup.userData.bell;
  if (bell) {
    const t0 = performance.now();
    (function shakeBell() {
      const t = (performance.now() - t0) / 1000;
      if (t > 0.8) { bell.rotation.z = 0; return; }
      bell.rotation.z = Math.sin(t * 30) * 0.25;
      requestAnimationFrame(shakeBell);
    })();
  }
  await sleep(900);

  await showSpeechFromNPC('squirrel', 'Ooh-hoo! A customer! Come in, come in — mind my lovely acorns, won\'t you?', 4200);
  await showSpeech('Um — I just need some chestnuts for my mum—', 2800);
  await showSpeechFromNPC('squirrel', '(gasping) Chestnuts? Never mind chestnuts! Look at YOU — the roundest acorn I\'ve EVER seen!', 4600);
  await showSpeech('...Me?', 1600);
  await showSpeechFromNPC('squirrel', 'You\'d be the jewel of my whole collection! Top shelf — pride of place!', 4000);
  // Scratchett whips out a big collecting sack (no blade — pure cartoon menace)
  playTone({ freq: 700, dur: 0.25, type: 'square', volume: 0.14 });
  addShake(0.2);
  await showSpeechFromNPC('squirrel', 'Come HERE, you perfect little prize — into my sack you go!', 3400);

  // Callback gag — the salt joke at peak danger
  addShake(0.35);
  await showSpeech('— MUM WAS RIGHT ABOUT THE SALT!', 2400);

  // ── 5.2: THE CHASE ──
  ch5Phase = 'chase';
  setStillMode(false);  // Pico needs to actually run
  if (objEl) {
    objEl.querySelector('.objective-text').textContent = 'RUN to the door!';
  }
  // Re-orient camera + Pico so W=forward=south=toward the door (the exit).
  // yaw=PI puts the camera NORTH of Pico, looking south; facingY=PI turns
  // Pico to face +Z (south) so pressing W moves him toward the door.
  camState.target.copy(player.position);
  camState.target.y = 1;
  camState.distance = 6;
  camState.yaw = Math.PI;
  camState.pitch = 0.18;
  facingY = Math.PI;
  player.rotation.y = Math.PI;
  updateCamera();
  controlsLocked = false;
}

// Per-frame check for Ch.5 — butcher chases Pico, escape on reaching the door
function checkButcherChase(dt) {
  if (!butcherShopGroup.visible || ch5Phase !== 'chase') return;

  // 1) Move the butcher toward Pico (slow lumbering chase)
  const dx = player.position.x - butcher.position.x;
  const dz = player.position.z - butcher.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.001) {
    const nx = dx / dist, nz = dz / dist;
    butcher.position.x += nx * butcherChaseSpeed * dt;
    butcher.position.z += nz * butcherChaseSpeed * dt;
    butcher.rotation.y = Math.atan2(nx, nz);
    // Heavy bobbing run
    butcher.position.y = Math.abs(Math.sin(performance.now() * 0.012)) * 0.12;
  }

  // 2) Caught — within 1.4m of butcher = failure
  if (dist < 1.4) {
    onButcherCaught();
    return;
  }

  // 3) Escaped — reached the door
  const localZ = player.position.z - BUTCHER_ORIGIN.z;
  if (localZ > 6.5) {
    onButcherEscaped();
  }
}

async function onButcherCaught() {
  if (ch5Phase !== 'chase') return;
  ch5Phase = 'caught';
  controlsLocked = true;
  setStillMode(true);
  addShake(0.5);
  playTone({ freq: 80, dur: 0.5, type: 'sawtooth', volume: 0.3 });
  await showSpeechFromNPC('squirrel', 'Tee-hee! Gotcha! Ooh, you\'ll look LOVELY on my shelf—', 3000);
  await sleep(500);
  // Restart the chase
  player.position.copy(BUTCHER_ORIGIN);
  player.position.z += 3.5;
  facingY = Math.PI;
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  butcher.position.copy(BUTCHER_ORIGIN);
  butcher.position.z -= 4.2;
  await showSpeech('(another chance!) RUN!', 1800);
  setStillMode(false);
  ch5Phase = 'chase';
  controlsLocked = false;
}

async function onButcherEscaped() {
  if (ch5Phase !== 'chase') return;
  ch5Phase = 'escaped';
  controlsLocked = true;
  // Slam the door behind Pico
  playTone({ freq: 120, dur: 0.3, type: 'square', volume: 0.25 });
  SFX.ready();
  await sleep(400);

  showFade(true);
  await sleep(1100);
  butcherShopGroup.visible = false;
  butcher.visible = false;

  // End-of-Ch.5 card → continue to Ch.6
  const endHTML = `
    <div style="text-align:center;font-family:'Nunito',sans-serif;color:#fff;padding:40px">
      <div style="font-size:14px;letter-spacing:8px;color:#FFD740;margin-bottom:14px">END OF CHAPTER 5</div>
      <h2 style="font-size:48px;font-weight:900;margin-bottom:18px">Scratchett's Shop</h2>
      <p style="font-size:15px;color:rgba(255,255,255,0.6);max-width:520px;margin:0 auto 24px;line-height:1.6">
        Pico made it out. Scratchett is still in there, chittering through the door…<br>
        He runs all the way home. Hazel and Brunk are already on the doorstep.
      </p>
      <button id="continue-ch6" type="button" style="margin:14px 8px 0;padding:14px 32px;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;background:linear-gradient(135deg,#FFD740,#FFC107);color:#1a1a2e;border:none;border-radius:999px;cursor:pointer;box-shadow:0 8px 28px rgba(255,193,7,0.4)">
        Continue → Chapter 6
      </button>
      <button id="end-restart-ch5" type="button" style="margin:14px 8px 0;padding:14px 28px;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;background:transparent;color:rgba(255,255,255,0.7);border:1.5px solid rgba(255,255,255,0.3);border-radius:999px;cursor:pointer">
        Restart
      </button>
    </div>
  `;
  const card = document.querySelector('#title-card');
  if (card) {
    card.innerHTML = endHTML;
    card.classList.remove('fade-out');
    card.style.display = 'flex';
    card.classList.add('show');
    const cont = document.getElementById('continue-ch6');
    if (cont) cont.addEventListener('click', () => {
      card.classList.add('fade-out');
      setTimeout(() => { card.style.display = 'none'; }, 1000);
      beginChapter6();
    });
    const restart = document.getElementById('end-restart-ch5');
    if (restart) restart.addEventListener('click', () => location.reload());
  }
}

// ═══════════════════════════════════════════════════════
// CHAPTER 6 — THE INVESTIGATION + ENDING
// ═══════════════════════════════════════════════════════
async function beginChapter6() {
  controlsLocked = true;
  setCheckpoint('ending');
  cutsceneCancelled = false;
  setStillMode(true);
  showFade(true);
  await sleep(1100);

  // Show the new house exterior with Pico + Hazel + Brunk on the doorstep
  schoolGroup.visible = false;
  butcherShopGroup.visible = false;
  butcher.visible = false;
  newBedroomGroup.visible = false;
  houseMum.visible = false;
  // Put Hazel and Brunk visible in the meadow near the new house
  hazel.position.set(-10, 0, -7);
  hazel.rotation.y = -Math.PI / 2;
  hazel.visible = true;
  brunk.position.set(-14, 0, -7);
  brunk.rotation.y = Math.PI / 2;
  brunk.visible = true;
  // Pico arrives in the middle
  player.position.set(-12, 0, -6);
  facingY = 0;
  player.rotation.y = 0;
  playerVel.set(0, 0, 0);
  grounded = true;
  // Camera frames the three of them
  camState.target.set(-12, 1.0, -7);
  camState.distance = 7;
  camState.yaw = 0;
  camState.pitch = 0.2;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(700);

  lastZoneLabel = '';
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.classList.remove('hide');
    objEl.querySelector('.objective-text').textContent = 'Solve the mystery';
  }

  // ── 6.1 The doorstep ──
  await showSpeech('I saw him! He tried to —', 2200);
  await showSpeechFromNPC('hazel', 'We know. The corkboard kids. They\'re still alive.', 3200);
  await showSpeechFromNPC('brunk', '(quietly) …I helped him. The pranks. The acorns.', 3000);
  await showSpeech('You WHAT?!', 1800);
  await showSpeechFromNPC('brunk', 'I didn\'t know what he was DOING with them. I do now. I\'m here.', 3400);
  await showSpeechFromNPC('hazel', 'They\'re in his store-room. We checked. They\'re scared but they\'re okay.', 3600);

  // ── 6.2 The cellar (compressed beat — fade-card "Later that night") ──
  showFade(true);
  await sleep(1200);
  showOverlayCard('Later that night…', 2200);
  await sleep(2500);

  // ── 6.3 The rescue ──
  showFade(false);
  await sleep(500);
  await showSpeechFromNPC('hazel', 'Pico, behind you — the LATCH!', 2800);
  await showSpeech('Got it!', 1200);
  playTone({ freq: 880, dur: 0.18, type: 'triangle', volume: 0.18 });
  addShake(0.2);
  await showSpeech('(the store-room door creaks open) Run! All of you, RUN!', 3200);
  await sleep(500);

  // ── 6.4 Scratchett unmasked ──
  await showSpeechFromNPC('squirrel', '(chittering) You don\'t understand, you little SHELL!', 3400);
  await showSpeech('Then EXPLAIN.', 1600);
  await showSpeechFromNPC('squirrel', 'I only wanted the FINEST collection in the whole city! Nobody hoards like Scratchett!', 4200);
  await showSpeechFromNPC('squirrel', '…and I\'m not the only collector out there, oh no. You\'ll SEE.', 3400);

  // ── 6.5 The arrest ──
  showFade(true);
  await sleep(1000);
  showOverlayCard('The police arrive.', 1800);
  await sleep(2000);
  // Little siren motif while screen is black
  playTone({ freq: 880, dur: 0.3, type: 'square', volume: 0.16 });
  setTimeout(() => playTone({ freq: 660, dur: 0.3, type: 'square', volume: 0.16 }), 350);
  setTimeout(() => playTone({ freq: 880, dur: 0.3, type: 'square', volume: 0.16 }), 700);
  await sleep(1200);
  await showSpeechFromNPC('brunk', '(quietly) Take him away.', 2600);

  // ── 6.6 The morning after ──
  showOverlayCard('The next morning.', 2000);
  await sleep(2200);
  showFade(false);

  await showSpeechFromNPC('hazel', 'You\'ve got a reason to look forward to tomorrow now.', 3000);
  await showSpeech('(small smile) Yeah. I do.', 2400);
  await sleep(400);
  await showSpeechFromNPC('hazel', 'Scratchett\'s in the jail across the meadow. They\'ll keep him there a long time.', 4000);

  await sleep(800);

  // ── FREE PLAY UNLOCK ──
  try { localStorage.setItem('wonkyAcorn_freeplayUnlocked', '1'); localStorage.setItem('wonkyAcorn_2pUnlocked', '1'); } catch (e) {}

  // ── Congratulations / Unlock card ──
  const endHTML = `
    <div style="text-align:center;font-family:'Nunito',sans-serif;color:#fff;padding:40px;max-width:680px">
      <div style="font-size:14px;letter-spacing:8px;color:#FFD740;margin-bottom:14px">🌰 CONGRATULATIONS 🌰</div>
      <h2 style="font-size:30px;font-weight:900;margin-bottom:18px;line-height:1.3">You have solved the mystery of the missing acorns<br>and finished the game!</h2>
      <p style="font-size:15px;color:rgba(255,255,255,0.9);max-width:580px;margin:0 auto 22px;line-height:1.7">
        You have unlocked <b>free-play</b>. You can now enter <b>the house</b>,
        <b>the school</b>, and <b>the shop</b> at your own will, and there is a
        <b>jail</b> where <b>Scratchett the squirrel</b> is locked up.<br><br>
        Walk up to his cell and <b>taunt</b> him if you dare — but push your luck
        too many times and he'll burst out and chase you all over the meadow!<br><br>
        You can also <b>replay chapters</b> by going to <b>Replay Chapters</b>
        in the pause menu.<br><br>
        🎮 <b>You've unlocked 2-PLAYER!</b> With two controllers connected, open the
        pause menu and hit <b>Change to 2 Player</b> — a friend can slide <b>Hazel</b>
        around as you play <b>Pico</b>.
      </p>
      <button id="end-freeplay" type="button" style="margin:14px 8px 0;padding:14px 32px;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;background:linear-gradient(135deg,#FFD740,#FFC107);color:#1a1a2e;border:none;border-radius:999px;cursor:pointer;box-shadow:0 8px 28px rgba(255,193,7,0.4)">
        Enter Free Play
      </button>
      <button id="end-restart-final" type="button" style="margin:14px 8px 0;padding:14px 28px;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;background:transparent;color:rgba(255,255,255,0.7);border:1.5px solid rgba(255,255,255,0.3);border-radius:999px;cursor:pointer">
        Play again from start
      </button>
    </div>
  `;
  const card = document.querySelector('#title-card');
  if (card) {
    card.innerHTML = endHTML;
    card.classList.remove('fade-out');
    card.style.display = 'flex';
    card.classList.add('show');
    const fpBtn = document.getElementById('end-freeplay');
    if (fpBtn) fpBtn.addEventListener('click', () => {
      card.classList.add('fade-out');
      setTimeout(() => { card.style.display = 'none'; }, 800);
      enterFreePlay();
    });
    const restart = document.getElementById('end-restart-final');
    if (restart) restart.addEventListener('click', () => location.reload());
  }
}

// ═══════════════════════════════════════════════════════
// FREE PLAY MODE — unlocked after beating Ch.6
// ═══════════════════════════════════════════════════════
let freePlayMode = false;
let tauntCount = 0;            // cycles Pico's taunt lines (persists across the whole loop)
let warnCount = 0;            // taunts this round → escalating warnings before he breaks out
let squirrelEscaped = false; // is Scratchett out of his cell, chasing?
let squirrelEscaping = false; // final warning landed → break-out is queued (blocks extra taunts)
let squirrelChaseSecs = 0;   // seconds in the current chase (drives the speed-up)
let squirrelCatching = false; // mid catch-cutscene latch
let closeUpActive = false;   // the 3s acorn close-up holds the camera (suppresses follow-lerp)
const MPH_TO_UNITS = 1.0;    // chase speed: mph → world units/sec (Pico walks 4.5, sprints ~8.1)

function enterFreePlay() {
  freePlayMode = true;
  tauntCount = 0;
  warnCount = 0;
  squirrelEscaped = false;
  squirrelEscaping = false;
  squirrelChaseSecs = 0;
  squirrelCatching = false;
  closeUpActive = false;
  setCheckpoint('freeplay');
  // You beat the game → Pico's room is now neat and tidy (empty boxes piled away)
  setRoomPostGame(true);
  // Reset the side-mission / portal quest, then show the collectible acorns
  resetQuest();
  acornGroup.visible = true;
  setAcornHud(true);
  // Hide all cutscene state, show the meadow
  bedroomGroup.visible = false;
  kitchenGroup.visible = false;
  newBedroomGroup.visible = false;
  schoolGroup.visible = false;
  butcherShopGroup.visible = false;
  butcher.visible = false;
  hazel.visible = false;
  brunk.visible = false;
  pemberton.visible = false;
  houseMum.visible = false;
  // Show the jail with Scratchett the squirrel locked up, sulking by the bars
  jailGroup.visible = true;
  freeplaySignPost.visible = true;
  butcher.visible = false;
  butcherInJail.visible = false;
  squirrel.visible = false;
  squirrelInJail.position.set(JAIL_POS.x - 1.3, 0, JAIL_POS.z - 2.5);
  squirrelInJail.rotation.y = Math.PI;   // facing south toward the bars
  squirrelInJail.visible = true;
  // Place Pico in the middle of the meadow
  player.position.set(0, 0, 0);
  facingY = 0;
  player.rotation.y = 0;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.set(0, 1.2, 0);
  camState.distance = 7;
  camState.yaw = 0;
  camState.pitch = 0.28;
  updateCamera();
  showFade(false);
  // HUD
  lastZoneLabel = '';
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.classList.remove('hide');
    objEl.querySelector('.objective-text').textContent = 'FREE PLAY — explore anywhere';
  }
  setStillMode(false);
  controlsLocked = false;
  // Briefly tell the player what they can do
  setTimeout(() => showSpeech('Free Play! Walk to any building to enter.', 3200), 600);
}

// Quick entries — no cutscene, just teleport inside the building
async function enterHouseFree() {
  controlsLocked = true;
  showFade(true);
  await sleep(700);
  newBedroomGroup.visible = true;
  setRoomPostGame(true);   // post-game: tidy room, empty boxes piled in the corner
  restoreHouseLights();
  // Spawn at the entrance hall
  player.position.set(NEW_BEDROOM_ORIGIN.x, 0, NEW_BEDROOM_ORIGIN.z + 7.0);
  facingY = 0;
  player.rotation.y = 0;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.set(player.position.x, 1.1, player.position.z);
  camState.distance = 4.5;
  camState.yaw = Math.PI;
  camState.pitch = 0.3;
  updateCamera();
  await sleep(200);
  showFade(false);
  controlsLocked = false;
}
async function enterSchoolFree() {
  controlsLocked = true;
  showFade(true);
  await sleep(700);
  schoolGroup.visible = true;
  player.position.copy(SCHOOL_ORIGIN);
  player.position.z += 9;
  facingY = Math.PI;
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.set(player.position.x, 1.1, player.position.z);
  camState.distance = 6;
  camState.yaw = 0;
  camState.pitch = 0.28;
  updateCamera();
  await sleep(200);
  showFade(false);
  controlsLocked = false;
}
async function enterButcherShopFree() {
  controlsLocked = true;
  showFade(true);
  await sleep(700);
  butcherShopGroup.visible = true;
  butcher.position.copy(BUTCHER_ORIGIN);
  butcher.position.z -= 4.2;
  butcher.rotation.y = 0;
  butcher.visible = false;   // Butcher is in jail — empty shop
  player.position.copy(BUTCHER_ORIGIN);
  player.position.z += 3.5;
  facingY = 0;
  player.rotation.y = 0;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.set(player.position.x, 1.1, player.position.z);
  camState.distance = 6;
  camState.yaw = Math.PI;
  camState.pitch = 0.22;
  updateCamera();
  await sleep(200);
  showFade(false);
  setTimeout(() => showSpeech('The shop\'s quiet. Scratchett\'s locked up in the jail.', 2800), 400);
  controlsLocked = false;
}
async function exitToMeadowFree() {
  // From any building back to the meadow centre (free-play overworld)
  controlsLocked = true;
  showFade(true);
  await sleep(700);
  newBedroomGroup.visible = false;
  schoolGroup.visible = false;
  butcherShopGroup.visible = false;
  player.position.set(0, 0, 0);
  facingY = 0;
  player.rotation.y = 0;
  playerVel.set(0, 0, 0);
  grounded = true;
  showFade(false);
  controlsLocked = false;
}

// Per-frame triggers active during FREE PLAY
function checkFreePlayTriggers() {
  if (!freePlayMode || controlsLocked) return;
  const px = player.position.x, pz = player.position.z;

  // Walking up to each building's door teleports inside (no cutscene)
  if (!newBedroomGroup.visible && !schoolGroup.visible && !butcherShopGroup.visible) {
    // House door (-12, 0, -9.5)
    if (Math.hypot(px - (-12), pz - (-9.5)) < 1.5) { enterHouseFree(); return; }
    // School door
    const sd = schoolStorefront.userData.doorWorldPos;
    if (Math.hypot(px - sd.x, pz - sd.z) < 2.2) { enterSchoolFree(); return; }
    // Butcher door
    const bd = butcherStorefront.userData.doorWorldPos;
    if (Math.hypot(px - bd.x, pz - bd.z) < 2.0) { enterButcherShopFree(); return; }
  }
  // Inside any building? Walking back to its exit doorway returns to meadow
  if (newBedroomGroup.visible) {
    const lx = px - NEW_BEDROOM_ORIGIN.x, lz = pz - NEW_BEDROOM_ORIGIN.z;
    if (lz >= 7.8 && Math.abs(lx) <= 0.9 && player.position.y < 0.5) { exitToMeadowFree(); return; }
  }
  if (schoolGroup.visible) {
    const lx = px - SCHOOL_ORIGIN.x, lz = pz - SCHOOL_ORIGIN.z;
    if (lz >= 11) { exitToMeadowFree(); return; }
  }
  if (butcherShopGroup.visible) {
    const lz = pz - BUTCHER_ORIGIN.z;
    if (lz >= 6.5) { exitToMeadowFree(); return; }
  }

  // ── Taunt / make-a-deal prompt at Scratchett's bars ──
  if (jailGroup.visible && squirrelInJail.visible && !squirrelEscaped && !quest.dealAccepted) {
    const bp = jailGroup.userData.barsWorldPos;
    const near = Math.hypot(px - bp.x, pz - bp.z) < 1.9;
    setTauntPrompt(near);
  } else {
    setTauntPrompt(false);
  }
}

// ── Taunt lines: Pico cycles through these, one per press ──
const PICO_TAUNTS = [
  'Nah nah na-nah nah!',
  'Hahaha! Can\'t catch me!',
  'Having a good time in there?',
  'Bet you miss your acorns!',
  '(blows a raspberry) Pppbbbt!'
];
// Scratchett gives a bunch of escalating warnings before he finally bursts out
const SQUIRREL_WARNINGS = [
  '(chitter) Oi! Stop that, you cheeky little acorn.',
  'I\'m WARNING you, small fry…',
  'Push me one more time. Go on. I dare you.',
  'That is your LAST warning!',
  '(SPROING!) RIGHT! THAT IS QUITE ENOUGH!'   // final straw → chase
];

// On-screen "Taunt" prompt near the bars (hidden otherwise)
let tauntPromptEl = null;
function setTauntPrompt(show) {
  if (!tauntPromptEl) {
    tauntPromptEl = document.createElement('div');
    tauntPromptEl.id = 'taunt-prompt';
    const wrap = document.querySelector('.game-wrapper');
    if (wrap) wrap.appendChild(tauntPromptEl);
    const fire = (e) => {
      const act = e && e.target && e.target.dataset ? e.target.dataset.act : null;
      if (act === 'deal') tryDeal();
      else if (act === 'taunt') tryTaunt();
      else if (tauntPromptEl.dataset.mode === 'deal') tryDeal();
      else tryTaunt();
    };
    tauntPromptEl.addEventListener('click', fire);
    tauntPromptEl.addEventListener('touchstart', e => { e.preventDefault(); fire(e); }, { passive: false });
  }
  if (!show) { tauntPromptEl.classList.remove('show'); return; }
  const dealMode = quest.missionsDone >= buildingMissions.length && !quest.dealAccepted && squirrelInJail.visible;
  tauntPromptEl.dataset.mode = dealMode ? 'deal' : 'taunt';
  if (dealMode) {
    // both options at once
    tauntPromptEl.innerHTML = isTouch
      ? '<span class="taunt-tap" data-act="taunt">TAUNT</span> <span class="taunt-tap" data-act="deal">MAKE A DEAL</span>'
      : `<span class="taunt-key">${tauntButtonLabel()}</span> Taunt &nbsp;·&nbsp; <span class="taunt-key">${northButtonLabel()}</span> Make a deal`;
  } else {
    tauntPromptEl.innerHTML = isTouch
      ? '<span class="taunt-tap" data-act="taunt">TAUNT</span>'
      : `Press <span class="taunt-key">${tauntButtonLabel()}</span> to Taunt`;
  }
  tauntPromptEl.classList.add('show');
}

// West face button label for the connected pad (Switch Y / PS Square / Xbox X),
// or the keyboard key when there's no pad.
function tauntButtonLabel() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const id = (pad.id || '').toLowerCase();
    if (id.includes('dualsense') || id.includes('dualshock') || id.includes('sony') ||
        id.includes('054c') || id.includes('0ce6') || id.includes('09cc') || id.includes('05c4')) return '□ Square';
    if (id.includes('057e') || id.includes('nintendo') || id.includes('switch') ||
        id.includes('joy-con') || id.includes('pro controller')) return 'Y';
    if (id.includes('xbox') || id.includes('xinput') || id.includes('045e') || id.includes('microsoft')) return 'X';
    return 'X';   // unknown pad → West face button is the X-position
  }
  return 'Y';     // keyboard
}

// A single taunt — cycles Pico's line + an escalating squirrel warning.
// After a bunch of warnings, Scratchett bursts out and the chase begins.
function tryTaunt() {
  if (!freePlayMode || paused || controlsLocked || squirrelEscaped || squirrelEscaping) return;
  if (!jailGroup.visible || !squirrelInJail.visible) return;
  const bp = jailGroup.userData.barsWorldPos;
  if (Math.hypot(player.position.x - bp.x, player.position.z - bp.z) >= 1.8) return;
  // Cool-down so a held button doesn't fire every frame
  const now = performance.now();
  if (jailGroup.userData.lastTaunt && now - jailGroup.userData.lastTaunt < 900) return;
  jailGroup.userData.lastTaunt = now;

  showSpeech(PICO_TAUNTS[tauntCount % PICO_TAUNTS.length], 1700);
  tauntCount++;
  warnCount++;
  playTone({ freq: 520, dur: 0.1, type: 'square', volume: 0.12 });

  const idx = Math.min(warnCount - 1, SQUIRREL_WARNINGS.length - 1);
  setTimeout(() => showSpeechFromNPC('squirrel', SQUIRREL_WARNINGS[idx], 2300), 1100);

  if (warnCount >= SQUIRREL_WARNINGS.length) {
    // Patience gone — latch so extra taunts can't queue a second break-out
    squirrelEscaping = true;
    setTimeout(() => triggerSquirrelEscape(), 1700);
  }
}

async function triggerSquirrelEscape() {
  if (squirrelEscaped) return;
  squirrelEscaped = true;
  squirrelEscaping = false;
  squirrelChaseSecs = 0;
  setTauntPrompt(false);
  addShake(0.35);
  playTone({ freq: 150, dur: 0.4, type: 'sawtooth', volume: 0.22 });
  // Scratchett bursts out of his cell into chase position
  squirrelInJail.visible = false;
  squirrel.position.set(JAIL_POS.x, 0, JAIL_POS.z + 3);
  squirrel.rotation.y = Math.PI;
  squirrel.visible = true;
}

function reJailSquirrel() {
  squirrel.visible = false;
  squirrelEscaped = false;
  squirrelEscaping = false;
  squirrelChaseSecs = 0;
  warnCount = 0;
  squirrelInJail.position.set(JAIL_POS.x - 1.3, 0, JAIL_POS.z - 2.5);
  squirrelInJail.rotation.y = Math.PI;
  squirrelInJail.visible = true;   // back in the cell, locked
  if (jailGroup.userData) jailGroup.userData.lastTaunt = null;
}

// Per-frame free-play extras: ride spins, acorns, portals, bounce, side missions
function updateTownExtras(dt) {
  if (!freePlayMode) return;
  const now = performance.now();
  for (const s of worldSpinners) s.mesh.rotation[s.axis] += s.speed * dt;
  for (const c of collectibles) {
    if (c.collected) continue;
    c.g.rotation.y += dt * (c.golden ? 3.6 : 2.2);
    c.g.position.y = 0.7 + Math.sin(now * 0.004 + c.x) * 0.12;
  }
  for (const m of bouncePads) { if (m.g.userData.cap) m.g.userData.cap.scale.y = 0.7 + Math.sin(now * 0.006 + m.x) * 0.04; }
  for (const bm of buildingMissions) { if (bm.marker && bm.marker.visible) { bm.icon.position.y = 0.7 + Math.sin(now * 0.005 + bm.ix) * 0.15; bm.marker.rotation.y += dt * 1.5; } }
  for (const am of acornvilleMissions) { if (am.marker && am.marker.visible) { am.icon.position.y = 0.7 + Math.sin(now * 0.005 + am.ix) * 0.15; am.marker.rotation.y += dt * 1.5; } }
  if (meadowPortal.userData.swirl) meadowPortal.userData.swirl.rotation.z += dt * 1.5;
  if (acornvillePortal.userData.swirl) acornvillePortal.userData.swirl.rotation.z += dt * 1.5;
  if (currentWorld === 'acornville') updateVillagers(dt);   // acorn folk wander even during chatter
  if (controlsLocked) return;
  const px = player.position.x, pz = player.position.z;

  // Portals (walk into one to travel)
  if (quest.portalOpen && currentWorld === 'meadow' && meadowPortal.visible && Math.hypot(px - MEADOW_PORTAL_POS.x, pz - MEADOW_PORTAL_POS.z) < 1.5) { travelTo('acornville'); return; }
  if (currentWorld === 'acornville' && Math.hypot(px - ACORNVILLE_PORTAL_WORLD.x, pz - ACORNVILLE_PORTAL_WORLD.z) < 1.5) { travelTo('meadow'); return; }

  // Acornville has its own side quests
  if (currentWorld === 'acornville') { updateAcornvilleMissions(px, pz); return; }
  // The collectibles, building missions and mushrooms all live in the meadow
  if (currentWorld !== 'meadow') return;

  // Collect acorns
  for (const c of collectibles) {
    if (c.collected) continue;
    if (Math.hypot(px - c.x, pz - c.z) < 1.2) {
      c.collected = true; c.g.visible = false; acornsCollected++; setAcornHud(true);
      playTone({ freq: c.golden ? 1320 : 880, dur: 0.12, type: 'sine', volume: 0.16 });
      if (c.golden && !quest.dealAccepted && !squirrelEscaped && !squirrelEscaping && squirrelInJail.visible) {
        showSpeech('Ooh — a GOLDEN acorn! …uh-oh.', 2600);
        setTimeout(() => { showSpeechFromNPC('squirrel', '(SHRIEK) MY GOLDEN ACORN! Give it BACK — come HERE!', 3000); triggerSquirrelEscape(); }, 800);
      }
      if (quest.dealAccepted && !quest.portalOpen) {
        setObjective(`Collect every acorn for Scratchett (${acornsCollected}/${collectibles.length})`);
        if (acornsCollected >= collectibles.length) completeDeal();
      }
    }
  }

  // Bounce pads
  for (const m of bouncePads) {
    if (Math.hypot(px - m.x, pz - m.z) < 0.7 && player.position.y < 1.2 && playerVel.y <= 0.5) {
      playerVel.y = 13; grounded = false;
      playTone({ freq: 600, dur: 0.14, type: 'square', volume: 0.14 });
      if (m.g.userData.cap) m.g.userData.cap.scale.y = 0.45;
    }
  }

  // Per-building fetch missions: approach to start → grab marker → bring it back
  for (const bm of buildingMissions) {
    const b = townBuildings[bm.bi]; if (!b) continue;
    const atB = Math.hypot(px - b.x, pz - b.z) < 2.4;
    if (bm.state === 'todo' && atB) {
      bm.state = 'find'; bm.marker.visible = true;
      showSpeech(bm.ask, 3800);
      setObjective(`${bm.name}: follow the glowing marker`);
    } else if (bm.state === 'find' && Math.hypot(px - bm.ix, pz - bm.iz) < 1.3) {
      bm.state = 'return'; bm.marker.visible = false;
      playTone({ freq: 880, dur: 0.12, type: 'sine', volume: 0.15 });
      showSpeech('Got it! Now take it back to the shop.', 2600);
      setObjective(`${bm.name}: bring it back to the shop`);
    } else if (bm.state === 'return' && atB) {
      bm.state = 'done';
      showSpeech(bm.thanks, 3000);
      onMissionDone(bm.name);
    }
  }
}

// ═══════════════════════════════════════════════════════
// BONUS CHAPTERS — unlock in sequence after all Acornville side quests;
// each stays hidden in Replay until beaten.
//   1 The Great Acorn Heist · 2 The Copycat Collector
//   3 Hazel's Turn          · 4 Winter's Hoard
// ═══════════════════════════════════════════════════════
const BONUS_NAMES = ['The Great Acorn Heist', 'The Copycat Collector', 'Hazel\'s Turn', 'Winter\'s Hoard'];
function bonusBeaten() { try { return parseInt(localStorage.getItem('wonkyAcorn_bonusProgress') || '0', 10) || 0; } catch (e) { return 0; } }
function setBonusBeaten(n) { try { localStorage.setItem('wonkyAcorn_bonusProgress', String(Math.max(n, bonusBeaten()))); } catch (e) {} }

// A rival "copycat" squirrel + a snow flurry, built once
const copycat = makeSquirrel(); copycat.scale.setScalar(1.12); copycat.visible = false; scene.add(copycat);
const snowGroup = new THREE.Group(); snowGroup.visible = false; scene.add(snowGroup);
for (let i = 0; i < 50; i++) {
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
  f.position.set((Math.random() - 0.5) * 52, Math.random() * 16, (Math.random() - 0.5) * 52);
  f.userData.sp = 2 + Math.random() * 3; snowGroup.add(f);
}

let bonusActive = false, bonusPhase = 'idle', bonusIdx = -1, bonusHazelMode = false, bonusFleeSpeed = 5.2, bonusReplay = false;
let bonusFoe = null;

function bonusEnterMeadow() {
  freePlayMode = false; controlsLocked = true; currentWorld = 'meadow';
  newBedroomGroup.visible = false; schoolGroup.visible = false; butcherShopGroup.visible = false;
  setTauntPrompt(false); jailGroup.visible = true; freeplaySignPost.visible = true;
}
function bonusPlacePlayer() {
  player.position.set(0, 0, 8); facingY = Math.PI; player.rotation.y = Math.PI; playerVel.set(0, 0, 0); grounded = true;
  camState.target.set(2, 1.4, 4); camState.distance = 8; camState.yaw = Math.PI; camState.pitch = 0.25; updateCamera();
}
function triggerNextBonus() {
  if (bonusActive) return;
  const n = bonusBeaten();
  if (n === 0) beginBonus1();
  else if (n === 1) beginBonus2();
  else if (n === 2) beginBonus3();
  else if (n === 3) beginBonus4();
}

async function beginBonus1() {
  if (bonusActive) return; bonusActive = true; bonusIdx = 0; bonusHazelMode = false; bonusFleeSpeed = 5.2;
  bonusEnterMeadow(); showFade(true); await sleep(700);
  squirrelInJail.visible = false; squirrelEscaped = false;
  squirrel.visible = true; squirrel.position.set(4, 0, 0); squirrel.rotation.y = 0; bonusFoe = squirrel;
  bonusPlacePlayer(); await sleep(200); showFade(false);
  showOverlayCard('BONUS CHAPTER 1', 2200); await sleep(2400);
  await showSpeechFromNPC('squirrel', 'Free at last — and SO many lovely acorns to pinch! Hee-hee-HEE!', 4200);
  await showSpeech('Scratchett?! You promised you\'d behave!', 2600);
  await showSpeechFromNPC('squirrel', 'A squirrel can\'t fight his nature! Catch me if you CAN!', 3800);
  setObjective('Chase Scratchett down and put him back in jail!');
  bonusPhase = 'chase'; controlsLocked = false;
}
async function beginBonus2() {
  if (bonusActive) return; bonusActive = true; bonusIdx = 1; bonusHazelMode = false; bonusFleeSpeed = 5.6;
  bonusEnterMeadow(); showFade(true); await sleep(700);
  squirrelInJail.position.set(JAIL_POS.x - 1.3, 0, JAIL_POS.z - 2.5); squirrelInJail.rotation.y = Math.PI; squirrelInJail.visible = true;
  copycat.visible = true; copycat.position.set(-4, 0, 0); copycat.rotation.y = 0; bonusFoe = copycat;
  bonusPlacePlayer(); await sleep(200); showFade(false);
  showOverlayCard('BONUS CHAPTER 2', 2200); await sleep(2400);
  await showSpeechFromNPC('squirrel', '(from the cell) Pico! That\'s the COPYCAT I once answered to — and now HE\'S after your acorns!', 4800);
  await showSpeechFromNPC('squirrel', 'Catch him and I\'ll behave forever, I promise!', 3200);
  setObjective('Catch the bigger, greedier Copycat Collector!');
  bonusPhase = 'chase'; controlsLocked = false;
}
async function beginBonus3() {
  if (bonusActive) return; bonusActive = true; bonusIdx = 2; bonusHazelMode = true; bonusFleeSpeed = 5.4;
  bonusEnterMeadow(); showFade(true); await sleep(700);
  squirrelInJail.visible = false; squirrel.visible = true; squirrel.position.set(5, 0, 0); squirrel.rotation.y = 0; bonusFoe = squirrel;
  player.visible = false; hazel.userData.following = false; hazel.visible = true;
  bonusPlacePlayer(); hazel.position.copy(player.position); await sleep(200); showFade(false);
  showOverlayCard('BONUS CHAPTER 3 · Hazel\'s Turn', 2400); await sleep(2600);
  await showSpeechFromNPC('hazel', 'My turn! Scratchett wriggled loose again — but he can\'t out-run ME.', 4000);
  await showSpeechFromNPC('squirrel', 'A girl on the rooftops?! No fair!', 2800);
  setObjective('You\'re Hazel! Chase Scratchett down and corner him!');
  bonusPhase = 'chase'; controlsLocked = false;
}
async function beginBonus4() {
  if (bonusActive) return; bonusActive = true; bonusIdx = 3; bonusHazelMode = false; bonusFleeSpeed = 5.8;
  bonusEnterMeadow(); snowGroup.visible = true; showFade(true); await sleep(700);
  squirrelInJail.visible = false; squirrelEscaped = false;
  squirrel.visible = true; squirrel.position.set(4, 0, -2); squirrel.rotation.y = 0; bonusFoe = squirrel;
  bonusPlacePlayer(); await sleep(200); showFade(false);
  showOverlayCard('BONUS CHAPTER 4 · Winter\'s Hoard', 2400); await sleep(2600);
  await showSpeechFromNPC('squirrel', 'Brrr! Winter\'s coming — I need ONE more hoard. Every acorn in town is MINE!', 4800);
  await showSpeech('Not this time, Scratchett — snow won\'t save you!', 3000);
  setObjective('Catch Scratchett one last time before winter!');
  bonusPhase = 'chase'; controlsLocked = false;
}

// ═══════════════════════════════════════════════════════
// TWO-PLAYER (unlocks after beating the game). P1 = Pico (keyboard / pad 1),
// P2 = Hazel sliding on pad 2. Hazel can't taunt/deal/portal/enter — those are
// Pico's alone; when Pico goes somewhere, Hazel follows.
// ═══════════════════════════════════════════════════════
let twoPlayer = false;
let hazelVelY = 0, hazelGrounded = true, hazelFloor = 0;
function is2PUnlocked() { try { return localStorage.getItem('wonkyAcorn_2pUnlocked') === '1'; } catch (e) { return false; } }
function connectedPadCount() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let n = 0; for (const p of pads) if (p && p.id) n++;
  return n;
}
function update2PLabel() {
  const btn = document.getElementById('pause-2p');
  if (!btn) return;
  btn.style.display = is2PUnlocked() ? '' : 'none';
  btn.textContent = twoPlayer ? '🎮 Change to 1 Player' : '🎮 Change to 2 Player';
}
function show2PMessage(msg) {
  let el = document.getElementById('twop-msg');
  if (!el) { el = document.createElement('div'); el.id = 'twop-msg'; document.querySelector('.game-wrapper').appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4200);
}
function toggle2Player() {
  if (twoPlayer) { twoPlayer = false; hazel.visible = false; update2PLabel(); return; }
  if (connectedPadCount() < 2) { show2PMessage('Not available — 2-Player needs TWO controllers connected. Connect two, then try again.'); return; }
  open2PSelect();
}
function open2PSelect() {
  let el = document.getElementById('twop-select');
  if (!el) { el = document.createElement('div'); el.id = 'twop-select'; document.querySelector('.game-wrapper').appendChild(el); }
  el.innerHTML = '<div class="twop-title">2-PLAYER</div>'
    + '<div class="twop-cards"><div class="twop-card">🌰<div class="twop-pl">PLAYER 1</div><b>Pico</b><small>keyboard / pad 1</small></div>'
    + '<div class="twop-card">👓<div class="twop-pl">PLAYER 2</div><b>Hazel</b><small>pad 2 — slide</small></div></div>'
    + '<button class="twop-play" id="twop-play">PLAY ▶</button><button class="twop-cancel" id="twop-cancel">Cancel</button>';
  el.classList.add('show');
  document.getElementById('twop-play').onclick = () => {
    if (connectedPadCount() < 2) { show2PMessage('Lost a controller — connect two and try again.'); return; }
    el.classList.remove('show'); setPaused(false);
    twoPlayer = true; hazel.userData.following = false; hazel.visible = true;
    hazel.position.set(player.position.x + 1.4, player.position.y, player.position.z);
    update2PLabel();
    setTimeout(() => showSpeech('2-Player! Player 2 slides Hazel with pad 2.', 3200), 400);
  };
  document.getElementById('twop-cancel').onclick = () => el.classList.remove('show');
}
function updateP2(dt) {
  if (!twoPlayer) return;
  hazel.visible = true;
  // Hazel follows when Pico teleports far (into a building, through a portal, a chapter)
  if (Math.hypot(hazel.position.x - player.position.x, hazel.position.z - player.position.z) > 14) {
    hazel.position.set(player.position.x + 1.2, player.position.y, player.position.z);
    hazelVelY = 0; hazelGrounded = true;
  }
  if (grounded) hazelFloor = player.position.y;   // share Pico's ground level (0 outdoors, upstairs indoors)
  if (controlsLocked) return;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads[1];
  if (pad) {
    const lx = pad.axes[0] || 0, ly = pad.axes[1] || 0;
    if (Math.abs(lx) > 0.18 || Math.abs(ly) > 0.18) {
      const sp = 5.5, yaw = camState.yaw;
      const wx = lx * Math.cos(yaw) + ly * Math.sin(yaw);
      const wz = -lx * Math.sin(yaw) + ly * Math.cos(yaw);
      hazel.position.x += wx * sp * dt;
      hazel.position.z += wz * sp * dt;
      hazel.rotation.y = Math.atan2(wx, wz);
    }
    // Hazel's OWN jump — pad 2 Cross/A (button 0)
    if (pad.buttons[0] && pad.buttons[0].pressed && hazelGrounded) { hazelVelY = JUMP_FORCE; hazelGrounded = false; }
  }
  // gravity so Hazel falls and lands on the shared ground (independent of Pico's jump)
  hazelVelY -= GRAVITY * dt;
  hazel.position.y += hazelVelY * dt;
  if (hazel.position.y <= hazelFloor) { hazel.position.y = hazelFloor; hazelVelY = 0; hazelGrounded = true; }
}

function updateBonusChase(dt) {
  if (snowGroup.visible) {
    for (const f of snowGroup.children) { f.position.y -= f.userData.sp * dt; if (f.position.y < 0) f.position.y = 16; }
  }
  if (bonusPhase !== 'chase' || controlsLocked || !bonusFoe) return;
  if (bonusHazelMode) { hazel.position.copy(player.position); hazel.rotation.y = player.rotation.y + Math.PI; }
  const dx = bonusFoe.position.x - player.position.x, dz = bonusFoe.position.z - player.position.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.001) {
    const fx = dx / d, fz = dz / d;
    bonusFoe.position.x = clamp(bonusFoe.position.x + fx * bonusFleeSpeed * dt, -26, 26);
    bonusFoe.position.z = clamp(bonusFoe.position.z + fz * bonusFleeSpeed * dt, -26, 26);
    bonusFoe.rotation.y = Math.atan2(fx, fz);
    bonusFoe.position.y = Math.abs(Math.sin(performance.now() * 0.018)) * 0.14;
  }
  if (d < 1.7) { bonusPhase = 'caught'; bonusCatch(); }
}
async function bonusCatch() {
  controlsLocked = true; addShake(0.4);
  playTone({ freq: 90, dur: 0.4, type: 'sawtooth', volume: 0.25 });
  const isCopycat = bonusFoe === copycat;
  await showSpeechFromNPC(bonusHazelMode ? 'hazel' : 'squirrel', isCopycat ? 'Gotcha, you big copycat!' : 'Got him!', 2400);
  showFade(true); await sleep(900);
  squirrel.visible = false; copycat.visible = false; snowGroup.visible = false;
  squirrelInJail.position.set(JAIL_POS.x - 1.3, 0, JAIL_POS.z - 2.5); squirrelInJail.rotation.y = Math.PI; squirrelInJail.visible = true;
  if (bonusHazelMode) { player.visible = true; hazel.visible = false; }
  player.position.set(0, 0, 0); facingY = 0; player.rotation.y = 0; playerVel.set(0, 0, 0); grounded = true;
  camState.target.set(0, 1.2, 0); camState.distance = 7; camState.yaw = 0; camState.pitch = 0.28; updateCamera();
  showFade(false);
  const idx = bonusIdx;
  bonusPhase = 'idle'; bonusActive = false; bonusFoe = null; bonusHazelMode = false; freePlayMode = true;
  showOverlayCard(`BONUS CHAPTER ${idx + 1} COMPLETE`, 2600); await sleep(2800);
  if (!bonusReplay) {
    setBonusBeaten(idx + 1);
    if (typeof refreshReplayLock === 'function') refreshReplayLock();
    if (bonusBeaten() < BONUS_NAMES.length) {
      quest.bonusReady = true;
      setObjective('Another bonus chapter is brewing — stay in the meadow!');
      setTimeout(() => triggerNextBonus(), 1600);
      controlsLocked = false; return;
    }
    setObjective('Free play — every bonus chapter beaten! 🌰');
  } else {
    bonusReplay = false;
    setObjective('Free play — explore the meadow.');
  }
  quest.bonusReady = false;
  controlsLocked = false;
}

function updateSquirrelChase(dt) {
  if (!freePlayMode || !squirrelEscaped || !squirrel.visible || squirrelCatching) return;
  // Ducked into a building? Scratchett gives up and slinks back to his cell.
  if (newBedroomGroup.visible || schoolGroup.visible || butcherShopGroup.visible) {
    reJailSquirrel();
    setTimeout(() => showSpeech('(safe inside) Phew! He slunk back to his cell.', 2800), 500);
    return;
  }
  // He speeds up the longer the chase lasts: 3 mph + 1 mph every second
  squirrelChaseSecs += dt;
  const speed = (3 + squirrelChaseSecs) * MPH_TO_UNITS;
  const dx = player.position.x - squirrel.position.x;
  const dz = player.position.z - squirrel.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.001) {
    squirrel.position.x += (dx / dist) * speed * dt;
    squirrel.position.z += (dz / dist) * speed * dt;
    squirrel.rotation.y = Math.atan2(dx, dz);
    squirrel.position.y = Math.abs(Math.sin(performance.now() * 0.018)) * 0.14;
    if (squirrel.userData.tail) squirrel.userData.tail.rotation.z = Math.sin(performance.now() * 0.012) * 0.12;
  }
  if (dist < 1.3) squirrelCatchesPico();
}

async function squirrelCatchesPico() {
  if (squirrelCatching) return;
  squirrelCatching = true;
  controlsLocked = true;   // freezes follow-cam, chase and triggers
  setTauntPrompt(false);
  addShake(0.5);
  playTone({ freq: 90, dur: 0.4, type: 'sawtooth', volume: 0.28 });
  // Snap Scratchett onto Pico for the "gotcha"
  squirrel.position.set(player.position.x, 0, player.position.z + 0.9);
  squirrel.rotation.y = Math.PI;
  await showSpeechFromNPC('squirrel', 'GOTCHA, you cheeky acorn! Ooh — what\'s this…', 2000);
  // ── 3-second CLOSE-UP: Scratchett happily munching an acorn (a NUT, not Pico) ──
  await playSquirrelEatsAcorn();
  // …and while he's busy with his snack, Pico slips away home.
  await respawnPicoInRoom();
  squirrelCatching = false;
}

// The 3-second close-up Noah asked for: camera pushes in on Scratchett
// contentedly nibbling an acorn. Cute/funny — never Pico, who respawns fine.
async function playSquirrelEatsAcorn() {
  const headWorld = new THREE.Vector3();
  squirrel.getWorldPosition(headWorld);
  closeUpActive = true;   // hold the camera on the squirrel (no follow-lerp tug-of-war)
  camState.target.set(headWorld.x, 2.1, headWorld.z);   // frames both face (2.65) and acorn (~1.4)
  camState.distance = 2.8;
  camState.yaw = squirrel.rotation.y;
  camState.pitch = 0.12;
  updateCamera();
  const acorn = squirrel.userData.acorn;
  const head = squirrel.userData.head;
  showOverlayCard('Nom nom nom…', 2700);
  setTimeout(() => showSpeechFromNPC('squirrel', '(munch munch) Mmm… nothing beats a nice acorn.', 2200), 300);
  const start = performance.now();
  await new Promise(resolve => {
    const id = setInterval(() => {
      const t = (performance.now() - start) / 1000;
      if (acorn) acorn.position.y = 1.4 + Math.abs(Math.sin(t * 12)) * 0.12;
      if (head)  head.position.y  = 2.65 + Math.sin(t * 12) * 0.04;
      camState.target.set(headWorld.x, 2.1, headWorld.z);   // hold the close-up
      if (t > 3) { clearInterval(id); resolve(); }
    }, 16);
  });
  if (acorn) acorn.position.y = 1.32;
  if (head)  head.position.y  = 2.65;
  closeUpActive = false;
}

async function respawnPicoInRoom() {
  showFade(true);
  await sleep(650);
  // Show the (now tidy) bedroom, hide everything else
  schoolGroup.visible = false;
  butcherShopGroup.visible = false;
  newBedroomGroup.visible = true;
  setRoomPostGame(true);
  restoreHouseLights();
  // Scratchett goes straight back to his cell, locked in
  reJailSquirrel();
  // Pico pops back upstairs in his room
  player.position.set(NEW_BEDROOM_ORIGIN.x - 1.0, UPSTAIRS_Y, NEW_BEDROOM_ORIGIN.z - 4.0);
  facingY = 0; player.rotation.y = 0;
  playerVel.set(0, 0, 0); grounded = true;
  camState.target.set(player.position.x, UPSTAIRS_Y + 1.1, player.position.z);
  camState.distance = 4.5; camState.yaw = Math.PI; camState.pitch = 0.32;
  updateCamera();
  await sleep(200);
  showFade(false);
  controlsLocked = false;
  setTimeout(() => showSpeech('(panting) Phew — made it home! Maybe stop teasing him, eh?', 3200), 500);
}

// Helper for Ch.6 — show a centred overlay caption for a few seconds
function showOverlayCard(text, durationMs) {
  let card = document.getElementById('overlay-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'overlay-card';
    card.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:Nunito,sans-serif;font-size:36px;font-weight:900;color:#FFD740;letter-spacing:4px;text-shadow:0 4px 20px rgba(0,0,0,0.8);z-index:25;pointer-events:none;opacity:0;transition:opacity 0.6s';
    document.querySelector('.game-wrapper').appendChild(card);
  }
  card.textContent = text;
  card.style.opacity = '1';
  setTimeout(() => { card.style.opacity = '0'; }, durationMs);
}

// Check Ch.3 triggers each frame: Brunk fires when Pico walks past the centre of the hallway,
// corkboard fires when Pico walks toward the corkboard once Hazel has joined.
function checkSchoolTriggers() {
  if (!schoolGroup.visible) return;
  const localZ = player.position.z - SCHOOL_ORIGIN.z;
  if (ch3Phase === 'walking' && localZ < 3) {
    ch3Trigger_brunk();
  } else if (ch3Phase === 'freeRoam') {
    // Corkboard is at local (HALL_W/2 - 0.5, ..., -0.5) → world (-0.5 + SCHOOL_ORIGIN.x... wait, HALL_W/2 = 3)
    const localX = player.position.x - SCHOOL_ORIGIN.x;
    const dist = Math.hypot(localX - 2.5, localZ - (-0.5));  // corkboard local (2.5, -0.5)
    if (dist < 1.6) {
      ch3Trigger_corkboard();
    }
  }
}

// Hazel walks behind Pico at a fixed offset once she's joined the party
function updateHazelFollow(dt) {
  if (!hazel.visible || !hazel.userData.following) return;
  // Target is just behind+left of Pico, in world coords
  const back = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
  const right = new THREE.Vector3(Math.cos(player.rotation.y), 0, -Math.sin(player.rotation.y));
  const targetX = player.position.x - back.x * 1.6 - right.x * 0.6;
  const targetZ = player.position.z - back.z * 1.6 - right.z * 0.6;
  // Smoothly lerp toward target (gives a "follow" feel)
  const dx = targetX - hazel.position.x;
  const dz = targetZ - hazel.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.05) {
    const speed = Math.min(dist * 4, 6) * dt;
    hazel.position.x += (dx / dist) * speed;
    hazel.position.z += (dz / dist) * speed;
    hazel.rotation.y = Math.atan2(dx, dz);
    // Subtle bobbing while moving — anchored to Pico's Y so Hazel doesn't
    // sink/float when he walks up or down stairs in the new house
    hazel.position.y = player.position.y + Math.abs(Math.sin(performance.now() * 0.008)) * 0.04;
  } else {
    hazel.position.y = player.position.y;
  }
}

async function endChapter3() {
  showFade(true);
  await sleep(1200);
  schoolGroup.visible = false;
  hazel.visible = false;
  pemberton.visible = false;

  // End-of-Ch.3 card with continue → Ch.4
  const endHTML = `
    <div style="text-align:center;font-family:'Nunito',sans-serif;color:#fff;padding:40px">
      <div style="font-size:14px;letter-spacing:8px;color:#FFD740;margin-bottom:14px">END OF CHAPTER 3</div>
      <h2 style="font-size:48px;font-weight:900;margin-bottom:18px">First Day</h2>
      <p style="font-size:15px;color:rgba(255,255,255,0.6);max-width:520px;margin:0 auto 24px;line-height:1.6">
        Pico has a friend. And a mystery.<br>
        Next: Mum sends Pico to the market for dinner.<br>
        Straight there, straight back…
      </p>
      <button id="continue-ch4" type="button" style="margin:14px 8px 0;padding:14px 32px;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;background:linear-gradient(135deg,#FFD740,#FFC107);color:#1a1a2e;border:none;border-radius:999px;cursor:pointer;box-shadow:0 8px 28px rgba(255,193,7,0.4)">
        Continue → Chapter 4
      </button>
      <button id="end-restart-ch3" type="button" style="margin:14px 8px 0;padding:14px 28px;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;background:transparent;color:rgba(255,255,255,0.7);border:1.5px solid rgba(255,255,255,0.3);border-radius:999px;cursor:pointer">
        Restart
      </button>
    </div>
  `;
  const card = document.querySelector('#title-card');
  if (card) {
    card.innerHTML = endHTML;
    card.classList.remove('fade-out');
    card.style.display = 'flex';
    card.classList.add('show');
    const cont = document.getElementById('continue-ch4');
    if (cont) cont.addEventListener('click', () => {
      card.classList.add('fade-out');
      setTimeout(() => { card.style.display = 'none'; }, 1000);
      beginChapter4();
    });
    const restart = document.getElementById('end-restart-ch3');
    if (restart) restart.addEventListener('click', () => location.reload());
  }
}

// Restore the new-house lights to daytime values (in case a save was made
// during the bedtime cutscene, which dims them to a cool blue).
function restoreHouseLights() {
  newBedroomGroup.traverse(o => {
    if (o.isPointLight && o.userData.originalIntensity !== undefined) {
      o.intensity = o.userData.originalIntensity;
      o.color.setHex(o.userData.originalColor);
    }
  });
}

async function enterNewBedroom() {
  controlsLocked = true;
  setCheckpoint('newhouse');
  cutsceneCancelled = false;
  setStillMode(true);   // freeze Pico for the cutscene
  setRoomPostGame(false);   // Ch.2 always shows the scattered moving boxes (not the post-game tidy pile)
  // Hide other-scene NPCs in case we're loading from a later checkpoint
  hazel.visible = false;
  brunk.visible = false;
  pemberton.visible = false;
  butcher.visible = false;
  butcherShopGroup.visible = false;
  schoolGroup.visible = false;
  houseMum.visible = false;
  hazel.userData.following = false;
  // Reset Ch.2 box mini-objective so a fresh run / save-load works
  allBoxesTouched = false;
  if (newBedroomGroup.userData.boxes) {
    for (const box of newBedroomGroup.userData.boxes) {
      box.userData.touched = false;
      box.material.emissiveIntensity = 0;
    }
  }
  restoreHouseLights();
  showFade(true);
  await sleep(900);
  // Hide outdoor stuff (we leave it visible since fog will hide it from indoors,
  // but the player is teleported far away anyway).
  newBedroomGroup.visible = true;
  // Place Pico in the upstairs bedroom, facing the back window
  player.position.copy(NEW_BEDROOM_ORIGIN);
  player.position.y = UPSTAIRS_Y;   // standing on the upstairs floor
  player.position.z += -3;          // middle of the bedroom
  facingY = 0;                       // facing toward the back (-Z) window
  player.rotation.y = 0;
  playerVel.set(0, 0, 0);
  grounded = true;
  // Frame the bedroom: pulled in + tilted down so the small room stays in view
  camState.target.set(NEW_BEDROOM_ORIGIN.x, UPSTAIRS_Y + 1.1, NEW_BEDROOM_ORIGIN.z - 3);
  camState.distance = 4.5;
  camState.yaw = Math.PI;     // camera south of Pico, looking north at his back
  camState.pitch = 0.34;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(700);

  // Update HUD label to show new zone + new objective
  lastZoneLabel = '';  // force a re-render next frame
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.classList.remove('hide');
    objEl.querySelector('.objective-text').textContent = 'Look around your new bedroom';
  }

  await showSpeechFromNPC('granny', 'Welcome to your new room, sweetheart!', 2800);
  await showSpeech('It\'s… so empty.', 2400);

  // Hand control back — animated Pico so he walks around to touch boxes
  manualDance = null;
  setStillMode(false);
  controlsLocked = false;
}

// Walking out of the front door leaves the house and drops Pico back in the meadow.
let exitingHouse = false;
async function exitHouseToMeadow() {
  if (exitingHouse) return;
  exitingHouse = true;
  controlsLocked = true;
  setStillMode(true);
  showFade(true);
  await sleep(900);

  // Hide the house interior + place Pico outside the front gate of the new house
  newBedroomGroup.visible = false;
  // The new-house exterior is at world (-12, 0, -12). The front door faces +Z
  // (toward the meadow centre), so spawn Pico a couple of metres south of it.
  player.position.set(-12, 0, -6);
  player.position.y = 0;
  facingY = Math.PI;        // facing back toward the meadow (-Z is north, so face +Z is south? — set so Pico can see the meadow)
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.set(player.position.x, 1.1, player.position.z);
  camState.distance = 6;
  camState.yaw = 0;
  camState.pitch = 0.25;
  updateCamera();

  // Update HUD zone label only — leave the objective unchanged. Walking
  // outside doesn't complete any objective, so the existing one stays put.
  lastZoneLabel = '';

  await sleep(200);
  showFade(false);
  await sleep(600);

  setStillMode(false);
  controlsLocked = false;
  exitingHouse = false;
}
