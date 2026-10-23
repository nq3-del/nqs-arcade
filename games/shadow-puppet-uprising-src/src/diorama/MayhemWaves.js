export const PUPPET_WAVE = 5000;
export const PUPPET_INTERVAL = 30;
export const PUPPET_LIMIT = 500000;
export const BOSS_WAVE = 50000;
export const BOSS_INTERVAL = 60;
export const mayhemUnlocked = progress => progress.data.victory && progress.superUnlocked() &&
  ['grandad', 'nana', 'mummy', 'leah', 'daddy'].every(id => progress.data.rescued.includes(id)) &&
  ['lebronUnlocked', 'curryUnlocked', 'viniUnlocked', 'squidwardUnlocked'].every(key => progress.data[key] === true);

// Time belongs to this run. Pausing does not accumulate missed waves.
export class MayhemWaves {
  constructor(countPuppets, spawn) {
    this.countPuppets = countPuppets;
    this.spawn = spawn;
    this.elapsed = 0;
    this.nextPuppets = PUPPET_INTERVAL;
    this.nextBosses = BOSS_INTERVAL;
    this.puppets();
  }
  puppets() {
    const count = Math.min(PUPPET_WAVE, Math.max(0, PUPPET_LIMIT - this.countPuppets()));
    if (count) this.spawn('puppet', count);
  }
  update(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.elapsed += seconds;
    while (this.elapsed + 1e-7 >= this.nextPuppets) {
      this.puppets(); this.nextPuppets += PUPPET_INTERVAL;
    }
    while (this.elapsed + 1e-7 >= this.nextBosses) {
      this.spawn('boss', BOSS_WAVE); this.nextBosses += BOSS_INTERVAL;
    }
  }
}
