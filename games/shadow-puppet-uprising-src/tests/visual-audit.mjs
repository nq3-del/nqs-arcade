import { chromium } from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],metrics=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:5173/?qa');await page.waitForFunction(()=>window.__gameQA?.services.ui.mode==='menu');
for(let level=1;level<=6;level++){
 await page.evaluate(level=>{const q=window.__gameQA;q.services.progress.data.origin=true;q.services.progress.data.rescued=['grandad','nana','mummy','leah','daddy'].slice(0,level-1);q.services.ui.start(level);},level);
 await page.waitForFunction(l=>window.__gameQA.scene.levelId===l&&window.__gameQA.scene.cinematic,level);
 await page.waitForTimeout(1600);await page.screenshot({path:`test-results/audit-cinema-${level}.png`});
 await page.locator('[data-cinema="skip"]').click();
 await page.evaluate(()=>{const s=window.__gameQA.scene;s.player.x=s.levelId===2?-2:0;s.player.z=2;s.player.invulnerableUntil=0;s.player.facing={x:.5,z:1};s.player.sync(0);});
 await page.waitForTimeout(1600);await page.screenshot({path:`test-results/audit-world-${level}.png`});
 metrics.push(await page.evaluate(()=>({level:window.__gameQA.scene.levelId,calls:window.__gameQA.scene.view.renderer.info.render.calls,triangles:window.__gameQA.scene.view.renderer.info.render.triangles,fps:window.__gameQA.game.loop.actualFps})));
}
assert.deepEqual(errors,[]);fs.writeFileSync('test-results/visual-audit-report.json',JSON.stringify({passed:true,errors,metrics},null,2));console.log('PASS visual scenes render without errors',metrics);
}finally{await browser.close();}
