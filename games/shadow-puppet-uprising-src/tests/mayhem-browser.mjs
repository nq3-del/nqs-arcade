import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(30000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{polling:100});
await page.addInitScript(()=>{
  window.testPads=[0,1].map(index=>({index,id:'QA PS5 controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));
  Object.defineProperty(navigator,'getGamepads',{value:()=>window.testPads});
});
const tap=async index=>{
  await page.evaluate(i=>{window.testPads[0].buttons[i].pressed=true;},index);
  await wait(i=>window.__gameQA.services.controls.gestures.get(0)?.buttons[i],index);
  await page.evaluate(i=>{window.testPads[0].buttons[i].pressed=false;},index);
  await wait(i=>!window.__gameQA.services.controls.gestures.get(0)?.buttons[i],index);
};
fs.mkdirSync('test-results',{recursive:true});
try {
  await page.goto((process.env.GAME_URL||'http://127.0.0.1:5173')+'/?qa');
  await page.locator('[data-action="play"]').waitFor();
  await page.evaluate(()=>{const q=window.__gameQA;q.services.ui.startMayhem();q.services.ui.mayhemPicker();});
  await expect(page.locator('[data-action="mayhem-start"]')).toHaveCount(0);
  await expect(page.locator('.mayhem-unlocks')).toContainText('Unlock Vini');
  console.log('PASS locked mode cannot start');
  await page.evaluate(async()=>{
    const q=window.__gameQA,p=q.services.progress;
    const {CHAOS_EMERALDS,STAGE_STARS}=await import('/src/data/chaos.js');
    p.completeOrigin();for(const id of ['grandad','nana','mummy','leah','daddy'])p.rescue(id);p.completeFinal();
    STAGE_STARS.forEach((points,level)=>points.forEach((_,index)=>p.collect(level,index)));
    CHAOS_EMERALDS.forEach(e=>{p.data.chaosTrials[e.id]=3;p.collectEmerald(e.id);});
    p.unlockLeBron();p.unlockCurry();p.unlockVini();p.unlockSquidward();p.data.settings.reducedMotion=true;
    p.setCheckpoint(5,true,{x:3,z:4});window.savedCheckpoint=JSON.stringify(p.data.checkpoint);q.services.ui.map();
  });
  await page.locator('[data-action="mayhem"]').click();
  await page.locator('#mayhem-players').selectOption('2');
  await page.locator('#mayhem-character').selectOption('lebron');
  await page.screenshot({path:'test-results/mayhem-picker.png'});
  await page.locator('[data-action="mayhem-start"]').click();
  await wait(()=>window.__gameQA.scene.mayhem?.count('puppet')===5000);
  await expect(page.locator('#level-name')).toHaveText('Shadow Mayhem');
  assert.deepEqual(await page.evaluate(()=>{const s=window.__gameQA.scene;return [s.players.length,!!s.pvp,s.stars.length,!!s.boss,!!s.cinematic,JSON.stringify(s.services.progress.data.checkpoint)===window.savedCheckpoint];}),[2,true,0,false,false,true]);
  await page.evaluate(()=>window.__gameQA.scene.players.forEach(p=>{p.invulnerableUntil=Infinity;}));
  await page.screenshot({path:'test-results/mayhem-start.png'});
  console.log('PASS entry, dedicated arena, two-player co-op, safe story checkpoint and 5,000 starting puppets');

  for(const [skin,button,system] of [['lebron',null,'basketball'],['curry',4,'basketball'],['vini',12,'football']]) {
    if(button!==null)await tap(button);
    await wait(skin=>window.__gameQA.scene.player[skin+'Equipped'],skin);
    await page.evaluate(system=>{const s=window.__gameQA.scene;s.player.shotReady=0;window.lastShot=null;
      const original=s[system].shoot.bind(s[system]);s[system].shoot=(p,f=false)=>{const result=original(p,f);window.lastShot={result,free:s[system].shots.at(-1)?.free,flaming:f};return result;};
    },system);
    await tap(3);await wait(()=>window.lastShot?.result);
    assert.deepEqual(await page.evaluate(()=>window.lastShot),{result:true,free:true,flaming:false});
  }
  console.log('PASS actual Triangle presses shoot regular basketballs/footballs as all three sports characters outside the stadium');

  await page.evaluate(()=>window.__gameQA.services.ui.pause());
  const before=await page.evaluate(()=>window.__gameQA.scene.mayhem.waves.elapsed);
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.mayhem.waves.elapsed),before);
  const waves=await page.evaluate(()=>{
    const m=window.__gameQA.scene.mayhem;
    // The preceding real shots can defeat puppets. Reset the timing fixture independently.
    m.scene.basketball.destroy();m.scene.football.destroy();m.scene.enemies=[];
    m.defeated={puppet:0,boss:0};m.population={puppet:0,boss:0};m.spawn('puppet',5000);
    m.waves.elapsed=0;m.waves.nextPuppets=30;m.waves.nextBosses=60;
    const advanceTo=t=>m.update(t-m.waves.elapsed);
    advanceTo(30);const a=[m.count('puppet'),m.count('boss')];
    advanceTo(60);const b=[m.count('puppet'),m.count('boss')];
    // Reach the cap directly, without creating an hour of extra boss waves.
    m.spawn('puppet',500000-m.count('puppet'));
    advanceTo(90);const c=[m.count('puppet'),m.count('boss')];
    m.scene.enemies.filter(e=>e.kind==='puppet').slice(0,37).forEach(e=>e.hit(Infinity));
    advanceTo(120);const d=[m.count('puppet'),m.count('boss'),m.defeated.puppet];
    return [a,b,c,d];
  });
  assert.deepEqual(waves,[[10000,0],[15000,50000],[500000,50000],[500000,100000,37]]);
  await page.evaluate(()=>window.__gameQA.services.ui.pop());
  await wait(()=>window.__gameQA.scene.mayhem.bosses.body?.count>0);
  assert.ok(await page.evaluate(()=>{const m=window.__gameQA.scene.mayhem;return m.puppets.body.count+m.bosses.body.count<=2400;}));
  await page.screenshot({path:'test-results/mayhem-horde.png'});
  console.log('PASS pause freezes waves, 500,000 puppet cap, partial refill, 100,000 bosses and bounded drawing');

  await page.evaluate(()=>{
    const s=window.__gameQA.scene;s.players.forEach(p=>{p.invulnerableUntil=Infinity;});
    s.enemies.forEach(e=>{e.x=s.player.x+1;e.z=s.player.z;});
    s.melee(s.player,4,Infinity,'power');
  });
  await wait(()=>window.__gameQA.scene.enemies.length===0);
  assert.deepEqual(await page.evaluate(()=>window.__gameQA.scene.mayhem.defeated),{puppet:500037,boss:100000});
  await expect(page.locator('#mayhem-score')).toContainText('600,037');
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.ending),false);
  console.log('PASS one attack defeats 600,000 shadows; score continues without ending the run');

  await page.evaluate(()=>{const s=window.__gameQA.scene;s.players.forEach(p=>{p.health=0;s.playerDefeated(p);});});
  await wait(()=>window.__gameQA.scene.players.every(p=>!p.downed&&p.health===p.maxHealth));
  assert.deepEqual(await page.evaluate(()=>window.__gameQA.scene.mayhem.defeated),{puppet:500037,boss:100000});
  await page.locator('[data-hud="map"]').click();
  await page.locator('[data-action="mayhem"]').click();
  await page.locator('#mayhem-players').selectOption('1');
  await page.locator('[data-action="mayhem-start"]').click();
  await wait(()=>window.__gameQA.scene.mayhem?.count('puppet')===5000&&window.__gameQA.scene.players.length===1);
  assert.deepEqual(await page.evaluate(()=>window.__gameQA.scene.mayhem.defeated),{puppet:0,boss:0});
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__gameQA.services.progress.data.checkpoint)===window.savedCheckpoint),true);
  assert.deepEqual(errors,[]);
  console.log('PASS automatic respawns, leave/re-enter cleanup, fresh run, preserved checkpoint and no page errors');
} catch(error) {
  console.log('PAGE ERRORS',errors);
  console.log('STATE',await page.evaluate(()=>({mode:window.__gameQA?.services.ui.mode,mayhem:!!window.__gameQA?.scene?.mayhem,toast:document.querySelector('#toast')?.textContent})));
  await page.screenshot({path:'test-results/mayhem-failure.png'}).catch(()=>{});throw error;
} finally {await browser.close();}
