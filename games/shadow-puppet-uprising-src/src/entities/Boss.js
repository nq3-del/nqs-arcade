import Phaser from "phaser";
import { CHARACTERS, FINAL_BOSS } from "../data/config.js";
import { burst, floatingText } from "../systems/Art.js";

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, owner, final = false) {
    super(scene, x, y, final ? FINAL_BOSS.texture : `shadow-${owner}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.owner = owner;
    this.final = final;
    this.setScale(final ? 1.55 : 1.35).setDepth(8);
    this.body.setSize(58, 85).setOffset(21, 23);
    this.setCollideWorldBounds(true);
    this.maxHealth = final
      ? FINAL_BOSS.health
      : Math.ceil(18 * scene.difficulty.bossHealth);
    this.health = this.maxHealth;
    this.state = "waiting";
    this.stateUntil = Infinity;
    this.cycle = 0;
    this.nextDamage = 0;
    this.warning = "";
    this.activeFight = false;
    this.chargeDirection = -1;
    this.attackFired = false;
    this.name = final
      ? FINAL_BOSS.name
      : `Ultimate Shadow ${CHARACTERS.find((c) => c.id === owner).name}`;
    this.halo = scene.add
      .ellipse(x, y + 55, 150, 24, 0x8776ad, 0.25)
      .setDepth(2);
    this.crown = scene.add
      .text(x, y - 100, "ULTIMATE", {
        fontFamily: "Trebuchet MS",
        fontSize: 13,
        fontStyle: "bold",
        color: "#fffce5",
        backgroundColor: "#7c659d",
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(12);
  }
  start() {
    if (this.activeFight) return;
    this.activeFight = true;
    this.enter("warning", this.scene.time.now);
  }
  enter(state, now) {
    this.state = state;
    this.setVelocityX(0);
    this.attackFired = false;
    if (state === "warning") {
      this.cycle++;
      this.stateUntil = now + (this.scene.difficulty.health === 8 ? 1250 : 950);
      this.chargeDirection = this.scene.player.x < this.x ? -1 : 1;
      this.setFlipX(this.chargeDirection < 0);
      this.warning = this.final
        ? "INCOMING! Hop over the stars!"
        : {
            grandad: "JUDO CHARGE! Jump over me!",
            nana: "BUBBLES! Hop between them!",
            mummy: ["POTION ONE!", "POTION TWO!", "BIG GLAMOUR SPLASH!"][
              (this.cycle - 1) % 3
            ],
            leah: "RAGE MODE! Jump — silly splats ahead!",
            daddy:
              this.cycle % 2 ? "BOUNCY BALLS! Get ready!" : "POWER SHOT! Jump!",
          }[this.owner];
    }
    if (state === "attack") {
      this.stateUntil =
        now + (this.owner === "grandad" || this.owner === "leah" ? 850 : 850);
      this.warning = "Here it comes!";
      this.fire();
    }
    if (state === "recovery") {
      this.stateUntil =
        now + (this.final ? 2400 : this.owner === "daddy" ? 1700 : 2400);
      this.warning = this.final
        ? "Your team can act now!"
        : "NOW! J attack or K special!";
      this.setTint(0xe8ffb6);
      burst(this.scene, this.x, this.y, 0xd5f66a, 7);
    }
  }
  fire() {
    const scene = this.scene,
      dir = this.chargeDirection;
    const x = this.x,
      y = this.y - 10;
    if (this.final) {
      for (let i = 0; i < 3; i++)
        scene.time.delayedCall(i * 270, () => {
          if (this.active && this.activeFight)
            scene.projectile(
              this.x,
              this.y - 15,
              "star",
              dir * (190 + i * 35),
              -140,
              "final",
            );
        });
      return;
    }
    if (this.owner === "grandad" || this.owner === "leah")
      this.setVelocityX(
        dir *
          (this.owner === "grandad" ? 390 : 330) *
          scene.difficulty.enemySpeed,
      );
    if (this.owner === "nana") {
      for (let i = 0; i < 3; i++)
        scene.time.delayedCall(i * 190, () => {
          if (this.active)
            scene.projectile(
              this.x,
              this.y - 20 - i * 12,
              "bubble",
              dir * (170 + i * 40),
              -75 - i * 45,
              this.owner,
            );
        });
      scene.addSlime(scene.player.x);
    }
    if (this.owner === "mummy") {
      const n = ((this.cycle - 1) % 3) + 1;
      for (let i = 0; i < n; i++)
        scene.time.delayedCall(i * 190, () => {
          if (this.active)
            scene.projectile(
              this.x,
              this.y - 35,
              "potion",
              dir * (200 + i * 50),
              -290 - i * 35,
              this.owner,
            );
        });
    }
    if (this.owner === "leah") {
      for (let i = 0; i < 3; i++)
        scene.time.delayedCall(i * 220, () => {
          if (this.active)
            scene.projectile(
              this.x,
              this.y - 40,
              "nappy",
              dir * (160 + i * 40),
              -350,
              this.owner,
            );
        });
    }
    if (this.owner === "daddy") {
      if (this.cycle % 2) {
        for (let i = 0; i < 3; i++)
          scene.time.delayedCall(i * 230, () => {
            if (this.active)
              scene.projectile(
                this.x,
                this.y - 30,
                i === 1 ? "basketball" : "ball",
                dir * (230 + i * 30),
                -290,
                this.owner,
              );
          });
      } else scene.projectile(x, y, "ball", dir * 460, -60, this.owner);
    }
  }
  update(now) {
    if (!this.active) return;
    this.halo.setPosition(this.x, this.y + 58);
    this.crown.setPosition(this.x, this.y - 100);
    if (!this.activeFight) return;
    if (now > this.stateUntil) {
      if (this.state === "warning") this.enter("attack", now);
      else if (this.state === "attack") this.enter("recovery", now);
      else this.enter("warning", now);
    }
    if (
      this.state === "attack" &&
      (this.x < this.scene.arenaStart + 95 ||
        this.x > this.scene.worldData.width - 110)
    )
      this.enter("recovery", now);
    if (this.state === "warning") {
      this.setTint(Math.floor(now / 180) % 2 ? 0xffd38a : 0xffffff);
      this.crown.setText("! GET READY !");
    } else if (this.state === "recovery") {
      this.setTint(0xe1ffaf);
      this.crown.setText(this.final ? "TEAMWORK!" : "YOUR TURN!");
    } else {
      this.clearTint();
      this.crown.setText("ULTIMATE");
    }
  }
  hit(amount, kind = "basic") {
    const now = this.scene.time.now;
    if (!this.active || !this.activeFight || now < this.nextDamage)
      return false;
    if (this.final) return this.scene.finalHeroHit(kind);
    if (this.state !== "recovery") {
      if (now > (this.nextShieldText || 0)) {
        this.nextShieldText = now + 1300;
        floatingText(
          this.scene,
          this.x,
          this.y - 60,
          "Wait for green!",
          "#7a629d",
        );
      }
      return false;
    }
    this.nextDamage = now + 250;
    this.health = Math.max(0, this.health - amount);
    burst(this.scene, this.x, this.y, 0xffcf7d, 14);
    this.scene.services.audio.play("hit");
    this.setTintFill(0xffffff);
    if (this.health <= 0) this.defeated();
    return true;
  }
  defeated() {
    if (!this.active) return;
    this.activeFight = false;
    const scene = this.scene;
    burst(scene, this.x, this.y, 0xd5f66a, 45);
    this.halo.destroy();
    this.crown.destroy();
    this.destroy();
    if (this.final) scene.finalVictory();
    else scene.rescue(this.owner);
  }
}
