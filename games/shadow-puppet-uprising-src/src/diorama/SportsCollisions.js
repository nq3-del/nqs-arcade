import { STADIUM_HOOPS } from '../data/basketball.js';

export const FOOTBALL_GOALS = [-20, 22].map(x => ({ x, z: -1, back: x + Math.sign(x) * 1.3, height: 3.3 }));

export function stadiumColliders() {
  const colliders = [];
  const box = (x, y, z, w, h, d) => colliders.push({ x, y, z, w, h, d });
  for (const h of STADIUM_HOOPS) {
    box(h.x, 2.2, h.z - 1.15, 0.24, 4.4, 0.24);
    box(h.x, h.y + 0.5, h.z - 1.05, 2.4, 1.5, 0.16);
    box(h.x, h.y, h.z - 0.88, 0.2, 0.09, 0.35);
    colliders.push({ ...h, type: 'rim' });
  }
  for (const g of FOOTBALL_GOALS) {
    for (const side of [-1, 1]) {
      box(g.x, g.height / 2, g.z + side * 3, 0.2, g.height, 0.2);
      box((g.x + g.back) / 2, g.height / 2, g.z + side * 3, 1.3, g.height, 0.025);
    }
    box(g.x, g.height, g.z, 0.2, 0.2, 6);
    box(g.back, g.height / 2, g.z, 0.025, g.height, 6);
    box((g.x + g.back) / 2, g.height, g.z, 1.3, 0.025, 6);
  }
  return colliders;
}

export function sportsBlocked(colliders, x, y, z, height = 1.9, radius = 0.28) {
  const bottom = y + 0.28, top = bottom + height;
  return colliders.some(c => {
    if (c.type === 'rim') {
      if (bottom >= c.y + 0.045 || top <= c.y - 0.045) return false;
      return Math.abs(Math.hypot(x - c.x, z - c.z) - c.radius) < radius + 0.045;
    }
    if (bottom >= c.y + c.h / 2 || top <= c.y - c.h / 2) return false;
    const dx = Math.max(0, Math.abs(x - c.x) - c.w / 2);
    const dz = Math.max(0, Math.abs(z - c.z) - c.d / 2);
    return dx * dx + dz * dz < radius * radius;
  });
}
