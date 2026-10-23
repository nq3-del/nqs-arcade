// One source for the visible rims and gameplay. Heights are world coordinates.
export const STADIUM_HOOPS = [
  { x: -23, y: 3.9, z: 6, radius: 0.82 },
  { x: -14, y: 3.9, z: 6, radius: 0.82 },
];
export const SHOT_RANGE = 7.5;

export function descendsThroughRim(before, after, hoop) {
  if (!before || before.y <= hoop.y || after.y > hoop.y || after.y >= before.y) return false;
  const t = (before.y - hoop.y) / (before.y - after.y);
  const x = before.x + (after.x - before.x) * t;
  const z = before.z + (after.z - before.z) * t;
  // Leave space for the hero's body inside the actual metal ring.
  return Math.hypot(x - hoop.x, z - hoop.z) <= hoop.radius - 0.28;
}

export function basketballArc(start, hoop) {
  const duration = Math.max(1, Math.hypot(start.x - hoop.x, start.z - hoop.z) * 0.065 + 0.8);
  const gravity = 14;
  return { start, hoop, duration, gravity,
    vx: (hoop.x - start.x) / duration,
    vz: (hoop.z - start.z) / duration,
    vy: (hoop.y - start.y) / duration + gravity * duration / 2 };
}

export function basketballPosition(arc, t) {
  const { start, hoop, duration, gravity, vx, vy, vz } = arc;
  if (t <= duration) return { x: start.x + vx * t,
    y: start.y + vy * t - gravity * t * t / 2, z: start.z + vz * t };
  // The net slows horizontal travel as the ball drops through it.
  const after = t - duration, dropSpeed = vy - gravity * duration, floor = 0.63;
  const groundTime = (dropSpeed + Math.sqrt(dropSpeed * dropSpeed + 2 * gravity * (hoop.y - floor))) / gravity;
  let y = hoop.y + dropSpeed * after - gravity * after * after / 2;
  if (after > groundTime) {
    const bounce = after - groundTime, rebound = (gravity * groundTime - dropSpeed) * 0.42;
    y = Math.max(floor, floor + rebound * bounce - gravity * bounce * bounce / 2);
  }
  return { x: hoop.x + vx * after * 0.12, y, z: hoop.z + vz * after * 0.12 };
}
