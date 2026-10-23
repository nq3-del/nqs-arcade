import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{})});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.stack));
try {
  await page.goto(`${process.env.GAME_URL||'http://127.0.0.1:5173'}/?qa`);
  await page.waitForFunction(()=>window.__gameQA?.services.ui.mode==='menu');
  await page.evaluate(()=>{const p=window.__gameQA.services.progress;p.completeOrigin();for(const id of ['grandad','nana','mummy','leah','daddy'])p.rescue(id);});
  for(const level of [0,1,2,3,4,5,6,0,6,1]) {
    await page.evaluate(level=>window.__gameQA.services.ui.start(level),level);
    await page.waitForFunction(level=>window.__gameQA.scene.levelId===level&&window.__gameQA.scene.player?.body,level);
    await page.waitForTimeout(100);
    const state=await page.evaluate(()=>{const s=window.__gameQA.scene;return {exit:!!s.exit,gate:!!s.originGate,checkpoint:s.checkpointX,finalStage:s.finalStage,guardCount:s.finalGuards?.length||0,balls:s.friendlyBalls.length,army:s.enemies.filter(e=>e.active).length};});
    assert.equal(state.exit,level!==6);
    assert.equal(state.gate,level===0);
    assert.equal(state.checkpoint,level===0?null:level===6?1050:1630);
    assert.equal(state.finalStage,0);
    assert.equal(state.guardCount,0);
    assert.equal(state.balls,0);
    assert.equal(state.army,0);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS all seven scenes and repeated origin/finale entries reset transient state; rescued armies stay absent.');
} finally {await browser.close();}
