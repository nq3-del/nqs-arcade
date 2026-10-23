import * as THREE from "three";
import { HERO_FORMS, FINAL_BOSS } from "../data/config.js";
import { SuperTransformation } from './SuperTransformation.js';
import { HyperPower } from './HyperPower.js';

export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const direction = (a, b) => {
  const d = Math.max(0.001, distance(a, b));
  return { x: (b.x - a.x) / d, z: (b.z - a.z) / d };
};

export class DioramaPlayer {
  constructor(scene, x, z, slot = 0) {
    this.slot = slot;
    this.controls = scene.inputFor(slot);
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
    this.vz = 0;
    this.form = slot === 1 ? "B" : "A";
    this.health = scene.difficulty.health;
    this.maxHealth = this.health;
    this.abilityReady = 0;
    this.attackReady = 0;
    this.invulnerableUntil = 0;
    this.dashUntil = 0;
    this.glamourUntil = 0;
    this.facing = { x: 0.7, z: -0.7 };
    this.lebronEquipped = scene.services.progress.data?.lebronUnlocked && scene.services.progress.data.lebronEquipped?.[slot] === true;
    this.curryEquipped = scene.services.progress.data?.curryUnlocked && scene.services.progress.data.curryEquipped?.[slot] === true;
    this.viniEquipped = scene.services.progress.data?.viniUnlocked && scene.services.progress.data.viniEquipped?.[slot] === true;
    this.squidwardEquipped = scene.services.progress.data?.squidwardUnlocked && scene.services.progress.data.squidwardEquipped?.[slot] === true;
    this.actor = this.squidwardEquipped ? scene.view.handsomeSquidward() : this.viniEquipped ? scene.view.viniJr() : this.curryEquipped ? scene.view.stephCurry() : this.lebronEquipped ? scene.view.lebronJames() : scene.view.character(this.form);
    this.ring = scene.view.marker(x, z, slot ? "#85cce4" : "#efd098");
    this.jumpQueue = -1000;
    this.lastGround = 0;
    this.active = true;
    this.dashHits = new Set();
    this.superPower = new SuperTransformation(this);
    this.hyperPower = new HyperPower(this);
  }
  config() {
    return HERO_FORMS[this.form];
  }
  get basketballEquipped() { return this.lebronEquipped || this.curryEquipped; }
  get sportsEquipped() { return this.basketballEquipped || this.viniEquipped; }
  switchForm() {
    if(this.squidwardEquipped)return;
    if(this.scene.replayMode && this.scene.levelId===0 && this.superPower.active)this.scene.originActions.switched=true;
    if (this.superPower.active || this.superPower.busy) return;
    this.scene.view.remove(this.actor);
    this.form = this.form === "A" ? "B" : "A";
    this.actor = this.squidwardEquipped ? this.scene.view.handsomeSquidward() : this.viniEquipped ? this.scene.view.viniJr() : this.curryEquipped ? this.scene.view.stephCurry() : this.lebronEquipped ? this.scene.view.lebronJames() : this.scene.view.character(this.form);
    this.scene.view.effect(
      this.x,
      this.z,
      this.form === "A" ? "#db8a8e" : "#e4c26c",
      24,
    );
    this.scene.services.audio.play("switch");
    this.scene.originActions.switched = true;
    this.sync(0);
    this.scene.director?.bark(`v-hero-${this.form.toLowerCase()}-switch`);
  }
  combatSuppressed() {return this.squidwardEquipped || this.statusSuppressed();}
  statusSuppressed() {return this.scene.time.now < Math.max(this.glamourUntil||0,this.pvpGlamourUntil||0,this.kindnessUntil||0);}
  attack(power = false) {
    if(this.combatSuppressed())return;
    if (this.hyperPower.active) { this.hyperPower.fire(); return; }
    const s = this.scene,
      now = s.time.now;
    if (now < this.attackReady || now < this.glamourUntil) return;
    this.attackReady = now + 320;
    s.melee(this, power ? 3.2 : 2.1, power ? 3 : 1, power ? "power" : "basic");
    s.view.effect(
      this.x + this.facing.x,
      this.z + this.facing.z,
      power ? "#edd499" : "#eee6cd",
      power ? 20 : 9,
    );
    s.services.audio.play("pop");
    this.swingUntil = now + 180;
  }
  ability() {
    if(this.combatSuppressed())return;
    if(this.scene.replayMode && this.scene.levelId===0 && (this.sportsEquipped||this.superPower.active)){
      if(this.scene.originStep===3)this.scene.melee(this,3.2,3,'power');
      if(this.scene.originStep===4)this.scene.dashContact(this);
    }
    if (this.scene.replayMode && (this.sportsEquipped || this.superPower.active))
      this.scene.adventure?.action(this.scene.adventure.task?.kind === 'dash' ? 'dash' : 'power', this);
    if (this.viniEquipped) {
      if (this.scene.football) {this.scene.football.shoot(this,true);return;}
      if (!this.scene.replayMode) {this.scene.services.ui.toast('Visit the stadium football goals to shoot.');return;}
    }
    if (this.basketballEquipped) {
      if (this.scene.basketball) {this.scene.basketball.shoot(this, true);return;}
      if (!this.scene.replayMode) {this.scene.services.ui.toast('Visit the stadium basketball courts to use your flaming shot.');return;}
    }
    if (this.superPower.active) { this.hyperPower.activate(); return; }
    const s = this.scene,
      now = s.time.now;
    if (now < this.abilityReady || now < this.glamourUntil) return;
    this.abilityReady = now + this.config().cooldown;
    if (this.form === "A") {
      this.dashUntil = now + this.config().diorama.dashDuration;
      this.dashSpeed = this.config().diorama.dashSpeed;
      this.invulnerableUntil = Math.max(this.invulnerableUntil, now + 400);
      this.dashHits.clear();
      s.services.audio.play("dash");
    } else this.attack(true);
    s.director?.bark(`v-hero-${this.form.toLowerCase()}-power`);
  }
  hurt(source, throwing = false) {
    const s = this.scene,
      now = s.time.now;
    if (now < this.invulnerableUntil || s.ending || s.cinematic || this.superPower.busy || this.superPower.active) return;
    this.health--;
    this.invulnerableUntil = now + s.difficulty.invulnerability;
    const d = direction(source, this);
    this.vx = d.x * 9;
    this.vz = d.z * 9;
    this.knockUntil = now + 240;
    this.vy = throwing ? 8 : 4;
    s.view.effect(this.x, this.z, "#dcae9f", 10);
    s.services.audio.play("hurt");
    s.director?.bark(`v-hero-${this.form.toLowerCase()}-hurt`);
    if (throwing)
      s.services.ui.toast("Wheee! A very unexpected flying lesson.", 1800);
    if (this.health <= 0) s.playerDefeated(this);
  }
  update(dt) {
    if (this.downed || this.launched) {
      this.sync(dt);
      return;
    }
    const s = this.scene,
      now = s.time.now;
    this.hyperPower.update(dt);
    if (this.controls.pressed('s') || this.controls.pressed('super')) this.superPower.toggle();
    this.superPower.update(dt);
    if (this.superPower.busy) {
      this.sync(dt);
      return;
    }
    if (this.controls.pressed("q")) this.switchForm();
    if (this.controls.pressed('r')) this.toggleLeBron();
    if (this.controls.pressed('y')) this.toggleCurry();
    if (this.controls.pressed('u')) this.toggleVini();
    if (this.controls.pressed('h')) this.toggleSquidward();
    if (this.controls.pressed('i')) this.celebrate();
    if (this.controls.pressed('t') && this.sportsEquipped && !this.combatSuppressed()) {
      if (this.viniEquipped && s.football) s.football.shoot(this);
      else if (this.basketballEquipped && s.basketball) s.basketball.shoot(this);
      else s.services.ui.toast('Visit the stadium to take a shot.');
    }
    if (this.controls.pressed("j")) this.attack();
    if (this.controls.pressed("k")) this.ability();
    if (this.controls.pressed("tab")) this.allies.cycle();
    if (this.controls.pressed("l")) this.allies.use();
    if (this.controls.pressed("e")) {
      s.interact(this);
      if (s.ending || s.cinematic || !s.scene.isActive()) return;
    }
    if (this.controls.pressed("space") && !this.superPower.active) this.jumpQueue = now;
    if (this.y <= s.view.floorHeight(this.x, this.z) + 0.01)
      this.lastGround = now;
    if (!this.superPower.active && now - this.jumpQueue < 160 && now - this.lastGround < 130) {
      this.vy = this.config().diorama.jump;
      this.jumpQueue = -1000;
      this.lastGround = -1000;
      s.services.audio.play("jump");
      s.director?.bark(`v-hero-${this.form.toLowerCase()}-jump`);
    }
    let dx =
      Number(this.controls.down("right") || this.controls.down("d")) -
      Number(this.controls.down("left") || this.controls.down("a"));
    let dz =
      Number(this.controls.down("down")) -
      Number(this.controls.down("up") || this.controls.down("w"));
    const length = Math.hypot(dx, dz);
    if (length) {
      dx /= length;
      dz /= length;
    }
    const wx = (dx + dz) * 0.7071,
      wz = (dz - dx) * 0.7071;
    const speed =
      this.config().diorama.speed * (this.superPower.active ? 1.6 : 1) * (this.statusSuppressed() ? 0.6 : 1) * (s.pvp?.enabled ? Math.min(s.basketball?.speedMultiplier(this) ?? 1,s.football?.speedMultiplier(this) ?? 1) : 1);
    if (now < this.dashUntil) {
      this.vx = this.facing.x * this.dashSpeed;
      this.vz = this.facing.z * this.dashSpeed;
      s.dashContact(this);
      if (Math.floor(now / 65) !== this.trail) {
        this.trail = Math.floor(now / 65);
        s.view.effect(this.x, this.z, "#dbe5cc", 3);
      }
    } else if (now > (this.knockUntil || 0)) {
      const blend = 1 - Math.exp(-dt * (s.isSlippery(this.x, this.z) ? 4 : 15));
      this.vx = THREE.MathUtils.lerp(this.vx, wx * speed, blend);
      this.vz = THREE.MathUtils.lerp(this.vz, wz * speed, blend);
      if (length) this.facing = { x: wx, z: wz };
    }
    const nx = this.x + this.vx * dt,
      nz = this.z + this.vz * dt;
    const airborne = this.superPower.active && this.y > 0.7;
    const inside = (x, z) => Math.abs(x) < (s.definition.bounds?.[0] || 13) - 0.8 &&
      Math.abs(z) < (s.definition.bounds?.[1] || 10) - 0.8;
    if ((airborne ? inside(nx, this.z) : s.view.walkable(nx, this.z)) && !s.blocked(nx, this.z, this))
      this.x = nx;
    if ((airborne ? inside(this.x, nz) : s.view.walkable(this.x, nz)) && !s.blocked(this.x, nz, this))
      this.z = nz;
    if (this.superPower.active) {
      this.vy = (Number(this.controls.down('space')) - Number(this.controls.down('c'))) * 5;
    } else this.vy -= dt * 17;
    const oldY = this.y;
    this.y += this.vy * dt;
    if (s.view.sportsBlocked?.(this.x, this.y, this.z, this.collisionHeight())) { this.y = oldY; this.vy = 0; }
    if (this.superPower.active) this.y = Math.min(8, this.y);
    const floor = s.view.floorHeight(this.x, this.z);
    if (this.y <= floor && this.vy < 0) {
      this.y = floor;
      this.vy = 0;
    }
    if (!this.superPower.active && this.y <= floor && !s.view.walkable(this.x, this.z)) s.fall(this);
    if (s.view.wet(this.x, this.z) && this.y < 0.15 && now > this.dashUntil) {
      this.wetTime = (this.wetTime || 0) + dt;
      if (this.wetTime > 0.65) s.fall(this);
    } else this.wetTime = 0;
    this.sync(dt);
  }
  setSuperAppearance(active) {
    if (active) { this.glamourUntil = 0; this.knockUntil = 0; this.invulnerableUntil = 0; }
    this.scene.view.remove(this.actor);
    this.actor = this.squidwardEquipped ? this.scene.view.handsomeSquidward() : this.viniEquipped ? this.scene.view.viniJr() : this.curryEquipped ? this.scene.view.stephCurry() : this.lebronEquipped ? this.scene.view.lebronJames() : active ? this.scene.view.superGoku(this.hyperPower?.active) : this.scene.view.character(this.form);
    this.jumpQueue = -1000;
    this.vy = 0;
    this.sync(0);
  }
  setLeBronEquipped(equipped) {
    if (!this.scene.services.progress.equipLeBron(this.slot, equipped)) return false;
    this.lebronEquipped = equipped;
    if (equipped) {this.squidwardEquipped=false;this.curryEquipped = false;this.viniEquipped = false;}
    const vy = this.vy;
    this.setSuperAppearance(this.superPower.active);
    this.vy = vy;
    return true;
  }
  toggleLeBron() {
    if (this.superPower.busy || this.downed || this.launched || this.scene.cinematic || this.scene.ending ||
      !this.scene.services.progress.data?.lebronUnlocked) return false;
    return this.setLeBronEquipped(!this.lebronEquipped);
  }
  setCurryEquipped(equipped) {
    if (!this.scene.services.progress.equipCurry(this.slot, equipped)) return false;
    this.curryEquipped = equipped;
    if (equipped) {this.squidwardEquipped=false;this.lebronEquipped = false;this.viniEquipped = false;}
    const vy=this.vy;this.setSuperAppearance(this.superPower.active);this.vy=vy;return true;
  }
  toggleCurry() {
    if (this.superPower.busy || this.downed || this.launched || this.scene.cinematic || this.scene.ending ||
      !this.scene.services.progress.data?.curryUnlocked) return false;
    return this.setCurryEquipped(!this.curryEquipped);
  }
  clearBasketballSkin() {
    if (this.squidwardEquipped) this.setSquidwardEquipped(false);
    if (this.lebronEquipped) this.setLeBronEquipped(false);
    if (this.curryEquipped) this.setCurryEquipped(false);
    if (this.viniEquipped) this.setViniEquipped(false);
  }
  setViniEquipped(equipped) {
    if (!this.scene.services.progress.equipVini(this.slot,equipped)) return false;
    this.viniEquipped=equipped;if(equipped){this.squidwardEquipped=false;this.lebronEquipped=false;this.curryEquipped=false;}
    const vy=this.vy;this.setSuperAppearance(this.superPower.active);this.vy=vy;return true;
  }
  toggleVini() {
    if(this.superPower.busy||this.downed||this.launched||this.scene.cinematic||this.scene.ending||!this.scene.services.progress.data?.viniUnlocked)return false;
    return this.setViniEquipped(!this.viniEquipped);
  }
  setSquidwardEquipped(equipped) {
    if(!this.scene.services.progress.equipSquidward(this.slot,equipped))return false;
    this.squidwardEquipped=equipped;
    if(equipped) {
      this.lebronEquipped=this.curryEquipped=this.viniEquipped=false;
      this.hyperPower.cancel();this.superPower.destroy();this.superPower.phase='normal';
      this.dashUntil=this.swingUntil=0;this.vx=this.vz=this.vy=0;
    }
    this.setSuperAppearance(false);return true;
  }
  toggleSquidward() {
    if(this.superPower.busy||this.downed||this.launched||this.scene.cinematic||this.scene.ending)return false;
    return this.setSquidwardEquipped(!this.squidwardEquipped);
  }
  celebrate() {
    if(!this.viniEquipped||this.downed||this.superPower.busy||this.scene.time.now<(this.celebrationReady||0))return false;
    this.celebrationReady=this.scene.time.now+3000;this.celebratingUntil=this.scene.time.now+1700;
    this.scene.services.audio.play('win');return true;
  }
  collisionHeight() { return this.superPower.active || this.sportsEquipped ? 2.65 : 1.9; }
  sync(dt) {
    const now = this.scene.time.now;
    this.ring.position.set(this.x, 0.33, this.z);
    const moving = Math.hypot(this.vx, this.vz) > 0.4;
    this.actor.root.position.set(
      this.x,
      0.28 +
        this.y +
        (moving
          ? Math.abs(Math.sin(now / 115)) * 0.065
          : Math.sin(now / 650) * 0.025),
      this.z,
    );
    const angle = Math.atan2(this.facing.x, this.facing.z);
    this.actor.rig?.legs.forEach((leg, i) => {
      leg.rotation.x = this.downed
        ? 0
        : this.viniEquipped && i===0 && now<(this.kickingUntil||0) ? -1.2
        : this.y > 0.15
          ? -0.3
          : moving
            ? Math.sin(now / 115 + i * Math.PI) * 0.48
            : Math.sin(now / 900 + i) * 0.025;
    });
    this.actor.rig?.arms.forEach((arm, i) => {
      arm.rotation.x = this.basketballEquipped && now < (this.shootingUntil || 0) ? -2.55 : this.hyperPower.active && now < (this.swingUntil || 0) ? -Math.PI / 2 : 0;
      if(this.viniEquipped&&now<(this.celebratingUntil||0))arm.rotation.x=-1.5+Math.sin(now/100)*.4;
      arm.rotation.z =
        Math.sin(now / (moving ? 130 : 650) + i) * (moving ? 0.07 : 0.025);
    });
    this.actor.rig?.stalks.forEach((stalk, i) => {
      stalk.rotation.z =
        Math.sin(now / (moving ? 190 : 1000) + i) * (moving ? 0.025 : 0.012);
    });
    let delta = angle - this.actor.root.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    this.actor.root.rotation.y += delta * Math.min(1, dt * 10);
    this.actor.body.rotation.z = this.downed
      ? 1.25
      : now < (this.swingUntil || 0)
        ? Math.sin(now / 50) * 0.18
        : moving
          ? Math.sin(now / 115) * 0.035
          : 0;
    this.actor.root.visible = this.superPower.busy || !(
      now < this.invulnerableUntil && Math.floor(now / 110) % 2
    );
  }
}

