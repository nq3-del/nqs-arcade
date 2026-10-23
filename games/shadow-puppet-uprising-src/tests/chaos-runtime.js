// Browser regression fixture. This page uses memory storage; it never touches a player's save.
import Phaser from 'phaser';
import '../src/style.css';
import '../src/diorama/presentation.css';
import { Progress } from '../src/systems/Progress.js';
import { AudioSystem } from '../src/systems/Audio.js';
import { Controllers } from '../src/systems/Controllers.js';
import { UI } from '../src/ui/UI.js';
import { DioramaMenu, DioramaScene } from '../src/diorama/DioramaScene.js';
import { ALLY_IDS, PHYSICS } from '../src/data/config.js';
import { CHAOS_EMERALDS, STAGE_STARS } from '../src/data/chaos.js';

const values = new Map();
const storage = { getItem:k=>values.get(k), setItem:(k,v)=>values.set(k,v) };
const progress = new Progress(storage);
progress.data.settings.muted = true;
const services = { progress, audio:new AudioSystem(progress) };
services.ui = new UI(services);
services.controls = new Controllers(services);
const game = new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1280,height:720,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{gravity:{y:PHYSICS.gravity}}},
  scene:[DioramaMenu,DioramaScene],callbacks:{preBoot:g=>g.registry.set('services',services)}});
