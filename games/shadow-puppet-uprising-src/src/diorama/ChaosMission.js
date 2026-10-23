import * as THREE from 'three';
import { CHAOS_EMERALDS } from '../data/chaos.js';

export class ChaosMission {
  constructor(scene, id) {
    this.scene = scene;
    this.definition = CHAOS_EMERALDS.find(e => e.id === id);
    this.step = scene.services.progress.data.chaosTrials[id] || 0;
    // Collected trials can be replayed without duplicating emeralds.
    if (scene.services.progress.data.emeralds.includes(id)) this.step = 0;
    this.spawn();
  }
  target() {
    const [x, z] = this.definition.points[this.step];
    return { x, z };
  }
  hint() {
    return this.step < 3
      ? `${this.definition.name} Chaos Emerald · Seal ${this.step + 1}/3 · ${this.definition.hint}`
      : `All seals open! Walk to the ${this.definition.name} Chaos Emerald to collect it.`;
  }
  spawn() {
    const { view } = this.scene, { x, z } = this.target();
    this.marker = view.marker(x, z, this.definition.color);
    if (this.step === 3) {
      this.gem = view.group(x, 1, z);
      view.mesh(new THREE.OctahedronGeometry(0.55), this.definition.color, this.gem,
        { emissive: this.definition.color, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.25 });
    }
  }
  action(kind, player) {
    if (this.complete || this.step >= 3 || player.downed) return;
    const at = this.target();
    if (Math.hypot(player.x - at.x, player.z - at.z) > 1.8) return;
    const rule = this.definition.rule;
    const matched = rule === kind || (kind === 'walk' &&
      (rule === player.form || (rule === 'jump' && player.y > this.scene.view.floorHeight(player.x, player.z) + 0.35)));
    if (!matched) return;
    this.scene.view.remove(this.marker);
    this.scene.view.effect(at.x, at.z, this.definition.color, 18);
    this.scene.services.audio.play('star');
    this.step++;
    this.scene.services.progress.data.chaosTrials[this.definition.id] = this.step;
    this.scene.services.progress.save();
    this.spawn();
  }
  update(dt) {
    if (this.complete) return;
    if (this.gem) this.gem.rotation.y += dt;
    if (this.step < 3) {
      for (const player of this.scene.players) this.action('walk', player);
      return;
    }
    const at = this.target();
    if (!this.scene.players.some(p => !p.downed && Math.hypot(p.x - at.x, p.z - at.z) < 0.9)) return;
    this.complete = true;
    this.scene.services.progress.collectEmerald(this.definition.id);
    this.scene.view.remove(this.marker);
    this.scene.view.remove(this.gem);
    this.scene.services.audio.play('star');
    this.scene.services.ui.chaosReward(this.definition);
  }
  destroy() {
    this.scene.view.remove(this.marker);
    this.scene.view.remove(this.gem);
  }
}
