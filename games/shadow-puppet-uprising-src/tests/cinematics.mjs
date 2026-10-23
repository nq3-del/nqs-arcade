import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CINEMATICS, ALL_VOICE_CUES, VOICE_ROLES } from "../src/data/cinematics.js";
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const errors = [], checks = [], audioRequests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("request", (r) => { if (/audio\/voice\/.*\.(wav|ogg|mp3|m4a)/.test(r.url())) audioRequests.push(r.url()); });
page.setDefaultTimeout(30000);
fs.mkdirSync("test-results", { recursive: true });
const qa = (fn, arg) => page.evaluate(fn, arg);
const wait = (fn, arg) => page.waitForFunction(fn, arg);
const pass = (name) => { checks.push(name); console.log("PASS", name); };
const skip = () => page.locator('[data-cinema="skip"]').click();
try {
  await page.goto(`${url}/?qa`);
  await page.getByRole("button", { name: "Let’s play" }).click();
  await wait(() => window.__gameQA.scene.cinematic?.story?.id === "c00-awakening");
  await wait(() => window.__gameQA.scene.director.clip?.state === "missing");
  if (await qa(() => window.__gameQA.scene.director.auto)) await page.locator('[data-cinema="auto"]').click();
  const original = await qa(() => { const s=window.__gameQA.scene;return {x:s.player.x,z:s.player.z,form:s.player.form}; });
  await page.keyboard.press("Space");
  await wait(() => window.__gameQA.scene.cinematic.index === 1);
  await page.waitForTimeout(200);
  assert.equal(await qa(() => window.__gameQA.scene.cinematic.index), 1, "Space advances exactly one line");
  await page.keyboard.press("e");
  await wait(() => window.__gameQA.scene.cinematic.index === 2);
  await page.locator('[data-cinema="back"]').click();
  assert.equal(await qa(() => window.__gameQA.scene.cinematic.index), 1);
  await page.locator('[data-cinema="replay"]').click();
  assert.equal(await qa(() => window.__gameQA.scene.cinematic.index), 1);
  await page.keyboard.press("Escape");
  assert.equal(await qa(() => window.__gameQA.services.voice.paused), true);
  await page.getByRole("button", { name: "Keep going" }).click();
  assert.equal(await qa(() => window.__gameQA.services.voice.paused), false);
  await skip();
  assert.deepEqual(await qa(() => { const s=window.__gameQA.scene;return {x:s.player.x,z:s.player.z,form:s.player.form}; }), original);
  assert.equal(await qa(() => window.__gameQA.scene.player.actor.root.visible), true);
  assert.equal(audioRequests.length, 0, "unrecorded cues do not request absent files");
  pass("keyboard, back, replay, pause and skip preserve the hero; missing audio stays quiet");

  const ids = ["grandad", "nana", "mummy", "leah", "daddy"];
  for (const definition of CINEMATICS) {
    await qa(({ definition, ids }) => {
      const q=window.__gameQA,p=q.services.progress;
      p.data.origin=true;p.data.rescued=ids.slice(0,definition.level===6?5:Math.max(0,definition.level-1));
      if(definition.kind==="return"||definition.kind==="rescue")p.data.rescued=ids.slice(0,definition.level);
      p.data.settings.players=1;
      q.services.ui.start(definition.level,true);
    }, { definition, ids });
    await wait((level) => window.__gameQA.scene.levelId===level&&window.__gameQA.scene.director, definition.level);
    await qa(({kind,step}) => { const s=window.__gameQA.scene;s.director.auto=false;s.previewCompletions=0;const previous=s.adventure?.step;if(step&&s.adventure)s.adventure.step=step;s.playCinema([],()=>{s.previewCompletions++},kind);if(s.adventure)s.adventure.step=previous; }, definition);
    await wait((id) => window.__gameQA.scene.cinematic?.story?.id===id, definition.id);
    assert.equal(await qa(() => window.__gameQA.scene.player.actor.root.visible), false);
    for (let i=0;i<definition.beats.length;i++) {
      const current=await qa(()=>{const c=window.__gameQA.scene.cinematic;return {index:c.index,id:c.beats[c.index].id,text:document.querySelector('.cinema-caption p').textContent};});
      assert.equal(current.id,definition.beats[i].id);
      assert.equal(current.text,definition.beats[i].text);
      if (i===2 && ["c00-awakening","c01-rescue","c06-home"].includes(definition.id)) {
        await page.waitForTimeout(1000);
        await page.screenshot({path:`test-results/cinema-${definition.id}.png`});
      }
      await page.locator('[data-cinema="next"]').click();
    }
    assert.equal(await qa(()=>window.__gameQA.scene.cinematic),null);
    assert.equal(await qa(()=>window.__gameQA.scene.previewCompletions),1);
    assert.equal(await qa(()=>window.__gameQA.scene.director.cast.size),0);
  }
  pass(`all ${CINEMATICS.length} scenes display the exact recording lines and finish once with no stage puppets left behind`);

  await qa(()=>{const q=window.__gameQA;q.services.progress.data.settings.players=2;q.services.ui.start(0,false);});
  await wait(()=>window.__gameQA.scene.partner&&window.__gameQA.scene.cinematic);
  assert.equal(await qa(()=>window.__gameQA.scene.players.every(p=>!p.actor.root.visible)),true);
  await qa(()=>{window.cinemaPad={index:0,id:'Cinematic QA pad',mapping:'standard',connected:true,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===6,value:i===6?1:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.cinemaPad]});});
  await wait(()=>window.__gameQA.scene.cinematic.index===1);
  await qa(()=>Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]}));
  await skip();
  assert.equal(await qa(()=>window.__gameQA.scene.players.every(p=>p.actor.root.visible)),true);
  pass("two-player scenes hide and restore both actors and accept the second controller's advance action");

  await qa(()=>{const s=window.__gameQA.scene;s.playCinema([],()=>{},"intro");s.view.reducedMotion=true;});
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(500);
  const fit=await qa(()=>{const c=document.querySelector('.cinema-caption').getBoundingClientRect();return {left:c.left,right:c.right,bottom:c.bottom,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.ok(fit.left>=0&&fit.right<=fit.width&&fit.bottom<=fit.height&&!fit.overflow);
  await page.screenshot({path:"test-results/cinema-mobile.png"});
  const cam1=await qa(()=>window.__gameQA.scene.director.camera());
  await page.waitForTimeout(300);
  assert.deepEqual(await qa(()=>window.__gameQA.scene.director.camera()),cam1);
  if(await qa(()=>!window.__gameQA.scene.director.auto))await page.locator('[data-cinema="auto"]').click();
  await wait(()=>window.__gameQA.scene.cinematic.index===1);
  await skip();
  pass("small-screen caption layout, reduced-motion framing and silent autoplay");

  // A generated test-only PCM tone is routed in memory, never installed as a recording.
  const samples=48000*2, wav=Buffer.alloc(44+samples*2);
  wav.write("RIFF");wav.writeUInt32LE(wav.length-8,4);wav.write("WAVEfmt ",8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write("data",36);wav.writeUInt32LE(samples*2,40);
  for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(Math.sin(i/48000*Math.PI*440)*800),44+i*2);
  await page.route("**/audio/voice/manifest.json",r=>r.fulfill({json:{clips:{"c00-awakening-01":"c00-awakening-01.wav"}}}));
  await page.route("**/audio/voice/c00-awakening-01.wav",r=>r.fulfill({body:wav,contentType:"audio/wav"}));
  await page.setViewportSize({width:1440,height:1000});
  await page.reload();
  await wait(()=>window.__gameQA?.services.ui.mode==="menu");
  await qa(()=>{window.__gameQA.services.progress.data.settings.players=1;window.__gameQA.services.ui.start(0,false)});
  await page.locator('[data-cinema="replay"]').click();
  await wait(()=>window.__gameQA.services.voice.current?.state==="playing");
  await page.keyboard.press("Escape");
  assert.equal(await qa(()=>window.__gameQA.services.voice.current.state),"paused");
  await page.getByRole("button",{name:"Keep going"}).click();
  await wait(()=>window.__gameQA.services.voice.current?.state==="playing");
  await page.locator("#sound-toggle").click();
  assert.equal(await qa(()=>window.__gameQA.services.voice.current.media.muted),true);
  await skip();
  assert.equal(await qa(()=>window.__gameQA.services.voice.current),null);
  pass("real browser audio decodes, plays, pauses, resumes, mutes and stops on skip");

  await page.goto(`${url}/recording-script.html`);
  assert.equal(await page.locator(".cue").count(),ALL_VOICE_CUES.length);
  await page.locator("#role").selectOption("hero_a");
  assert.equal(await page.locator(".cue").count(),ALL_VOICE_CUES.filter(c=>c.speaker==="hero_a").length);
  await page.locator("[data-cue]").first().check();
  await page.reload();
  assert.equal(await page.locator("[data-cue]:checked").count(),1);
  await page.locator("#view").selectOption("plan");
  assert.equal(await page.locator(".scene").count(),CINEMATICS.length);
  await page.locator("#view").selectOption("actors");
  await page.locator("#role").selectOption("hero_a");
  await page.screenshot({path:"test-results/recording-script.png",fullPage:false});
  await page.emulateMedia({media:"print"});
  await page.screenshot({path:"test-results/recording-script-print.png"});
  pass("recording sheet filters by performer, remembers its checklist, shows every scene and renders for print");
  assert.deepEqual(errors,[]);
  fs.writeFileSync("test-results/cinematics-report.json",JSON.stringify({passed:true,scenes:CINEMATICS.length,cues:ALL_VOICE_CUES.length,roles:Object.keys(VOICE_ROLES).length,checks,errors},null,2));
} catch(error) {
  await page.screenshot({path:"test-results/cinematics-failure.png"}).catch(()=>{});
  fs.writeFileSync("test-results/cinematics-report.json",JSON.stringify({passed:false,checks,errors,failure:error.stack},null,2));
  throw error;
} finally {await browser.close();}
