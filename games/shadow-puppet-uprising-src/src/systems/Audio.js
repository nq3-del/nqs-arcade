export class AudioSystem {
  constructor(progress) {
    this.progress = progress;
  }
  unlock() {
    try {
      this.context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") this.context.resume();
    } catch {
      /* Silent play is supported. */
    }
  }
  play(name) {
    if (this.progress.data.settings.muted || !this.context) return;
    const sounds = {
      jump: [330, 660, 0.12],
      switch: [520, 900, 0.18],
      star: [880, 1400, 0.1],
      hit: [220, 110, 0.12],
      pop: [440, 180, 0.13],
      ally: [390, 1000, 0.3],
      win: [523, 1046, 0.65],
      hurt: [180, 100, 0.2],
      dash: [180, 750, 0.16],
      beam: [110, 40, 0.5],
    };
    const [from, to, duration] = sounds[name] || sounds.pop;
    try {
      const t = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + duration);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(
        this.progress.data.settings.volume * 0.22,
        t + 0.015,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch {
      /* No audio device does not prevent play. */
    }
  }
}
