import test from "node:test";
import assert from "node:assert/strict";
import { VoicePlayer } from "../src/systems/Voice.js";
import { ALL_VOICE_CUES, CINEMATICS, VOICE_ROLES, cinematicFor } from "../src/data/cinematics.js";

const flush = () => new Promise((resolve) => setImmediate(resolve));
function fixture(clips = { one: "one.wav", two: "two.ogg" }, fetcher) {
  const media = [];
  class FakeAudio {
    constructor(src) { this.src = src; this.plays = 0; this.pauses = 0; media.push(this); }
    play() { this.plays++; return Promise.resolve(); }
    pause() { this.pauses++; }
    removeAttribute(name) { if (name === "src") this.src = ""; }
    load() {}
  }
  const progress = { data: { settings: { muted: false, volume: 0.25 } } };
  const player = new VoicePlayer(progress, { AudioClass: FakeAudio, base: "/", fetcher: fetcher || (async () => ({ ok: true, json: async () => ({ clips }) })) });
  return { player, progress, media };
}
test("every campaign phase has a script and every recording has a unique, safe cue ID", () => {
  assert.equal(CINEMATICS.length, 42);
  assert.equal(new Set(ALL_VOICE_CUES.map((c) => c.id)).size, ALL_VOICE_CUES.length);
  for (const cue of ALL_VOICE_CUES) {
    assert.match(cue.id, /^[a-z0-9-]+$/);
    assert.ok(VOICE_ROLES[cue.speaker]);
    assert.ok(cue.text && cue.delivery && cue.trigger);
  }
  for (let level = 1; level <= 5; level++)
    for (const phase of ["intro", "message", "quest", "rescue", "return"]) assert.ok(cinematicFor(level, phase)?.beats.length);
  for (const phase of ["intro", "quest", "ending"]) assert.ok(cinematicFor(6, phase)?.beats.length);
});
test("unrecorded lines never request a missing audio file", async () => {
  const f = fixture({});
  const clip = f.player.play("unrecorded");
  await f.player.ready; await flush();
  assert.equal(clip.state, "missing");
  assert.equal(f.media.length, 0);
});
test("advancing cancels old speech and ignores stale ended callbacks", async () => {
  const f = fixture();
  f.player.play("one"); await f.player.ready; await flush();
  const staleEnd = f.media[0].onended;
  const next = f.player.play("two"); await flush();
  staleEnd();
  assert.equal(f.media[0].pauses, 1);
  assert.equal(next.state, "playing");
  assert.equal(f.player.current.id, "two");
});
test("skip during manifest loading cannot start delayed speech", async () => {
  let resolve;
  const f = fixture({}, () => new Promise((r) => { resolve = r; }));
  f.player.play("one"); await flush();
  f.player.stop();
  resolve({ ok: true, json: async () => ({ clips: { one: "one.wav" } }) });
  await f.player.ready; await flush();
  assert.equal(f.media.length, 0);
  assert.equal(f.player.current, null);
});
test("pause before loading waits for resume, and mute and volume apply to the live take", async () => {
  const f = fixture();
  const clip = f.player.play("one"); f.player.pause();
  await f.player.ready; await flush();
  assert.equal(clip.state, "paused");
  assert.equal(f.media[0].plays, 0);
  f.player.resume(); await flush();
  assert.equal(clip.state, "playing");
  f.progress.data.settings.muted = true;
  f.progress.data.settings.volume = 0.7;
  f.player.sync();
  assert.equal(f.media[0].muted, true);
  assert.equal(f.media[0].volume, 0.7);
  f.player.pause();
  assert.equal(clip.state, "paused");
});
test("gameplay soundbites cannot interrupt a story line", async () => {
  const f = fixture();
  f.player.play("one", 10); await f.player.ready; await flush();
  assert.equal(f.player.play("two", 0), null);
  assert.equal(f.media.length, 1);
  assert.equal(f.player.current.id, "one");
});
test("browser playback rejection degrades to captions", async () => {
  const f = fixture(); await f.player.ready;
  f.player.AudioClass.prototype.play = () => Promise.reject(new Error("Autoplay denied"));
  const clip = f.player.play("one"); await flush();
  assert.equal(clip.state, "blocked");
});
test("an invalid or unavailable manifest cannot introduce remote audio paths", async () => {
  const f = fixture({ one: "https://example.com/a.wav", two: "../two.wav" });
  await f.player.ready;
  assert.deepEqual(f.player.clips, {});
  const offline = fixture({}, async () => { throw new Error("Offline"); });
  const clip = offline.player.play("one"); await offline.player.ready; await flush();
  assert.equal(clip.state, "missing");
});
