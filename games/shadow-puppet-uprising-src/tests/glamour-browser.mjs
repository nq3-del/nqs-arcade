import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(45000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{polling:100});
await page.addInitScript(()=>{window.testPads=[0,1].map(index=>({index,id:'QA PS5',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));Object.defineProperty(navigator,'getGamepads',{value:()=>window.testPads});});
const tap=async(index,slot=0)=>{
  await page.evaluate(({index,slot})=>{window.testPads[slot].buttons[index].pressed=true;},{index,slot});
  await wait(({index,slot})=>window.__gameQA.services.controls.gestures.get(slot)?.buttons[index],{index,slot});
  await page.evaluate(({index,slot})=>{window.testPads[slot].buttons[index].pressed=false;},{index,slot});
  await wait(({index,slot})=>!window.__gameQA.services.controls.gestures.get(slot)?.buttons[index],{index,slot});
};
try {
  await page.goto('http://127.0.0.1:5173/?qa');await page.locator('[data-action="play"]').waitFor();
  await page.evaluate(async()=>{
    const q=window.__gameQA,p=q.services.progress,{CHAOS_EMERALDS,STAGE_STARS}=await import('/src/data/chaos.js');
    p.completeOrigin();for(const id of ['grandad','nana','mummy','leah','daddy'])p.rescue(id);p.completeFinal();
    STAGE_STARS.forEach((points,l)=>points.forEach((_,i)=>p.collect(l,i)));
    CHAOS_EMERALDS.forEach(e=>{p.data.chaosTrials[e.id]=3;p.collectEmerald(e.id);});
    p.data.settings.players=2;p.data.settings.reducedMotion=true;p.save();q.services.ui.startReplay(3,'hyper',2);
  });
  await wait(()=>window.__gameQA.scene.levelId===3&&window.__gameQA.scene.cinematic);
  await page.locator('[data-cinema="skip"]').click();await wait(()=>!window.__gameQA.scene.cinematic);
  await page.evaluate(()=>{
    const s=window.__gameQA.scene,p=s.player;
    s.enemies.forEach(e=>e.remove());s.adventure=null;s.boss.active=false;s.pvp.enabled=false;
    p.x=7;p.z=-12;p.y=0;p.facing={x:0,z:-1};p.hyperPower.remaining=15;
    s.partner.x=11;s.partner.z=-12;s.partner.y=0;
  });
  assert.deepEqual(await page.evaluate(()=>window.__gameQA.scene.view.mirrors.map(m=>m.x)),[-22,-8,7,24]);
  await tap(2);
  await wait(()=>window.__gameQA.services.ui.mode==='squidward-reward');
  await expect(page.locator('h1')).toContainText('Handsome Squidward unlocked');
  await expect(page.locator('.dialog')).toContainText('D-pad Left');
  await page.screenshot({path:'test-results/squidward-unlock.png'});
  assert.equal(await page.evaluate(()=>window.__gameQA.services.progress.data.squidwardUnlocked),true);
  await page.locator('[data-action="resume"]').click();await tap(14);
  await wait(()=>window.__gameQA.scene.player.squidwardEquipped);
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.player.actor.kind),'handsome-squidward');
  await tap(14,1);await wait(()=>window.__gameQA.scene.partner.squidwardEquipped);
  for(const b of [2,1,7,3])await tap(b);
  assert.deepEqual(await page.evaluate(()=>{const s=window.__gameQA.scene,p=s.player;return [p.hyperPower.active,p.superPower.active,s.summons.length,p.dashUntil];}),[false,false,0,0]);
  await page.evaluate(()=>window.__gameQA.scene.view.camera.zoom=1.6);
  await page.screenshot({path:'test-results/squidward-playable.png'});
  console.log('PASS actual Hyper beam hits wall mirror, persistent unlock notification and both D-pad Left costumes; no combat');
  await tap(14);await tap(14,1);
  await page.evaluate(()=>{
    const s=window.__gameQA.scene,p=s.player,v=s.partner;p.x=0;p.z=0;p.y=0;v.x=1.7;v.z=0;v.y=0;
    s.pvp.enabled=true;s.enemies=[];s.qaEnemy=s.spawnEnemy(0,2,'grandad',true);s.qaEnemy.nextAttack=Infinity;
    p.allies.select('mummy');p.allies.readyAt.mummy=0;
  });
  await tap(7);
  await wait(()=>window.__gameQA.scene.glamour.targets.size===2);
  await wait(()=>[...window.__gameQA.scene.glamour.targets.values()].every(e=>e.sprite.material.map.image?.complete));
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.qaEnemy.glamourVisualUntil>window.__gameQA.scene.time.now),true);
  await page.screenshot({path:'test-results/mummy-squidward-potion.png'});
  await page.evaluate(()=>{const s=window.__gameQA.scene;s.pvp.enabled=false;});
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.glamour.targets.has(window.__gameQA.scene.partner)),false);
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.glamour.targets.has(window.__gameQA.scene.qaEnemy)),true);
  await wait(()=>!window.__gameQA.scene.glamour.targets.has(window.__gameQA.scene.qaEnemy));
  await page.evaluate(()=>{
    const s=window.__gameQA.scene,p=s.player,v=s.partner;s.enemies.forEach(e=>e.remove());p.x=0;p.z=0;p.y=0;p.vx=p.vz=0;v.x=2;v.z=0;v.y=0;v.vx=v.vz=0;v.health=v.maxHealth;
    s.pvp.enabled=true;p.facing={x:1,z:0};p.allies.select('daddy');p.allies.readyAt.daddy=0;
  });
  await tap(7);await wait(()=>window.__gameQA.scene.partner.health<window.__gameQA.scene.partner.maxHealth);
  console.log('PASS Mummy overlays actual enemy and opponent, expires, respects PvP toggle; Daddy projectile hurts opponent');
  await page.evaluate(()=>{
    const q=window.__gameQA,p=q.services.progress;p.unlockLeBron();p.unlockCurry();p.unlockVini();q.services.ui.startMayhem('A',2);
  });
  await wait(()=>window.__gameQA.scene.mayhem&&window.__gameQA.scene.players.length===2);
  await page.evaluate(()=>{
    const s=window.__gameQA.scene,p=s.player;
    const e=s.enemies[0];e.x=p.x+1;e.z=p.z;s.mayhem.spawn('boss',1);const boss=s.enemies.at(-1);boss.x=p.x;boss.z=p.z+2;
    p.allies.select('mummy');p.allies.readyAt.mummy=0;p.allies.use();
    s.mayhem.bosses.render([boss],s.time.now);s.mayhem.puppets.render([e],s.time.now);
    window.portraitCounts=[s.mayhem.puppets.portraits.count,s.mayhem.bosses.portraits.count];
  });
  assert.deepEqual(await page.evaluate(()=>window.portraitCounts),[1,1]);
  console.log('PASS Mayhem puppet and boss instanced Squidward overlays');
  await page.reload();await page.locator('[data-action="play"]').waitFor();
  assert.equal(await page.evaluate(()=>window.__gameQA.services.progress.data.squidwardUnlocked),true);
  assert.deepEqual(errors,[]);console.log('PASS saved unlock after reload and no browser runtime errors');
} finally {await browser.close();}
