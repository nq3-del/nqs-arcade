import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fs.realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const output = path.resolve(root, 'public');
if (path.dirname(output) !== root || path.basename(output) !== 'public') throw new Error('Unexpected build output');
// public/ is generated solely by this script; secrets and backend source never
// enter the static artifact. Existing game source remains tracked in Git.
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
for (const name of ['index.html', '404.html', '.nojekyll', 'assets']) {
  fs.cpSync(path.join(root, name), path.join(output, name), { recursive: true });
}
fs.mkdirSync(path.join(output, 'games'));
for (const game of fs.readdirSync(path.join(root, 'games'), { withFileTypes: true })) {
  if (!game.isDirectory() || /-(src|godot)$/.test(game.name)) continue;
  fs.cpSync(path.join(root, 'games', game.name), path.join(output, 'games', game.name), { recursive: true });
}
console.log('Built static Arcade and playable game folders in public/.');
