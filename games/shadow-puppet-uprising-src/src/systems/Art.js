import Phaser from "phaser";
import { CHARACTERS } from "../data/config.js";

const ink = "#26364b";
function round(ctx, x, y, w, h, r, fill, stroke = ink, line = 4) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}
function circle(ctx, x, y, r, fill, stroke = null, line = 3) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}
function line(ctx, points, color = ink, width = 4) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  points.slice(1).forEach((p) => ctx.lineTo(...p));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
}
function star(ctx, x, y, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.47 : r;
    const p = [x + Math.cos(a) * d, y + Math.sin(a) * d];
    i ? ctx.lineTo(...p) : ctx.moveTo(...p);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
function character(ctx, id, frame = 0, shadow = false) {
  const index = CHARACTERS.findIndex((c) => c.id === id);
  const hero = id.startsWith("hero");
  const boss = id === "bigboss";
  const colors = ["#ffbd65", "#afd68c", "#e6a5de", "#ff9384", "#86c9ff"];
  const main = shadow
    ? "#7263ae"
    : hero
      ? id === "heroA"
        ? "#42cfc3"
        : "#ffb85d"
      : boss
        ? "#8e85ca"
        : colors[index] || "#c7ed7b";
  const face = shadow ? "#4e477c" : boss ? "#aea8e4" : "#fff0d7";
  const feet = frame === 1 ? 4 : frame === 2 ? -4 : 0;
  ctx.save();
  round(ctx, 22, 91 + feet, 23, 12, 6, ink, null);
  round(ctx, 53, 91 - feet, 23, 12, 6, ink, null);
  if (hero) {
    ctx.beginPath();
    ctx.moveTo(27, 48);
    ctx.lineTo(10, 91);
    ctx.quadraticCurveTo(42, 87, 57, 56);
    ctx.fillStyle = id === "heroA" ? "#f6c560" : "#ef7b87";
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  round(ctx, 23, 51, 51, 45, 18, main);
  circle(ctx, 20, 72 + feet, 9, main, ink);
  circle(ctx, 78, 72 - feet, 9, main, ink);
  round(ctx, 17, 12, 65, 56, 24, main);
  round(ctx, 24, 24, 51, 36, 16, face, null);
  if (hero) {
    ctx.beginPath();
    ctx.moveTo(28, 19);
    ctx.lineTo(36, 4);
    ctx.lineTo(47, 17);
    ctx.fillStyle = main;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    star(ctx, 50, 78, 9, "#fff3bd");
  }
  const eye = shadow ? "#e7ffb0" : ink;
  round(ctx, 35, 36, 6, 11, 3, eye, null);
  round(ctx, 59, 36, 6, 11, 3, eye, null);
  circle(ctx, 36, 37, 1.5, "white");
  circle(ctx, 60, 37, 1.5, "white");
  ctx.beginPath();
  ctx.arc(50, 46, 7, 0.15, Math.PI - 0.15);
  ctx.strokeStyle = shadow ? "#ddd2ff" : ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  if (id === "grandad") {
    round(ctx, 14, 8, 70, 17, 7, shadow ? "#8077ba" : "#e8e7df");
    round(ctx, 29, 32, 17, 17, 5, "#ffffff22", shadow ? "#ded1ff" : ink, 2);
    round(ctx, 53, 32, 17, 17, 5, "#ffffff22", shadow ? "#ded1ff" : ink, 2);
    line(
      ctx,
      [
        [46, 39],
        [53, 39],
      ],
      ink,
      2,
    );
    round(ctx, 28, 77, 43, 7, 2, "#fff1cc", null);
    line(
      ctx,
      [
        [51, 78],
        [47, 91],
        [55, 89],
      ],
      ink,
      3,
    );
  }
  if (id === "nana") {
    circle(ctx, 76, 17, 15, shadow ? "#8e83bb" : "#e9e7db", ink);
    for (let i = 0; i < 5; i++)
      circle(
        ctx,
        24 + Math.cos(i * 1.256) * 6,
        20 + Math.sin(i * 1.256) * 6,
        5,
        "#fff4bf",
      );
    circle(ctx, 24, 20, 4, "#f2ae6b");
    round(ctx, 72, 76, 15, 24, 4, "#a5ede0");
    round(ctx, 72, 71, 15, 7, 2, "#fff1cf");
  }
  if (id === "mummy") {
    ctx.beginPath();
    ctx.moveTo(16, 23);
    ctx.lineTo(25, 4);
    ctx.lineTo(43, 14);
    ctx.lineTo(65, 3);
    ctx.lineTo(82, 24);
    ctx.closePath();
    ctx.fillStyle = shadow ? "#a08ad0" : "#d96fbb";
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    circle(ctx, 81, 83, 12, "#e9a2e4", ink);
    round(ctx, 77, 65, 8, 10, 2, "#f1e5c6");
    star(ctx, 49, 77, 7, "#fff1c6");
  }
  if (id === "leah") {
    round(ctx, 16, 14, 67, 10, 4, shadow ? "#b090c8" : "#f15c65", null);
    circle(ctx, 75, 82, 15, main, ink);
    circle(ctx, 75, 80, 10, face);
    circle(ctx, 72, 78, 1.7, eye);
    circle(ctx, 80, 78, 1.7, eye);
    round(ctx, 63, 88, 25, 11, 4, "#fff0ce");
    line(
      ctx,
      [
        [73, 67],
        [77, 63],
      ],
      ink,
      2,
    );
  }
  if (id === "daddy") {
    round(ctx, 14, 10, 71, 9, 4, "#e7f5ff");
    round(ctx, 42, 72, 15, 18, 3, "#fff1cc", null);
    ctx.fillStyle = ink;
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("7", 45, 87);
    circle(ctx, 81, 88, 13, "#f2f0dc", ink);
    star(ctx, 81, 88, 7, ink);
  }
  if (boss) {
    round(ctx, 8, 6, 82, 16, 7, "#d5f66a");
    star(ctx, 49, 14, 9, "#f6ad75");
    line(
      ctx,
      [
        [30, 76],
        [68, 76],
      ],
      "#e5dfff",
      3,
    );
    circle(ctx, 49, 81, 4, "#d5f66a");
  }
  ctx.restore();
}
export function makeTextures(scene) {
  const make = (key, w, h, paint) => {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w, h);
    paint(t.context);
    t.refresh();
  };
  for (const id of [
    "heroA",
    "heroB",
    ...CHARACTERS.map((c) => c.id),
    "bigboss",
  ])
    for (let frame = 0; frame < 3; frame++)
      make(`${id}${frame ? `-run${frame}` : ""}`, 100, 112, (c) =>
        character(c, id, frame),
      );
  for (const c of [...CHARACTERS, { id: "bigboss" }])
    for (let frame = 0; frame < 3; frame++)
      make(`shadow-${c.id}${frame ? `-run${frame}` : ""}`, 100, 112, (x) =>
        character(x, c.id, frame, true),
      );
  make("star", 40, 40, (c) => {
    star(c, 20, 20, 17, "#f7c956");
    c.strokeStyle = "#ae7c2f";
    c.lineWidth = 2;
    c.stroke();
    star(c, 18, 16, 8, "#fff0ab");
  });
  make("bubble", 40, 40, (c) => {
    circle(c, 20, 20, 17, "#b5e9f3aa", "#f4fdff");
    circle(c, 13, 12, 4, "white");
  });
  make("potion", 36, 44, (c) => {
    circle(c, 18, 27, 13, "#e899e0", ink, 2);
    round(c, 13, 5, 10, 15, 3, "#c4f3eb", ink, 2);
    round(c, 11, 3, 14, 6, 2, "#f5d5a3", ink, 2);
    star(c, 18, 29, 7, "#fff2c9");
  });
  make("ball", 40, 40, (c) => {
    circle(c, 20, 20, 18, "#fff6df", ink, 2);
    star(c, 20, 20, 10, ink);
  });
  make("basketball", 40, 40, (c) => {
    circle(c, 20, 20, 18, "#f5a25f", ink, 2);
    line(
      c,
      [
        [2, 20],
        [38, 20],
      ],
      ink,
      2,
    );
    line(
      c,
      [
        [20, 2],
        [20, 38],
      ],
      ink,
      2,
    );
  });
  make("nappy", 44, 36, (c) => {
    round(c, 3, 5, 38, 26, 9, "#fff3d4", ink, 2);
    line(
      c,
      [
        [4, 10],
        [15, 19],
        [29, 19],
        [40, 10],
      ],
      "#f29d83",
      4,
    );
    star(c, 22, 23, 6, "#a5d2c2");
  });
  make("spark", 12, 12, (c) => star(c, 6, 6, 6, "white"));
}

export function burst(scene, x, y, color = 0xffd169, count = 16) {
  const reduced =
    scene.game.registry.get("services")?.progress.data.settings.reducedMotion;
  for (let i = 0; i < (reduced ? 4 : count); i++) {
    const p = scene.add
      .rectangle(
        x,
        y,
        Phaser.Math.Between(4, 10),
        Phaser.Math.Between(5, 12),
        [color, 0xff967f, 0xd5f66a, 0x73d9d2, 0xffffff][i % 5],
      )
      .setDepth(90);
    scene.tweens.add({
      targets: p,
      x: x + Phaser.Math.Between(-100, 100),
      y: y + Phaser.Math.Between(-110, 45),
      angle: reduced ? 0 : Phaser.Math.Between(-200, 200),
      alpha: 0,
      duration: Phaser.Math.Between(400, 850),
      onComplete: () => p.destroy(),
    });
  }
}
export function floatingText(scene, x, y, text, color = "#26364b") {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: 22,
      fontStyle: "bold",
      color,
      stroke: "#ffffff",
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(100);
  scene.tweens.add({
    targets: t,
    y: y - 65,
    alpha: 0,
    duration: 1300,
    onComplete: () => t.destroy(),
  });
}

export function background(scene, world, menu = false) {
  const w = 1280,
    h = 720;
  const g = scene.add.graphics().setScrollFactor(0).setDepth(-30);
  g.fillStyle(world.sky);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0xffffff, 0.23);
  g.fillCircle(1010, 120, 110);
  g.fillStyle(0xfff7d4, 0.8);
  g.fillCircle(1010, 120, 67);
  for (let i = 0; i < 7; i++) {
    const x = i * 245 - 80,
      y = 230 + (i % 3) * 47;
    g.fillStyle(world.far, 0.35);
    g.fillRoundedRect(x, y, 300, 490, 130);
    g.fillStyle(world.far, 0.2);
    g.fillRoundedRect(x + 60, y - 50, 160, 500, 80);
  }
  for (let i = 0; i < 10; i++) {
    const x = i * 160 + 15,
      y = 75 + ((i * 47) % 150);
    const cloud = scene.add.graphics().setScrollFactor(0.15).setDepth(-20);
    cloud.fillStyle(0xffffff, 0.4);
    cloud.fillRoundedRect(x, y, 100, 27, 14);
    cloud.fillCircle(x + 35, y, 22);
    cloud.fillCircle(x + 65, y + 4, 16);
  }
  const decor = scene.add
    .graphics()
    .setDepth(-15)
    .setScrollFactor(menu ? 0 : 0.5);
  const max = menu ? 1500 : world.width + 800;
  for (let x = 100; x < max; x += 260) {
    const y = 350 + ((x / 10) % 3) * 25;
    decor.fillStyle(world.far, 0.75);
    if (world.theme === "forest" || world.theme === "origin") {
      decor.fillRoundedRect(x + 40, y + 20, 28, 250, 12);
      decor.fillCircle(x + 55, y, 80);
      decor.fillCircle(x + 9, y + 35, 65);
      decor.fillCircle(x + 105, y + 38, 65);
      decor.fillStyle(0xffffff, 0.2);
      decor.fillCircle(x + 35, y - 20, 20);
    } else if (world.theme === "gears") {
      decor.fillRoundedRect(x, y, 150, 250, 12);
      decor.fillRect(x + 30, y - 80, 28, 100);
      decor.fillStyle(world.sky, 0.7);
      for (let j = 0; j < 3; j++)
        decor.fillRoundedRect(x + 20 + j * 43, y + 30, 24, 35, 8);
      const gear = scene.add
        .star(x + 75, y + 120, 12, 43, 55, world.top, 0.55)
        .setScrollFactor(0.5)
        .setDepth(-14);
      scene.tweens.add({
        targets: gear,
        angle: 360,
        duration: 16000,
        repeat: -1,
      });
      decor.fillStyle(world.ground, 0.25);
      decor.fillCircle(x + 75, y + 120, 20);
    } else if (world.theme === "palace") {
      decor.fillRoundedRect(x, y - 70, 150, 320, 70);
      decor.fillStyle(0xffffff, 0.35);
      decor.fillRoundedRect(x + 25, y - 40, 100, 185, 45);
      decor.fillStyle(world.sky, 0.7);
      decor.fillRoundedRect(x + 40, y - 25, 70, 160, 35);
    } else if (world.theme === "stadium") {
      decor.fillRoundedRect(x - 100, y, 300, 220, 20);
      decor.fillStyle(0xffffff, 0.5);
      for (let j = 0; j < 6; j++)
        decor.fillRect(x - 80, y + 20 + j * 25, 260, 4);
      decor.fillStyle(world.far);
      decor.fillRect(x + 20, y - 150, 10, 160);
      decor.fillStyle(0xfff4cb);
      decor.fillRoundedRect(x - 20, y - 165, 90, 30, 8);
    } else {
      decor.fillRoundedRect(x, y, 170, 250, 15);
      for (let j = 0; j < 4; j++)
        decor.fillRoundedRect(x + j * 45, y - 30, 30, 50, 7);
      decor.fillStyle(world.sky, 0.7);
      decor.fillRoundedRect(x + 55, y + 50, 60, 120, 30);
    }
  }
  const floor = scene.add.graphics().setScrollFactor(0).setDepth(-12);
  floor.fillStyle(world.far, 0.4);
  floor.fillEllipse(300, 690, 1000, 280);
  floor.fillEllipse(1100, 690, 1100, 240);
}

