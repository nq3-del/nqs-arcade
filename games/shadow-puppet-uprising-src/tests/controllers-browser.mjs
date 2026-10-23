import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(60000);
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{polling:100});
const setButtons=async (indices,slot=0)=>{
  await page.evaluate(({indices,slot})=>window.testPads[slot].buttons.forEach((button,index)=>{button.pressed=indices.includes(index);}),{indices,slot});
  await wait(({indices,slot})=>window.__gameQA.services.controls.gestures.get(slot)?.buttons.every((pressed,index)=>pressed===indices.includes(index)),{indices,slot});
};
const tap=async (button,slot=0)=>{await setButtons([button],slot);await setButtons([],slot);};
await page.addInitScript(()=>{
  window.testPads=[0,1].map(index=>({index,id:'QA PS5 standard controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));
  Object.defineProperty(navigator,'getGamepads',{value:()=>window.testPads});
});
fs.mkdirSync('test-results',{recursive:true});
try {
  await page.goto((process.env.GAME_URL||'http://127.0.0.1:5173')+'/?qa');
  await page.locator('[data-action="play"]').waitFor();
  await page.evaluate(()=>{window.testPads[0].axes[1]=1;});
  await wait(()=>document.activeElement.dataset.action==='help');
  await page.evaluate(()=>{window.testPads[0].axes[1]=0;});
  await wait(()=>!window.__gameQA.services.controls.down(0,'down'));
  await tap(0);await wait(()=>window.__gameQA.services.ui.mode==='help');
  await tap(1);await wait(()=>window.__gameQA.services.ui.mode==='menu');
  console.log('PASS joystick menu navigation, Cross select and Circle back');

  await page.locator('#fullscreen-toggle').click();
  await expect(page.locator('#fullscreen-toggle')).toHaveAttribute('aria-pressed','true',{timeout:60000});
  await page.locator('#settings-button').click();
  await page.locator('#setting-difficulty').selectOption('normal');
  await page.locator('[data-action="controller"]').click();
  await page.locator('#controller-space').selectOption('2');
  await expect(page.locator('#controller-conflict')).toBeVisible();
  await expect(page.locator('[data-action="controller-save"]')).toBeDisabled();
  await page.locator('#controller-j').selectOption('0');
  await expect(page.locator('[data-action="controller-save"]')).toBeEnabled();
  await page.screenshot({path:'test-results/controller-remapping.png'});
  await page.locator('[data-action="controller-save"]').click();
  await expect(page.locator('#setting-difficulty')).toHaveValue('normal');
  await page.reload();
  await page.locator('[data-action="play"]').waitFor();
  assert.equal(await page.evaluate(()=>window.__gameQA.services.progress.data.settings.controllerBindings.space),'2');
  await page.locator('#settings-button').click();
  await page.locator('[data-action="controller"]').click();
  await page.locator('[data-action="controller-reset"]').click();
  await page.locator('[data-action="controller-cancel"]').click();
  assert.equal(await page.evaluate(()=>window.__gameQA.services.progress.data.settings.controllerBindings.space),'2');
  await page.locator('[data-action="controller"]').click();
  await page.locator('[data-action="controller-reset"]').click();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'test-results/controller-remapping-mobile.png'});
  await page.locator('[data-action="controller-save"]').click();
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-action="save"]').click();
  console.log('PASS remapping conflicts, persistence, reset, cancel, nested Settings values and narrow layout');

  // Unlock a private browser-context fixture; never touches the player's save.
  await page.evaluate(async()=>{
    const q=window.__gameQA,p=q.services.progress;
    const {CHAOS_EMERALDS,STAGE_STARS}=await import('/src/data/chaos.js');
    p.completeOrigin();for(const id of ['grandad','nana','mummy','leah','daddy'])p.rescue(id);p.completeFinal();
    STAGE_STARS.forEach((points,level)=>points.forEach((_,index)=>p.collect(level,index)));
    CHAOS_EMERALDS.forEach(e=>{p.data.chaosTrials[e.id]=3;p.collectEmerald(e.id);});
    p.unlockLeBron();p.unlockCurry();p.unlockVini();p.data.settings.reducedMotion=true;p.save();q.services.ui.menu();
  });
  await page.locator('[data-action="replay"]').click();
  await page.locator('#replay-level').selectOption('5');
  await page.locator('#replay-character').selectOption('A');
  await page.locator('#replay-players').selectOption('2');
  await page.screenshot({path:'test-results/replay-two-players.png'});
  await page.locator('[data-action="replay-start"]').click();
  await wait(()=>window.__gameQA.scene.replayMode&&window.__gameQA.scene.players.length===2&&window.__gameQA.scene.levelId===5);
  await page.locator('[data-cinema="auto"]').click();
  const beat=await page.evaluate(()=>window.__gameQA.scene.cinematic.index);
  await tap(11);
  await wait(index=>window.__gameQA.scene.cinematic.index===index+1,beat);
  await setButtons([10,11]);await setButtons([]);
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.cinematic.index),beat+1);
  await page.locator('[data-cinema="skip"]').click();
  await wait(()=>!window.__gameQA.scene.cinematic);
  await tap(3);await wait(()=>window.__gameQA.scene.player.form==='B');
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.partner.form),'A');
  await tap(3,1);await wait(()=>window.__gameQA.scene.partner.form==='B');
  await tap(9);await wait(()=>window.__gameQA.services.ui.mode==='pause');
  await tap(9);await wait(()=>window.__gameQA.services.ui.mode==='game');
  console.log('PASS two-player replay, independent controllers, R3 next scene, chord isolation and Options pause/resume');

  await page.evaluate(()=>{
    const s=window.__gameQA.scene;
    window.qaShots=[];window.qaInteractions=0;
    for(const kind of ['basketball','football']) {
      const shoot=s[kind].shoot.bind(s[kind]);
      s[kind].shoot=(p,flaming=false)=>{const result=shoot(p,flaming);window.qaShots.push({kind,flaming,result,slot:p.slot});return result;};
    }
    const interact=s.interact.bind(s);s.interact=p=>{window.qaInteractions++;return interact(p);};
  });
  for(const [button,property] of [[5,'lebronEquipped'],[4,'curryEquipped']]) {
    await tap(button);await wait(property=>window.__gameQA.scene.player[property],property);
    await page.evaluate(async()=>{
      const {STADIUM_HOOPS}=await import('/src/data/basketball.js');
      const p=window.__gameQA.scene.player,h=STADIUM_HOOPS[0];
      p.x=h.x;p.z=h.z+3;p.y=0;p.vx=p.vz=0;p.shotReady=0;
    });
    const count=await page.evaluate(()=>window.qaShots.length);
    await tap(3);await wait(count=>window.qaShots.length>count,count);
    assert.deepEqual(await page.evaluate(()=>({kind:window.qaShots.at(-1).kind,flaming:window.qaShots.at(-1).flaming,result:window.qaShots.at(-1).result})),{kind:'basketball',flaming:false,result:true});
  }
  await tap(12);await wait(()=>window.__gameQA.scene.player.viniEquipped);
  await page.evaluate(async()=>{
    const {FOOTBALL_GOALS}=await import('/src/diorama/SportsCollisions.js');
    const p=window.__gameQA.scene.player,g=FOOTBALL_GOALS[0];
    p.x=g.x-Math.sign(g.x)*4;p.z=g.z;p.y=0;p.vx=p.vz=0;p.shotReady=0;
  });
  const count=await page.evaluate(()=>window.qaShots.length);
  await tap(3);await wait(count=>window.qaShots.length>count,count);
  assert.deepEqual(await page.evaluate(()=>({kind:window.qaShots.at(-1).kind,flaming:window.qaShots.at(-1).flaming,result:window.qaShots.at(-1).result})),{kind:'football',flaming:false,result:true});
  await tap(13);await wait(()=>window.__gameQA.scene.player.celebratingUntil>window.__gameQA.scene.time.now);
  console.log('PASS LeBron, Curry and Vini selection, Triangle regular shots and Vini D-pad Down celebration');

  const interactions=await page.evaluate(()=>window.qaInteractions);
  await setButtons([11]);await setButtons([10,11]);await setButtons([]);
  await wait(()=>window.__gameQA.scene.player.superPower.active);
  assert.equal(await page.evaluate(()=>window.qaInteractions),interactions);
  await page.evaluate(()=>{const p=window.__gameQA.scene.player;p.x=0;p.z=0;p.y=5;p.vx=p.vz=0;});
  await setButtons([3]);await wait(()=>window.__gameQA.scene.player.vy<0&&window.__gameQA.scene.player.y<5);await setButtons([]);
  await tap(1);await wait(()=>window.__gameQA.scene.player.hyperPower.active);
  await page.evaluate(()=>{window.__gameQA.scene.player.y=5;});
  await setButtons([3]);await wait(()=>window.__gameQA.scene.player.vy<0&&window.__gameQA.scene.player.y<5);await setButtons([]);
  await page.screenshot({path:'test-results/controller-hyper-flight.png'});
  console.log('PASS Super chord without interaction, Circle Hyper power and Triangle descent in both Goku forms');

  await page.evaluate(()=>window.__gameQA.services.ui.replayPicker());
  await expect(page.locator('#replay-players')).toHaveValue('2');
  await page.locator('#replay-players').selectOption('1');
  await page.locator('[data-action="replay-start"]').click();
  await wait(()=>window.__gameQA.scene.replayMode&&window.__gameQA.scene.players.length===1);
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.partner),null);
  assert.deepEqual(errors,[]);
  console.log('PASS switching replay back to one player; no page errors');
} catch(error) {
  console.log('PAGE ERRORS',errors);
  console.log('STATE',await page.evaluate(()=>({mode:window.__gameQA?.services.ui.mode,level:window.__gameQA?.scene?.levelId,cinema:!!window.__gameQA?.scene?.cinematic,toast:document.querySelector('#toast')?.textContent})));
  await page.screenshot({path:'test-results/controller-failure.png'}).catch(()=>{});
  throw error;
} finally {await browser.close();}
