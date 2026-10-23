import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Progress, SAVE_KEY } from '../src/systems/Progress.js';
import { ALLY_IDS } from '../src/data/config.js';
import { CHAOS_EMERALDS, STAGE_STARS } from '../src/data/chaos.js';
import { STADIUM_HOOPS, descendsThroughRim, basketballArc, basketballPosition } from '../src/data/basketball.js';
import { Basketball, FIRE_COOLDOWN } from '../src/diorama/Basketball.js';
import { Football } from '../src/diorama/Football.js';
import { Controllers } from '../src/systems/Controllers.js';
import { MultiplayerCombat } from '../src/diorama/MultiplayerCombat.js';
import { ReplayProgress, canReplay, replayCharacters } from '../src/systems/ReplayProgress.js';
import { DioramaPlayer, DioramaBoss } from '../src/diorama/Actors.js';
import { stadiumColliders, sportsBlocked, FOOTBALL_GOALS } from '../src/diorama/SportsCollisions.js';
import { beamHits } from '../src/diorama/HyperPower.js';

function memory() { const m = new Map(); return { getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v) }; }
function unlockSuper(p) {
  p.completeOrigin(); ALLY_IDS.forEach(id=>p.rescue(id)); p.completeFinal();
  STAGE_STARS.forEach((points,level)=>points.forEach((_,id)=>p.collect(level,id)));
  CHAOS_EMERALDS.forEach(e=>{p.data.chaosTrials[e.id]=3;p.collectEmerald(e.id);});
}
function playerFixture() {
  const progress = new Progress(memory());
  const model = kind => ({kind,root:new THREE.Group(),body:new THREE.Group(),rig:{legs:[],arms:[],stalks:[]}});
  const s = {time:{now:100},difficulty:{health:8,invulnerability:1000},definition:{bounds:[40,30]},originActions:{},
    inputFor:()=>({pressed:()=>false,down:()=>false}),
      services:{progress,audio:{play(){}},ui:{toast(){},lebronReward(){s.rewards=(s.rewards||0)+1;},curryReward(){s.curryRewards=(s.curryRewards||0)+1;}}},
    view:{character:model,superGoku:h=>model(h?'hyper-goku':'super-goku'),lebronJames:()=>model('lebron-james'),stephCurry:()=>model('steph-curry'),
      marker:()=>new THREE.Group(),remove(){},effect(){},floorHeight:()=>0,walkable:()=>true,wet:()=>false,blocked:()=>false,
      viniJr:()=>model('vini-jr'),football:()=>new THREE.Group(),basketball:()=>new THREE.Group(),basketballFire:()=>new THREE.Group(),hyperBeam:()=>new THREE.Group(),box(){}},
    enemies:[],props:[],isSlippery:()=>false,blocked:()=>false};
  const p=new DioramaPlayer(s,0,0);s.player=p;
  return {s,p,progress};
}

test('Vini stays hidden until Daddy scores; both players may equip the same saved skin',()=>{
  const {s,p,progress}=playerFixture();assert.equal(progress.unlockVini(),false);progress.rescue('daddy');
  s.discoverVini=()=>progress.unlockVini();s.football=new Football(s);
  const before={x:20,z:-1},shot={x:23,z:-1,owner:'daddy',friendly:true,type:'ball'};
  assert.equal(s.football.observeDaddyShot({...shot,friendly:false},before),false);
  assert.equal(s.football.observeDaddyShot({...shot,z:6},{x:20,z:6}),false);
  assert.equal(progress.data.viniUnlocked,false);assert.equal(s.football.observeDaddyShot(shot,before),true);
  assert.equal(s.football.observeDaddyShot(shot,before),false);
  const other=new DioramaPlayer(s,2,0,1);
  p.toggleVini();other.toggleVini();assert.equal(p.actor.kind,'vini-jr');assert.equal(other.actor.kind,'vini-jr');
  assert.deepEqual(new Progress(progress.storage).data.viniEquipped,[true,true]);
  assert.equal(p.celebrate(),true);const until=p.celebratingUntil;
  s.time.now+=2999;assert.equal(p.celebrate(),false);assert.equal(p.celebratingUntil,until);
  s.time.now++;assert.equal(p.celebrate(),true);p.toggleVini();assert.equal(p.actor.kind,'A');assert.equal(other.viniEquipped,true);
});

