// The game's message board. Systems talk by posting events here instead of
// importing each other directly ("quest:completed", "code:changed"...), which
// keeps every system pluggable. See code-style skill.

const listeners = new Map(); // event name -> Set of functions

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
}

export function off(event, fn) {
  listeners.get(event)?.delete(fn);
}

export function emit(event, data) {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of [...set]) fn(data);
}
