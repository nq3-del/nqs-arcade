import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('/games/shadow-puppet-uprising/')) errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(process.env.ARCADE_URL || 'http://127.0.0.1:4173/');
  await page.locator('a[href="games/shadow-puppet-uprising/"]').click();
  await page.locator('[data-action="play"]').click();
  console.log('Opened game from Arcade and started adventure');
  await page.locator('[data-cinema="skip"]').click();
  await page.locator('#form-name').waitFor();
  await page.keyboard.press('q', { delay: 100 });
  await page.waitForFunction(() => document.querySelector('#form-name').textContent.includes('Form B'));
  await page.waitForFunction(() => { const img = document.querySelector('#form-portrait'); return img?.complete && img.naturalWidth > 0; });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Keep going' }).click();
  assert.equal(await page.evaluate(() => typeof window.__gameQA), 'undefined');
  fs.mkdirSync('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/arcade-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'test-results/arcade-mobile.png' });
  await page.getByRole('link', { name: "Back to NQ's Arcade" }).click();
  await page.locator('.games-grid').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS Arcade entry, gameplay, form artwork, pause, mobile layout and return navigation; no failed game requests or runtime errors.');
} finally {
  await browser.close();
}
