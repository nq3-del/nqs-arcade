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
  granny.scale.setScalar(0.78);   // a bit shorter than Pico
  kitchenGroup.add(granny);

  const grampa = makeParentAcorn({
    kind: 'grampa',
    colors: { shell: 0xB89070, cap: 0x5A3A20, belly: 0xE8C9A8, skin: 0xD9B08A, shoes: 0x3A2818 }
  });
  grampa.position.set(1.6, 0, 1.0);
  grampa.rotation.y = -Math.PI / 2;      // facing the table (left)
  grampa.scale.setScalar(0.82);   // a bit shorter than Pico
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
// NEW BEDROOM (empty interior of the new house — Pico's unpacking room)
// ═══════════════════════════════════════════════════════
const NEW_BEDROOM_ORIGIN = new THREE.Vector3(0, 0, -600);
const newBedroomGroup = new THREE.Group();
newBedroomGroup.position.copy(NEW_BEDROOM_ORIGIN);
scene.add(newBedroomGroup);

(function buildNewBedroom() {
  // Materials — feels emptier and a bit colder than Acornville bedroom
  const wallMat   = new THREE.MeshStandardMaterial({ color: 0xE8E4DA, roughness: 0.92 });
  const floorMat  = new THREE.MeshStandardMaterial({ color: 0xC9A77C, roughness: 0.65 });
  const trimMat   = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.7 });
  const boxMat    = new THREE.MeshStandardMaterial({ color: 0xB48A60, roughness: 0.85 });
  const boxTapeMat = new THREE.MeshStandardMaterial({ color: 0xC8A878, roughness: 0.6 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xCFEFFC, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.75 });

  const ROOM_W = 7, ROOM_D = 8, ROOM_H = 4;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  newBedroomGroup.add(floor);

  // Walls
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  wallBack.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  wallBack.receiveShadow = true;
  newBedroomGroup.add(wallBack);

  const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  wallLeft.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.receiveShadow = true;
  newBedroomGroup.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  wallRight.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.receiveShadow = true;
  newBedroomGroup.add(wallRight);

  // Skirting board trim
  for (const [wx, wz, wRot, wLen] of [[0, -ROOM_D/2, 0, ROOM_W], [-ROOM_W/2, 0, Math.PI/2, ROOM_D], [ROOM_W/2, 0, -Math.PI/2, ROOM_D]]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(wLen, 0.12, 0.04), trimMat);
    trim.position.set(wx, 0.06, wz);
    trim.rotation.y = wRot;
    newBedroomGroup.add(trim);
  }

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshStandardMaterial({ color: 0xF5EFDD, roughness: 0.92 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_H;
  newBedroomGroup.add(ceiling);

  // Window on back wall — sun streams in
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.0, 0.15), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.7 }));
  winFrame.position.set(0, 2.4, -ROOM_D / 2 + 0.08);
  newBedroomGroup.add(winFrame);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.6), windowMat);
  winGlass.position.set(0, 2.4, -ROOM_D / 2 + 0.18);
  newBedroomGroup.add(winGlass);
  // Window panes
  for (const cx of [-0.65, 0, 0.65]) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.04), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.7 }));
    v.position.set(cx, 2.4, -ROOM_D / 2 + 0.2);
    newBedroomGroup.add(v);
  }

  // Cardboard moving boxes — stacked, scattered, ready to unpack
  function makeBox(x, z, w, h, d, rotY = 0, label = '') {
    const grp = new THREE.Group();
    grp.position.set(x, h / 2, z);
    grp.rotation.y = rotY;
    grp.userData.label = label;     // used by the box-touch dialogue lookup
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat);
    body.castShadow = true;
    body.receiveShadow = true;
    grp.add(body);
    // Tape across the top
    const tape = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.04, d * 0.25), boxTapeMat);
    tape.position.y = h / 2 + 0.005;
    grp.add(tape);
    // Label (white panel + text via canvas texture)
    if (label) {
      const labelW = w * 0.55, labelH = h * 0.4;
      const tex = makeLabelTexture(label);
      const labelEl = new THREE.Mesh(new THREE.PlaneGeometry(labelW, labelH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
      labelEl.position.set(0, 0, d / 2 + 0.005);
      grp.add(labelEl);
    }
    return grp;
  }

  // Canvas-based label texture so the boxes actually have legible text
  function makeLabelTexture(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 36px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
    // Slight border to look like a sticker
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Per the script (Ch.2.2): exactly 4 labelled boxes — CLOTHES, TOYS, BOOKS, STUFF.
  // Spread around the room so Pico has to wander to touch each one.
  newBedroomGroup.add(makeBox(-2.4, -2.6, 1.2, 0.9, 1.0, 0.12, 'CLOTHES'));
  newBedroomGroup.add(makeBox(-2.3,  1.8, 1.0, 0.7, 0.9, -0.2,  'TOYS'));
  newBedroomGroup.add(makeBox( 0.0,  1.5, 1.4, 1.0, 1.1, 0.3,   'BOOKS'));
  newBedroomGroup.add(makeBox( 2.4,  2.6, 0.9, 0.7, 0.8, -0.15, 'STUFF'));

  // Empty bed frame (no mattress yet — Pico has to unpack it!)
  const bareFrameMat = new THREE.MeshStandardMaterial({ color: 0x6B4632, roughness: 0.75 });
  const bareFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 3.2), bareFrameMat);
  bareFrame.position.set(2.2, 0.2, -2.0);
  bareFrame.castShadow = true;
  bareFrame.receiveShadow = true;
  newBedroomGroup.add(bareFrame);
  // Headboard (only thing assembled)
  const bareHead = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 0.18), bareFrameMat);
  bareHead.position.set(2.2, 0.9, -3.5);
  bareHead.castShadow = true;
  newBedroomGroup.add(bareHead);

  // Warm window light (no shadow casting for perf)
  const winLight = new THREE.PointLight(0xFFE5B8, 1.4, 14);
  winLight.position.set(0, 2.4, -ROOM_D / 2 + 1);
  newBedroomGroup.add(winLight);

  // Build the list of touchable boxes — used by the unpacking mini-objective
  const boxes = [];
  // Also build a set of box colliders (one per XZ stack — duplicates collapsed)
  const colliderMap = new Map();
  newBedroomGroup.traverse(o => {
    if (o.isMesh && o.material === boxMat) {
      boxes.push(o);
      const g = o.parent;
      // Use the box's bounding box size + the group's XZ position as the collider
      const key = `${g.position.x.toFixed(2)},${g.position.z.toFixed(2)}`;
      const params = o.geometry.parameters;
      const halfW = (params.width || 1) / 2;
      const halfD = (params.depth || 1) / 2;
      const existing = colliderMap.get(key);
      if (existing) {
        // Same XZ — take the larger AABB so we don't penetrate any stacked box
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
hazel.scale.setScalar(0.85);   // a bit smaller than Pico
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
  const hamMat = new THREE.MeshStandardMaterial({ color: 0xB94E3F, roughness: 0.55 });
  const sausageMat = new THREE.MeshStandardMaterial({ color: 0xD06A4E, roughness: 0.6 });
  const hookMat = new THREE.MeshStandardMaterial({ color: 0xC8CCD2, roughness: 0.3, metalness: 0.85 });
  const choppingBoardMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.85 });
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
  // Meat cuts in the display
  for (let i = -3; i <= 3; i++) {
    const meat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0xB94E3F, roughness: 0.6 }));
    meat.position.set(i * 1.3, 0.32, -2.6);
    meat.castShadow = true;
    butcherShopGroup.add(meat);
  }
  // Chopping block
  const chopBlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.8), choppingBoardMat);
  chopBlock.position.set(2.5, 1.27, -2.5);
  chopBlock.castShadow = true;
  butcherShopGroup.add(chopBlock);

  // Hanging hooks with hams + sausage chains
  for (let i = 0; i < 6; i++) {
    const hx = -4.5 + (i * 1.8);
    const hz = -5.5 - (i % 2) * 1.5;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), hookMat);
    chain.position.set(hx, SHOP_H - 0.85, hz);
    butcherShopGroup.add(chain);
    if (i % 2 === 0) {
      const ham = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), hamMat);
      ham.position.set(hx, SHOP_H - 1.45, hz);
      ham.scale.set(1, 1.4, 0.85);
      ham.castShadow = true;
      butcherShopGroup.add(ham);
    } else {
      for (let s = 0; s < 6; s++) {
        const link = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), sausageMat);
        link.position.set(hx, SHOP_H - 1.2 - s * 0.18, hz);
        link.castShadow = true;
        butcherShopGroup.add(link);
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