export function platformArt(scene, x, y, width, height, world) {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(world.ground);
  g.fillRoundedRect(x - width / 2, y, width, height, {
    tl: 9,
    tr: 9,
    bl: 9,
    br: 9,
  });
  g.fillStyle(world.top);
  g.fillRoundedRect(x - width / 2, y, width, 16, 7);
  g.fillStyle(0xffffff, 0.16);
  g.fillRect(x - width / 2 + 10, y + 18, width - 20, 4);
  g.lineStyle(2, 0x253847, 0.15);
  for (let i = x - width / 2 + 24; i < x + width / 2; i += 48) {
    g.strokeLineShape(new Phaser.Geom.Line(i, y + 40, i + 20, y + 40));
  }
  return g;
}
export function portal(scene, x, y) {
  const c = scene.add.container(x, y).setDepth(3);
  const outer = scene.add
    .ellipse(0, 0, 106, 150, 0x406d7b)
    .setStrokeStyle(7, 0xffe4a0);
  const inner = scene.add
    .ellipse(0, 0, 80, 124, 0xa5f0df)
    .setStrokeStyle(3, 0xffffff, 0.6);
  const core = scene.add.ellipse(0, 0, 47, 91, 0x60b9ba);
  c.add([outer, inner, core]);
  for (let i = 0; i < 6; i++) {
    const s = scene.add
      .image(Math.cos(i) * 34, Math.sin(i) * 54, "spark")
      .setTint(0xfff2ae);
    c.add(s);
  }
  scene.tweens.add({
    targets: inner,
    alpha: 0.55,
    scaleX: 0.87,
    duration: 1000,
    yoyo: true,
    repeat: -1,
  });
  scene.tweens.add({
    targets: core,
    scaleY: 0.9,
    duration: 850,
    yoyo: true,
    repeat: -1,
  });
  return c;
}
