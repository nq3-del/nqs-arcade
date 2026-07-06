// The HTML overlay the player sees during play: aiming reticle, subtitles,
// the quest tracker (top-left), the Code meter (top-right), money, and the
// "press E" prompt. All HTML/CSS on top of the canvas, never 3D text.

import { gameState } from '../core/gameState.js';
import { on } from '../core/events.js';
import { input } from '../core/input.js';
import { tierName } from '../systems/codeMeter.js';

// When a controller is in charge, prompts speak its language.
const PAD_NAMES = {
  xbox: { aim: 'LT', shoot: 'RT', use: 'A', mount: 'B', whistle: 'Y', lasso: 'X' },
  ps: { aim: 'L2', shoot: 'R2', use: 'Cross', mount: 'Circle', whistle: 'Triangle', lasso: 'Square' },
};

// Swap keyboard wording for controller wording in any player-facing text.
function padText(text) {
  if (!input.usingGamepad) return text;
  const names = PAD_NAMES[input.padStyle] || PAD_NAMES.xbox;
  return text
    .replaceAll('Right-click', names.aim)
    .replaceAll('Left-click', names.shoot)
    .replaceAll('press E', 'press ' + names.use)
    .replaceAll('(E)', '(' + names.use + ')')
    .replaceAll('(B)', '(' + names.whistle + ')')
    .replaceAll('(H)', '(' + names.mount + ')')
    .replaceAll('press F', 'press ' + names.lasso)
    .replaceAll('(F)', '(' + names.lasso + ')');
}

const STYLE = `
  #hud * { box-sizing: border-box; }
  #reticle {
    position: absolute; left: 50%; top: 50%;
    width: 34px; height: 34px; margin: -17px 0 0 -17px;
    border: 2px solid rgba(255, 210, 110, 0.9);
    border-radius: 50%;
    display: none;
    transition: border-color 0.1s;
  }
  #reticle::after {
    content: ''; position: absolute; left: 50%; top: 50%;
    width: 4px; height: 4px; margin: -2px 0 0 -2px;
    background: rgba(255, 210, 110, 0.9); border-radius: 50%;
  }
  #reticle.denied { border-color: rgba(150, 150, 150, 0.8); border-style: dashed; }
  #reticle.denied::after { background: rgba(150, 150, 150, 0.8); }
  #reticle.locked { border-color: #ffd26e; box-shadow: 0 0 10px rgba(255, 210, 110, 0.5); }
  #reticle-label {
    position: absolute; left: 50%; top: 50%; margin-top: 26px;
    transform: translateX(-50%);
    color: #ffe9bb; font: 14px Georgia, serif; text-shadow: 0 1px 3px #000;
    white-space: nowrap;
  }
  #subtitle {
    position: absolute; left: 50%; bottom: 12%;
    transform: translateX(-50%);
    max-width: 60%;
    background: rgba(20, 14, 8, 0.75);
    color: #f3e5c8; font: 17px Georgia, serif;
    padding: 8px 16px; border-radius: 6px;
    text-align: center;
    opacity: 0; transition: opacity 0.25s;
  }
  #subtitle .speaker { color: #ffd26e; font-style: italic; margin-right: 8px; }
  #prompt {
    position: absolute; left: 50%; bottom: 22%;
    transform: translateX(-50%);
    background: rgba(20, 14, 8, 0.75); color: #ffe9bb;
    font: 15px Georgia, serif; padding: 6px 14px; border-radius: 6px;
    display: none;
  }
  #prompt .key {
    background: #ffd26e; color: #2a1c0c; border-radius: 4px;
    padding: 0 7px; margin-right: 8px; font-weight: bold;
  }
  #quest {
    position: absolute; top: 14px; left: 14px; max-width: 320px;
    color: #f3e5c8; font: 15px Georgia, serif;
    text-shadow: 0 1px 3px #000;
    display: none;
  }
  #quest .title { color: #ffd26e; font-style: italic; font-size: 13px; }
  #code-meter {
    position: absolute; top: 14px; right: 14px; width: 190px;
    color: #f3e5c8; font: 13px Georgia, serif; text-align: right;
    text-shadow: 0 1px 3px #000;
  }
  #code-bar {
    height: 8px; border: 1px solid #8a6a3a; border-radius: 4px;
    background: rgba(20, 14, 8, 0.6); overflow: hidden; margin-top: 3px;
  }
  #code-fill {
    height: 100%; width: 50%;
    background: linear-gradient(90deg, #b0703a, #ffd26e);
    transition: width 0.6s;
  }
  #code-meter.flash { animation: codeflash 0.7s; }
  @keyframes codeflash {
    30% { transform: scale(1.08); }
  }
  #money {
    position: absolute; top: 62px; right: 14px;
    color: #ffe9bb; font: 14px Georgia, serif; text-shadow: 0 1px 3px #000;
  }
  #saved-toast {
    position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
    color: #b09a6f; font: italic 13px Georgia, serif; text-shadow: 0 1px 3px #000;
    opacity: 0; transition: opacity 0.4s;
  }
  #mute-btn {
    position: absolute; bottom: 12px; right: 12px;
    background: rgba(20, 14, 8, 0.7); color: #ffe9bb;
    border: 1px solid #8a6a3a; border-radius: 5px;
    font: 13px Georgia, serif; padding: 5px 10px;
    cursor: pointer; pointer-events: auto;
  }
  #aim-vignette {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 52%, rgba(12, 8, 3, 0.55) 100%);
    opacity: 0;
  }
  #film-vignette {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 64%, rgba(8, 5, 2, 0.34) 100%);
  }
`;

