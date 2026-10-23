import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Progress } from '../src/systems/Progress.js';
import { ReplayProgress,replayCharacters } from '../src/systems/ReplayProgress.js';
import { ALLY_IDS } from '../src/data/config.js';
import { CHAOS_EMERALDS,STAGE_STARS } from '../src/data/chaos.js';
import { DioramaPlayer } from '../src/diorama/Actors.js';
import { AllyTeam } from '../src/diorama/AllyTeam.js';
import { GlamourEffects } from '../src/diorama/GlamourEffects.js';
import { MultiplayerCombat } from '../src/diorama/MultiplayerCombat.js';
import { beamHitsMirror } from '../src/diorama/HyperPower.js';
function fixture(){
  const values=new Map(),progress=new Progress({getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)});
  const model=kind=>({kind,root:new THREE.Group(),body:new THREE.Group(),rig:{legs:[],arms:[],stalks:[]}});
  const s={time:{now:100},difficulty:{health:20,invulnerability:1000},definition:{bounds:[40,30]},originActions:{},
    inputFor:()=>({pressed:()=>false,down:()=>false}),services:{progress,audio:{play(){}},ui:{toast(){}}},
    view:{character:model,superGoku:()=>model('goku'),handsomeSquidward:()=>model('squidward'),
      lebronJames:()=>model('lebron'),stephCurry:()=>model('curry'),viniJr:()=>model('vini'),
      marker:()=>new THREE.Group(),remove(){},effect(){},floorHeight:()=>0,walkable:()=>true,wet:()=>false,
      hyperBeam:()=>new THREE.Group(),glamourPortrait:()=>new THREE.Sprite(new THREE.SpriteMaterial())},
    summons:[],enemies:[],props:[],tryFinalAlly(){},projectile(...args){s.shot=args;},isSlippery:()=>false,blocked:()=>false,
    melee(){s.attacks=(s.attacks||0)+1;}};
  s.players=[new DioramaPlayer(s,0,0),new DioramaPlayer(s,1,0,1)];s.player=s.players[0];
  s.players.forEach(p=>p.allies=new AllyTeam(s,p));s.glamour=new GlamourEffects(s);s.pvp=new MultiplayerCombat(s);
  return {s,p:s.player,v:s.players[1],progress};
}
function unlock(progress){
  progress.completeOrigin();ALLY_IDS.forEach(id=>progress.rescue(id));progress.completeFinal();
  STAGE_STARS.forEach((points,l)=>points.forEach((_,i)=>progress.collect(l,i)));
  CHAOS_EMERALDS.forEach(e=>{progress.data.chaosTrials[e.id]=3;progress.collectEmerald(e.id);});
}
test('palace wall mirror detects beam intersection, rejects misses, parallel rays and mirrors behind the player',()=>{
  const mirror={x:7,y:3,z:-17.5,radius:2},start={x:7,y:1.45,z:-8};
  assert.equal(beamHitsMirror(start,{x:7,y:1.45,z:-40},mirror),true);
  for(const end of [{x:7,y:1.45,z:10},{x:30,y:1.45,z:-40},{x:30,y:1.45,z:-8}])assert.equal(beamHitsMirror(start,end,mirror),false);
});
test('secret cosmetic unlock saves once, survives reload/replay and is exclusive with other skins per player',()=>{
  const {progress,p,v}=fixture();assert.equal(progress.unlockSquidward(),false);unlock(progress);
  assert.equal(progress.unlockSquidward(),true);assert.equal(progress.unlockSquidward(),false);
  p.toggleSquidward();v.toggleSquidward();assert.deepEqual(new Progress(progress.storage).data.squidwardEquipped,[true,true]);
  for(const [unlockSkin,equip,flag] of [['unlockLeBron','setLeBronEquipped','lebronEquipped'],['unlockCurry','setCurryEquipped','curryEquipped'],['unlockVini','setViniEquipped','viniEquipped']]){
    progress[unlockSkin]();p[equip](true);assert.equal(p.squidwardEquipped,false);assert.equal(new Progress(progress.storage).data.squidwardEquipped[0],false);
    p.setSquidwardEquipped(true);assert.equal(p[flag],false);
  }
  assert.equal(v.squidwardEquipped,true);assert.ok(replayCharacters(progress).some(c=>c.id==='squidward'));
  progress.data.squidwardUnlocked=false;const replay=new ReplayProgress(progress,3);assert.equal(replay.unlockSquidward(),true);assert.equal(progress.data.squidwardUnlocked,true);
  progress.reset();assert.equal(new Progress(progress.storage).data.squidwardUnlocked,false);
});
test('cosmetic skin cancels Hyper and cannot attack, transform, use powers or summon; walking and jumping remain',()=>{
  const {s,p,progress}=fixture();unlock(progress);progress.unlockSquidward();p.superPower.phase='super';p.hyperPower.remaining=15;
  p.setSquidwardEquipped(true);assert.equal(p.hyperPower.active,false);assert.equal(p.superPower.active,false);
  p.attack();p.ability();assert.equal(p.superPower.toggle(),false);assert.equal(p.hyperPower.activate(),false);p.allies.select('grandad');p.allies.use();
  assert.equal(s.attacks,undefined);assert.equal(s.summons.length,0);assert.equal(p.statusSuppressed(),false);
  p.controls={pressed:key=>key==='space',down:key=>key==='right'};p.update(.05);assert.ok(p.x>0);assert.ok(p.y>0);
});
test('Mummy replaces nearby enemies visually for eight seconds; repeated potion extends duration and death clears it',()=>{
  const {s,p,progress}=fixture();progress.rescue('mummy');p.allies.select('mummy');
  const enemy={active:true,x:1,z:0},far={active:true,x:7,z:0};s.enemies=[enemy,far];p.allies.use();
  assert.equal(enemy.poseUntil,8100);assert.equal(s.glamour.targets.size,2); // enemy and PvP opponent
  assert.equal(far.glamourVisualUntil,undefined);s.time.now=8100;s.glamour.update();assert.equal(s.glamour.targets.size,0);
  s.glamour.apply(enemy);s.time.now+=1000;s.glamour.apply(enemy);assert.equal(s.glamour.targets.get(enemy).until,17100);
  enemy.active=false;s.glamour.update();assert.equal(s.glamour.targets.size,0);
});
test('every family ability affects either opponent only with PvP on; disabling PvP immediately removes temporary effects',()=>{
  const {s,p,v,progress}=fixture();ALLY_IDS.forEach(id=>progress.rescue(id));
  for(const attacker of [p,v]){
    const victim=attacker===p?v:p;
    for(const enabled of [false,true])for(const id of ['grandad','leah','nana','mummy']){
      s.pvp.enabled=enabled;attacker.kindnessUntil=attacker.pvpGlamourUntil=0;victim.health=20;victim.kindnessUntil=victim.pvpGlamourUntil=0;
      attacker.allies.select(id);attacker.allies.readyAt[id]=0;attacker.allies.use();
      if(['grandad','leah'].includes(id))assert.equal(victim.health,enabled?20-(id==='grandad'?5:6):20);
      if(id==='nana')assert.equal(victim.kindnessUntil>0,enabled);
      if(id==='mummy')assert.equal(victim.pvpGlamourUntil>0,enabled);
      s.pvp.enabled=false;assert.equal(victim.kindnessUntil,0);assert.equal(victim.pvpGlamourUntil,0);assert.equal(s.glamour.targets.size,0);
    }
    attacker.allies.select('daddy');attacker.allies.readyAt.daddy=0;attacker.allies.use();assert.equal(s.shot.at(-1),attacker);
    victim.health=20;const ball={friendly:true,caster:attacker,x:victim.x,z:victim.z,hits:new Set()};
    assert.equal(s.pvp.allyProjectile(ball,.8),false);s.pvp.enabled=true;
    assert.equal(s.pvp.allyProjectile(ball,.8),true);assert.equal(victim.health,15);assert.equal(s.pvp.allyProjectile(ball,.8),false);
  }
});
