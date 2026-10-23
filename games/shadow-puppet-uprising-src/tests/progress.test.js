import test from "node:test";
import assert from "node:assert/strict";
import { Progress, SAVE_KEY } from "../src/systems/Progress.js";
import { ALLY_IDS } from "../src/data/config.js";
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, v) => values.set(key, v),
  };
};
test("campaign unlocks in order, suppresses armies and survives reload", () => {
  const store = memory();
  const p = new Progress(store);
  assert.equal(p.isUnlocked(1), false);
  p.completeOrigin();
  assert.equal(p.isUnlocked(1), true);
  for (let i = 0; i < 5; i++) {
    assert.equal(p.isUnlocked(i + 1), true);
    assert.equal(p.armyAlive(ALLY_IDS[i]), true);
    p.rescue(ALLY_IDS[i]);
    assert.equal(p.armyAlive(ALLY_IDS[i]), false);
    assert.equal(p.isUnlocked(6), i === 4);
  }
  const loaded = new Progress(store);
  assert.deepEqual(loaded.data.rescued, ALLY_IDS);
  assert.equal(loaded.isUnlocked(6), true);
  assert.equal(loaded.completeFinal(), true);
  assert.equal(new Progress(store).data.victory, true);
});
test("stars cannot be farmed by retries and checkpoint reloads", () => {
  const store = memory();
  const p = new Progress(store);
  assert.equal(p.collect(1, 4), true);
  assert.equal(p.collect(1, 4), false);
  p.setCheckpoint(1, true);
  const loaded = new Progress(store);
  assert.equal(loaded.data.stars, 1);
  assert.equal(loaded.collect(1, 4), false);
  assert.deepEqual(loaded.data.checkpoint, { level: 1, reached: true });
});
test("malformed save and unavailable storage fail gracefully", () => {
  const store = memory();
  store.setItem(SAVE_KEY, "broken");
  assert.equal(new Progress(store).data.origin, false);
  store.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: 1,
      rescued: ["grandad", "grandad", "invented"],
      settings: { difficulty: "bad", volume: 9 },
      victory: true,
    }),
  );
  const p = new Progress(store);
  assert.deepEqual(p.data.rescued, ["grandad"]);
  assert.equal(p.data.settings.volume, 1);
  assert.equal(p.data.victory, false);
  const unavailable = new Progress({
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  });
  unavailable.completeOrigin();
  assert.equal(unavailable.data.origin, true);
  assert.equal(unavailable.saveError, true);
});
test("reset preserves preferences and final victory requires all allies", () => {
  const p = new Progress(memory());
  p.data.settings.muted = true;
  p.completeOrigin();
  p.rescue("grandad");
  assert.equal(p.completeFinal(), false);
  p.reset();
  assert.equal(p.data.origin, false);
  assert.deepEqual(p.data.rescued, []);
  assert.equal(p.data.settings.muted, true);
});

test('objective checkpoints and play time survive reload without resetting family rescues', () => {
  const store=memory(),p=new Progress(store);
  p.completeOrigin();p.rescue('grandad');
  p.data.adventures[2]={step:4,hits:[0,1],wave:0};p.data.playSeconds=245;
  p.save();const loaded=new Progress(store);
  assert.deepEqual(loaded.data.adventures[2],{step:4,hits:[0,1],wave:0});
  assert.equal(loaded.data.playSeconds,245);assert.equal(loaded.armyAlive('grandad'),false);
  loaded.reset();assert.deepEqual(loaded.data.adventures,{});assert.equal(loaded.data.playSeconds,0);
});

test('expedition puzzle rotations, position and co-op preferences persist',()=>{
  const store=memory(),p=new Progress(store);
  p.data.adventures[3]={revision:2,step:0,hits:[1],wave:0,turns:{0:1,1:1}};
  p.data.settings.players=2;p.setCheckpoint(3,true,{x:-18,z:1});
  const reloaded=new Progress(store);
  assert.deepEqual(reloaded.data.adventures[3],p.data.adventures[3]);
  assert.deepEqual(reloaded.data.checkpoint,{level:3,reached:true,x:-18,z:1});
  assert.equal(reloaded.data.settings.players,2);
});
