import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({
  headless: true,
  ...(fs.existsSync(edge) ? { executablePath: edge } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
const checks = [];
page.on("pageerror", (e) => errors.push(e.stack || e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
fs.mkdirSync("test-results", { recursive: true });
const report = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
const qa = (fn) => page.evaluate(fn);
const position = async (x, y = 520) =>
  page.evaluate(
    ({ x, y }) => {
      const s = window.__gameQA.scene;
      s.player.body.reset(x, y);
      s.player.setVelocity(0, 0);
      s.player.invulnerableUntil = s.time.now + 5000;
    },
    { x, y },
  );
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};
try {
  await page.goto(`${url}/?qa`);
  await page.waitForFunction(
    () =>
      window.__gameQA?.services.ui.mode === "menu" &&
      window.__gameQA.game.scene.isActive("Menu"),
  );
  await page.screenshot({ path: "test-results/01-main-menu.png" });
  await page.getByRole("button", { name: "How to play" }).click();
  await page.getByRole("button", { name: "Got it!" }).click();
  await page.getByRole("button", { name: "Let’s play" }).click();
  await page.waitForFunction(
    () =>
      window.__gameQA.scene.player?.body &&
      window.__gameQA.services.ui.mode === "game",
  );
  await page.waitForTimeout(450);
  report("main menu, controls and origin are reachable");
  const initial = await qa(() => ({
    x: window.__gameQA.scene.player.x,
    y: window.__gameQA.scene.player.y,
  }));
  await page.keyboard.down("d");
  await page.waitForFunction(
    (x) => window.__gameQA.scene.player.x > x + 90,
    initial.x,
  );
  await page.keyboard.up("d");
  await page.keyboard.press("q");
  await page.waitForFunction(() => window.__gameQA.scene.player.form === "B");
  const before = await qa(() => window.__gameQA.scene.player.y);
  await page.keyboard.down("Space");
  await page.waitForFunction(
    (y) => window.__gameQA.scene.player.y < y - 100,
    before,
  );
  await page.keyboard.up("Space");
  await page.waitForFunction(
    () => window.__gameQA.scene.player.body.blocked.down,
  );
  report("keyboard movement, jump and instant form switching");
  await position(1070);
  await page.waitForFunction(
    () => window.__gameQA.scene.player.body.blocked.down,
  );
  await page.keyboard.down("Space");
  await page.keyboard.down("d");
  await page.waitForFunction(() => window.__gameQA.scene.player.x > 1220);
  await page.keyboard.up("d");
  await page.waitForFunction(
    () => window.__gameQA.scene.originActions.highJump,
  );
  await page.keyboard.up("Space");
  assert.equal(
    await qa(() => window.__gameQA.scene.originActions.highJump),
    true,
    "Form B must reach the tall origin ledge",
  );
  await position(1570);
  await page.waitForFunction(
    () => window.__gameQA.scene.player.body.blocked.down,
  );
  await page.keyboard.press("q");
  await page.waitForFunction(() => window.__gameQA.scene.player.form === "A");
  await page.keyboard.press("k");
  await page.waitForFunction(() => window.__gameQA.scene.originGate.broken);
  report("origin high ledge and Form A dash gate work through physics");
  await position(2410);
  await page.keyboard.press("e");
  await page.waitForFunction(() => window.__gameQA.services.ui.mode === "map");
  assert.equal(
    await qa(() => window.__gameQA.services.progress.data.origin),
    true,
  );
  report("origin portal saves and opens world selection");
  await page.screenshot({ path: "test-results/02-world-map.png" });
  for (let level = 1; level <= 5; level++) {
    await page.locator(`[data-action="world${level}"]`).click();
    await page.waitForFunction(
      (level) =>
        window.__gameQA.scene.levelId === level &&
        window.__gameQA.scene.player?.body,
      level,
    );
    await page.waitForTimeout(200);
    assert.ok(
      (await qa(
        () => window.__gameQA.scene.enemies.filter((e) => e.active).length,
      )) >= 2,
    );
    await position(1630);
    await page.waitForFunction(() => window.__gameQA.scene.checkpointReached);
    await page.keyboard.press("Escape");
    assert.equal(await qa(() => window.__gameQA.services.ui.mode), "pause");
    await page.keyboard.press("Escape");
    assert.equal(await qa(() => window.__gameQA.services.ui.mode), "game");
    await position(2820);
    await page.waitForTimeout(130);
    assert.equal(await qa(() => window.__gameQA.scene.boss.activeFight), true);
    // Fixtures shorten traversal, not victories: actual FSM and keyboard attacks decide damage.
    await qa(() => {
      const s = window.__gameQA.scene;
      s.player.invulnerableUntil = s.time.now + 120000;
    });
    if (level === 1)
      await page.screenshot({ path: "test-results/03-kingdom-boss.png" });
    let attempts = 0;
    while (
      (await qa(() => !!window.__gameQA.scene.boss?.active)) &&
      attempts++ < 65
    ) {
      await qa(() => {
        const s = window.__gameQA.scene,
          b = s.boss;
        if (b?.active) {
          s.player.body.reset(b.x - 85, 520);
          s.player.setVelocity(0, 0);
          s.player.facing = 1;
        }
      });
      await page.keyboard.press("j");
      await page.keyboard.press("k");
      await page.waitForTimeout(300);
    }
    assert.ok(attempts < 65, `boss ${level} must be beatable`);
    await page.waitForFunction(
      () => window.__gameQA.services.ui.mode === "rescue",
    );
    const state = await qa(() => ({
      rescued: window.__gameQA.services.progress.data.rescued,
      alive: window.__gameQA.scene.enemies.filter((e) => e.active).length,
    }));
    assert.equal(state.rescued.length, level);
    assert.equal(state.alive, 0);
    report(
      `world ${level}: encounter, checkpoint, boss pattern, rescue, ally unlock and army removal`,
    );
    if (level === 1)
      await page.screenshot({ path: "test-results/04-rescue.png" });
    await page.getByRole("button", { name: "On with the adventure" }).click();
  }
  await page.reload();
  await page.waitForFunction(
    () => window.__gameQA?.services.ui.mode === "menu",
  );
  assert.equal(
    await qa(() => window.__gameQA.services.progress.data.rescued.length),
    5,
  );
  await page.getByRole("button", { name: "Continue adventure" }).click();
  assert.equal(await page.locator('[data-action="world6"]').isEnabled(), true);
  report("saved rescues survive browser reload and unlock the final world");
  await page.locator('[data-action="world1"]').click();
  await page.waitForFunction(
    () =>
      window.__gameQA.scene.levelId === 1 && window.__gameQA.scene.player?.body,
  );
  assert.equal(
    await qa(
      () => window.__gameQA.scene.enemies.filter((e) => e.active).length,
    ),
    0,
  );
  assert.equal(await qa(() => window.__gameQA.scene.boss), null);
  report("revisited rescued world has no owner clones or boss");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page.locator('[data-action="world6"]').click();
  await page.waitForFunction(
    () =>
      window.__gameQA.scene.levelId === 6 && window.__gameQA.scene.player?.body,
  );
  await position(1150);
  await page.waitForTimeout(160);
  await qa(() => {
    const s = window.__gameQA.scene;
    s.player.invulnerableUntil = s.time.now + 120000;
  });
  const steps = [
    ["grandad", 1230],
    ["nana", 1460],
    ["mummy", 1460],
    ["leah", 1370],
    ["daddy", 1510],
  ];
  for (let i = 0; i < steps.length; i++) {
    const [id, x] = steps[i];
    await page.locator('[data-hud="allies"]').click();
    await page.locator(`[data-action="${id}"]`).click();
    await page.waitForFunction(() => window.__gameQA.scene.scene.isActive());
    await position(x);
    await page.waitForTimeout(120);
    await qa(() => {
      window.__gameQA.scene.player.facing = 1;
    });
    await page.keyboard.press("l", { delay: 80 });
    await page.waitForFunction(
      (expected) => window.__gameQA.scene.finalStage === expected,
      i + 1,
      { timeout: 6000 },
    );
    report(
      `final stage ${i + 1}: ${id} ability achieves its required contribution`,
    );
  }
  await page.screenshot({ path: "test-results/05-final-alliance.png" });
  await position(1620);
  await qa(() => {
    window.__gameQA.scene.player.facing = 1;
  });
  await page.keyboard.press("k", { delay: 80 });
  await page.waitForFunction(() => window.__gameQA.scene.finalDash);
  await page.keyboard.press("q");
  await page.waitForFunction(() => window.__gameQA.scene.player.form === "B");
  await position(1695);
  await page.waitForFunction(
    () =>
      window.__gameQA.scene.player.abilityReady <=
      window.__gameQA.scene.time.now,
  );
  await page.keyboard.press("k", { delay: 80 });
  await page.waitForFunction(
    () => window.__gameQA.services.ui.mode === "victory",
    {},
    { timeout: 6000 },
  );
  assert.equal(
    await qa(() => window.__gameQA.services.progress.data.victory),
    true,
  );
  report("two-form final strike, celebration and persisted ending");
  await page.screenshot({ path: "test-results/06-victory.png" });
  await page.getByRole("button", { name: "Back to our worlds" }).click();
  await page.locator('[data-action="world1"]').click();
  await page.waitForFunction(
    () =>
      window.__gameQA.scene.levelId === 1 && window.__gameQA.scene.player?.body,
  );
  await position(1630);
  await page.waitForFunction(() => window.__gameQA.scene.checkpointReached);
  await position(950, 710);
  await page.waitForFunction(
    () =>
      window.__gameQA.scene.player.x === 1630 &&
      window.__gameQA.scene.player.health === 7,
  );
  report("fall returns to the checkpoint and costs one heart");
  await qa(() => {
    const s = window.__gameQA.scene;
    s.player.health = 1;
    s.player.invulnerableUntil = 0;
    s.player.hurt(s.player.x + 50);
  });
  await page.waitForFunction(
    () => window.__gameQA.services.ui.mode === "defeat",
  );
  await page.keyboard.press("r");
  await page.waitForFunction(
    () =>
      window.__gameQA.services.ui.mode === "game" &&
      window.__gameQA.scene.player.health === 8 &&
      window.__gameQA.scene.player.x === 1630,
  );
  report("defeat screen and keyboard retry restore full health at checkpoint");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("#setting-sound").uncheck();
  await page.locator("#setting-difficulty").selectOption("normal");
  await page.getByRole("button", { name: "All set!" }).click();
  await page.waitForFunction(() => window.__gameQA.scene.scene.isActive());
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page.locator('[data-action="world1"]').click();
  await page.waitForFunction(
    () => window.__gameQA.scene.player?.maxHealth === 6,
  );
  assert.equal(
    await qa(() => window.__gameQA.services.progress.data.settings.muted),
    true,
  );
  report(
    "sound settings persist and Classic difficulty applies on level entry",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page.getByRole("button", { name: "← Menu" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/07-small-screen.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  report("small-screen menu fits without horizontal overflow");
  assert.deepEqual(errors, []);
  report("no browser runtime errors or missing resources");
  fs.writeFileSync(
    "test-results/browser-report.json",
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
} catch (error) {
  await page.screenshot({ path: "test-results/failure.png" });
  console.error(
    "STATE",
    await qa(() => {
      const q = window.__gameQA,
        s = q?.scene;
      return {
        mode: q?.services.ui.mode,
        level: s?.levelId,
        player: s?.player
          ? {
              x: s.player.x,
              y: s.player.y,
              form: s.player.form,
              health: s.player.health,
            }
          : null,
        origin: s?.originActions,
        finalStage: s?.finalStage,
        boss: s?.boss ? { health: s.boss.health, state: s.boss.state } : null,
      };
    }),
  );
  console.error("ERRORS", errors);
  fs.writeFileSync(
    "test-results/browser-report.json",
    JSON.stringify(
      { passed: false, checks, errors, failure: error.message },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
