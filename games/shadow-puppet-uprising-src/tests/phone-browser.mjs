import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}) });
const base = process.env.GAME_URL || 'http://127.0.0.1:5173';
const host = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
host.on('pageerror', error => errors.push(error.message));
host.setDefaultTimeout(30000);
fs.mkdirSync('test-results', { recursive: true });
try {
  await host.addInitScript(() => {
    window.testPad = { index: 0, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.testPad] });
  });
  await host.goto(base + '/?qa');
  await host.locator('[data-action="play"]').waitFor();
  await host.locator('#phone-controller-button').click();
  await host.waitForFunction(() => window.__gameQA.services.phoneControllers.room);
  await host.locator('#phone-slot').selectOption('1');
  const link = new URL(await host.locator('#phone-link').getAttribute('href'));
  // Use the test server address; the QR itself contains the computer's LAN address.
  const controllerURL = base + '/controller.html' + link.hash;
  const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto(controllerURL);
  await expect(phone.locator('#status')).toContainText('Player 2 · Connected');
  await host.screenshot({ path: 'test-results/phone-pairing.png' });
  await host.locator('#phone-close').click();
  await host.evaluate(() => {
    const { services } = window.__gameQA;
    services.progress.data.settings.players = 2;
    services.ui.start(0);
  });
  await host.waitForFunction(() => window.__gameQA.scene.players?.length === 2);
  await host.evaluate(() => { const s = window.__gameQA.scene; s.cinematic?.finish?.(); s.finishCinema?.(); });
  // Input assertions work in-game regardless of cinematic staging.
  const stick = await phone.locator('#stick').boundingBox();
  await phone.mouse.move(stick.x + stick.width / 2, stick.y + stick.height / 2);
  await phone.mouse.down();
  await phone.mouse.move(stick.x + stick.width * .9, stick.y + stick.height / 2);
  await host.waitForFunction(() => window.__gameQA.services.controls.down(1, 'right'));
  assert.equal(await host.evaluate(() => window.__gameQA.services.controls.down(0, 'right')), false);
  await phone.mouse.up();
  await host.waitForFunction(() => !window.__gameQA.services.controls.down(1, 'right'));
  const jump = await phone.locator('.jump').boundingBox();
  await phone.mouse.move(jump.x + 20, jump.y + 20); await phone.mouse.down();
  await host.waitForFunction(() => window.__gameQA.services.controls.down(1, 'space'));
  await phone.mouse.up();
  await host.waitForFunction(() => !window.__gameQA.services.controls.down(1, 'space'));
  // Real multi-touch input: move and jump together, then cancel both touches.
  const touch = await phone.context().newCDPSession(phone);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { x: stick.x + stick.width * .9, y: stick.y + stick.height / 2, id: 1 },
    { x: jump.x + 20, y: jump.y + 20, id: 2 },
  ] });
  await host.waitForFunction(() => window.__gameQA.services.controls.down(1, 'right') && window.__gameQA.services.controls.down(1, 'space'));
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await host.waitForFunction(() => !window.__gameQA.services.controls.down(1, 'right') && !window.__gameQA.services.controls.down(1, 'space'));
  await touch.detach();
  await phone.screenshot({ path: 'test-results/phone-controller-landscape.png' });
  await phone.setViewportSize({ width: 390, height: 844 });
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await phone.screenshot({ path: 'test-results/phone-controller-portrait.png' });
  // A second device cannot silently take over an occupied player slot.
  const duplicate = await browser.newPage(); await duplicate.goto(controllerURL);
  await expect(duplicate.locator('#status')).toContainText('already has a phone');
  await duplicate.close();
  await phone.close();
  await host.waitForFunction(() => window.__gameQA.services.phoneControllers.pads.size === 0);
  await host.waitForFunction(() => window.__gameQA.services.ui.mode === 'pause');
  assert.equal(await host.evaluate(() => window.__gameQA.services.controls.down(1, 'space')), false);
  const reconnected = await browser.newPage(); await reconnected.goto(controllerURL);
  await expect(reconnected.locator('#status')).toContainText('Connected');
  await host.reload();
  await expect(reconnected.locator('#status')).toContainText('Disconnected');
  assert.deepEqual(errors, []);
  console.log('PASS QR pairing, selected P2 with physical P1, joystick, jump/release, portrait/landscape, duplicate rejection, disconnect pause, reconnect and host cleanup');
} finally { await browser.close(); }
