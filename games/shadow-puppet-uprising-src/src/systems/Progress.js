import { normalizeBindings, loadControllerBindings } from './ControllerBindings.js';
import { ALLY_IDS } from "../data/config.js";
import { CHAOS_EMERALDS, STAGE_STARS, TOTAL_STARS, stageStarCount } from '../data/chaos.js';
export const SAVE_KEY = "tony-baloney-shadow-uprising-v1";
export function freshSave() {
  return {
    version: 1,
    origin: false,
    rescued: [],
    victory: false,
    stars: 0,
    collected: {},
    emeralds: [],
    chaosTrials: {},
    lebronUnlocked: false,
    lebronEquipped: [false, false],
    curryUnlocked: false,
    curryEquipped: [false, false],
    viniUnlocked: false,
    viniEquipped: [false, false],
    squidwardUnlocked: false,
    squidwardEquipped: [false, false],
    adventures: {},
    playSeconds: 0,
    checkpoint: null,
    selectedAlly: null,
    settings: {
      muted: false,
      volume: 0.25,
      difficulty: "gentle",
      reducedMotion: false,
      players: 1,
      pvp: true,
      controllerBindings: normalizeBindings(),
      controllerBindingsCustomized: false,
    },
  };
}
export class Progress {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.saveError = false;
    this.data = this.load();
  }
  load() {
    const base = freshSave();
    try {
      const raw = JSON.parse(this.storage.getItem(SAVE_KEY));
      if (!raw || raw.version !== 1) return base;
      base.origin = raw.origin === true;
      base.rescued = [
        ...new Set(
          (Array.isArray(raw.rescued) ? raw.rescued : []).filter((id) =>
            ALLY_IDS.includes(id),
          ),
        ),
      ];
      base.victory = raw.victory === true && base.rescued.length === 5;
      base.stars = Math.max(0, Number(raw.stars) || 0);
      base.playSeconds = Math.max(0, Number(raw.playSeconds) || 0);
      if (raw.adventures && typeof raw.adventures === "object") {
        for (let level = 1; level <= 5; level++) {
          const a = raw.adventures[level];
          if (a && Number.isInteger(a.step) && a.step >= 0 && a.step <= 8)
            base.adventures[level] = {
              ...(a.revision === 2
                ? {
                    revision: 2,
                    turns:
                      a.turns && typeof a.turns === "object" ? a.turns : {},
                  }
                : {}),
              step: a.step,
              hits: Array.isArray(a.hits)
                ? a.hits.filter((n) => Number.isInteger(n) && n >= 0 && n < 5)
                : [],
              wave: Math.max(0, Math.min(3, Number(a.wave) || 0)),
            };
        }
      }
      base.collected =
        raw.collected &&
        typeof raw.collected === "object" &&
        !Array.isArray(raw.collected)
          ? Object.fromEntries(Object.entries(raw.collected).filter(([, value]) => value === true))
          : {};
      base.stars = STAGE_STARS.reduce((sum, _, level) => sum + stageStarCount(base.collected, level), 0);
      base.emeralds = [...new Set((Array.isArray(raw.emeralds) ? raw.emeralds : [])
        .filter(id => CHAOS_EMERALDS.some(e => e.id === id)))];
      base.lebronUnlocked = raw.lebronUnlocked === true;
      base.lebronEquipped = [0, 1].map(slot => base.lebronUnlocked && raw.lebronEquipped?.[slot] === true);
      base.curryUnlocked = raw.curryUnlocked === true;
      base.curryEquipped = [0, 1].map(slot => base.curryUnlocked && raw.curryEquipped?.[slot] === true);
      base.curryEquipped.forEach((equipped,slot)=>{if(equipped)base.lebronEquipped[slot]=false;});
      base.viniUnlocked = raw.viniUnlocked === true;
      base.viniEquipped = [0,1].map(slot=>base.viniUnlocked&&raw.viniEquipped?.[slot]===true);
      base.viniEquipped.forEach((equipped,slot)=>{if(equipped){base.lebronEquipped[slot]=false;base.curryEquipped[slot]=false;}});
      base.squidwardUnlocked = raw.squidwardUnlocked === true;
      base.squidwardEquipped = [0,1].map(slot=>base.squidwardUnlocked&&raw.squidwardEquipped?.[slot]===true);
      base.squidwardEquipped.forEach((equipped,slot)=>{if(equipped)for(const skin of ['lebron','curry','vini'])base[skin+'Equipped'][slot]=false;});
      for (const e of CHAOS_EMERALDS) {
        const step = raw.chaosTrials?.[e.id];
        if (Number.isInteger(step) && step >= 0 && step <= 3) base.chaosTrials[e.id] = step;
      }
      base.checkpoint =
        raw.checkpoint &&
        Number.isInteger(raw.checkpoint.level) &&
        raw.checkpoint.level >= 0 &&
        raw.checkpoint.level <= 6
          ? {
              level: raw.checkpoint.level,
              reached: raw.checkpoint.reached === true,
              ...(Number.isFinite(raw.checkpoint.x) &&
              Number.isFinite(raw.checkpoint.z) &&
              Math.abs(raw.checkpoint.x) < 100 &&
              Math.abs(raw.checkpoint.z) < 100
                ? { x: raw.checkpoint.x, z: raw.checkpoint.z }
                : {}),
            }
          : null;
      if (base.checkpoint && CHAOS_EMERALDS.some(e =>
        e.id === raw.checkpoint?.mission && e.level === base.checkpoint.level))
        base.checkpoint.mission = raw.checkpoint.mission;
      base.selectedAlly = base.rescued.includes(raw.selectedAlly)
        ? raw.selectedAlly
        : base.rescued[0] || null;
      base.settings = {
        muted: raw.settings?.muted === true,
        volume: Math.min(
          1,
          Math.max(0, Number(raw.settings?.volume ?? 0.25) || 0),
        ),
        difficulty: raw.settings?.difficulty === "normal" ? "normal" : "gentle",
        reducedMotion: raw.settings?.reducedMotion === true,
        players: raw.settings?.players === 2 ? 2 : 1,
        pvp: raw.settings?.pvp !== false,
        controllerBindings: loadControllerBindings(raw.settings?.controllerBindings, raw.settings?.controllerBindingsCustomized === true),
        controllerBindingsCustomized: raw.settings?.controllerBindingsCustomized === true,
      };
      return base;
    } catch {
      return base;
    }
  }
  save() {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      this.saveError = false;
    } catch {
      this.saveError = true;
    }
  }
  isUnlocked(id) {
    return (
      id === 0 ||
      (id === 6
        ? this.data.rescued.length === 5
        : this.data.origin &&
          (id === 1 || this.data.rescued.includes(ALLY_IDS[id - 2])))
    );
  }
  armyAlive(owner) {
    return !this.data.rescued.includes(owner);
  }
  stageStars(level) { return stageStarCount(this.data.collected, level); }
  storyStars() { return STAGE_STARS.reduce((sum, _, level) => sum + this.stageStars(level), 0); }
  chaosUnlocked() { return this.data.victory && this.storyStars() === TOTAL_STARS; }
  superUnlocked() { return this.chaosUnlocked() && CHAOS_EMERALDS.every(e => this.data.emeralds.includes(e.id)); }
  unlockLeBron() {
    if (this.data.lebronUnlocked || !this.superUnlocked()) return false;
    this.data.lebronUnlocked = true;
    this.save();
    return true;
  }
  equipLeBron(slot, equipped) {
    if (!this.data.lebronUnlocked || ![0, 1].includes(slot)) return false;
    this.data.lebronEquipped[slot] = equipped === true;
    if (equipped) {this.data.squidwardEquipped[slot]=false; this.data.curryEquipped[slot] = false;this.data.viniEquipped[slot] = false; }
    this.save();
    return true;
  }
  unlockCurry() {
    if (this.data.curryUnlocked || !this.superUnlocked()) return false;
    this.data.curryUnlocked = true;this.save();return true;
  }
  equipCurry(slot, equipped) {
    if (!this.data.curryUnlocked || ![0, 1].includes(slot)) return false;
    this.data.curryEquipped[slot] = equipped === true;
    if (equipped) {this.data.squidwardEquipped[slot]=false; this.data.lebronEquipped[slot] = false;this.data.viniEquipped[slot] = false; }
    this.save();return true;
  }
  unlockVini() {
    if (this.data.viniUnlocked || !this.data.rescued.includes('daddy')) return false;
    this.data.viniUnlocked = true;this.save();return true;
  }
  equipVini(slot, equipped) {
    if (!this.data.viniUnlocked || ![0,1].includes(slot)) return false;
    this.data.viniEquipped[slot] = equipped === true;
    if (equipped) {this.data.squidwardEquipped[slot]=false;this.data.lebronEquipped[slot]=false;this.data.curryEquipped[slot]=false;}
    this.save();return true;
  }
  unlockSquidward() {
    if(this.data.squidwardUnlocked || !this.superUnlocked())return false;
    this.data.squidwardUnlocked=true;this.save();return true;
  }
  equipSquidward(slot,equipped) {
    if(!this.data.squidwardUnlocked||![0,1].includes(slot))return false;
    this.data.squidwardEquipped[slot]=equipped===true;
    if(equipped)for(const skin of ['lebron','curry','vini'])this.data[skin+'Equipped'][slot]=false;
    this.save();return true;
  }
  collectEmerald(id) {
    if (!this.chaosUnlocked() || !CHAOS_EMERALDS.some(e => e.id === id) ||
      this.data.chaosTrials[id] !== 3 || this.data.emeralds.includes(id)) return false;
    this.data.emeralds.push(id);
    this.save();
    return true;
  }
  rescue(owner) {
    if (!ALLY_IDS.includes(owner)) return;
    if (!this.data.rescued.includes(owner)) this.data.rescued.push(owner);
    this.data.selectedAlly = owner;
    this.data.checkpoint = null;
    this.save();
  }
  collect(level, id) {
    const stage = typeof level === 'number' ? level : /^d[0-6]$/.test(level) ? Number(level.slice(1)) : -1;
    if (!Number.isInteger(stage) || !STAGE_STARS[stage] || !Number.isInteger(id) || id < 0 || id >= STAGE_STARS[stage].length) return false;
    const key = `d${stage}:${id}`;
    if (this.data.collected[key]) return false;
    this.data.collected[key] = true;
    this.data.stars = this.storyStars();
    this.save();
    return true;
  }
  setCheckpoint(level, reached = false, position = null, mission = null) {
    this.data.checkpoint = {
      level,
      reached,
      ...(position ? { x: position.x, z: position.z } : {}),
      ...(mission ? { mission } : {}),
    };
    this.save();
  }
  completeOrigin() {
    this.data.origin = true;
    this.data.checkpoint = null;
    this.save();
  }
  completeFinal() {
    if (this.data.rescued.length !== 5) return false;
    this.data.victory = true;
    this.data.checkpoint = null;
    this.save();
    return true;
  }
  reset() {
    const settings = this.data.settings;
    this.data = freshSave();
    this.data.settings = settings;
    this.save();
  }
}
