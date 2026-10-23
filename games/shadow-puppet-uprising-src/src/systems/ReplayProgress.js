import { Progress } from './Progress.js';
import { ALLY_IDS } from '../data/config.js';

export const canReplay = (progress, level) => level === 0 ? progress.data.origin :
  level === 6 ? progress.data.victory : Number.isInteger(level) && level >= 1 && level <= 5 && progress.data.rescued.includes(ALLY_IDS[level - 1]);
export function replayCharacters(progress) {
  return [{id:'A',name:'Form A'}, {id:'B',name:'Form B'},
    ...(progress.superUnlocked() ? [{id:'goku',name:'Super Goku'}, {id:'hyper',name:'Hyper Goku'}] : []),
    ...(progress.data.lebronUnlocked ? [{id:'lebron',name:'LeBron James'}] : []),
    ...(progress.data.curryUnlocked ? [{id:'curry',name:'Steph Curry'}] : []),
    ...(progress.data.squidwardUnlocked ? [{id:'squidward',name:'Handsome Squidward'}] : []),
    ...(progress.data.viniUnlocked ? [{id:'vini',name:'Vini Jr.'}] : [])];
}

// Story checkpoints and quest resets are private to this replay. Real pickups and
// newly discovered costumes still save to the player's permanent collection.
export class ReplayProgress extends Progress {
  constructor(original, level) {
    let snapshot=JSON.stringify(original.data);
    super({getItem:()=>snapshot,setItem:(_key,value)=>{snapshot=value;}});
    this.original=original;this.level=level;
    this.data.victory=false;this.data.checkpoint=null;
    if(level===0)this.data.origin=false;
    delete this.data.adventures[level];
  }
  armyAlive(owner) { return owner === ALLY_IDS[this.level-1] || this.original.armyAlive(owner); }
  chaosUnlocked() { return this.original.chaosUnlocked(); }
  superUnlocked() { return this.original.superUnlocked(); }
  collect(level,id) {
    const collected=this.original.collect(level,id);
    this.data.collected={...this.original.data.collected};this.data.stars=this.original.data.stars;
    return collected;
  }
  unlockLeBron() {const unlocked=this.original.unlockLeBron();this.data.lebronUnlocked=this.original.data.lebronUnlocked;return unlocked;}
  unlockCurry() {const unlocked=this.original.unlockCurry();this.data.curryUnlocked=this.original.data.curryUnlocked;return unlocked;}
  unlockSquidward() {const unlocked=this.original.unlockSquidward();this.data.squidwardUnlocked=this.original.data.squidwardUnlocked;return unlocked;}
  unlockVini() {const unlocked=this.original.unlockVini();this.data.viniUnlocked=this.original.data.viniUnlocked;return unlocked;}
}