services.ui.attach(game);
game.events.on('prestep',()=>services.controls.poll());
const status = document.createElement('pre');
status.id='test-status'; status.style.cssText='white-space:pre-wrap;padding:12px;color:#d8ffe5;font:12px monospace';
document.body.append(status);
const output=[];
const check=(ok, label)=>{if(!ok)throw Error(label);output.push('PASS '+label);status.textContent=output.join('\n');};
const wait=()=>Promise.resolve();
const until=async(fn,label)=>{for(let i=0;i<400;i++){if(fn())return;advance(50);if(i%50===0)await wait(0);}throw Error('Timeout: '+label);};
const scene=()=>game.scene.getScene('Game');
const stepScene=(s,dt)=>{
  // Keep camera/projection and gameplay updates, but render only real browser frames.
  const draw=s.view.renderer.render;s.view.renderer.render=()=>{};
  try{s.update(s.time.now,dt);}finally{s.view.renderer.render=draw;}
};
// Drive the actual scene update deterministically, even when Chrome throttles a background tab.
const advance=ms=>{for(let left=ms;left>0;left-=50){const s=scene(),dt=Math.min(50,left);if(s.player&&game.scene.isActive('Game')){s.time.now+=dt;stepScene(s,dt);}}};
const start=async(level,mission=null)=>{const old=scene().player;services.ui.start(level,false,mission);await until(()=>scene().levelId===level&&scene().missionId===mission&&scene().player&&scene().player!==old&&game.scene.isActive('Game'),'start');await wait(100);};
const position=(p,point)=>{Object.assign(p,{x:point[0],z:point[1],y:0,vx:0,vz:0,vy:0,dashUntil:0,knockUntil:0,wetTime:0});p.sync(0);};
const tap=async(code,key)=>{document.activeElement?.blur();const keyCode=key.toUpperCase().charCodeAt(0);window.dispatchEvent(new KeyboardEvent('keydown',{code,key,keyCode,which:keyCode,bubbles:true}));game.events.emit(Phaser.Core.Events.POST_STEP);advance(40);window.dispatchEvent(new KeyboardEvent('keyup',{code,key,keyCode,which:keyCode,bubbles:true}));game.events.emit(Phaser.Core.Events.POST_STEP);};
const checkReachability=s=>{
  const v=s.view,queue=[s.definition.start],seen=new Set([queue[0].join(',')]);
  const free=(x,z)=>v.walkable(x,z)&&!v.wet(x,z)&&!v.blocked(x,z);
  for(let i=0;i<queue.length;i++) {
    const [x,z]=queue[i];
    for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]) {
      const a=x+dx,b=z+dz,key=`${a},${b}`;
      if(!seen.has(key)&&free(a,b)){seen.add(key);queue.push([a,b]);}
    }
  }
  const missing=STAGE_STARS[s.levelId].map((at,id)=>({at,id})).filter(({at:[x,z]})=>!queue.some(([a,b])=>Math.hypot(x-a,z-b)<.69));
  check(!missing.length,`Stage ${s.levelId}: every star has an accessible pickup approach${missing.length?' '+JSON.stringify(missing):''}`);
};
game.events.once('ready',async()=>{
  try {
    if(new URLSearchParams(location.search).has('flight')) {
      progress.completeOrigin();ALLY_IDS.forEach(id=>progress.rescue(id));progress.completeFinal();
      STAGE_STARS.forEach((points,level)=>points.forEach((_,id)=>progress.collect(`d${level}`,id)));
      CHAOS_EMERALDS.forEach(e=>{progress.data.chaosTrials[e.id]=3;progress.collectEmerald(e.id);});
      check(true,'Isolated all-emerald flight fixture ready');
    } else {
    services.ui.chaosMap();
    check(document.querySelectorAll('.chaos-card:disabled').length===7,'Seven missions locked on a fresh save');
    progress.completeOrigin(); ALLY_IDS.forEach(id=>progress.rescue(id)); progress.completeFinal();
    let collected=0;
    for(let level=0;level<7;level++) {
      await start(level);
      const s=scene(),p=s.player;
      check(s.stars.length===STAGE_STARS[level].length,`Stage ${level}: the visible star population matches its counter`);
      check(s.view.floaters.filter(f=>f.kind==='collectible-star').length===s.stars.length,`Stage ${level}: no decorative stars pretending to be pickups`);
      checkReachability(s);
      for(const star of s.stars) {
        if(!(star.view.visible&&star.view.children[0].material.depthTest===false&&star.view.position.y>s.view.floorHeight(star.x,star.z)))throw Error(`Stage ${level} star ${star.id} not visible above terrain and scenery`);
        if(level===6&&star.id===23)continue;
        position(p,[star.x,star.z]);
        stepScene(s,16);
        if(star.active)throw Error(`Stage ${level} star ${star.id} cannot be collected`);
        collected++;
        if(progress.data.stars!==collected)throw Error(`Incorrect star total: ${progress.data.stars} instead of ${collected}`);
      }
      check(true,`Stage ${level}: stars are visible above terrain, render through scenery, and collect once with exact totals`);
    }
    services.ui.chaosMap();
    check(document.querySelectorAll('.chaos-card:disabled').length===7,'One missing finale star keeps every mission locked');
    await start(6);
    check(scene().stars.length===1,'Revisiting the finale respawns only its one uncollected star');
    position(scene().player,STAGE_STARS[6][23]);
    await until(()=>progress.data.stars===158,'last star pickup');
    check(new Progress(storage).data.stars===158,'Every one of the 158 stars can be collected and survives reload');
    services.ui.chaosMap();
    check(document.querySelectorAll('.chaos-card:not(:disabled)').length===7,'158 stars plus story completion opens seven missions');
    for (const e of CHAOS_EMERALDS) {
      await start(e.level,e.id);
      const s=scene(),p=s.player,m=s.chaosMission;
      check(!s.boss&&!s.cinematic&&s.enemies.length===0,`${e.name}: separate side mission without replaying the story`);
      check(!p.superPower.toggle(),`${e.name}: Super unavailable before all seven emeralds`);
      if ((e.rule==='B'||e.rule==='power')&&p.form!=='B') p.switchForm();
      for(let i=0;i<3;i++) {
        position(p,e.points[i]);
        p.abilityReady=p.attackReady=0;
        if(e.rule==='jump') {p.y=s.view.floorHeight(p.x,p.z)+0.8;p.vy=2;}
        if(e.rule==='dash') {p.facing={x:1,z:0};s.keyPressed.k=true;}
        if(e.rule==='power') s.keyPressed.k=true;
        if(e.rule==='basic') s.keyPressed.j=true;
        await until(()=>m.step===i+1,`${e.name} seal ${i+1}`);
        // Leave the pickup radius before the next frame, avoiding accidental next-seal actions.
        p.vx=p.vz=0;p.dashUntil=0;
      }
      position(p,e.points[3]);
      await until(()=>services.ui.mode==='chaos-reward',e.name+' reward');
      check(progress.data.emeralds.includes(e.id),`${e.name} Chaos Emerald awarded and saved`);
      services.ui.chaosMap();await wait(80);
    }
    check(new Progress(storage).superUnlocked(),'All seven Chaos Emeralds survive save reload');
    }
    await start(1);
    const s=scene(),p=s.player;
    if(p.form!=='B')p.switchForm();
    const original=p.form;
    const before={x:p.x,z:p.z};
    await tap('KeyS','s');
    check(p.superPower.phase==='gather'&&document.querySelectorAll('.chaos-flying-gem').length===7,'S starts seven emeralds orbiting the screen');
    check(!p.superPower.toggle(),'Extra toggle cannot interrupt emerald convergence');
    check(p.x===before.x&&p.z===before.z,'S does not also move the player backwards');
    check(p.actor.kind===original,'Original character remains until emeralds arrive');
    const elapsed=p.superPower.elapsed;
    services.ui.pause();await wait(200);
    check(p.superPower.elapsed===elapsed,'Transformation pauses with gameplay');services.ui.pop();
    await until(()=>p.superPower.active,'transform');
    check(p.actor.kind==='super-goku','Emerald arrival creates the Super Goku model');
    s.touchHeld.space=true;advance(650);s.touchHeld.space=false;
    check(p.y>1.5,'Super Goku flies up while Space is held');
    const height=p.y;advance(180);check(Math.abs(p.y-height)<0.01,'Super Goku hovers when flight controls are released');
    s.touchHeld.c=true;advance(230);s.touchHeld.c=false;
    check(p.y<height-0.3,'C descends while Super Goku');
    s.touchHeld.right=true;const x=p.x;advance(220);s.touchHeld.right=false;
    check(p.x>x,'Flying character can steer horizontally');
    await tap('KeyS','s');
    check(p.superPower.phase==='scatter'&&p.actor.kind===original,'S scatters emeralds and restores the exact original form');
    await until(()=>p.superPower.phase==='normal','scatter');advance(300);
    check(p.y<height,'Normal form falls under gravity');
    check(progress.data.emeralds.length===7,'Detransformation never spends or drops the saved emeralds');
    for(let i=0;i<2;i++) {
      await tap('KeyS','s'); await until(()=>p.superPower.active,'repeat gather');
      await tap('KeyS','s'); await until(()=>p.superPower.phase==='normal','repeat scatter');
    }
    check(document.querySelectorAll('.chaos-transformation').length===0,'Repeated S toggles clean up animation overlays');
    s.view.reducedMotion=true;p.superPower.toggle();await until(()=>p.superPower.active,'reduced motion');
    check(p.actor.kind==='super-goku','Reduced-effects transformation completes');
    p.superPower.toggle();services.ui.map();await wait(100);
    check(document.querySelectorAll('.chaos-transformation').length===0,'Leaving during a transformation cleans up the screen');
    // Finish with an interactive, isolated showcase for visual review.
    await start(1); scene().view.reducedMotion=false;scene().player.superPower.toggle();
    await until(()=>scene().player.superPower.active,'showcase');
    scene().touchHeld.space=true;advance(500);scene().touchHeld.space=false;
    check(true,'ALL CHAOS RUNTIME CHECKS PASSED · isolated memory save');
  } catch(error) {status.textContent=output.join('\n')+'\nFAIL '+error.stack;console.error(error);}
});
