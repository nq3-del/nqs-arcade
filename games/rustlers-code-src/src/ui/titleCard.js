// Cinematic chapter title cards: when a chapter opens, its name fades up
// over the world for a few seconds, storybook style, then gets out of the
// way. Pure HTML — no 3D text (code-style rule).

import { on } from '../core/events.js';

const STYLE = `
  #title-card {
    position: absolute; left: 0; right: 0; top: 26%;
    text-align: center;
    opacity: 0;
    transition: opacity 1.1s;
    pointer-events: none;
  }
  #title-card .chapter {
    color: #ffd26e; font: italic 17px Georgia, serif;
    letter-spacing: 3px; text-transform: uppercase;
    text-shadow: 0 2px 8px rgba(0,0,0,0.8);
  }
  #title-card .name {
    color: #f3e5c8; font: 34px Georgia, serif;
    text-shadow: 0 2px 10px rgba(0,0,0,0.85);
    margin-top: 6px;
  }
  #title-card .rule {
    width: 180px; height: 1px; margin: 12px auto 0;
    background: linear-gradient(90deg, transparent, #ffd26e, transparent);
  }
`;

const CARDS = {
  prologue: { chapter: 'Copperhead Creek', name: 'Settling In' },
  ch1_foreclosure_job: { chapter: 'Chapter One', name: 'The Foreclosure Job' },
  ch2_iron_horse: { chapter: 'Chapter Two', name: 'The Iron Horse Heist' },
  ch3_high_noon: { chapter: 'Chapter Three', name: 'High Noon, No Bullets' },
  ch4_vane_gala: { chapter: 'Chapter Four', name: 'The Vane Gala' },
};

export function createTitleCard() {
  const overlay = document.getElementById('ui-overlay');
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const card = document.createElement('div');
  card.id = 'title-card';
  overlay.appendChild(card);

  let hideTimeout = null;

  function show(chapter, name) {
    card.innerHTML = `<div class="chapter">${chapter}</div>
      <div class="name">${name}</div><div class="rule"></div>`;
    card.style.opacity = '1';
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => { card.style.opacity = '0'; }, 3800);
  }

  on('quest:started', ({ quest }) => {
    const c = CARDS[quest];
    if (c) show(c.chapter, c.name);
  });
}
