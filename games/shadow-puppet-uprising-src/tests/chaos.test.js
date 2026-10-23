import test from 'node:test';
import assert from 'node:assert/strict';
import { Progress, SAVE_KEY } from '../src/systems/Progress.js';
import { ALLY_IDS } from '../src/data/config.js';
import { CHAOS_EMERALDS, STAGE_STARS, TOTAL_STARS } from '../src/data/chaos.js';
import * as THREE from 'three';
import { DioramaPlayer } from '../src/diorama/Actors.js';

const memory = () => {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
};
function finishStory(p) { p.completeOrigin(); ALLY_IDS.forEach(id => p.rescue(id)); p.completeFinal(); }
function allStars(p) { STAGE_STARS.forEach((points, level) => points.forEach((_, id) => p.collect(`d${level}`, id))); }

test('Chaos missions require story completion AND every unique star across every stage', () => {
  const p = new Progress(memory());
  assert.equal(TOTAL_STARS, 158);
  allStars(p);
  assert.equal(p.chaosUnlocked(), false);
  finishStory(p);
  assert.equal(p.chaosUnlocked(), true);
  for (let level = 0; level < 7; level++) {
    delete p.data.collected[`d${level}:0`];
    p.data.stars = 99999; // An old count or duplicate legacy stars cannot bypass the gate.
    assert.equal(p.chaosUnlocked(), false);
    p.collect(`d${level}`, 0);
    assert.equal(p.chaosUnlocked(), true);
  }
});
test('seven exact Chaos Emeralds, trial completion, duplicate protection and reload', () => {
  const store = memory(), p = new Progress(store);
  assert.deepEqual(CHAOS_EMERALDS.map(e => e.id), ['green', 'purple', 'silver', 'blue', 'cyan', 'yellow', 'red']);
  assert.equal(p.collectEmerald('green'), false);
  finishStory(p); allStars(p);
  for (const [i, e] of CHAOS_EMERALDS.entries()) {
    assert.equal(p.collectEmerald(e.id), false);
    p.data.chaosTrials[e.id] = 3;
    assert.equal(p.collectEmerald(e.id), true);
    assert.equal(p.collectEmerald(e.id), false);
    assert.equal(p.superUnlocked(), i === 6);
  }
  p.setCheckpoint(3, true, { x: 1, z: 2 }, 'blue');
  const loaded = new Progress(store);
  assert.equal(loaded.superUnlocked(), true);
  assert.deepEqual(loaded.data.emeralds, CHAOS_EMERALDS.map(e => e.id));
  assert.equal(loaded.data.checkpoint.mission, 'blue');
  assert.equal(loaded.collectEmerald('orange'), false);
  loaded.reset();
  assert.equal(loaded.superUnlocked(), false);
  assert.deepEqual(loaded.data.emeralds, []);
  assert.deepEqual(loaded.data.chaosTrials, {});
});
test('old and malformed saves migrate without granting emeralds or impossible trials', () => {
  const store = memory();
  store.setItem(SAVE_KEY, JSON.stringify({version:1, emeralds:['red','red','orange',null],
    chaosTrials:{red:99,green:2,blue:-1}, checkpoint:{level:2, mission:'red'}}));
  const p = new Progress(store);
  assert.deepEqual(p.data.emeralds, ['red']);
  assert.deepEqual(p.data.chaosTrials, { green: 2 });
  assert.equal(p.data.checkpoint.mission, undefined);
  assert.equal(p.superUnlocked(), false);
  store.setItem(SAVE_KEY, JSON.stringify({version:1,origin:true,collected:{'d0:0':true},stars:1}));
  const old = new Progress(store);
  assert.equal(old.stageStars(0), 1);
  assert.deepEqual(old.data.emeralds, []);
});
test('star totals are reconstructed from real unique pickups, not inflated saved counts', () => {
  const store=memory();
  store.setItem(SAVE_KEY,JSON.stringify({version:1,stars:99999,collected:{'d0:0':true,'d1:4':true,'d6:24':true,'d0:1':'true','fake:0':true}}));
  const p=new Progress(store);
  assert.equal(p.data.stars,2);
  assert.equal(p.storyStars(),2);
  assert.equal(p.collect('d0',0),false);
  assert.equal(p.collect('d6',24),false);
  assert.equal(p.collect('d7',0),false);
  assert.equal(p.collect('d2',-1),false);
  assert.equal(p.collect('d0',1),true);
  assert.equal(p.data.stars,3);
  assert.equal(new Progress(store).data.stars,3);
});
test('Super Goku converges before transforming, flies and hovers, then restores gravity and the original form repeatedly', () => {
  const previousDocument=globalThis.document, overlays=new Set();
  globalThis.document={createElement:()=>({style:{},children:Array.from({length:7},()=>({style:{}})),setAttribute(){},remove(){overlays.delete(this);}}),querySelector:()=>({append:el=>overlays.add(el)})};
  try {
    const held=new Set(),edges=new Set();
    const model=kind=>({kind,root:new THREE.Group(),body:new THREE.Group(),rig:{legs:[],arms:[],stalks:[]}});
    const s={time:{now:100},difficulty:{health:8},definition:{bounds:[30,20]},originActions:{},
      inputFor:()=>({pressed:name=>{const yes=edges.has(name);edges.delete(name);return yes;},down:name=>held.has(name)}),
      services:{progress:{superUnlocked:()=>true},audio:{play(){}},ui:{toast(){}}},
      view:{character:model,superGoku:()=>model('super-goku'),marker:()=>new THREE.Group(),remove(){},effect(){},floorHeight:()=>0,walkable:()=>true,wet:()=>false,project:()=>({x:50,y:50})},
      isSlippery:()=>false,blocked:()=>false};
    const p=new DioramaPlayer(s,0,0);p.allies={};p.switchForm();
    assert.equal(p.form,'B');
    const tick=seconds=>{for(let t=0;t<seconds;t+=.025){s.time.now+=25;p.update(.025);p.superPower.render();}};
    for(let cycle=0;cycle<3;cycle++) {
      edges.add('s');tick(.05);
      assert.equal(p.superPower.phase,'gather');
      assert.equal(p.actor.kind,'B');
      assert.equal(overlays.size,1);
      assert.equal(p.superPower.toggle(),false);
      tick(2.85);
      assert.equal(p.actor.kind,'super-goku');
      assert.equal(overlays.size,0);
      p.switchForm();assert.equal(p.form,'B');
      held.add('space');tick(.5);held.delete('space');
      assert.ok(p.y>2);
      const y=p.y;tick(.3);assert.equal(p.y,y);
      held.add('c');tick(.2);held.delete('c');assert.ok(p.y<y-.5);
      held.add('right');const x=p.x;tick(.3);held.delete('right');assert.ok(p.x>x);
      edges.add('s');tick(.05);
      assert.equal(p.superPower.phase,'scatter');assert.equal(p.actor.kind,'B');
      tick(1.1);tick(1);assert.equal(p.superPower.phase,'normal');assert.equal(p.y,0);
      assert.equal(overlays.size,0);
    }
    p.superPower.toggle();p.superPower.destroy();assert.equal(overlays.size,0);
  } finally {globalThis.document=previousDocument;}
});
