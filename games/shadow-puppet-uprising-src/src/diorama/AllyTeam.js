import { CHARACTERS } from "../data/config.js";
import { distance } from "./Actors.js";

export class AllyTeam {
  constructor(scene, player = scene.player) {
    this.scene = scene;
    this.player = player;
    this.selected = scene.services.progress.data.selectedAlly;
    this.readyAt = {};
  }
  get character() {
    return CHARACTERS.find((c) => c.id === this.selected);
  }
  get unlocked() {
    return this.scene.services.progress.data.rescued;
  }
  select(id) {
    if (!this.unlocked.includes(id)) return;
    this.selected = id;
    this.scene.services.progress.data.selectedAlly = id;
    this.scene.services.progress.save();
  }
  cycle() {
    if (!this.unlocked.length) {
      this.scene.services.ui.toast(
        "The first member of your team is waiting in the Broken Kingdom.",
      );
      return;
    }
    this.select(
      this.unlocked[
        (this.unlocked.indexOf(this.selected) + 1) % this.unlocked.length
      ],
    );
    this.scene.services.ui.toast(
      `${this.character.name} · ${this.character.ability}`,
      1600,
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
      p = this.player,
      c = this.character;
    if(p.downed||p.launched||s.cinematic||s.ending||p.combatSuppressed?.())return;
    if (!c) {
      s.services.ui.toast("Rescue an ally first. Your family is waiting.");
      return;
    }
    if (this.remaining()) {
      s.services.ui.toast(
        `${c.name} will be ready in ${Math.ceil(this.remaining() / 1000)}s.`,
        1200,
      );
      return;
    }
    this.readyAt[c.id] = s.time.now + c.cooldown;
    const actor = s.view.character(c.id);
    actor.root.position.set(p.x - 1, 0.28, p.z + 0.5);
    actor.root.rotation.y = 0.6;
    s.summons.push({ actor, player: p, until: s.time.now + 5000 });
    s.view.effect(p.x, p.z, c.color, 28);
    s.services.audio.play("ally");
    const nearby = s.enemies.filter((e) => e.active && distance(e, p) < 4);
    if (c.id === "grandad") {
      nearby.forEach((e) => e.hit(5));
      s.props
        .filter((o) => o.type === "machine" && !o.done && distance(o, p) < 3)
        .forEach((o) => {
          o.done = true;
          s.view.effect(o.x, o.z, "#c5d9ac", 28);
        });
    }
    if (c.id === "nana")
      nearby.forEach((e) => {
        e.friendlyUntil = s.time.now + 8000;
        s.view.effect(e.x, e.z, "#bfd5ab", 10);
      });
    if (c.id === "mummy")
      nearby.forEach((e) => {
        e.poseUntil = s.time.now + 8000;
        s.glamour?.apply(e,8000);
        s.view.effect(e.x, e.z, "#dab2cd", 10);
      });
    if (c.id === "leah") {
      nearby.forEach((e) => e.hit(6));
      s.props
        .filter((o) => o.type === "barrier" && !o.done && distance(o, p) < 4)
        .forEach((o) => {
          o.done = true;
          s.view.remove(o.view);
          s.view.effect(o.x, o.z, "#dfb19a", 35);
        });
    }
    if (c.id === "daddy") {
      const target = s.props.find(
        (o) => o.type === "target" && !o.done && distance(o, p) < 9,
      );
      const aim =
        target &&
        (target.x - p.x) * p.facing.x + (target.z - p.z) * p.facing.z > 0
          ? {
              x: (target.x - p.x) / distance(target, p),
              z: (target.z - p.z) / distance(target, p),
            }
          : p.facing;
      s.projectile(p.x, p.z, "ball", aim, 9, c.id, true, p);
    }
    s.pvp?.familyAbility(p,c.id);
    if(c.id=== "mummy" && s.boss?.active && distance(s.boss,p)<4) {s.boss.poseUntil=s.time.now+8000;s.glamour?.apply(s.boss,8000);}
    if (c.id !== "daddy" && s.boss?.active && distance(s.boss, p) < 4)
      s.boss.hit(c.id === "leah" ? 4 : 3, "ally");
    s.adventure?.onAlly(c.id, p);
    s.tryFinalAlly(c.id);
    s.director?.bark(`v-${c.id}-summon`);
  }
}
