import { CHARACTERS, HERO_FORMS } from "../data/config.js";
import { WORLDS, FINAL_STAGES } from "../data/levels.js";
import { mayhemUnlocked, PUPPET_WAVE, PUPPET_LIMIT, BOSS_WAVE } from '../diorama/MayhemWaves.js';
import { CHAOS_EMERALDS, STAGE_STARS, TOTAL_STARS } from '../data/chaos.js';
import { TWO_PLAYER_CONTROLS } from '../diorama/MultiplayerCombat.js';
import { canReplay, replayCharacters } from '../systems/ReplayProgress.js';
import { CONTROLLER_ACTIONS, BUTTON_LABELS, DEFAULT_BINDINGS, bindingLabel, bindingConflicts, normalizeBindings, controllerHelp } from '../systems/ControllerBindings.js';

const controls = `<div class="control-grid"><div><kbd>ARROWS</kbd> / W A D · Explore</div><div><kbd>SPACE</kbd> Jump</div><div><kbd>Q</kbd> Change form</div><div><kbd>J</kbd> Attack</div><div><kbd>K</kbd> Dash / power pop</div><div><kbd>E</kbd> Interact / next scene</div><div><kbd>TAB</kbd> Choose next ally</div><div><kbd>L</kbd> Call your ally</div><div><kbd>ESC</kbd> Pause / resume</div><div><kbd>R</kbd> Try again after defeat</div><div><kbd>S</kbd> Super Goku / normal (all emeralds)</div><div><kbd>SPACE</kbd> Fly up ? <kbd>C</kbd> Fly down</div></div>`;
const button = (text, action, cls = "primary") =>
  `<button class="${cls}" data-action="${action}">${text}</button>`;
