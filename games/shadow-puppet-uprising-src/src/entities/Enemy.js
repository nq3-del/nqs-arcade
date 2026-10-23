import Phaser from "phaser";
import { burst, floatingText } from "../systems/Art.js";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, owner, options = {}) {
    super(scene, x, y, `shadow-${owner}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.owner = owner;
    this.health = 3;
    this.home = x;
    this.direction = -1;
    this.nextShot = scene.time.now + 1300;
    this.friendlyUntil = 0;
    this.poseUntil = 0;
    this.finalGuard = !!options.finalGuard;
    this.setScale(0.62).setDepth(5);
    this.body.setSize(50, 82).setOffset(25, 24);
    this.setBounce(0);
    this.body.setCollideWorldBounds(true);
    this.nextHelp = 0;
    this.label = scene.add
      .text(x, y - 55, "", {
        fontFamily: "Trebuchet MS",
        fontSize: 14,
        fontStyle: "bold",
        color: "#42446d",
        stroke: "#fff7df",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(9);
  }
  update(now) {
    if (!this.active) return;
    const scene = this.scene;
    const p = scene.player;
    if (this.y > 700) {
      this.remove(false);
      return;
    }
    this.label.setPosition(this.x, this.y - 48);
    if (now < this.poseUntil) {
      this.setVelocityX(0);
      this.setTint(0xffc5ec);
      this.setAngle(Math.sin(now / 250) * 8);
      this.label.setText("FABULOUS ✦");
      return;
    }
    if (now < this.friendlyUntil) {
      this.setTint(0xcaff9d);
      this.label.setText("♥ FRIEND");
      this.setVelocityX((p.x - this.x > 0 ? 1 : -1) * 65);
      if (now > this.nextHelp) {
        this.nextHelp = now + 900;
        const target = scene.enemies.find(
          (e) =>
            e !== this &&
            e.active &&
            e.friendlyUntil < now &&
            Math.abs(e.x - this.x) < 180,
        );
        if (target) target.hit(1);
        if (scene.boss?.active && Math.abs(scene.boss.x - this.x) < 180)
          scene.boss.hit(1, "ally");
      }
      return;
    }
    this.label.setText("");
    this.clearTint();
    this.setAngle(0);
    if (Math.abs(p.x - this.x) > 800) {
      this.setVelocityX(0);
      return;
    }
    if (this.body.blocked.left || this.x < this.home - 95) this.direction = 1;
    if (this.body.blocked.right || this.x > this.home + 95) this.direction = -1;
    const speed =
      (this.owner === "leah" ? 92 : 57) * scene.difficulty.enemySpeed;
    this.setVelocityX(this.direction * speed);
    this.setFlipX(this.direction < 0);
    this.setTexture(
      `shadow-${this.owner}-run${1 + (Math.floor(now / 160) % 2)}`,
    );
    if (now > this.nextShot && Math.abs(p.x - this.x) < 540) {
      this.nextShot = now + (this.owner === "grandad" ? 2800 : 2600);
      const dir = p.x > this.x ? 1 : -1;
      if (this.owner === "grandad") {
        floatingText(scene, this.x, this.y - 55, "JUDO!");
        this.setVelocityX(dir * 180);
        this.home = this.x;
      } else {
        const type = {
          nana: "bubble",
          mummy: "potion",
          leah: "nappy",
          daddy: Math.floor(now / 1000) % 2 ? "ball" : "basketball",
          bigboss: "star",
        }[this.owner];
        scene.projectile(this.x, this.y - 5, type, dir * 210, -130, this.owner);
      }
    }
  }
  hit(amount) {
    if (!this.active) return;
    this.health -= amount;
    burst(this.scene, this.x, this.y, 0xb5a0ea, 7);
    if (this.health <= 0) this.remove(true);
    else {
      this.setTintFill(0xffffff);
      this.scene.time.delayedCall(100, () => {
        if (this.active) this.clearTint();
      });
    }
  }
  remove(confetti = true) {
    if (!this.active) return;
    if (confetti) {
      burst(this.scene, this.x, this.y, 0xb5a0ea, 15);
      this.scene.services.audio.play("pop");
    }
    this.label.destroy();
    this.destroy();
  }
}
