// The title screen and the pause menu — one panel, two moods. The title
// greets the player at boot (Continue if a save exists); pressing Esc
// mid-game releases the mouse and brings up the pause version.

import { gameState, hasSave } from '../core/gameState.js';
import { emit } from '../core/events.js';

const STYLE = `
  #menu {
    position: absolute; inset: 0;
    background: rgba(16, 10, 5, 0.88);
    display: none;
    pointer-events: auto;
    color: #f3e5c8; font: 16px Georgia, serif;
    text-align: center;
    overflow-y: auto;
  }
  #menu .inner { max-width: 520px; margin: 9vh auto 4vh; padding: 0 22px; }
  #menu h1 { color: #ffd26e; font-size: 42px; margin: 0; letter-spacing: 1px; }
  #menu .sub { color: #b09a6f; font-style: italic; margin: 6px 0 30px; }
  #menu button {
    display: block; width: 100%;
    background: rgba(60, 44, 24, 0.9); color: #f3e5c8;
    border: 1px solid #8a6a3a; border-radius: 6px;
    font: 17px Georgia, serif; padding: 11px; margin: 10px 0;
    cursor: pointer;
  }
  #menu button:hover { background: rgba(90, 66, 36, 0.95); }
  #menu .controls {
    text-align: left; font-size: 14px; line-height: 1.9;
    color: #cbb891; margin-top: 26px;
    border-top: 1px dashed #8a6a3a; padding-top: 14px;
    column-count: 2; column-gap: 28px;
  }
  #menu .controls b { color: #ffd26e; display: inline-block; min-width: 74px; }
  #menu .arcade-link {
    position: absolute; top: 14px; left: 18px;
    color: #b09a6f; font: 14px Georgia, serif;
    text-decoration: none; pointer-events: auto;
  }
  #menu .arcade-link:hover { color: #ffd26e; }
`;

// When the game lives inside NQ's Arcade (a games/rustlers-code/ folder on
// that site), the title screen gets a small way back to the arcade shelf.
// Anywhere else (itch.io, local dev) the link would lead nowhere, so it
// simply doesn't appear.
const IN_ARCADE = location.pathname.includes('/games/rustlers-code');

const CONTROLS = [
  ['W A S D', 'walk / ride'], ['Space', 'jump'], ['Shift', 'jog'], ['Mouse', 'look around'],
  ['Click', 'capture the mouse'], ['Right-hold', 'aim (Steady Hand)'], ['Left-click', 'shoot — hold for rapid fire'],
  ['F', 'lasso (while aiming)'], ['E', 'talk / use / sit'], ['G', 'wave howdy'],
  ['B', 'whistle for Biscuit'], ['H', 'mount / dismount'], ['J', 'poster journal'],
  ['Esc', 'pause (mouse)'], ['`', 'performance readout'],
  ['Controller', 'sticks move & look · click left stick to sprint · hold L2 to aim · R2 shoots (hold = rapid) · Cross/A use or jump · Square/X lasso · Triangle/Y whistle · Circle/B mount · L1 wave · D-pad replies + journal · Options/Start pause · menus use the mouse'],
];

// introGate (optional): called when the player starts from the title. If it
// returns true it has taken over (it'll re-capture the mouse itself when
// the intro pages finish).
export function createMenu(canvas, audio, isBusy, introGate) {
  const overlay = document.getElementById('ui-overlay');
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'menu';
  overlay.appendChild(panel);

  let open = false;
  let started = false; // has the player left the title screen this session
  let currentMode = 'title';

  function controlsHtml() {
    return '<div class="controls">' +
      CONTROLS.map(([k, what]) => `<div><b>${k}</b> ${what}</div>`).join('') +
      '</div>';
  }

  function resume(fromTitle) {
    open = false;
    panel.style.display = 'none';
    audio.init(); // first click satisfies the browser's audio rule
    if (fromTitle && introGate && introGate()) return; // intro takes it from here
    canvas.requestPointerLock();
  }

  function show(mode) {
    open = true;
    currentMode = mode;
    panel.style.display = 'block';
    const inner = document.createElement('div');
    inner.className = 'inner';
    inner.innerHTML = `<h1>The Rustler's Code</h1>
      <div class="sub">${mode === 'title'
        ? 'Never harm a soul. Take only what was taken. Leave folk better than you found ’em.'
        : '— paused —'}</div>`;

    const main = document.createElement('button');
    if (mode === 'title') {
      // hasSave() reads storage directly, so this is right even though the
      // menu is built before the save finishes loading.
      main.textContent = hasSave() ? 'Ride on (continue)' : 'Begin the legend';
    } else {
      main.textContent = 'Back to the valley';
    }
    main.addEventListener('click', () => {
      started = true;
      resume(mode === 'title');
    });
    inner.appendChild(main);

    // The fresh-start escape hatch lives on BOTH menus — if a save ever
    // leaves the player somewhere confusing, the way out is one click.
    if (hasSave()) {
      const fresh = document.createElement('button');
      fresh.textContent = 'Start a fresh legend (erases the save)';
      fresh.addEventListener('click', () => {
        localStorage.removeItem('rustlers-code-save');
        location.reload();
      });
      inner.appendChild(fresh);
    }

    const mute = document.createElement('button');
    mute.textContent = audio.isMuted() ? 'Sound: off' : 'Sound: on';
    mute.addEventListener('click', () => {
      mute.textContent = audio.toggleMuted() ? 'Sound: off' : 'Sound: on';
    });
    inner.appendChild(mute);

    if (mode === 'paused') {
      const note = document.createElement('div');
      note.className = 'sub';
      note.textContent = 'Progress saves itself at every quest beat — and just now.';
      inner.appendChild(note);
    }

    inner.insertAdjacentHTML('beforeend', controlsHtml());
    panel.innerHTML = '';
    if (mode === 'title' && IN_ARCADE) {
      const back = document.createElement('a');
      back.className = 'arcade-link';
      back.href = '../../';
      back.textContent = '← Arcade';
      panel.appendChild(back);
    }
    panel.appendChild(inner);
  }

  // Esc releases the pointer (the browser does that part); if the game is
  // running and nothing else claimed the moment, that means "pause".
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (!locked && started && !open && !isBusy()) {
      show('paused');
      emit('menu:paused'); // main.js autosaves on this
    }
  });

  show('title');

  return {
    isOpen: () => open,
    // The controller's Options/Start button: open the pause menu, or close
    // it again. (Esc belongs to the mouse's pointer-release.)
    togglePause() {
      if (open && currentMode === 'paused') {
        resume(false);
      } else if (started && !open) {
        show('paused');
        emit('menu:paused');
        document.exitPointerLock?.();
      }
    },
  };
}
