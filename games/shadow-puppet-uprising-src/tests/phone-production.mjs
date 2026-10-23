import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const origin = process.env.ARCADE_URL || 'https://nqs-arcade.vercel.app';
const extraHTTPHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}) });
const host = await browser.newPage({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders });
const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, extraHTTPHeaders });
const errors = [];
for (const page of [host, phone]) {
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    window.testSockets = [];
    window.testEvents = [];
    window.WebSocket = class extends Native {
      constructor(...args) {
        super(...args); window.testSockets.push(this);
        this.addEventListener('message', e => {
          const { type, slot, axes, buttons } = JSON.parse(e.data);
          window.testEvents.push({ type, slot, axes, buttons });
        });
      }
    };
  });
}
try {
  await host.goto(origin + '/games/shadow-puppet-uprising/');
  await host.locator('#phone-controller-button').click();
  await expect(host.locator('.phone-status')).toContainText('Ready to pair', { timeout: 45000 });
  const url = await host.locator('#phone-link').getAttribute('href');
  assert.equal(new URL(url).pathname, '/games/shadow-puppet-uprising/controller.html');
  await phone.goto(url);
  await expect(phone.locator('#status')).toContainText('Connected', { timeout: 45000 });
  await expect(host.locator('.phone-status')).toContainText('phone connected');
  fs.mkdirSync('test-results', { recursive: true });
  await host.screenshot({ path: 'test-results/production-phone-pairing.png' });
  await host.locator('#phone-close').click();
  await host.locator('[data-action="play"]').click();
  await host.locator('[data-cinema="skip"]').click();
  await host.locator('#form-name').waitFor();
  await phone.locator('.form').click({ delay: 150 });
  await expect(host.locator('#form-name')).toContainText('Form B');
  console.log('Phone paired and changed the live game character.');

  // Force a phone transport interruption; the same QR identity must recover.
  await phone.evaluate(() => window.testSockets.at(-1).close());
  await expect(host.locator('[data-action="resume"]')).toBeVisible();
  await phone.waitForFunction(() => window.testEvents.filter(e => e.type === 'joined').length === 2);
  await expect(phone.locator('#status')).toContainText('Connected', { timeout: 45000 });
  await host.locator('[data-action="resume"]').click();
  await expect(host.locator('[data-action="resume"]')).toBeHidden();
  await phone.locator('.form').click({ delay: 150 });
  await expect(host.locator('#form-name')).toContainText('Form A');

  // Vercel can rotate the host independently. Existing phones must reattach.
  await host.evaluate(() => window.testSockets.at(-1).close());
  await expect(host.locator('[data-action="resume"]')).toBeVisible();
  await host.waitForFunction(() => window.testEvents.filter(e => e.type === 'room').length === 2 && window.testEvents.filter(e => e.type === 'connected').length >= 3);
  await expect(phone.locator('#status')).toContainText('Connected', { timeout: 45000 });
  await host.locator('[data-action="resume"]').click();
  await phone.locator('.form').click({ delay: 150 });
  await expect(host.locator('#form-name')).toContainText('Form B');
  await phone.screenshot({ path: 'test-results/production-phone-controller.png' });
  assert.equal(await host.evaluate(() => typeof window.__gameQA), 'undefined');
  assert.deepEqual(errors, []);
  await host.close();
  await expect(phone.locator('#status')).toContainText('game was closed', { timeout: 45000 });
  console.log('PASS production phone pairing, input, phone reconnect, host reconnect, and game-close cleanup.');
} catch (error) {
  fs.writeFileSync('test-results/production-phone-trace.json', JSON.stringify({
    host: host.isClosed() ? [] : await host.evaluate(() => window.testEvents),
    phone: await phone.evaluate(() => ({ events: window.testEvents, status: document.querySelector('#status').textContent })),
  }, null, 2));
  throw error;
} finally { await browser.close(); }
