import { STADIUM_HOOPS, SHOT_RANGE, descendsThroughRim, basketballArc, basketballPosition } from '../data/basketball.js';
export const FIRE_RADIUS = 4;
export const FIRE_DURATION = 5;
export const FIRE_COOLDOWN = 5000;
export const EXPLOSION_DAMAGE = 12;
export const BURN_DAMAGE = 2;

export class Basketball {
  constructor(scene) { this.scene = scene; this.shots = []; this.fires = []; this.baskets = 0; }
  observeStep(player, before) {
    const s = this.scene;
    if (s.levelId !== undefined && s.levelId !== 5) return;
    const hyper = player.hyperPower.active;
    if ((hyper ? s.services.progress.data.curryUnlocked : s.services.progress.data.lebronUnlocked) || !before.super || !player.superPower.active ||
      player.superPower.busy || player.sportsEquipped || player.downed || player.launched || s.cinematic || s.ending) return;
    const after = { x: player.x, y: player.y + 0.28, z: player.z };
    if (STADIUM_HOOPS.some(h => descendsThroughRim(before, after, h)) && (hyper ? s.services.progress.unlockCurry() : s.services.progress.unlockLeBron())) {
      s.services.audio.play('switch');
      if (hyper) s.services.ui.curryReward(); else s.services.ui.lebronReward();
    }
  }
  shoot(player, flaming = false) {
    const s = this.scene;
    if (!player.basketballEquipped || !(player.curryEquipped ? s.services.progress.data.curryUnlocked : s.services.progress.data.lebronUnlocked) || player.downed ||
      player.launched || player.superPower.busy || s.cinematic || s.ending || s.time.now < (flaming ? player.lebronAbilityReady || 0 : player.shotReady || 0)) return false;
    const hoop = [...STADIUM_HOOPS].sort((a, b) =>
      Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];
    if ((s.levelId !== undefined && s.levelId !== 5) || Math.hypot(hoop.x - player.x, hoop.z - player.z) > SHOT_RANGE)
      return this.freeShot(player, flaming);
    const length = Math.max(0.01, Math.hypot(hoop.x - player.x, hoop.z - player.z));
    player.facing = { x: (hoop.x - player.x) / length, z: (hoop.z - player.z) / length };
    player.actor.root.rotation.y = Math.atan2(player.facing.x, player.facing.z);
    if (flaming) player.lebronAbilityReady = s.time.now + FIRE_COOLDOWN;
    else player.shotReady = s.time.now + 1100;
    player.shootingUntil = s.time.now + 650;
    const start = { x: player.x + player.facing.x * 0.38, y: player.y + 2.65, z: player.z + player.facing.z * 0.38 };
    const model = s.view.basketball(start.x, start.y, start.z, flaming);
    this.shots.push({ arc: basketballArc(start, hoop), model, elapsed: 0, scored: false, flaming, player });
    s.services.audio.play('pop');
    return true;
  }
  freeShot(player, flaming = false, football = false) {
    const s = this.scene;
    const length = Math.hypot(player.facing.x, player.facing.z) || 1;
    const direction = {x: player.facing.x / length, z: player.facing.z / length};
    if (flaming) player.lebronAbilityReady = s.time.now + FIRE_COOLDOWN;
    else player.shotReady = s.time.now + 1100;
    if (football) player.kickingUntil = s.time.now + 500;
    else player.shootingUntil = s.time.now + 650;
    const start = {x: player.x + direction.x * .6, y: player.y + (football ? .65 : 2.65), z: player.z + direction.z * .6};
    const model = football ? s.view.football(start.x, start.y, start.z, flaming) : s.view.basketball(start.x, start.y, start.z, flaming);
    this.shots.push({free: true, start, direction, model, player, flaming, elapsed: 0, football});
    s.services.audio.play('pop');
    return true;
  }
  ignite(shot, x, z) {
    const fire = {x, z, radius: FIRE_RADIUS, remaining: FIRE_DURATION, damageClock: 0, player: shot.player,
      model: this.scene.view.basketballFire(x, z, FIRE_RADIUS)};
    this.damageArea(fire, EXPLOSION_DAMAGE); this.fires.push(fire);
    this.scene.services.audio.play('beam');
  }
  updateFreeShot(shot) {
    const s = this.scene, t = shot.elapsed;
    const x = shot.start.x + shot.direction.x * t * 11;
    const z = shot.start.z + shot.direction.z * t * 11;
    const y = shot.start.y + t * (shot.football ? 2 : 1.5) - 3 * t * t;
    shot.model.position.set(x, Math.max(.3, y), z);
    shot.model.rotation.x += .3;
    const victim = [...s.enemies, s.boss].find(e => e?.active && !(e.friendlyUntil > s.time.now) &&
      Math.hypot(e.x - x, e.z - z) < (e.kind === 'boss' ? 1.7 : 1) && y < (e.kind === 'boss' ? 3.6 : 2.6));
    const partner = s.pvp?.enabled && s.players.find(p => p !== shot.player && !p.downed &&
      Math.hypot(p.x - x, p.z - z) < .8 && Math.abs(p.y + 1.2 - y) < 1.2);
    if (victim || partner || y <= .3 || t >= 2.5 || !s.view.walkable(x, z)) {
      if (shot.flaming) this.ignite(shot, x, z);
      else { victim?.hit(3, 'basic', shot.player); if (partner) s.pvp.hurt(shot.player, partner, 3); }
      s.view.remove(shot.model); return false;
    }
    return true;
  }
  update(dt) {
    // Existing fire ages before newly scored shots create a full five-second area.
    this.fires = this.fires.filter(fire => {
      const elapsed = Math.min(dt, fire.remaining);
      fire.remaining = Math.max(0, fire.remaining - dt);
      fire.damageClock += elapsed;
      while (fire.damageClock >= 1 - 1e-7) { this.damageArea(fire, BURN_DAMAGE); fire.damageClock -= 1; }
      const age = FIRE_DURATION - fire.remaining;
      if (fire.model.userData.flash) {
        fire.model.userData.flash.visible = age < 0.35;
        fire.model.userData.flash.scale.setScalar(1 + age * 8);
      }
      fire.model.userData.flames?.forEach((flame,i) => {
        flame.scale.y = this.scene.view.reducedMotion ? 1 : 0.85 + Math.sin(age * 9 + i) * 0.22;
      });
      if (fire.remaining < 1e-7) { this.scene.view.remove(fire.model); return false; }
      return true;
    });
    this.shots = this.shots.filter(shot => {
      shot.elapsed += dt;
      if (shot.free) return this.updateFreeShot(shot);
      const at = basketballPosition(shot.arc, shot.elapsed);
      shot.model.position.set(at.x, at.y, at.z);
      shot.model.rotation.x += dt * 7;
      shot.model.rotation.z += dt * 1.4;
      if (!shot.scored && shot.elapsed >= shot.arc.duration) {
        shot.scored = true; this.baskets++;
        if (shot.flaming) {
          const { x, z } = shot.arc.hoop;
          const fire = { x, z, radius: FIRE_RADIUS, remaining: FIRE_DURATION, damageClock: 0, player: shot.player,
            model: this.scene.view.basketballFire(x, z, FIRE_RADIUS) };
          this.damageArea(fire, EXPLOSION_DAMAGE); this.fires.push(fire);
          this.scene.services.audio.play('beam');
          this.scene.view.remove(shot.model);
          this.scene.services.ui.toast(`Blazing ${shot.goal ? 'goal' : 'basket'}! Fire burns for 5 seconds and slows enemies by 20%.`, 2400);
          return false;
        }
        this.scene.services.audio.play('star');
        this.scene.services.ui.toast(shot.goal ? 'Goal!' : 'Swish!', 1000);
      }
      if (shot.elapsed > shot.arc.duration + 2.1) {
        this.scene.view.remove(shot.model); return false;
      }
      return true;
    });
  }
  damageArea(fire, amount) {
    const s = this.scene;
    for (const enemy of [...s.enemies, s.boss]) if (enemy?.active && !(enemy.friendlyUntil > s.time.now) &&
      Math.hypot(enemy.x - fire.x, enemy.z - fire.z) <= fire.radius) enemy.hit(amount, 'fire', fire.player);
    s.pvp?.damageArea(fire.player, fire, amount);
  }
  speedMultiplier(actor) {
    if (actor.friendlyUntil > this.scene.time.now) return 1;
    return this.fires.some(f => f.player !== actor && f.remaining > 0 && Math.hypot(actor.x - f.x, actor.z - f.z) <= f.radius) ? 0.8 : 1;
  }
  destroy() {
    [...this.shots, ...this.fires].forEach(effect => this.scene.view.remove(effect.model));
    this.shots = []; this.fires = [];
  }
}
