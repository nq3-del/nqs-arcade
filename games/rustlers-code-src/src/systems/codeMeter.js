// The Code meter: one number, 0–100, that says how well the gang is living
// by the Code. EVERY change goes through changeCode() so the HUD flourish,
// NPC moods and shop prices all react from one place. Nobody lectures the
// player — the world just quietly responds (tone-and-content skill).

import { gameState } from '../core/gameState.js';
import { emit } from '../core/events.js';

export function changeCode(delta, reason) {
  const before = gameState.code;
  gameState.code = Math.max(0, Math.min(100, gameState.code + delta));
  if (gameState.code !== before) {
    emit('code:changed', { value: gameState.code, delta, reason });
  }
}

// The three reputation tiers (quests-and-dialogue skill).
export function codeTier() {
  if (gameState.code < 35) return 'low';   // Wanted Outlaw
  if (gameState.code < 70) return 'mid';   // Folk's Not Sure
  return 'high';                           // Folk Hero
}

export function tierName() {
  return { low: 'Wanted Outlaw', mid: "Folk's Not Sure", high: 'Folk Hero' }[codeTier()];
}

// Shops charge outlaws more and heroes less.
export function priceMultiplier() {
  return { low: 1.25, mid: 1, high: 0.9 }[codeTier()];
}

export function price(basePrice) {
  return Math.round(basePrice * priceMultiplier());
}
