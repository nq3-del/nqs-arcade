import test from 'node:test';
import assert from 'node:assert/strict';
import { Controllers } from '../src/systems/Controllers.js';
import { DEFAULT_BINDINGS, bindingConflicts, normalizeBindings, controllerHelp } from '../src/systems/ControllerBindings.js';
import { Progress, SAVE_KEY } from '../src/systems/Progress.js';

function fixture(t, mode = 'game') {
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const pads = [0, 1].map(index => ({index, axes: [0, 0, 0, 0], buttons: Array.from({length: 17}, () => ({pressed: false}))}));
  const doc = {activeElement: null};
  const players = [0, 1].map(() => ({superPower: {active: false}, sportsEquipped: false, viniEquipped: false}));
  const ui = {
    mode, stack: [], scene: {players}, buttons: [], backs: 0,
    root: {querySelectorAll: () => ui.buttons},
    pause() { this.stack.push(this.mode); this.mode = 'pause'; },
    pop() { this.mode = this.stack.pop() || 'game'; },
    back() { this.backs++; if (this.stack.length) this.pop(); },
  };
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {getGamepads: () => pads}});
  Object.defineProperty(globalThis, 'document', {configurable: true, value: doc});
  t.after(() => {
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator;
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument); else delete globalThis.document;
  });
  const progress = {data:{settings:{controllerBindings:{...DEFAULT_BINDINGS}}}};
  const controls = new Controllers({ui,progress});
  controls.poll();
  const buttons = (indices, slot = 0) => {
    pads[slot].buttons.forEach((button, index) => { button.pressed = indices.includes(index); });
    controls.poll();
  };
  return {controls, pads, players, ui, doc, buttons, progress};
}

test('PS5 buttons dispatch the requested actions once per press', t => {
  const {controls: c, buttons} = fixture(t);
  for (const [button, action] of [[0,'space'],[1,'k'],[2,'j'],[3,'q'],[4,'y'],[5,'r'],[6,'tab'],[7,'l'],[12,'u']]) {
    buttons([button]);
    assert.equal(c.pressed(0, action), true, action);
    assert.equal(c.pressed(1, action), false, 'Other player must not receive the action');
    c.poll();
    assert.equal(c.pressed(0, action), false, 'Holding a button must not repeat its action');
    buttons([]);
  }
  buttons([12]);
  assert.equal(c.down(0, 'up'), false, 'Equipping Vini must not move the player forwards');
  buttons([7]);
  assert.equal(c.down(0, 'c'), false, 'Summoning must not descend');
});

test('Triangle changes form normally, descends as Goku/Hyper, and never consumes Circle special', t => {
  const {controls: c, buttons, players} = fixture(t);
  buttons([3]);
  assert.equal(c.pressed(0, 'q'), true);
  assert.equal(c.down(0, 'c'), false);
  players[0].superPower.active = true;
  c.poll();
  assert.equal(c.down(0, 'c'), true);
  assert.equal(c.down(0, 'q'), false);
  buttons([]);
  buttons([1,3]);
  assert.equal(c.pressed(0, 'k'), true);
  assert.equal(c.pressed(0, 'q'), false);
  assert.equal(c.down(0, 'c'), true);
  players[0].superPower.active = false;
  c.poll();
  assert.equal(c.pressed(0, 'q'), false, 'Changing character while holding Triangle must not switch form');
  assert.equal(c.down(0, 'c'), false);
  buttons([]);
  players[0].superPower.active = true;
  players[0].sportsEquipped = true;
  buttons([3]);
  assert.equal(c.pressed(0, 'q'), false);
  assert.equal(c.pressed(0, 't'), true, 'Triangle shoots for LeBron/Curry even with stored Super power');
  buttons([]);players[0].viniEquipped=true;buttons([3]);
  assert.equal(c.pressed(0, 't'), true, 'Triangle also shoots for Vini');
  assert.equal(c.down(0, 'c'), false);
});

test('R3 alone interacts exactly once, without transforming', t => {
  const {controls: c, buttons} = fixture(t);
  buttons([11]);
  assert.equal(c.pressed(0, 'super'), false);
  c.poll();
  buttons([]);
  assert.equal(c.pressed(0, 'e'), true);
  assert.equal(c.pressed(0, 'e'), false);
  assert.equal(c.pressed(0, 'super'), false);
  c.poll();
  assert.equal(c.pressed(0, 'e'), false);
});

