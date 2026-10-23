import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(30000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
  window.testPads=[{index:0,id:'PS5 QA',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}];
  Object.defineProperty(navigator,'getGamepads',{value:()=>window.testPads});
});
// Drive the real gamepad polling path. Never click or focus UI with the test API.
const press=async button=>page.evaluate(button=>{
  const pad=window.testPads[0],c=window.__gameQA.services.controls;
  pad.buttons[button].pressed=true;c.poll();pad.buttons[button].pressed=false;c.poll();
},button);
const navigate=async selector=>page.evaluate(selector=>{
  const pad=window.testPads[0],c=window.__gameQA.services.controls;
  for(let i=0;i<160;i++){
    if(document.activeElement?.matches(selector))return;
    pad.buttons[13].pressed=true;c.poll();pad.buttons[13].pressed=false;c.poll();
  }
  throw new Error('Controller cannot reach '+selector+'; focused '+document.activeElement?.outerHTML);
},selector);
const select=async selector=>{await navigate(selector);await press(0);};
const mode=async expected=>page.waitForFunction(expected=>window.__gameQA.services.ui.mode===expected,expected);
try {
  await page.goto('http://127.0.0.1:5173/?qa');await page.locator('[data-action="play"]').waitFor();
  await select('[data-action="help"]');await mode('help');await press(1);await mode('menu');
  await select('#settings-button');await mode('settings');
  const muted=await page.locator('#setting-sound').isChecked();await select('#setting-sound');assert.equal(await page.locator('#setting-sound').isChecked(),!muted);
  await navigate('#setting-volume');const volume=Number(await page.locator('#setting-volume').inputValue());
  await press(14);assert.equal(Number(await page.locator('#setting-volume').inputValue()),Math.max(0,volume-.05));
  await select('#setting-difficulty');await press(13);await press(0);await expect(page.locator('#setting-difficulty')).toHaveValue('normal');
  await select('#setting-players');await press(13);await press(1);await mode('settings');await expect(page.locator('#setting-players')).toHaveValue('2');
  await select('[data-action="controller"]');await mode('controller-remap');
  await select('#controller-space');await press(13);await press(0);await expect(page.locator('#controller-space')).toHaveValue('1');
  await expect(page.locator('[data-action="controller-save"]')).toBeDisabled();
  await select('[data-action="controller-reset"]');await select('[data-action="controller-save"]');await mode('settings');
  await expect(page.locator('#setting-difficulty')).toHaveValue('normal');
  // Gamepad requests may lack browser user activation. The window-filling fallback remains controllable.
  await page.evaluate(()=>{document.querySelector('#app').requestFullscreen=()=>Promise.reject(new Error('No user activation'));});
  await select('[data-action="fullscreen"]');await expect(page.locator('#app')).toHaveClass(/window-fullscreen/);
  await select('[data-action="fullscreen"]');await expect(page.locator('#app')).not.toHaveClass(/window-fullscreen/);
  await select('[data-action="reset"]');await mode('reset');await press(1);await mode('settings');
  await select('[data-action="save"]');await mode('menu');
  await select('#sound-toggle');await select('#brand');await mode('menu');
  console.log('PASS controller-only home, help, header, settings, checkboxes, ranges, dropdowns, remapping, reset cancellation and fullscreen fallback');

  await page.evaluate(async()=>{
    const p=window.__gameQA.services.progress;const {CHAOS_EMERALDS,STAGE_STARS}=await import('/src/data/chaos.js');
    p.completeOrigin();for(const id of ['grandad','nana','mummy','leah','daddy'])p.rescue(id);p.completeFinal();
    STAGE_STARS.forEach((pts,level)=>pts.forEach((_,i)=>p.collect(level,i)));
    CHAOS_EMERALDS.forEach(e=>{p.data.chaosTrials[e.id]=3;p.collectEmerald(e.id);});
    p.unlockLeBron();p.unlockCurry();p.unlockVini();p.unlockSquidward();p.data.settings.players=1;p.data.settings.reducedMotion=true;p.save();
    window.__gameQA.services.ui.menu();
  });
  await select('[data-action="play"]');await mode('map');
  await select('[data-action="chaos"]');await mode('chaos');await press(1);await mode('map');
  await select('[data-action="mayhem"]');await mode('mayhem-picker');
  await select('#mayhem-players');await press(13);await press(0);await expect(page.locator('#mayhem-players')).toHaveValue('2');await press(1);await mode('map');
  await select('[data-action="replay"]');await mode('replay-picker');
  await select('#replay-level');await press(13);await press(0);await expect(page.locator('#replay-level')).toHaveValue('1');
  await select('[data-action="replay-start"]');await mode('game');
  await page.waitForFunction(()=>!!window.__gameQA.scene.cinematic);
  await select('[data-cinema="auto"]');
  const beat=await page.evaluate(()=>window.__gameQA.scene.cinematic.index);
  await select('[data-cinema="next"]');assert.equal(await page.evaluate(()=>window.__gameQA.scene.cinematic.index),beat+1);
  await select('[data-cinema="back"]');assert.equal(await page.evaluate(()=>window.__gameQA.scene.cinematic.index),beat);
  await select('[data-cinema="replay"]');assert.equal(await page.evaluate(()=>window.__gameQA.scene.cinematic.index),beat);
  await press(1);await mode('pause');await press(9);await mode('game');
  await select('[data-cinema="skip"]');await page.waitForFunction(()=>!window.__gameQA.scene.cinematic);
  await press(9);await mode('pause');
  await select('[data-action="skins"]');await mode('skins');
  await press(1);await mode('game');await press(9);await mode('pause');
  await select('[data-action="allies"]');await mode('allies');await select('[data-action="grandad"]');await mode('game');
  await press(9);await mode('pause');await select('[data-action="map"]');await mode('map');
  await select('[data-action="world1"]');await mode('game');await page.waitForFunction(()=>window.__gameQA.scene.levelId===1&&!window.__gameQA.scene.replayMode);
  await press(9);await mode('pause');await select('[data-action="map"]');await mode('map');
  await press(1);await mode('menu');
  await page.screenshot({path:'test-results/controller-menu-focus.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS controller-only world selection, Chaos, Mayhem/replay pickers, all cinematic buttons, pause, characters, allies and return to home');
}catch(error){console.log('ERRORS',errors);console.log('MODE',await page.evaluate(()=>window.__gameQA?.services.ui.mode));await page.screenshot({path:'test-results/controller-menu-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();}
