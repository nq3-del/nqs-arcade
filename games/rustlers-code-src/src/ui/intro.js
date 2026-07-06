// The storybook opening: four short pages that set up Vane, the gang and
// the Code before a new game begins. Shown once (a flag in the save
// remembers), always skippable. Pure HTML over the canvas.

const STYLE = `
  #intro {
    position: absolute; inset: 0;
    background: rgba(14, 9, 4, 0.96);
    color: #f3e5c8; font: 18px/1.7 Georgia, serif;
    display: none;
    pointer-events: auto;
    text-align: center;
    overflow-y: auto;
  }
  #intro .inner { max-width: 560px; margin: 12vh auto 6vh; padding: 0 24px; }
  #intro h2 { color: #ffd26e; font-size: 24px; font-style: italic; margin-bottom: 18px; }
  #intro p { text-align: left; }
  #intro .code-list {
    text-align: left; margin: 14px auto; display: inline-block;
    color: #ffd26e; font-style: italic; line-height: 2.1;
  }
  #intro .buttons { margin-top: 30px; }
  #intro button {
    background: rgba(60, 44, 24, 0.9); color: #f3e5c8;
    border: 1px solid #8a6a3a; border-radius: 6px;
    font: 16px Georgia, serif; padding: 10px 24px; margin: 0 8px;
    cursor: pointer;
  }
  #intro button:hover { background: rgba(90, 66, 36, 0.95); }
  #intro .skip { opacity: 0.65; font-size: 14px; }
  #intro .dots { margin-top: 22px; color: #8a6a3a; letter-spacing: 8px; }
`;

const PAGES = [
  {
    title: 'Copperhead Valley',
    body: [
      'A good place, mostly. Good water, good land, good folk — right up until Cornelius Vane\'s railroad money arrived and started buying things that were never for sale. The bank. The land office. The sheriff, at a discount.',
    ],
  },
  {
    title: 'The Paper Problem',
    body: [
      'One by one, farms began owing money nobody had ever borrowed. The deeds were beautiful. The signatures were beautiful. They were also forged — and the only man with the authority to care about that takes his naps at Vane\'s expense.',
      'When the law is bought and paid for, honest folk are left with exactly one option: better outlaws.',
    ],
  },
  {
    title: 'Cole "Copper" Calloway',
    body: [
      'That would be you — the finest shot in the territory, with one unbreakable rule: never point iron at a living soul. Locks, ropes, latches and bottles have learned to fear your name. People? Never. Not once. Not ever.',
      'You ride with Doc Vega (builds impossible things), Preacher Boone (misquotes wise things), young Newt (signals, loosely) and Biscuit — a horse the posters call bloodthirsty and an apple calls a friend.',
    ],
  },
  {
    title: 'The Code',
    body: [],
    code: ['1. Never harm a soul.', '2. Take only what was taken.', '3. Leave folk better than you found \'em.'],
    last: true,
  },
];

export function createIntro() {
  const overlay = document.getElementById('ui-overlay');
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'intro';
  overlay.appendChild(panel);

  let open = false;
  let pageIndex = 0;
  let onDone = null;

  function finish() {
    open = false;
    panel.style.display = 'none';
    if (onDone) onDone();
  }

  function renderPage() {
    const page = PAGES[pageIndex];
    const inner = document.createElement('div');
    inner.className = 'inner';
    inner.innerHTML = `<h2>${page.title}</h2>`;
    for (const text of page.body) {
      const p = document.createElement('p');
      p.textContent = text;
      inner.appendChild(p);
    }
    if (page.code) {
      const list = document.createElement('div');
      list.className = 'code-list';
      list.innerHTML = page.code.join('<br>');
      inner.appendChild(list);
    }

    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    const next = document.createElement('button');
    next.textContent = page.last ? 'Saddle up' : 'Next ▸';
    next.addEventListener('click', () => {
      if (page.last) return finish();
      pageIndex += 1;
      renderPage();
    });
    buttons.appendChild(next);
    if (!page.last) {
      const skip = document.createElement('button');
      skip.className = 'skip';
      skip.textContent = 'Skip';
      skip.addEventListener('click', finish);
      buttons.appendChild(skip);
    }
    inner.appendChild(buttons);

    const dots = document.createElement('div');
    dots.className = 'dots';
    dots.textContent = PAGES.map((_, i) => (i === pageIndex ? '●' : '○')).join('');
    inner.appendChild(dots);

    panel.innerHTML = '';
    panel.appendChild(inner);
    panel.scrollTop = 0;
  }

  return {
    isOpen: () => open,
    show(done) {
      onDone = done;
      pageIndex = 0;
      open = true;
      panel.style.display = 'block';
      renderPage();
    },
  };
}