test('Vini football scores, shares the exact fire damage, radius, five-second lifetime and cooldown',()=>{
  const {s,p,progress}=playerFixture();progress.rescue('daddy');progress.unlockVini();p.toggleVini();
  s.football=new Football(s);p.x=16;p.z=-1;
  const enemy={x:22,z:-1,active:true,health:100,hit(n){this.health-=n;}};s.enemies=[enemy];
  assert.equal(s.football.shoot(p),true);assert.equal(s.football.shoot(p,true),true);
  const ready=p.lebronAbilityReady,shot=s.football.shots[1];s.football.update(shot.arc.duration);
  assert.equal(s.football.baskets,2);assert.equal(enemy.health,88);assert.equal(s.football.fires[0].radius,4);
  assert.equal(s.football.speedMultiplier(enemy),.8);s.football.update(5);
  assert.equal(enemy.health,78);assert.equal(s.football.fires.length,0);
  s.time.now=ready-1;assert.equal(s.football.shoot(p,true),false);s.time.now++;assert.equal(s.football.shoot(p,true),true);
});

test('first connected controller is P1 even when later controllers have lower indices',()=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');let pads=[];
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});
  try {
    const ui={mode:'game',scene:{players:[{},{}]}},c=new Controllers({ui}),pad=index=>({index,axes:[1,0],buttons:[]});
    pads=[pad(2)];c.poll();assert.equal(c.down(0,'right'),true);assert.equal(c.down(1,'right'),false);
    pads=[{...pad(0),axes:[-1,0]},pad(2)];c.poll();assert.equal(c.down(0,'right'),true);assert.equal(c.down(1,'left'),true);
    pads=[pad(0)];c.poll();assert.equal(c.down(0,'right'),true);
    ui.scene.players[0].viniEquipped=true;pads[0].buttons[13]={pressed:true};c.poll();
    assert.equal(c.pressed(0,'i'),true);assert.equal(c.pressed(0,'r'),false);
  } finally {if(old)Object.defineProperty(globalThis,'navigator',old);else delete globalThis.navigator;}
});

test('secret unlock requires all emeralds; skin and both player choices persist and reset safely',()=>{
  const store=memory(),p=new Progress(store);
  assert.equal(p.unlockLeBron(),false);assert.equal(p.equipLeBron(0,true),false);
  unlockSuper(p);assert.equal(p.unlockLeBron(),true);assert.equal(p.unlockLeBron(),false);
  p.equipLeBron(0,true);p.equipLeBron(1,true);p.equipLeBron(1,false);
  const loaded=new Progress(store);assert.equal(loaded.data.lebronUnlocked,true);
  assert.deepEqual(loaded.data.lebronEquipped,[true,false]);
  loaded.reset();assert.equal(loaded.data.lebronUnlocked,false);assert.deepEqual(loaded.data.lebronEquipped,[false,false]);
  store.setItem(SAVE_KEY,JSON.stringify({version:1,lebronUnlocked:'true',lebronEquipped:[true,true]}));
  assert.deepEqual(new Progress(store).data.lebronEquipped,[false,false]);
});

