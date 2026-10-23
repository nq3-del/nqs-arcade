import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(45000);
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const qa=fn=>page.evaluate(fn),wait=fn=>page.waitForFunction(fn,null,{timeout:45000});
const pass=s=>{checks.push(s);console.log('PASS',s);};
const key=async k=>{await page.keyboard.press(k,{delay:100});await page.waitForTimeout(120);};
const skip=async()=>{await page.locator('[data-cinema="skip"]').click();await wait(()=>!window.__gameQA.scene.cinematic);};
const position=(x,z)=>page.evaluate(({x,z})=>{const s=window.__gameQA.scene,p=s.player;Object.assign(p,{x,z,y:0,vx:0,vz:0,vy:0,wetTime:0,dashUntil:0,knockUntil:0,glamourUntil:0,invulnerableUntil:s.time.now+600000});p.sync(0);},{x,z});
const form=async f=>{if(await qa(()=>window.__gameQA.scene.player.form)!==f)await key('q');await page.waitForFunction(f=>window.__gameQA.scene.player.form===f,f);};
const ready=()=>wait(()=>{const s=window.__gameQA.scene,p=s.player;return s.time.now>=Math.max(p.abilityReady,p.attackReady,p.glamourUntil);});
const select=async id=>{await page.locator('[data-hud="allies"]').click();await page.locator(`[data-action="${id}"]`).click();};
const untilHit=async(k,step,i)=>{for(let attempt=0;attempt<30;attempt++){if(await page.evaluate(({step,i})=>{const a=window.__gameQA.scene.adventure;return a.step>step||a.hits.has(i);},{step,i}))return;await key(k);await page.waitForTimeout(300);}throw Error(`No progress: ${step}/${i} ${k}`);};
const combat=async()=>{const at=await qa(()=>{const a=window.__gameQA.scene.adventure;return a.patrol.find(e=>e.active&&e.poseUntil<a.scene.time.now&&e.friendlyUntil<a.scene.time.now);}).catch(()=>null);};
fs.mkdirSync('test-results',{recursive:true});
try{
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:5173'}/?qa`);await wait(()=>window.__gameQA?.services.ui.mode==='menu');
  await page.getByRole('button',{name:'How to play'}).click();await page.getByRole('button',{name:'Got it!'}).click();
  await page.getByRole('button',{name:'Let’s play'}).click();await skip();
  await page.keyboard.down('ArrowDown');await wait(()=>window.__gameQA.scene.player.x>-7.5);await page.keyboard.up('ArrowDown');
  await form('B');await position(-3,3);await wait(()=>window.__gameQA.scene.originStep===1);
  await position(0,0);await key('Space');await wait(()=>window.__gameQA.scene.originStep>=3);
  await position(3,-1);await ready();await key('k');await wait(()=>window.__gameQA.scene.originStep===4);
  await form('A');await position(5.5,-4);await qa(()=>window.__gameQA.scene.player.facing={x:1,z:0});await ready();await key('k');await wait(()=>window.__gameQA.scene.originStep===5);
  await position(9,-7);await key('e');await skip();await wait(()=>window.__gameQA.services.ui.mode==='map');
  pass('Origin, real movement/jump, form switch, both powers and portal');
  for(let level=1;level<=5;level++){
    await page.locator(`[data-action="world${level}"]`).click();await skip();
    const count=await qa(()=>window.__gameQA.scene.adventure.tasks.length);
    for(let step=0;step<count;step++){
      const t=await qa(()=>window.__gameQA.scene.adventure.task);console.log('TASK',level,step,t.kind);
      if(t.kind==='ally')await select(t.ally);
      if(['power','hoops','escort','encounter'].includes(t.kind))await form('B');
      if(t.kind==='dash')await form('A');
      if(t.kind==='escort'){
        for(let loops=0;loops<260&&await qa(()=>window.__gameQA.scene.adventure.step)===step;loops++){
          const state=await qa(()=>{const a=window.__gameQA.scene.adventure;const e=a.patrol.find(e=>e.active&&e.friendlyUntil<a.scene.time.now&&e.poseUntil<a.scene.time.now);return{cart:{x:a.cart.x,z:a.cart.z},enemy:e?{x:e.x,z:e.z}:null};});
          const at=state.enemy||state.cart;await position(at.x,at.z);
          if(state.enemy){await ready();await key('k');}else await page.waitForTimeout(400);
        }
      }else if(t.kind==='encounter'){
        for(let wave=0;wave<t.waves;wave++){
          await position(...t.points[wave]);await wait(()=>window.__gameQA.scene.adventure.opened);
          for(let attempt=0;attempt<20;attempt++){
            if(await page.evaluate(({step,wave})=>{const a=window.__gameQA.scene.adventure;return a.step>step||a.wave>wave;},{step,wave}))break;
            const e=await qa(()=>{const a=window.__gameQA.scene.adventure,e=a.patrol.find(e=>e.active);return e?{x:e.x,z:e.z}:null;});
            if(e){await position(e.x,e.z);await ready();await key('k');}else await page.waitForTimeout(150);
          }
        }
      }else{
        for(let i=0;i<t.points.length;i++){
          await position(...t.points[i]);
          if(t.kind==='ally'){
            await wait(()=>window.__gameQA.scene.allies.remaining()===0);
            await untilHit('l',step,i);
          }else if(t.kind==='sport'){
            await key('j');await page.waitForFunction(({step,i})=>{const a=window.__gameQA.scene.adventure;return a.step>step||a.hits.has(i);},{step,i});
          }else if(t.kind==='catapult'){
            await key('e');await wait(()=>!window.__gameQA.scene.player.launched);await page.waitForFunction(n=>window.__gameQA.scene.adventure.step>n,step);
          }else{
            if(['power','dash'].includes(t.kind))await ready();
            await qa(()=>window.__gameQA.scene.player.facing={x:1,z:0});
            await untilHit(t.kind==='hoops'?'Space':['power','dash'].includes(t.kind)?'k':'e',step,i);
          }
        }
      }
      await page.waitForFunction(n=>window.__gameQA.scene.adventure.step===n,step+1);
      await skip();
      if(level===1&&step===0){
        await page.locator('[data-hud="map"]').click();await page.locator('[data-action="world1"]').click();await skip();
        assert.equal(await qa(()=>window.__gameQA.scene.adventure.step),1);pass('Objective progress survives map round trip');
      }
    }
    const b=await qa(()=>({x:window.__gameQA.scene.boss.x,z:window.__gameQA.scene.boss.z}));await position(b.x-2,b.z);await form('B');
    await wait(()=>window.__gameQA.scene.boss.activeFight);await page.screenshot({path:`test-results/expedition-${level}.png`});
    for(let attempt=0;attempt<35&&await qa(()=>window.__gameQA.scene.boss.active);attempt++){
      await wait(()=>window.__gameQA.scene.boss.state==='recovery'||!window.__gameQA.scene.boss.active);
      if(!await qa(()=>window.__gameQA.scene.boss.active))break;
      const b=await qa(()=>({x:window.__gameQA.scene.boss.x,z:window.__gameQA.scene.boss.z}));await position(b.x-.8,b.z);await ready();await key('k');
      if(await qa(()=>window.__gameQA.scene.boss.active))await key('j');
    }
    await wait(()=>window.__gameQA.scene.cinematic?.kind==='rescue');await skip();await wait(()=>window.__gameQA.services.ui.mode==='rescue');
    assert.equal(await qa(()=>window.__gameQA.services.progress.data.rescued.length),level);
    assert.equal(await qa(()=>window.__gameQA.scene.enemies.filter(e=>e.active).length),0);
    pass(`World ${level}: every distinct mission, boss FSM, rescue, ally unlock and clone removal`);
    await page.getByRole('button',{name:'On with the adventure'}).click();
  }
  await page.reload();await wait(()=>window.__gameQA?.services.ui.mode==='menu');
  assert.equal(await qa(()=>window.__gameQA.services.progress.data.rescued.length),5);
  await page.getByRole('button',{name:'Continue adventure'}).click();assert.equal(await page.locator('[data-action="world6"]').isEnabled(),true);
  await page.locator('[data-action="world1"]').click();await skip();assert.equal(await qa(()=>window.__gameQA.scene.enemies.length),0);assert.equal(await qa(()=>window.__gameQA.scene.boss),null);
  pass('Save reload, final unlock, defeated armies absent on later visits');
  const cp=await qa(()=>window.__gameQA.scene.definition.checkpoint);await position(...cp);await wait(()=>window.__gameQA.scene.checkpointReached);
  await qa(()=>{const s=window.__gameQA.scene;s.player.health=1;s.player.invulnerableUntil=0;s.player.hurt({x:s.player.x+1,z:s.player.z});});await wait(()=>window.__gameQA.services.ui.mode==='defeat');await key('r');await wait(()=>window.__gameQA.services.ui.mode==='game'&&window.__gameQA.scene.player.health===8);
  assert.equal(await qa(()=>window.__gameQA.scene.player.x),cp[0]);pass('Defeat and retry restore saved checkpoint and full hearts');
  await page.locator('[data-hud="map"]').click();await page.locator('[data-action="world6"]').click();await skip();await position(1,-1);await wait(()=>window.__gameQA.scene.arenaStarted);await skip();
  for(const [i,id] of ['grandad','nana','mummy','leah','daddy'].entries()){
    await select(id);const at=await page.evaluate(i=>{const s=window.__gameQA.scene,o=i===0?s.finalMachine:i<3?s.finalGuards[0]:i===3?s.finalBarrier:s.finalTarget;return{x:o.x-(i===4?2:0),z:o.z};},i);
    await position(at.x,at.z);await qa(()=>window.__gameQA.scene.player.facing={x:1,z:0});await key('l');
    await page.waitForFunction(n=>window.__gameQA.scene.finalStage===n,i+1);pass(`Final contribution: ${id}`);
  }
  await form('A');let b=await qa(()=>({x:window.__gameQA.scene.boss.x,z:window.__gameQA.scene.boss.z}));await position(b.x-.5,b.z);await qa(()=>window.__gameQA.scene.player.facing={x:1,z:0});await ready();await key('k');await wait(()=>window.__gameQA.scene.finalDash);
  await form('B');await position(b.x-.5,b.z);await ready();await key('k');await wait(()=>window.__gameQA.scene.cinematic?.kind==='ending');await page.screenshot({path:'test-results/expedition-ending.png'});await skip();await wait(()=>window.__gameQA.services.ui.mode==='victory');
  assert.equal(await qa(()=>window.__gameQA.services.progress.data.victory),true);pass('Two-form finale, celebration and saved victory');
  await page.getByRole('button',{name:'Back to our worlds'}).click();await page.locator('[data-action="world1"]').click();
  // Post-story exploration deliberately starts without an arrival cutscene.
  if(await qa(()=>!!window.__gameQA.scene.cinematic))await skip();
  assert.equal(await qa(()=>window.__gameQA.scene.boss),null);pass('Post-story exploration opens without replaying the campaign');
  assert.deepEqual(errors,[]);pass('No browser runtime or missing-resource errors');
  fs.writeFileSync('test-results/campaign-report.json',JSON.stringify({passed:true,checks,errors,method:'Controlled position and invulnerability fixtures; actual keyboard actions, normal mission logic, timed escort, normal cooldowns and boss states. Not a timed family playtest.'},null,2));
}catch(error){
  await page.screenshot({path:'test-results/campaign-failure.png'});
  console.error('STATE',await qa(()=>{const s=window.__gameQA?.scene;return{level:s?.levelId,step:s?.adventure?.step,task:s?.adventure?.task,hits:[...(s?.adventure?.hits||[])],mode:window.__gameQA?.services.ui.mode,cinema:s?.cinematic?.kind,player:s?.player?{x:s.player.x,z:s.player.z,y:s.player.y,form:s.player.form}:null};}));console.error(errors);
  fs.writeFileSync('test-results/campaign-report.json',JSON.stringify({passed:false,checks,errors,failure:error.message},null,2));throw error;
}finally{await browser.close();}
