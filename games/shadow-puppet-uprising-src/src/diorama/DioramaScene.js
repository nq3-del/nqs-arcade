import Phaser from "phaser";
import { Adventure } from "./Adventure.js";
import { CinemaDirector } from "./CinemaDirector.js";
import { worldView } from "./WorldView.js";
import {
  DioramaPlayer,
  DioramaEnemy,
  DioramaBoss,
  distance,
} from "./Actors.js";
import { AllyTeam } from "./AllyTeam.js";
import { DIORAMAS, ORIGIN_OBJECTIVES } from "../data/dioramas.js";
import { WORLDS } from "../data/levels.js";
import { CHARACTERS, DIFFICULTIES, FINAL_BOSS } from "../data/config.js";
import { CHAOS_EMERALDS, STAGE_STARS } from '../data/chaos.js';
import { ChaosMission } from './ChaosMission.js';
import { Basketball } from './Basketball.js';
import { GlamourEffects } from './GlamourEffects.js';
import { Football } from './Football.js';
import { ShadowMayhem } from './ShadowMayhem.js';
import { mayhemUnlocked } from './MayhemWaves.js';
import { MAYHEM_ARENA } from './MayhemArena.js';
import { MultiplayerCombat, P2_KEYS } from './MultiplayerCombat.js';
import { ReplayProgress, canReplay, replayCharacters } from '../systems/ReplayProgress.js';

export class DioramaMenu extends Phaser.Scene {
  constructor() {
    super("Menu");
  }
  create() {
    this.view = worldView();
    this.view.load(0, true);
    const a = this.view.character("A"),
      b = this.view.character("B");
    a.root.position.set(4, 0.28, 0);
    b.root.position.set(6, 0.28, 1.2);
    a.root.rotation.y = 0.6;
    b.root.rotation.y = 0.6;
    this.models = [a, b];
    this.events.once("shutdown", () => {
      this.models = [];
    });
  }
  update(time, delta) {
    for (const [i, a] of this.models.entries()) {
      a.root.position.y = 0.28 + Math.sin(time / 900 + i) * 0.045;
      a.body.rotation.z = Math.sin(time / 1600 + i) * 0.018;
    }
    this.view.render(Math.min(delta / 1000, 0.05));
  }
}

