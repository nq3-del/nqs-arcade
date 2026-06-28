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

// Floating clouds in the sky for atmosphere
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
for (let i = 0; i < 8; i++) {
  const cloud = new THREE.Group();
  const x = (Math.random() - 0.5) * 140;
  const z = (Math.random() - 0.5) * 140;
  const y = 25 + Math.random() * 15;
  for (let j = 0; j < 4; j++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random() * 1.5, 8, 6), cloudMat);
    puff.position.set(j * 2.5 - 3 + Math.random(), Math.random() * 1, Math.random() * 1);
    puff.scale.y = 0.5;
    cloud.add(puff);
  }
  cloud.position.set(x, y, z);
  scene.add(cloud);
}

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

  // Warm bedroom point light (turns off when the player "leaves" via cutscene end)
  const lamp = new THREE.PointLight(0xFFE0A0, 1.4, 12);
  lamp.position.set(2, 3.5, 2);
  lamp.castShadow = true;
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
  granny.scale.setScalar(1.1);
  kitchenGroup.add(granny);

  const grampa = makeParentAcorn({
    kind: 'grampa',
    colors: { shell: 0xB89070, cap: 0x5A3A20, belly: 0xE8C9A8, skin: 0xD9B08A, shoes: 0x3A2818 }
  });
  grampa.position.set(1.6, 0, 1.0);
  grampa.rotation.y = -Math.PI / 2;      // facing the table (left)
  grampa.scale.setScalar(1.15);
  kitchenGroup.add(grampa);

  // Save references for the cutscene
  kitchenGroup.userData.granny = granny;
  kitchenGroup.userData.grampa = grampa;

  // Warm kitchen ceiling light
  const ceilingLight = new THREE.PointLight(0xFFE4B0, 1.6, 14);
  ceilingLight.position.set(0, 3.5, 1.0);
  ceilingLight.castShadow = true;
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

function updateCamera() {
  const x = Math.sin(camState.yaw) * Math.cos(camState.pitch) * camState.distance;
  const z = Math.cos(camState.yaw) * Math.cos(camState.pitch) * camState.distance;
  const y = Math.sin(camState.pitch) * camState.distance;
  camera.position.set(
    camState.target.x + x,
    camState.target.y + y,
    camState.target.z + z
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
const TARGET_HEIGHT = 1.6;

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
      setLoading(100, 'Tap the button to begin!');
      // Reveal the start button instead of dropping straight into gameplay
      const startBtn = document.getElementById('start-btn');
      if (startBtn) {
        startBtn.classList.add('show');
        startBtn.addEventListener('click', beginIntro, { once: true });
      } else {
        // Fallback if button missing — go straight to gameplay
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
      player.position.y = 0;
      playerVel.y = 0;
      grounded = true;
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
    const WORLD_RADIUS = 45;
    const distFromCenter = Math.hypot(player.position.x, player.position.z);
    if (distFromCenter > WORLD_RADIUS) {
      const scale = WORLD_RADIUS / distFromCenter;
      player.position.x *= scale;
      player.position.z *= scale;
      // Kill outward velocity so player doesn't keep pressing against the wall
      const outwardX = player.position.x / WORLD_RADIUS;
      const outwardZ = player.position.z / WORLD_RADIUS;
      const outwardVel = playerVel.x * outwardX + playerVel.z * outwardZ;
      if (outwardVel > 0) {
        playerVel.x -= outwardX * outwardVel;
        playerVel.z -= outwardZ * outwardVel;
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

    // Tick mixer last so the chosen action is reflected this frame
    if (mixer) mixer.update(dt);

    // Camera follow — target is roughly Pico's head height (~1m above feet)
    camState.target.lerp(
      new THREE.Vector3(player.position.x, player.position.y + 1, player.position.z),
      smooth(8, dt)
    );
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
  const bubble = document.getElementById('speech-bubble');
  const span = document.getElementById('speech-text');
  if (!bubble || !span) return Promise.resolve();
  span.textContent = text;
  bubble.classList.remove('hide');
  bubble.classList.add('show');
  return new Promise(resolve => {
    setTimeout(() => {
      bubble.classList.remove('show');
      bubble.classList.add('hide');
      setTimeout(resolve, 320);  // wait for hide animation
    }, duration);
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

  // Lock Pico into the "Big_Wave_Hello" greeting (closest to "sitting at table" we have)
  if (actions['Big_Wave_Hello']) {
    playAction('Big_Wave_Hello', 0.3);
    manualDance = 'Big_Wave_Hello';
    manualDanceUntil = performance.now() + 12000;
  }

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

  // ── Tear flood ──
  // Water rises from the floor until it's just below the table top
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
  // Pico eats a pancake (use Catching_Breath as a "sigh + chew" mime)
  if (actions['Catching_Breath']) {
    playAction('Catching_Breath', 0.3);
    manualDance = 'Catching_Breath';
    manualDanceUntil = performance.now() + 4000;
  }
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
  manualDance = null;
  player.position.set(0, 0, 0);
  facingY = 0;
  player.rotation.y = 0;
  playerVel.set(0, 0, 0);
  grounded = true;
  camState.target.set(0, 1, 0);
  camState.distance = 5;
  camState.yaw = 0;
  camState.pitch = 0.35;
  updateCamera();
  await sleep(200);
  showFade(false);
  await sleep(400);

  // Hand control over to the player
  controlsLocked = false;
  hudEl.classList.add('show');
}

// Helper: show a speech bubble tagged with an NPC name
function showSpeechFromNPC(who, text, duration = 2000) {
  const bubble = document.getElementById('speech-bubble');
  const span = document.getElementById('speech-text');
  if (!bubble || !span) return Promise.resolve();
  const labels = {
    granny: { name: 'MUM', color: '#D16A6A' },
    grampa: { name: 'DAD', color: '#5A3A20' }
  };
  const label = labels[who] || { name: who.toUpperCase(), color: '#555' };
  span.innerHTML = `<span style="display:block;font-size:14px;font-weight:900;color:${label.color};letter-spacing:1px;margin-bottom:6px">${label.name}</span>${text}`;
  bubble.classList.remove('hide');
  bubble.classList.add('show');
  return new Promise(resolve => {
    setTimeout(() => {
      bubble.classList.remove('show');
      bubble.classList.add('hide');
      setTimeout(resolve, 320);
    }, duration);
  });
}

// Allow skipping the cutscene with Escape (handy while we iterate)
window.addEventListener('keydown', e => {
  if (e.code === 'Escape' && controlsLocked) {
    console.log('Cutscene skipped');
    if (stopAlarm) { stopAlarm(); stopAlarm = null; }
    const titleCard = document.getElementById('title-card');
    if (titleCard) titleCard.style.display = 'none';
    const bubble = document.getElementById('speech-bubble');
    if (bubble) { bubble.classList.remove('show'); bubble.classList.add('hide'); }
    controlsLocked = false;
    loadingEl.style.display = 'none';
    hudEl.classList.add('show');
  }
});
