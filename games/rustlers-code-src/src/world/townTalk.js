// The town keeps up with the story: after each chapter, the regulars get a
// fresh conversation about what just happened. This file only points NPCs
// at the right dialogue tree for the current chapter — the words live in
// src/data/dialogue/ like all story content.

import { on } from '../core/events.js';
import { gameState } from '../core/gameState.js';

// npc id -> [ [minChapter, treeId], ... ] — the highest match wins.
const CHATTER = {
  doc: [[2, 'chatter_doc_1'], [3, 'chatter_doc_2'], [5, 'chatter_doc_4']],
  newt: [[2, 'chatter_newt_1'], [5, 'chatter_newt_4']],
  mabel: [[3, 'chatter_mabel_2']],
  preacher: [[3, 'chatter_preacher_2']],
  bly: [[4, 'chatter_bly_3'], [5, 'chatter_bly_4']],
};

const OWN_TREES = new Set(
  Object.values(CHATTER).flat().map(([, tree]) => tree)
);

export function setupTownTalk(npcs) {
  function apply() {
    for (const npc of npcs) {
      const options = CHATTER[npc.def.id];
      if (!options) continue;
      let pick = null;
      for (const [minChapter, tree] of options) {
        if (gameState.chapter >= minChapter) pick = tree;
      }
      if (!pick) continue;
      // Never stomp a chapter briefing — only replace default chatter or
      // our own earlier chatter.
      if (npc.dialogueOverride === null || OWN_TREES.has(npc.dialogueOverride)) {
        npc.dialogueOverride = pick;
      }
    }
  }

  apply();
  on('quest:completed', apply);
  // Re-apply when a briefing finishes and hands the NPC back.
  on('dialogue:closed', apply);
}
