// Hand-rolled collision (no physics engine, per project rules): characters
// are circles seen from above, solid things are rectangles. If a circle
// overlaps a rectangle, push it out — which makes characters slide along
// walls naturally.

// position is a Vector3 (only x and z are used); colliders come from the
// world builders as { minX, maxX, minZ, maxZ }.
export function resolveCircle(position, radius, colliders) {
  for (const box of colliders) {
    const nearestX = Math.max(box.minX, Math.min(position.x, box.maxX));
    const nearestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ));
    const dx = position.x - nearestX;
    const dz = position.z - nearestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 0.000001) {
        const dist = Math.sqrt(distSq);
        const push = (radius - dist) / dist;
        position.x += dx * push;
        position.z += dz * push;
      } else {
        // Dead-centre inside a box (shouldn't happen) — nudge out one side.
        position.x = box.maxX + radius;
      }
    }
  }
}
