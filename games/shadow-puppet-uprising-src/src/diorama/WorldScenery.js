import * as THREE from "three";
import { EXPEDITIONS } from "../data/expeditions.js";
import { dressWorld } from "./WorldDetail.js";
import { buildBasketballCourts, buildFootballGoals } from './BasketballModels.js';

function slab(v, x, z, w, d, color, edge = "#697d80") {
  v.box(x, -0.9, z, w, 1.9, d, edge, v.root, 0.55);
  v.box(x, 0.12, z, w - 0.1, 0.22, d - 0.1, color, v.root, 0.22);
}
function path(v, points, width = 2.5, color = "#cfb797") {
  for (let i = 1; i < points.length; i++) {
    const [x, z] = points[i - 1],
      [a, b] = points[i],
      len = Math.hypot(a - x, b - z);
    const strip = v.box(
      (x + a) / 2,
      0.26,
      (z + b) / 2,
      width,
      0.06,
      len,
      color,
      v.root,
      0.04,
    );
    strip.rotation.y = Math.atan2(a - x, b - z);
    for (let t = 0; t < len; t += 1.1) {
      const px = x + ((a - x) * t) / len,
        pz = z + ((b - z) * t) / len;
      v.sphere(px, 0.31, pz, 0.14, 0.035, 0.15, "#e8d4ac");
    }
  }
}
function lantern(v, x, z, color = "#f5ce7c") {
  v.cylinder(x, 1.2, z, 0.055, 0.09, 2.4, "#5d7275");
  v.box(x, 2.55, z, 0.38, 0.55, 0.38, color, v.root, 0.1).material = v.material(
    color,
    { emissive: color, emissiveIntensity: 0.8 },
  );
  v.cylinder(x, 2.91, z, 0, 0.4, 0.25, "#5d7275");
}
function arch(v, x, z, width = 3, color = "#bd9f87") {
  for (const side of [-1, 1])
    v.cylinder(x + (side * width) / 2, 1.7, z, 0.25, 0.38, 3.4, color);
  const top = v.mesh(
    new THREE.TorusGeometry(width / 2, 0.28, 10, 32, Math.PI),
    color,
  );
  top.position.set(x, 3.4, z);
}
function factory(v, x, z, w = 5, h = 6) {
  v.box(x, h / 2, z, w, h, 4, "#8a9d9e", v.root, 0.25);
  for (let y = 1; y < h - 1; y += 1.5)
    for (let j = -1; j <= 1; j++) {
      v.box(x + j * w * 0.27, y, z + 2.03, 0.72, 0.9, 0.1, "#e2be76");
      v.box(x + j * w * 0.27, y, z + 2.1, 0.05, 0.92, 0.05, "#57757c");
    }
  for (let i = 0; i < 3; i++)
    v.cylinder(x - 1 + i, h + 0.6, z, 0.4, 0.6, 1.5, "#b8926f");
  v.box(x, h + 0.1, z, w + 0.5, 0.25, 4.5, "#c4b08d");
  const gear = v.gear(x, h * 0.6, z + 2.2, 1.3, "#d6ac64");
  v.decor.push({ mesh: gear, kind: "gear" });
  v.solids.push({ x, z, r: w * 0.48 });
}
function fountain(v, x, z, scale = 1) {
  const g = v.group(x, 0.2, z);
  g.scale.setScalar(scale);
  v.cylinder(0, 0.25, 0, 1.6, 1.9, 0.5, "#d2c6b7", g);
  v.cylinder(0, 0.52, 0, 1.5, 1.5, 0.05, "#82c5ce", g);
  v.cylinder(0, 1.15, 0, 0.22, 0.4, 1.4, "#d6c9b4", g);
  v.cylinder(0, 1.8, 0, 0.8, 0.7, 0.2, "#d6c9b4", g);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    v.tube(
      [
        [0, 1.9, 0],
        [Math.cos(a) * 0.6, 2.1, Math.sin(a) * 0.6],
        [Math.cos(a) * 1.1, 0.6, Math.sin(a) * 1.1],
      ],
      0.045,
      "#a3d8dc",
      g,
    );
  }
}
function banners(v, x, z, color) {
  v.cylinder(x, 3, z, 0.07, 0.09, 6, "#897d6e");
  const flag = v.box(x + 0.7, 5, z, 1.4, 1.6, 0.05, color);
  v.decor.push({ mesh: flag, kind: "banner" });
}
function stadium(v) {
  slab(v, 0, 0, 63, 41, "#438a6a", "#647e89");
  for (let i = 0; i < 12; i++)
    v.box(
      -19 + i * 3.5,
      0.25,
      -1,
      3.4,
      0.04,
      28,
      i % 2 ? "#5ca374" : "#66aa7a",
      v.root,
      0.01,
    );
  for (const z of [-15, 13]) v.box(1, 0.31, z, 42, 0.025, 0.1, "#eaeed7");
  for (const x of [-20, 22]) v.box(x, 0.31, -1, 0.1, 0.025, 28, "#eaeed7");
  v.box(1, 0.31, -1, 0.08, 0.025, 28, "#eaeed7");
  v.ring(1, 0.34, -1, 4, "#eaeed7");
  buildFootballGoals(v);
  for (const z of [-18, 17])
    for (let row = 0; row < 4; row++) {
      v.box(
        0,
        0.3 + row * 0.6,
        z + Math.sign(z) * row * 0.7,
        54,
        0.55,
        0.8,
        row % 2 ? "#839eac" : "#b0bfca",
      );
      for (let i = 0; i < 45; i++)
        v.sphere(
          -26 + i * 1.2,
          0.95 + row * 0.6,
          z + Math.sign(z) * row * 0.7,
          0.22,
          0.3,
          0.22,
          ["#e4af75", "#abbfe1", "#dcb5cd", "#bddb9d"][i % 4],
        );
    }
  for (const x of [-27, 27])
    for (const z of [-15, 15]) {
      v.cylinder(x, 5, z, 0.13, 0.25, 10, "#6e8994");
      v.box(x, 10, z, 3, 0.65, 0.4, "#dfe7db").material = v.material(
        "#e4eece",
        { emissive: "#dcebb8", emissiveIntensity: 1 },
      );
    }
  v.box(1, 7, -21, 11, 4, 0.8, "#354d62");
  v.box(1, 7, -20.56, 10, 3, 0.04, "#709ca7");
  buildBasketballCourts(v);
}
export function buildExpedition(v, level) {
  v.layout = EXPEDITIONS[level];
  v.waterAreas = [];
  const water = v.mesh(
    new THREE.PlaneGeometry(220, 180),
    level === 3 ? "#786d8e" : v.world.water,
    v.root,
    { roughness: 0.3, metalness: 0.12 },
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -2.4;
  water.castShadow = false;
  if (level === 5) stadium(v);
  else if (level === 2) {
    for (const [x, z, scale] of [
      [-19, 5, 1.1],
      [1, -1, 1.15],
      [22, -8, 1.05],
    ])
      v.island(x, z, scale);
    path(
      v,
      [
        [-25, 9],
        [-16, 7],
        [-6, 1],
        [3, 0],
        [12, -5],
        [22, -10],
      ],
      3,
      "#b0ad79",
    );
    for (const [x, z] of [
      [-10, 4],
      [11, -4],
    ]) {
      const bridge = v.bridge(x, z);
      bridge.rotation.y = Math.PI / 2;
      bridge.scale.z = 1.8;
    }
    for (const [x, z] of [
      [-29, 4],
      [-27, -4],
      [-20, -7],
      [-13, -4],
      [-7, -8],
      [1, -12],
      [9, -10],
      [17, -16],
      [26, -14],
      [30, -7],
      [23, 0],
      [13, 3],
      [4, 10],
      [-7, 10],
      [-19, 14],
    ])
      v.tree(x, z, 1.1 + v.random() * 0.45, Math.floor(v.random() * 3));
    v.tree(23, -14, 2.15, 1);
    for (let i = 0; i < 80; i++) {
      const x = -30 + v.random() * 60,
        z = -15 + v.random() * 30;
      if (Math.abs(z + x * 0.3 - 1) < 2.5) continue;
      const g = v.group(x, 0.2, z);
      v.cylinder(0, 0.3, 0, 0.05, 0.08, 0.6, "#d6c8a9", g);
      v.sphere(0, 0.68, 0, 0.35, 0.18, 0.35, i % 2 ? "#d59391" : "#ba93c8", g);
      v.sphere(-0.1, 0.8, 0.1, 0.05, 0.025, 0.05, "#f4e4cf", g);
    }
    for (const [x, z] of [
      [-23, -2],
      [2, -7],
      [25, -5],
    ])
      fountain(v, x, z, 0.9);
    for (let i = 0; i < 50; i++) {
      const m = v.sphere(
        -27 + v.random() * 56,
        1 + v.random() * 5,
        -13 + v.random() * 22,
        0.05,
        0.05,
        0.05,
        "#e5ddb7",
      );
      m.material = v.material("#eff7bb", {
        emissive: "#c9e6a4",
        emissiveIntensity: 1,
      });
      v.floaters.push({
        mesh: m,
        kind: "mote",
        phase: i,
        base: m.position.clone(),
      });
    }
  } else if (level === 3) {
    slab(v, 0, 0, 59, 37, "#c7c5d8", "#787086");
    for (let x = -28; x < 29; x += 2)
      for (let z = -17; z < 18; z += 2)
        v.box(
          x,
          0.26,
          z,
          1.98,
          0.04,
          1.98,
          ((x + z) / 2) % 2 ? "#c6c7db" : "#ece1d8",
          v.root,
          0.01,
        );
    path(
      v,
      [
        [-24, 12],
        [-18, 2],
        [0, 0],
        [15, -5],
        [22, -10],
      ],
      3.2,
      "#aa7e9b",
    );
    v.box(0, 4.3, -18, 59, 8.6, 0.65, "#bdaec9");
    for (let x = -26; x <= 26; x += 6) {
      v.cylinder(x, 3.4, -15, 0.35, 0.5, 6.8, "#e2d2cc");
      v.cylinder(x, 6.9, -15, 0.65, 0.65, 0.25, "#dabf96");
      arch(v, x, -17.4, 3, "#d7c2af");
    }
    for (const [x, z] of [
      [-22, -7],
      [-8, -8],
      [7, -9],
      [24, -8],
    ]) {
      const mirror = v.mesh(
        new THREE.CircleGeometry(2, 40),
        "#8ab9c3",
        v.root,
        { metalness: 0.65, roughness: 0.14 },
      );
      mirror.position.set(x, 3, -17.5);
      v.mirrors.push({x,y:3,z:-17.5,radius:2});
      v.ring(x, 3, -17.4, 2.15, "#ddc499").rotation.x = 0;
      v.box(x, 0.8, z, 4, 1.5, 1.5, "#9e88a7");
      for (let i = 0; i < 5; i++) {
        v.cylinder(
          x - 1.5 + i * 0.7,
          1.8,
          z,
          0.15,
          0.22,
          0.7,
          ["#a1c9bb", "#dca4c4", "#c4b276"][i % 3],
        );
        v.cylinder(x - 1.5 + i * 0.7, 2.25, z, 0.08, 0.08, 0.2, "#e2c79f");
      }
    }
    fountain(v, -17, 9, 1.15);
    fountain(v, 10, 6, 1.3);
    for (const x of [-11, 11]) {
      const g = v.group(x, 7, -2);
      v.cylinder(0, 0, 0, 1.2, 1.8, 0.4, "#e2cba8", g);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        v.sphere(
          Math.cos(a) * 1.5,
          -0.4,
          Math.sin(a) * 1.5,
          0.12,
          0.4,
          0.12,
          "#f4deab",
          g,
        );
      }
    }
  } else if (level === 1) {
    slab(v, 0, 0, 59, 37, "#acb5a2", "#687a7f");
    path(
      v,
      [
        [-24, 12],
        [-15, 4],
        [0, 2],
        [10, -5],
        [22, -10],
      ],
      4,
      "#cfbea0",
    );
    for (const [x, z, w, h] of [
      [-23, -10, 7, 7],
      [-12, -13, 6, 5],
      [3, -13, 8, 8],
      [17, -15, 8, 6],
      [25, 5, 6, 7],
    ])
      factory(v, x, z, w, h);
    for (const [x, z] of [
      [-18, 9],
      [-4, 9],
      [10, 7],
    ]) {
      v.box(x, 0.6, z, 7, 1, 2.4, "#596f73");
      for (let i = 0; i < 14; i++) {
        const roller = v.cylinder(
          x - 3.2 + i * 0.49,
          1.16,
          z,
          0.2,
          0.2,
          2.2,
          "#b5b09b",
        );
        roller.rotation.x = Math.PI / 2;
      }
      v.tube(
        [
          [x - 3, 1.6, z],
          [x - 3, 3, z],
          [x + 3, 3, z],
          [x + 3, 1.6, z],
        ],
        0.12,
        "#a27655",
      );
    }
    v.tube(
      [
        [-24, 3, -7],
        [-24, 5, -4],
        [-10, 5, -4],
        [-10, 1, -4],
      ],
      0.32,
      "#aeb897",
    );
    for (let x = -25; x < 28; x += 8) {
      lantern(v, x, 15);
      banners(v, x, -17, "#ba8768");
    }
    v.box(8, 7, -15, 0.3, 11, 0.3, "#8b947b");
    v.box(12, 12, -15, 8, 0.25, 0.3, "#bc9866");
    v.tube(
      [
        [15, 12, -15],
        [15, 7, -15],
      ],
      0.035,
      "#615f5c",
    );
    v.box(15, 6.5, -15, 2, 1.3, 1.5, "#ba9674");
  } else if (level === 4) {
    slab(v, 0, 0, 61, 39, "#c0a68c", "#907d84");
    for (const z of [-18, 18]) {
      v.box(0, 1.8, z, 60, 3.6, 1.2, "#ad9397");
      for (let x = -29; x < 30; x += 2)
        v.box(x, 3.9, z, 0.9, 0.7, 1.3, "#c7ada0");
    }
    for (const [x, z] of [
      [-27, -16],
      [-27, 16],
      [27, -16],
      [27, 16],
      [8, -16],
    ]) {
      v.cylinder(x, 3, z, 1.5, 1.9, 6, "#a78d99");
      v.cylinder(x, 6.5, z, 0, 2, 2, "#c88c8f");
      banners(v, x, z, "#d9b369");
    }
    path(
      v,
      [
        [-25, 13],
        [-16, 4],
        [-6, 7],
        [4, 0],
        [14, -7],
        [22, -11],
      ],
      3.5,
      "#e1c8a5",
    );
    for (const [x, z] of [
      [-16, -3],
      [-5, 12],
      [14, 7],
    ]) {
      v.box(x, 0.6, z, 3, 1.1, 2.5, "#bd9cb3", v.root, 0.4);
      v.box(x + 1, 1.5, z, 1.5, 1, 2, "#d5bca1", v.root, 0.3);
    }
    const cat = v.group(-9, 0.3, 2);
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        v.cylinder(x, 0.4, z, 0.5, 0.5, 0.25, "#6e6e71", cat).rotation.z =
          Math.PI / 2;
    v.box(0, 0.7, 0, 2.6, 0.4, 3.2, "#a57c61", cat);
    const arm = v.box(0, 1.5, 0, 0.3, 0.3, 5, "#c7a076", cat);
    arm.rotation.x = -0.4;
    v.cylinder(0, 2.6, -2, 0.8, 0.6, 0.25, "#d0b895", cat);
    v.box(23, 1.1, -13, 4, 2.2, 3, "#d0b28f", v.root, 0.4);
    v.box(23, 3.2, -14, 4, 4, 0.4, "#bd8b9b", v.root, 0.3);
  } else {
    slab(v, 0, 0, 58, 36, "#9aa6bc", "#6c718f");
    const stage = v.cylinder(16, 0.15, -9, 7, 7.5, 0.2, "#b7a6bd");
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4;
      const x = -4 + Math.cos(a) * 8,
        z = -1 + Math.sin(a) * 8;
      v.cylinder(
        x,
        0.15,
        z,
        1.7,
        2,
        0.2,
        ["#c7ae7b", "#9dbd91", "#c5a0c2", "#d1a38e", "#92b7d3"][i],
      );
      v.tube(
        [
          [x, 0.3, z],
          [x / 2, 0.32, z / 2],
          [16, 0.3, -9],
        ],
        0.045,
        "#e9d5a5",
      );
    }
    for (const x of [8, 24]) {
      v.cylinder(x, 4, -15, 0.65, 0.9, 8, "#b4a1c1");
      v.sphere(x, 8.4, -15, 1, 1, 1, "#e1d6ac");
    }
    v.tube(
      [
        [8, 8, -15],
        [16, 10, -15],
        [24, 8, -15],
      ],
      0.3,
      "#c6b6b4",
    );
    path(
      v,
      [
        [-24, 10],
        [-13, 5],
        [-4, 0],
        [7, -5],
        [16, -9],
      ],
      4,
      "#c9bdd1",
    );
    for (let i = 0; i < 40; i++) {
      // Ambient lights must never resemble the gold stars in the collection counter.
      const mote = v.sphere(-28 + v.random() * 56, 5 + v.random() * 8,
        -16 + v.random() * 32, 0.055, 0.055, 0.055, '#c4e5fa');
      mote.material = v.material('#c4e5fa', {emissive:'#91cfee', emissiveIntensity:0.8});
      mote.castShadow = false;
      v.floaters.push({mesh:mote,kind:'mote',base:mote.position.clone(),phase:i});
    }
  }
  if (level !== 2 && level !== 5)
    for (const [x, z] of [
      [-24, 15],
      [-9, 14],
      [6, 13],
      [20, 8],
      [-23, -4],
      [1, -11],
    ])
      lantern(v, x, z);
  dressWorld(v, level);
  v.bake(v.root, [
    ...v.floaters.map((f) => f.mesh),
    ...v.decor.map((d) => d.mesh),
  ]);
}
