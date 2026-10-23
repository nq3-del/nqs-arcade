import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({
  headless: true,
  ...(fs.existsSync(edge) ? { executablePath: edge } : {}),
});
const page = await browser.newPage();
page.setDefaultTimeout(45000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:5173/?qa");
  await page.getByRole("button", { name: "Let’s play" }).click();
  await page.locator('[data-cinema="skip"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.press("k", { delay: 80 });
  await page.keyboard.press("q", { delay: 80 });
  await page.waitForTimeout(700);
  assert.equal(
    await page.evaluate(() => {
      const p = window.__gameQA.scene.player;
      return p.form === "B" && [p.x, p.z, p.vx, p.vz].every(Number.isFinite);
    }),
    true,
  );
  console.log(
    "PASS switching form mid-dash preserves finite position and velocity",
  );
  await page.evaluate(() => {
    const p = window.__gameQA.services.progress;
    p.completeOrigin();
    for (const id of ["grandad", "nana", "mummy", "leah"]) p.rescue(id);
  });
  for (let level = 1; level <= 5; level++) {
    // Undo only this world's rescue fixture so its live objective layout is inspectable.
    await page.evaluate((l) => {
      const q = window.__gameQA,
        ids = ["grandad", "nana", "mummy", "leah", "daddy"];
      q.services.progress.data.rescued = ids.slice(0, l - 1);
      q.services.ui.start(l);
    }, level);
    await page.waitForFunction(
      (l) =>
        window.__gameQA.scene.levelId === l &&
        !!window.__gameQA.scene.adventure,
      level,
    );
    await page.locator('[data-cinema="skip"]').click();
    const result = await page.evaluate(() => {
      const s = window.__gameQA.scene,
        v = s.view,
        step = 0.5,
        start = s.definition.start,
        queue = [start],
        seen = new Set([start.join(",")]);
      const free = (x, z) =>
        v.walkable(x, z) &&
        !v.wet(x, z) &&
        !v.blocked(x, z) &&
        !s.props.some(
          (o) =>
            o.type === "barrier" &&
            !o.done &&
            Math.hypot(o.x - x, o.z - z) < 0.9,
        );
      for (let i = 0; i < queue.length; i++) {
        const [x, z] = queue[i];
        for (const [dx, dz] of [
          [step, 0],
          [-step, 0],
          [0, step],
          [0, -step],
        ]) {
          const nx = x + dx,
            nz = z + dz,
            key = `${nx},${nz}`;
          if (!seen.has(key) && free(nx, nz)) {
            seen.add(key);
            queue.push([nx, nz]);
          }
        }
      }
      const missing = [];
      s.adventure.tasks.forEach((t) =>
        t.points.forEach(([x, z]) => {
          if (!queue.some(([a, b]) => Math.hypot(x - a, z - b) < 1.3))
            missing.push({ task: t.title, x, z });
        }),
      );
      return {
        level: s.levelId,
        reachable: queue.length,
        missing,
        drawCalls: v.renderer.info.render.calls,
        fps: window.__gameQA.game.loop.actualFps,
      };
    });
    assert.deepEqual(result.missing, []);
    console.log("PASS accessible objective approaches", JSON.stringify(result));
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/navigation-report.json",
    JSON.stringify(
      {
        passed: true,
        errors,
        method:
          "Dry-ground grid reachability to objective interaction radii; jump action tested by campaign suite.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
