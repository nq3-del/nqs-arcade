export const MAYHEM_ARENA = {
  id: 7, name: 'Shadow Mayhem', chapter: 'ENDLESS FUN', start: [0, 0],
  bounds: [44, 30], regions: [], sky: '#33354e', earth: '#383249',
  grass: '#686478', accent: '#d4b6ed', portal: [0, 0],
};

export function buildMayhemArena(view) {
  view.layout = { bounds: MAYHEM_ARENA.bounds };
  view.box(0, -1, 0, 88, 2.4, 60, '#383249', view.root, 0.4);
  view.box(0, 0.18, 0, 87.5, 0.12, 59.5, '#686478', view.root, 0.03);
  // A clear floor gives every puppet room to roam and keeps attacks visible.
  for (let x = -40; x <= 40; x += 8)
    view.box(x, 0.247, 0, 0.045, 0.01, 58, '#8d829e', view.root, 0);
  for (let z = -24; z <= 24; z += 8)
    view.box(0, 0.248, z, 86, 0.01, 0.045, '#8d829e', view.root, 0);
  view.ring(0, 0.26, 0, 5, '#d7bedb');
  for (const x of [-42, 42]) for (const z of [-28, -14, 0, 14, 28]) {
    view.cylinder(x, 1.5, z, 0.7, 1, 3, '#443b55');
    view.sphere(x, 3.2, z, 0.45, 0.6, 0.45, '#c69ce4');
  }
  for (const z of [-29, 29]) view.box(0, 0.4, z, 85, 0.3, 0.2, '#c69ce4');
  for (const x of [-43, 43]) view.box(x, 0.4, 0, 0.2, 0.3, 58, '#c69ce4');
  view.bake(view.root, []);
}
