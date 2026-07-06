// The registry of everything the Steady Hand can point at. This is where
// hard rule #1 lives: every target declares a kind, and the aiming system
// will only ever lock onto 'shootable' or 'lassoable' things. Anything
// registered as 'living' greys the reticle out — enforced in code, always.
// Raycasts run against THIS curated list, never the whole scene (perf rule).

const targets = [];

// options: {
//   tag: unique id, used in quest triggers like "shot:bank_latch"
//   name: short label shown under the reticle
//   kind: 'shootable' | 'lassoable' | 'living'
//   onShot(point) / onLasso(): what happens (optional)
//   refusalLine: custom Cole line for living things (optional)
// }
export function registerTarget(object3D, options) {
  const target = { object: object3D, active: true, ...options };
  targets.push(target);
  return target;
}

export function removeTarget(tag) {
  const i = targets.findIndex((t) => t.tag === tag);
  if (i !== -1) targets.splice(i, 1);
}

export function setTargetActive(tag, active) {
  const t = targets.find((x) => x.tag === tag);
  if (t) t.active = active;
}

// The meshes the aim raycast may hit this frame.
export function getActiveTargetObjects(out) {
  out.length = 0;
  for (const t of targets) {
    if (t.active && t.object.visible) out.push(t.object);
  }
  return out;
}

// A raycast hits some child mesh; walk up the parents until we find which
// registered target it belongs to.
export function findTargetFor(object3D) {
  let node = object3D;
  while (node) {
    const t = targets.find((x) => x.active && x.object === node);
    if (t) return t;
    node = node.parent;
  }
  return null;
}
