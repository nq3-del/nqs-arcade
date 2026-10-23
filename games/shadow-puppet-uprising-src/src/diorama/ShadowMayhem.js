import { MayhemWaves, PUPPET_LIMIT, BOSS_WAVE } from './MayhemWaves.js';
import { MayhemCrowd } from './MayhemCrowd.js';

export class MayhemFoe {
  constructor(mode, kind, x, z) {
    this.mode = mode; this.scene = mode.scene; this.kind = kind;
    this.x = x; this.z = z; this.y = 0; this.angle = 0;
    this.owner = 'bigboss'; this.active = true; this.guard = true;
    this.health = this.maxHealth = kind === 'boss' ? 18 : 3;
    this.name = kind === 'boss' ? 'Ultimate Shadow Boss' : 'Shadow Puppet';
    this.friendlyUntil = this.poseUntil = 0;
    this.nextAttack = this.scene.time.now + 1500 + Math.random() * 2000;
    this.winding = false;
    this.lastUpdated = mode.waves?.elapsed || 0;
  }
  hit(amount) {
    if (!this.active || !(amount > 0)) return false;
    this.health -= amount;
    if (this.health <= 0) this.remove();
    return true;
  }
  remove() {
    if (!this.active) return;
    this.active = false;
    this.mode.defeated[this.kind]++;
    if (this.mode.population) this.mode.population[this.kind]--;
    this.mode.dirty = true;
    // Bound visual particles, never the number of enemies a hit can defeat.
    if (this.scene.view.particles.length < 180) this.scene.view.effect(this.x, this.z, '#c9b2e8', 3);
  }
  update(dt) {
    if (!this.active) return;
    const s = this.scene, now = s.time.now, p = s.nearestPlayer(this);
    if (now < this.poseUntil) { this.winding = false; return; }
    if (now < this.friendlyUntil) {
      this.winding = false;
      if (now >= this.nextAttack) {
        this.nextAttack = now + 1000;
        this.mode.helpTarget(this)?.hit(1);
      }
      return;
    }
    const dx = p.x - this.x, dz = p.z - this.z, distance = Math.hypot(dx, dz);
    this.angle = Math.atan2(dx, dz);
    const boss = this.kind === 'boss', reach = boss ? 3.8 : 1.5;
    if (this.winding) {
      if (now >= this.strikeAt) {
        this.winding = false;
        this.nextAttack = now + (boss ? 2400 : 1900);
        for (const player of s.players) if (!player.downed && player.y < (boss ? 2.7 : 1.2) &&
          Math.hypot(player.x - this.x, player.z - this.z) <= reach) player.hurt(this, boss);
      }
      return;
    }
    if (!p.downed && distance < reach && now >= this.nextAttack) {
      this.winding = true; this.strikeAt = now + (boss ? 1000 : 650); return;
    }
    if (distance > reach * .75) {
      const slow = Math.min(s.basketball?.speedMultiplier(this) ?? 1, s.football?.speedMultiplier(this) ?? 1);
      const step = Math.min(distance, dt * (boss ? 1.4 : 1.8) * s.difficulty.enemySpeed * slow);
      this.x += dx / Math.max(.01, distance) * step;
      this.z += dz / Math.max(.01, distance) * step;
    }
  }
}

export class ShadowMayhem {
  constructor(scene) {
    this.scene = scene;
    this.defeated = {puppet: 0, boss: 0};
    this.population = {puppet: 0, boss: 0};
    this.cursor = 0; this.dirty = false; this.nextCleanup = 0;
    this.puppets = new MayhemCrowd(scene.view);
    this.bosses = new MayhemCrowd(scene.view, true);
    this.waves = new MayhemWaves(() => this.count('puppet'), (kind, count) => this.spawn(kind, count));
  }
  count(kind) { return this.population[kind]; }
  spawn(kind, count) {
    const s = this.scene;
    for (let i = 0; i < count; i++) {
      let x, z;
      do { x = (Math.random() * 2 - 1) * 41; z = (Math.random() * 2 - 1) * 27; }
      while (s.players.some(p => Math.hypot(x - p.x, z - p.z) < 7));
      s.enemies.push(new MayhemFoe(this, kind, x, z));
      this.population[kind]++;
    }
    if (kind === 'boss') s.services.ui.toast(BOSS_WAVE.toLocaleString() + ' Ultimate Shadow Bosses have arrived!', 3500);
  }
  defeatedPlayer(player) {
    player.downed = true; player.respawnRemaining = 3;
    player.vx = player.vz = player.vy = 0;
  }
  update(seconds) {
    const s = this.scene;
    if (this.dirty && this.waves.elapsed >= this.nextCleanup) {
      s.enemies = s.enemies.filter(foe => foe.active);
      this.dirty = false; this.nextCleanup = this.waves.elapsed + 1;
    }
    this.waves.update(seconds);
    for (const p of s.players) if (p.downed) {
      p.respawnRemaining = Math.max(0, p.respawnRemaining - seconds);
      if (p.respawnRemaining > 1e-7) continue;
      p.x = s.spawn.x + p.slot * 2; p.z = s.spawn.z; p.y = 0;
      p.health = p.maxHealth; p.downed = false;
      p.invulnerableUntil = s.time.now + 4000;
      p.vx = p.vz = p.vy = 0; p.dashUntil = p.knockUntil = 0;
      p.sync(0);
    }
  }
  helpTarget(friend) {
    const enemies=this.scene.enemies,count=enemies.length;
    for(let i=0;i<Math.min(count,100);i++) {
      this.helpCursor=((this.helpCursor||0)+1)%count;
      const e=enemies[this.helpCursor];
      if(e!==friend && e.active && e.friendlyUntil<this.scene.time.now && Math.hypot(e.x-friend.x,e.z-friend.z)<3)return e;
    }
    return null;
  }
  updateEnemies() {
    const enemies = this.scene.enemies, count = enemies.length;
    // Every logical enemy keeps its position and health. Spread AI work over
    // frames at extreme populations; combat still checks the whole population.
    for (let i = 0, budget = Math.min(count, 4000); i < budget; i++) {
      this.cursor %= count;
      const e = enemies[this.cursor++];
      const elapsed = Math.max(0, this.waves.elapsed - e.lastUpdated);
      e.lastUpdated = this.waves.elapsed;
      e.update(Math.min(elapsed, 2));
    }
  }
  render() {
    const s = this.scene, puppets = [], bosses = [], count = s.enemies.length;
    // A stable sample represents dense distant crowds. This limits drawing,
    // not spawning, health, collision targets, or how many attacks can defeat.
    const stride = Math.max(1, Math.ceil(count / 2400));
    for (let i = 0; i < count; i += stride) {
      const e = s.enemies[i];
      if (e.active) (e.kind === 'boss' ? bosses : puppets).push(e);
    }
    this.puppets.render(puppets, s.time.now);
    this.bosses.render(bosses, s.time.now);
  }
  hint() {
    const w = this.waves, count = this.count('puppet');
    return 'SHADOW MAYHEM · Defeat as many as you can. No time limit. ' +
      (count >= PUPPET_LIMIT ? 'Puppet limit reached · defeat some for the next wave.' :
        'Next puppets: ' + Math.max(0, Math.ceil(w.nextPuppets - w.elapsed)) + 's') +
      ' · Next ' + BOSS_WAVE.toLocaleString() + ' bosses: ' + Math.max(0, Math.ceil(w.nextBosses - w.elapsed)) + 's';
  }
  destroy() { this.puppets.destroy(); this.bosses.destroy(); this.scene.enemies = []; }
}
