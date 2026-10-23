export const CONTROLLER_ACTIONS = [
  {key:'space', label:'Jump / fly up', button:'0'},
  {key:'j', label:'Attack', button:'2'},
  {key:'k', label:'Special ability / Hyper Goku', button:'1'},
  {key:'q', label:'Change form (regular hero)', button:'3', contexts:['normal']},
  {key:'c', label:'Fly down as Goku / Hyper Goku', button:'3', contexts:['goku']},
  {key:'super', label:'Super Goku / normal', button:'10+11'},
  {key:'e', label:'Interact / next scene', button:'11'},
  {key:'tab', label:'Choose next ally', button:'6'},
  {key:'l', label:'Summon selected ally', button:'7'},
  {key:'r', label:'LeBron James (when unlocked)', button:'5'},
  {key:'y', label:'Steph Curry (when unlocked)', button:'4'},
  {key:'u', label:'Vini Jr. (when unlocked)', button:'12'},
  {key:'h', label:'Handsome Squidward (when unlocked)', button:'14'},
  {key:'i', label:'Vini Jr. celebration', button:'13', contexts:['vini']},
  {key:'t', label:'Regular shot (LeBron / Curry / Vini)', button:'3', contexts:['basketball','vini']},
  {key:'pause', label:'Pause / resume', button:'9'},
];
export const BUTTON_LABELS = ['× Cross','○ Circle','□ Square','△ Triangle','L1','R1','L2','R2','Create','Options','L3 (left stick click)','R3 (right stick click)','D-pad Up','D-pad Down','D-pad Left','D-pad Right'];
export const DEFAULT_BINDINGS = Object.freeze(Object.fromEntries(CONTROLLER_ACTIONS.map(a => [a.key,a.button])));
export const bindingButtons = value => value === 'none' ? [] : String(value).split('+').map(Number);
export const bindingLabel = value => value === 'none' ? 'Not assigned' : value === '10+11' ? 'L3 + R3 together' : BUTTON_LABELS[Number(value)];
export function bindingConflicts(bindings) {
  const conflicts = [];
  for (let index=0; index<CONTROLLER_ACTIONS.length; index++) {
    const a = CONTROLLER_ACTIONS[index], aButtons = bindingButtons(bindings[a.key]);
    for (const b of CONTROLLER_ACTIONS.slice(index+1)) {
      const bButtons = bindingButtons(bindings[b.key]);
      if (!aButtons.some(button => bButtons.includes(button))) continue;
      if (a.contexts && b.contexts && !a.contexts.some(c => b.contexts.includes(c))) continue;
      // Solo Interact/Celebrate clicks wait for release so Super wins its chord.
      if ((a.key==='super' && aButtons.length===2 && ['e','i'].includes(b.key)) ||
          (b.key==='super' && bButtons.length===2 && ['e','i'].includes(a.key))) continue;
      conflicts.push(a.label+' and '+b.label+' share a button.');
    }
  }
  return conflicts;
}
export function normalizeBindings(raw) {
  const result = {...DEFAULT_BINDINGS};
  for (const action of CONTROLLER_ACTIONS) {
    const value = raw?.[action.key];
    if (value==='none' || (typeof value==='string' && /^(?:[0-9]|1[0-5])$/.test(value)) || (action.key==='super' && value==='10+11')) result[action.key]=value;
  }
  // Keep existing remaps when adding the new D-pad Left shortcut.
  if(raw && raw.h===undefined && Object.entries(result).some(([key,value])=>key!=='h'&&bindingButtons(value).includes(14)))result.h='none';
  return bindingConflicts(result).length ? {...DEFAULT_BINDINGS} : result;
}
export function controllerHelp(bindings) {
  return CONTROLLER_ACTIONS.map(action => bindingLabel(bindings[action.key])+': '+action.label).join('\n')+
    '\nLeft stick: move. Menus: joystick / D-pad to choose, × to select, ○ to go back, Options to resume.';
}

export function loadControllerBindings(raw, customized = false) {
  // Upgrade the early default layout, which put regular shots on Create.
  const previousDefaults = {...DEFAULT_BINDINGS, t:'8'};
  if (!customized && raw && CONTROLLER_ACTIONS.every(action => (action.key==='h' && raw.h===undefined) || raw[action.key] === previousDefaults[action.key])) return {...DEFAULT_BINDINGS};
  return normalizeBindings(raw);
}