export class DioramaScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }
  init(data = {}) {
    this.pvp = null;
    this.mayhem = null;
    this.mayhemMode = data.mayhem === true;
    this.waypoint = this.regionTitle = this.checkpoint = null;
    this.replayMode = data.replay === true;
    this.replayLoadout = data.loadout || 'A';
    this.levelId = data.level || 0;
    this.resume = !!data.resume;
    this.missionId = data.mission || null;
  }
  create() {
    this.services = this.game.registry.get("services");
    this.mayhemMode = this.mayhemMode && mayhemUnlocked(this.services.progress);
    if (this.mayhemMode) { this.levelId = 6; this.replayMode = false; this.missionId = null; }
    if (this.replayMode && !canReplay(this.services.progress, this.levelId)) this.replayMode = false;
    if (this.replayMode) {
      if (!replayCharacters(this.services.progress).some(c=>c.id===this.replayLoadout)) this.replayLoadout='A';
      this.services = {...this.services, progress:new ReplayProgress(this.services.progress,this.levelId)};
    }
    if (!this.services.progress.chaosUnlocked() ||
      !CHAOS_EMERALDS.some(e => e.id === this.missionId && e.level === this.levelId)) this.missionId = null;
    this.chaosMission = null;
    this.definition = this.mayhemMode ? MAYHEM_ARENA : DIORAMAS[this.levelId];
    this.worldData = {
      ...WORLDS[this.levelId],
      id: this.mayhemMode ? 7 : this.levelId,
      name: this.definition.name,
      label: this.definition.chapter,
    };
    this.character = CHARACTERS.find((c) => c.id === this.worldData.owner);
    this.difficulty =
      DIFFICULTIES[this.services.progress.data.settings.difficulty];
    this.view = worldView();
    this.view.load(this.levelId, false, this.mayhemMode);
    this.view.reducedMotion =
      this.services.progress.data.settings.reducedMotion;
    this.ending = false;
    this.pendingViniReward = false;
    this.pendingSquidwardReward = null;
    this.cinematic = null;
    this.touchHeld = {};
    this.touchPressed = {};
    this.enemies = [];
    this.projectiles = [];
    this.props = [];
    this.summons = [];
    this.slimes = [];
    this.stars = [];
    this.finalStage = 0;
    this.finalDash = false;
    this.finalGuards = [];
    this.boss = null;
    this.arenaStarted = false;
    this.originStep = 0;
    this.originCrystal = null;
    this.originActions = {
      switched: false,
      highJump: false,
      dash: false,
      power: false,
    };
    this.exit = null;
    this.objectiveMarker = null;
    this.nextHUD = 0;
    this.visitedRegions = new Set();
    this.keys = this.input.keyboard.addKeys({
      w: "W",
      a: "A",
      s: "S",
      d: "D",
      left: "LEFT",
      right: "RIGHT",
      up: "UP",
      down: "DOWN",
      space: "SPACE",
      q: "Q",
      j: "J",
      k: "K",
      e: "E",
      l: "L",
      tab: "TAB",
      r: "R",
      t: "T",
      y: "Y",
      u: 'U', i: 'I', h: 'H', p2squidward:'O',
      c: "C",
      x: 'X', p2jump:'ZERO', p2attack:'ONE', p2power:'TWO', p2form:'THREE',
      p2super:'FOUR', p2skin:'FIVE', p2shoot:'SIX', p2curry:'SEVEN', p2descend:'NINE',
      p2vini:'EIGHT', p2celebrate:'P', p2interact:'ENTER', p2ally:'M', p2call:'N',
    });
    this.keyPressed = {};
    for (const [name, key] of Object.entries(this.keys))
      key.on("down", (_key, event) => {
        if (!event?.repeat) this.keyPressed[name] = true;
      });
    const saved = this.mayhemMode ? null : this.services.progress.data.checkpoint;
    this.checkpointReached = saved?.level === this.levelId &&
      (saved.mission || null) === this.missionId && saved.reached;
    const spawn = this.checkpointReached
      ? Number.isFinite(saved.x)
        ? [saved.x, saved.z]
        : this.definition.checkpoint
      : this.definition.start;
    this.spawn = { x: spawn[0], z: spawn[1] };
    this.player = new DioramaPlayer(this, ...spawn);
    this.allies = new AllyTeam(this);
    this.player.allies = this.allies;
    this.players = [this.player];
    this.partner = null;
    if (this.services.progress.data.settings.players === 2) {
      this.partner = new DioramaPlayer(this, spawn[0] + 1.3, spawn[1], 1);
      this.partner.allies = new AllyTeam(this, this.partner);
      this.players.push(this.partner);
    }
    this.player.sync(0);
    if (this.replayMode || this.mayhemMode) for (const p of this.players) {
      p.form=this.replayLoadout==='B'?'B':'A';
      p.lebronEquipped=this.replayLoadout==='lebron';p.curryEquipped=this.replayLoadout==='curry';
      p.viniEquipped=this.replayLoadout==='vini';p.squidwardEquipped=this.replayLoadout==='squidward';
      p.superPower.phase=['goku','hyper'].includes(this.replayLoadout)?'super':'normal';
      if (this.replayLoadout==='hyper') p.hyperPower.remaining=15;
      p.setSuperAppearance(p.superPower.active);
    }
    this.checkpointX = this.levelId ? this.definition.checkpoint?.[0] ?? null : null;
    this.arenaStart = 3;
    this.buildLevel();
    this.glamour = new GlamourEffects(this);
    this.basketball = new Basketball(this);
    this.football = new Football(this);
    if (this.mayhemMode) this.mayhem = new ShadowMayhem(this);
    if (this.partner) this.pvp = new MultiplayerCombat(this);
    if (this.missionId) this.chaosMission = new ChaosMission(this, this.missionId);
    this.adventure =
      this.levelId > 0 &&
      this.levelId < 6 &&
      this.services.progress.armyAlive(this.worldData.owner)
        ? new Adventure(this)
        : null;
    if (this.adventure?.step > 0 && !this.checkpointReached) {
      const previous = this.adventure.tasks[this.adventure.step - 1],
        at = previous.destination || previous.points.at(-1);
      this.checkpointReached = true;
      this.spawn = { x: at[0], z: at[1] };
      this.players.forEach((p, i) => {
        p.x = at[0] + i * 1.3;
        p.z = at[1];
        p.sync(0);
      });
    }
    if (!this.mayhemMode) this.services.progress.setCheckpoint(
      this.levelId,
      !!this.checkpointReached,
      this.spawn,
      this.missionId,
    );
    this.services.ui.buildHUD();
    this.playerLabels=this.players.map((p,i)=>{
      const label=document.createElement('div');label.className=`player-arrow player-arrow-${i+1}`;
      label.textContent=i?'Player two':'Player one';document.querySelector('#game-shell').appendChild(label);return label;
    });
    this.createCinema();
    this.events.once("shutdown", () => {
      this.cinemaElement?.remove();
      this.waypoint?.remove();
      this.regionTitle?.remove();
      this.adventure?.destroy();
      this.chaosMission?.destroy();
      this.glamour?.destroy();
      this.mayhem?.destroy();
      this.basketball?.destroy();
      this.football?.destroy();
      this.playerLabels?.forEach(label=>label.remove());
      this.players.forEach(p => p.superPower.destroy());
      this.players.forEach(p => p.hyperPower.destroy());
      this.services.progress.save();
      this.services.ui.tutorial("");
      this.input.keyboard.resetKeys();
    });
    if (this.mayhemMode) this.services.ui.tutorial(this.mayhem.hint());
    else if (this.missionId || this.services.progress.data.victory) {
      this.services.ui.tutorial(this.chaosMission?.hint() || 'Explore every stage and complete your star collection.');
    } else if (this.resume)
      this.services.ui.tutorial(
        "Welcome back. Your family’s adventure continues.",
      );
    else this.playCinema(this.definition.intro, () => {}, "intro");
  }
  inputFor(slot) {
    if (this.services.progress.data.settings.players === 2) {
      const keyName = name => slot ? P2_KEYS[name] : name === 'down' ? 'x' : ['left','right','up'].includes(name) ? null : name;
      return {
        pressed: name => {
          const key = keyName(name), pressed = key && this.keyPressed[key];
          if (key) this.keyPressed[key] = false;
          return !!(this.services.controls.pressed(slot,name) || pressed || (!slot && this.consumeTouch(name)));
        },
        down: name => !!(this.services.controls.down(slot,name) || this.keys[keyName(name)]?.isDown || (!slot && this.touchHeld[name])),
      };
    }
    return slot === 0
      ? {
          pressed: (name) => this.pressed(name),
          down: (name) => this.down(name),
        }
      : {
          pressed: (name) => this.services.controls.pressed(slot, name),
          down: (name) => this.services.controls.down(slot, name),
        };
  }
  nearestPlayer(point) {
    return (
      this.players
        .filter((p) => !p.downed)
        .sort((a, b) => distance(a, point) - distance(b, point))[0] ||
      this.player
    );
  }
  cameraFocus() {
    if (!this.partner) return this.player;
    return {
      x: (this.player.x + this.partner.x) / 2,
      z: (this.player.z + this.partner.z) / 2,
      spread: distance(this.player, this.partner),
      y: Math.max(this.player.y, this.partner.y) * 0.5,
    };
  }
  playerDefeated(player) {
    if (this.mayhem) { this.mayhem.defeatedPlayer(player); return; }
    player.downed = true;
    if (this.pvp) { this.pvp.defeated(player); return; }
    if (this.players.every((p) => p.downed)) this.defeat();
    else
      this.services.ui.toast(
        "Stand beside your partner and press E / R3 to help them up.",
        4500,
      );
  }
  pressed(name) {
    const pad = this.services.controls.pressed(0, name);
    const p = this.keyPressed[name] || this.touchPressed[name] || pad;
    this.keyPressed[name] = false;
    this.touchPressed[name] = false;
    return !!p;
  }
  clearInputs() {
    this.keyPressed = {};
    this.services.controls.clear();
    this.touchPressed = {};
    this.touchHeld = {};
    this.input.keyboard.resetKeys();
  }
  down(name) {
    return !!(
      this.keys[name]?.isDown ||
      this.touchHeld[name] ||
      this.services.controls.down(0, name)
    );
  }
  consumeTouch(name) {
    const p = this.touchPressed[name];
    this.touchPressed[name] = false;
    return p;
  }
  buildLevel() {
    if (this.mayhemMode) {
      this.view.portal.visible = false;
      this.regionTitle = document.createElement("div");
      this.regionTitle.className = "region-title";
      document.querySelector("#game-shell").appendChild(this.regionTitle);
      return;
    }
    const alive =
      !this.worldData.owner ||
      this.services.progress.armyAlive(this.worldData.owner);
    if (this.missionId || this.services.progress.data.victory) {
      this.view.portal.visible = true;
      const at = this.definition.exit || this.definition.portal;
      this.exit = { x: at[0], z: at[1], view: this.view.portal };
    } else if (this.levelId === 0) {
      this.originCrystal = this.prop("crystal", 3, -1);
      this.dashArch = this.view.makePortal(6, -4);
      this.dashArch.scale.setScalar(0.6);
      this.exit = { x: 9, z: -7, view: this.view.portal };
      this.markObjective(ORIGIN_OBJECTIVES[0]);
    } else {
      this.checkpoint = this.prop("checkpoint", ...this.definition.checkpoint);
      if (this.levelId === 6) {
        this.boss = new DioramaBoss(this, null, true);
        this.boss.name = FINAL_BOSS.name;
        this.finalMachine = this.prop("machine", -1, -1);
      } else if (alive) {
        for (const [x, z] of [
          [-20, 7],
          [-7, 1],
          [12, -4],
        ])
          this.spawnEnemy(x, z, this.worldData.owner);
        this.boss = new DioramaBoss(this, this.worldData.owner);
        this.captive = this.view.character(this.worldData.owner);
        this.captive.root.position.set(
          this.definition.exit[0],
          0.3,
          this.definition.exit[1],
        );
        const prison = this.view.makePortal(...this.definition.exit);
        prison.scale.setScalar(0.65);
        this.cage = prison;
      } else {
        this.view.portal.visible = true;
        this.exit = {
          x: this.definition.exit[0],
          z: this.definition.exit[1],
          view: this.view.portal,
        };
        this.captive = this.view.character(this.worldData.owner);
        this.captive.root.position.set(this.exit.x - 2, 0.28, this.exit.z + 2);
      }
      if (this.levelId === 2) {
        this.addSlime(1, -2, true);
        this.addSlime(6, -4, true);
      }
    }
    const coords = STAGE_STARS[this.levelId];
    coords.forEach(([x, z], id) => {
      if (!this.services.progress.data.collected[`d${this.levelId}:${id}`])
        this.stars.push({ id, x, z, view: this.view.star(x, z), active: true });
    });
    this.waypoint = document.createElement("div");
    this.waypoint.className = "world-waypoint";
    document.querySelector("#game-shell").appendChild(this.waypoint);
    this.regionTitle = document.createElement("div");
    this.regionTitle.className = "region-title";
    document.querySelector("#game-shell").appendChild(this.regionTitle);
  }
  prop(type, x, z) {
    const p = { type, x, z, done: false, view: this.view.prop(type, x, z) };
    this.props.push(p);
    return p;
  }
  spawnEnemy(x, z, owner, guard = false) {
    if (!guard && !this.services.progress.armyAlive(owner)) return;
    const e = new DioramaEnemy(this, x, z, owner, guard);
    this.enemies.push(e);
    return e;
  }
  markObjective(objective) {
    this.view.remove(this.objectiveMarker);
    this.objectiveMarker = this.view.marker(...objective.at);
    this.services.ui.tutorial?.(objective.hint);
  }
  createCinema() {
    this.director = new CinemaDirector(this);
  }
  playCinema(lines, done, kind = "intro") {
    this.director.play(lines, done, kind);
  }
  updateCinema() {
    this.director.showBeat();
  }
  nextCinema() {
    this.director.next();
  }
  finishCinema() {
    this.director.close();
  }
  cinemaCamera() {
    return this.director.camera();
  }
  melee(player, range, damage, kind) {
    this.pvp?.melee(player, range, damage, kind);
    this.chaosMission?.action(kind, player);
    this.adventure?.action(kind, player);
    for (const e of this.enemies)
      if (
        e.active &&
        e.friendlyUntil < this.time.now &&
        distance(e, player) < range
      )
        e.hit(damage);
    if (this.boss?.active && distance(this.boss, player) < range + 1)
      this.boss.hit(damage, kind, player);
    if (
      this.levelId === 0 &&
      kind === "power" &&
      this.originCrystal && !this.originCrystal.done &&
      distance(player, this.originCrystal) < 3
    ) {
      this.originCrystal.done = true;
      this.originActions.power = true;
      this.view.remove(this.originCrystal.view);
      this.view.effect(3, -1, "#ddbdd7", 32);
    }
  }
  dashContact(p) {
    if (this.pvp) {
      const victim = this.players.find(other => other !== p);
      if (!p.dashHits.has(victim) && distance(p, victim) < 1.8 && Math.abs(p.y-victim.y)<2) {
        p.dashHits.add(victim);this.pvp.hurt(p,victim,2,14);
      }
    }
    this.chaosMission?.action('dash', p);
    this.adventure?.action("dash", p);
    for (const e of this.enemies)
      if (e.active && distance(e, p) < 1.5 && !p.dashHits.has(e)) {
        p.dashHits.add(e);
        e.hit(2);
      }
    if (
      this.boss?.active &&
      distance(this.boss, p) < 2 &&
      !p.dashHits.has(this.boss)
    ) {
      p.dashHits.add(this.boss);
      this.boss.hit(2, "dash", p);
    }
    if (this.levelId === 0 && distance(p, { x: 6, z: -4 }) < 2.4) {
      this.originActions.dash = true;
      this.view.effect(6, -4, "#c7dbbd", 14);
    }
  }
  blocked(x, z, actor = this.player) {
    // Sweep fast dashes too, so thin posts and boards cannot be skipped.
    if (actor && this.view.sportsColliders.length) {
      const steps = Math.max(1, Math.ceil(Math.hypot(x - actor.x, z - actor.z) / 0.12));
      for (let i = 1; i <= steps; i++) if (this.view.sportsBlocked(
        actor.x + (x - actor.x) * i / steps, actor.y, actor.z + (z - actor.z) * i / steps, actor.collisionHeight?.() || 1.9)) return true;
    }
    if (actor?.y > 0.7) return false;
    return (
      this.view.floorHeight(x, z) > (actor?.y || 0) + 0.12 ||
      this.view.blocked(x, z) ||
      this.props.some(
        (o) =>
          o.type === "barrier" && !o.done && Math.hypot(x - o.x, z - o.z) < 0.9,
      )
    );
  }
  addSlime(x, z, permanent = false) {
    const mesh = this.view.cylinder(x, 0.31, z, 1.4, 1.4, 0.025, "#a6c7b2");
    mesh.material = this.view.material("#a6c7b2", {
      transparent: true,
      opacity: 0.68,
      roughness: 0.3,
    });
    this.slimes.push({
      x,
      z,
      view: mesh,
      until: permanent ? Infinity : this.time.now + 6000,
    });
  }
  isSlippery(x, z) {
    return this.slimes.some(
      (p) => p.until > this.time.now && Math.hypot(x - p.x, z - p.z) < 1.4,
    );
  }
  projectile(x, z, type, aim, speed, owner, friendly = false, caster = null) {
    this.projectiles.push({
      x,
      z,
      type,
      aim: { ...aim },
      speed: speed * (friendly ? 1 : this.difficulty.enemySpeed),
      owner,
      friendly,
      caster,
      view: this.view.projectile(type, x, z),
      expires: this.time.now + 5000,
      hits: new Set(),
      phase: 0,
    });
  }
  updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter((p) => {
      const before={x:p.x,z:p.z};
      p.x += p.aim.x * p.speed * dt;
      p.z += p.aim.z * p.speed * dt;
      this.football?.observeDaddyShot(p,before);
      p.phase += dt;
      const ball = p.type === "ball" || p.type === "basketball";
      const y = ball
        ? 0.45 + Math.abs(Math.sin(p.phase * 5)) * 0.75
        : 0.8 + Math.sin(p.phase * 3) * 0.2;
      p.view.position.set(p.x, y, p.z);
      p.view.rotation.y += dt * 3;
      let remove = this.time.now > p.expires || !this.view.walkable(p.x, p.z);
      if (p.friendly) {
        if (this.pvp?.allyProjectile(p,y)) remove=true;
        for (const e of this.enemies)
          if (e.active && distance(e, p) < 1 && !p.hits.has(e)) {
            p.hits.add(e);
            e.hit(5);
          }
        if (
          this.boss?.active &&
          distance(this.boss, p) < 1.5 &&
          !p.hits.has(this.boss)
        ) {
          p.hits.add(this.boss);
          this.boss.hit(4, "ally");
        }
        for (const target of this.props)
          if (
            target.type === "target" &&
            !target.done &&
            distance(target, p) < 1
          ) {
            target.done = true;
            this.view.effect(target.x, target.z, "#dfd4a4", 25);
            if (target === this.finalTarget && this.finalStage === 4)
              this.advanceFinal();
            else this.services.ui.toast("A beautiful shot. Goal!");
          }
      } else {
        const victim = this.players.find(
          (player) =>
            !player.downed &&
            distance(p, player) < 0.75 &&
            Math.abs(player.y + 0.8 - y) < 0.85,
        );
        if (victim) {
          remove = true;
          if (p.type === "potion" && !victim.superPower.active && !victim.superPower.busy) {
            victim.glamourUntil = this.time.now + 1400;
            this.glamour.apply(victim,1400);
            victim.invulnerableUntil = this.time.now + 1500;
            this.services.ui.toast(
              "Handsome Squidward! The Ultimate Rizzler strikes a pose.",
              1600,
            );
            this.view.effect(p.x, p.z, "#d5aec7", 18);
          } else victim.hurt(p);
        }
      }
      if (remove) {
        this.view.effect(
          p.x,
          p.z,
          p.type === "nappy" ? "#d7ad93" : "#bfd8d2",
          6,
        );
        this.view.remove(p.view);
        return false;
      }
      return true;
    });
  }
  interact(player = this.player) {
    if (this.mayhem) { this.services.ui.toast("Defeat as many shadows as you can. Use Pause or Map when you want to leave."); return; }
    const friend = !this.pvp && this.players.find(
      (p) => p !== player && p.downed && distance(p, player) < 3,
    );
    if (friend) {
      friend.downed = false;
      friend.health = Math.ceil(friend.maxHealth / 2);
      friend.invulnerableUntil = this.time.now + 3500;
      this.view.effect(friend.x, friend.z, "#bce0b4", 25);
      return;
    }
    if (this.adventure?.interact(player)) return;
    if (this.exit && distance(player, this.exit) < 2.6) {
      if (this.services.progress.data.victory) { this.services.ui.map(); return; }
      if (this.levelId === 0) {
        if (this.originStep < 5) {
          this.services.ui.toast(
            "Explore both forms first. Follow the golden circle.",
          );
          return;
        }
        this.playCinema(
          this.definition.outro,
          () => {
            this.services.progress.completeOrigin();
            this.services.ui.map();
          },
          "rescue",
        );
      } else this.services.ui.map();
      return;
    }
    const machine = this.props.find(
      (o) => o.type === "machine" && !o.done && distance(o, player) < 3,
    );
    if (machine)
      this.services.ui.toast("Grandad can mend this. Equip him, then press L.");
    else
      this.services.ui.toast(
        "Follow the golden trail. E opens portals and continues scenes.",
        1800,
      );
  }
  fall(player = this.player) {
    if (this.ending) return;
    if (!player.superPower.active && !player.superPower.busy) player.health--;
    player.x = this.spawn.x;
    player.z = this.spawn.z;
    player.y = 0;
    player.vy = 0;
    player.vx = 0;
    player.vz = 0;
    player.wetTime = 0;
    player.invulnerableUntil = this.time.now + 2200;
    this.services.audio.play("hurt");
    if (player.health <= 0) this.playerDefeated(player);
    else this.services.ui.toast("A little splash. Back on dry land!", 1600);
  }
  defeat() {
    if (this.ending) return;
    this.ending = true;
    this.director.bark(`v-hero-${this.player.form.toLowerCase()}-retry`, {
      important: true,
    });
    this.services.ui.defeat();
  }
  rescue(owner) {
    if (this.ending) return;
    this.ending = true;
    this.services.progress.rescue(owner);
    this.enemies
      .filter((e) => e.active && e.owner === owner)
      .forEach((e) => e.remove());
    this.projectiles.forEach((p) => this.view.remove(p.view));
    this.projectiles = [];
    this.view.remove(this.cage);
    this.services.audio.play("win");
    this.view.effect(...this.definition.exit, "#e3d6b0", 70);
    const c = CHARACTERS.find((c) => c.id === owner);
    this.playCinema(
      [
        `${c.name} ${owner === "leah" ? "are" : "is"} free. The borrowed shadows fade into the sunlight.`,
        `“${c.rescue}”`,
        "One more member of the family. One step closer to home.",
      ],
      () => this.services.ui.rescue(owner),
      "rescue",
    );
  }
  tryFinalAlly(id) {
    if (this.mayhemMode) return;
    if (this.levelId !== 6 || !this.arenaStarted || this.finalStage >= 5)
      return;
    const required = ["grandad", "nana", "mummy", "leah", "daddy"][
      this.finalStage
    ];
    if (id !== required) return;
    const done =
      id === "grandad"
        ? this.finalMachine.done
        : id === "nana"
          ? this.finalGuards.length &&
            this.finalGuards.every(
              (e) => e.active && e.friendlyUntil > this.time.now,
            )
          : id === "mummy"
            ? this.finalGuards.length &&
              this.finalGuards.every(
                (e) => e.active && e.poseUntil > this.time.now,
              )
            : id === "leah"
              ? this.finalBarrier.done
              : false;
    if (done) this.advanceFinal();
  }
  advanceFinal() {
    if (this.finalStage >= 5) return;
    const c = CHARACTERS[this.finalStage];
    this.director.bark(`v-final-${c.id}`, { important: true });
    this.finalGuards.forEach((e) => {
      if (e.active) e.remove();
    });
    this.finalGuards = [];
    this.boss.health = Math.max(2, this.boss.health - 2);
    this.view.effect(this.boss.x, this.boss.z, c.color, 32);
    this.finalStage++;
    if (this.finalStage === 1 || this.finalStage === 2)
      this.finalGuards = [
        this.spawnEnemy(4, -3, "bigboss", true),
        this.spawnEnemy(5, -4, "bigboss", true),
      ];
    if (this.finalStage === 3) this.finalBarrier = this.prop("barrier", 5, -4);
    if (this.finalStage === 4) this.finalTarget = this.prop("target", 9, -6);
  }
  finalHeroHit(kind, player = this.player) {
    if (this.finalStage !== 5) return false;
    if (kind === "dash" && player.form === "A" && !this.finalDash) {
      this.finalDash = true;
      this.director.bark("v-final-dash", { important: true });
      this.boss.health = 1;
      this.view.effect(this.boss.x, this.boss.z, "#dfa2a3", 30);
      this.services.ui.toast("Now change to Form B. One last power pop!", 3000);
      return true;
    }
    if (kind === "power" && player.form === "B" && this.finalDash) {
      this.boss.health = 0;
      this.boss.defeated();
      return true;
    }
    return false;
  }
  finalVictory() {
    if (this.ending) return;
    this.ending = true;
    this.services.progress.completeFinal();
    this.enemies.filter((e) => e.active).forEach((e) => e.remove());
    this.projectiles.forEach((p) => this.view.remove(p.view));
    this.projectiles = [];
    this.services.audio.play("win");
    this.victoryCast = [];
    CHARACTERS.forEach((c, i) => {
      const a = this.view.character(c.id);
      this.victoryCast.push(a);
      a.root.position.set(4 + i * 1.25, 0.28, -5);
      a.root.rotation.y = 0.6;
    });
    this.view.effect(7, -5, "#ecd39d", 100);
    this.playCinema(
      [
        "Every great adventure leaves something behind.",
        "This one left a kingdom repaired, a forest clean… and several exceptionally glamorous puppets.",
        "But the best part? Everybody came home.",
        "A story by Tony Baloney Studios. A family adventure, made together.",
      ],
      () => this.services.ui.victory(),
      "ending",
    );
  }
  updateOrigin() {
    const p = this.nearestPlayer({
        x: ORIGIN_OBJECTIVES[this.originStep].at[0],
        z: ORIGIN_OBJECTIVES[this.originStep].at[1],
      }),
      step = this.originStep,
      objective = ORIGIN_OBJECTIVES[step];
    if (!objective) return;
    const near =
      distance(p, { x: objective.at[0], z: objective.at[1] }) <
      objective.radius;
    const done =
      step === 0
        ? near
        : step === 1
          ? near && p.y > 0.4
          : step === 2
            ? this.originActions.switched
            : step === 3
              ? this.originActions.power
              : step === 4
                ? this.originActions.dash
                : false;
    if (done) {
      this.originStep++;
      this.view.effect(p.x, p.z, "#e6d7ac", 20);
      this.markObjective(ORIGIN_OBJECTIVES[this.originStep]);
    }
    this.services.ui.tutorial(ORIGIN_OBJECTIVES[this.originStep].hint);
  }
  updateWaypoint() {
    if (!this.waypoint) return;
    let target, label;
    if (this.chaosMission) {
      target = this.chaosMission.target();
      label = this.chaosMission.step < 3 ? `Chaos seal ${this.chaosMission.step + 1}/3` : `${this.chaosMission.definition.name} Chaos Emerald`;
    } else if (this.services.progress.data.victory) {
      target = this.stars.filter(s => s.active).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0] || this.exit;
      label = target === this.exit ? 'The way home' : 'Uncollected star';
    } else if (this.levelId === 0) {
      const o = ORIGIN_OBJECTIVES[this.originStep];
      target = { x: o.at[0], z: o.at[1] };
      label = o.title;
    } else if (this.levelId === 6 && this.arenaStarted) {
      target =
        this.finalStage === 0
          ? this.finalMachine
          : this.finalStage < 3
            ? this.finalGuards[0]
            : this.finalStage === 3
              ? this.finalBarrier
              : this.finalStage === 4
                ? this.finalTarget
                : this.boss;
      label = [
        "Repair the star machine",
        "A little kindness",
        "Strike a pose",
        "Special delivery",
        "The perfect shot",
        "Two forms. One hero.",
      ][this.finalStage];
    } else if (this.adventure && !this.adventure.complete) {
      target = this.adventure.target();
      label = this.adventure.task.title;
    } else if (!this.checkpointReached) {
      target = this.checkpoint;
      label = "A place to rest";
    } else {
      target = this.boss?.active ? this.boss : this.exit;
      label = this.boss?.active ? "The borrowed shadow" : "The way home";
    }
    if (!target || this.cinematic || this.ending) {
      this.waypoint.hidden = true;
      return;
    }
    this.waypoint.hidden = false;
    const pos = this.view.project(target.x, 2.5, target.z);
    this.waypoint.style.left = `${Math.max(10, Math.min(90, pos.x))}%`;
    this.waypoint.style.top = `${Math.max(22, Math.min(72, pos.y))}%`;
    const near = distance(target, this.nearestPlayer(target));
    this.waypoint.textContent = `${label}${near > 4 ? " · " + Math.ceil(near) + "m" : ""}`;
  }
  discoverSquidward(player=this.player) {
    if(this.levelId!==3||!player.hyperPower.active||!player.superPower.active)return false;
    if(!this.services.progress.unlockSquidward())return false;
    this.pendingSquidwardReward=player;this.services.audio.play('win');return true;
  }
  discoverVini() {
    if (this.services.progress.unlockVini()) this.pendingViniReward=true;
  }
  updatePlayerLabels() {
    this.players.forEach((p,i)=>{
      const label=this.playerLabels?.[i];if(!label)return;
      label.hidden=!!this.cinematic||!!this.ending;
      const pos=this.view.project(p.x,p.y+p.collisionHeight()+.65,p.z);
      label.style.left=`${pos.x}%`;label.style.top=`${pos.y}%`;
      label.textContent=`Player ${i?'two':'one'}${p.downed?` · ${Math.ceil(p.respawnRemaining||0)}s`:''}`;
    });
  }
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    if (!this.player) return;
    this.services.voice?.sync();
    this.glamour?.update();
    if (!this.ending || this.cinematic)
      this.services.progress.data.playSeconds += Math.min(delta / 1000, 0.25);
    if (this.cinematic) {
      this.playerLabels?.forEach(label=>label.hidden=true);
      const padSpace = this.services.controls.pressed(0, "space");
      const advance = this.pressed("e");
      const space = this.pressed("space");
      const partnerAdvance = this.services.controls.pressed(1, "e");
      const partnerSpace = this.services.controls.pressed(1, "space");
      if (
        advance ||
        padSpace ||
        partnerAdvance ||
        partnerSpace ||
        (space && document.activeElement?.tagName !== "BUTTON")
      )
        this.nextCinema();
      if (!this.cinematic || !this.scene.isActive()) return;
      this.player.sync(0);
      this.director.tick(dt);
      if (!this.cinematic || !this.scene.isActive()) return;
      this.view.render(dt, this.cameraFocus(), this.cinemaCamera());
      this.updateWaypoint();
      return;
    }
    if (this.ending) {
      this.view.render(dt, this.player);
      return;
    }
    if(this.pendingSquidwardReward) {
      const player=this.pendingSquidwardReward;this.pendingSquidwardReward=null;
      this.services.ui.squidwardReward(player);return;
    }
    if (this.pendingViniReward) {
      this.pendingViniReward=false;this.services.ui.viniReward();return;
    }
    for (const p of this.players) {
      const before = { x: p.x, y: p.y + 0.28, z: p.z, super: p.superPower.active };
      p.update(dt);
      this.basketball?.observeStep(p, before);
      if (!this.scene.isActive()) return;
    }
    if (this.ending || this.cinematic || !this.scene.isActive()) return;
    this.basketball?.update(dt);
    this.football?.update(dt);
    this.pvp?.update(dt);
    this.mayhem?.update(delta / 1000);
    this.chaosMission?.update(dt);
    if (this.scene.isPaused() || this.ending) return;
    for (const [x, z, title] of this.definition.regions || []) {
      if (
        !this.arenaStarted &&
        !this.visitedRegions.has(title) &&
        distance(this.player, { x, z }) < 8
      ) {
        this.visitedRegions.add(title);
        this.regionTitle.textContent = title;
        this.regionTitle.classList.add("show");
        this.regionUntil = time + 3500;
      }
    }
    if (time > this.regionUntil || this.arenaStarted)
      this.regionTitle.classList.remove("show");
    for (const star of this.stars)
      if (
        star.active &&
        this.players.some((p) => !p.downed && distance(star, p) < 0.7)
      ) {
        const wasUnlocked = this.services.progress.chaosUnlocked();
        star.active = false;
        this.services.progress.collect(`d${this.levelId}`, star.id);
        this.view.remove(star.view);
        this.view.effect(star.x, star.z, "#ebd8a8", 8);
        this.services.audio.play("star");
        this.director.bark(`v-hero-${this.player.form.toLowerCase()}-star`);
        if (!wasUnlocked && this.services.progress.chaosUnlocked())
          this.services.ui.toast('Every star collected! Seven Chaos Emerald side missions are now open on the map.', 6500);
      }
    if (
      this.checkpoint &&
      !this.checkpointReached &&
      this.players.some((p) => distance(p, this.checkpoint) < 1.4)
    ) {
      this.checkpointReached = true;
      this.spawn = { x: this.checkpoint.x, z: this.checkpoint.z };
      for (const p of this.players) {
        p.health = p.maxHealth;
        p.downed = false;
      }
      this.services.progress.setCheckpoint(this.levelId, true, this.spawn, this.missionId);
      this.view.effect(this.checkpoint.x, this.checkpoint.z, "#d8dcad", 28);
      this.services.ui.toast(
        "A safe place. Full hearts. Your progress is saved.",
      );
      this.director.bark(`v-hero-${this.player.form.toLowerCase()}-checkpoint`);
    }
    if (this.mayhem) this.mayhem.updateEnemies();
    else for (const enemy of this.enemies) enemy.update(dt);
    if (this.boss?.active) {
      if (
        !this.arenaStarted &&
        (!this.adventure || this.adventure.complete) &&
        (this.levelId === 6
          ? this.player.x > 0 && this.player.z < 1
          : distance(this.boss, this.nearestPlayer(this.boss)) < 6.5)
      ) {
        this.arenaStarted = true;
        if (this.levelId === 6) {
          this.playCinema([], () => this.boss.start(), "quest");
          return;
        }
        this.boss.start();
      }
      this.boss.update(dt);
    }
    this.updateProjectiles(dt);
    if (
      this.levelId === 6 &&
      (this.finalStage === 1 || this.finalStage === 2) &&
      this.finalGuards.some((e) => !e.active)
    ) {
      this.finalGuards.forEach((e) => {
        if (e.active) e.remove();
      });
      this.finalGuards = [
        this.spawnEnemy(4, -3, "bigboss", true),
        this.spawnEnemy(5, -4, "bigboss", true),
      ];
    }
    this.summons = this.summons.filter((s) => {
      if (time > s.until) {
        this.view.remove(s.actor);
        return false;
      }
      s.actor.root.position.x +=
        (s.player.x - 1 - s.actor.root.position.x) * Math.min(1, dt * 5);
      s.actor.root.position.z +=
        (s.player.z + 0.6 - s.actor.root.position.z) * Math.min(1, dt * 5);
      s.actor.body.rotation.z = Math.sin(time / 200) * 0.04;
      return true;
    });
    for (const slime of this.slimes)
      if (time > slime.until) this.view.remove(slime.view);
    this.adventure?.update(dt);
    if (this.cinematic) return;
    if (this.levelId===0&&!this.services.progress.data.victory&&!this.missionId) this.updateOrigin();
    if (this.mayhem) this.services.ui.tutorial(this.mayhem.hint());
    else if (this.chaosMission && !this.chaosMission.complete) this.services.ui.tutorial(this.chaosMission.hint());
    else if (this.replayMode && this.levelId===0) this.services.ui.tutorial(ORIGIN_OBJECTIVES[this.originStep].hint);
    else if (this.replayMode && this.adventure && !this.adventure.complete) this.services.ui.tutorial(this.adventure.hint());
    else if (this.player.squidwardEquipped) this.services.ui.tutorial('HANDSOME SQUIDWARD · Walk, jump and interact · No attacks or powers · H / D-pad Left: return');
    else if (this.player.viniEquipped) this.services.ui.tutorial('VINI JR. · T: football · K: flaming super shot · I: celebrate · U: return');
    else if (this.player.basketballEquipped) this.services.ui.tutorial(`${this.player.curryEquipped?'STEPH CURRY':'LEBRON JAMES'} · T: basketball · K: flaming shot · ${this.player.curryEquipped?'Y':'R'}: return`);
    else if (this.player.hyperPower.active) this.services.ui.tutorial('HYPER GOKU · Immune to enemies · J / □: ultimate blue beam · Space / ×: fly up · C / △: fly down');
    else if (this.player.superPower.active) this.services.ui.tutorial('SUPER GOKU · Immune to enemies · K / ○: Hyper Goku · Space / ×: fly up · C / △: fly down · S / L3 + R3: normal');
    else if (this.services.progress.data.victory) this.services.ui.tutorial(this.services.progress.superUnlocked()
      ? 'All seven Chaos Emeralds are yours! Press S or Super to become Super Goku and fly.'
      : this.services.progress.chaosUnlocked() ? 'Chaos Emerald side missions are open! Choose a mission on the map.'
      : 'Find every star across all stages to unlock the Chaos Emerald missions. Map shows your collection.');
    else if (this.levelId === 0) this.services.ui.tutorial(ORIGIN_OBJECTIVES[this.originStep].hint);
    else if (this.adventure && !this.adventure.complete)
      this.services.ui.tutorial(this.adventure.hint());
    else if (!this.arenaStarted)
      this.services.ui.tutorial(
        "Arrows / W A D · explore     SPACE · jump     Q · change form     S · Super",
      );
    else this.services.ui.tutorial("");
    this.glamour.update();
    this.mayhem?.render();
    this.view.render(dt, this.cameraFocus());
    this.updatePlayerLabels();
    this.players.forEach(p => p.superPower.render());
    this.updateWaypoint();
    if (time > this.nextHUD) {
      this.nextHUD = time + 80;
      this.services.ui.updateHUD();
    }
  }
}
