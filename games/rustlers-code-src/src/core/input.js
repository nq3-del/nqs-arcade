// Keeps track of the keyboard, mouse AND game controller in one place.
// Everything else asks this module "is W held?", "was H just pressed?" —
// it never needs to know whether a key, a click or a controller button
// answered. Bluetooth/USB controllers arrive through the browser's
// standard Gamepad API (the OS handles pairing; we just read the sticks).

import { emit } from './events.js';

const heldKeys = new Set();    // keys currently held down
const pressedKeys = new Set(); // keys that went down THIS frame (one-shot)

// Controller buttons/sticks pretend to be keys: when a button goes down we
// dispatch a synthetic keyboard event, so movement, dialogue, the journal
// and every one-shot action all work identically for controller players.
const virtualHeld = new Set();
function setVirtual(code, active) {
  if (active && !virtualHeld.has(code)) {
    virtualHeld.add(code);
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  } else if (!active && virtualHeld.has(code)) {
    virtualHeld.delete(code);
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  }
}

// Touch controls (ui/touch.js) press these same virtual keys.
export function setVirtualKey(code, active) {
  setVirtual(code, active);
}

// Ignore tiny stick drift.
function deadzone(v) {
  return Math.abs(v) < 0.18 ? 0 : v;
}

// Standard controller layout → game actions. Aiming is R1/RB (hold) — or
// the left trigger if that's more your style — and R2/RT shoots.
const BUTTON_KEYS = [
  [0, 'KeyE'],   // Cross/A — talk / use / sit / advance dialogue
  [1, 'KeyH'],   // Circle/B — mount / dismount
  [2, 'KeyF'],   // Square/X — lasso
  [3, 'KeyB'],   // Triangle/Y — whistle
  [4, 'KeyG'],   // L1/LB — wave howdy
  [9, 'Pause'],  // Options/Start — pause menu (Esc belongs to the mouse)
  [12, 'Digit1'], [14, 'Digit2'], [15, 'Digit3'], // D-pad — dialogue choices
  [13, 'KeyJ'],  // D-pad down — journal
];

// Which family of names should prompts use for this pad?
function detectPadStyle(id) {
  return /playstation|dual\s?shock|dual\s?sense|054c|sony/i.test(id) ? 'ps' : 'xbox';
}

