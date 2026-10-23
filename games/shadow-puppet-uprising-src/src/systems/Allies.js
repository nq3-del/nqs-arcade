import { CHARACTERS } from "../data/config.js";
import { burst, floatingText } from "./Art.js";

export class Allies {
  constructor(scene) {
    this.scene = scene;
    this.readyAt = {};
    this.selected = scene.services.progress.data.selectedAlly;
  }
  get unlocked() {
    return this.scene.services.progress.data.rescued;
  }
  get character() {
    return CHARACTERS.find((c) => c.id === this.selected);
  }
  select(id) {
    if (!this.unlocked.includes(id)) return;
    this.selected = id;
    this.scene.services.progress.data.selectedAlly = id;
    this.scene.services.progress.save();
  }
  cycle() {
    if (!this.unlocked.length) {
      this.scene.services.ui.toast("Rescue an ally to unlock a helping hand!");
      return;
    }
    this.select(
      this.unlocked[
        (this.unlocked.indexOf(this.selected) + 1) % this.unlocked.length
      ],
    );
    this.scene.services.ui.toast(
      `${this.character.name} · ${this.character.ability}`,
      1400,
    );
  }
  remaining() {
    return Math.max(
      0,
      (this.readyAt[this.selected] || 0) - this.scene.time.now,
    );
  }
  use() {
    const s = this.scene,
      p = s.player,
      c = this.character;
    if (!c) {
      s.services.ui.toast("Your first ally is waiting in the Broken Kingdom!");
      return;
    }
    if (this.remaining() > 0) {
      s.services.ui.toast(
        `${c.name} is ready in ${Math.ceil(this.remaining() / 1000)}s.`,
        1000,
      );
      return;
    }
    this.readyAt[c.id] = s.time.now + c.cooldown;
    s.services.audio.play("ally");
    const actor = s.add
      .image(p.x - p.facing * 55, p.y - 22, c.id)
      .setScale(0.85)
      .setDepth(15);
    s.tweens.add({
      targets: actor,
      y: actor.y - 30,
      alpha: 0,
      duration: 850,
      onComplete: () => actor.destroy(),
    });
    burst(s, p.x, p.y, parseInt(c.color.slice(1), 16), 22);
    floatingText(s, p.x, p.y - 80, c.ability.toUpperCase(), c.color);
    const nearby = s.enemies.filter(
      (e) => e.active && Math.abs(e.x - p.x) < 320 && Math.abs(e.y - p.y) < 180,
    );
    if (c.id === "grandad") {
      nearby.forEach((e) => {
        e.hit(5);
      });
      if (s.boss?.active && Math.abs(s.boss.x - p.x) < 250)
        s.boss.hit(3, "ally");
      s.repairNearby(p.x);
    }
    if (c.id === "nana") {
      nearby.forEach((e) => {
        e.friendlyUntil = s.time.now + 8000;
        burst(s, e.x, e.y, 0xc9f6bb, 8);
      });
      if (s.boss?.active && Math.abs(s.boss.x - p.x) < 320)
        s.boss.hit(2, "ally");
    }
    if (c.id === "mummy") {
      nearby.forEach((e) => {
        e.poseUntil = s.time.now + 8000;
        burst(s, e.x, e.y, 0xf8b3e5, 8);
      });
      if (s.boss?.active && Math.abs(s.boss.x - p.x) < 320)
        s.boss.hit(3, "ally");
    }
    if (c.id === "leah") {
      nearby.forEach((e) => e.hit(6));
      if (s.boss?.active && Math.abs(s.boss.x - p.x) < 330)
        s.boss.hit(4, "ally");
      s.breakBarriers(p.x);
      const prop = s.add
        .image(p.x + p.facing * 80, p.y - 60, "nappy")
        .setScale(2)
        .setDepth(16);
      s.tweens.add({
        targets: prop,
        x: prop.x + p.facing * 140,
        y: prop.y + 80,
        angle: 300,
        duration: 350,
        onComplete: () => {
          burst(s, prop.x, prop.y, 0xf4ba77, 25);
          prop.destroy();
        },
      });
    }
    if (c.id === "daddy") s.friendlyBall(p.x, p.y - 10, p.facing);
    s.tryFinalAlly(c.id, nearby);
  }
}
