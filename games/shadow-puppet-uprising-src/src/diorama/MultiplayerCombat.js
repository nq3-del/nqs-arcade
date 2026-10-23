import { beamHits } from './HyperPower.js';

export const P2_KEYS = { left:'left',right:'right',up:'up',down:'down',space:'p2jump',c:'p2descend',j:'p2attack',k:'p2power',q:'p2form',s:'p2super',r:'p2skin',y:'p2curry',u:'p2vini',i:'p2celebrate',h:'p2squidward',t:'p2shoot',e:'p2interact',tab:'p2ally',l:'p2call' };
export const TWO_PLAYER_CONTROLS = 'P1: W A D X move · Space jump · J attack · K power · Q form · S Super\nP2: arrows move · 0 jump · 1 attack · 2 power · 3 form · 4 Super · 9 descend\nP2: Enter interact · M choose ally · N call ally · Characters chooses skins';

export class MultiplayerCombat {
  constructor(scene) { this.scene=scene;this.enabled=scene.services.progress.data.settings.pvp !== false; }
  get enabled() {return this._enabled;}
  set enabled(value) {
    this._enabled=value===true;
    if(!this._enabled) {
      for(const p of this.scene.players||[]) {p.kindnessUntil=0;p.pvpGlamourUntil=0;}
      this.scene.glamour?.clearPvP();
    }
  }
  familyAbility(attacker,id) {
    const s=this.scene,victim=s.players.find(p=>p!==attacker);
    if(!this.enabled||!victim||attacker.downed||victim.downed||s.ending||s.cinematic||
      Math.hypot(victim.x-attacker.x,victim.z-attacker.z)>=4||Math.abs(victim.y-attacker.y)>=3)return false;
    if(id==='grandad') {const hit=this.hurt(attacker,victim,5,14);if(hit&&!victim.downed)victim.vy=8;return hit;}
    if(id==='leah')return this.hurt(attacker,victim,6,14);
    if(id==='nana') {victim.kindnessUntil=s.time.now+3000;s.view.effect(victim.x,victim.z,'#b7e877',12);return true;}
    if(id==='mummy') {
      victim.pvpGlamourUntil=s.time.now+4000;
      s.glamour?.apply(victim,4000,true);s.view.effect(victim.x,victim.z,'#ef9be0',12);return true;
    }
    return false;
  }
  allyProjectile(projectile,height) {
    if(!projectile.friendly||!projectile.caster||!this.enabled)return false;
    const victim=this.scene.players.find(p=>p!==projectile.caster&&!p.downed);
    if(!victim||projectile.hits.has(victim)||Math.hypot(victim.x-projectile.x,victim.z-projectile.z)>=.8||
      Math.abs(victim.y+.8-height)>=.85)return false;
    const hit=this.hurt(projectile.caster,victim,5,12);
    if(hit)projectile.hits.add(victim);
    return hit;
  }
  hurt(attacker,victim,amount,force=8) {
    const s=this.scene;
    if(!this.enabled||attacker===victim||attacker.downed||victim.downed||s.ending||s.cinematic)return false;
    victim.invulnerableUntil=s.time.now+250;
    const d=Math.max(0.001,Math.hypot(victim.x-attacker.x,victim.z-attacker.z));
    victim.vx=(victim.x-attacker.x)/d*force;victim.vz=(victim.z-attacker.z)/d*force;
    victim.knockUntil=s.time.now+300;
    victim.health=Math.max(0,victim.health-amount);
    s.view.effect(victim.x,victim.z,'#d6eaff',10);s.services.audio.play('hit');
    if(victim.health===0)this.defeated(victim);
    return true;
  }
  defeated(player) {
    if(player.respawnRemaining>0)return;
    player.kindnessUntil=player.pvpGlamourUntil=player.glamourUntil=0;
    this.scene.glamour?.clear(player);
    if(this.scene.mayhem){this.scene.mayhem.defeatedPlayer(player);return;}
    player.downed=true;player.respawnRemaining=3;
    player.hyperPower.cancel();player.superPower.destroy();player.superPower.phase='normal';
    player.vx=player.vz=player.vy=0;player.setSuperAppearance(false);
  }
  melee(attacker,range,amount,kind) {
    const victim=this.scene.players.find(p=>p!==attacker);
    if(Math.hypot(victim.x-attacker.x,victim.z-attacker.z)<range&&Math.abs(victim.y-attacker.y)<2)
      this.hurt(attacker,victim,amount,kind==='power'?14:8);
  }
  beam(attacker,beam) {
    const victim=this.scene.players.find(p=>p!==attacker);
    if(!beam.hit.has(victim)&&beamHits(beam.start,beam.end,{x:victim.x,y:victim.y+1.2,z:victim.z},1.85)){
      beam.hit.add(victim);this.hurt(attacker,victim,Infinity,24);
    }
  }
  damageArea(attacker,area,amount) {
    const victim=this.scene.players.find(p=>p!==attacker);
    if(Math.hypot(victim.x-area.x,victim.z-area.z)<=area.radius&&victim.y<4)this.hurt(attacker,victim,amount,amount>5?15:3);
  }
  update(dt) {
    const s=this.scene;
    if(s.mayhem)return;
    for(const player of s.players){
      if(!player.downed||!(player.respawnRemaining>0))continue;
      player.respawnRemaining=Math.max(0,player.respawnRemaining-dt);
      if(player.respawnRemaining>1e-7)continue;
      const friend=s.players.find(p=>p!==player&&!p.downed);
      const anchor=friend||s.spawn;
      const spots=[[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,-2]].map(([x,z])=>({x:anchor.x+x,z:anchor.z+z}));
      const at=spots.find(p=>s.view.walkable(p.x,p.z)&&!s.view.wet(p.x,p.z)&&!s.view.blocked(p.x,p.z))||s.spawn;
      player.x=at.x;player.z=at.z;player.y=s.view.floorHeight(at.x,at.z);
      player.downed=false;player.respawnRemaining=0;player.health=player.maxHealth;
      player.vx=player.vz=player.vy=0;player.dashUntil=0;player.knockUntil=0;
      player.invulnerableUntil=s.time.now+1500;player.sync(0);
      s.view.effect(player.x,player.z,'#bce0b4',20);
    }
  }
}
