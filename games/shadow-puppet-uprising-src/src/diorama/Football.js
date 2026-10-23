import { Basketball, FIRE_COOLDOWN } from './Basketball.js';
import { FOOTBALL_GOALS } from './SportsCollisions.js';
import { basketballArc } from '../data/basketball.js';

export class Football extends Basketball {
  shoot(player, flaming = false) {
    const s=this.scene;
    if(!player.viniEquipped||!s.services.progress.data.viniUnlocked||player.downed||player.launched||player.superPower.busy||s.cinematic||s.ending||
      s.time.now<(flaming?player.lebronAbilityReady||0:player.shotReady||0))return false;
    const goal=[...FOOTBALL_GOALS].sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
    const length=Math.hypot(goal.x-player.x,goal.z-player.z);
    if((s.levelId !== undefined && s.levelId !== 5)||length>15)return this.freeShot(player,flaming,true);
    player.facing={x:(goal.x-player.x)/Math.max(.01,length),z:(goal.z-player.z)/Math.max(.01,length)};
    player.actor.root.rotation.y=Math.atan2(player.facing.x,player.facing.z);
    if(flaming)player.lebronAbilityReady=s.time.now+FIRE_COOLDOWN;else player.shotReady=s.time.now+1100;
    player.kickingUntil=s.time.now+500;
    const start={x:player.x+player.facing.x*.5,y:player.y+.65,z:player.z+player.facing.z*.5};
    this.shots.push({arc:basketballArc(start,{x:goal.x,y:1.15,z:goal.z}),model:s.view.football(start.x,start.y,start.z,flaming),elapsed:0,scored:false,flaming,player,goal:true});
    s.services.audio.play('pop');return true;
  }
  observeDaddyShot(shot,before) {
    if(this.scene.levelId !== undefined && this.scene.levelId !== 5)return false;
    if(shot.owner!=='daddy'||!shot.friendly||shot.type!=='ball'||shot.goalScored)return false;
    for(const goal of FOOTBALL_GOALS){
      const dx=shot.x-before.x,side=Math.sign(goal.x);
      if(side*dx<=0||side*(before.x-goal.x)>0||side*(shot.x-goal.x)<0)continue;
      const t=(goal.x-before.x)/dx,z=before.z+(shot.z-before.z)*t;
      if(Math.abs(z-goal.z)<2.7){shot.goalScored=true;this.scene.discoverVini();return true;}
    }
    return false;
  }
}
