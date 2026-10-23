import Phaser from "phaser";
import { HERO_FORMS, PHYSICS } from "../data/config.js";
import { burst, floatingText } from "../systems/Art.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "heroA");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.66).setDepth(10);
    this.body.setSize(46, 88).setOffset(27, 20);
    this.setCollideWorldBounds(true);
    this.body.onWorldBounds = true;
    this.setDragX(PHYSICS.drag);
    this.setMaxVelocity(900, 1100);
    this.form = "A";
    this.facing = 1;
    this.health = scene.difficulty.health;
    this.maxHealth = this.health;
    this.lastGround = -1000;
    this.jumpQueued = -1000;
    this.abilityReady = 0;
    this.attackReady = 0;
    this.invulnerableUntil = 0;
    this.dashUntil = 0;
    this.dashHits = new Set();
    this.glamourUntil = 0;
    this.hurtUntil = 0;
    this.keys = scene.input.keyboard.addKeys({
      left: "LEFT",
      right: "RIGHT",
      a: "A",
      d: "D",
      space: "SPACE",
      up: "UP",
      q: "Q",
      j: "J",
      k: "K",
      e: "E",
      l: "L",
      tab: "TAB",
      r: "R",
    });
  }
  config() {
    return HERO_FORMS[this.form];
  }
  pressed(name) {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys[name]) ||
      this.scene.consumeTouch(name)
    );
  }
  switchForm() {
    this.form = this.form === "A" ? "B" : "A";
    this.setTexture(this.config().texture);
    this.scene.services.audio.play("switch");
    burst(this.scene, this.x, this.y, this.config().color, 14);
    this.scene.originActions.switched = true;
    if (!this.scene.services.progress.data.settings.reducedMotion)
      this.scene.tweens.add({
        targets: this,
        scaleX: 0.8,
        scaleY: 0.55,
        duration: 85,
        yoyo: true,
        onComplete: () => this.setScale(0.66),
      });
  }
  attack(power = false) {
    const now = this.scene.time.now;
    if (now < this.attackReady || now < this.glamourUntil) return;
    this.attackReady = now + (power ? 500 : 280);
    const range = power ? HERO_FORMS.B.range : 94;
    this.scene.melee(
      this.x,
      this.y,
      this.facing,
      range,
      power ? HERO_FORMS.B.damage : 1,
      power ? "power" : "basic",
    );
    const arc = this.scene.add
      .arc(
        this.x + this.facing * 40,
        this.y - 3,
        power ? 63 : 40,
        -70,
        70,
        false,
        power ? 0xffc96b : 0xffffff,
        0.55,
      )
      .setDepth(11);
    if (this.facing < 0) arc.setAngle(180);
    this.scene.tweens.add({
      targets: arc,
      alpha: 0,
      scale: 1.4,
      duration: 180,
      onComplete: () => arc.destroy(),
    });
    this.scene.services.audio.play("pop");
  }
  ability() {
    const now = this.scene.time.now;
    if (now < this.abilityReady || now < this.glamourUntil) return;
    this.abilityReady = now + this.config().cooldown;
    if (this.form === "A") {
      this.dashUntil = now + HERO_FORMS.A.dashDuration;
      this.dashHits.clear();
      this.invulnerableUntil = Math.max(
        this.invulnerableUntil,
        this.dashUntil + 90,
      );
      this.body.setAllowGravity(false);
      this.setVelocity(this.facing * HERO_FORMS.A.dashSpeed, 0);
      this.scene.services.audio.play("dash");
    } else this.attack(true);
  }
  hurt(sourceX, throwing = false) {
    const now = this.scene.time.now;
    if (now < this.invulnerableUntil || this.scene.ending) return false;
    this.health--;
    this.invulnerableUntil = now + this.scene.difficulty.invulnerability;
    this.hurtUntil = now + 230;
    this.dashUntil = 0;
    this.body.setAllowGravity(true);
    this.setAccelerationX(0);
    this.setVelocity(
      (this.x < sourceX ? -1 : 1) * (throwing ? 380 : 240),
      throwing ? -460 : -280,
    );
    this.scene.services.audio.play("hurt");
    burst(this.scene, this.x, this.y, 0xffb4a1, 7);
    if (throwing) floatingText(this.scene, this.x, this.y - 60, "Wheee!");
    if (this.health <= 0) this.scene.defeat();
    return true;
  }
  update(now, delta) {
    if (!this.active || this.scene.ending) return;
    if (this.pressed("q")) this.switchForm();
    if (this.pressed("j")) this.attack();
    if (this.pressed("k")) this.ability();
    if (this.pressed("l")) this.scene.allies.use();
    if (this.pressed("tab")) this.scene.allies.cycle();
    if (this.pressed("e")) {
      this.scene.interact();
      if (!this.active || !this.body) return;
    }
    const grounded = this.body.blocked.down || this.body.touching.down;
    if (grounded) {
      this.lastGround = now;
      if (this.form === "B" && this.x > 1190 && this.x < 1450 && this.y < 420)
        this.scene.originActions.highJump = true;
    }
    if (this.pressed("space") || this.pressed("up")) this.jumpQueued = now;
    if (this.dashUntil > now) {
      this.setVelocity(this.facing * HERO_FORMS.A.dashSpeed, 0);
      this.scene.dashContact(this);
      if (Math.floor(now / 45) !== this.trailFrame) {
        this.trailFrame = Math.floor(now / 45);
        const trail = this.scene.add
          .image(this.x, this.y, this.config().texture)
          .setScale(0.66)
          .setAlpha(0.3)
          .setDepth(9);
        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          duration: 200,
          onComplete: () => trail.destroy(),
        });
      }
    } else {
      this.body.setAllowGravity(true);
      const left =
        this.keys.left.isDown ||
        this.keys.a.isDown ||
        this.scene.touchHeld.left;
      const right =
        this.keys.right.isDown ||
        this.keys.d.isDown ||
        this.scene.touchHeld.right;
      const direction = Number(!!right) - Number(!!left);
      if (now > this.hurtUntil) {
        this.setAccelerationX(direction * PHYSICS.acceleration);
        const speed =
          this.config().speed * (now < this.glamourUntil ? 0.65 : 1);
        if (Math.abs(this.body.velocity.x) > speed)
          this.setVelocityX(
            Phaser.Math.Linear(
              this.body.velocity.x,
              Math.sign(this.body.velocity.x) * speed,
              Math.min(1, delta / 50),
            ),
          );
        if (direction) this.facing = direction;
      }
      this.setDragX(this.scene.isSlippery(this.x) ? 320 : PHYSICS.drag);
      if (
        now - this.jumpQueued < PHYSICS.jumpBuffer &&
        now - this.lastGround < PHYSICS.coyoteTime
      ) {
        this.setVelocityY(-this.config().jump);
        this.jumpQueued = -1000;
        this.lastGround = -1000;
        this.scene.services.audio.play("jump");
        burst(this.scene, this.x, this.y + 25, 0xffffff, 6);
      }
      const jumpHeld =
        this.keys.space.isDown ||
        this.keys.up.isDown ||
        this.scene.touchHeld.space;
      if (!jumpHeld && this.body.velocity.y < -250)
        this.setVelocityY(this.body.velocity.y + delta * 1.9);
    }
    this.setFlipX(this.facing < 0);
    const moving = Math.abs(this.body.velocity.x) > 35;
    const frame = grounded && moving ? 1 + (Math.floor(now / 110) % 2) : 0;
    this.setTexture(this.config().texture + (frame ? `-run${frame}` : ""));
    this.setAlpha(
      now < this.invulnerableUntil ? (Math.floor(now / 100) % 2 ? 0.5 : 1) : 1,
    );
    if (now < this.glamourUntil) this.setTint(0xf2b7ef);
    else this.clearTint();
    if (this.y > 695) this.scene.fall();
  }
}
