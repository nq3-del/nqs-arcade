// Every sound in the game, synthesized live by the browser's own audio
// engine (WebAudio) — no sound files, no downloads, nothing to licence.
// One master volume with a mute toggle (players under 15 are often in
// shared rooms; the mute button lives on the HUD as a courtesy).

import { on } from './events.js';
import { gameState } from './gameState.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let hoofTimer = 0;
  let cricketTimer = 0;
  let watchTimer = 0;
  let musicStep = 0;
  let musicTimer = 0;

  // ---- tiny synth helpers ----
  function tone(freq, dur, { end = freq, type = 'triangle', gain = 0.15, delay = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise(dur, { filter = 1200, gain = 0.2, delay = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = filter;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(band).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // ---- the sounds themselves ----
  const sfx = {
    shot() { noise(0.13, { filter: 2400, gain: 0.4 }); tone(170, 0.09, { end: 55, type: 'square', gain: 0.2 }); },
    ricochet() { tone(1500, 0.45, { end: 280, type: 'sine', gain: 0.13, delay: 0.05 }); },
    denied() { tone(220, 0.09, { end: 180, type: 'triangle', gain: 0.08 }); },
    whistle() { tone(880, 0.16, { end: 1420, type: 'sine', gain: 0.16 }); tone(1420, 0.2, { end: 1100, type: 'sine', gain: 0.14, delay: 0.17 }); },
    lasso() { noise(0.32, { filter: 650, gain: 0.22 }); },
    blip() { tone(620, 0.05, { type: 'square', gain: 0.05 }); },
    tick() { tone(880, 0.07, { gain: 0.09 }); },
    jingle() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { gain: 0.12, delay: i * 0.11 })); },
    codeUp() { tone(660, 0.22, { end: 880, gain: 0.1 }); },
    codeDown() { tone(440, 0.28, { end: 320, gain: 0.1 }); },
    coin() { tone(1568, 0.09, { type: 'square', gain: 0.07 }); tone(2093, 0.08, { type: 'square', gain: 0.06, delay: 0.07 }); },
    paper() { noise(0.16, { filter: 3200, gain: 0.12 }); },
    hoof() { noise(0.06, { filter: 260, gain: 0.28 }); tone(85, 0.05, { gain: 0.12 }); },
    cricket(delay) { for (let i = 0; i < 3; i++) tone(4200, 0.03, { gain: 0.02, delay: delay + i * 0.07 }); },
    bell() {
      // A proper church bong: fundamental plus two soft overtones.
      tone(330, 1.6, { type: 'sine', gain: 0.22 });
      tone(660, 1.1, { type: 'sine', gain: 0.08 });
      tone(988, 0.6, { type: 'sine', gain: 0.04 });
    },
    watchTick() { tone(1250, 0.025, { type: 'square', gain: 0.03 }); },
    cluck() {
      tone(940, 0.06, { end: 620, type: 'square', gain: 0.06 });
      tone(860, 0.05, { end: 580, type: 'square', gain: 0.05, delay: 0.09 });
    },
    rattle() {
      noise(0.14, { filter: 2600, gain: 0.1 });
      tone(180, 0.1, { end: 140, type: 'square', gain: 0.05, delay: 0.04 });
    },
    pop() {
      // A spring letting go: boing up, cogs everywhere.
      tone(160, 0.35, { end: 640, type: 'square', gain: 0.14 });
      noise(0.28, { filter: 3200, gain: 0.16, delay: 0.08 });
    },
    jump() {
      tone(240, 0.12, { end: 420, type: 'triangle', gain: 0.08 });
      noise(0.07, { filter: 400, gain: 0.1, delay: 0.02 });
    },
  };

  // ---- the music: a slow, warm pentatonic loop, barely there ----
  const MELODY = [440, 0, 392, 440, 523, 0, 440, 0, 330, 0, 392, 330, 262, 0, 330, 0];
  const BASS = [220, 196, 165, 220];
  const STEP_TIME = 0.62;

  function musicNote() {
    const note = MELODY[musicStep % MELODY.length];
    if (note) tone(note, 0.55, { type: 'triangle', gain: 0.045 });
    if (musicStep % 4 === 0) {
      tone(BASS[(musicStep / 4) % BASS.length], 1.6, { type: 'sine', gain: 0.05 });
    }
    musicStep += 1;
  }

  // The audio engine may only start after the player has clicked or typed —
  // browser rule. init() is called from the menu's start button.
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.value = gameState.settings.muted ? 0 : 1;

    // One second of white noise, reused by every noise-based sound.
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // The wind: a constant, very quiet whisper under everything.
    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuffer;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 350;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.035;
    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start();
  }

  // ---- react to the game's own announcements ----
  on('audio:shot', sfx.shot);
  on('audio:bell', sfx.bell);
  on('audio:cluck', sfx.cluck);
  on('audio:rattle', sfx.rattle);
  on('audio:pop', sfx.pop);
  on('audio:jump', sfx.jump);
  on('audio:ricochet', sfx.ricochet);
  on('audio:denied', sfx.denied);
  on('audio:lasso', sfx.lasso);
  on('biscuit:whistled', sfx.whistle);
  on('dialogue:line', sfx.blip);
  on('quest:step', sfx.tick);
  on('quest:completed', sfx.jingle);
  on('poster:collected', sfx.paper);
  on('money:changed', sfx.coin);
  on('code:changed', ({ delta }) => (delta > 0 ? sfx.codeUp() : sfx.codeDown()));

  return {
    init,
    isMuted: () => gameState.settings.muted,
    toggleMuted() {
      gameState.settings.muted = !gameState.settings.muted;
      if (master) master.gain.value = gameState.settings.muted ? 0 : 1;
      return gameState.settings.muted;
    },
    applyMuteFromSave() {
      if (master) master.gain.value = gameState.settings.muted ? 0 : 1;
    },

    // Called every frame: hoofbeats while riding, crickets after dark,
    // and the music's step clock.
    update(dt, { riding, nightBlend, slowmo }) {
      if (!ctx) return;
      if (riding) {
        hoofTimer -= dt;
        if (hoofTimer <= 0) {
          hoofTimer = 0.27;
          sfx.hoof();
        }
      }
      // Doc's watch ticks steadily while the world runs slow.
      if (slowmo) {
        watchTimer -= dt;
        if (watchTimer <= 0) {
          watchTimer = 0.5;
          sfx.watchTick();
        }
      }
      if (nightBlend > 0.6) {
        cricketTimer -= dt;
        if (cricketTimer <= 0) {
          cricketTimer = 1.6 + Math.random() * 2.4;
          sfx.cricket(0);
        }
      }
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = STEP_TIME;
        musicNote();
      }
    },
  };
}