for (const first of [null,10,11]) {
  test('L3 + R3 transforms once and cancels solo actions; first stick ' + first, t => {
    const {controls: c, buttons, players} = fixture(t);
    players[0].viniEquipped = true;
    if (first !== null) {
      buttons([first]);
      assert.equal(c.pressed(0, 'e'), false);
      assert.equal(c.pressed(0, 'i'), false);
    }
    buttons([10,11]);
    assert.equal(c.pressed(0, 'super'), true);
    assert.equal(c.pressed(0, 'e'), false);
    assert.equal(c.pressed(0, 'i'), false);
    c.poll();
    assert.equal(c.pressed(0, 'super'), false);
    buttons([11]);
    buttons([10,11]);
    assert.equal(c.pressed(0, 'super'), false, 'Both sticks must release before another transformation');
    buttons([10]);
    assert.equal(c.pressed(0, 'e'), false);
    buttons([]);
    assert.equal(c.pressed(0, 'i'), false);
    assert.equal(c.pressed(0, 'e'), false);
    buttons([10,11]);
    assert.equal(c.pressed(0, 'super'), true);
  });
}

test('Stick chords are independent and D-pad Down celebrates as Vini without moving', t => {
  const {controls: c, buttons, players} = fixture(t);
  players[0].viniEquipped = true;
  buttons([10],0);
  buttons([11],1);
  assert.equal(c.pressed(0,'super'),false);
  assert.equal(c.pressed(1,'super'),false);
  buttons([],1);
  assert.equal(c.pressed(1,'e'),true);
  assert.equal(c.pressed(0,'e'),false);
  buttons([],0);
  assert.equal(c.pressed(0,'i'),false);
  buttons([13],0);
  assert.equal(c.pressed(0,'i'),true);
  assert.equal(c.down(0,'down'),false);
  buttons([]);players[0].viniEquipped=false;buttons([13]);
  assert.equal(c.pressed(0,'i'),false);
});

test('Menu selection and Back do not leak jump or special ability into gameplay', t => {
  const {controls: c, buttons, pads, ui, doc} = fixture(t,'menu');
  ui.buttons = [0,1].map(index => ({
    offsetParent: {}, matches: () => false,
    focus() { doc.activeElement = this; },
    click() { ui.selected = index; ui.mode = 'game'; },
  }));
  ui.buttons[0].focus();
  pads[0].axes[1] = 1; c.poll();
  assert.equal(doc.activeElement,ui.buttons[1]);
  pads[0].axes[1] = 0; c.poll();
  buttons([0]);
  assert.equal(ui.selected,1);
  assert.equal(c.pressed(0,'space'),false);
  c.poll();
  assert.equal(c.down(0,'space'),false);
  buttons([]);
  buttons([9]);
  assert.equal(ui.mode,'pause');
  buttons([]);
  buttons([1]);
  assert.equal(ui.mode,'game');
  assert.equal(ui.backs,1);
  assert.equal(c.pressed(0,'k'),false);
  c.poll();
  assert.equal(c.pressed(0,'k'),false);
  buttons([]);
  buttons([1]);
  assert.equal(c.pressed(0,'k'),true);
});

test('Options toggles pause and pending stick clicks are cancelled across menus', t => {
  const {controls: c, buttons, ui} = fixture(t);
  buttons([11]);
  buttons([9,11]);
  assert.equal(ui.mode,'pause');
  buttons([11]);
  buttons([9,11]);
  assert.equal(ui.mode,'game');
  buttons([]);
  assert.equal(c.pressed(0,'e'),false);
  buttons([11]); buttons([]);
  assert.equal(c.pressed(0,'e'),true);
});

test('Disconnected controllers cannot leave stale chord or button state on reconnect', t => {
  const {controls: c, buttons, pads} = fixture(t);
  buttons([10,11]);
  assert.equal(c.pressed(0,'super'),true);
  const second = pads.pop();
  const first = pads.pop();
  c.poll();
  assert.equal(c.down(0,'super'),false);
  first.buttons.forEach(b => { b.pressed = false; });
  pads.push(first,second);
  c.poll();
  buttons([11]); buttons([]);
  assert.equal(c.pressed(0,'e'),true);
});


