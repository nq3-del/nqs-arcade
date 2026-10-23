import * as THREE from "three";

// Original modelled set dressing. Decorative details never obstruct a route.
export function dressWorld(v, level) {
  const flower = (x, z, c) => {
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4,
        p = v.sphere(
          x + Math.sin(a) * 0.13,
          0.31,
          z + Math.cos(a) * 0.13,
          0.12,
          0.035,
          0.18,
          c,
        );
      p.rotation.y = a;
    }
    v.sphere(x, 0.35, z, 0.075, 0.05, 0.075, "#efcb73");
  };
  if (level === 2) {
    const rockGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 210; i++) {
      const x = -31 + v.random() * 62,
        z = -17 + v.random() * 34;
      if (!v.walkable(x, z) || Math.abs(z + x * 0.3 - 1) < 2.2) continue;
      const color = ["#5c9475", "#8ca569", "#b6b576"][i % 3];
      for (let j = 0; j < 3; j++) {
        const leaf = v.sphere(
          x + (j - 1) * 0.18,
          0.34,
          z,
          0.09,
          0.28,
          0.035,
          color,
        );
        leaf.rotation.z = (j - 1) * 0.55;
      }
      if (i % 3 === 0)
        flower(x + 0.3, z + 0.2, ["#e69eae", "#e4c27d", "#b7a5d8"][i % 3]);
      if (i % 7 === 0) {
        const rock = v.mesh(rockGeo, ["#a4b29c", "#c3c5a8"][i % 2]);
        rock.position.set(x, 0.25, z - 0.6);
        rock.scale.set(0.45, 0.35, 0.55);
        rock.rotation.y = i;
      }
    }
    for (let i = 0; i < 90; i++) {
      const x = -37 + v.random() * 74,
        z = -24 + v.random() * 48;
      if (v.walkable(x, z)) continue;
      const lily = v.cylinder(
        x,
        -2.35,
        z,
        0.25 + v.random() * 0.4,
        0.25,
        0.025,
        ["#6b9982", "#a9b481", "#8dac86"][i % 3],
      );
      lily.rotation.y = i;
      if (i % 4 === 0) v.sphere(x, -2.22, z, 0.13, 0.14, 0.13, "#e8bac1");
    }
  }
  if (level === 1) {
    for (const [x, z] of [
      [-18, 9],
      [-4, 9],
      [10, 7],
    ]) {
      for (const side of [-1, 1])
        for (let i = -3; i <= 3; i++) {
          v.sphere(x + i, 0.8, z + side * 1.22, 0.045, 0.045, 0.025, "#d8c5a0");
          const stripe = v.box(
            x + i,
            0.29,
            z + side * 1.7,
            0.12,
            0.025,
            0.65,
            "#d6ad66",
            v.root,
            0.01,
          );
          stripe.rotation.y = -0.4;
        }
      const crate = v.group(x + 4, 0.28, z);
      v.box(0, 0.5, 0, 1, 1, 1, "#b48b61", crate);
      for (const y of [0.16, 0.84])
        v.box(0, y, 0.52, 1.04, 0.12, 0.06, "#dac09a", crate);
      v.box(0, 0.5, 0.54, 0.1, 0.95, 0.05, "#977559", crate).rotation.z = 0.7;
    }
    for (let x = -25; x < 26; x += 2.5)
      for (const z of [14, -8]) {
        v.box(x, 0.25, z, 1.7, 0.015, 0.025, "#75878a", v.root, 0.005);
        v.sphere(x + 0.65, 0.27, z + 0.18, 0.035, 0.012, 0.035, "#d9bc89");
      }
    for (const x of [-16, 0, 14])
      v.tube(
        [
          [x, 0.35, -7],
          [x + 1, 0.35, -5],
          [x + 6, 0.35, -5],
          [x + 7, 0.35, -8],
        ],
        0.045,
        "#687e80",
      );
  }
  if (level === 3) {
    for (const z of [-17.4, 16.8]) {
      v.box(0, 0.31, z, 57, 0.035, 0.12, "#d4ba8c");
      v.box(0, 0.31, z - 0.25, 57, 0.035, 0.04, "#f0d4a4");
    }
    for (let x = -26; x <= 26; x += 6) {
      v.box(x, 1.1, -17.4, 4.6, 1.5, 0.12, "#a893b3");
      for (const side of [-1, 1])
        v.box(x + side * 2.3, 1.1, -17.3, 0.08, 1.6, 0.07, "#e6cda5");
      for (const y of [0.35, 1.85])
        v.box(x, y, -17.3, 4.6, 0.08, 0.07, "#e6cda5");
      v.sphere(x, 1.1, -17.2, 0.18, 0.3, 0.04, "#dfc699");
    }
    for (const [x, z] of [
      [-21, 7],
      [-3, 10],
      [16, 7],
    ]) {
      v.box(x, 0.55, z, 2.8, 0.5, 1.1, "#b889a3", v.root, 0.25);
      for (const dx of [-1, 1])
        v.cylinder(x + dx, 0.3, z, 0.07, 0.09, 0.6, "#d3b58d");
      for (const dx of [-0.7, 0, 0.7])
        v.sphere(x + dx, 0.82, z, 0.045, 0.025, 0.045, "#ead8ad");
    }
  }
  if (level === 4) {
    for (const [x, z] of [
      [-16, -3],
      [-5, 12],
      [14, 7],
    ]) {
      for (const dz of [-1, 1])
        v.tube(
          [
            [x - 1.4, 1.1, z + dz],
            [x, 1.2, z + dz],
            [x + 1.4, 1.1, z + dz],
          ],
          0.025,
          "#e1c3c5",
        );
      for (let i = 0; i < 6; i++)
        v.sphere(x - 1 + i * 0.4, 1.16, z, 0.03, 0.02, 0.03, "#f2dba7");
    }
    for (const z of [-15, 14]) {
      v.tube(
        [
          [-23, 5, z],
          [0, 4, z],
          [23, 5, z],
        ],
        0.025,
        "#e5c996",
      );
      for (let i = 0; i < 17; i++) {
        const x = -22 + i * 2.7,
          y = 4.2 + (Math.abs(x) / 23) * 0.8;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [-0.5, 0, 0, 0.5, 0, 0, 0, -0.8, 0],
            3,
          ),
        );
        geo.computeVertexNormals();
        const flag = v.mesh(
          geo,
          ["#ddac74", "#b98cab", "#8eafb1"][i % 3],
          v.root,
          { side: THREE.DoubleSide },
        );
        flag.position.set(x, y, z);
      }
    }
    for (let i = 0; i < 16; i++) {
      const x = -21 + i * 3,
        z = 11 + Math.sin(i) * 2;
      v.box(
        x,
        0.37,
        z,
        0.5,
        0.18,
        0.4,
        i % 2 ? "#e4c39e" : "#c497b6",
        v.root,
        0.15,
      );
    }
  }
  if (level === 5) {
    for (const [x, z] of [
      [-28, 3],
      [-28, -4],
      [26, 4],
    ]) {
      v.box(x, 0.5, z, 1, 0.9, 1, "#839aa3");
      v.box(x, 0.98, z, 1.1, 0.15, 1.1, "#d7dfca");
      for (let i = 0; i < 3; i++)
        v.cylinder(
          x - 0.3 + i * 0.3,
          1.2,
          z,
          0.08,
          0.08,
          0.35,
          ["#e6b371", "#c5b8d5", "#9dcac3"][i],
        );
    }
    for (const side of [-1, 1]) {
      v.box(side * 25, 1.4, -19, 4, 1, 0.1, "#c7b374");
      for (let i = 0; i < 4; i++)
        v.box(
          side * 25 - 1.3 + i * 0.8,
          1.4,
          -18.93,
          0.12,
          0.65,
          0.05,
          "#f1dfaa",
        );
    }
  }
  if (level === 6) {
    for (const r of [5.6, 6.4]) v.ring(16, 0.28, -9, r, "#dfc698");
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI) / 9;
      v.sphere(
        16 + Math.sin(a) * 6,
        0.3,
        -9 + Math.cos(a) * 6,
        0.09,
        0.04,
        0.09,
        "#e9d9b1",
      );
    }
    for (let i = 0; i < 65; i++) {
      const x = -28 + v.random() * 55,
        z = -17 + v.random() * 33;
      v.sphere(x, 0.25, z, 0.025, 0.015, 0.025, "#e8d5ae");
    }
  }
}