export const input = {
  mouseDX: 0,               // mouse/right-stick movement since last frame
  mouseDY: 0,
  isPointerLocked: false,
  rightMouseDown: false,    // held: aim mode (right mouse, R1/RB or L2/LT)
  leftMousePressed: false,  // this frame: fire once (click or R2/RT tap)
  shootHeld: false,         // held down: rapid fire while aiming
  usingGamepad: false,      // a controller has spoken up this session
  usingTouch: false,        // touch controls are on screen (ui/touch.js)
  padStyle: 'xbox',         // 'ps' or 'xbox' — which button names to show
  sprintToggle: false,      // clicked the left stick: sprint until you stop

  _mouseRightDown: false,   // the mouse's own vote, OR'd with the triggers
  _mouseLeftDown: false,
  _prevRightTrigger: false,
  _prevStickClick: false,

  isKeyDown(code) {
    return heldKeys.has(code);
  },

  // Called once per frame, before anything reads input.
  pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (const p of pads) {
      if (p && p.connected) { pad = p; break; }
    }
    if (!pad) {
      // Controller unplugged mid-stride: release everything it was holding.
      if (virtualHeld.size) for (const code of [...virtualHeld]) setVirtual(code, false);
      this.rightMouseDown = this._mouseRightDown;
      this.shootHeld = this._mouseLeftDown;
      return;
    }

    // Pads with a non-standard layout report sticks and buttons in
    // unpredictable slots — reading them could jam movement or spam pause.
    // Politely decline and stick to keyboard/mouse.
    if (pad.mapping !== 'standard') {
      if (!this._warnedNonstandard) {
        this._warnedNonstandard = true;
        emit('gamepad:nonstandard');
      }
      if (virtualHeld.size) for (const code of [...virtualHeld]) setVirtual(code, false);
      this.rightMouseDown = this._mouseRightDown;
      this.shootHeld = this._mouseLeftDown;
      return;
    }

    // A connected pad stays SILENT until it deliberately presses a button —
    // so a drifting stick or odd resting value can never hijack the game.
    if (!this.usingGamepad) {
      if (pad.buttons.some((b) => b.pressed)) {
        this.usingGamepad = true;
      } else {
        this.rightMouseDown = this._mouseRightDown;
        this.shootHeld = this._mouseLeftDown;
        return;
      }
    }
    this.padStyle = detectPadStyle(pad.id);

    // Left stick walks, right stick looks.
    const moveX = deadzone(pad.axes[0]);
    const moveY = deadzone(pad.axes[1]);
    setVirtual('KeyW', moveY < -0.4);
    setVirtual('KeyS', moveY > 0.4);
    setVirtual('KeyA', moveX < -0.4);
    setVirtual('KeyD', moveX > 0.4);
    const lookX = deadzone(pad.axes[2] ?? 0);
    const lookY = deadzone(pad.axes[3] ?? 0);
    this.mouseDX += lookX * 950 * dt;
    this.mouseDY += lookY * 700 * dt;

    for (const [index, code] of BUTTON_KEYS) {
      setVirtual(code, !!pad.buttons[index]?.pressed);
    }

    // Clicking the left stick (L3) toggles sprint — on until you stop.
    const stickClick = !!pad.buttons[10]?.pressed;
    if (stickClick && !this._prevStickClick) this.sprintToggle = !this.sprintToggle;
    this._prevStickClick = stickClick;

    // Hold R1/RB (or the left trigger) to aim; R2/RT shoots — one bullet
    // per squeeze, or keep it held for rapid fire.
    const aimHeld = !!pad.buttons[5]?.pressed || (pad.buttons[6]?.value ?? 0) > 0.5;
    this.rightMouseDown = this._mouseRightDown || aimHeld;
    const trigger = (pad.buttons[7]?.value ?? 0) > 0.5;
    if (trigger && !this._prevRightTrigger) this.leftMousePressed = true;
    this._prevRightTrigger = trigger;
    this.shootHeld = this._mouseLeftDown || trigger;

  },

  // True only on the single frame the key went down — for actions like
  // mounting or whistling that shouldn't repeat while held.
  wasPressed(code) {
    return pressedKeys.has(code);
  },

  // Called at the END of each frame to reset the one-shot values.
  endFrame() {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.leftMousePressed = false;
    pressedKeys.clear();
  },
};

// Wire up the browser events. Called once from main.js at boot.
export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (!e.repeat) pressedKeys.add(e.code);
    heldKeys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    heldKeys.delete(e.code);
  });

  // Clicking the game captures the mouse so moving it turns the camera
  // (standard for 3D games). Esc releases it — the browser handles that.
  canvas.addEventListener('click', () => {
    if (!input.isPointerLocked) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    input.isPointerLocked = document.pointerLockElement === canvas;
    if (!input.isPointerLocked) {
      heldKeys.clear();
      input.rightMouseDown = false;
      input._mouseRightDown = false;
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (input.isPointerLocked) {
      input.mouseDX += e.movementX;
      input.mouseDY += e.movementY;
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (!input.isPointerLocked) return;
    if (e.button === 0) {
      input.leftMousePressed = true;
      input._mouseLeftDown = true;
      input.shootHeld = true;
    }
    if (e.button === 2) {
      input._mouseRightDown = true;
      input.rightMouseDown = true;
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      input._mouseLeftDown = false;
      input.shootHeld = false;
    }
    if (e.button === 2) {
      input._mouseRightDown = false;
      input.rightMouseDown = false;
    }
  });

  // A controller pairing over Bluetooth (or plugging in) announces itself.
  window.addEventListener('gamepadconnected', (e) => {
    emit('gamepad:connected', { id: e.gamepad.id });
  });

  // The right mouse button aims — don't let the browser's right-click menu
  // pop up over the game.
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // If the player switches tabs, forget held keys so Cole doesn't keep
  // walking on his own when they come back.
  window.addEventListener('blur', () => heldKeys.clear());
}