export class DioramaEnemy {
  constructor(scene, x, z, owner, guard = false) {
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.home = { x, z };
    this.owner = owner;
    this.guard = guard;
    this.health = 3;
    this.active = true;
    this.friendlyUntil = 0;
    this.poseUntil = 0;
    this.nextAttack = scene.time.now + 1300;
    this.actor = scene.view.character(owner, true);
    this.actor.root.position.set(x, 0.28, z);
    this.warning = null;
  }
  hit(amount) {
    if (!this.active) return;
    this.health -= amount;
    this.scene.view.effect(this.x, this.z, "#c2afce", 8);
    if (this.health <= 0) this.remove();
  }
  remove() {
    this.active = false;
    this.scene.view.effect(this.x, this.z, "#d5c5d9", 16);
    this.scene.view.remove(this.actor);
    this.scene.view.remove(this.warning);
  }
  update(dt) {
    if (!this.active) return;
    const s = this.scene,
      now = s.time.now,
      p = s.nearestPlayer(this);
    let target = this.home,
      speed = 0.7 * s.difficulty.enemySpeed;
    if (now < this.poseUntil) {
      this.actor.body.rotation.z = Math.sin(now / 250) * 0.13;
      this.actor.root.rotation.y = now / 1600;
      return;
    }
    if (now < this.friendlyUntil) {
      target = p;
      speed = 1.5;
      if (distance(this, p) < 1.7) speed = 0;
      if (now > (this.nextHelp || 0)) {
        this.nextHelp = now + 1000;
        const enemy = s.enemies.find(
          (e) =>
            e !== this &&
            e.active &&
            e.friendlyUntil < now &&
            distance(e, this) < 3,
        );
        enemy?.hit(1);
        if (s.boss?.active && distance(s.boss, this) < 3) s.boss.hit(1, "ally");
      }
    } else if (distance(this, p) < 6) {
      target = p;
      speed = distance(this, p) < 1.2 ? 0 : 1.1 * s.difficulty.enemySpeed;
    }
    const d = direction(this, target);
    speed *= Math.min(s.basketball?.speedMultiplier(this) ?? 1,s.football?.speedMultiplier(this) ?? 1);
    const nx = this.x + d.x * speed * dt,
      nz = this.z + d.z * speed * dt;
    if (!s.blocked(nx, nz) && s.view.walkable(nx, nz)) {
      this.x = nx;
      this.z = nz;
    }
    this.actor.root.position.set(
      this.x,
      0.28 + Math.abs(Math.sin(now / 190)) * 0.035,
      this.z,
    );
    this.actor.root.rotation.y = Math.atan2(d.x, d.z);
    if (now < this.friendlyUntil) return;
    if (now > this.nextAttack && distance(this, p) < 6) {
      this.nextAttack = now + 3000;
      this.warning = s.view.marker(this.x, this.z, "#ddb293");
      s.time.delayedCall(650, () => {
        s.view.remove(this.warning);
        if (
          !this.active ||
          s.ending ||
          s.cinematic ||
          this.friendlyUntil > s.time.now ||
          this.poseUntil > s.time.now
        )
          return;
        const dir = direction(this, p);
        if (this.owner === "grandad" || this.owner === "leah") {
          this.x += dir.x * 0.8;
          this.z += dir.z * 0.8;
          if (distance(this, p) < 1.7 && p.y < 1)
            p.hurt(this, this.owner === "grandad");
        } else
          s.projectile(
            this.x,
            this.z,
            {
              nana: "bubble",
              mummy: "potion",
              leah: "nappy",
              daddy: "ball",
              bigboss: "star",
            }[this.owner] || "star",
            dir,
            3.5,
            this.owner,
          );
      });
    }
  }
}