test('Hyper hoop discovery unlocks only Curry; Y toggles and both costumes remain mutually exclusive and saved',()=>{
  const {s,p,progress}=playerFixture();unlockSuper(progress);const h=STADIUM_HOOPS[0],b=new Basketball(s);
  assert.equal(p.toggleCurry(),false);p.superPower.phase='super';p.hyperPower.activate();
  Object.assign(p,{x:h.x,z:h.z,y:h.y-.4});
  b.observeStep(p,{x:h.x,z:h.z,y:h.y+.2,super:true});
  assert.equal(progress.data.curryUnlocked,true);assert.equal(progress.data.lebronUnlocked,false);assert.equal(s.curryRewards,1);
  p.toggleCurry();assert.equal(p.actor.kind,'steph-curry');assert.equal(p.hyperPower.active,true);
  p.toggleCurry();assert.equal(p.actor.kind,'hyper-goku');
  progress.unlockLeBron();p.toggleLeBron();p.toggleCurry();assert.equal(p.lebronEquipped,false);
  assert.deepEqual(progress.data.lebronEquipped,[false,false]);assert.deepEqual(progress.data.curryEquipped,[true,false]);
  const loaded=new Progress(progress.storage);assert.equal(loaded.data.curryUnlocked,true);assert.equal(loaded.data.curryEquipped[0],true);
  p.hyperPower.cancel();p.superPower.phase='normal';p.x=h.x;p.z=h.z+4;assert.equal(b.shoot(p),true);
  assert.equal(b.shoot(p,true),true);loaded.reset();assert.equal(loaded.data.curryUnlocked,false);
});

test('Multiplayer has PvP by default, kills players and respawns them after exactly three seconds',()=>{
  const {s,p,progress}=playerFixture();const other=new DioramaPlayer(s,1,0,1);s.players=[p,other];s.spawn={x:0,z:0};
  s.pvp=new MultiplayerCombat(s);assert.equal(s.pvp.enabled,true);assert.equal(progress.data.settings.pvp,true);
  assert.equal(s.pvp.hurt(p,other,Infinity),true);assert.equal(other.downed,true);assert.equal(other.health,0);
  s.pvp.update(2.99);assert.equal(other.downed,true);s.time.now+=3000;s.pvp.update(.01);
  assert.equal(other.downed,false);assert.equal(other.health,other.maxHealth);assert.equal(other.respawnRemaining,0);
  assert.equal(s.pvp.hurt(p,other,Infinity),true); // Player attacks bypass spawn protection too.
  s.pvp.defeated(p);s.pvp.update(3);assert.equal(p.downed,false);assert.equal(other.downed,false);
});

test('PvP setting disables all friendly fire; enabled player attacks bypass all enemy invincibility',()=>{
  const {s,p,progress}=playerFixture();const other=new DioramaPlayer(s,1,0,1);s.players=[p,other];s.spawn={x:0,z:0};
  s.pvp=new MultiplayerCombat(s);s.pvp.enabled=false;
  s.pvp.melee(p,5,99,'power');assert.equal(other.health,8);
  s.pvp.damageArea(p,{x:1,z:0,radius:4},12);assert.equal(other.health,8);
  s.pvp.enabled=true;other.superPower.phase='super';other.hyperPower.activate();other.invulnerableUntil=99999;
  other.hurt(p);assert.equal(other.health,8);
  s.pvp.hurt(p,other,1);assert.equal(other.health,7);
  s.pvp.hurt(p,other,1);assert.equal(other.health,6);
  s.pvp.hurt(p,other,999);assert.equal(other.downed,true);
  progress.data.settings.pvp=false;progress.save();assert.equal(new Progress(progress.storage).data.settings.pvp,false);
});

test('Replay resets only the selected story while preserving real unlocks, checkpoints, quests and unique pickups',()=>{
  const {progress}=playerFixture();assert.equal(canReplay(progress,0),false);
  unlockSuper(progress);progress.unlockLeBron();progress.unlockCurry();
  progress.data.adventures[5]={revision:2,step:7};progress.setCheckpoint(3,true,{x:4,z:1});
  const before=JSON.stringify(progress.data),replay=new ReplayProgress(progress,5);
  assert.equal(canReplay(progress,5),true);assert.equal(replay.armyAlive('daddy'),true);
  assert.equal(replay.data.adventures[5],undefined);assert.equal(replay.data.victory,false);assert.equal(replay.superUnlocked(),true);
  replay.setCheckpoint(5,true,{x:9,z:0});replay.rescue('daddy');replay.completeFinal();
  assert.equal(JSON.stringify(progress.data),before);
  assert.deepEqual(replayCharacters(progress).map(c=>c.id),['A','B','goku','hyper','lebron','curry']);
  delete progress.data.collected['d5:0'];progress.data.stars--;
  assert.equal(replay.collect(5,0),true);assert.equal(progress.data.stars,158);assert.equal(replay.collect(5,0),false);
  assert.equal(progress.data.checkpoint.level,3);
});