const butcher = makeButcher();
butcher.visible = false;
scene.add(butcher);

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
  camera.position.set(
    camState.target.x + x + sx,
    camState.target.y + y + sy,
    camState.target.z + z + sz
  );
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
  playAction(name, 0.2);
  console.log('Dance:', name);
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyT') toggleDance();
  if (e.code === 'KeyR') resetPlayer();
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
const touchInput = { x: 0, y: 0, jump: false };

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
}

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
let picoStill = null;        // static-pose Pico used during cutscenes
let mixer = null;
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
const TARGET_HEIGHT = 1.2;  // Pico — kept a bit bigger than the parent/Hazel acorns below

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

    // Also load the still-pose Pico for cutscenes (no skeleton, no animation)
    loader.load(
      'assets/models/pico_still.glb',
      (stillGltf) => {
        picoStill = stillGltf.scene;
        // Match the scale + ground offset of the animated Pico so swap is seamless
        const sBox = new THREE.Box3().setFromObject(picoStill);
        const sSize = new THREE.Vector3();
        sBox.getSize(sSize);
        if (sSize.y > 0 && isFinite(sSize.y)) {
          const sScale = TARGET_HEIGHT / sSize.y;
          picoStill.scale.setScalar(sScale);
          const sNewBox = new THREE.Box3().setFromObject(picoStill);
          picoStill.position.y -= sNewBox.min.y;
        }
        picoStill.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = false;
          }
        });
        picoStill.visible = false;   // animated Pico is the default
        player.add(picoStill);
      },
      undefined,
      (err) => { console.warn('Still Pico failed to load — fallback to animated:', err); }
    );

    // pico.glb's built-in is just T-pose (1 frame). Real animations live in pico_anims.glb (20+ clips).
    mixer = new THREE.AnimationMixer(pico);

    loader.load(
      'assets/models/pico_anims.glb',
      (animGltf) => {
        if (animGltf.animations && animGltf.animations.length > 0) {
          for (const clip of animGltf.animations) {
            actions[clip.name] = mixer.clipAction(clip);
            console.log('  loaded animation:', clip.name, 'duration:', clip.duration.toFixed(2));
          }
          console.log('Total animations loaded:', Object.keys(actions).length);
          // Start with the Big_Wave_Hello idle (full-body wave, very Pico-friendly)
          playAction('Bubble_Dance');
        }
      },
      undefined,
      (err) => {
        console.warn('Animations file failed to load — Pico will be a T-pose statue:', err);
      }
    );

    setLoading(95, 'Ready!');
    setTimeout(() => {
      setLoading(100, 'Tap to begin!');
      const startBtn = document.getElementById('start-btn');
      const skipBtn = document.getElementById('skip-btn');
      let chosen = false;
      const pickIntro = () => {
        if (chosen) return;
        chosen = true;
        beginIntro();
      };
      const pickQuick = () => {
        if (chosen) return;
        chosen = true;
        beginQuickStart();
      };
      if (startBtn) {
        startBtn.textContent = 'Play full intro';
        startBtn.classList.add('show');
        startBtn.addEventListener('click', pickIntro);
      }
      if (skipBtn) {
        skipBtn.classList.add('show');
        skipBtn.addEventListener('click', pickQuick);
      }
      if (!startBtn && !skipBtn) {
        beginIntro();
      }
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

// Cutscene mode: swap to the still-pose Pico (no skeleton/animation)
// so he doesn't dance / sigh / wave during dialogue.
function setStillMode(on) {
  if (on) {
    if (picoStill) picoStill.visible = true;
    if (pico) pico.visible = false;
  } else {
    if (picoStill) picoStill.visible = false;
    if (pico) pico.visible = true;
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

// Decide which animation should be playing based on the current player state
function chooseAnimationState({ moving, grounded, sprinting, speed }) {
  // Manual override (e.g. user pressed T to dance) — let it play until time expires
  if (manualDance && performance.now() < manualDanceUntil) {
    return manualDance;
  }
  manualDance = null;

  if (!grounded) return 'Basic_Jump';
  if (moving && sprinting && actions['Running']) return 'Running';
  if (moving && actions['Walking']) return 'Walking';
  return 'Bubble_Dance';  // goofy "alive" idle
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

    if (player.position.y <= 0) {
      // Trigger camera shake if landing from a significant fall
      if (!grounded && playerVel.y < -3) {
        addShake(Math.min(0.25, Math.abs(playerVel.y) * 0.025));
        // Landing dust puff
        emitDust(player.position.x, player.position.z);
        emitDust(player.position.x + 0.3, player.position.z);
        emitDust(player.position.x - 0.3, player.position.z);
      }
      player.position.y = 0;
      playerVel.y = 0;
      grounded = true;
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
      const WORLD_RADIUS = 45;
      const distFromCenter = Math.hypot(player.position.x, player.position.z);
      if (distFromCenter > WORLD_RADIUS) {
        const scale = WORLD_RADIUS / distFromCenter;
        player.position.x *= scale;
        player.position.z *= scale;
        const outwardX = player.position.x / WORLD_RADIUS;
        const outwardZ = player.position.z / WORLD_RADIUS;
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
    const wantAction = chooseAnimationState(state);
    if (wantAction) playAction(wantAction);

    // Sync walk/run animation speed to actual movement speed (reduces foot sliding)
    if (actions['Walking'] && currentActionName === 'Walking') {
      actions['Walking'].timeScale = Math.max(0.7, horizontalSpeed / WALK_SPEED);
    }
    if (actions['Running'] && currentActionName === 'Running') {
      actions['Running'].timeScale = Math.max(0.8, horizontalSpeed / (WALK_SPEED * SPRINT_MULT));
    }

    // Tick mixer last so the chosen action is reflected this frame
    if (mixer) mixer.update(dt);

    // Camera follow — target is roughly Pico's head height (~1m above feet)
    camState.target.lerp(
      new THREE.Vector3(player.position.x, player.position.y + 1, player.position.z),
      smooth(8, dt)
    );

    // Dynamic zone label based on Pico's position
    updateZoneLabel();
    // Unpacking mini-objective inside the new bedroom
    checkBoxTouches();
    // Ch.3 hallway triggers
    checkSchoolTriggers();
    // Hazel follows Pico once she's joined the party
    updateHazelFollow(dt);
    // Ch.5 butcher chase
    checkButcherChase(dt);
  }

  updateCamera();
  renderer.render(scene, camera);
}
tick();

// Pause render loop when the tab is hidden — saves battery + heat
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (rafHandle) cancelAnimationFrame(rafHandle);
    rafHandle = null;
  } else if (!rafHandle) {
    clock.getDelta();  // throw away the huge accumulated delta
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showSpeech(text, duration = 2000) {
  return showSpeechBubble({ text, duration });
}

// Core speech-bubble function — also handles click-to-advance + NPC labels
function showSpeechBubble({ text, duration = 2000, npcName = null, npcColor = null }) {
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
    granny: { name: 'MUM', color: '#D16A6A' },
    grampa: { name: 'DAD', color: '#5A3A20' }
  };
  const label = labels[who] || { name: who.toUpperCase(), color: '#555' };
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
  const menu = document.getElementById('pause-menu');
  if (menu) {
    if (v) menu.classList.add('show');
    else menu.classList.remove('show');
  }
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

// Wire pause menu buttons
{
  const resumeBtn = document.getElementById('pause-resume');
  if (resumeBtn) resumeBtn.addEventListener('click', () => setPaused(false));
  const muteBtn = document.getElementById('pause-mute');
  if (muteBtn) muteBtn.addEventListener('click', toggleMute);
  const resetBtn = document.getElementById('pause-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (confirm('Reset save and reload?')) {
      try { localStorage.removeItem('wonkyAcornIntroSeen'); } catch (e) {}
      location.reload();
    }
  });
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
    console.log('Cutscene skipped');
    if (stopAlarm) { stopAlarm(); stopAlarm = null; }
    const titleCard = document.getElementById('title-card');
    if (titleCard) titleCard.style.display = 'none';
    const bubble = document.getElementById('speech-bubble');
    if (bubble) { bubble.classList.remove('show'); bubble.classList.add('hide'); }
    // Hide cutscene scenes + reset player to the new house
    bedroomGroup.visible = false;
    kitchenGroup.visible = false;
    newBedroomGroup.visible = false;
    manualDance = null;
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
  // Butcher shop?
  if (butcherShopGroup.visible &&
      Math.abs(pz - BUTCHER_ORIGIN.z) < 10 &&
      Math.abs(px - BUTCHER_ORIGIN.x) < 8) {
    zone = 'SAWBONES & SONS';
  } else if (schoolGroup.visible &&
      Math.abs(pz - SCHOOL_ORIGIN.z) < 15 &&
      Math.abs(px - SCHOOL_ORIGIN.x) < 6) {
    zone = 'CONKER HEIGHTS HIGH';
  } else if (newBedroomGroup.visible &&
      Math.abs(pz - NEW_BEDROOM_ORIGIN.z) < 8 &&
      Math.abs(px - NEW_BEDROOM_ORIGIN.x) < 8) {
    zone = 'PICO\'S NEW ROOM';
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

  // Objective: walk into the new house door
  if (!objectiveReached) {
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
  if (!newBedroomGroup.visible || allBoxesTouched) return;
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
  // Camera angle for the bedtime shot — lower, more intimate
  camState.target.copy(NEW_BEDROOM_ORIGIN);
  camState.target.y = 1.0;
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
      beginChapter3();
    });
    const restartBtn = document.getElementById('end-restart');
    if (restartBtn) restartBtn.addEventListener('click', () => location.reload());
  }
}

// ═══════════════════════════════════════════════════════
// CHAPTER 3 — FIRST DAY AT CONKER HEIGHTS HIGH
// ═══════════════════════════════════════════════════════
async function beginChapter3() {
  controlsLocked = true;
  setStillMode(true);
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

async function beginChapter5() {
  controlsLocked = true;
  setStillMode(true);
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
  // Stash the cleaver's resting position so we can swing it later
  butcher.userData.cleaverRestY = butcher.userData.cleaverBlade.position.y;

  // Camera framing: low + close, peering into the shop from Pico's side
  camState.target.copy(player.position);
  camState.target.y = 1.4;
  camState.distance = 7;
  camState.yaw = 0;
  camState.pitch = 0.18;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(600);

  // Update HUD
  lastZoneLabel = '';
  const objEl = document.getElementById('hud-objective');
  if (objEl) {
    objEl.classList.remove('hide');
    objEl.querySelector('.objective-text').textContent = 'Buy one thing for Mum';
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

  await showSpeechFromNPC('butcher', 'Welcome, welcome! Don\'t be shy. Come closer, little one — let me get a proper look at you.', 4500);
  await showSpeech('Um — I just need one thing for my mum—', 2800);
  await showSpeechFromNPC('butcher', 'Oh, you\'re a plump one. Lovely and round. You know… I don\'t get many acorns in here.', 4500);
  await showSpeech('...Acorns?', 1800);

  // The Butcher raises the cleaver — animate it lifting high
  const blade = butcher.userData.cleaverBlade;
  const handle = butcher.userData.cleaverHandle;
  if (blade && handle) {
    const t0 = performance.now();
    const raiseStart = blade.position.y;
    const raiseEnd = raiseStart + 1.4;
    (function raiseCleaver() {
      const t = Math.min(1, (performance.now() - t0) / 600);
      blade.position.y = raiseStart + (raiseEnd - raiseStart) * t;
      handle.position.y = (raiseStart - 0.4) + (raiseEnd - raiseStart) * t;
      if (t < 1) requestAnimationFrame(raiseCleaver);
    })();
  }
  // Sharp metallic shing sound
  playTone({ freq: 1800, dur: 0.4, type: 'sine', volume: 0.15, attack: 0.005, release: 0.4 });
  await showSpeechFromNPC('butcher', 'Stay verrry still, dear. This won\'t take a moment.', 3000);

  // Callback gag — the salt joke at peak danger
  addShake(0.35);
  await showSpeech('— MUM WAS RIGHT ABOUT THE SALT!', 2400);

  // ── 5.2: THE CHASE ──
  ch5Phase = 'chase';
  setStillMode(false);  // Pico needs to actually run
  if (objEl) {
    objEl.querySelector('.objective-text').textContent = 'RUN to the door!';
  }
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
  await showSpeechFromNPC('butcher', 'Gotcha, little one! Sit verrry still now...', 3000);
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

  // End-of-Ch.5 card (Ch.6 placeholder)
  const endHTML = `
    <div style="text-align:center;font-family:'Nunito',sans-serif;color:#fff;padding:40px">
      <div style="font-size:14px;letter-spacing:8px;color:#FFD740;margin-bottom:14px">END OF CHAPTER 5</div>
      <h2 style="font-size:48px;font-weight:900;margin-bottom:18px">The Butcher</h2>
      <p style="font-size:15px;color:rgba(255,255,255,0.6);max-width:520px;margin:0 auto 24px;line-height:1.6">
        Pico made it out. The Butcher's still in there, sing-songing through the door…<br>
        Next: the investigation. Pico + Hazel + a reformed bully called Brunk.
      </p>
      <button id="end-restart-ch5" type="button" style="margin:14px 8px 0;padding:14px 32px;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;background:linear-gradient(135deg,#FFD740,#FFC107);color:#1a1a2e;border:none;border-radius:999px;cursor:pointer;box-shadow:0 8px 28px rgba(255,193,7,0.4)">
        Play again
      </button>
    </div>
  `;
  const card = document.querySelector('#title-card');
  if (card) {
    card.innerHTML = endHTML;
    card.classList.remove('fade-out');
    card.style.display = 'flex';
    card.classList.add('show');
    const restart = document.getElementById('end-restart-ch5');
    if (restart) restart.addEventListener('click', () => location.reload());
  }
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
    // Subtle bobbing while moving
    hazel.position.y = Math.abs(Math.sin(performance.now() * 0.008)) * 0.04;
  } else {
    hazel.position.y = 0;
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
      // Skip Ch.4 (market) for now and jump straight to the Butcher in Ch.5
      beginChapter5();
    });
    const restart = document.getElementById('end-restart-ch3');
    if (restart) restart.addEventListener('click', () => location.reload());
  }
}

async function enterNewBedroom() {
  controlsLocked = true;
  setStillMode(true);   // freeze Pico for the cutscene
  showFade(true);
  await sleep(900);
  // Hide outdoor stuff (we leave it visible since fog will hide it from indoors,
  // but the player is teleported far away anyway).
  newBedroomGroup.visible = true;
  // Place Pico just inside the bedroom door (south side of the room)
  player.position.copy(NEW_BEDROOM_ORIGIN);
  player.position.z += 3.2;       // near the front of the room
  facingY = Math.PI;              // facing into the room (toward back wall + window)
  player.rotation.y = Math.PI;
  playerVel.set(0, 0, 0);
  grounded = true;
  // Frame the bedroom: low pitch, looking from the door
  camState.target.copy(NEW_BEDROOM_ORIGIN);
  camState.target.y = 1.1;
  camState.distance = 6;
  camState.yaw = 0;
  camState.pitch = 0.28;
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
