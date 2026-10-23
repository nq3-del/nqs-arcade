import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({
  headless: true,
  ...(fs.existsSync(edge) ? { executablePath: edge } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(45000);
const checks = [],
  errors = [];
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
page.on("pageerror", (e) => errors.push(e.stack));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const qa = (fn) => page.evaluate(fn),
  wait = (fn) => page.waitForFunction(fn, null, { timeout: 45000 });
const pass = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
const key = async (k) => {
  await page.keyboard.press(k, { delay: 80 });
};
const position = async (x, z) =>
  page.evaluate(
    ({ x, z }) => {
      const s = window.__gameQA.scene,
        p = s.player;
      p.x = x;
      p.z = z;
      p.y = 0;
      p.vx = 0;
      p.vz = 0;
      p.vy = 0;
      p.wetTime = 0;
      p.dashUntil = 0;
      p.knockUntil = 0;
      p.glamourUntil = 0;
      p.invulnerableUntil = s.time.now + 600000;
      p.sync(0);
    },
    { x, z },
  );
const form = async (f) => {
  if ((await qa(() => window.__gameQA.scene.player.form)) !== f) await key("q");
  await page.waitForFunction((f) => window.__gameQA.scene.player.form === f, f);
};
const ready = () =>
  wait(() => {
    const s = window.__gameQA.scene,
      p = s.player;
    return (
      s.time.now >= Math.max(p.abilityReady, p.attackReady, p.glamourUntil)
    );
  });
const actionUntil = async (k, condition, arg) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await page.evaluate(condition, arg)) return;
    await key(k);
    await page.waitForTimeout(250);
  }
  assert.fail("action did not complete: " + k);
};
const skip = async () => {
  await page.locator('[data-cinema="skip"]').waitFor();
  await page.locator('[data-cinema="skip"]').click();
  await wait(() => !window.__gameQA.scene.cinematic);
};
const snap = (name) => page.screenshot({ path: `test-results/${name}.png` });
fs.mkdirSync("test-results", { recursive: true });
try {
  await page.goto(`${url}/?qa`);
  await wait(() => window.__gameQA?.services.ui.mode === "menu");
  await snap("diorama-menu");
  await page.getByRole("button", { name: "How to play" }).click();
  await page.getByRole("button", { name: "Got it!" }).click();
  await page.getByRole("button", { name: "Let’s play" }).click();
  await page.locator('[data-cinema="skip"]').waitFor();
  await snap("diorama-cutscene");
  await skip();
  await page.keyboard.down("s");
  await wait(() => window.__gameQA.scene.player.x > -7.5);
  await page.keyboard.up("s");
  await form("B");
  await key("Space");
  await wait(() => window.__gameQA.scene.player.y > 0.5);
  await wait(() => window.__gameQA.scene.player.y === 0);
  pass(
    "menus, skippable cinematic, real keyboard movement, jump and form switch",
  );
  await position(-3, 3);
  await wait(() => window.__gameQA.scene.originStep === 1);
  await position(0, 0);
  await key("Space");
  await wait(() => window.__gameQA.scene.originStep >= 3);
  await position(3, -1);
  await ready();
  await key("k");
  await wait(() => window.__gameQA.scene.originStep === 4);
  await form("A");
  await position(5.5, -4);
  await qa(() => (window.__gameQA.scene.player.facing = { x: 1, z: 0 }));
  await ready();
  await key("k");
  await wait(() => window.__gameQA.scene.originStep === 5);
  await position(9, -7);
  await key("e");
  await skip();
  await wait(() => window.__gameQA.services.ui.mode === "map");
  pass("origin requires jump, both forms, crystal and dash before portal");
  for (let level = 1; level <= 5; level++) {
    await page.locator(`[data-action="world${level}"]`).click();
    await page.waitForFunction(
      (l) => window.__gameQA.scene.levelId === l,
      level,
    );
    await skip();
    await position(8, -5);
    await page.waitForTimeout(150);
    assert.equal(await qa(() => window.__gameQA.scene.boss.activeFight), false);
    for (let taskIndex = 0; taskIndex < 8; taskIndex++) {
      const task = await qa(() => window.__gameQA.scene.adventure.task);
      console.log("TASK", level, taskIndex, task.kind);
      if (task.kind === "encounter") {
        await form("B");
        for (let wave = 0; wave < 3; wave++) {
          const [x, z] = task.points[wave];
          await position(x, z);
          await wait(() => window.__gameQA.scene.adventure.opened);
          await ready();
          await key("k");
          await actionUntil(
            "k",
            (w) =>
              window.__gameQA.scene.adventure.step > 5 ||
              window.__gameQA.scene.adventure.wave > w,
            wave,
          );
        }
      } else {
        if (task.kind === "power" || task.kind === "jump") await form("B");
        if (task.kind === "dash") await form("A");
        for (let i = 0; i < task.points.length; i++) {
          const [x, z] = task.points[i];
          await position(x, z);
          if (task.kind === "power" || task.kind === "dash") {
            await ready();
            await qa(
              () => (window.__gameQA.scene.player.facing = { x: 1, z: 0 }),
            );
            await key("k");
          } else if (task.kind === "jump") {
            await key("Space");
          } else await key("e");
          await actionUntil(
            task.kind === "jump"
              ? "Space"
              : task.kind === "power" || task.kind === "dash"
                ? "k"
                : "e",
            ({ step, i }) => {
              const a = window.__gameQA.scene.adventure;
              return a.step > step || a.hits.has(i);
            },
            { step: taskIndex, i },
          );
        }
      }
      await page.waitForFunction(
        (n) => window.__gameQA.scene.adventure.step === n,
        taskIndex + 1,
      );
      if (taskIndex === 6) {
        await wait(() => window.__gameQA.scene.cinematic?.kind === "message");
        await skip();
      }
      if (level === 1 && taskIndex === 0) {
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "World map", exact: true })
          .click();
        await page.locator('[data-action="world1"]').click();
        await skip();
        assert.equal(await qa(() => window.__gameQA.scene.adventure.step), 1);
        pass(
          "objective completion persists across leaving and re-entering a world",
        );
      }
    }
    await skip();
    await form("B");
    await position(7, -5);
    await wait(() => window.__gameQA.scene.boss.activeFight);
    await snap(`world-${level}-boss`);
    for (
      let attempt = 0;
      attempt < 25 && (await qa(() => window.__gameQA.scene.boss.active));
      attempt++
    ) {
      await wait(
        () =>
          window.__gameQA.scene.boss.state === "recovery" ||
          !window.__gameQA.scene.boss.active,
      );
      const b = await qa(() => ({
        x: window.__gameQA.scene.boss.x,
        z: window.__gameQA.scene.boss.z,
      }));
      await position(b.x - 0.8, b.z);
      await ready();
      await key("k");
      await page.waitForTimeout(310);
      if (await qa(() => window.__gameQA.scene.boss.active)) await key("j");
    }
    await wait(() => window.__gameQA.scene.cinematic?.kind === "rescue");
    await skip();
    await wait(() => window.__gameQA.services.ui.mode === "rescue");
    assert.equal(
      await qa(() => window.__gameQA.services.progress.data.rescued.length),
      level,
    );
    assert.equal(
      await qa(
        () => window.__gameQA.scene.enemies.filter((e) => e.active).length,
      ),
      0,
    );
    pass(
      `world ${level}: eight objectives, three patrols, boss, rescue, ally unlock and army removal`,
    );
    await page.getByRole("button", { name: "On with the adventure" }).click();
  }
  await page.reload();
  await wait(() => window.__gameQA?.services.ui.mode === "menu");
  assert.equal(
    await qa(() => window.__gameQA.services.progress.data.rescued.length),
    5,
  );
  await page.getByRole("button", { name: "Continue adventure" }).click();
  assert.equal(await page.locator('[data-action="world6"]').isEnabled(), true);
  pass("browser reload preserves all five rescues and unlocks finale");
  await page.locator('[data-action="world1"]').click();
  await skip();
  assert.equal(await qa(() => window.__gameQA.scene.enemies.length), 0);
  assert.equal(await qa(() => window.__gameQA.scene.boss), null);
  pass("future visits suppress the rescued owner’s entire army");
  await key("Escape");
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page.locator('[data-action="world6"]').click();
  await skip();
  await position(1, -1);
  await wait(() => window.__gameQA.scene.arenaStarted);
  await skip();
  await wait(() => window.__gameQA.scene.boss.activeFight);
  const stages = [
    ["grandad", 1, -1],
    ["nana", 4, -3],
    ["mummy", 4, -3],
    ["leah", 4, -3],
    ["daddy", 7, -4],
  ];
  for (let i = 0; i < stages.length; i++) {
    const [id, x, z] = stages[i];
    await page.locator('[data-hud="allies"]').click();
    await page.locator(`[data-action="${id}"]`).click();
    await position(x, z);
    await qa(() => (window.__gameQA.scene.player.facing = { x: 0.7, z: -0.7 }));
    await key("l");
    await page.waitForFunction(
      (n) => window.__gameQA.scene.finalStage === n,
      i + 1,
    );
    pass(`final alliance contribution: ${id}`);
  }
  await snap("diorama-final");
  await form("A");
  await position(7.5, -5);
  await qa(() => (window.__gameQA.scene.player.facing = { x: 1, z: 0 }));
  await ready();
  await key("k");
  await wait(() => window.__gameQA.scene.finalDash);
  await form("B");
  await position(7.5, -5);
  await ready();
  await key("k");
  await wait(() => window.__gameQA.scene.cinematic?.kind === "ending");
  await skip();
  await wait(() => window.__gameQA.services.ui.mode === "victory");
  assert.equal(
    await qa(() => window.__gameQA.services.progress.data.victory),
    true,
  );
  await snap("diorama-victory");
  pass("two-form final strike, ending and saved victory");
  await page.getByRole("button", { name: "Back to our worlds" }).click();
  await page.locator('[data-action="world1"]').click();
  await skip();
  await position(0, 0);
  await wait(() => window.__gameQA.scene.checkpointReached);
  await qa(() => {
    const s = window.__gameQA.scene;
    s.player.health = 1;
    s.player.invulnerableUntil = 0;
    s.player.hurt({ x: 1, z: 0 });
  });
  await wait(() => window.__gameQA.services.ui.mode === "defeat");
  await key("r");
  await wait(
    () =>
      window.__gameQA.scene.player.health === 8 &&
      window.__gameQA.services.ui.mode === "game",
  );
  assert.equal(await qa(() => window.__gameQA.scene.player.x), 0);
  pass("defeat and R retry restore checkpoint with full hearts");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("#setting-sound").uncheck();
  await page.locator("#setting-difficulty").selectOption("normal");
  await page.getByRole("button", { name: "All set!" }).click();
  await key("Escape");
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page.locator('[data-action="world1"]').click();
  await skip();
  assert.equal(await qa(() => window.__gameQA.scene.player.maxHealth), 6);
  pass("mute and difficulty settings apply");
  console.log(
    "RENDER",
    await qa(() => ({
      calls: window.__gameQA.scene.view.renderer.info.render.calls,
      triangles: window.__gameQA.scene.view.renderer.info.render.triangles,
      fps: window.__gameQA.game.loop.actualFps,
    })),
  );
  assert.deepEqual(errors, []);
  pass("no runtime errors or missing resources");
  fs.writeFileSync(
    "test-results/diorama-report.json",
    JSON.stringify(
      {
        passed: true,
        checks,
        errors,
        method:
          "Controlled positioning and invulnerability; real keyboard actions and boss FSM. Not a timed end-to-end family playtest.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  await snap("diorama-failure");
  console.error(
    "STATE",
    await qa(() => {
      const q = window.__gameQA,
        s = q?.scene;
      return {
        mode: q?.services.ui.mode,
        level: s?.levelId,
        step: s?.adventure?.step,
        task: s?.adventure?.task,
        hits: [...(s?.adventure?.hits || [])],
        wave: s?.adventure?.wave,
        p: s?.player
          ? {
              x: s.player.x,
              z: s.player.z,
              y: s.player.y,
              form: s.player.form,
              health: s.player.health,
            }
          : null,
        boss: s?.boss ? { state: s.boss.state, health: s.boss.health } : null,
        origin: s?.originStep,
        final: s?.finalStage,
      };
    }),
  );
  console.error(errors);
  fs.writeFileSync(
    "test-results/diorama-report.json",
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
