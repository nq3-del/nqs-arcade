import * as THREE from 'three';

export const GLAMOUR_ART = './assets/characters/handsome-squidward.png';
let sharedTexture;
export function glamourTexture() {
  if (!sharedTexture) {
    sharedTexture = new THREE.TextureLoader().load(GLAMOUR_ART);
    sharedTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return sharedTexture;
}
export function glamourMaterial() {
  return new THREE.MeshBasicMaterial({map:glamourTexture(),transparent:true,alphaTest:.08,depthWrite:false,depthTest:false,side:THREE.DoubleSide});
}

// Timers use gameplay time so pausing freezes the temporary disguise.
export class GlamourEffects {
  constructor(scene) { this.scene=scene; this.targets=new Map(); }
  apply(target,duration=8000,pvp=false) {
    if (!target?.active || target.downed) return;
    const until=this.scene.time.now+duration;
    target.glamourVisualUntil=Math.max(target.glamourVisualUntil||0,until);
    // Mayhem renders the same art in its bounded instanced crowd batch.
    if (target.kind==='puppet'||target.kind==='boss') return;
    const old=this.targets.get(target);
    if (old) {old.until=target.glamourVisualUntil;old.pvp=pvp;return;}
    const sprite=this.scene.view.glamourPortrait();
    this.targets.set(target,{sprite,until:target.glamourVisualUntil,pvp});
    this.position(target,sprite);
  }
  position(target,sprite) {
    const large=target.activeFight!==undefined,size=large?3.6:2.5;
    sprite.position.set(target.x,(target.y||0)+(large?2.25:1.55),target.z);
    sprite.scale.set(size,size,1);
    sprite.visible=!this.scene.cinematic&&!this.scene.ending;
  }
  clear(target) {
    const effect=this.targets.get(target);
    if(effect) {this.scene.view.remove(effect.sprite);effect.sprite.material.dispose();this.targets.delete(target);}
    target.glamourVisualUntil=0;
  }
  clearPvP() {for(const [target,effect] of this.targets)if(effect.pvp)this.clear(target);}
  update() {
    for(const [target,effect] of this.targets) {
      if(this.scene.cinematic){effect.sprite.visible=false;continue;}
      effect.until=target.glamourVisualUntil;
      if(!target.active||target.downed||this.scene.time.now>=effect.until||(effect.pvp&&!this.scene.pvp?.enabled))this.clear(target);
      else this.position(target,effect.sprite);
    }
  }
  destroy() {for(const target of this.targets.keys())this.clear(target);}
}
