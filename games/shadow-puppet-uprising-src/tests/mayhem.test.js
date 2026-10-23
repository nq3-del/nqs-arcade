import test from 'node:test';
import assert from 'node:assert/strict';
import { MayhemWaves, mayhemUnlocked } from '../src/diorama/MayhemWaves.js';
import { ShadowMayhem, MayhemFoe } from '../src/diorama/ShadowMayhem.js';
import { Progress } from '../src/systems/Progress.js';
import { ALLY_IDS } from '../src/data/config.js';
import { CHAOS_EMERALDS, STAGE_STARS } from '../src/data/chaos.js';

test('Mayhem requires victory and every character, including all emeralds and secret sports skins',()=>{
  const data=new Map(), p=new Progress({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
  assert.equal(mayhemUnlocked(p),false);p.completeOrigin();ALLY_IDS.forEach(id=>p.rescue(id));p.completeFinal();
  assert.equal(mayhemUnlocked(p),false);
  STAGE_STARS.forEach((points,level)=>points.forEach((_,i)=>p.collect(level,i)));
  CHAOS_EMERALDS.forEach(e=>{p.data.chaosTrials[e.id]=3;p.collectEmerald(e.id);});
  p.unlockLeBron();p.unlockCurry();assert.equal(mayhemUnlocked(p),false);p.unlockVini();assert.equal(mayhemUnlocked(p),false);p.unlockSquidward();assert.equal(mayhemUnlocked(p),true);
  p.data.victory=false;assert.equal(mayhemUnlocked(p),false);
});

test('5,000 puppets every 30s, 50,000 bosses every 60s, 500,000 cap and partial refill',()=>{
  let puppets=0,bosses=0;const waves=new MayhemWaves(()=>puppets,(kind,n)=>kind==='puppet'?puppets+=n:bosses+=n);
  assert.equal(puppets,5000);assert.equal(bosses,0);waves.update(29.999);assert.equal(puppets,5000);
  waves.update(.001);assert.equal(puppets,10000);assert.equal(bosses,0);
  waves.update(30);assert.equal(puppets,15000);assert.equal(bosses,50000);
  waves.update(2910);assert.equal(puppets,500000);assert.equal(bosses,2450000);
  waves.update(30);assert.equal(puppets,500000);assert.equal(bosses,2500000);
  puppets-=37;waves.update(30);assert.equal(puppets,500000);
  puppets-=12000;waves.update(30);assert.equal(puppets,493000);
  waves.update(30);assert.equal(puppets,498000);waves.update(30);assert.equal(puppets,500000);
  waves.update(3600);assert.equal(puppets,500000);assert.ok(bosses>5000000);
});

test('paused/invalid updates cannot advance waves; fractional updates preserve timing',()=>{
  let count=0;const waves=new MayhemWaves(()=>0,()=>count++);
  for(const dt of [0,-1,NaN,Infinity])waves.update(dt);
  assert.equal(count,1);for(let i=0;i<3600;i++)waves.update(1/60);
  assert.equal(count,4);assert.ok(Math.abs(waves.elapsed-60)<1e-6);
});

test('a single attack can defeat any number of puppets and bosses; each counts exactly once',()=>{
  const scene={time:{now:10},view:{particles:[],effect(){}},enemies:[]};
  const mode={scene,defeated:{puppet:0,boss:0}};
  scene.enemies=Array.from({length:11000},(_,i)=>new MayhemFoe(mode,i<5000?'puppet':'boss',0,0));
  for(const e of scene.enemies){e.hit(Infinity);e.hit(Infinity);e.remove();}
  assert.deepEqual(mode.defeated,{puppet:5000,boss:6000});assert.ok(scene.enemies.every(e=>!e.active));
});

test('Mayhem respawns both players after three seconds without ending or clearing the score',()=>{
  const players=[0,1].map(slot=>({slot,health:0,maxHealth:8,sync(){}}));
  const mode=Object.create(ShadowMayhem.prototype);
  mode.scene={players,enemies:[],spawn:{x:0,z:0},time:{now:1000}};
  mode.waves={update(){}};mode.defeated={puppet:700,boss:300};
  players.forEach(p=>mode.defeatedPlayer(p));mode.update(2.99);assert.ok(players.every(p=>p.downed));
  mode.update(.01);assert.ok(players.every(p=>!p.downed&&p.health===8));
  assert.deepEqual(mode.defeated,{puppet:700,boss:300});assert.equal(players[1].x,2);
});
