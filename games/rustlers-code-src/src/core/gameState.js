// The single source of truth for player progress. Every system reads and
// writes THIS object — nobody keeps private copies. Saving = writing this
// object to the browser's localStorage; loading = reading it back.

import { emit } from './events.js';

const SAVE_KEY = 'rustlers-code-save';
const SAVE_VERSION = 1;

export const gameState = {
  version: SAVE_VERSION,
  started: false,        // has the player begun a game (vs sitting at the menu)
  chapter: 1,
  activeQuest: null,     // id of the quest currently underway
  questStep: 0,          // which step of that quest we're on
  completedQuests: [],
  code: 50,              // the Code meter, 0–100, starts undecided
  money: 0,
  inventory: [],         // item ids, e.g. "deeds", "apple"
  flags: {},             // one-off story switches, e.g. { tookVanesGold: true }
  posters: [],           // wanted-poster collectibles found so far
  hasSteadyHand: false,  // Doc's watch — unlocks slow-motion aiming
  settings: { muted: false },
  colePosition: null,    // [x, z] so loading puts you back where you were
};

export function hasItem(id) {
  return gameState.inventory.includes(id);
}

export function giveItem(id) {
  if (!hasItem(id)) {
    gameState.inventory.push(id);
    emit('item:' + id + ':collected', { id });
  }
}

export function takeItem(id) {
  const i = gameState.inventory.indexOf(id);
  if (i !== -1) gameState.inventory.splice(i, 1);
}

export function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    emit('game:saved');
  } catch (err) {
    console.warn('Could not save the game:', err);
  }
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

// Loads a saved game into gameState. If the save is damaged or from an
// incompatible version, fail SAFE: keep a backup copy, start fresh, and
// let the caller tell the player politely. Never crash on a bad save.
export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) throw new Error('save version mismatch');
    Object.assign(gameState, data);
    emit('game:loaded');
    return true;
  } catch (err) {
    console.warn('Save file could not be read — keeping a backup and starting fresh.', err);
    localStorage.setItem(SAVE_KEY + '-backup', raw);
    localStorage.removeItem(SAVE_KEY);
    return false;
  }
}