export class DioramaBoss {
  constructor(scene, owner, final = false) {
    this.scene = scene;
    this.owner = owner;
    this.final = final;
    this.x = scene.definition.boss?.[0] ?? 8;
    this.z = scene.definition.boss?.[1] ?? -5;
    this.active = true;
    this.activeFight = false;
    this.health = this.maxHealth = final
      ? 12
      : Math.ceil(18 * scene.difficulty.bossHealth);
    this.actor = scene.view.character(
      final ? FINAL_BOSS.modelKey : owner,
      true,
    );
    this.actor.root.scale.setScalar(final ? 1.25 : 1.15);
    this.actor.root.position.set(this.x, 0.28, this.z);
    this.state = "waiting";
    this.stateUntil = Infinity;
    this.cycle = 0;
    this.nextDamage = 0;
    this.name = final ? "Big Boss" : `Ultimate Shadow ${scene.character.name}`;
    this.warning = "";
  }
  start() {
    this.activeFight = true;
    this.enter("warning");
  }
  enter(state) {
    const s = this.scene;
    this.state = state;
    s.view.remove(this.marker);
    s.view.remove(this.line);
    const now = s.time.now;
    if (state === "warning") {
      this.cycle++;
      this.stateUntil = now + (s.difficulty.health === 8 ? 1500 : 1100);
      this.aim = direction(this, s.nearestPlayer(this));
      this.marker = s.view.marker(this.x, this.z, "#e8b18d");
      this.marker.scale.setScalar(2);
      this.warning = this.final
        ? "The puppet is preparing a spell…"
        : {
            grandad: "Judo charge — move aside, then strike!",
            nana: "Here come the bubbles. Keep moving!",
            mummy: `Potion ${1 + ((this.cycle - 1) % 3)} of 3 — a fabulous surprise!`,
            leah: "A very silly charge is coming!",
            daddy:
              this.cycle % 2
                ? "Bouncing balls — watch their path!"
                : "Power shot — step out of the line!",
          }[this.owner];
      if (["grandad", "leah", "daddy"].includes(this.owner)) {
        this.line = s.view.box(
          this.x + this.aim.x * 2.5,
          0.34,
          this.z + this.aim.z * 2.5,
          1.4,
          0.025,
          5,
          "#deb690",
          s.view.root,
          0.02,
        );
        this.line.rotation.y = Math.atan2(this.aim.x, this.aim.z);
        this.line.material = s.view.material("#d99a81", {
          transparent: true,
          opacity: 0.36,
        });
        this.line.castShadow = false;
      }
    }
    if (state === "attack") {
      this.stateUntil = now + 900;
      this.warning = "Keep moving!";
      this.fire();
    }
    if (state === "recovery") {
      this.stateUntil = now + (this.owner === "daddy" ? 1800 : 2500);
      this.warning = this.final
        ? "A moment for teamwork."
        : "The shadow is tired. Your turn — J or K!";
      this.marker = s.view.marker(this.x, this.z, "#ccdfaa");
      this.marker.scale.setScalar(2.4);
    }
  }
  fire() {
    const s = this.scene;
    const type = this.final
      ? "star"
      : {
          nana: "bubble",
          mummy: "potion",
          leah: "nappy",
          daddy: this.cycle % 2 ? "ball" : "basketball",
        }[this.owner];
    if (!type) return;
    const n = this.owner === "mummy" ? 1 + ((this.cycle - 1) % 3) : 3;
    for (let i = 0; i < n; i++)
      s.time.delayedCall(i * 190, () => {
        if (!this.active || s.ending || s.cinematic || this.poseUntil>s.time.now) return;
        const a = Math.atan2(this.aim.x, this.aim.z) + (i - (n - 1) / 2) * 0.2;
        s.projectile(
          this.x,
          this.z,
          type,
          { x: Math.sin(a), z: Math.cos(a) },
          this.owner === "daddy" ? 6 : 4,
          this.owner || "bigboss",
        );
      });
    if (this.owner === "nana") s.addSlime(s.player.x, s.player.z);
  }
  update(dt) {
    if (!this.active) return;
    const s = this.scene,
      now = s.time.now;
    if (now < (this.poseUntil||0)) {
      this.actor.body.rotation.z=Math.sin(now/250)*.13;
      return;
    }
    if (this.activeFight) {
      if (now > this.stateUntil)
        this.enter(
          this.state === "warning"
            ? "attack"
            : this.state === "attack"
              ? "recovery"
              : "warning",
        );
      if (
        this.state === "attack" &&
        (this.owner === "grandad" || this.owner === "leah")
      ) {
        const speed = 6 * Math.min(s.basketball?.speedMultiplier(this) ?? 1,s.football?.speedMultiplier(this) ?? 1);
        const nx = this.x + this.aim.x * speed * dt,
          nz = this.z + this.aim.z * speed * dt;
        if (s.view.walkable(nx, nz)) {
          this.x = nx;
          this.z = nz;
        }
      }
      if (
        this.state === "attack" &&
        distance(this, s.nearestPlayer(this)) < 1.6 &&
        s.nearestPlayer(this).y < 1
      )
        s.nearestPlayer(this).hurt(this, this.owner === "grandad");
    }
    this.actor.root.position.set(
      this.x,
      0.28 + Math.sin(now / 400) * 0.035,
      this.z,
    );
    this.actor.root.rotation.y = Math.atan2(
      s.nearestPlayer(this).x - this.x,
      s.nearestPlayer(this).z - this.z,
    );
    if (this.state === "warning")
      this.actor.body.rotation.z = Math.sin(now / 90) * 0.035;
    else this.actor.body.rotation.z = 0;
    if (this.marker) this.marker.position.set(this.x, 0.34, this.z);
  }
  hit(amount, kind = "basic", attacker = this.scene.player) {
    const s = this.scene,
      now = s.time.now;
    if (this.active && kind === 'hyper' && attacker.hyperPower?.active) {
      this.health = 0; this.defeated(); return true;
    }
    if (!this.active || !this.activeFight || now < this.nextDamage)
      return false;
    if (this.final) return s.finalHeroHit(kind, attacker);
    if (this.state !== "recovery") return false;
    this.nextDamage = now + 260;
    this.health = Math.max(0, this.health - amount);
    s.view.effect(this.x, this.z, "#eed7a1", 25);
    s.services.audio.play("hit");
    if (this.health <= 0) this.defeated();
    return true;
  }
  defeated() {
    this.active = false;
    this.activeFight = false;
    this.scene.view.effect(this.x, this.z, "#dcd8b1", 50);
    this.scene.view.remove(this.actor);
    this.scene.view.remove(this.marker);
    this.scene.view.remove(this.line);
    if (this.final) this.scene.finalVictory();
    else this.scene.rescue(this.owner);
  }
}
