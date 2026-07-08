// The ending: a full-screen storybook card whose text depends on the final
// Code score, followed by the credits. Every ending is warm — low Code
// changes the flavour, never punishes (quests-and-dialogue skill).

const STYLE = `
  #ending {
    position: absolute; inset: 0;
    background: rgba(16, 10, 5, 0.96);
    color: #f3e5c8; font: 17px/1.65 Georgia, serif;
    display: none;
    overflow-y: auto;
    pointer-events: auto;
    text-align: center;
  }
  #ending .inner { max-width: 620px; margin: 7vh auto; padding: 0 24px; }
  #ending h1 { color: #ffd26e; font-size: 30px; margin-bottom: 2px; }
  #ending .tier { color: #b09a6f; font-style: italic; margin-bottom: 24px; }
  #ending p { text-align: left; }
  #ending .bonus {
    border: 1px dashed #8a6a3a; border-radius: 6px; padding: 10px 16px;
    margin: 18px 0; text-align: left; background: rgba(232, 219, 181, 0.06);
  }
  #ending .credits { margin-top: 34px; color: #b09a6f; font-size: 14px; line-height: 1.9; }
  #ending button {
    background: rgba(60, 44, 24, 0.9); color: #f3e5c8;
    border: 1px solid #8a6a3a; border-radius: 6px;
    font: 16px Georgia, serif; padding: 10px 22px; margin: 26px 8px 40px;
    cursor: pointer;
  }
  #ending button:hover { background: rgba(90, 66, 36, 0.95); }
`;

const ENDINGS = {
  high: {
    tier: 'Folk Hero',
    text: [
      'Marshal Reyes reads the ledger twice, right there on the depot platform. Then she closes it, looks down the valley at all those statues, and says the finest words Copperhead Creek ever heard: "Full pardon. All of you. Try to act surprised."',
      'The celebration lasts three days. Mabel hands out sarsaparilla on the house. Newt performs his hawk call to a crowd that claps anyway. Preacher says a blessing that is definitely three proverbs stapled together, and Biscuit — hero of the hour — receives a medal. It is made entirely of apples. It does not survive the ceremony.',
      "Vane's statues come down one by one, melted into new hinges, door handles and a very fine school bell. Cole stays. Turns out a legend makes a decent neighbour — quiet, keeps his fences mended, and never, ever points iron at a living soul.",
    ],
  },
  mid: {
    tier: "Folk's Not Sure",
    text: [
      'Marshal Reyes reads the ledger on the depot platform and whistles low. "This will sink him," she says. "The pardons will take longer. Paperwork." Cole nods. He had a feeling paperwork would get the last word.',
      "So the gang rides at dawn, the way they came — no fuss, no speeches. Mabel leaves a basket of apples on the trail where they'll find it, which is how Copperhead Creek says thank you when it isn't sure it's allowed to say it out loud.",
      '"Someone\'s got to keep folk honest," Cole says at the ridge, and the valley below already looks lighter without Vane\'s name pressing on it. The wanted posters stay up a while longer. Folk have started drawing little hearts on them.',
    ],
  },
  low: {
    tier: 'Wanted Outlaw',
    text: [
      'The ledger sinks Vane all the same — fraud reads the same in any hand. But when Marshal Reyes looks up from it, her eyes settle on Cole a long moment. "The book squares HIS accounts," she says. "What about yours?"',
      "So the gang spends the week that follows going porch to porch, quiet as weather, putting back everything that got over-taken along the way. A strongbox here. A coin purse there. A hundred and fifty dollars of shiny inconvenience returned with interest and no note.",
      'They ride out with empty saddlebags and the valley better than they found it — which, Preacher points out, is the only line of the Code that was ever really the point. "Like the good book probably says: it\'s never too late to have always meant well."',
    ],
  },
};

const BONUS_SCENE =
  'BONUS — ALL POSTERS FOUND: In a final act recorded by history, Cornelius Vane — feeling left out — commissions a wanted poster of himself. "WANTED: C. VANE, VISIONARY." The printer charges him triple. Everyone agrees it is his best likeness.';

export function createEndingScreen() {
  const overlay = document.getElementById('ui-overlay');
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'ending';
  overlay.appendChild(panel);

  const screen = {
    visible: false,
    show(tier, allPostersFound, onKeepWandering) {
      const ending = ENDINGS[tier];
      screen.visible = true;
      document.exitPointerLock?.();

      const inner = document.createElement('div');
      inner.className = 'inner';
      inner.innerHTML = `<h1>The Rustler's Code</h1>
        <div class="tier">— ${ending.tier} —</div>`;
      for (const p of ending.text) {
        const el = document.createElement('p');
        el.textContent = p;
        inner.appendChild(el);
      }
      if (allPostersFound) {
        const bonus = document.createElement('div');
        bonus.className = 'bonus';
        bonus.textContent = BONUS_SCENE;
        inner.appendChild(bonus);
      }

      const credits = document.createElement('div');
      credits.className = 'credits';
      credits.innerHTML = `THE RUSTLER'S CODE<br>
        A Copperhead Creek story<br><br>
        Story, build and stubborn ideas — Noah<br>
        Code wrangling — Ted<br><br>
        Made with Three.js and Vite. Every model, sound and picture in this
        game was made by hand, in code, for free.<br><br>
        No living thing was aimed at during the making of this game.<br>
        Biscuit was paid in apples.`;
      inner.appendChild(credits);

      const wander = document.createElement('button');
      wander.textContent = 'Keep wandering the valley';
      wander.addEventListener('click', () => {
        panel.style.display = 'none';
        screen.visible = false;
        onKeepWandering();
      });
      const fresh = document.createElement('button');
      fresh.textContent = 'Start a fresh legend';
      fresh.addEventListener('click', () => {
        localStorage.removeItem('rustlers-code-save');
        location.reload();
      });
      inner.append(wander, fresh);

      panel.innerHTML = '';
      panel.appendChild(inner);
      panel.style.display = 'block';
      panel.scrollTop = 0;
    },

    // The tenth poster found AFTER the story is done: the ending card has
    // already been and gone, so the bonus scene gets its own little card —
    // nobody hunts all ten and gets silence as a reward.
    showBonus() {
      screen.visible = true; // set BEFORE releasing the mouse, so the pause
      document.exitPointerLock?.(); // menu doesn't claim the moment
      const inner = document.createElement('div');
      inner.className = 'inner';
      inner.innerHTML = `<h1>Every Poster Found</h1>
        <div class="tier">— the collection is complete —</div>`;
      const bonus = document.createElement('div');
      bonus.className = 'bonus';
      bonus.textContent = BONUS_SCENE;
      inner.appendChild(bonus);
      const wander = document.createElement('button');
      wander.textContent = 'Keep wandering the valley';
      wander.addEventListener('click', () => {
        panel.style.display = 'none';
        screen.visible = false;
      });
      inner.appendChild(wander);
      panel.innerHTML = '';
      panel.appendChild(inner);
      panel.style.display = 'block';
      panel.scrollTop = 0;
    },
  };
  return screen;
}
