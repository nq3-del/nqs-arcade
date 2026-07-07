// The headless smoke test: proves the game actually BOOTS in a real
// browser. `npm run build` passing means nothing — a missing destructure
// once shipped a black screen while the build stayed green (see the
// smoke-test and failure-museum skills). This script builds the game,
// serves the built copy, drives headless Chrome at it, and fails on ANY
// page error or console error. Run it before every commit that touches src/.
//
// Usage:
//   npm run smoke                        # build + boot + zero-error check
//   node scripts/smoke-test.mjs --save stuck.json   # replay a player's save
//   node scripts/smoke-test.mjs --shot boot.png     # screenshot after boot
//   node scripts/smoke-test.mjs --no-build          # test dist/ as it stands
//
// --save takes a JSON file holding the contents of the player's
// 'rustlers-code-save' localStorage entry. It is injected BEFORE the game
// boots, so every resume path (chapter restore, quests.resume, night
// restore) runs against that exact save — how the stuck-lock and stuck-
// hop-down bugs were verified fixed.

import { spawn, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BOOT_WAIT_MS = 7000; // long enough for the world to build + frames to run

// ---------- Read the command line ----------
const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}
const savePath = argValue('--save');
const shotPath = argValue('--shot');
const skipBuild = args.includes('--no-build');

// ---------- 1. Build the game (the cheap half of the check) ----------
if (!skipBuild) {
  console.log('Building the game...');
  execSync('npm run build', { stdio: 'inherit' });
}

// ---------- 2. Serve the built copy ----------
// `vite preview` serves dist/ exactly the way itch.io would. It picks its
// own port if the usual one is busy, so read the URL from its output.
console.log('Starting the preview server...');
const server = spawn('npx', ['vite', 'preview'], { stdio: ['ignore', 'pipe', 'pipe'] });

const url = await new Promise((resolve, reject) => {
  let output = '';
  const timer = setTimeout(() => reject(new Error('Preview server never printed its address. Output so far:\n' + output)), 15000);
  server.stdout.on('data', (chunk) => {
    output += chunk.toString();
    const match = output.match(/Local:\s+(http:\/\/[^\s]+)/);
    if (match) {
      clearTimeout(timer);
      resolve(match[1]);
    }
  });
  server.on('exit', () => reject(new Error('Preview server quit early:\n' + output)));
});
console.log('Serving at ' + url);

// Whatever happens below, the server must not outlive the test.
function shutdown(code) {
  server.kill();
  process.exit(code);
}

// ---------- 3. Drive headless Chrome at it ----------
let browser;
const problems = []; // every page error and console error lands here

try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // A thrown error anywhere in the game = failure. Same for console.error.
  page.on('pageerror', (err) => problems.push('PAGE ERROR: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // The browser asks for a favicon we never made; that 404 is the one
    // error that isn't a bug. Any OTHER missing file still fails the test.
    if ((msg.location().url ?? '').endsWith('/favicon.ico')) return;
    problems.push('CONSOLE ERROR: ' + msg.text());
  });

  // Replaying a save: plant it in localStorage before any game code runs.
  if (savePath) {
    const saveJson = JSON.stringify(JSON.parse(readFileSync(savePath, 'utf8')));
    console.log('Injecting the save from ' + savePath);
    await page.evaluateOnNewDocument((blob) => {
      localStorage.setItem('rustlers-code-save', blob);
    }, saveJson);
  }

  await page.goto(url, { waitUntil: 'load' });
  // Let the world build and the frame loop run for a while — boot crashes
  // and first-frames crashes both surface inside this window.
  await new Promise((r) => setTimeout(r, BOOT_WAIT_MS));

  // The title screen is the proof of life: its <h1> must have rendered.
  const title = await page.evaluate(() => document.querySelector('#menu h1')?.textContent ?? '');
  if (!title.includes("The Rustler's Code")) {
    problems.push('TITLE MISSING: expected the title screen heading, got "' + title + '"');
  }

  // With a save planted, the title must offer to continue it.
  if (savePath) {
    const buttonText = await page.evaluate(() => document.querySelector('#menu button')?.textContent ?? '');
    if (!buttonText.toLowerCase().includes('continue')) {
      problems.push('SAVE IGNORED: title button says "' + buttonText + '" instead of offering to continue');
    }
  }

  if (shotPath) {
    await page.screenshot({ path: shotPath });
    console.log('Screenshot saved to ' + shotPath);
  }

  await browser.close();
} catch (err) {
  problems.push('SMOKE TEST CRASHED: ' + err.message);
  if (browser) await browser.close().catch(() => {});
}

// ---------- 4. The verdict ----------
if (problems.length > 0) {
  console.error('\nSMOKE TEST FAILED — the game is NOT safe to commit:');
  for (const p of problems) console.error('  • ' + p);
  shutdown(1);
}
console.log('\nSmoke test passed: game boots, title screen rendered, zero errors.');
shutdown(0);