test('rim crossing accepts descent through either opening, rejects ascent, rim edges and lateral passes',()=>{
  for(const h of STADIUM_HOOPS){
    const above={x:h.x,y:h.y+0.4,z:h.z},below={...above,y:h.y-0.4};
    assert.equal(descendsThroughRim(above,below,h),true);
    assert.equal(descendsThroughRim(below,above,h),false);
    assert.equal(descendsThroughRim({...above,x:h.x+1}, {...below,x:h.x+1},h),false);
    assert.equal(descendsThroughRim({...above,y:h.y-0.1},below,h),false);
    assert.equal(descendsThroughRim({...above,x:h.x-1},{...below,x:h.x+1},h),true);
  }
});

test('actual Super Goku descent unlocks once; ordinary form and rising Goku cannot reveal it',()=>{
  const {s,p,progress}=playerFixture();unlockSuper(progress);const b=new Basketball(s),h=STADIUM_HOOPS[0];
  Object.assign(p,{x:h.x,z:h.z,y:h.y-0.4});
  const before={x:h.x,y:h.y+0.3,z:h.z,super:true};
  b.observeStep(p,before);assert.equal(progress.data.lebronUnlocked,false);
  p.superPower.phase='super';p.y=h.y+1;b.observeStep(p,before);assert.equal(progress.data.lebronUnlocked,false);
  p.y=h.y-0.4;b.observeStep(p,before);assert.equal(progress.data.lebronUnlocked,true);
  b.observeStep(p,before);assert.equal(s.rewards,1);
});

test('R toggles the skin without losing the original form or Super flight',()=>{
  const {p,progress}=playerFixture();assert.equal(p.toggleLeBron(),false);
  unlockSuper(progress);progress.unlockLeBron();p.switchForm();
  assert.equal(p.toggleLeBron(),true);assert.equal(p.actor.kind,'lebron-james');
  p.toggleLeBron();assert.equal(p.actor.kind,'B');
  p.superPower.phase='super';p.setSuperAppearance(true);p.toggleLeBron();assert.equal(p.superPower.active,true);
  p.toggleLeBron();assert.equal(p.actor.kind,'super-goku');assert.equal(p.form,'B');
});

test('basketball requires the equipped skin, shoots freely away from a rim, obeys cooldown and cleans up',()=>{
  const {s,p,progress}=playerFixture(),b=new Basketball(s),h=STADIUM_HOOPS[0];
  assert.equal(b.shoot(p),false);unlockSuper(progress);progress.unlockLeBron();p.toggleLeBron();
  assert.equal(b.shoot(p),true);assert.equal(b.shots[0].free,true);b.update(3);
  assert.equal(b.baskets,0);assert.equal(b.shots.length,0);s.time.now+=1100;p.x=h.x;p.z=h.z+4;
  assert.equal(b.shoot(p),true);assert.equal(b.shoot(p),false);
  const arc=b.shots[0].arc;
  const at = basketballPosition(arc,arc.duration);
  assert.ok(Math.hypot(at.x-h.x,at.y-h.y,at.z-h.z)<1e-9);
  for(let t=0;t<5;t+=0.025)b.update(0.025);
  assert.equal(b.baskets,1);assert.equal(b.shots.length,0);
});