export class UI {
  constructor(services) {
    this.services = services;
    this.root = document.querySelector("#ui");
    this.hud = document.querySelector("#hud");
    this.mode = "menu";
    this.actions = {};
    this.stack = [];
    this.root.addEventListener("click", (e) => {
      const target = e.target.closest("[data-action]");
      if (target && !target.disabled) {
        this.services.audio.unlock();
        this.actions[target.dataset.action]?.();
      }
    });
    this.root.addEventListener('change', e => {
      if (e.target.matches('[data-controller-action]')) this.controllerBindingStatus();
    });
    this.hud.addEventListener("click", (e) => {
      const action = e.target.closest("[data-hud]")?.dataset.hud;
      if (action === "pause") this.pause();
      if (action === "map") this.map();
      if (action === "allies") this.showAllies();
      if (action === "skins") this.skinPicker();
      if (action === "super" && this.mode === 'game' && !this.scene.cinematic) {
        this.scene.player.superPower.toggle();
        e.target.closest('button')?.blur();
      }
    });
    document.querySelector("#sound-toggle").addEventListener("click", () => {
      this.services.audio.unlock();
      this.progress.data.settings.muted = !this.progress.data.settings.muted;
      this.progress.save();
      this.soundButton();
    });
    document
      .querySelector("#settings-button")
      .addEventListener("click", () => this.settings());
    document
      .querySelector("#fullscreen-toggle")
      .addEventListener("click", () => this.toggleFullscreen());
    document.addEventListener("fullscreenchange", () => {
      this.fullscreenButtons();
      this.game?.scale.refresh();
    });
    document.querySelector("#brand").addEventListener("click", (e) => {
      e.preventDefault();
      if (this.mode === "game") this.pause();
      else this.menu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Let the browser leave full screen before handling game menus.
        if (document.fullscreenElement) return;
        if (document.querySelector("#app").classList.contains("window-fullscreen")) { document.querySelector("#app").classList.remove("window-fullscreen"); this.fullscreenButtons(); return; }
        e.preventDefault();
        if (this.mode === "game") this.pause();
        else if (this.stack.length) this.pop();
      }
      if (e.key.toLowerCase() === "r" && this.mode === "defeat") this.retry();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.mode === "game") this.pause();
    });
    this.soundButton();
    this.fullscreenButtons();
  }
  get progress() {
    return this.services.progress;
  }
  get scene() {
    return this.game.scene.getScene("Game");
  }
  attach(game) {
    this.game = game;
  }
  controllerTargets() {
    const cinema = this.mode === 'game' && this.scene?.cinematic;
    const root = cinema ? this.scene.cinemaElement : this.root;
    const elements = [...root.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')];
    if (['menu','map','chaos'].includes(this.mode)) elements.push(...document.querySelectorAll('.site-header button:not(:disabled),#brand'));
    return elements.filter(el => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');
  }
  controllerNavigation(show) {
    let hint=document.getElementById('controller-menu-hint');
    if(!hint) {hint=document.createElement('div');hint.id='controller-menu-hint';document.querySelector('#app').appendChild(hint);}
    hint.hidden=!show;
    hint.textContent='Stick / D-pad: move · ×: select / confirm · ○: back · ← →: change setting · Options: pause';
    document.querySelector('#app').classList.toggle('controller-navigation',show);
  }
  soundButton() {
    this.services.voice?.sync();
    const b = document.querySelector("#sound-toggle");
    b.textContent = this.progress.data.settings.muted ? "♪̸" : "♪";
    b.setAttribute(
      "aria-label",
      this.progress.data.settings.muted ? "Unmute sound" : "Mute sound",
    );
    b.setAttribute("aria-pressed", String(this.progress.data.settings.muted));
  }
  fullscreenButtons() {
    const active = document.fullscreenElement === document.querySelector("#app") || document.querySelector("#app").classList.contains("window-fullscreen");
    const supported = !!document.fullscreenEnabled;
    document.querySelectorAll("[data-fullscreen]").forEach((b) => {
      b.textContent = active ? "Exit full screen" : "Full screen";
      b.setAttribute("aria-pressed", String(active));
      b.setAttribute("aria-label", active ? "Exit full screen" : "Enter full screen");
      b.title = supported
        ? (active ? "Exit full screen (Esc)" : "Enter full screen")
        : "Expand the game to fill this window";
      b.disabled = !!this.fullscreenPending;
    });
  }
  async toggleFullscreen() {
    if (this.fullscreenPending) return;
    this.fullscreenPending = true;
    this.fullscreenButtons();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.querySelector("#app").classList.contains("window-fullscreen")) document.querySelector("#app").classList.remove("window-fullscreen");
      else await document.querySelector("#app").requestFullscreen();
    } catch {
      // Browsers may deny native fullscreen for Gamepad API input. Keep the
      // controller usable by filling the browser window instead.
      document.querySelector("#app").classList.add("window-fullscreen");
      this.toast("Game expanded to fill the window.");
    } finally {
      this.fullscreenPending = false;
      this.fullscreenButtons();
      this.game?.scale.refresh();
      // Space should keep jumping after using the toolbar while playing.
      if (this.mode === "game") document.activeElement?.blur();
    }
  }
  render(html, mode, actions = {}) {
    if (mode !== "game")
      document.querySelector("#toast").classList.remove("show");
    this.root.innerHTML = html;
    this.mode = mode;
    this.actions = actions;
    this.fullscreenButtons();
    this.root
      .querySelector("button:not(:disabled)")
      ?.focus({ preventScroll: true });
  }
  showBackdrop() {
    if (this.game.scene.isActive("Game") || this.game.scene.isPaused("Game"))
      this.game.scene.stop("Game");
    if (!this.game.scene.isActive("Menu")) this.game.scene.start("Menu");
    this.hud.hidden = true;
    this.stack = [];
    document.querySelector("#toast").classList.remove("show");
  }
  menu() {
    this.showBackdrop();
    const d = this.progress.data;
    this.render(
      `<div class="menu-screen"><div class="eyebrow"><span class="dot"></span> AN ORIGINAL FAMILY ADVENTURE</div><h1 class="title"><span class="small">The</span>Shadow Puppet<span class="uprising">Uprising<span style="font-size:.3em;vertical-align:top">✦</span></span></h1><p class="menu-copy">Two forms. Five legendary rescues.<br>One family of very unlikely heroes.</p><div class="button-row">${button(`${d.checkpoint || d.origin ? "Continue adventure" : "Let’s play"} <span class="arrow">→</span>`, "play")}${button("How to play", "help", "secondary")}</div><div class="menu-footnote">ABOUT 30 MINUTES &nbsp; &middot; &nbsp; AGES 6+ &nbsp; · &nbsp; KEYBOARD ADVENTURE &nbsp; · &nbsp; SAVES AUTOMATICALLY</div><div class="chapter-badge">SMALL HEROES. BIG BALONEY.</div><div class="hero-tag">One hero. Two possibilities.<span>Hero designs are yours to imagine.</span></div><div class="bottom-strip"><span><b>✦</b> A LITTLE MAGIC. A LOT OF TEAMWORK.</span><span>${d.rescued.length}/5 ALLIES RESCUED &nbsp; · &nbsp; ${d.stars} STARS</span></div></div>`,
      "menu",
      {
        play: () => {
          if (d.checkpoint && this.progress.isUnlocked(d.checkpoint.level))
            this.start(d.checkpoint.level, true, d.checkpoint.mission);
          else if (d.origin) this.map();
          else this.start(0);
        },
        help: () => this.help(),
        settings: () => this.settings(),
        phone: () => this.services.phoneControllers.open(),
      },
    );
    this.root.querySelector('.menu-footnote').textContent='ABOUT 30 MINUTES · AGES 6+ · KEYBOARD / CONTROLLER · SAVES AUTOMATICALLY';
    this.root.querySelector('.menu-footnote').insertAdjacentHTML('beforebegin', `<div class="menu-play-options" aria-label="Play options">${button('Players & settings','settings','text-button')}<span class="menu-option-divider" aria-hidden="true"></span><button id="phone-controller-button" class="text-button" data-action="phone"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/></svg>Use your phone</button></div>`);
    this.root.querySelector('.hero-tag span').textContent='Drawn by our two creative directors.';
    if (this.progress.data.origin) {
      this.root.querySelector('.button-row').insertAdjacentHTML('beforeend',button('Replay a level','replay','secondary'));
      this.actions.replay=()=>this.replayPicker();
    }
  }
  replayPicker() {
    this.showBackdrop();
    const stages=WORLDS.filter(w=>canReplay(this.progress,w.id));
    this.render(`<div class="overlay"><div class="dialog wide"><div class="eyebrow">PLAY IT AGAIN</div><h1>Replay a level</h1><p>Revisit a completed story with its challenges, enemies and boss restored. Your main adventure and collection stay saved.</p><label class="setting-row"><span>Level</span><select id="replay-level">${stages.map(w=>`<option value="${w.id}">${w.name}</option>`).join('')}</select></label><label class="setting-row"><span>Play as</span><select id="replay-character">${replayCharacters(this.progress).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></label><p>You can switch your form during a replay. Any new stars you collect are yours to keep.</p><div class="button-row">${button('Replay level','replay-start')}${button('World map','map','secondary')}</div></div></div>`, 'replay-picker', {
      'replay-start':()=>this.startReplay(Number(document.querySelector('#replay-level').value),document.querySelector('#replay-character').value,Number(document.querySelector('#replay-players').value)),map:()=>this.map(),
    });
    this.root.querySelector('#replay-character').closest('label').insertAdjacentHTML('beforebegin', '<label class="setting-row"><span>Players</span><select id="replay-players"><option value="1">One player</option><option value="2">Two players</option></select></label>');
    this.root.querySelector('#replay-players').value = String(this.progress.data.settings.players);
    if(!stages.length)this.root.querySelector('[data-action="replay-start"]').disabled=true;
  }
  startReplay(level, loadout = 'A', players = this.progress.data.settings.players) {
    if(!canReplay(this.progress,level)||!replayCharacters(this.progress).some(c=>c.id===loadout))return;
    this.progress.data.settings.players = players === 2 ? 2 : 1;
    this.progress.save();
    this.services.audio.unlock();this.stack=[];this.game.scene.stop('Menu');this.game.scene.stop('Game');
    this.render('','game');this.hud.hidden=false;
    this.game.scene.start('Game',{level,replay:true,loadout});
  }
  replayComplete() {
    const {levelId,replayLoadout}=this.scene;
    this.render(`<div class="overlay"><div class="dialog"><div class="eyebrow">LEVEL REPLAY COMPLETE</div><h1>Another great adventure!</h1><p>Your main-story progress is safe, and any newly collected stars have been saved.</p><div class="button-row">${button('Replay again','again')}${button('Choose another level','choose','secondary')}${button('World map','map','secondary')}</div></div></div>`, 'replay-complete', {
      again:()=>this.startReplay(levelId,replayLoadout),choose:()=>this.replayPicker(),map:()=>this.map(),
    });
  }
  map() {
    this.showBackdrop();
    const d = this.progress.data;
    const icons = ["✦", "⚙", "✿", "◆", "✦", "●", "✶"];
    let cards = "";
    for (const w of WORLDS.slice(1)) {
      const unlocked = this.progress.isUnlocked(w.id);
      const complete = w.owner ? d.rescued.includes(w.owner) : d.victory;
      cards += `<button data-action="world${w.id}" class="world-card ${w.id === 6 ? "finale" : ""}" ${unlocked ? "" : "disabled"} style="border-top:4px solid ${unlocked ? w.color : "#b3bfb2"}"><div><div class="card-top"><span>${w.label}</span><span class="status">${complete ? "✓ RESCUED" : unlocked ? "LET’S GO →" : "LOCKED"}</span></div><h2>${w.name}</h2><p>${unlocked ? w.short : w.id === 6 ? "Rescue all five allies to enter." : `Rescue ${CHARACTERS[w.id - 2]?.name || "Grandad"} first.`}</p></div><span class="world-icon">${icons[w.id]}</span></button>`;
    }
    this.render(
      `<div class="map-screen"><div class="screen-top"><div><div class="eyebrow">YOUR GREAT BIG ADVENTURE</div><h1>A family worth fighting for.</h1><p>Follow the trail. Free the legends. Bring everybody home.</p></div><div class="map-stats"><span class="pill">✦ ${d.stars} stars &nbsp; / &nbsp; ${d.rescued.length} of 5</span>${button("← Menu", "menu", "text-button")}</div></div><div class="world-grid">${cards}</div><div class="origin-link">${button("↺ Revisit the origin", "origin", "text-button")}<span>Completed worlds are free of their shadow armies. ${this.progress.saveError ? '<b class="save-warning">Storage unavailable</b>' : "✓ Progress saved"}</span></div></div>`,
      "map",
      {
        menu: () => this.menu(),
        origin: () => this.start(0),
        ...Object.fromEntries(
          WORLDS.slice(1).map((w) => [`world${w.id}`, () => this.start(w.id)]),
        ),
      },
    );
    for (const w of WORLDS.slice(1)) {
      this.root.querySelector(`[data-action="world${w.id}"] p`)?.insertAdjacentHTML('beforeend',
        `<br><b class="stage-stars">★ ${this.progress.stageStars(w.id)} / ${STAGE_STARS[w.id].length} stars</b>`);
    }
    this.root.querySelector('.origin-link')?.insertAdjacentHTML('beforeend',
      `<b class="stage-stars">Origin: ${this.progress.stageStars(0)}/${STAGE_STARS[0].length} ★</b>${button('◆ Chaos Emeralds', 'chaos', 'secondary')}`);
    this.actions.chaos = () => this.chaosMap();
    this.root.querySelector('.origin-link').insertAdjacentHTML('beforeend',button('Replay a level','replay','secondary'));
    this.actions.replay=()=>this.replayPicker();
    this.root.querySelector('.origin-link').insertAdjacentHTML('beforeend',button(mayhemUnlocked(this.progress)?'Shadow Mayhem':'Shadow Mayhem · locked','mayhem','secondary'));
    this.actions.mayhem=()=>this.mayhemPicker();
  }
  mayhemPicker() {
    this.showBackdrop();
    const unlocked=mayhemUnlocked(this.progress);
    const requirements = [
      [this.progress.data.victory, 'Beat the game'],
      [this.progress.superUnlocked(), 'Unlock Super Goku and Hyper Goku'],
      [this.progress.data.lebronUnlocked, 'Unlock LeBron James'],
      [this.progress.data.curryUnlocked, 'Unlock Steph Curry'],
      [this.progress.data.viniUnlocked, 'Unlock Vini Jr.'],
      [this.progress.data.squidwardUnlocked, 'Unlock Handsome Squidward'],
    ];
    this.render(`<div class="overlay"><div class="dialog wide mayhem-dialog"><div class="eyebrow">ENDLESS FUN</div><h1>Shadow Mayhem</h1><p>Destroy as many shadows as you can. No time limit, no final wave, no limit on your total defeats.</p><p>${PUPPET_WAVE.toLocaleString()} puppets at the start, then ${PUPPET_WAVE.toLocaleString()} every 30 seconds, up to ${PUPPET_LIMIT.toLocaleString()} roaming at once. Defeat some to make room for the next wave.</p><p>Every minute, ${BOSS_WAVE.toLocaleString()} Ultimate Shadow Bosses join in. Bosses have no population cap.</p>${unlocked ? `<label class="setting-row"><span>Players</span><select id="mayhem-players"><option value="1">One player</option><option value="2">Two players</option></select></label><label class="setting-row"><span>Play as</span><select id="mayhem-character">${replayCharacters(this.progress).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></label><p>You respawn after 3 seconds. Both players fight the shadows. Turn PvP on in Settings to battle each other with your attacks and family allies. Pause whenever you like; leave using Map.</p>` : `<p>Beat the game and unlock every character to enter:</p><ul class="mayhem-unlocks">${requirements.map(([done,label])=>`<li>${done?'✓':'○'} ${label}</li>`).join('')}</ul>`}<div class="button-row">${unlocked?button('Enter Shadow Mayhem','mayhem-start'):''}${button('World map','map','secondary')}</div></div></div>`,'mayhem-picker',{
      'mayhem-start':()=>this.startMayhem(document.querySelector('#mayhem-character').value,Number(document.querySelector('#mayhem-players').value)),map:()=>this.map(),
    });
    if(unlocked)this.root.querySelector('#mayhem-players').value=String(this.progress.data.settings.players);
  }
  startMayhem(loadout='A',players=this.progress.data.settings.players) {
    if(!mayhemUnlocked(this.progress)||!replayCharacters(this.progress).some(c=>c.id===loadout))return;
    this.progress.data.settings.players=players===2?2:1;this.progress.save();
    this.services.audio.unlock();this.stack=[];this.game.scene.stop('Menu');this.game.scene.stop('Game');
    this.render('','game');this.hud.hidden=false;
    this.game.scene.start('Game',{level:6,mayhem:true,loadout});
  }
  chaosMap() {
    this.showBackdrop();
    const p = this.progress, unlocked = p.chaosUnlocked();
    const requirement = !p.data.victory ? 'Finish the main story and collect every star to open these side missions.'
      : !unlocked ? `Story complete! Collect the remaining ${TOTAL_STARS - p.storyStars()} stars to open all seven missions.`
      : p.superUnlocked() ? 'Super Goku unlocked! In any stage, press S or Super. Hold Space to fly up and C to fly down.'
      : 'Seven missions. Seven Chaos Emeralds. Open three seals in each mission and claim its emerald.';
    this.render(`<div class="map-screen chaos-screen"><div class="screen-top"><div><div class="eyebrow">THE ADVENTURE AFTER THE STORY</div><h1>The Chaos Emeralds</h1><p>${requirement}</p></div>${button('← World map', 'map', 'secondary')}</div>
      <div class="chaos-progress"><span>${p.data.victory ? '✓' : '○'} Story complete</span><span>★ ${p.storyStars()} / ${TOTAL_STARS} stars</span><span>◆ ${p.data.emeralds.length} / 7 Chaos Emeralds</span></div>
      <div class="chaos-grid">${CHAOS_EMERALDS.map(e => `<button class="chaos-card ${p.data.emeralds.includes(e.id) ? 'collected' : ''}" data-action="chaos-${e.id}" ${unlocked ? '' : 'disabled'} style="--gem:${e.color}"><i class="chaos-gem" aria-hidden="true"></i><span class="eyebrow">${p.data.emeralds.includes(e.id) ? '✓ COLLECTED · REPLAY' : unlocked ? 'SIDE MISSION' : 'LOCKED'}</span><h2>${e.name} Chaos Emerald</h2><p>${e.title}</p><small>${WORLDS[e.level].name}</small></button>`).join('')}</div>
      <p class="chaos-footnote">Collect all seven to become Super Goku and fly. S transforms you; S again sends the emeralds flying and returns you to normal. Your emeralds stay collected.</p></div>`, 'chaos', {
        map: () => this.map(), ...Object.fromEntries(CHAOS_EMERALDS.map(e => [`chaos-${e.id}`, () => this.start(e.level, false, e.id)])),
      });
  }
  chaosReward(emerald) {
    const all = this.progress.superUnlocked();
    this.push(`<div class="overlay"><div class="dialog"><div class="chaos-reward-gem" style="--gem:${emerald.color}"><i class="chaos-gem"></i></div><div class="eyebrow">CHAOS EMERALD COLLECTED</div><h1>${all ? 'Super Goku unlocked!' : `${emerald.name} Chaos Emerald`}</h1><p>${all ? 'All seven are yours! Press S or the Super button to transform. Hold Space to fly up, C to fly down, and use the arrows to steer.' : `${this.progress.data.emeralds.length} of 7 collected. Your emerald is saved.`}</p><div class="button-row">${button(all ? 'Try Super Goku!' : 'Keep exploring', 'resume')}${button('Emerald missions', 'chaos', 'secondary')}</div><small>Press S again to return to normal. You always keep your emeralds.</small></div></div>`, 'chaos-reward', {
      resume: () => this.pop(), chaos: () => this.chaosMap(),
    });
  }
  lebronReward() {
    this.push(`<div class="overlay"><div class="dialog"><div class="eyebrow">SECRET DISCOVERED</div><h1>LeBron James unlocked!</h1><p>Your new skin is saved.</p><p><kbd>R</kbd> equips LeBron James. Press <kbd>R</kbd> again to unequip him.<br>While equipped, press <kbd>T</kbd> near a stadium basketball hoop to shoot a basketball.</p><p><kbd>S</kbd> still switches between Super Goku and your original form.</p>${button('Keep playing', 'resume')}</div></div>`, 'lebron-reward', { resume: () => this.pop() });
    this.root.querySelector('.dialog p:last-of-type').insertAdjacentHTML('beforebegin', '<p><kbd>K</kbd> fires a blue-and-red flaming basketball. Scoring causes a huge explosion, then 5 seconds of fire damage and a 20% enemy slowdown. The shot recharges in 5 seconds.</p>');
  }
  curryReward() {
    this.push(`<div class="overlay"><div class="dialog"><div class="eyebrow">SECRET DISCOVERED</div><h1>Steph Curry unlocked!</h1><p>Your new skin is saved.</p><p><kbd>Y</kbd> equips Steph Curry. Press <kbd>Y</kbd> again to unequip him.</p><p>Near a basketball hoop, <kbd>T</kbd> shoots a basketball and <kbd>K</kbd> fires the blue-and-red flaming shot. It explodes on scoring, then leaves 5 seconds of fire damage and a 20% enemy slowdown. The shot recharges in 5 seconds.</p>${button('Keep playing','resume')}</div></div>`, 'curry-reward', {resume:()=>this.pop()});
  }
  viniReward() {
    this.push(`<div class="overlay"><div class="dialog"><div class="eyebrow">SECRET DISCOVERED</div><h1>Vini Jr. unlocked!</h1><p>Your new skin is saved for both players.</p><p><kbd>U</kbd> equips Vini Jr.; press it again to return. Near a football goal, <kbd>T</kbd> shoots and <kbd>K</kbd> fires a blue-and-red flaming football.</p><p>The super shot explodes on scoring, then leaves fire for 5 seconds with damage and a 20% enemy slowdown. It recharges in 5 seconds.</p><p><kbd>I</kbd> performs his finger-pointing celebration, with a 3-second cooldown.</p><p>P2: <kbd>8</kbd> toggles Vini, <kbd>6</kbd> shoots, <kbd>2</kbd> uses the super shot, and <kbd>P</kbd> celebrates. You can both wear the same skin.</p>${button('Keep playing','resume')}</div></div>`, 'vini-reward', {resume:()=>this.pop()});
  }
  squidwardReward(player=this.scene.player) {
    this.push(`<div class="overlay"><div class="dialog squidward-reward-dialog"><div class="eyebrow">SECRET MIRROR DISCOVERED</div><img src="./assets/characters/handsome-squidward.png" alt="Handsome Squidward" style="width:170px;height:170px;object-fit:contain"><h1>Handsome Squidward unlocked!</h1><p>The Ultimate Rizzler! Your new skin is saved for both players.</p><p>Press <b>${this.controllerButton('h')}</b> on your controller to equip or unequip him. Keyboard: <kbd>H</kbd> for P1, <kbd>O</kbd> for P2.</p><p>A cool cosmetic skin: walk, jump and interact, with no attacks, ally summons or special powers.</p><div class="button-row">${button('Equip now','equip')}${button('Keep playing','resume','secondary')}</div></div></div>`,'squidward-reward',{
      equip:()=>{this.pop();player.setSquidwardEquipped(true);},resume:()=>this.pop(),
    });
  }
  skinPicker() {
    if(!this.scene.player||this.scene.cinematic)return;
    const choices=[{id:'normal',name:'Regular form'},...replayCharacters(this.progress).filter(c=>!['A','B','hyper'].includes(c.id))];
    const actions={close:()=>this.pop()};
    const panels=this.scene.players.map((p,slot)=>`<div><h2>Player ${slot?'two':'one'}</h2><div class="button-row">${choices.map(c=>{
      const action=`skin-${slot}-${c.id}`;
      actions[action]=()=>{this.pop();if(p.downed||p.superPower.busy)return;
        if(c.id==='goku'){if(p.squidwardEquipped)p.setSquidwardEquipped(false);if(!p.superPower.active)p.superPower.toggle();else{p.clearBasketballSkin();p.setSuperAppearance(true);}}
        else if(c.id==='normal'){p.clearBasketballSkin();if(p.superPower.active)p.superPower.toggle();else p.setSuperAppearance(false);}
        else p[c.id==='squidward'?'setSquidwardEquipped':c.id==='vini'?'setViniEquipped':c.id==='curry'?'setCurryEquipped':'setLeBronEquipped'](true);
      };
      return button(c.name,action,'secondary');}).join('')}</div></div>`).join('');
    this.push(`<div class="overlay"><div class="dialog wide"><h1>Choose your character</h1>${panels}<p>Both players may choose the same character.</p>${button('Back','close')}</div></div>`,'skins',actions);
  }
  start(level, resume = false, mission = null) {
    if (!this.progress.isUnlocked(level)) return;
    if (mission && (!this.progress.chaosUnlocked() || !CHAOS_EMERALDS.some(e => e.id === mission && e.level === level))) return;
    this.services.audio.unlock();
    this.stack = [];
    this.game.scene.stop("Menu");
    this.game.scene.stop("Game");
    this.render("", "game");
    this.hud.hidden = false;
    this.game.scene.start("Game", { level, resume, mission });
  }
  buildHUD() {
    this.hud.classList.toggle("mayhem-hud",!!this.scene.mayhemMode);
    this.hud.innerHTML = `<div class="hud-top"><div class="hud-panel"><span class="hud-caption">OUR HERO</span><div id="health" class="health"></div></div><div class="hud-level"><small id="level-label"></small><span id="level-name"></span></div><div class="hud-right"><div class="hud-panel" style="min-width:90px"><span class="hud-caption">STAR COLLECTION</span><b id="star-count">✦ 0</b></div><button class="hud-pause" data-hud="pause" aria-label="Pause game">Ⅱ</button></div></div><div class="tutorial" id="tutorial" hidden></div><div class="boss-hud" id="boss-hud" hidden><b id="boss-name"></b><div class="boss-track"><i id="boss-health"></i></div><small id="boss-warning"></small></div><div class="tutorial final-task" id="final-task" hidden></div><div class="hud-bottom"><div class="hud-panel form-panel" id="form-panel"><span class="hud-caption">YOUR FORM · Q TO SWITCH</span><div class="form-name"><span id="form-name"></span><kbd>K</kbd></div><div class="ability-label"><span id="form-ability"></span><b id="form-ready"></b></div><div class="cooldown"><i id="form-cooldown"></i></div></div><div class="controls-mini"><kbd>←</kbd><kbd>→</kbd> Move &nbsp; <kbd>SPACE</kbd> Jump &nbsp; <kbd>J</kbd> Attack<br><kbd>Q</kbd> Switch &nbsp; <kbd>K</kbd> Special &nbsp; <kbd>E</kbd> Interact</div><div class="hud-panel ally-panel"><span class="hud-caption">A LITTLE HELP · TAB TO CYCLE</span><div class="ally-name"><span id="ally-name"></span><button data-hud="allies">Choose</button></div><div class="ability-label"><span id="ally-ability"></span><b id="ally-ready"></b></div><div class="cooldown"><i id="ally-cooldown"></i></div></div></div><div class="touch-controls"><div><button data-touch="left">←</button><button data-touch="right">→</button></div><div><button data-touch="q">Q</button><button data-touch="j">J</button><button data-touch="k">K</button><button data-touch="l">L</button><button data-touch="e">E</button><button data-touch="space">↑</button></div></div>`;
    document
      .querySelector("#form-panel")
      .insertAdjacentHTML(
        "afterbegin",
        '<img id="form-portrait" class="form-portrait" src="./assets/characters/sketch-4840-cutout.png" alt="The children’s original Form A drawing">',
      );
    document.querySelector(".controls-mini").innerHTML =
      "<kbd>Arrows / W A D</kbd> Explore &nbsp; <kbd>SPACE</kbd> Jump &nbsp; <kbd>J</kbd> Attack<br><kbd>Q</kbd> Change form &nbsp; <kbd>K</kbd> Special &nbsp; <kbd>E</kbd> Interact";
    document
      .querySelector(".touch-controls > div")
      .insertAdjacentHTML(
        "beforeend",
        '<button data-touch="up">↑</button><button data-touch="down">↓</button>',
      );
    this.hud.querySelector('.touch-controls > div:last-child').insertAdjacentHTML('beforeend', '<button data-touch="c" aria-label="Fly down">Fly ↓</button>');
    this.hud.querySelector('.hud-right').insertAdjacentHTML('afterbegin', '<button class="hud-pause super-button" data-hud="super" aria-label="Transform into Super Goku" disabled>Super · S</button>');
    this.hud.querySelectorAll("[data-touch]").forEach((b) => {
      const key = b.dataset.touch;
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.scene.touchHeld[key] = true;
        this.scene.touchPressed[key] = true;
      });
      const up = () => {
        this.scene.touchHeld[key] = false;
      };
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("lostpointercapture", up);
    });
    document.querySelector("#level-label").textContent =
      this.scene.worldData.label;
    document.querySelector("#level-name").textContent =
      this.scene.worldData.name;
    document
      .querySelector(".hud-top .hud-panel")
      .insertAdjacentHTML("beforeend", '<small id="coop-status"></small>');
    document
      .querySelector(".hud-right")
      .insertAdjacentHTML(
        "afterbegin",
        '<button class="hud-pause map-button" data-hud="map" aria-label="World map">Map</button>',
      );
    this.hud.querySelector('.hud-right').insertAdjacentHTML('afterbegin', '<button class="hud-pause" data-hud="skins">Characters</button>');
    if(this.scene.mayhemMode)this.hud.querySelector(".hud-top .hud-panel").insertAdjacentHTML("beforeend",'<div id="mayhem-score" class="mayhem-score" role="status"></div>');
    this.updateHUD();
  }
  updateHUD() {
    const s = this.scene,
      p = s.player;
    if (!p) return;
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    const now = s.time.now;
    if(s.mayhem) {
      const m=s.mayhem,total=m.defeated.puppet+m.defeated.boss;
      set("mayhem-score",`Defeated: ${total.toLocaleString()} (${m.defeated.puppet.toLocaleString()} puppets · ${m.defeated.boss.toLocaleString()} bosses)\nRoaming: ${m.count("puppet").toLocaleString()}/${PUPPET_LIMIT.toLocaleString()} puppets · ${m.count("boss").toLocaleString()} bosses${p.downed?`\nRespawning in ${Math.ceil(p.respawnRemaining)}s`:""}`);
    }
    const superButton = this.hud.querySelector('[data-hud="super"]');
    if (superButton) {
      superButton.disabled = p.squidwardEquipped || !this.progress.superUnlocked() || p.superPower.busy || !!s.cinematic;
      superButton.textContent = p.superPower.busy ? 'Chaos Emeralds…' : p.superPower.active ? 'Normal · S' : 'Super · S';
      superButton.setAttribute('aria-label', p.superPower.active ? 'Return to normal form' : 'Transform into Super Goku');
      superButton.title = this.progress.superUnlocked() ? 'S / '+this.controllerButton('super')+' toggles Super Goku' : `Collect all stars and seven Chaos Emeralds (${this.progress.data.emeralds.length}/7)`;
    }
    const coop = document.querySelector("#coop-status");
    if (coop)
      coop.textContent = s.partner
        ? `P2: ${s.partner.downed ? `respawns in ${Math.ceil(s.partner.respawnRemaining || 0)}s` : String.fromCharCode(9829).repeat(Math.max(0, s.partner.health))} - ${this.services.controls.connected ? "controller ready" : "connect a controller"}`
        : this.services.controls.connected
          ? "Controller ready"
          : "";
    if(s.partner&&coop){const a=s.partner.allies;coop.textContent+=` · ${a.character?.name||'No ally'}${a.character?' · '+(a.remaining()?Math.ceil(a.remaining()/1000)+'s':this.controllerButton('l')+' ready'):''}`;}
    const controlsMini=document.querySelector('.controls-mini');
    if (controlsMini) {
      let text = this.services.controls.connected
        ? 'Left stick: move · '+this.controllerButton('space')+': jump / fly up · '+this.controllerButton(p.sportsEquipped?'t':p.superPower.active?'c':'q')+': '+(p.sportsEquipped?'regular shot':p.superPower.active?'fly down':'form')+'\n'+this.controllerButton('j')+': attack · '+this.controllerButton('k')+': special · '+this.controllerButton('e')+': interact · '+this.controllerButton('super')+': Super'
        : 'Arrows / W A D: move · Space: jump / fly up · C: fly down\nQ: form · K: power · J: attack · E: interact · S: Super';
      if (this.progress.data.lebronUnlocked) text += this.services.controls.connected ? '\n'+this.controllerButton('r')+': LeBron · '+this.controllerButton('t')+': regular shot' : '\nR: equip / unequip LeBron James · T: shoot near a basketball hoop';
      if (this.progress.data.curryUnlocked) text += this.services.controls.connected ? '\n'+this.controllerButton('y')+': Curry · '+this.controllerButton('k')+': flaming shot' : '\nY: equip / unequip Steph Curry · T: shoot · K: flaming shot';
      if(this.progress.data.squidwardUnlocked)text+='\nH / '+this.controllerButton('h')+': Handsome Squidward (cosmetic only)';
      if (this.progress.data.viniUnlocked) text += this.services.controls.connected ? '\n'+this.controllerButton('u')+': Vini · '+this.controllerButton('i')+': celebrate' : '\nU: Vini Jr. · T: football · K: super shot · I: celebrate';
      if (controlsMini.textContent !== text) controlsMini.textContent = text;
    }
    set(
      "health",
      "♥".repeat(Math.max(0, p.health)) +
        "♡".repeat(Math.max(0, p.maxHealth - p.health)),
    );
    set("star-count", `★ ${this.progress.storyStars()}/${TOTAL_STARS} · ◆ ${this.progress.data.emeralds.length}/7`);
    const f = HERO_FORMS[p.form];
    const portrait = document.querySelector("#form-portrait");
    if (portrait) {
      portrait.hidden = p.squidwardEquipped || p.superPower.active || p.sportsEquipped;
      const desired =
        p.form === "A"
          ? "./assets/characters/sketch-4840-cutout.png"
          : "./assets/characters/sketch-4841-cutout.png";
      if (portrait.getAttribute("src") !== desired) portrait.src = desired;
      portrait.alt = `The children’s original Form ${p.form} drawing`;
    }
    const hyper = p.hyperPower;
    set("form-name", p.squidwardEquipped ? "HANDSOME SQUIDWARD" : p.viniEquipped ? 'VINI JR.' : p.curryEquipped ? 'STEPH CURRY' : p.lebronEquipped ? 'LEBRON JAMES' : hyper.active ? 'HYPER GOKU' : p.superPower.active ? 'SUPER GOKU' : `${f.name} · ${f.subtitle}`);
    set("form-ability", p.squidwardEquipped ? "Ultimate Rizzler · Cosmetic skin only" : p.viniEquipped ? 'K: super shot · T: football · I: celebrate' : p.sportsEquipped ? 'K: flaming shot · T: basketball' : hyper.active ? 'J: ultimate beam · Enemy immunity' : p.superPower.active ? 'K: Hyper Goku · Enemy immunity' : f.ability);
    document.querySelector('#form-panel .hud-caption').textContent = p.squidwardEquipped ? 'H / '+this.controllerButton('h')+' TO UNEQUIP' : p.sportsEquipped ? `SECRET SKIN · ${p.viniEquipped ? 'U' : p.curryEquipped ? 'Y' : 'R'} TO UNEQUIP` : hyper.active ? 'HYPER POWER · 15 SECONDS' : p.superPower.active ? 'SUPER GOKU · S TO RETURN' : 'YOUR FORM · Q TO SWITCH';
    const remaining = p.sportsEquipped ? Math.max(0, (p.lebronAbilityReady || 0) - now) : p.superPower.active ? (hyper.active ? hyper.remaining : hyper.cooldown) * 1000 : Math.max(0, p.abilityReady - now);
    set(
      "form-ready",
      p.squidwardEquipped ? "NO POWERS" : !p.sportsEquipped && p.superPower.active && hyper.active ? `${Math.ceil(hyper.remaining)}s LEFT` : remaining ? `${(remaining / 1000).toFixed(1)}s` : "READY",
    );
    document.querySelector("#form-cooldown").style.width =
      `${p.squidwardEquipped ? 0 : p.sportsEquipped ? 100 - remaining / 5000 * 100 : p.superPower.active ? hyper.active ? hyper.remaining / 15 * 100 : 100 - hyper.cooldown / 5 * 100 : 100 - Math.min(100, (remaining / f.cooldown) * 100)}%`;
    document.querySelector("#form-panel").style.borderLeftColor =
      hyper.active ? '#26c7ff' : p.sportsEquipped ? '#f7bd27' : `#${f.color.toString(16)}`;
    const ally = s.allies.character;
    set("ally-name", ally ? `${ally.icon} ${ally.name}` : "No allies yet");
    set(
      "ally-ability",
      ally ? `L · ${ally.ability}` : "Your family is waiting!",
    );
    set(
      "ally-ready",
      ally
        ? s.allies.remaining()
          ? `${Math.ceil(s.allies.remaining() / 1000)}s`
          : "READY"
        : "",
    );
    document.querySelector("#ally-cooldown").style.width = ally
      ? `${100 - Math.min(100, (s.allies.remaining() / ally.cooldown) * 100)}%`
      : "0%";
    const b = s.boss;
    document.querySelector("#boss-hud").hidden = !b?.activeFight;
    if (b?.activeFight) {
      set("boss-name", b.name);
      set("boss-warning", b.warning);
      document.querySelector("#boss-health").style.width =
        `${(b.health / b.maxHealth) * 100}%`;
      document.querySelector("#boss-health").style.background =
        b.state === "recovery" ? "#85af5e" : "#a184c1";
    }
    const task = document.querySelector("#final-task");
    task.hidden = !(s.worldData.id === 6 && b?.activeFight);
    if (!task.hidden) {
      const stage = FINAL_STAGES[s.finalStage];
      task.innerHTML = `${s.finalStage + 1}/6 · <b>${stage.title}</b><small>${s.finalStage === 5 && s.finalDash ? "Great dash! Switch to Form B (Q), then K beside the boss." : stage.hint}</small>`;
    }
    if (s.partner) {
      if (!this.services.controls.connected) controlsMini.textContent = TWO_PLAYER_CONTROLS;
      if (coop) coop.textContent = `${s.pvp?.enabled ? 'PvP ON' : 'PvP OFF'} · ${p.downed ? `P1 respawns in ${Math.ceil(p.respawnRemaining || 0)}s · ` : ''}P2: ${s.partner.downed ? `respawns in ${Math.ceil(s.partner.respawnRemaining || 0)}s` : '♥'.repeat(Math.max(0, s.partner.health))}`;
      if(!this.services.controls.connected && this.progress.data.lebronUnlocked)controlsMini.textContent+='\nSkins: R / P2 5 · Shoot: T / P2 6';
      if(!this.services.controls.connected && this.progress.data.curryUnlocked)controlsMini.textContent+=' · Curry: Y / P2 7';
      if(!this.services.controls.connected && this.progress.data.viniUnlocked)controlsMini.textContent+='\nVini: U / P2 8 · Celebrate: I / P2 P · Shoot: T / P2 6';
    }
  }
  tutorial(text) {
    const el = document.querySelector("#tutorial");
    if (el) {
      el.hidden = !text;
      el.textContent = text;
    }
  }
  toast(text, duration = 2600) {
    const el = document.querySelector("#toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove("show"), duration);
  }
  push(html, mode, actions) {
    if (this.mode === "game") {
      this.scene.clearInputs?.();
      if (this.scene.cinematic)
        this.scene.cinemaElement.style.visibility = "hidden";
      this.scene.touchHeld = {};
      this.scene.input.keyboard.resetKeys();
      this.game.scene.pause("Game");
    }
    this.stack.push({
      formState: [...this.root.querySelectorAll('input[id],select[id]')].map(el => ({id:el.id, value:el.value, checked:el.checked})),
      focused: document.activeElement?.id ? {id:document.activeElement.id} : document.activeElement?.dataset.action ? {action:document.activeElement.dataset.action} : null,
      html: this.root.innerHTML,
      mode: this.mode,
      actions: this.actions,
    });
    this.render(html, mode, actions);
  }
  pop() {
    const previous = this.stack.pop();
    if (!previous) return;
    this.render(previous.html, previous.mode, previous.actions);
    for (const state of previous.formState || []) {
      const el = document.getElementById(state.id);
      if (el) { el.value = state.value; if (el.type === 'checkbox') el.checked = state.checked; }
    }
    const restored = previous.focused?.id ? document.getElementById(previous.focused.id) : previous.focused?.action ? this.root.querySelector(`[data-action="${previous.focused.action}"]`) : null;
    restored?.focus({preventScroll:true});
    if (previous.mode === "game") {
      this.scene.clearInputs?.();
      if (this.scene.cinematic)
        this.scene.cinemaElement.style.visibility = "visible";
      this.scene.input.keyboard.resetKeys();
      this.game.scene.resume("Game");
      document.activeElement?.blur();
    }
  }
  back() {
    if (this.stack.length) this.pop();
    else if (this.mode === 'map') this.menu();
    else if (['chaos', 'mayhem-picker', 'replay-picker', 'replay-complete', 'defeat', 'rescue', 'victory'].includes(this.mode)) this.map();
  }
  pause() {
    if (this.mode !== "game") return;
    this.push(
      `<div class="overlay"><div class="dialog"><div class="eyebrow">TAKE A BREATHER</div><h1>Even heroes need snacks.</h1><p>Your adventure is right where you left it.</p><div class="button-row">${button("Keep going →", "resume")}${button("World map", "map", "secondary")}</div><div class="button-row" style="margin-top:20px">${button("Controls", "help", "text-button")}${button("Settings", "settings", "text-button")}</div><small>Options / Circle / Esc to jump back in. Checkpoints save automatically.</small></div></div>`,
      "pause",
      {
        resume: () => this.pop(),
        map: () => this.map(),
        help: () => this.help(),
        settings: () => this.settings(),
        objective: () => {
          this.pop();
          this.scene.adventure?.resetCurrent();
        },
      },
    );
    if(!this.scene.cinematic){
      this.root.querySelector('.dialog .button-row').insertAdjacentHTML('beforeend',button('Characters','skins','secondary'));
      this.actions.skins=()=>{this.pop();this.skinPicker();};
      this.root.querySelector('.dialog .button-row').insertAdjacentHTML('beforeend',button('Choose ally','allies','secondary'));
      this.actions.allies=()=>{this.pop();this.showAllies();};
    }
    if (
      this.scene.adventure &&
      !this.scene.adventure.complete &&
      !this.scene.cinematic
    ) {
      this.root
        .querySelector(".dialog")
        .insertAdjacentHTML(
          "beforeend",
          button("Restart this objective", "objective", "text-button"),
        );
    }
  }
  help() {
    this.push(
      `<div class="overlay"><div class="dialog wide"><div class="eyebrow">THE LITTLE HERO’S HANDBOOK</div><h1>Ready, set… baloney!</h1>${controls}<p><b>Form A</b> runs fast and dashes. <b>Form B</b> jumps high and packs a power pop.<br>When its ring turns <b style="color:#6c974d">pale green</b>, it’s your turn to attack!</p>${button("Got it!", "close")}<small>Hearts refill at rest stones. Falling brings you back. You can always try again.</small></div></div>`,
      "help",
      { close: () => this.pop() },
    );
    if (this.progress.superUnlocked()) this.root.querySelector('.control-grid').insertAdjacentHTML('afterend', '<p><b>Super Goku:</b> invincible and able to fly. K activates Hyper Goku for 15 seconds, then recharges for 5 seconds. Hyper Goku has blue hair, a sharp blue aura, and J fires a gigantic beam that defeats any enemy it hits.</p>');
    if (this.progress.data.lebronUnlocked) this.root.querySelector('.control-grid').insertAdjacentHTML('afterend', '<p><b>LeBron James:</b> R equips or unequips your skin. T / △ shoots a regular basketball in any world; nearby hoops aim for a basket. K fires a flaming basketball: an explosion, 5 seconds of fire damage, 20% slowdown, and a 5-second cooldown.</p>');
    if (this.progress.data.curryUnlocked) this.root.querySelector('.control-grid').insertAdjacentHTML('afterend', '<p><b>Steph Curry:</b> Y equips or unequips your skin. T / △ shoots a regular basketball and K / ○ fires a flaming basketball in any world. P2 uses 7 to equip or unequip Curry, 6 to shoot and 2 for the fire shot.</p>');
    if (this.progress.data.squidwardUnlocked) this.root.querySelector('.control-grid').insertAdjacentHTML('afterend','<p><b>Handsome Squidward:</b> D-pad Left toggles this cosmetic skin (P1 H, P2 O). Walk, jump and interact; no attacks or powers. Unlocked by hitting a Palace of Perfection wall mirror with Hyper Goku’s beam.</p>');
    if (this.progress.data.viniUnlocked) this.root.querySelector('.control-grid').insertAdjacentHTML('afterend','<p><b>Vini Jr.:</b> U toggles your skin. T / △ shoots a regular football in any world and aims at nearby stadium goals. K fires the flaming football with 5 seconds of fire, 20% slowdown and a 5-second cooldown. I / controller D-pad Down celebrates (3-second cooldown). P2 keyboard uses 8, 6, 2 and P.</p>');
    this.root.querySelector('.control-grid').insertAdjacentHTML('afterend',`<p style="white-space:pre-line">${TWO_PLAYER_CONTROLS}</p>`);
    this.root.querySelector('.control-grid').insertAdjacentHTML('afterend','<p><b>PS5 controller:</b> '+controllerHelp(this.progress.data.settings.controllerBindings).replaceAll('\n','<br>')+'<br><b>Two players:</b> choose Two players in Settings, then enter a world. The first connected controller is Player one; the second is Player two. Players respawn after 3 seconds. Friendly fire ignores invincibility; toggle it in Settings. Choose Characters to equip either player.</p>');
  }
  settings() {
    if (this.mode === "settings") return;
    const d = this.progress.data.settings;
    this.push(
      `<div class="overlay"><div class="dialog"><div class="eyebrow">MAKE YOURSELF AT HOME</div><h1>Your kind of adventure.</h1><label class="setting-row"><span>Sound effects</span><input id="setting-sound" type="checkbox" ${d.muted ? "" : "checked"}></label><label class="setting-row"><span>Volume</span><input id="setting-volume" type="range" min="0" max="1" step=".05" value="${d.volume}"></label><label class="setting-row"><span>Adventure style</span><select id="setting-difficulty"><option value="gentle" ${d.difficulty === "gentle" ? "selected" : ""}>Gentle · extra hearts</option><option value="normal" ${d.difficulty === "normal" ? "selected" : ""}>Classic · a little challenge</option></select></label><label class="setting-row"><span>Fewer effects</span><input id="setting-motion" type="checkbox" ${d.reducedMotion ? "checked" : ""}></label><small>Difficulty changes apply when you enter or retry a level.</small>${button("All set!", "save")}<div style="margin-top:20px">${button("Start a fresh adventure", "reset", "text-button danger")}</div></div></div>`,
      "settings",
      {
        save: () => {
          d.muted = !document.querySelector("#setting-sound").checked;
          d.volume = Number(document.querySelector("#setting-volume").value);
          d.difficulty = document.querySelector("#setting-difficulty").value;
          d.players = Number(document.querySelector("#setting-players").value);
          d.pvp = document.querySelector('#setting-pvp').checked;
          if (this.scene.pvp) this.scene.pvp.enabled=d.pvp;
          d.reducedMotion = document.querySelector("#setting-motion").checked;
          this.progress.save();
          if (this.scene.view) this.scene.view.reducedMotion = d.reducedMotion;
          document.documentElement.classList.toggle(
            "reduced-motion",
            d.reducedMotion,
          );
          this.soundButton();
          this.pop();
        },
        reset: () => this.confirmReset(),
        fullscreen: () => this.toggleFullscreen(),
        controller: () => this.controllerRemapping(),
        phone: () => this.services.phoneControllers.open(),
      },
    );
    this.root.querySelector(".dialog h1").insertAdjacentHTML(
      "afterend",
      '<div class="setting-row"><span>Display</span><button class="secondary" data-action="fullscreen" data-fullscreen>Full screen</button></div><div class="setting-row"><span>Controller</span><button class="secondary" data-action="controller">Remap controller buttons</button></div>',
    );
    this.fullscreenButtons();
    this.root
      .querySelector("#setting-motion")
      .closest("label")
      .insertAdjacentHTML(
        "beforebegin",
        '<label class="setting-row"><span>Players (next level / retry)</span><select id="setting-players"><option value="1">One player</option><option value="2">Two players - local co-op</option></select></label><small>First connected controller: P1. Second controller: P2. Shared keyboard also works. Default buttons: × jump, □ attack, ○ special ability, △ form / Goku fly down / sports shot, L2 next ally, R2 summon, R3 interact, L3 + R3 Super, Options pause. See Controls for character buttons.</small>',
      );
    this.root.querySelector('[data-action="controller"]').closest('.setting-row').insertAdjacentHTML('afterend', '<div class="setting-row"><span>Phone or tablet</span><button class="secondary" data-action="phone">Pair phone controller</button></div>');
    this.root.querySelector("#setting-players").value = String(d.players || 1);
    this.root.querySelector('#setting-players').closest('label').insertAdjacentHTML('afterend', `<label class="setting-row"><span>Player vs player damage (multiplayer)</span><input id="setting-pvp" type="checkbox" ${d.pvp !== false ? 'checked' : ''}></label><small>Players respawn after 3 seconds. Player attacks ignore invincibility; enemy attacks still respect it. Turn PvP off to stop friendly fire.</small><p style="white-space:pre-line">${TWO_PLAYER_CONTROLS}</p>`);
  }
  controllerButton(action) {
    return bindingLabel(this.progress.data.settings.controllerBindings[action]).replace(/ \(.*/, '').replace(' together', '');
  }
  controllerRemapping() {
    const bindings = normalizeBindings(this.progress.data.settings.controllerBindings);
    const rows = CONTROLLER_ACTIONS.map(action => {
      const choices = [['none','Not assigned'], ...BUTTON_LABELS.map((label,index) => [String(index),label])];
      if (action.key === 'super') choices.push(['10+11','L3 + R3 together']);
      return '<label class="controller-binding"><span>'+action.label+'</span><select id="controller-'+action.key+'" data-controller-action="'+action.key+'">'+choices.map(([value,label]) => '<option value="'+value+'" '+(bindings[action.key]===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';
    }).join('');
    this.push('<div class="overlay"><div class="dialog wide controller-dialog"><div class="eyebrow">YOUR BUTTONS, YOUR WAY</div><h1>Remap controller buttons</h1><p>Choose a button for each action. These settings apply to both players. The left stick moves your hero.</p><small>Menus always use joystick / D-pad to choose, × to select, ○ to go back, and Options to resume.</small><div class="controller-bindings">'+rows+'</div><p id="controller-conflict" role="alert" hidden></p><div class="button-row controller-actions">'+button('Save buttons','controller-save')+button('Reset defaults','controller-reset','secondary')+button('Cancel','controller-cancel','text-button')+'</div></div></div>', 'controller-remap', {
      'controller-save': () => {
        const draft = this.controllerDraft();
        if (bindingConflicts(draft).length) return;
        this.progress.data.settings.controllerBindings = normalizeBindings(draft);
        this.progress.data.settings.controllerBindingsCustomized = true;
        this.progress.save();
        this.services.controls.clear();
        this.pop();
        this.toast(this.progress.saveError ? 'Buttons changed for this session. Browser storage is unavailable.' : 'Controller buttons saved.');
      },
      'controller-reset': () => {
        for (const action of CONTROLLER_ACTIONS) this.root.querySelector('#controller-'+action.key).value = DEFAULT_BINDINGS[action.key];
        this.controllerBindingStatus();
      },
      'controller-cancel': () => this.pop(),
    });
    this.controllerBindingStatus();
  }
  controllerDraft() {
    return Object.fromEntries(CONTROLLER_ACTIONS.map(action => [action.key,this.root.querySelector('#controller-'+action.key).value]));
  }
  controllerBindingStatus() {
    const conflicts = bindingConflicts(this.controllerDraft());
    const message = this.root.querySelector('#controller-conflict');
    message.textContent = conflicts.length ? conflicts[0]+' Choose different buttons before saving.' : '';
    message.hidden = !conflicts.length;
    this.root.querySelector('[data-action="controller-save"]').disabled = !!conflicts.length;
  }
  confirmReset() {
    this.push(
      `<div class="overlay"><div class="dialog"><h1>A brand-new beginning?</h1><p>This clears your rescues, checkpoints and stars on this browser.</p><div class="button-row">${button("Keep my adventure", "cancel")}${button("Start fresh", "reset", "secondary")}</div></div></div>`,
      "reset",
      {
        cancel: () => this.pop(),
        reset: () => {
          this.progress.reset();
          this.menu();
        },
      },
    );
  }
  showAllies() {
    if (this.mode !== "game") return;
    this.push(
      `<div class="overlay"><div class="dialog wide"><div class="eyebrow">THE BEST TEAM IS FAMILY</div><h1>A helping hand.</h1><div class="ally-list">${CHARACTERS.map((c) => `<button class="ally-choice ${this.scene.allies.selected === c.id ? "selected" : ""}" data-action="${c.id}" ${this.progress.data.rescued.includes(c.id) ? "" : "disabled"}><span class="icon" style="color:${c.color}">${c.icon}</span><span><b>${c.name} ${this.progress.data.rescued.includes(c.id) ? "" : "· rescue to unlock"}</b><small>${c.description} (${c.cooldown / 1000}s)</small></span></button>`).join("")}</div>${button("Back to the adventure", "close", "secondary")}</div></div>`,
      "allies",
      {
        close: () => this.pop(),
        ...Object.fromEntries(
          CHARACTERS.map((c) => [
            c.id,
            () => {
              this.scene.allies.select(c.id);
              this.pop();
            },
          ]),
        ),
      },
    );
  }
  rescue(owner) {
    if (this.scene.replayMode) { this.replayComplete(); return; }
    const c = CHARACTERS.find((c) => c.id === owner);
    this.hud.hidden = true;
    this.render(
      `<div class="overlay"><div class="dialog"><div class="rescue-icon" style="background:${c.color}">${c.icon}</div><div class="eyebrow" style="margin-top:20px">A LEGEND RETURNS · WORLD COMPLETE</div><h1>${c.name} ${owner === "leah" ? "are" : "is"} free!</h1><p>“${c.rescue}”</p><p><b>New ally: ${c.ability}</b><br>${c.description}</p>${button("On with the adventure →", "map")}<small>Every ${c.name} shadow puppet has disappeared. Progress saved!</small></div></div>`,
      "rescue",
      { map: () => this.map() },
    );
  }
  defeat() {
    this.render(
      `<div class="overlay"><div class="dialog"><div class="eyebrow">A LITTLE TUMBLE. NO BIG DEAL.</div><h1>Let’s try that again!</h1><p>Heroes get back up. Your stars and rescues are safe.<br>Start again from your latest checkpoint with full hearts.</p><div class="button-row">${button("Try again ↻", "retry")}${button("World map", "map", "secondary")}</div><small>Press R to retry. Try Gentle adventure in Settings for extra help.</small></div></div>`,
      "defeat",
      { retry: () => this.retry(), map: () => this.map() },
    );
  }
  retry() {
    if (this.scene.mayhemMode) { this.startMayhem(this.scene.replayLoadout); return; }
    if (this.scene.replayMode) { this.startReplay(this.scene.levelId,this.scene.replayLoadout); return; }
    this.start(this.scene.worldData.id, true, this.scene.missionId);
  }
  victory() {
    if (this.scene.replayMode) { this.replayComplete(); return; }
    this.hud.hidden = true;
    this.render(
      `<div class="overlay"><div class="dialog wide"><div class="eyebrow">TONY BALONEY STUDIOS PRESENTS</div><h1>One extraordinary family.</h1><div style="font-size:40px;letter-spacing:14px;color:#849c59">✦ ✿ ◆ ● ✦</div><p>The puppets are free. Your allies are together.<br>And somewhere, someone definitely needs a clean nappy.</p><p><b>You did it, hero!</b> Every legend played a part.<br>The Big Boss’s identity and story await the creative directors.</p><div class="button-row">${button("Back to our worlds →", "map")}${button("Main menu", "menu", "secondary")}</div><small>Created for a dad and his two brilliant creative directors.<br>${this.progress.data.stars} stars collected · ${Math.round(this.progress.data.playSeconds / 60)} minutes adventuring · Adventure saved</small></div></div>`,
      "victory",
      { map: () => this.map(), menu: () => this.menu() },
    );
  }
}
