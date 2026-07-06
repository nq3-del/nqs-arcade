// Everything Cole can walk up to and use with E — NPCs to talk to, items to
// pick up — plus invisible trigger zones that quests listen for ("reached
// the bank", "made it to the hideout").

import { emit } from '../core/events.js';

export function createInteractions(hud) {
  const interactables = []; // { id, object, radius, prompt(), onInteract() }
  const zones = [];         // { id, minX, maxX, minZ, maxZ, inside }

  return {
    // True while a "press E" offer is on screen (main.js checks this so
    // the use button can double as jump when nothing's nearby).
    promptActive: false,

    // prompt can be a string or a function returning one (so it can change
    // with quest state). onInteract runs when E is pressed in range.
    register(id, object3D, radius, prompt, onInteract) {
      const entry = { id, object: object3D, radius, prompt, onInteract, enabled: true };
      interactables.push(entry);
      return entry;
    },

    setEnabled(id, enabled) {
      const e = interactables.find((x) => x.id === id);
      if (e) e.enabled = enabled;
    },

    remove(id) {
      const i = interactables.findIndex((x) => x.id === id);
      if (i !== -1) interactables.splice(i, 1);
    },

    // A rectangle on the map that announces when Cole steps into it.
    registerZone(id, centerX, centerZ, width, depth) {
      zones.push({
        id,
        minX: centerX - width / 2, maxX: centerX + width / 2,
        minZ: centerZ - depth / 2, maxZ: centerZ + depth / 2,
        inside: false,
      });
    },

    update(dt, input, cole, dialogueOpen) {
      const pos = cole.group.position;

      // Zones fire an event once each time Cole walks in.
      for (const z of zones) {
        const inside = pos.x >= z.minX && pos.x <= z.maxX && pos.z >= z.minZ && pos.z <= z.maxZ;
        if (inside && !z.inside) emit('zone:' + z.id + ':entered', { id: z.id });
        z.inside = inside;
      }

      // Find the nearest usable thing in range and offer it.
      if (dialogueOpen) {
        hud.showPrompt('');
        return;
      }
      let best = null;
      let bestText = '';
      let bestDist = Infinity;
      for (const e of interactables) {
        if (!e.enabled || !e.object.visible) continue;
        const d = pos.distanceTo(e.object.position);
        if (d < e.radius && d < bestDist) {
          // A prompt function returning '' means "nothing to offer right
          // now" (e.g. Biscuit when Cole has no apple) — skip it.
          const text = typeof e.prompt === 'function' ? e.prompt() : e.prompt;
          if (!text) continue;
          best = e;
          bestText = text;
          bestDist = d;
        }
      }

      this.promptActive = !!best;
      if (best) {
        hud.showPrompt(bestText);
        if (input.wasPressed('KeyE')) best.onInteract();
      } else {
        hud.showPrompt('');
      }
    },
  };
}