test('basketballs arc upward then pass downward through the rim from ground or flight',()=>{
  const h=STADIUM_HOOPS[0];
  for(const y of [2.65,8]){
    const arc=basketballArc({x:h.x+3,y,z:h.z+4},h);
    const mid=basketballPosition(arc,arc.duration/2),end=basketballPosition(arc,arc.duration);
    assert.ok(mid.y>Math.max(y,h.y));assert.ok(Math.abs(end.y-h.y)<1e-9);
    assert.ok(basketballPosition(arc,arc.duration+0.01).y<h.y);
  }
});

test('stadium geometry is solid at correct heights, with open goal mouths and rim centers',()=>{
  const c=stadiumColliders();
  for(const h of STADIUM_HOOPS){
    assert.equal(sportsBlocked(c,h.x,0,h.z-1.15),true);
    assert.equal(sportsBlocked(c,h.x,3,h.z-1.05),true);
    assert.equal(sportsBlocked(c,h.x,0,h.z),false);
    for(let y=0;y<8;y+=0.1)assert.equal(sportsBlocked(c,h.x,y,h.z,2.65),false);
    assert.equal(sportsBlocked(c,h.x+h.radius,3,h.z),true);
    assert.equal(sportsBlocked(c,h.x,7,h.z-1.05),false);
  }
  for(const g of FOOTBALL_GOALS){
    assert.equal(sportsBlocked(c,g.x,0,g.z-3),true);
    assert.equal(sportsBlocked(c,g.x,0,g.z),false);
    assert.equal(sportsBlocked(c,g.x,2.5,g.z),true);
    assert.equal(sportsBlocked(c,g.back,0,g.z),true);
    assert.equal(sportsBlocked(c,g.x,4,g.z),false);
  }
});

test('Hyper lasts exactly 15 seconds then has a 5-second cooldown; repeated K cannot extend it',()=>{
  const {s,p}=playerFixture();assert.equal(p.hyperPower.activate(),false);
  p.superPower.phase='super';assert.equal(p.hyperPower.activate(),true);assert.equal(p.actor.kind,'hyper-goku');
  const tick=seconds=>{for(let t=0;t<seconds-1e-7;t+=0.025){s.time.now+=25;p.hyperPower.update(0.025);}};
  tick(14.975);assert.equal(p.hyperPower.active,true);assert.equal(p.hyperPower.activate(),false);
  tick(0.025);assert.equal(p.hyperPower.active,false);assert.equal(p.actor.kind,'super-goku');
  assert.equal(p.hyperPower.cooldown,5);assert.equal(p.hyperPower.activate(),false);
  tick(4.975);assert.equal(p.hyperPower.activate(),false);tick(0.025);assert.equal(p.hyperPower.activate(),true);
  p.hyperPower.cancel();assert.equal(p.hyperPower.cooldown,5);assert.equal(p.hyperPower.active,false);
});

test('Super and Hyper ignore damage and throwing on the ground as well as in flight',()=>{
  const {p,s}=playerFixture();p.superPower.phase='super';
  for(const y of [0,5]){p.y=y;p.hurt({x:1,z:0},true);assert.equal(p.health,8);assert.equal(p.vy,0);}
  p.hyperPower.activate();p.hurt({x:1,z:0},true);assert.equal(p.health,8);
  p.hyperPower.cancel();p.superPower.phase='normal';s.time.now+=5000;p.hurt({x:1,z:0});assert.equal(p.health,7);
});

test('Hyper beam defeats every hostile it intersects, including shielded and final bosses, and leaves other directions alone',()=>{
  const {s,p}=playerFixture();p.superPower.phase='super';p.hyperPower.activate();p.facing={x:1,z:0};
  const enemy=(x,z)=>({x,z,active:true,health:99999,hit(amount){this.health-=amount;if(this.health<=0)this.active=false;}});
  const a=enemy(6,0),b=enemy(20,0),behind=enemy(-5,0),side=enemy(5,10),ally=enemy(7,0);ally.friendlyUntil=9999;
  s.enemies=[a,b,behind,side,ally];
  let defeated=0;
  s.boss={x:30,z:0,health:99999,active:true,activeFight:false,final:true,state:'warning',nextDamage:99999,scene:s,
    hit:DioramaBoss.prototype.hit,defeated(){this.active=false;defeated++;}};
  assert.equal(p.hyperPower.fire(),true);assert.equal(a.active,false);assert.equal(b.active,false);
  assert.equal(defeated,1);assert.equal(behind.active,true);assert.equal(side.active,true);assert.equal(ally.active,true);
  assert.equal(p.hyperPower.fire(),false);assert.equal(p.hyperPower.beams.length,1);
  p.hyperPower.update(0.6);assert.equal(p.hyperPower.beams.length,0);
  assert.equal(beamHits({x:0,y:0,z:0},{x:10,y:0,z:0},{x:5,y:0,z:5}),false);
});

