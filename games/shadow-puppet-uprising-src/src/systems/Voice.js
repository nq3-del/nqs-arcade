// Only indexed recordings are requested. An unrecorded game stays quiet without
// hundreds of missing-file requests. Run scripts/build-recording-pack.mjs to index takes.
export class VoicePlayer {
  constructor(progress, { AudioClass = globalThis.Audio, fetcher = globalThis.fetch, base = import.meta.env?.BASE_URL || "./" } = {}) {
    this.progress = progress;
    this.AudioClass = AudioClass;
    this.base = base;
    this.clips = {};
    this.serial = 0;
    this.current = null;
    this.ready = Promise.resolve().then(async () => {
      try {
        const response = await fetcher(`${base}audio/voice/manifest.json`);
        if (response.ok) {
          const data = await response.json();
          for (const [id, file] of Object.entries(data.clips || {}))
            if (/^[a-z0-9-]+$/.test(id) && /^[a-z0-9-]+\.(wav|mp3|ogg|m4a)$/.test(file)) this.clips[id] = file;
        }
      } catch { /* Captions work offline or with an unavailable audio manifest. */ }
    });
  }
  play(id, priority = 10) {
    if (this.current && this.current.priority > priority && ["loading", "playing", "paused"].includes(this.current.state)) return null;
    this.stop();
    const clip = { id, priority, state: "loading", media: null };
    this.current = clip;
    const serial = this.serial;
    this.ready.then(() => {
      if (serial !== this.serial) return;
      const file = this.clips[id];
      if (!file || !this.AudioClass) { clip.state = "missing"; return; }
      try {
        const media = new this.AudioClass(`${this.base}audio/voice/${file}`);
        clip.media = media;
        media.preload = "auto";
        media.onended = () => { if (serial === this.serial) clip.state = "ended"; };
        media.onerror = () => { if (serial === this.serial) clip.state = "error"; };
        this.sync();
        if (this.paused) { clip.state = "paused"; return; }
        this.start(clip, serial);
      } catch { clip.state = "error"; }
    });
    return clip;
  }
  start(clip, serial = this.serial) {
    clip.state = "loading";
    try {
      Promise.resolve(clip.media.play()).then(() => {
        if (serial !== this.serial) return;
        if (this.paused) { clip.media.pause(); clip.state = "paused"; }
        else if (clip.state === "loading") clip.state = "playing";
      }).catch(() => { if (serial === this.serial) clip.state = "blocked"; });
    } catch { clip.state = "blocked"; }
  }
  sync() {
    const media = this.current?.media;
    if (!media) return;
    const settings = this.progress.data.settings;
    media.muted = settings.muted;
    media.volume = Math.max(0, Math.min(1, settings.volume));
  }
  pause() {
    this.paused = true;
    const c = this.current;
    if (c?.media && ["playing", "loading"].includes(c.state)) { c.media.pause(); c.state = "paused"; }
  }
  resume() {
    this.paused = false;
    if (this.current?.state === "paused" && this.current.media) this.start(this.current);
  }
  stop() {
    this.serial++;
    if (this.current?.media) {
      const media = this.current.media;
      media.onended = media.onerror = null;
      media.pause();
      media.removeAttribute?.("src");
      media.load?.();
    }
    if (this.current) this.current.state = "stopped";
    this.current = null;
  }
}
