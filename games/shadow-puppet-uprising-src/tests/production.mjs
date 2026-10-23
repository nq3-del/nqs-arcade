import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({
  headless: true,
  ...(fs.existsSync(edge) ? { executablePath: edge } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  await page.goto(process.env.PRODUCTION_URL || "http://127.0.0.1:4173/");
  await page.getByRole("button", { name: "Let’s play" }).click();
  await page.locator('[data-cinema="skip"]').click();
  await page.locator("#form-name").waitFor();
  await page.keyboard.press("q", { delay: 100 });
  await page.waitForFunction(() =>
    document.querySelector("#form-name").textContent.includes("Form B"),
  );
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  await page.keyboard.press("Space", { delay: 250 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Keep going" }).click();
  await page.screenshot({ path: "test-results/08-production-origin.png" });
  assert.equal(await page.evaluate(() => typeof window.__gameQA), "undefined");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "test-results/diorama-small-screen.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/production-report.json",
    JSON.stringify({ passed: true, errors, qaHookAbsent: true }, null, 2),
  );
  console.log(
    "PASS production build loads, plays, switches forms and pauses without errors; QA hooks absent.",
  );
} finally {
  await browser.close();
}