test('LeBron K explodes for massive damage, burns for five seconds, slows by 20%, and recharges in five seconds',()=>{
  const {s,p,progress}=playerFixture();unlockSuper(progress);progress.unlockLeBron();p.toggleLeBron();
  const h=STADIUM_HOOPS[0];p.x=h.x;p.z=h.z+4;
  s.basketball=new Basketball(s);
  const enemy=(x,z)=>({x,z,active:true,health:100,hit(n){this.health-=n;}});
  const inside=enemy(h.x,h.z),outside=enemy(h.x+6,h.z),friendly=enemy(h.x,h.z);friendly.friendlyUntil=99999;
  s.enemies=[inside,outside,friendly];p.superPower.phase='super';
  p.ability();assert.equal(p.hyperPower.active,false);assert.equal(s.basketball.shots[0].flaming,true);
  const firedAt=s.time.now;assert.equal(p.lebronAbilityReady,firedAt+FIRE_COOLDOWN);
  p.ability();assert.equal(s.basketball.shots.length,1);
  const shot=s.basketball.shots[0];s.basketball.update(shot.arc.duration);
  assert.equal(s.basketball.shots.length,0);assert.equal(inside.health,88);assert.equal(outside.health,100);assert.equal(friendly.health,100);
  assert.equal(s.basketball.speedMultiplier(inside),0.8);assert.equal(s.basketball.speedMultiplier(outside),1);
  inside.x=h.x+6;assert.equal(s.basketball.speedMultiplier(inside),1);inside.x=h.x;
  for(let i=0;i<199;i++)s.basketball.update(.025);
  assert.equal(s.basketball.fires.length,1);assert.equal(inside.health,80);
  s.basketball.update(.025);assert.equal(inside.health,78);assert.equal(s.basketball.fires.length,0);
  assert.equal(s.basketball.speedMultiplier(inside),1);
  s.time.now=firedAt+4999;assert.equal(s.basketball.shoot(p,true),false);
  s.time.now=firedAt+5000;assert.equal(s.basketball.shoot(p,true),true);
  s.basketball.destroy();assert.equal(s.basketball.shots.length,0);
});


for (const skin of ['lebron','curry','vini']) test(skin+' regular shots work outside the stadium, damage shadows, and never award a basket',()=>{
  const {s,p,progress}=playerFixture();unlockSuper(progress);progress.unlockLeBron();progress.unlockCurry();progress.unlockVini();
  s.levelId=1;s.players=[p];
  p[skin==='lebron'?'toggleLeBron':skin==='curry'?'toggleCurry':'toggleVini']();
  p.facing={x:1,z:0};
  const system=skin==='vini'?new Football(s):new Basketball(s);
  const enemy={x:8,z:0,active:true,health:10,hit(n){this.health-=n;}};s.enemies=[enemy];
  assert.equal(system.shoot(p),true);assert.equal(system.shoot(p),false);
  for(let i=0;i<150;i++)system.update(.02);
  assert.equal(enemy.health,7);assert.equal(system.baskets,0);assert.equal(system.shots.length,0);
  assert.equal(system.shoot(p,true),true);for(let i=0;i<150;i++)system.update(.02);
  assert.equal(system.fires.length,1);assert.ok(enemy.health<0);system.destroy();assert.equal(system.fires.length,0);
});
