// The conversation panel: speaker name, their line, and either a "continue"
// nudge or up to three choice buttons. Advance with a click, Space or E;
// pick choices by clicking or pressing 1/2/3. Plain HTML over the canvas.

import { price } from '../systems/codeMeter.js';

const STYLE = `
  #dialogue {
    position: absolute; left: 50%; bottom: 4%;
    transform: translateX(-50%);
    width: min(680px, 86%);
    background: rgba(26, 18, 10, 0.92);
    border: 1px solid #8a6a3a; border-radius: 8px;
    padding: 14px 20px 12px;
    color: #f3e5c8; font: 17px/1.45 Georgia, serif;
    display: none;
    pointer-events: auto;
  }
  #dialogue .name {
    color: #ffd26e; font-style: italic; margin-bottom: 4px; font-size: 15px;
  }
  #dialogue .hint {
    color: #b09a6f; font-size: 13px; text-align: right; margin-top: 6px;
  }
  #dialogue .choice {
    display: block; width: 100%; text-align: left;
    background: rgba(60, 44, 24, 0.9); color: #f3e5c8;
    border: 1px solid #8a6a3a; border-radius: 5px;
    font: 16px Georgia, serif; padding: 7px 12px; margin-top: 7px;
    cursor: pointer;
  }
  #dialogue .choice:hover { background: rgba(90, 66, 36, 0.95); }
  #dialogue .choice .key { color: #ffd26e; margin-right: 8px; }
`;

export function createDialogueBox() {
  const overlay = document.getElementById('ui-overlay');
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'dialogue';
  overlay.appendChild(box);

  let advanceFn = null;   // waiting for a click/Space on a plain line
  let choiceFns = null;   // waiting for a 1/2/3 pick

  // Keyboard: Space/E advances lines, number keys pick choices.
  window.addEventListener('keydown', (e) => {
    if (box.style.display === 'none') return;
    if (advanceFn && (e.code === 'Space' || e.code === 'KeyE')) {
      e.preventDefault();
      const fn = advanceFn;
      advanceFn = null;
      fn();
    } else if (choiceFns) {
      const n = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
      if (n !== undefined && choiceFns[n]) {
        const fn = choiceFns[n];
        choiceFns = null;
        fn();
      }
    }
  });
  box.addEventListener('click', () => {
    if (advanceFn) {
      const fn = advanceFn;
      advanceFn = null;
      fn();
    }
  });

  function speakerName(speaker) {
    // Speaker display names live in npcs.json via the dialogue system, but
    // the box just needs something readable if given a raw id.
    return speaker;
  }

  return {
    showLine(speaker, text, onAdvance) {
      choiceFns = null;
      box.style.display = 'block';
      box.innerHTML = '';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = speakerName(speaker);
      const line = document.createElement('div');
      line.textContent = text;
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = 'Space ▸';
      box.append(name, line, hint);
      advanceFn = onAdvance;
    },

    // choices already filtered by condition. Items are passed so "buy"
    // choices can show today's (reputation-adjusted) price.
    showChoices(speaker, text, choices, items, onPick) {
      advanceFn = null;
      box.style.display = 'block';
      box.innerHTML = '';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = speakerName(speaker);
      const line = document.createElement('div');
      line.textContent = text || '';
      box.append(name, line);

      choiceFns = choices.map((choice) => () => onPick(choice));
      choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        const key = document.createElement('span');
        key.className = 'key';
        key.textContent = String(i + 1);
        btn.appendChild(key);
        let label = choice.text;
        if (choice.effects?.buy && items[choice.effects.buy]) {
          label += ' — $' + price(items[choice.effects.buy].basePrice);
        }
        btn.appendChild(document.createTextNode(label));
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          choiceFns = null;
          onPick(choice);
        });
        box.appendChild(btn);
      });
    },

    hide() {
      box.style.display = 'none';
      advanceFn = null;
      choiceFns = null;
    },
  };
}
