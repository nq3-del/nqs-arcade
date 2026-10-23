import { cinematicFor, CUE_BY_ID, VOICE_ROLES } from "../data/cinematics.js";
import { VoicePlayer } from "../systems/Voice.js";
import "./cinematics.css";

const escape = (text = "") => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const readingTime = (text) => Math.max(2.6, text.split(/\s+/).length / 2.5 + 0.8);

export class CinemaDirector {
  constructor(scene) {
    this.scene = scene;
    this.voice = scene.services.voice ||= new VoicePlayer(scene.services.progress);
    this.voice.paused = false;
    this.auto = true;
    this.lastBark = -Infinity;
    this.barkTimes = new Map();
    this.element = document.createElement("div");
    this.element.className = "cinema directed-cinema";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-label", "Story scene");
    document.querySelector("#game-shell").appendChild(this.element);
    scene.cinemaElement = this.element;
    this.onPause = () => this.voice.pause();
    this.onResume = () => this.voice.resume();
    // Phaser captures Space, so native button activation is not reliable. Handle
    // it before the game input manager and suppress the browser's second click.
    this.onStorySpace = (event) => {
      if (event.code !== "Space" || !scene.cinematic || scene.services.ui.mode !== "game" || !scene.scene.isActive()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type !== "keydown" || event.repeat) return;
      const focused = document.activeElement;
      if (focused?.tagName === "BUTTON") focused.click();
      else this.next();
    };
    window.addEventListener("keydown", this.onStorySpace, true);
    window.addEventListener("keyup", this.onStorySpace, true);
    scene.events.on("pause", this.onPause);
    scene.events.on("resume", this.onResume);
    scene.events.once("shutdown", () => this.destroy());
  }
  play(lines, done = () => {}, kind = "intro") {
    if (this.scene.cinematic) this.close(false);
    const s = this.scene;
    const returning = kind === "intro" && s.levelId > 0 && s.levelId < 6 && !s.services.progress.armyAlive(s.worldData.owner);
    const story = cinematicFor(s.levelId, returning ? "return" : kind, s.adventure?.step);
    const beats = story?.beats || lines.map((text, i) => ({ id: `caption-${i}`, speaker: "narrator", text, shot: "wide" }));
    s.cinematic = { story, beats, lines: beats.map((b) => b.text), index: 0, kind, done, started: s.time.now, entered: s.time.now, elapsed: 0 };
    this.stage(story, beats);
    s.services.ui.hud.hidden = true;
    document.querySelector("#toast")?.classList.remove("show");
    document.querySelectorAll(".quest-number").forEach((el) => { el.hidden = true; });
    s.clearInputs();
    this.element.style.visibility = "visible";
    this.element.classList.add("active");
    this.element.setAttribute("aria-label", story?.title || "Story scene");
    this.showBeat();
  }
  stage(story, beats) {
    const s = this.scene;
    const roots = [...(s.players || [s.player]).flatMap((p) => [p.actor.root, p.ring]), s.captive?.root, s.cage, s.boss?.actor?.root,
      ...(s.victoryCast || []).map((a) => a.root),
      ...s.enemies.map((e) => e.actor?.root), ...s.summons.map((a) => a.actor.root)].filter(Boolean);
    this.hiddenActors = roots.map((root) => ({ root, visible: root.visible }));
    this.hiddenActors.forEach(({ root }) => { root.visible = false; });
    // Temporary stage puppets never move the hero's physical position or change their form.
    this.cast = new Map();
    const at = s.cinematic.kind === 'intro' ? s.definition.start : (s.cinematic.kind === 'event' ? [s.storyFocus?.x ?? s.player.x,s.storyFocus?.z ?? s.player.z] : s.definition.boss || [3,-1]);
    this.center = {x:at[0],z:at[1]};
    const roles = [...new Set(["hero_a", "hero_b", ...beats.map((b) => b.speaker), ...beats.map((b) => b.shot),...s.summons.map(a=>a.actor.kind)])];
    const familyPositions = { grandad: [-2, -3], nana: [0, -4], mummy: [2, -4.5], leah: [4, -4], daddy: [6, -3] };
    const ensemble = s.levelId === 6;
    for (const role of roles) {
      const data = VOICE_ROLES[role];
      const model = role === "boss" ? s.worldData.owner || "bigboss" : data?.model;
      if (!model) continue;
      const key = role === "ayla" ? "leah" : role;
      if (this.cast.has(key)) continue;
      const actor = s.view.character(model, role === "boss");
      const hero = key.startsWith("hero_");
      const at = hero ? [2, 0.5] : key === "bigboss" || key === "boss" ? [7.5, -5] : ensemble ? familyPositions[key] || [5, -3] : [5, -3];
      const x = this.center.x + at[0] - 2, z = this.center.z + at[1] - .5;
      actor.root.position.set(x, 0.32, z);
      actor.root.rotation.y = hero ? 0.55 : -0.25;
      this.cast.set(key, { actor, x, z, hero });
    }
    this.heroForm = s.player.form === "B" ? "hero_b" : "hero_a";
    if (s.levelId > 0 && s.levelId < 6 && (s.services.progress.armyAlive(s.worldData.owner)||s.cinematic.kind==='rescue')) {
      this.stageCage = s.view.makePortal(this.center.x+3, this.center.z-3.5);
      this.stageCage.scale.setScalar(0.65);
    }
    this.gestureTime = 0;
    this.cageOpened=false;
    if(s.levelId>0){
      this.gadget=s.view.projectile(({1:'star',2:'bubble',3:'potion',4:'nappy',5:'ball'})[s.levelId]||'star',this.center.x+3,this.center.z-2);
    }
  }
  showBeat() {
    const s = this.scene, c = s.cinematic;
    if (!c) return;
    const b = c.beats[c.index], role = VOICE_ROLES[b.speaker] || VOICE_ROLES.narrator;
    c.elapsed = 0;
    c.voiceEndedAt = null;
    c.started = s.time.now;
    const oldForm=this.heroForm;
    if (b.speaker.startsWith("hero_")) this.heroForm = b.speaker;
    else if (b.shot?.startsWith("hero_")) this.heroForm = b.shot;
    if(oldForm!==this.heroForm&&!s.view.reducedMotion)s.view.effect(this.center.x,this.center.z,'#e5d5ad',20);
    this.clip = this.voice.play(b.id);
    this.gestureTime = 0;
    this.element.style.setProperty("--speaker-color", role.color);
    this.element.innerHTML = `<div class="cinema-top"><span>TONY BALONEY STUDIOS</span><div class="cinema-tools"><button data-cinema="auto" aria-pressed="${this.auto}">${this.auto ? "Ⅱ Read at my pace" : "▶ Play scene"}</button><button data-cinema="skip">Skip scene ↗</button></div></div><div class="cinema-chapter"><span>${escape(s.definition.chapter)} · ${escape(c.kind === "message" ? "A FAMILY MESSAGE" : c.kind === "rescue" ? "TOGETHER AGAIN" : "THE FAMILY STORY")}</span><h2>${escape(c.story?.title || s.definition.name)}</h2></div><div class="cinema-caption"><div class="cinema-speaker"><i></i>${escape(role.name)}</div><p aria-live="polite" aria-atomic="true">${escape(b.text)}</p><div class="cinema-navigation"><button class="cinema-minor" data-cinema="back" ${c.index === 0 ? "disabled" : ""} aria-label="Previous line">←</button><button class="cinema-minor" data-cinema="replay" aria-label="Replay this line">↺</button><span class="cinema-page">${String(c.index + 1).padStart(2, "0")} / ${String(c.beats.length).padStart(2, "0")}</span><button data-cinema="next">${c.index === c.beats.length - 1 ? "Continue" : "Next"} <span>→</span><small>E / SPACE</small></button></div><div class="cinema-timeline" aria-hidden="true"><i></i></div></div>`;
    this.element.querySelector('[data-cinema="next"]').onclick = () => this.next();
    this.element.querySelector('[data-cinema="skip"]').onclick = () => this.close();
    this.element.querySelector('[data-cinema="back"]').onclick = () => { if (c.index > 0) { c.index--; this.showBeat(); } };
    this.element.querySelector('[data-cinema="replay"]').onclick = () => this.showBeat();
    this.element.querySelector('[data-cinema="auto"]').onclick = () => { this.auto = !this.auto; this.showBeat(); };
    this.element.querySelector('[data-cinema="next"]').focus({ preventScroll: true });
    if (!s.view.reducedMotion && ["cheer", "wonder"].includes(b.gesture)) {
      const target = this.cast.get(b.speaker === "ayla" ? "leah" : b.speaker);
      if (target) s.view.effect(target.x, target.z, role.color, b.gesture === "cheer" ? 12 : 6);
    }
    s.clearInputs();
  }
  next() {
    const c = this.scene.cinematic;
    if (!c) return;
    if (c.index < c.beats.length - 1) { c.index++; this.showBeat(); }
    else this.close();
  }
  tick(dt) {
    this.voice.sync();
    const c = this.scene.cinematic;
    if (!c) return;
    c.elapsed += dt;
    this.gestureTime += dt;
    this.hiddenActors?.forEach(({ root }) => { root.visible = false; });
    const b = c.beats[c.index], motion = !this.scene.view.reducedMotion;
    const age=(this.scene.time.now-c.entered)/1000;
    if(this.stageCage&&c.kind==='rescue'){
      this.stageCage.scale.setScalar(.65*(1-Math.min(1,age/1.6)));
      if(age>1.1&&!this.cageOpened){this.cageOpened=true;this.scene.view.effect(this.center.x+3,this.center.z-3.5,'#e9d7aa',45);}
    }
    if(this.gadget){const t=motion?this.gestureTime:0;this.gadget.position.set(this.center.x+3+Math.sin(t)*1.3,1.1+Math.abs(Math.sin(t*1.8))*1.6,this.center.z-2);this.gadget.rotation.z=t;}
    for (const [key, item] of this.cast) {
      const active = key === (b.speaker === "ayla" ? "leah" : b.speaker);
      const t = motion ? this.gestureTime : 0;
      item.actor.root.visible = !item.hero || key === this.heroForm;
      item.actor.root.position.set(item.x, 0.32 + (motion ? Math.sin(t * 2) * 0.018 : 0) + (active && motion && b.gesture === "cheer" ? Math.abs(Math.sin(t * 4)) * 0.14 : 0), item.z);
      if(motion&&item.hero&&c.kind==='intro'){
        item.actor.root.position.x-=Math.max(0,2-age*1.2);
        if(age<1.7)item.actor.root.position.y+=Math.abs(Math.sin(age*11))*.09;
      }
      if(motion&&!item.hero&&c.kind==='rescue'&&!['boss','bigboss'].includes(key))item.actor.root.position.x-=Math.min(1.2,Math.max(0,age-1.6)*.35);
      item.actor.rig?.arms.forEach((arm,i)=>{arm.rotation.z=motion?Math.sin(t*3+i)*.045:0;});
      item.actor.rig?.stalks.forEach((stalk,i)=>{stalk.rotation.z=motion?Math.sin(t*2+i)*.018:0;});
      item.actor.body.rotation.z = active && motion ? Math.sin(t * 4) * 0.045 : 0;
      item.actor.body.rotation.x = active && motion && b.gesture === "bow" ? Math.sin(Math.min(t, 1.1) / 1.1 * Math.PI) * 0.22 : 0;
    }
    const length = readingTime(b.text);
    const progress = this.element.querySelector(".cinema-timeline i");
    const duration = this.clip?.media?.duration;
    const fraction = Number.isFinite(duration) && duration > 0 ? this.clip.media.currentTime / duration : c.elapsed / length;
    if (progress) progress.style.transform = `scaleX(${Math.min(1, fraction)})`;
    if (!this.auto) return;
    const state = this.clip?.state;
    if (state === "ended") {
      c.voiceEndedAt ??= c.elapsed;
      if (c.elapsed - c.voiceEndedAt > 0.5) this.next();
    } else if (["missing", "error", "blocked", "stopped"].includes(state) && c.elapsed >= length) this.next();
    else if (state === "loading" && c.elapsed > Math.max(10, length)) {
      this.voice.stop();
      this.next();
    }
  }
  camera() {
    const s = this.scene, c = s.cinematic;
    if (!c) return null;
    const b = c.beats[c.index];
    const target = this.cast.get(b.shot === "ayla" ? "leah" : b.shot);
    const drift = s.view.reducedMotion ? 0 : Math.min(c.elapsed / readingTime(b.text), 1);
    if (b.shot === "portal") return { look: [this.center.x+3, 1, this.center.z-3.5], zoom: 1.6 + drift * 0.15 };
    if (!target) return { look: [this.center.x+.3+drift*.8, 1, this.center.z-2.8], zoom: (s.levelId === 6 ? 1.15 : 1.35) + drift * 0.16,offset:[18,23,26] };
    return { look: [target.x - 0.6 + drift * 0.7, 1.1, target.z], zoom: 2.15 + drift * 0.25,offset:s.view.reducedMotion?[18,23,26]:c.index%2?[14,17,28]:[21,18,23] };
  }
  close(complete = true) {
    const s = this.scene, c = s.cinematic;
    if (!c) return;
    s.cinematic = null;
    this.voice.stop();
    this.cast?.forEach(({ actor }) => s.view.remove(actor));
    this.cast?.clear();
    if (this.stageCage) s.view.remove(this.stageCage);
    if (this.gadget) s.view.remove(this.gadget);
    this.gadget=null;
    this.stageCage = null;
    this.hiddenActors?.forEach(({ root, visible }) => { root.visible = visible; });
    this.hiddenActors = [];
    // Absolute combat deadlines must not expire while the player is watching.
    const delay = s.time.now - c.entered;
    for (const object of [...(s.players || [s.player]), s.boss, ...s.enemies, ...s.projectiles, ...s.slimes, ...s.summons].filter(Boolean))
      for (const key of ["abilityReady", "attackReady", "invulnerableUntil", "dashUntil", "glamourUntil", "glamourVisualUntil", "pvpGlamourUntil", "kindnessUntil", "knockUntil", "swingUntil", "friendlyUntil", "poseUntil", "nextAttack", "stateUntil", "nextDamage", "expires", "until"])
        if (Number.isFinite(object[key]) && object[key] > c.entered) object[key] += delay;
    for (const player of s.players || [s.player]) {
      const ready = player.allies?.readyAt || s.allies.readyAt;
      for (const id of Object.keys(ready)) if (ready[id] > c.entered) ready[id] += delay;
    }
    this.element.classList.remove("active");
    this.element.innerHTML = "";
    s.services.ui.hud.hidden = false;
    s.clearInputs();
    document.activeElement?.blur?.();
    if (complete) c.done();
  }
  bark(id, { important = false } = {}) {
    const s = this.scene, cue = CUE_BY_ID[id];
    if (!cue || s.cinematic) return;
    if (!important && (s.time.now - this.lastBark < 4500 || s.time.now - (this.barkTimes.get(id) ?? -Infinity) < 18000)) return;
    this.lastBark = s.time.now;
    this.barkTimes.set(id, s.time.now);
    this.voice.play(id, important ? 5 : 0);
    if (important) s.services.ui.toast(`${VOICE_ROLES[cue.speaker].name}: ${cue.text}`, 4200);
  }
  destroy() {
    this.close(false);
    this.voice.stop();
    this.voice.paused = false;
    this.scene.events.off("pause", this.onPause);
    this.scene.events.off("resume", this.onResume);
    window.removeEventListener("keydown", this.onStorySpace, true);
    window.removeEventListener("keyup", this.onStorySpace, true);
    this.element.remove();
  }
}
