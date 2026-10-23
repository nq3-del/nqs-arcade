import { CONTROLLER_ACTIONS, DEFAULT_BINDINGS, bindingButtons, controllerHelp } from './ControllerBindings.js';
export const CONTROLLER_HELP = controllerHelp(DEFAULT_BINDINGS);
// The first connected controller is P1; the second is P2.
export class Controllers {
  constructor(services) {
    this.services = services;
    this.previous = new Map();
    this.gestures = new Map();
    this.slots = [{}, {}];
    this.edges = [{}, {}];
    this.connectionOrder = new Map();
    this.connectionSequence = 0;
  }
  poll() {
    const ui = this.services.ui;
    if (this.services.phoneControllers?.dialog?.open) { this.clear(); return; }
    const inGame = ui.mode === 'game';
    const cinematic = inGame && !!ui.scene?.cinematic;
    const navigating = !inGame || cinematic;
    const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
    const phones = this.services.phoneControllers?.getPads() || [];
    pads.push(...phones);
    for (const index of this.connectionOrder.keys()) {
      if (!pads.some(p => p.index === index)) {
        this.connectionOrder.delete(index);
        this.previous.delete(index);
        this.gestures.delete(index);
      }
    }
    for (const pad of pads) {
      if (!this.connectionOrder.has(pad.index))
        this.connectionOrder.set(pad.index, this.connectionSequence++);
    }
    pads.sort((a, b) => this.connectionOrder.get(a.index) - this.connectionOrder.get(b.index));
    this.connected = pads.length;
    this.slots = [{}, {}];
    this.edges = [{}, {}];
    const assigned = [null, null];
    phones.forEach(pad => { assigned[pad.slot] = pad; });
    for (const pad of pads.filter(p => !p.remote)) {
      const slot = assigned.indexOf(null);
      if (slot >= 0) assigned[slot] = pad;
    }
    assigned.forEach((pad, slot) => {
      if (!pad) return;
      const bindings = pad.remote ? DEFAULT_BINDINGS : this.services.progress?.data.settings.controllerBindings || DEFAULT_BINDINGS;
      const prior = this.previous.get(pad.index) || {};
      const gesture = this.gestures.get(pad.index) || { suppressed: new Set(), mode: ui.mode };
      gesture.buttons = pad.buttons.map(b => !!b?.pressed);
      for (const button of gesture.suppressed) {
        if (!gesture.buttons[button]) gesture.suppressed.delete(button);
      }
      if (gesture.mode !== ui.mode && prior.buttons?.some(Boolean)) gesture.cancelled = true;
      gesture.mode = ui.mode;
      const effective = gesture.buttons.map((value, button) => value && !gesture.suppressed.has(button));
      const down = button => !!effective[button];
      const wasDown = button => !!prior.buttons?.[button];
      const held = {}, edges = {};
      const player = inGame ? ui.scene?.players?.[slot] : null;
      const context = player?.viniEquipped ? 'vini' : player?.sportsEquipped ? 'basketball' : player?.superPower?.active ? 'goku' : 'normal';
      for (const action of CONTROLLER_ACTIONS) {
        const buttons = bindingButtons(bindings[action.key]);
        const active = inGame && (!action.contexts || action.contexts.includes(context));
        held[action.key] = active && buttons.length > 0 && buttons.every(down);
        edges[action.key] = held[action.key] && !buttons.every(wasDown);
      }
      // Left stick moves the hero. All D-pad buttons can be remapped safely.
      held.left = (pad.axes[0] || 0) < -0.2 || (navigating && (down(14) || (pad.axes[2] || 0) < -0.2));
      held.right = (pad.axes[0] || 0) > 0.2 || (navigating && (down(15) || (pad.axes[2] || 0) > 0.2));
      held.up = (pad.axes[1] || 0) < -0.2 || (navigating && (down(12) || (pad.axes[3] || 0) < -0.2));
      held.down = (pad.axes[1] || 0) > 0.2 || (navigating && (down(13) || (pad.axes[3] || 0) > 0.2));
      for (const name of ['left','right','up','down']) edges[name] = held[name] && !prior[name];

      const chord = bindingButtons(bindings.super);
      if (chord.length === 2) {
        edges.super = held.super && !gesture.chord && !gesture.cancelled;
        if (chord.every(down)) gesture.chord = true;
        for (const name of ['e','i']) {
          const buttons = bindingButtons(bindings[name]);
          if (buttons.length !== 1 || !chord.includes(buttons[0])) continue;
          const action = CONTROLLER_ACTIONS.find(a => a.key === name);
          const active = inGame && (!action.contexts || action.contexts.includes(context));
          held[name] = false;
          edges[name] = active && wasDown(buttons[0]) && !down(buttons[0]) && !gesture.chord && !gesture.cancelled;
        }
        if (chord.every(button => !gesture.buttons[button])) {
          gesture.chord = false;
          gesture.cancelled = false;
        }
      } else {
        gesture.chord = false;
        gesture.cancelled = false;
      }
      // Menu controls stay familiar even after remapping gameplay actions.
      if (navigating) {
        held.space = down(0);
        edges.space = down(0) && !wasDown(0);
        edges.back = down(1) && !wasDown(1);
        edges.pause = down(9) && !wasDown(9);
      }
      this.previous.set(pad.index, { ...held, buttons: effective });
      this.gestures.set(pad.index, gesture);
      this.slots[slot] = held;
      this.edges[slot] = edges;
    });
    const pressed = name => this.edges.some(e => e[name]);
    if (pressed('pause')) {
      if (ui.mode === 'game') ui.pause();
      else if (ui.stack.length) ui.pop();
      this.clear();
      return;
    }
    if (navigating) {
      ui.controllerNavigation?.(this.connected > 0);
      const buttons = ui.controllerTargets?.() || Array.from(
        ui.root.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)'),
      ).filter(el => el.offsetParent !== null);
      if (this.editing && !buttons.includes(this.editing)) this.stopEditing();
      if (pressed('back')) {
        if (this.editing) this.stopEditing();
        else if (cinematic) ui.pause();
        else ui.back();
        this.clear(); return;
      }
      const direction = ['down','up','right','left'].find(name => this.slots.some(slot => slot[name]));
      const now = performance.now();
      let move = null;
      if (!direction) this.navigationDirection = null;
      else if (direction !== this.navigationDirection) {
        move = direction; this.navigationDirection = direction; this.nextNavigation = now + 400;
      } else if (now >= this.nextNavigation) { move = direction; this.nextNavigation = now + 150; }
      const focused = document.activeElement;
      const adjustable = focused?.matches('select,input[type="range"]');
      const adjust = adjustable && move && (this.editing === focused || ['left','right'].includes(move));
      if (adjust) {
        const sign = ['right','down'].includes(move) ? 1 : -1;
        if (focused.tagName === 'SELECT') {
          const choices = Array.from(focused.options).filter(option => !option.disabled);
          const index = choices.indexOf(focused.options[focused.selectedIndex]);
          const option = choices[(index + sign + choices.length) % choices.length];
          if (option) focused.value = option.value;
        } else focused.value = Math.max(Number(focused.min), Math.min(Number(focused.max), Number(focused.value) + sign * Number(focused.step || 1)));
        focused.dispatchEvent(new Event('input', { bubbles: true }));
        focused.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (move && buttons.length) {
        const at = buttons.indexOf(focused), sign = ['up','left'].includes(move) ? -1 : 1;
        const next = buttons[at < 0 ? 0 : (at + sign + buttons.length) % buttons.length];
        this.focus(next);
      }
      if (pressed('space')) {
        const target = buttons.includes(document.activeElement) ? document.activeElement : buttons[0];
        if (target?.matches('select,input[type="range"]')) {
          if (this.editing === target) this.stopEditing();
          else { this.stopEditing(); this.editing = target; target.classList?.add('controller-editing'); this.focus(target); }
        } else { this.stopEditing(); target?.click(); }
        this.clear();
      }
    } else ui.controllerNavigation?.(false);
  }
  focus(target) {
    document.querySelectorAll?.('.controller-focus').forEach(el => el.classList.remove('controller-focus'));
    target?.classList?.add('controller-focus');
    target?.focus({preventScroll:true});
    target?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  }
  stopEditing() {
    this.editing?.classList?.remove('controller-editing');
    this.editing = null;
  }
  down(slot, name) {
    return !!this.slots[slot]?.[name];
  }
  pressed(slot, name) {
    const value = !!this.edges[slot]?.[name];
    if (this.edges[slot]) this.edges[slot][name] = false;
    return value;
  }
  clear() {
    this.edges = [{}, {}];
    this.slots = [{}, {}];
    // A menu confirmation/back button must be released before it acts in play.
    for (const gesture of this.gestures.values()) {
      gesture.suppressed = new Set(gesture.buttons.flatMap((down, index) => down ? [index] : []));
      gesture.cancelled = gesture.buttons.some(Boolean);
    }
  }
}
