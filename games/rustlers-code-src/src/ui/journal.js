// The journal (press J): a simple paper overlay listing every wanted poster
// found so far. Collecting things should feel like collecting, not filing.

import { gameState } from '../core/gameState.js';
import { posterText, POSTER_TOTAL } from '../world/posters.js';

const STYLE = `
  #journal {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: min(560px, 88%); max-height: 76%;
    overflow-y: auto;
    background: rgba(36, 26, 14, 0.95);
    border: 1px solid #8a6a3a; border-radius: 8px;
    color: #f3e5c8; font: 15px/1.5 Georgia, serif;
    padding: 18px 24px;
    display: none;
    pointer-events: auto;
  }
  #journal h2 { margin: 0 0 4px; color: #ffd26e; font-size: 19px; }
  #journal .count { color: #b09a6f; font-size: 13px; margin-bottom: 12px; }
  #journal .poster {
    border: 1px dashed #8a6a3a; border-radius: 5px;
    padding: 8px 12px; margin-bottom: 8px;
    background: rgba(232, 219, 181, 0.07);
  }
  #journal .hint { color: #b09a6f; font-size: 13px; text-align: center; margin-top: 8px; }
`;

export function createJournal() {
  const overlay = document.getElementById('ui-overlay');
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'journal';
  overlay.appendChild(panel);

  let open = false;

  function refresh() {
    panel.innerHTML = `<h2>Wanted Posters</h2>
      <div class="count">${gameState.posters.length} of ${POSTER_TOTAL} collected</div>`;
    if (gameState.posters.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'poster';
      empty.textContent = 'None yet. They’re pinned up all over the valley — worth a read.';
      panel.appendChild(empty);
    }
    for (const id of gameState.posters) {
      const div = document.createElement('div');
      div.className = 'poster';
      div.textContent = posterText(id);
      panel.appendChild(div);
    }
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'J to close';
    panel.appendChild(hint);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyJ') {
      open = !open;
      if (open) refresh();
      panel.style.display = open ? 'block' : 'none';
    }
  });

  return {
    isOpen: () => open,
  };
}
