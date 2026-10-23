import { CHAOS_EMERALDS } from '../data/chaos.js';

// Gameplay time, rather than CSS timers, keeps pause/resume and scene cleanup exact.
export class SuperTransformation {
  constructor(player) { this.player = player; this.phase = 'normal'; this.elapsed = 0; }
  get active() { return this.phase === 'super'; }
  get busy() { return this.phase === 'gather' || this.phase === 'scatter'; }
  toggle() {
    const p = this.player, s = p.scene;
    if (p.squidwardEquipped || this.busy || p.downed || p.launched || s.cinematic || s.ending) return false;
    if (!s.services.progress.superUnlocked()) {
      s.services.ui.toast('Finish the story, collect every star, then earn all seven Chaos Emeralds.');
      return false;
    }
    const leaving = this.active;
    if (leaving) p.hyperPower?.cancel();
    // S always reveals the actual Super Goku / original form; R can re-equip the skin.
    p.clearBasketballSkin?.();
    this.phase = leaving ? 'scatter' : 'gather';
    this.elapsed = 0;
    this.duration = s.view.reducedMotion ? 0.7 : leaving ? 1.05 : 2.8;
    p.vx = p.vz = p.vy = 0;
    p.dashUntil = 0;
    if (leaving) p.setSuperAppearance(false);
    this.overlay = document.createElement('div');
    this.overlay.className = 'chaos-transformation';
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.innerHTML = CHAOS_EMERALDS.map(e => `<i class="chaos-flying-gem" style="--gem:${e.color}"></i>`).join('');
    document.querySelector('#game').append(this.overlay);
    this.gems = [...this.overlay.children];
    s.services.audio.play('switch');
    return true;
  }
  update(dt) {
    if (!this.busy) return;
    this.elapsed += dt;
    if (this.elapsed < this.duration) return;
    const gathered = this.phase === 'gather';
    this.overlay?.remove();
    this.overlay = null;
    this.phase = gathered ? 'super' : 'normal';
    if (gathered) {
      this.player.setSuperAppearance(true);
      const ui = this.player.scene.services.ui;
      ui.toast('SUPER GOKU! Space / '+(ui.controllerButton?.('space')||'×')+' to rise, C / '+(ui.controllerButton?.('c')||'△')+' to descend. S / '+(ui.controllerButton?.('super')||'L3 + R3')+' to return to normal.', 5000);
    }
  }
  render() {
    if (!this.overlay) return;
    const p = this.player, s = p.scene;
    const at = s.view.project(p.x, p.y + 1.4, p.z);
    const t = Math.min(1, this.elapsed / this.duration), gather = this.phase === 'gather';
    const radius = gather ? 56 * (1 - t * t) : 110 * t * t;
    const centerX = gather ? 50 + (at.x - 50) * t : at.x;
    const centerY = gather ? 50 + (at.y - 50) * t : at.y;
    this.gems.forEach((gem, i) => {
      const angle = i * Math.PI * 2 / 7 + (gather && !s.view.reducedMotion ? t * Math.PI * 5 : 0);
      const r = s.view.reducedMotion ? radius * 0.12 : radius;
      gem.style.left = `${centerX + Math.cos(angle) * r}%`;
      gem.style.top = `${centerY + Math.sin(angle) * r * 0.72}%`;
      gem.style.opacity = s.view.reducedMotion ? String(gather ? 1 - t : 1 - t * t) : '1';
      gem.style.transform = `translate(-50%,-50%) rotate(${angle}rad) scale(${gather ? 1 - t * 0.65 : 0.35 + t})`;
    });
  }
  destroy() { this.overlay?.remove(); this.overlay = null; }
}
