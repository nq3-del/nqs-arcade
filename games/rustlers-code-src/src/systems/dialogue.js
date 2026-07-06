// Plays back conversations written as JSON under src/data/dialogue/.
// Story lives in data, never in code (quests-and-dialogue skill): this file
// only knows how to walk nodes, show choices, apply their effects, and
// announce when a conversation finishes.

import { gameState, hasItem, giveItem, takeItem } from '../core/gameState.js';
import { emit } from '../core/events.js';
import { changeCode, price } from './codeMeter.js';

// Vite gathers every dialogue file at build time — no server needed.
const files = import.meta.glob('../data/dialogue/*.json', { eager: true });
const trees = {};
for (const path in files) {
  const tree = files[path].default;
  trees[tree.id] = tree;
}

// Conditions on choices: "code>=70", "code<35", "hasItem:deeds",
// "!hasItem:deeds", "flag:tookGold", "!flag:tookGold", "money>=20" — and
// several joined with " && " (all must hold). Choices whose condition
// fails are HIDDEN (never shown greyed out — per the skill).
function conditionMet(condition) {
  if (!condition) return true;
  if (condition.includes(' && ')) {
    return condition.split(' && ').every((part) => conditionMet(part));
  }
  if (condition.startsWith('!hasItem:')) return !hasItem(condition.slice(9));
  if (condition.startsWith('!flag:')) return !gameState.flags[condition.slice(6)];
  if (condition.startsWith('flag:')) return !!gameState.flags[condition.slice(5)];
  if (condition.startsWith('hasItem:')) return hasItem(condition.slice(8));
  const numeric = condition.match(/^(code|money)(>=|<=|<|>)(\d+)$/);
  if (numeric) {
    const value = gameState[numeric[1]];
    const n = Number(numeric[3]);
    if (numeric[2] === '>=') return value >= n;
    if (numeric[2] === '<=') return value <= n;
    if (numeric[2] === '>') return value > n;
    return value < n;
  }
  console.warn('Dialogue condition not understood: "' + condition + '"');
  return false;
}

// Effects on choices: { codeDelta, money, giveItem, setFlag, buy }.
// "buy" checks the (reputation-adjusted) price and takes the money.
function applyEffects(choice, items) {
  if (choice.codeDelta) changeCode(choice.codeDelta, 'dialogue choice');
  const fx = choice.effects;
  if (!fx) return;
  if (fx.buy) {
    const item = items[fx.buy];
    const cost = price(item.basePrice);
    if (gameState.money >= cost) {
      gameState.money -= cost;
      giveItem(fx.buy);
      emit('money:changed');
    }
    return;
  }
  if (fx.money) {
    gameState.money += fx.money;
    emit('money:changed');
  }
  if (fx.giveItem) giveItem(fx.giveItem);
  if (fx.takeItem) takeItem(fx.takeItem);
  if (fx.setFlag) gameState.flags[fx.setFlag] = true;
}

export function createDialogue(dialogueBox, items) {
  const system = {
    isOpen: false,
    tree: null,
    node: null,

    start(treeId) {
      const tree = trees[treeId];
      if (!tree) {
        console.warn('No dialogue tree with id "' + treeId + '" is loaded.');
        return;
      }
      this.tree = tree;
      this.isOpen = true;
      document.exitPointerLock?.();
      this.goTo(tree.nodes[0].id);
      emit('dialogue:opened', { id: treeId });
    },

    goTo(nodeId) {
      if (nodeId === 'end' || !nodeId) return this.close();
      this.node = this.tree.nodes.find((n) => n.id === nodeId);
      if (!this.node) {
        console.warn('Dialogue "' + this.tree.id + '" points at missing node "' + nodeId + '"');
        return this.close();
      }

      emit('dialogue:line');
      if (this.node.choices) {
        const visible = this.node.choices.filter((c) => conditionMet(c.condition));
        dialogueBox.showChoices(this.node.speaker, this.node.text, visible, items, (choice) => {
          applyEffects(choice, items);
          this.goTo(choice.next);
        });
      } else {
        dialogueBox.showLine(this.node.speaker, this.node.text, () => {
          this.goTo(this.node.next);
        });
      }
    },

    close() {
      this.isOpen = false;
      dialogueBox.hide();
      emit('dialogue:' + this.tree.id + ':completed', { id: this.tree.id });
      emit('dialogue:closed');
    },
  };
  return system;
}
