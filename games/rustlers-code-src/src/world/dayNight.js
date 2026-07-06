// Day and night. The valley now runs a real clock: a full day passes in
// about 8 minutes, easing through a golden sunset and back. The STORY can
// still seize the sky — Chapter 1's bank job and the gala force night, and
// hand the clock back at dawn. One blend value (0 day → 1 night, sunset at
// 0.5) drives the sun, sky dome, fog, lamps and windows together.

import * as THREE from 'three';

// Sized so morning-to-nightfall is about 3 real minutes (owner's spec) —
// roughly 2 minutes of prowler-filled night, ~5¾ minutes per full cycle.
const DAY_LENGTH_SECONDS = 345;

// Three stops: day fades through a golden sunset before night arrives
// (and back through it at dawn).
const DAY = {
  sky: new THREE.Color(0xcfe0e0), // matches the sky dome's horizon
  sun: new THREE.Color(0xfff2d9),
  sunIntensity: 2.3,
  fillIntensity: 1.05,
};
const DUSK = {
  sky: new THREE.Color(0xe8a868), // the whole valley goes golden
  sun: new THREE.Color(0xff9448),
  sunIntensity: 1.5,
  fillIntensity: 0.6,
};
const NIGHT = {
  sky: new THREE.Color(0x2a3550),
  sun: new THREE.Color(0x8ba3d9), // moonlight
  sunIntensity: 0.35,
  fillIntensity: 0.22,
};

// Piecewise: 0..0.5 crosses day→dusk, 0.5..1 crosses dusk→night.
function stops(blend) {
  return blend < 0.5
    ? { a: DAY, b: DUSK, t: blend * 2 }
    : { a: DUSK, b: NIGHT, t: (blend - 0.5) * 2 };
}

// Where should the blend sit at a given hour? Broad daylight 7–17,
// evening slide 17–20, deep night 20–5, dawn slide 5–7.
function blendForHour(h) {
  if (h >= 7 && h < 17) return 0;
  if (h >= 17 && h < 20) return (h - 17) / 3;
  if (h >= 20 || h < 5) return 1;
  return 1 - (h - 5) / 2; // 5–7, sunrise
}

export function createDayNight(scene, sun, skyFill) {
  return {
    blend: 0,        // 0 = full day, 1 = full night (0.5 = golden hour)
    target: 0,
    hour: 9,         // the valley wakes at nine, like a sensible valley
    mode: 'cycle',   // 'cycle' = clock runs | 'story' = a chapter owns the sky
    isNight: false,
    sky: null,       // the gradient dome, attached by main.js
    lampGlows: [],   // lamp + window sprites that wake up after dark

    // Chapters call this. true = seize the sky and hold night;
    // false = hand back the clock at first light.
    setNight(night) {
      if (night) {
        this.mode = 'story';
        this.target = 1;
        this.isNight = true;
      } else {
        this.mode = 'cycle';
        this.hour = 7.5; // dawn breaks, the clock takes over again
        this.isNight = false;
      }
    },

    applyBlend() {
      const { a, b, t } = stops(this.blend);
      scene.background.lerpColors(a.sky, b.sky, t);
      scene.fog.color.copy(scene.background);
      sun.color.lerpColors(a.sun, b.sun, t);
      sun.intensity = a.sunIntensity + (b.sunIntensity - a.sunIntensity) * t;
      skyFill.intensity = a.fillIntensity + (b.fillIntensity - a.fillIntensity) * t;
      if (this.sky) this.sky.setBlend(this.blend);
      for (const glow of this.lampGlows) {
        glow.material.opacity = this.blend * (glow.userData.strength ?? 0.85);
      }
    },

    update(dt) {
      if (this.mode === 'cycle') {
        this.hour = (this.hour + (dt * 24) / DAY_LENGTH_SECONDS) % 24;
        this.target = blendForHour(this.hour);
        this.isNight = this.target > 0.6;
      }
      if (Math.abs(this.blend - this.target) < 0.001) return;
      this.blend += (this.target - this.blend) * Math.min(1, dt * 0.8);
      this.applyBlend();
    },
  };
}
