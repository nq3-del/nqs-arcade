import Phaser from "phaser";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Boss } from "../entities/Boss.js";
import { Allies } from "../systems/Allies.js";
import {
  background,
  platformArt,
  portal,
  burst,
  floatingText,
} from "../systems/Art.js";
import { DIFFICULTIES, CHARACTERS, FINAL_BOSS } from "../data/config.js";
import {
  WORLDS,
  RESCUE_LAYOUTS,
  ORIGIN_HINTS,
  FINAL_STAGES,
} from "../data/levels.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }
  init(data) {
    this.levelId = data.level || 0;
    this.resume = !!data.resume;
  }
  create() {
    this.services = this.game.registry.get("services");
    this.worldData = WORLDS[this.levelId];
    this.difficulty =
      DIFFICULTIES[this.services.progress.data.settings.difficulty];
    this.ending = false;
    this.touchHeld = {};
    this.touchPressed = {};
    this.originActions = { switched: false, highJump: false, dash: false };
    this.enemies = [];
    this.slime = [];
    this.barriers = [];
    this.machines = [];
    this.targets = [];
    this.projectiles = [];
    // Phaser reuses the Scene instance: never retain objects from an earlier level.
    this.friendlyBalls = [];
    this.exit = null;
    this.captive = null;
    this.cage = null;
    this.checkpointX = null;
    this.flag = null;
    this.originGate = null;
    this.finalMachine = null;
    this.finalGuards = null;
    this.finalBarrier = null;
    this.finalTarget = null;
    this.labelTrap = null;
    this.magicSeen = false;
    this.shieldHint = 0;
    this.nextHUD = 0;
    this.boss = null;
    this.arenaStarted = false;
    this.finalStage = 0;
    this.finalDash = false;
    this.checkpointReached =
      this.resume &&
      this.services.progress.data.checkpoint?.level === this.levelId &&
      this.services.progress.data.checkpoint.reached;
    this.spawn =
      this.levelId === 6
        ? { x: this.checkpointReached ? 1050 : 150, y: 490 }
        : { x: this.checkpointReached ? 1630 : 160, y: 490 };
    this.arenaStart = this.levelId === 6 ? 1000 : 2680;
    this.physics.world.setBounds(0, -200, this.worldData.width, 1100);
    background(this, this.worldData);
    this.platforms = this.physics.add.staticGroup();
    this.blockers = this.physics.add.staticGroup();
    this.projectileGroup = this.physics.add.group({ allowGravity: true });
    if (this.levelId === 0) this.buildOrigin();
    else if (this.levelId === 6) this.buildFinal();
    else this.buildRescue();
    this.player = new Player(this, this.spawn.x, this.spawn.y);
    this.allies = new Allies(this);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.blockers);
    this.physics.add.collider(this.projectileGroup, this.platforms, (p) => {
      if (!p.active) return;
      if (p.kind === "potion" || p.kind === "nappy") {
        burst(this, p.x, p.y, p.kind === "nappy" ? 0xffc297 : 0xe8a2e1, 9);
        p.destroy();
      }
    });
    this.physics.add.overlap(
      this.player,
      this.projectileGroup,
      (_, projectile) => this.projectileHit(projectile),
    );
    this.cameras.main.setBounds(0, 0, this.worldData.width, 720);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1, -155, 0);
    this.services.ui.buildHUD();
    this.services.ui.tutorial(this.worldData.intro);
    if (this.levelId !== 0)
      this.time.delayedCall(4700, () => this.services.ui.tutorial(""));
    this.services.progress.setCheckpoint(
      this.levelId,
      !!this.checkpointReached,
    );
    this.events.once("shutdown", () => {
      this.services.ui.tutorial("");
      this.input.keyboard.resetKeys();
      this.touchHeld = {};
      this.touchPressed = {};
    });
    if (this.services.progress.saveError)
      this.services.ui.toast(
        "Browser storage is unavailable. Keep this tab open to keep your progress.",
        6000,
      );
  }
  consumeTouch(name) {
    const pressed = this.touchPressed[name];
    this.touchPressed[name] = false;
    return !!pressed;
  }
  addPlatform(x, y, w, h = 32) {
    platformArt(this, x, y, w, h, this.worldData);
    const p = this.add.rectangle(x, y + h / 2, w, h, 0xffffff, 0);
    this.platforms.add(p);
    p.body.updateFromGameObject();
    return p;
  }
  ground(pits = []) {
    let cursor = 0;
    for (const [start, width] of [...pits, [this.worldData.width, 0]]) {
      if (start > cursor)
        this.addPlatform((cursor + start) / 2, 560, start - cursor, 180);
      if (width) {
        const foam = this.add.graphics().setDepth(-1);
        foam.fillStyle(0xffffff, 0.45);
        foam.fillEllipse(start + width / 2, 700, width + 30, 45);
        for (let i = 0; i < 4; i++) foam.fillCircle(start + i * 40, 690, 20);
        this.add
          .text(start + width / 2, 655, "soft landing!", {
            fontSize: 12,
            fontFamily: "Trebuchet MS",
            color: "#456a70",
          })
          .setOrigin(0.5);
      }
      cursor = start + width;
    }
  }
  label(x, y, title, subtitle = "") {
    const t = this.add
      .text(x, y, title, {
        fontFamily: "Trebuchet MS",
        fontSize: 22,
        fontStyle: "bold",
        color: "#284951",
        stroke: "#fff5d8",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(3);
    if (subtitle)
      this.add
        .text(x, y + 30, subtitle, {
          fontFamily: "Trebuchet MS",
          fontSize: 14,
          color: "#456c68",
          backgroundColor: "#f5f2d9",
          padding: { x: 9, y: 6 },
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(3);
    return t;
  }
  buildOrigin() {
    this.ground([[790, 130]]);
    this.addPlatform(520, 465, 180);
    this.addPlatform(720, 420, 160);
    this.addPlatform(1260, 390, 230, 170);
    this.label(270, 420, "A / D  →", "Let’s go!");
    this.label(600, 325, "SPACE  ↑", "Jump and hold for a big hop");
    this.label(1030, 330, "Q  ⇄", "A little magic. Two forms.");
    this.label(1270, 290, "FORM B", "Jump up here!");
    this.label(1670, 300, "FORM A  +  K", "Dash through the star gate");
    this.originGate = this.makeBarrier(1700, 475, true);
    this.originGate.label.setText("★ DASH GATE");
    this.label(
      2080,
      330,
      "Five legends. One big rescue.",
      "A mysterious boss has captured your family!",
    );
    ["grandad", "nana", "mummy", "leah", "daddy"].forEach((id, i) => {
      this.add
        .image(1950 + i * 65, 435, id)
        .setScale(0.43)
        .setAlpha(0.8);
      this.add
        .ellipse(1950 + i * 65, 435, 53, 65, 0xffffff, 0.1)
        .setStrokeStyle(2, 0xffffff, 0.7);
    });
    this.exit = portal(this, 2420, 480);
    this.label(2410, 350, "YOUR ADVENTURE AWAITS", "E · enter the portal");
    this.addStars([
      [300, 490],
      [440, 415],
      [520, 415],
      [600, 415],
      [740, 365],
      [1020, 490],
      [1180, 335],
      [1260, 335],
      [1340, 335],
      [1810, 490],
      [1880, 490],
      [2300, 490],
    ]);
  }
  buildRescue() {
    const layout = RESCUE_LAYOUTS[this.levelId - 1];
    this.ground(layout.pits);
    layout.platforms.forEach(([x, y, w]) => this.addPlatform(x, y, w));
    this.label(
      280,
      400,
      this.worldData.name,
      "Collect stars. Follow the trail.",
    );
    this.makeCheckpoint(1630);
    this.makeMachine(1940, 350);
    this.makeBarrier(2300, 416);
    this.makeTarget(2510, 340);
    const alive = this.services.progress.armyAlive(this.worldData.owner);
    if (alive) {
      layout.encounters.forEach((x, i) =>
        this.spawnEnemy(x, 490, this.worldData.owner),
      );
      this.boss = new Boss(this, 3210, 460, this.worldData.owner);
      this.physics.add.collider(this.boss, this.platforms);
      this.makeCage(3370, 410, this.worldData.owner);
    } else {
      this.exit = portal(this, 3200, 480);
      this.label(
        3190,
        350,
        "A kingdom of friends.",
        "Army cleared! E · return to the world map",
      );
      this.add.image(3360, 515, this.worldData.owner).setScale(0.7);
    }
    this.label(
      2640,
      390,
      alive ? "ULTIMATE SHADOW AHEAD" : "ALL CLEAR!",
      alive
        ? "Jump the attack. Strike when green."
        : "Your rescue changed this world.",
    );
    const stars = [];
    for (let x = 380; x < 2550; x += 145) {
      if (
        !layout.pits.some(([start, w]) => x > start - 30 && x < start + w + 30)
      )
        stars.push([x, 490]);
    }
    layout.platforms.forEach(([x, y]) =>
      stars.push([x - 45, y - 48], [x + 35, y - 48]),
    );
    this.addStars(stars);
    if (this.worldData.owner === "nana") {
      this.addSlime(1300, true);
      this.addSlime(2460, true);
    }
    if (this.worldData.owner === "leah")
      this.time.addEvent({
        delay: 3300,
        loop: true,
        callback: () => {
          if (!this.ending && this.player.x > 2000 && this.player.x < 2530) {
            this.labelTrap ||= this.label(2340, 290, "SILLY SPLAT INCOMING!");
            this.projectile(2450, 280, "nappy", -140, -100, "leah");
          }
        },
      });
  }
  buildFinal() {
    this.ground();
    this.addPlatform(490, 455, 190);
    this.addPlatform(760, 390, 180);
    this.label(
      350,
      320,
      "THE WHOLE FAMILY IS HERE",
      "Every ally has a part to play.",
    );
    CHARACTERS.forEach((c, i) =>
      this.add.image(200 + i * 120, 510, c.id).setScale(0.6),
    );
    this.addStars([
      [420, 395],
      [490, 395],
      [560, 395],
      [720, 330],
      [800, 330],
      [970, 490],
    ]);
    this.makeCheckpoint(1050);
    this.boss = new Boss(this, 1770, 445, null, true);
    this.physics.add.collider(this.boss, this.platforms);
    this.finalMachine = this.makeMachine(1260, 515, true);
    this.label(1780, 290, FINAL_BOSS.name.toUpperCase(), FINAL_BOSS.subtitle);
  }
  spawnEnemy(x, y, owner, options = {}) {
    if (!options.finalGuard && !this.services.progress.armyAlive(owner))
      return null;
    const e = new Enemy(this, x, y, owner, options);
    this.enemies.push(e);
    this.physics.add.collider(e, this.platforms);
    return e;
  }
  makeCage(x, y, owner) {
    const g = this.add.graphics().setDepth(4);
    g.lineStyle(4, 0xffffff, 0.8);
    g.strokeRoundedRect(x - 48, y - 72, 96, 125, 42);
    g.lineStyle(3, 0x9581b3, 0.7);
    for (let i = -30; i <= 30; i += 20)
      g.lineBetween(x + i, y - 55, x + i, y + 50);
    this.captive = this.add
      .image(x, y, owner)
      .setScale(0.7)
      .setAlpha(0.65)
      .setDepth(3);
    this.cage = g;
  }
  makeCheckpoint(x) {
    this.checkpointX = x;
    this.add.rectangle(x, 490, 7, 140, 0xf9edd4).setDepth(1);
    this.flag = this.add
      .triangle(
        x + 25,
        437,
        0,
        0,
        65,
        20,
        0,
        40,
        this.checkpointReached ? 0xd5f66a : 0xffffff,
      )
      .setDepth(2);
    this.label(x, 370, "CHECKPOINT", "A fresh start & full hearts");
  }
  makeMachine(x, y, final = false) {
    const c = this.add.container(x, y).setDepth(3);
    c.add(
      this.add.rectangle(0, 0, 62, 66, 0x688f95).setStrokeStyle(3, 0x304a58),
    );
    c.add(this.add.star(0, -4, 8, 15, 24, 0xf4c674));
    const t = this.add
      .text(0, 50, "⚙ REPAIR", {
        fontFamily: "Trebuchet MS",
        fontSize: 13,
        color: "#254650",
        backgroundColor: "#fff3cd",
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5);
    c.add(t);
    const machine = { x, y, view: c, label: t, repaired: false, final };
    this.machines.push(machine);
    return machine;
  }
  makeBarrier(x, y, origin = false, final = false) {
    const h = origin ? 170 : 80,
      w = origin ? 38 : 58;
    const c = this.add.container(x, y).setDepth(4);
    c.add(
      this.add
        .rectangle(0, 0, w, h, origin ? 0x7ec7b7 : 0xef9b84)
        .setStrokeStyle(3, 0x374d5a),
    );
    for (let i = -h / 2 + 12; i < h / 2; i += 24)
      c.add(this.add.rectangle(0, i, w - 10, 9, 0xffedb1).setAngle(-12));
    const label = this.add
      .text(0, -h / 2 - 24, origin ? "DASH" : "✦ SPLAT", {
        fontFamily: "Trebuchet MS",
        fontSize: 12,
        fontStyle: "bold",
        color: "#354d57",
        backgroundColor: "#fff4d6",
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5);
    c.add(label);
    const object = { x, y, view: c, label, origin, final, broken: false };
    if (origin || final) {
      object.body = this.add.rectangle(x, y, w, h, 0xffffff, 0);
      this.blockers.add(object.body);
      object.body.body.updateFromGameObject();
    }
    this.barriers.push(object);
    return object;
  }
  makeTarget(x, y, final = false) {
    const c = this.add.container(x, y).setDepth(4);
    c.add(this.add.circle(0, 0, 26, 0xf8f3d7).setStrokeStyle(4, 0xe58475));
    c.add(this.add.circle(0, 0, 15, 0xe58475));
    c.add(this.add.circle(0, 0, 6, 0xfff5db));
    const t = this.add
      .text(0, -48, "● GOAL", {
        fontFamily: "Trebuchet MS",
        fontSize: 12,
        fontStyle: "bold",
        color: "#354d57",
        backgroundColor: "#fff4d6",
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5);
    c.add(t);
    const target = { x, y, view: c, label: t, hit: false, final };
    this.targets.push(target);
    return target;
  }
  addStars(positions) {
    this.stars = this.physics.add.staticGroup();
    positions.forEach(([x, y], id) => {
      if (this.services.progress.data.collected[`${this.levelId}:${id}`])
        return;
      const star = this.stars
        .create(x, y, "star")
        .setScale(0.72)
        .refreshBody()
        .setDepth(3);
      star.starId = id;
      this.tweens.add({
        targets: star,
        y: y - 8,
        duration: 900 + (id % 3) * 150,
        yoyo: true,
        repeat: -1,
        onUpdate: () => {
          if (star.active) star.refreshBody();
        },
      });
    });
  }
  collectStars() {
    this.physics.overlap(this.player, this.stars, (_, star) => {
      if (!star.active) return;
      if (this.services.progress.collect(this.levelId, star.starId)) {
        this.services.audio.play("star");
        burst(this, star.x, star.y, 0xffd56d, 5);
      }
      this.tweens.killTweensOf(star);
      star.destroy();
    });
  }
  isSlippery(x) {
    return (
      this.slime.some(
        (s) => s.until > this.time.now && Math.abs(s.x - x) < 90,
      ) && this.player.y > 470
    );
  }
  addSlime(x, permanent = false) {
    const view = this.add
      .ellipse(
        Phaser.Math.Clamp(x, 150, this.worldData.width - 100),
        553,
        180,
        14,
        0xa5dcd7,
        0.85,
      )
      .setDepth(1);
    this.slime.push({
      x: view.x,
      until: permanent ? Infinity : this.time.now + 6000,
      view,
    });
  }
  projectile(x, y, kind, vx, vy, owner) {
    if (this.ending) return;
    const p = this.projectileGroup
      .create(x, y, kind)
      .setScale(kind === "star" ? 0.65 : 0.85)
      .setDepth(6);
    p.kind = kind;
    p.owner = owner;
    p.setVelocity(vx * this.difficulty.enemySpeed, vy);
    p.setBounce(
      kind === "ball" || kind === "basketball"
        ? 0.8
        : kind === "nappy"
          ? 0.5
          : 0.15,
    );
    if (kind === "bubble") {
      p.body.setAllowGravity(false);
      p.setVelocityY(Math.max(-35, vy * 0.15));
    }
    p.body.setSize(25, 25, true);
    p.expires = this.time.now + 6500;
    this.projectiles.push(p);
    return p;
  }
  projectileHit(projectile) {
    if (!projectile.active || this.ending) return;
    if (projectile.kind === "potion") {
      this.player.glamourUntil = this.time.now + 1400;
      this.player.invulnerableUntil = this.time.now + 1500;
      floatingText(
        this,
        this.player.x,
        this.player.y - 60,
        "OH, FABULOUS!",
        "#ba78b4",
      );
      burst(this, this.player.x, this.player.y, 0xf2b5e7, 12);
    } else this.player.hurt(projectile.x);
    burst(this, projectile.x, projectile.y, 0xc3e5e2, 6);
    projectile.destroy();
  }
  friendlyBall(x, y, direction) {
    const ball = this.physics.add
      .image(x, y, "ball")
      .setDepth(12)
      .setScale(1.2);
    ball.body.setAllowGravity(false);
    ball.setVelocityX(direction * 650);
    ball.expires = this.time.now + 2000;
    ball.hitEnemies = new Set();
    this.friendlyBalls ||= [];
    this.friendlyBalls.push(ball);
  }
  melee(x, y, direction, range, damage, kind) {
    for (const e of this.enemies) {
      if (
        e.active &&
        Math.abs(e.x - x) < range &&
        Math.abs(e.y - y) < 95 &&
        (e.x - x) * direction > -30 &&
        e.friendlyUntil < this.time.now
      )
        e.hit(damage);
    }
    const b = this.boss;
    if (
      b?.active &&
      Math.abs(b.x - x) < range + 25 &&
      Math.abs(b.y - y) < 125 &&
      (b.x - x) * direction > -45
    )
      b.hit(damage, kind);
  }
  dashContact(p) {
    for (const e of this.enemies) {
      if (
        e.active &&
        Math.abs(e.x - p.x) < 68 &&
        Math.abs(e.y - p.y) < 80 &&
        !p.dashHits.has(e)
      ) {
        p.dashHits.add(e);
        e.hit(2);
      }
    }
    if (
      this.boss?.active &&
      Math.abs(this.boss.x - p.x) < 105 &&
      Math.abs(this.boss.y - p.y) < 120 &&
      !p.dashHits.has(this.boss)
    ) {
      p.dashHits.add(this.boss);
      this.boss.hit(2, "dash");
    }
    if (
      this.levelId === 0 &&
      this.originGate &&
      !this.originGate.broken &&
      Math.abs(p.x - this.originGate.x) < 105
    ) {
      if (this.originActions.highJump) {
        this.destroyBarrier(this.originGate);
        this.originActions.dash = true;
        this.services.ui.toast("Two forms. One brilliant hero!");
      } else
        this.services.ui.toast(
          "First, use Form B to jump onto the tall ledge.",
        );
    }
  }
  repairNearby(x) {
    for (const m of this.machines) {
      if (!m.repaired && Math.abs(m.x - x) < 230) {
        m.repaired = true;
        m.label.setText("✓ FIXED!");
        m.view.list[0].setFillStyle(0x96c994);
        burst(this, m.x, m.y, 0xc9f399, 25);
        if (!m.final) {
          this.player.health = Math.min(
            this.player.maxHealth,
            this.player.health + 2,
          );
          this.addPlatform(m.x + 80, m.y - 65, 150);
          this.services.ui.toast(
            "Grandad fixed a new stepping stone! +2 hearts",
          );
        }
      }
    }
  }
  destroyBarrier(b) {
    if (b.broken) return;
    b.broken = true;
    burst(this, b.x, b.y, 0xffb78f, 25);
    b.view.destroy();
    b.body?.destroy();
  }
  breakBarriers(x) {
    for (const b of this.barriers) {
      if (!b.origin && !b.broken && Math.abs(b.x - x) < 330) {
        this.destroyBarrier(b);
        if (!b.final) {
          this.player.health = Math.min(
            this.player.maxHealth,
            this.player.health + 1,
          );
          this.services.ui.toast("SPLAT! A secret heart was inside!");
        }
      }
    }
  }
  tryFinalAlly(id, nearby) {
    if (
      this.levelId !== 6 ||
      !this.arenaStarted ||
      !this.boss?.active ||
      this.finalStage >= 5
    )
      return;
    const stage = FINAL_STAGES[this.finalStage];
    if (id !== stage.ally) return;
    let done = false;
    if (id === "grandad") done = this.finalMachine.repaired;
    if (id === "nana")
      done =
        this.finalGuards?.length > 0 &&
        this.finalGuards.every(
          (e) => e.active && e.friendlyUntil > this.time.now,
        );
    if (id === "mummy")
      done =
        this.finalGuards?.length > 0 &&
        this.finalGuards.every((e) => e.active && e.poseUntil > this.time.now);
    if (id === "leah") done = this.finalBarrier?.broken;
    if (done) this.advanceFinal();
  }
  advanceFinal() {
    if (this.finalStage >= 5) return;
    const id = FINAL_STAGES[this.finalStage].ally;
    this.boss.health = Math.max(2, this.boss.health - 2);
    burst(this, this.boss.x, this.boss.y, 0xd5f66a, 25);
    this.services.ui.toast(
      `${CHARACTERS.find((c) => c.id === id).name}: teamwork makes the magic!`,
      2000,
    );
    this.finalGuards?.forEach((e) => {
      if (e.active) e.remove(true);
    });
    this.finalStage++;
    if (this.finalStage === 1 || this.finalStage === 2) {
      this.finalGuards = [
        this.spawnEnemy(1430, 490, "bigboss", { finalGuard: true }),
        this.spawnEnemy(1530, 490, "bigboss", { finalGuard: true }),
      ];
    }
    if (this.finalStage === 3)
      this.finalBarrier = this.makeBarrier(1460, 505, false, true);
    if (this.finalStage === 4)
      this.finalTarget = this.makeTarget(1740, 500, true);
    if (this.finalStage === 5) {
      this.services.ui.toast(
        "Your turn! Dash into the boss as Form A. Then switch and power pop!",
        5000,
      );
      this.boss.warning = "Form A dash → Form B power pop!";
    }
  }
  finalHeroHit(kind) {
    if (this.finalStage !== 5) {
      if (this.time.now > (this.shieldHint || 0)) {
        this.shieldHint = this.time.now + 1600;
        this.services.ui.toast(
          "Your allies can open the way. Follow the team task above!",
          1500,
        );
      }
      return false;
    }
    if (kind === "dash" && this.player.form === "A" && !this.finalDash) {
      this.finalDash = true;
      this.boss.health = 1;
      burst(this, this.boss.x, this.boss.y, 0x68dacf, 30);
      this.services.ui.toast(
        "Great dash! Q to Form B, then K for the final power pop!",
        4000,
      );
      return true;
    }
    if (kind === "power" && this.player.form === "B" && this.finalDash) {
      this.boss.health = 0;
      this.boss.defeated();
      return true;
    }
    return false;
  }
  interact() {
    if (this.ending) return;
    const p = this.player;
    if (this.exit && Math.abs(p.x - this.exit.x) < 135) {
      if (this.levelId === 0) {
        if (!this.originActions.highJump || !this.originActions.dash) {
          this.services.ui.toast(
            "Try both forms first: B for the tall ledge, then A + K for the gate.",
            4000,
          );
          return;
        }
        this.services.progress.completeOrigin();
        this.services.audio.play("win");
        this.services.ui.map();
      } else this.services.ui.map();
      return;
    }
    const machine = this.machines.find(
      (m) => !m.repaired && Math.abs(m.x - p.x) < 160,
    );
    if (machine) {
      this.services.ui.toast(
        "Grandad can fix this! Equip him with TAB and press L.",
      );
      return;
    }
    this.services.ui.toast(
      "E opens portals. J attacks. K uses your special power.",
      1800,
    );
  }
  fall() {
    if (this.ending) return;
    const p = this.player;
    this.services.audio.play("hurt");
    p.health--;
    if (p.health <= 0) {
      this.defeat();
      return;
    }
    p.body.reset(this.spawn.x, this.spawn.y);
    p.setVelocity(0, 0);
    p.invulnerableUntil = this.time.now + 2200;
    p.dashUntil = 0;
    p.body.setAllowGravity(true);
    this.services.ui.toast("Boing! Back to safety. You’ve got this!", 1800);
  }
  defeat() {
    if (this.ending) return;
    this.ending = true;
    this.physics.pause();
    this.player.setTint(0xffcbac);
    burst(this, this.player.x, this.player.y, 0xffbb83, 25);
    this.services.ui.defeat();
  }
  rescue(owner) {
    if (this.ending) return;
    this.ending = true;
    this.services.progress.rescue(owner);
    this.enemies.forEach((e) => {
      if (e.active && e.owner === owner) e.remove(true);
    });
    this.projectileGroup.clear(true, true);
    this.cage?.destroy();
    if (this.captive) {
      this.captive.setAlpha(1);
      this.tweens.add({
        targets: this.captive,
        y: 480,
        scale: 1.1,
        duration: 850,
        ease: "Back.out",
      });
    }
    this.physics.pause();
    this.services.audio.play("win");
    for (let i = 0; i < 5; i++)
      this.time.delayedCall(i * 170, () =>
        burst(this, 2950 + i * 100, 340, 0xd5f66a, 25),
      );
    this.time.delayedCall(1450, () => this.services.ui.rescue(owner));
  }
  finalVictory() {
    if (this.ending) return;
    this.ending = true;
    this.services.progress.completeFinal();
    this.physics.pause();
    this.projectileGroup.clear(true, true);
    this.enemies.forEach((e) => {
      if (e.active) e.remove(true);
    });
    this.services.audio.play("win");
    CHARACTERS.forEach((c, i) => {
      const a = this.add
        .image(1220 + i * 115, 505, c.id)
        .setScale(0.9)
        .setDepth(15);
      this.tweens.add({
        targets: a,
        y: 480,
        duration: 450 + i * 30,
        yoyo: true,
        repeat: -1,
      });
    });
    for (let i = 0; i < 10; i++)
      this.time.delayedCall(i * 170, () =>
        burst(this, 1150 + i * 80, 300, 0xd5f66a, 30),
      );
    this.time.delayedCall(2000, () => this.services.ui.victory());
  }
  update(time, delta) {
    if (!this.player || this.ending) return;
    this.player.update(time, delta);
    if (this.ending || !this.scene.isActive()) return;
    this.collectStars();
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.update(time);
      if (e.active && e.friendlyUntil < time && e.poseUntil < time) {
        this.physics.overlap(this.player, e, () => {
          if (this.player.body.velocity.y > 100 && this.player.y < e.y - 30) {
            e.hit(2);
            this.player.setVelocityY(-380);
          } else this.player.hurt(e.x, e.owner === "grandad");
        });
      }
    }
    if (
      this.checkpointX &&
      !this.checkpointReached &&
      Math.abs(this.player.x - this.checkpointX) < 65
    ) {
      this.checkpointReached = true;
      this.spawn = { x: this.checkpointX, y: 480 };
      this.player.health = this.player.maxHealth;
      this.flag.setFillStyle(0xd5f66a);
      this.services.progress.setCheckpoint(this.levelId, true);
      burst(this, this.checkpointX, 450, 0xd5f66a, 22);
      this.services.ui.toast("Checkpoint! Full hearts. Progress saved.");
    }
    if (this.boss?.active) {
      if (!this.arenaStarted && this.player.x > this.arenaStart + 35) {
        this.arenaStarted = true;
        this.services.ui.tutorial("");
        this.boss.start();
        const wall = this.add
          .rectangle(this.arenaStart - 25, 350, 28, 420, 0x9bb5a1, 0.25)
          .setStrokeStyle(2, 0xffffff, 0.7);
        this.blockers.add(wall);
        wall.body.updateFromGameObject();
      }
      this.boss.update(time);
      if (this.boss.activeFight && this.boss.state !== "recovery")
        this.physics.overlap(this.player, this.boss, () =>
          this.player.hurt(this.boss.x, this.boss.owner === "grandad"),
        );
    }
    for (const p of this.projectiles) {
      if (p.active) {
        p.rotation += delta * 0.003;
        if (
          time > p.expires ||
          p.y > 740 ||
          p.x < -100 ||
          p.x > this.worldData.width + 100
        )
          p.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.active);
    for (const s of this.slime) {
      if (s.view.active && time > s.until) s.view.destroy();
    }
    for (const ball of this.friendlyBalls || []) {
      if (!ball.active) continue;
      ball.rotation += delta * 0.015;
      if (time > ball.expires) {
        ball.destroy();
        continue;
      }
      for (const e of this.enemies) {
        if (
          e.active &&
          Math.abs(e.x - ball.x) < 55 &&
          Math.abs(e.y - ball.y) < 90 &&
          !ball.hitEnemies.has(e)
        ) {
          ball.hitEnemies.add(e);
          e.hit(5);
        }
      }
      if (
        this.boss?.active &&
        Math.abs(this.boss.x - ball.x) < 85 &&
        Math.abs(this.boss.y - ball.y) < 120 &&
        !ball.hitEnemies.has(this.boss)
      ) {
        ball.hitEnemies.add(this.boss);
        this.boss.hit(4, "ally");
      }
      for (const t of this.targets) {
        if (
          !t.hit &&
          Math.abs(t.x - ball.x) < 50 &&
          Math.abs(t.y - ball.y) < 60
        ) {
          t.hit = true;
          t.label.setText("GOOOAL!");
          t.view.setAlpha(0.5);
          burst(this, t.x, t.y, 0xd5f66a, 22);
          if (t.final && this.finalStage === 4) this.advanceFinal();
          else {
            this.player.health = Math.min(
              this.player.maxHealth,
              this.player.health + 1,
            );
            this.services.ui.toast("GOOOAL! +1 heart");
          }
        }
      }
    }
    // The finale uses Big Boss-owned guards. Rescued characters' armies stay gone.
    if (
      this.levelId === 6 &&
      (this.finalStage === 1 || this.finalStage === 2) &&
      this.finalGuards?.some((e) => !e.active)
    ) {
      this.finalGuards.forEach((e) => {
        if (e.active) e.remove(false);
      });
      this.finalGuards = [
        this.spawnEnemy(1430, 490, "bigboss", { finalGuard: true }),
        this.spawnEnemy(1530, 490, "bigboss", { finalGuard: true }),
      ];
    }
    if (this.levelId === 0) {
      const hint = [...ORIGIN_HINTS]
        .reverse()
        .find((h) => this.player.x >= h.x);
      this.services.ui.tutorial(hint.text);
      if (this.player.x > 800 && !this.magicSeen) {
        this.magicSeen = true;
        burst(this, this.player.x, this.player.y, 0xa2e7d7, 35);
        this.services.ui.toast(
          "A spark of magic… press Q to discover your other form!",
          3500,
        );
      }
    }
    if (time > (this.nextHUD || 0)) {
      this.nextHUD = time + 70;
      this.services.ui.updateHUD();
    }
  }
}
