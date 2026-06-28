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
      setLoading(100, 'Go!');
      loadingEl.classList.add('fade');
      hudEl.classList.add('show');
      setTimeout(() => { loadingEl.style.display = 'none'; }, 600);
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
