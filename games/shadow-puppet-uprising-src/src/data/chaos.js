// The same star catalogue drives spawning, the map and the post-story unlock.
export const STAGE_STARS = Array.from({ length: 7 }, (_, level) =>
  level ? Array.from({ length: 24 }, (_, i) => [
    -23 + i * 1.85, 7 - i * 0.65 + Math.sin(i * 0.8) * 1.5,
  ]) : [[-8, 5], [-6, 4.8], [-3, 4], [-3, 2], [-1, 0.4], [1, -0.6],
    [3, -1.8], [4.8, -3], [7, -4.5], [8.7, -6], [-5, -4], [-2, -6], [5, 5], [8, 4]],
);
export const TOTAL_STARS = STAGE_STARS.reduce((total, stars) => total + stars.length, 0);
export const CHAOS_EMERALDS = [
  { id: 'green', color: '#38e883', name: 'Green', title: 'The hidden glade', rule: 'walk', hint: 'Walk into each glowing seal.' },
  { id: 'purple', color: '#b572ff', name: 'Purple', title: 'The second-form secret', rule: 'B', hint: 'Press Q to become Form B, then enter each seal.' },
  { id: 'silver', color: '#e3eaf1', name: 'Silver', title: 'The moonlit leaps', rule: 'jump', hint: 'Jump with Space / A inside each seal.' },
  { id: 'blue', color: '#4176ff', name: 'Blue', title: 'The lightning dash', rule: 'dash', hint: 'Use Form A and dash with K / B through each seal.' },
  { id: 'cyan', color: '#36e5ee', name: 'Cyan', title: 'The first-form trail', rule: 'A', hint: 'Press Q to become Form A, then enter each seal.' },
  { id: 'yellow', color: '#ffe057', name: 'Yellow', title: 'The power-pop trial', rule: 'power', hint: 'Use Form B and power pop with K / B beside each seal.' },
  { id: 'red', color: '#ff546d', name: 'Red', title: 'The final strike', rule: 'basic', hint: 'Attack with J / X beside each seal.' },
].map((emerald, level) => ({ ...emerald, level,
  points: (level ? [2, 9, 17, 23] : [0, 3, 6, 9]).map(i => STAGE_STARS[level][i]),
}));

export function stageStarCount(collected, level) {
  return STAGE_STARS[level].filter((_, id) => collected[`d${level}:${id}`] === true).length;
}