export function createHud(audio) {
  const overlay = document.getElementById('ui-overlay');
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="film-vignette"></div>
    <div id="aim-vignette"></div>
    <div id="reticle"><div id="reticle-label"></div></div>
    <div id="subtitle"></div>
    <div id="prompt"></div>
    <div id="quest"><div class="title"></div><div class="objective"></div></div>
    <div id="code-meter">The Code — <span id="code-tier"></span>
      <div id="code-bar"><div id="code-fill"></div></div>
    </div>
    <div id="money"></div>
    <div id="saved-toast">~ trail marked ~</div>
    <button id="mute-btn"></button>
  `;
  overlay.appendChild(root);

  const el = (id) => root.querySelector('#' + id);
  const reticle = el('reticle');
  const reticleLabel = el('reticle-label');
  const subtitle = el('subtitle');
  const prompt = el('prompt');
  const quest = el('quest');
  const codeMeter = el('code-meter');

  let subtitleTimer = 0;
  let savedTimer = 0;
  const savedToast = el('saved-toast');

  // The mute courtesy button (asset-pipeline skill: shared rooms exist).
  const muteBtn = el('mute-btn');
  const muteLabel = () => { muteBtn.textContent = audio.isMuted() ? '🔇 sound' : '🔊 sound'; };
  muteBtn.addEventListener('click', () => { audio.toggleMuted(); muteLabel(); muteBtn.blur(); });
  muteLabel();

  on('game:saved', () => {
    savedToast.style.opacity = '1';
    savedTimer = 1.4;
  });

  function refreshCode() {
    el('code-tier').textContent = tierName();
    el('code-fill').style.width = gameState.code + '%';
  }
  function refreshMoney() {
    el('money').textContent = gameState.money > 0 ? '$' + gameState.money : '';
  }
  refreshCode();
  refreshMoney();

  // The HUD listens for changes rather than being poked by every system.
  on('code:changed', () => {
    refreshCode();
    codeMeter.classList.remove('flash');
    // Restart the little flourish animation.
    void codeMeter.offsetWidth;
    codeMeter.classList.add('flash');
  });
  on('money:changed', refreshMoney);
  on('game:loaded', () => { refreshCode(); refreshMoney(); });

  return {
    // The world darkens at the edges while the Steady Hand focuses.
    // blend runs 0..1 with the aim camera.
    setAimVignette(blend) {
      el('aim-vignette').style.opacity = String(blend * 0.9);
    },

    setReticle(state, labelText = '') {
      if (state === 'hidden') {
        reticle.style.display = 'none';
        return;
      }
      reticle.style.display = 'block';
      reticle.className = state === 'idle' ? '' : state;
      reticleLabel.textContent = labelText;
    },

    showSubtitle(speaker, text, seconds = 2.6) {
      subtitle.innerHTML = '';
      if (speaker) {
        const s = document.createElement('span');
        s.className = 'speaker';
        s.textContent = speaker;
        subtitle.appendChild(s);
      }
      subtitle.appendChild(document.createTextNode(text));
      subtitle.style.opacity = '1';
      subtitleTimer = seconds;
    },

    // '' hides the prompt. The chip shows E — or the controller's use
    // button when a pad is driving.
    showPrompt(text) {
      if (!text) {
        prompt.style.display = 'none';
        return;
      }
      prompt.style.display = 'block';
      const useKey = input.usingGamepad
        ? (PAD_NAMES[input.padStyle] || PAD_NAMES.xbox).use
        : 'E';
      prompt.innerHTML = '<span class="key">' + useKey + '</span>';
      prompt.appendChild(document.createTextNode(padText(text)));
    },

    setObjective(title, objective) {
      if (!objective) {
        quest.style.display = 'none';
        return;
      }
      quest.style.display = 'block';
      quest.querySelector('.title').textContent = title;
      quest.querySelector('.objective').textContent = padText(objective);
    },

    update(dt) {
      if (subtitleTimer > 0) {
        subtitleTimer -= dt;
        if (subtitleTimer <= 0) subtitle.style.opacity = '0';
      }
      if (savedTimer > 0) {
        savedTimer -= dt;
        if (savedTimer <= 0) savedToast.style.opacity = '0';
      }
    },
  };
}
