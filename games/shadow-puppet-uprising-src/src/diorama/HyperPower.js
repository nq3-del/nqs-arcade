import * as THREE from 'three';

export const HYPER_DURATION = 15;
export const HYPER_COOLDOWN = 5;
export const BEAM_RANGE = 38;
export const BEAM_RADIUS = 1.35;
export function beamHits(start, end, point, radius = BEAM_RADIUS) {
  const dx=end.x-start.x, dy=end.y-start.y, dz=end.z-start.z;
  const px=point.x-start.x, py=point.y-start.y, pz=point.z-start.z;
  const t=Math.max(0,Math.min(1,(px*dx+py*dy+pz*dz)/Math.max(.001,dx*dx+dy*dy+dz*dz)));
  return (px-dx*t)**2+(py-dy*t)**2+(pz-dz*t)**2 <= radius*radius;
}

// The palace wall mirrors are circular surfaces in the XY plane.
export function beamHitsMirror(start,end,mirror,radius=BEAM_RADIUS) {
  const dz=end.z-start.z;
  if(Math.abs(dz)<1e-8)return false;
  const t=(mirror.z-start.z)/dz;
  return t>=0&&t<=1&&Math.hypot(start.x+(end.x-start.x)*t-mirror.x,start.y+(end.y-start.y)*t-mirror.y)<=mirror.radius+radius;
}
export class HyperPower {
  constructor(player) { this.player = player; this.remaining = 0; this.cooldown = 0; this.beams = []; }
  get active() { return this.remaining > 0; }
  activate() {
    const p = this.player, s = p.scene;
    if (p.squidwardEquipped || p.combatSuppressed?.() || !p.superPower.active || p.superPower.busy || this.active || this.cooldown > 0 || p.downed || s.cinematic || s.ending) return false;
    p.clearBasketballSkin();
    this.remaining = HYPER_DURATION;
    p.setSuperAppearance(true);
    s.services.audio.play('switch');
    s.services.ui.toast('HYPER GOKU! 15 seconds of blue power. J / ' + (s.services.ui.controllerButton?.('j') || '□') + ' fires your ultimate beam!', 4000);
    return true;
  }
  cancel() {
    if (this.active) { this.remaining = 0; this.cooldown = HYPER_COOLDOWN; }
    this.clearBeams();
  }
  fire() {
    const p = this.player, s = p.scene;
    if (p.combatSuppressed?.() || !this.active || s.time.now < (this.beamReady || 0)) return false;
    this.beamReady = s.time.now + 650;
    p.swingUntil = s.time.now + 450;
    const start = new THREE.Vector3(p.x + p.facing.x * 0.6, p.y + 1.45, p.z + p.facing.z * 0.6);
    let direction = new THREE.Vector3(p.facing.x, 0, p.facing.z).normalize();
    let nearest=null, nearestDistance=BEAM_RANGE*BEAM_RANGE;
    const consider=e=>{
      if(!e?.active || e.friendlyUntil>s.time.now)return;
      const x=e.x-start.x,y=(e.y||0)+1.2-start.y,z=e.z-start.z,dist=x*x+y*y+z*z;
      if(dist<nearestDistance && (x*direction.x+y*direction.y+z*direction.z)/Math.sqrt(dist)>.55) {nearest=e;nearestDistance=dist;}
    };
    for(const e of s.enemies||[])consider(e);consider(s.boss);
    const aimingAtMirror=s.levelId===3&&(s.view.mirrors||[]).some(m=>beamHitsMirror(start,start.clone().addScaledVector(direction,BEAM_RANGE),m));
    if(nearest&&!aimingAtMirror)direction.set(nearest.x-start.x,(nearest.y||0)+1.2-start.y,nearest.z-start.z).normalize();
    const end = start.clone().addScaledVector(direction, BEAM_RANGE);
    const model = s.view.hyperBeam(start, end);
    const beam = { start, end, model, elapsed: 0, hit: new Set() };
    this.beams.push(beam);
    s.services.audio.play('beam');
    s.chaosMission?.action('basic', p);
    s.adventure?.action('basic', p);
    this.damage(beam);
    return true;
  }
  damage(beam) {
    const p = this.player, s = p.scene;
    if(this.active && p.superPower.active && s.levelId===3 && (s.view.mirrors||[]).some(m=>beamHitsMirror(beam.start,beam.end,m)))s.discoverSquidward?.(p);
    s.pvp?.beam(p, beam);
    for (const e of [...(s.enemies || []), s.boss]) {
      if (!e?.active || e.friendlyUntil > s.time.now || beam.hit.has(e)) continue;
      if (beamHits(beam.start, beam.end, { x: e.x, y: (e.y || 0) + 1.2, z: e.z }, BEAM_RADIUS + 0.5)) {
        beam.hit.add(e);
        e.hit(Infinity, 'hyper', p);
      }
    }
    for (const prop of s.props || []) {
      if (prop.done || !['barrier', 'target'].includes(prop.type)) continue;
      if (beamHits(beam.start, beam.end, { x: prop.x, y: 1, z: prop.z }, BEAM_RADIUS + 0.5)) {
        prop.done = true; s.view.remove(prop.view); s.view.effect(prop.x, prop.z, '#42cfff', 18);
      }
    }
  }
  update(dt) {
    if (this.active) {
      this.remaining = this.remaining - dt > 1e-7 ? this.remaining - dt : 0;
      if (!this.active) {
        this.cooldown = HYPER_COOLDOWN;
        this.clearBeams();
        this.player.setSuperAppearance(this.player.superPower.active);
      }
    } else this.cooldown = this.cooldown - dt > 1e-7 ? this.cooldown - dt : 0;
    this.beams = this.beams.filter(beam => {
      beam.elapsed += dt;
      if (beam.elapsed >= 0.55) { this.player.scene.view.remove(beam.model); return false; }
      this.damage(beam);
      const width = Math.max(0.04, Math.sin(Math.PI * beam.elapsed / 0.55));
      beam.model.scale.set(width, 1, width);
      return true;
    });
  }
  clearBeams() { this.beams.forEach(beam => this.player.scene.view.remove(beam.model)); this.beams = []; }
  destroy() { this.clearBeams(); }
}