test('Custom buttons apply to gameplay while fixed menu controls still work', t => {
  const {controls:c,buttons,players,progress,ui}=fixture(t);
  progress.data.settings.controllerBindings=normalizeBindings({...DEFAULT_BINDINGS,space:'2',j:'0',super:'14',h:'none',e:'10',c:'15'});
  buttons([0]);assert.equal(c.pressed(0,'j'),true);assert.equal(c.pressed(0,'space'),false);
  buttons([]);buttons([2]);assert.equal(c.pressed(0,'space'),true);
  buttons([]);buttons([10]);assert.equal(c.pressed(0,'e'),true);
  buttons([]);buttons([14]);assert.equal(c.pressed(0,'super'),true);
  buttons([]);buttons([11]);buttons([]);assert.equal(c.pressed(0,'e'),false);
  players[0].superPower.active=true;
  buttons([3]);assert.equal(c.down(0,'c'),false);assert.equal(c.pressed(0,'q'),false);
  buttons([]);buttons([15]);assert.equal(c.down(0,'c'),true);
  buttons([]);ui.pause();c.poll();buttons([1]);assert.equal(ui.mode,'game');
});

test('Remapped solo stick actions still yield to the two-stick Super chord', t => {
  const {controls:c,buttons,players,progress}=fixture(t);
  players[0].viniEquipped=true;
  progress.data.settings.controllerBindings=normalizeBindings({...DEFAULT_BINDINGS,e:'10',i:'11'});
  buttons([10]);buttons([]);assert.equal(c.pressed(0,'e'),true);
  buttons([11]);buttons([]);assert.equal(c.pressed(0,'i'),true);
  buttons([10,11]);assert.equal(c.pressed(0,'super'),true);
  buttons([11]);assert.equal(c.pressed(0,'e'),false);
  buttons([]);assert.equal(c.pressed(0,'i'),false);
});

test('Bindings allow character-specific Triangle sharing but reject conflicting actions', () => {
  assert.deepEqual(bindingConflicts(DEFAULT_BINDINGS),[]);
  assert.ok(bindingConflicts({...DEFAULT_BINDINGS,j:'0'}).length);
  assert.ok(bindingConflicts({...DEFAULT_BINDINGS,k:'10'}).length, 'Continuous/action buttons cannot collide with the Super chord');
  assert.deepEqual(bindingConflicts({...DEFAULT_BINDINGS,i:'11',e:'10'}),[]);
  assert.deepEqual(normalizeBindings({space:'99',j:{},q:['3'],super:'9+10'}),DEFAULT_BINDINGS);
  assert.deepEqual(normalizeBindings({...DEFAULT_BINDINGS,j:'0'}),DEFAULT_BINDINGS);
  assert.equal(normalizeBindings({space:'14'}).space,'14');
  assert.equal(normalizeBindings({i:'none'}).i,'none');
  assert.ok(controllerHelp(DEFAULT_BINDINGS).includes('\n'));
});

test('Remaps survive save/reload and a fresh adventure; older and corrupt saves get safe defaults', () => {
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const p=new Progress(storage);
  p.completeOrigin();p.rescue('grandad');
  p.data.settings.controllerBindings={...DEFAULT_BINDINGS,space:'14',j:'0',h:'none'};
  p.save();
  const restored=new Progress(storage);
  assert.equal(restored.data.settings.controllerBindings.space,'14');
  assert.equal(restored.data.settings.controllerBindings.j,'0');
  assert.deepEqual(restored.data.rescued,['grandad']);
  restored.reset();
  assert.equal(new Progress(storage).data.settings.controllerBindings.space,'14');
  storage.setItem(SAVE_KEY,JSON.stringify({version:1,origin:true,settings:{controllerBindings:{space:'oops'}}}));
  assert.equal(new Progress(storage).data.origin,true);
  assert.deepEqual(new Progress(storage).data.settings.controllerBindings,DEFAULT_BINDINGS);
});


test('The earlier default Create shot migrates to Triangle without overwriting a deliberate remap', () => {
  const early={...DEFAULT_BINDINGS,t:'8'};
  const storage={getItem:()=>JSON.stringify({version:1,settings:{controllerBindings:early}})};
  assert.equal(new Progress(storage).data.settings.controllerBindings.t,'3');
  const custom={getItem:()=>JSON.stringify({version:1,settings:{controllerBindings:early,controllerBindingsCustomized:true}})};
  assert.equal(new Progress(custom).data.settings.controllerBindings.t,'8');
});


test('D-pad Left equips Squidward independently without moving; old custom D-pad mappings survive',t=>{
  const {controls:c,buttons}=fixture(t);
  buttons([14]);assert.equal(c.pressed(0,'h'),true);assert.equal(c.down(0,'left'),false);
  const old={...DEFAULT_BINDINGS,space:'14'};delete old.h;
  const migrated=normalizeBindings(old);assert.equal(migrated.space,'14');assert.equal(migrated.h,'none');
});
