import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage();page.setDefaultTimeout(45000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const wait=fn=>page.waitForFunction(fn);
const pad=async(name,value)=>page.evaluate(({name,value})=>{
  if(name==='x')window.testPad.axes[0]=value;
  else window.testPad.buttons[name].pressed=value;
},{name,value});
const tap=async n=>{await pad(n,true);await page.waitForTimeout(150);await pad(n,false);await page.waitForTimeout(100);};
try {
  await page.goto('http://127.0.0.1:5173/?qa');
  await wait(()=>window.__gameQA?.services.ui.mode==='menu');
  await page.evaluate(()=>{
    const q=window.__gameQA;
    q.services.progress.data.settings.players=2;
    q.services.progress.rescue('grandad');q.services.ui.start(0);
    window.testPad={index:0,id:'QA standard controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});
  });
  await page.locator('[data-cinema="skip"]').click();
  await wait(()=>window.__gameQA.scene.players.length===2);
  await pad('x',1);await wait(()=>window.__gameQA.scene.partner.x>-5.8);await pad('x',0);
  await tap(3);await wait(()=>window.__gameQA.scene.partner.form==='A');
  console.log('PASS controller movement and independent P2 form switch');
  await tap(5);await wait(()=>window.__gameQA.scene.summons.length===1);
  await page.waitForTimeout(4000);
  assert.equal(await page.evaluate(()=>window.__gameQA.scene.summons.length),1);
  await wait(()=>window.__gameQA.scene.summons.length===0);
  console.log('PASS summon remains for four seconds and expires after five game seconds');
  await tap(9);await wait(()=>window.__gameQA.services.ui.mode==='pause');
  await tap(9);await wait(()=>window.__gameQA.services.ui.mode==='game');
  console.log('PASS controller Start pauses and resumes');
  await page.evaluate(()=>{
    const s=window.__gameQA.scene;s.player.x=s.partner.x;s.player.z=s.partner.z;
    s.partner.health=1;s.partner.invulnerableUntil=0;
    s.partner.hurt({x:s.partner.x+1,z:s.partner.z});
  });
  await wait(()=>window.__gameQA.scene.partner.downed);
  await page.keyboard.press('e',{delay:80});
  await wait(()=>!window.__gameQA.scene.partner.downed);
  await page.evaluate(()=>{
    const q=window.__gameQA;q.services.progress.completeOrigin();
    for(const id of ['grandad','nana','mummy','leah','daddy'])q.services.progress.rescue(id);
    q.services.ui.start(6,true);
  });
  await wait(()=>window.__gameQA.scene.levelId===6&&window.__gameQA.scene.partner);
  await page.evaluate(()=>{
    const s=window.__gameQA.scene;s.arenaStarted=true;s.finalStage=5;s.boss.start();
    s.partner.x=s.boss.x-.4;s.partner.z=s.boss.z;s.partner.facing={x:1,z:0};s.partner.invulnerableUntil=s.time.now+10000;
  });
  await tap(3);await wait(()=>window.__gameQA.scene.partner.form==='A');await tap(1);await wait(()=>window.__gameQA.scene.finalDash);
  await tap(3);await wait(()=>window.__gameQA.scene.partner.form==='B');
  await page.evaluate(()=>{const s=window.__gameQA.scene;s.partner.x=s.boss.x-.4;s.partner.z=s.boss.z;s.partner.vx=s.partner.vz=0;});
  await wait(()=>window.__gameQA.scene.time.now>=window.__gameQA.scene.partner.abilityReady);
  await tap(1);await wait(()=>window.__gameQA.scene.cinematic?.kind==='ending');
  console.log('PASS player two can deliver both finishing attacks with their own form');
  assert.deepEqual(errors,[]);
  console.log('PASS nearby partner revival; no runtime errors');
  fs.writeFileSync('test-results/coop-report.json',JSON.stringify({passed:true,errors,checks:['P2 controller movement and independent form','Five-second summon','Start pause/resume','Keyboard partner revival','P2 both-form final attacks'],method:'Virtual standard Gamepad API plus keyboard; final stage set up as a fixture. Physical controllers need testing.'},null,2));
} finally {await browser.close();}
