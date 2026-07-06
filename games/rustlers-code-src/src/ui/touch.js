// Touch controls, for tablets and phones: a virtual stick on the left,
// drag-to-look on the right, and a small cluster of labelled buttons.
// They press the SAME virtual keys as the keyboard, so every system in
// the game works unchanged. Only appears on devices that actually touch.

import { input, setVirtualKey } from '../core/input.js';

const STYLE = `
  .touch-ui { position: absolute; pointer-events: auto; user-select: none; -webkit-user-select: none; touch-action: none; }
  #stick-base {
    left: 5%; bottom: 7%;
    width: 130px; height: 130px; border-radius: 50%;
    background: rgba(20, 14, 8, 0.35);
    border: 2px solid rgba(255, 210, 110, 0.4);
  }
  #stick-nub {
    position: absolute; left: 40px; top: 40px;
    width: 50px; height: 50px; border-radius: 50%;
    background: rgba(255, 210, 110, 0.55);
    pointer-events: none;
  }
  #look-pad {
    right: 0; top: 0; bottom: 0; width: 55%;
    background: transparent;
  }
  .touch-btn {
    width: 62px; height: 62px; border-radius: 50%;
    background: rgba(20, 14, 8, 0.5);
    border: 2px solid rgba(255, 210, 110, 0.55);
    color: #ffe9bb; font: bold 15px Georgia, serif;
    display: flex; align-items: center; justify-content: center;
    text-align: center; line-height: 1.1;
  }
  .touch-btn:active { background: rgba(255, 210, 110, 0.4); }
`;

// [label, right%, bottom%, size, handlers-key]
const BUTTONS = [
  ['SHOOT', 3, 24, 74, 'shoot'],
  ['AIM', 15, 10, 74, 'aim'],
  ['JUMP', 4, 9, 62, 'jump'],
  ['E', 26, 22, 54, 'use'],
  ['F', 33, 9, 54, 'lasso'],
  ['B', 40, 20, 46, 'whistle'],
  ['H', 46, 8, 46, 'mount'],
];

export function createTouchControls(menu) {
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) return;

  input.usingTouch = true;
  const overlay = document.getElementById('ui-overlay');
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  // ---- The movement stick ----
  const base = document.createElement('div');
  base.id = 'stick-base';
  base.className = 'touch-ui';
  const nub = document.createElement('div');
  nub.id = 'stick-nub';
  base.appendChild(nub);
  overlay.appendChild(base);

  let stickPointer = null;
  function moveStick(e) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (e.clientX - cx) / (rect.width / 2);
    let dy = (e.clientY - cy) / (rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    nub.style.left = 40 + dx * 38 + 'px';
    nub.style.top = 40 + dy * 38 + 'px';
    setVirtualKey('KeyW', dy < -0.3);
    setVirtualKey('KeyS', dy > 0.3);
    setVirtualKey('KeyA', dx < -0.3);
    setVirtualKey('KeyD', dx > 0.3);
    setVirtualKey('ShiftLeft', len > 0.92); // full tilt = run
  }
  function releaseStick() {
    stickPointer = null;
    nub.style.left = '40px';
    nub.style.top = '40px';
    for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft']) setVirtualKey(k, false);
  }
  base.addEventListener('pointerdown', (e) => {
    stickPointer = e.pointerId;
    base.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId === stickPointer) moveStick(e);
  });
  base.addEventListener('pointerup', releaseStick);
  base.addEventListener('pointercancel', releaseStick);

  // ---- Drag anywhere on the right to look ----
  const lookPad = document.createElement('div');
  lookPad.id = 'look-pad';
  lookPad.className = 'touch-ui';
  overlay.insertBefore(lookPad, base); // beneath the buttons
  let lookPointer = null;
  let lastX = 0;
  let lastY = 0;
  lookPad.addEventListener('pointerdown', (e) => {
    lookPointer = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    lookPad.setPointerCapture(e.pointerId);
  });
  lookPad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookPointer) return;
    input.mouseDX += (e.clientX - lastX) * 2.4;
    input.mouseDY += (e.clientY - lastY) * 2.4;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const endLook = (e) => { if (e.pointerId === lookPointer) lookPointer = null; };
  lookPad.addEventListener('pointerup', endLook);
  lookPad.addEventListener('pointercancel', endLook);

  // ---- The buttons ----
  const actions = {
    shoot: {
      down() { input.leftMousePressed = true; input.shootHeld = true; },
      up() { input.shootHeld = false; },
    },
    aim: {
      down() { input.rightMouseDown = true; },
      up() { input.rightMouseDown = false; },
    },
    jump: {
      down() { setVirtualKey('Space', true); },
      up() { setVirtualKey('Space', false); },
    },
    use: { down() { setVirtualKey('KeyE', true); }, up() { setVirtualKey('KeyE', false); } },
    lasso: { down() { setVirtualKey('KeyF', true); }, up() { setVirtualKey('KeyF', false); } },
    whistle: { down() { setVirtualKey('KeyB', true); }, up() { setVirtualKey('KeyB', false); } },
    mount: { down() { setVirtualKey('KeyH', true); }, up() { setVirtualKey('KeyH', false); } },
  };

  for (const [label, right, bottom, size, key] of BUTTONS) {
    const btn = document.createElement('div');
    btn.className = 'touch-ui touch-btn';
    btn.textContent = label;
    btn.style.right = right + '%';
    btn.style.bottom = bottom + '%';
    btn.style.width = btn.style.height = size + 'px';
    overlay.appendChild(btn);
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      btn.setPointerCapture(e.pointerId);
      actions[key].down();
    });
    const release = () => actions[key].up();
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  }

  // ---- Pause, up top where thumbs aren't ----
  const pause = document.createElement('div');
  pause.className = 'touch-ui touch-btn';
  pause.textContent = 'II';
  pause.style.right = '3%';
  pause.style.top = '3%';
  pause.style.width = pause.style.height = '46px';
  overlay.appendChild(pause);
  pause.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    menu.togglePause();
  });
}
