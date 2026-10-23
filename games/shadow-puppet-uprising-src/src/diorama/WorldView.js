import * as THREE from "three";
import { glamourTexture } from "./GlamourEffects.js";
import { MAYHEM_ARENA, buildMayhemArena } from "./MayhemArena.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DIORAMAS } from "../data/dioramas.js";
import { buildExpedition } from "./WorldScenery.js";
import { buildBasketball, buildBasketballFire, buildFootball, buildLeBron } from './BasketballModels.js';
import { stadiumColliders, sportsBlocked } from './SportsCollisions.js';

const Y = new THREE.Vector3(0, 1, 0);
const palette = {
  cream: "#f5e6c9",
  wood: "#916d50",
  ink: "#344347",
  pink: "#d15b77",
  gold: "#e8b754",
};
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export class WorldView {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.canvas = this.renderer.domElement;
    this.canvas.id = "diorama-canvas";
    this.canvas.setAttribute(
      "aria-label",
      "A living three-dimensional storybook world",
    );
    document.querySelector("#game").appendChild(this.canvas);
    this.camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 130);
    this.look = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(18, 23, 26);
    this.shotOffset = this.cameraOffset.clone();
    this.baseZoom = 1;
    this.materials = new Map();
    this.geometry = new Map();
    this.particles = [];
    this.floaters = [];
    this.actors = [];
    this.decor = [];
    this.elapsed = 0;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(document.querySelector("#game"));
    this.resize();
  }
  resize() {
    const box = document.querySelector("#game").getBoundingClientRect();
    const width = Math.max(1, box.width),
      height = Math.max(1, box.height);
    this.renderer.setSize(width, height, false);
    this.camera.left = (-10 * width) / height;
    this.camera.right = (10 * width) / height;
    this.camera.top = 10;
    this.camera.bottom = -10;
    this.camera.updateProjectionMatrix();
  }
  material(color, options = {}) {
    const key = color + JSON.stringify(options);
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.86,
          metalness: 0,
          ...options,
        }),
      );
    return this.materials.get(key);
  }
  mesh(geo, color, parent = this.root, options = {}) {
    const m = new THREE.Mesh(geo, this.material(color, options));
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  sphere(x, y, z, sx, sy, sz, color, parent = this.root) {
    let geo = this.geometry.get("sphere");
    if (!geo) {
      geo = new THREE.SphereGeometry(1, 16, 12);
      this.geometry.set("sphere", geo);
    }
    const m = this.mesh(geo, color, parent);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }
  box(x, y, z, w, h, d, color, parent = this.root, r = 0.12) {
    const key = `box${w},${h},${d},${r}`;
    if (!this.geometry.has(key))
      this.geometry.set(
        key,
        new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)),
      );
    const m = this.mesh(this.geometry.get(key), color, parent);
    m.position.set(x, y, z);
    return m;
  }
  cylinder(x, y, z, rt, rb, h, color, parent = this.root) {
    const m = this.mesh(
      new THREE.CylinderGeometry(rt, rb, h, 20),
      color,
      parent,
    );
    m.position.set(x, y, z);
    return m;
  }
  tube(points, r, color, parent = this.root) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return this.mesh(
      new THREE.TubeGeometry(curve, 16, r, 8, false),
      color,
      parent,
    );
  }
  ring(x, y, z, r, color, parent = this.root) {
    const m = this.mesh(
      new THREE.TorusGeometry(r, 0.045, 7, 36),
      color,
      parent,
      { emissive: color, emissiveIntensity: 0.3 },
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    return m;
  }
  group(x = 0, y = 0, z = 0, parent = this.root) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }
  bake(group, excluded = []) {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const skip = new Set(excluded);
    const batches = new Map();
    group.traverse((m) => {
      if (!m.isMesh || m.isInstancedMesh || Array.isArray(m.material)) return;
      let node = m;
      while (node && node !== group) {
        if (skip.has(node)) return;
        node = node.parent;
      }
      const key = m.material.uuid + ":" + m.castShadow + ":" + m.receiveShadow;
      const batch = batches.get(key) || {
        material: m.material,
        cast: m.castShadow,
        receive: m.receiveShadow,
        meshes: [],
      };
      batch.meshes.push(m);
      batches.set(key, batch);
    });
    for (const batch of batches.values()) {
      if (batch.meshes.length < 2) continue;
      const parts = batch.meshes.map((m) => {
        const geo = m.geometry.index
          ? m.geometry.toNonIndexed()
          : m.geometry.clone();
        for (const attr of Object.keys(geo.attributes))
          if (!["position", "normal", "uv"].includes(attr))
            geo.deleteAttribute(attr);
        if (!geo.attributes.uv)
          geo.setAttribute(
            "uv",
            new THREE.BufferAttribute(
              new Float32Array(geo.attributes.position.count * 2),
              2,
            ),
          );
        return geo.applyMatrix4(inverse.clone().multiply(m.matrixWorld));
      });
      const geo = mergeGeometries(parts);
      parts.forEach((p) => p.dispose());
      if (!geo) continue;
      batch.meshes.forEach((m) => m.removeFromParent());
      const merged = new THREE.Mesh(geo, batch.material);
      merged.castShadow = batch.cast;
      merged.receiveShadow = batch.receive;
      group.add(merged);
    }
  }
  load(level = 0, menu = false, mayhem = false) {
    if (this.scene) {
      const cached = new Set(this.geometry.values());
      const disposed = new Set();
      this.scene.traverse((o) => {
        if (
          o.geometry &&
          !cached.has(o.geometry) &&
          !disposed.has(o.geometry)
        ) {
          o.geometry.dispose();
          disposed.add(o.geometry);
        }
        if(o.userData.ownMaterial)o.material?.dispose();
        o.shadow?.map?.dispose();
      });
      this.renderer.renderLists.dispose();
    }
    this.scene = new THREE.Scene();
    this.world = mayhem ? MAYHEM_ARENA : DIORAMAS[level];
    this.menu = menu;
    this.scene.background = new THREE.Color(this.world.sky);
    this.scene.fog = new THREE.Fog(this.world.sky, 45, 100);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.particles = [];
    this.floaters = [];
    this.actors = [];
    this.decor = [];
    this.solids = [];
    this.mirrors = [];
    this.sportsColliders = level === 5 && !menu ? stadiumColliders() : [];
    this.layout = null;
    this.elapsed = 0;
    this.random = rng(44 + level * 773);
    this.look.set(0, 0, 0);
    this.camera.zoom = menu ? 1.15 : 1.05;
    this.camera.updateProjectionMatrix();
    const hemi = new THREE.HemisphereLight("#fff3d9", "#6d9081", 1.8);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight("#fff0d3", 2.8);
    sun.position.set(-13, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 70;
    sun.shadow.normalBias = 0.06;
    sun.shadow.bias = -0.0003;
    sun.shadow.radius = 5;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight("#d4e3ef", 0.65);
    rim.position.set(18, 10, -20);
    this.scene.add(rim);
    if (mayhem) {
      buildMayhemArena(this);
    } else if (level > 0 && !menu) {
      buildExpedition(this, level);
      sun.position.set(-30, 45, 20);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -45;
      sun.shadow.camera.right = sun.shadow.camera.top = 45;
      sun.shadow.camera.far = 130;
      sun.shadow.camera.updateProjectionMatrix();
    } else {
      this.buildTerrain();
      this.buildGarden();
      this.bridge(-3, 3);
      this.cottage(-6, -6, level);
      this.bake(this.root, [
        ...this.floaters.map((f) => f.mesh),
        ...this.decor.map((d) => d.mesh),
      ]);
    }
    this.portal = this.makePortal(...(this.world.portal || [11, -8]));
    this.portal.visible = level === 0 || menu;
    this.camera.position.copy(this.look).add(this.cameraOffset);
    this.camera.lookAt(this.look);
    this.render(0);
  }
  island(x, z, scale = 1) {
    const points = [
      [-13, 4],
      [-11, 9],
      [-4, 11],
      [4, 10],
      [11, 7],
      [14, 1],
      [12, -7],
      [7, -11],
      [-2, -12],
      [-10, -8],
      [-14, -2],
    ];
    const shape = new THREE.Shape();
    points.forEach(([px, pz], i) => {
      const n = points[(i + 1) % points.length],
        mid = [(px + n[0]) / 2, (pz + n[1]) / 2];
      if (i === 0)
        shape.moveTo((points.at(-1)[0] + px) / 2, -(points.at(-1)[1] + pz) / 2);
      shape.quadraticCurveTo(px, -pz, mid[0], -mid[1]);
    });
    shape.closePath();
    const g = this.group(x, -2.1, z);
    g.scale.setScalar(scale);
    const ground = new THREE.ExtrudeGeometry(shape, {
      depth: 2,
      steps: 1,
      bevelEnabled: true,
      bevelSize: 0.45,
      bevelThickness: 0.28,
      bevelSegments: 3,
    });
    ground.rotateX(-Math.PI / 2);
    this.mesh(ground, this.world.earth, g);
    const cap = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      steps: 1,
      bevelEnabled: true,
      bevelSize: 0.34,
      bevelThickness: 0.12,
      bevelSegments: 3,
    });
    cap.rotateX(-Math.PI / 2);
    const grass = this.mesh(cap, this.world.grass, g);
    grass.position.y = 2.1;
    return g;
  }
  buildTerrain() {
    this.island(0, 0);
    const water = this.mesh(
      new THREE.PlaneGeometry(150, 150),
      this.world.water,
      this.root,
      { roughness: 0.28, metalness: 0.17 },
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.5;
    water.receiveShadow = true;
    water.castShadow = false;
    for (const [x, z, s] of [
      [-23, -19, 0.5],
      [23, -23, 0.5],
      [-26, 13, 0.35],
      [22, 16, 0.4],
    ])
      this.island(x, z, s);
    // A shallow winding brook across the glade; the wooden bridge is a real crossing.
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-15, 0.3, 5),
      new THREE.Vector3(-8, 0.3, 4.1),
      new THREE.Vector3(-3, 0.3, 3),
      new THREE.Vector3(4, 0.3, 1.8),
      new THREE.Vector3(13, 0.3, 0.2),
    ]);
    const vertices = [],
      indices = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60,
        p = path.getPoint(t),
        tangent = path.getTangent(t),
        side = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(1.05);
      vertices.push(
        p.x + side.x,
        p.y,
        p.z + side.z,
        p.x - side.x,
        p.y,
        p.z - side.z,
      );
      if (i < 60) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const stream = this.mesh(geo, this.world.water, this.root, {
      side: THREE.DoubleSide,
      roughness: 0.28,
      metalness: 0.14,
    });
    stream.castShadow = false;
    for (let i = 0; i < 35; i++) {
      const p = path.getPoint(this.random());
      const rock = this.sphere(
        p.x + (this.random() - 0.5) * 2.8,
        0.18,
        p.z + (this.random() - 0.5) * 2.5,
        0.25 + this.random() * 0.4,
        0.15 + this.random() * 0.22,
        0.2 + this.random() * 0.4,
        ["#b0b4a5", "#d9d3b8", "#899d96"][i % 3],
      );
      rock.rotation.y = this.random() * 6;
    }
    for (let i = 0; i < 18; i++) {
      const p = path.getPoint(i / 18);
      const ripple = this.ring(
        p.x,
        0.32,
        p.z,
        0.2 + this.random() * 0.4,
        "#b4dcda",
      );
      ripple.material = this.material("#b4dcda", {
        transparent: true,
        opacity: 0.35,
      });
      ripple.castShadow = false;
      this.floaters.push({ mesh: ripple, kind: "ripple", phase: i });
    }
    // Stepping-stone path runs around the brook and into the upper clearing.
    const route = [
      [-9, 6],
      [-6, 4.8],
      [-3, 3],
      [-1, 0.2],
      [2, -1],
      [5, -3],
      [8, -5],
      [10, -7],
    ];
    for (let j = 0; j < route.length - 1; j++) {
      for (let i = 0; i < 5; i++) {
        const t = i / 5,
          x = THREE.MathUtils.lerp(route[j][0], route[j + 1][0], t),
          z = THREE.MathUtils.lerp(route[j][1], route[j + 1][1], t);
        if (Math.abs(x + 3) < 1.3 && z > 1 && z < 5) continue;
        const stone = this.sphere(
          x,
          0.16,
          z,
          0.4 + this.random() * 0.25,
          0.11,
          0.32 + this.random() * 0.2,
          "#e2d7b4",
        );
        stone.rotation.y = this.random() * 3;
      }
    }
    for (let i = 0; i < 45; i++) {
      const x = (this.random() - 0.5) * 70,
        z = (this.random() - 0.5) * 60;
      if (Math.abs(x) < 15 && Math.abs(z) < 13) continue;
      const lily = this.cylinder(
        x,
        -1.44,
        z,
        0.3 + this.random() * 0.4,
        0.3,
        0.04,
        ["#84ac91", "#99b999", "#b0c6a0"][i % 3],
      );
      lily.castShadow = false;
    }
    this.box(0, 0.35, 1, 1.8, 0.55, 1.5, "#9eae85");
    for (const [x, z] of [
      [-12, 6],
      [-13, 2],
      [-10, 9],
      [12, 4],
      [9, 8],
      [13, -3],
      [-7, -11],
    ]) {
      for (let i = 0; i < 3; i++) {
        const rock = this.mesh(
          new THREE.DodecahedronGeometry(1, 0),
          ["#8d9f99", "#a9b1a1", "#c7c7ad"][i],
        );
        rock.position.set(
          x + this.random() * 1.3,
          -0.3 - i * 0.25,
          z + this.random(),
        );
        rock.scale.set(
          1.3 + this.random(),
          0.65 + this.random() * 0.45,
          1 + this.random(),
        );
        rock.rotation.y = this.random() * 3;
      }
    }
    const fall = this.mesh(
      new THREE.PlaneGeometry(1.8, 1.85),
      "#8ac7cb",
      this.root,
      { transparent: true, opacity: 0.8, side: THREE.DoubleSide },
    );
    fall.position.set(13.25, -0.55, 0.22);
    fall.rotation.y = Math.PI / 2;
    fall.castShadow = false;
    for (let i = 0; i < 12; i++) {
      const foam = this.sphere(
        13.3 + this.random() * 0.6,
        -1.35,
        0.2 + (this.random() - 0.5) * 2,
        0.18,
        0.08,
        0.25,
        "#d5e7dd",
      );
      foam.castShadow = false;
    }
  }
  buildGarden() {
    const treePositions = [
      [-11, -1],
      [-11, -7],
      [-7, -10],
      [-1, -10],
      [5, -10],
      [12, -8],
      [13, -2],
      [12, 5],
      [8, 9],
      [-8, 9],
      [-13, 4],
      [-24, -19],
      [23, -23],
      [23, 16],
    ];
    treePositions.forEach(([x, z], i) =>
      this.tree(
        x,
        z,
        z > 4 && Math.abs(x) < 15
          ? 0.55 + this.random() * 0.2
          : 0.8 + this.random() * 0.35,
        i,
      ),
    );
    // Instanced petals give the garden detail without hundreds of draw calls.
    const count = 850,
      petals = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 7, 5),
        this.material("#ffffff"),
        count,
      );
    const dummy = new THREE.Object3D();
    const colors = ["#e8ce91", "#e4a4b0", "#d98c90", "#d9dea4", "#87a77c"];
    let index = 0;
    for (let i = 0; i < 170; i++) {
      const x = (this.random() - 0.5) * 25,
        z = (this.random() - 0.5) * 18;
      if (
        (x * x) / 169 + (z * z) / 100 > 0.95 ||
        Math.abs(z - (2.5 - x * 0.13)) < 1.3 ||
        Math.abs(x + z) < 2
      )
        continue;
      const scale = 0.12 + this.random() * 0.13;
      for (let p = 0; p < 5 && index < count; p++) {
        const a = p * Math.PI * 0.4;
        dummy.position.set(
          x + Math.cos(a) * scale,
          0.22,
          z + Math.sin(a) * scale,
        );
        dummy.scale.set(scale, 0.07, scale * 0.55);
        dummy.rotation.y = a;
        dummy.updateMatrix();
        petals.setMatrixAt(index, dummy.matrix);
        petals.setColorAt(index, new THREE.Color(colors[i % 5]));
        index++;
      }
    }
    petals.count = index;
    petals.receiveShadow = true;
    petals.castShadow = false;
    this.root.add(petals);
    for (let i = 0; i < 24; i++) {
      const x = (this.random() - 0.5) * 25,
        z = (this.random() - 0.5) * 20;
      if (
        (x * x) / 180 + (z * z) / 125 > 1 ||
        Math.abs(x + z) < 3 ||
        Math.abs(z - (2.5 - x * 0.13)) < 1.4
      )
        continue;
      this.sphere(
        x,
        0.35,
        z,
        0.4 + this.random() * 0.5,
        0.3 + this.random() * 0.3,
        0.45,
        this.world.foliage[i % 3],
      );
    }
    for (let i = 0; i < 28; i++) {
      const m = this.sphere(
        (this.random() - 0.5) * 25,
        1 + this.random() * 5,
        (this.random() - 0.5) * 20,
        0.025,
        0.025,
        0.025,
        "#fff0be",
      );
      m.material = this.material("#fff3c6", {
        emissive: "#ffdf9b",
        emissiveIntensity: 1.5,
      });
      m.castShadow = false;
      this.floaters.push({
        mesh: m,
        kind: "mote",
        phase: i * 1.4,
        base: m.position.clone(),
      });
    }
    for (const [x, z, s] of [
      [-10, 7, 0.8],
      [-8, 8, 1],
      [-6, 7, 0.6],
      [8, 6, 1],
      [10, 3, 0.75],
      [11, 1, 0.6],
      [-8, -3, 0.65],
      [-1, -8, 0.8],
      [4, -8, 0.8],
    ])
      this.flower(x, z, s);
  }
  flower(x, z, scale = 1) {
    const g = this.group(x, 0.2, z);
    g.scale.setScalar(scale);
    this.cylinder(0, 0.45, 0, 0.035, 0.045, 0.9, "#658d66", g);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const petal = this.sphere(
        Math.cos(a) * 0.28,
        0.9,
        Math.sin(a) * 0.28,
        0.29,
        0.11,
        0.14,
        i % 2 ? "#d6a7b7" : "#e6bdc3",
        g,
      );
      petal.rotation.y = -a;
    }
    this.sphere(0, 0.98, 0, 0.15, 0.1, 0.15, "#e2ca7b", g);
    for (const side of [-1, 1]) {
      const leaf = this.sphere(
        side * 0.2,
        0.35,
        0,
        0.3,
        0.07,
        0.12,
        "#82a271",
        g,
      );
      leaf.rotation.z = side * 0.45;
    }
    return g;
  }
  floorHeight(x, z) {
    if (this.layout) return 0;
    return Math.abs(x) < 0.9 && Math.abs(z - 1) < 0.75 ? 0.48 : 0;
  }
  tree(x, z, scale, index = 0) {
    const g = this.group(x, 0, z);
    g.scale.setScalar(scale);
    this.cylinder(0, 1.25, 0, 0.22, 0.42, 2.5, "#89775d", g);
    this.tube(
      [
        [0, 0.8, 0],
        [0.6, 2, 0],
        [1, 2.6, 0.2],
      ],
      0.13,
      "#89775d",
      g,
    );
    const shades = this.world.foliage;
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399;
      const branch = this.sphere(
        Math.cos(a) * 0.95,
        2.6 + (i % 3) * 0.55,
        Math.sin(a) * 0.8,
        1.35,
        1.03,
        1.23,
        shades[(index + i) % 3],
        g,
      );
      branch.rotation.z = 0.1 * Math.sin(i);
    }
    this.solids.push({ x, z, r: 0.65 });
    return g;
  }
  bridge(x, z) {
    const g = this.group(x, 0.18, z);
    for (let i = 0; i < 12; i++) {
      const b = this.box(
        0,
        0.1 + (1 - Math.abs(i - 5.5) / 5.5) * 0.18,
        (i - 5.5) * 0.39,
        2.5,
        0.16,
        0.34,
        i % 3 ? "#c0a47c" : "#dcc49a",
        g,
        0.05,
      );
      b.rotation.z = (this.random() - 0.5) * 0.025;
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++)
        this.cylinder(
          side * 1.15,
          0.65,
          (i - 1) * 1.85,
          0.065,
          0.09,
          1.2,
          "#8f745a",
          g,
        );
      this.tube(
        [
          [side * 1.15, 1.1, -1.85],
          [side * 1.15, 0.95, 0],
          [side * 1.15, 1.1, 1.85],
        ],
        0.045,
        "#ac9471",
        g,
      );
    }
    return g;
  }
  cottage(x, z, level) {
    const g = this.group(x, 0, z);
    g.rotation.y = 0.3;
    this.box(
      0,
      1.2,
      0,
      3.3,
      2.4,
      2.7,
      level === 3 ? "#dfd4dd" : "#e0c89c",
      g,
      0.35,
    );
    this.box(0, 0.15, 0, 3.7, 0.4, 3.1, "#9b9d85", g, 0.2);
    // Two pitched roof planes, overlapping clay shingles, and a little chimney.
    for (const side of [-1, 1]) {
      const roof = this.box(
        side * 0.99,
        2.85,
        0,
        2.65,
        0.2,
        3.5,
        "#ac7960",
        g,
        0.1,
      );
      roof.rotation.z = side * -0.58;
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 7; col++) {
          const tile = this.box(
            side * (0.25 + row * 0.52),
            3.42 - row * 0.34,
            -1.45 + col * 0.48,
            0.67,
            0.13,
            0.55,
            ["#d4ae87", "#cfa091", "#e0c1a1", "#a9b3a1"][
              (row + col + level) % 4
            ],
            g,
            0.09,
          );
          tile.rotation.z = side * -0.58;
        }
    }
    this.box(0.8, 3.5, -0.6, 0.52, 1.1, 0.65, "#b7856a", g, 0.08);
    this.box(0.8, 4.08, -0.6, 0.65, 0.2, 0.77, "#cba283", g, 0.05);
    this.box(0, 1, 1.42, 1.05, 1.85, 0.12, "#8f7552", g, 0.3);
    this.ring(0, 1.25, 1.53, 0.28, "#ba9a68", g).rotation.x = 0;
    this.sphere(0.28, 1, 1.55, 0.06, 0.06, 0.06, "#e2c88e", g);
    for (const side of [-1, 1]) {
      const window = this.box(
        side * 1.08,
        1.55,
        1.4,
        0.56,
        0.68,
        0.14,
        "#78a7a5",
        g,
        0.17,
      );
      this.box(side * 1.08, 1.55, 1.51, 0.06, 0.67, 0.04, "#e5d3a8", g);
      this.box(side * 1.08, 1.55, 1.51, 0.55, 0.06, 0.04, "#e5d3a8", g);
    }
    this.box(0, 0.13, 2, 1.7, 0.22, 0.8, "#c3bea2", g, 0.12);
    this.solids.push({ x, z, r: 2 });
    return g;
  }
  buildLandmark(level) {
    if (level === 1) {
      for (const [x, z] of [
        [5, -8],
        [10, -8],
      ]) {
        this.box(x, 1.5, z, 2, 3, 2, "#a4aaa1");
        this.cylinder(x, 3.2, z, 1.3, 1.3, 0.3, "#b9ab88");
        const gear = this.gear(x, 2.2, z + 1.05, 1, "#d1af78");
        this.decor.push({ mesh: gear, kind: "gear" });
      }
      this.tube(
        [
          [5, 3.6, -8],
          [7, 4, -8],
          [10, 3.6, -8],
        ],
        0.14,
        "#8ba5a0",
      );
    }
    if (level === 2) {
      for (let i = 0; i < 18; i++) {
        const m = this.sphere(
          3 + this.random() * 8,
          0.6 + this.random() * 2,
          -3 - this.random() * 5,
          0.2,
          0.2,
          0.2,
          "#c9e6e0",
        );
        m.material = this.material("#c4e6e4", {
          transparent: true,
          opacity: 0.4,
          roughness: 0.08,
          metalness: 0.2,
        });
        this.floaters.push({
          mesh: m,
          kind: "mote",
          phase: i,
          base: m.position.clone(),
        });
      }
    }
    if (level === 3) {
      for (const x of [5, 11]) {
        this.cylinder(x, 2, -8, 0.8, 0.9, 4, "#d5c7d5");
        this.sphere(x, 4.2, -8, 1, 0.5, 1, "#c194b3");
        this.cylinder(x, 4.8, -8, 0, 0.75, 1.2, "#e4c0cd");
      }
      this.box(8, 2.7, -9, 5, 4.5, 0.65, "#d7cbd7");
      const mirror = this.mesh(new THREE.CircleGeometry(1.25, 32), "#a7c8cd");
      mirror.position.set(8, 3, -8.62);
      this.mirrors.push({x:8,y:3,z:-8.62,radius:1.25});
      this.ring(8, 3, -8.57, 1.35, "#e0cda3").rotation.x = 0;
    }
    if (level === 4 || level === 6) {
      for (const x of [4.6, 11.3]) {
        this.cylinder(
          x,
          1.7,
          -8.4,
          1,
          1.1,
          3.4,
          level === 4 ? "#b6918b" : "#aaa4bd",
        );
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          this.box(
            x + Math.cos(a) * 0.8,
            3.6,
            -8.4 + Math.sin(a) * 0.8,
            0.5,
            0.6,
            0.5,
            "#d6b3a2",
          );
        }
        const flag = this.box(
          x + 0.6,
          4.1,
          -8.4,
          1.1,
          0.7,
          0.06,
          level === 4 ? "#d7a08e" : "#c1b6d3",
        );
        this.cylinder(x, 3.9, -8.4, 0.035, 0.035, 1.7, "#bdb9ac");
      }
      this.box(8, 1, -9.2, 5.6, 2.1, 1, "#b5a7b3");
    }
    if (level === 5) {
      const field = this.box(
        7.5,
        0.15,
        -5,
        10,
        0.1,
        7,
        "#8cba8c",
        this.root,
        0.2,
      );
      for (const z of [-8, -2])
        this.box(7.5, 0.22, z, 9, 0.03, 0.04, "#eff1d3");
      for (const x of [3, 12]) this.box(x, 0.22, -5, 0.04, 0.03, 6, "#eff1d3");
      this.ring(7.5, 0.23, -5, 1.3, "#e6edc9");
      this.tube(
        [
          [5, 0, -8],
          [5, 2, -8],
          [9, 2, -8],
          [9, 0, -8],
        ],
        0.07,
        "#f0eddb",
      );
      for (let i = 0; i < 4; i++)
        this.box(
          7,
          0.4 + i * 0.45,
          -9.5 - i * 0.5,
          9,
          0.3,
          0.6,
          ["#a9bec6", "#c7ccd0"][i % 2],
        );
    }
  }
  gear(x, y, z, r, color) {
    const g = this.group(x, y, z);
    const m = this.mesh(new THREE.TorusGeometry(r, 0.17, 8, 24), color, g);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const tooth = this.box(
        Math.cos(a) * (r + 0.08),
        Math.sin(a) * (r + 0.08),
        0,
        0.3,
        0.3,
        0.25,
        color,
        g,
        0.035,
      );
      tooth.rotation.z = a;
    }
    this.cylinder(0, 0, 0, 0.2, 0.2, 0.2, color, g).rotation.x = Math.PI / 2;
    return g;
  }
  makePortal(x, z) {
    const g = this.group(x, 0.3, z);
    this.cylinder(0, 0.1, 0, 1.4, 1.65, 0.25, "#b0b69a", g);
    const arch = this.mesh(
      new THREE.TorusGeometry(1.25, 0.2, 10, 48, Math.PI),
      "#c1b894",
      g,
    );
    arch.position.y = 1.45;
    arch.rotation.z = 0;
    for (const side of [-1, 1])
      this.cylinder(side * 1.25, 0.8, 0, 0.18, 0.25, 1.5, "#c1b894", g);
    const membrane = this.mesh(
      new THREE.CircleGeometry(1.12, 40),
      "#bde5d5",
      g,
      {
        transparent: true,
        opacity: 0.42,
        emissive: "#8cdcc5",
        emissiveIntensity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      },
    );
    membrane.position.y = 1.5;
    this.floaters.push({ mesh: membrane, kind: "portal", phase: 0 });
    g.rotation.y = 0.45;
    return g;
  }
  basketball(x, y, z, flaming = false) { return buildBasketball(this, x, y, z, flaming); }
  basketballFire(x, z, radius) { return buildBasketballFire(this, x, z, radius); }
  lebronJames() { return buildLeBron(this); }
  stephCurry() { return buildLeBron(this, true); }
  viniJr() { return buildLeBron(this, false, true); }
  football(x,y,z,flaming=false) { return buildFootball(this,x,y,z,flaming); }
  hyperBeam(start, end) {
    const root = this.group(start.x, start.y, start.z), direction = end.clone().sub(start);
    const length = direction.length();
    root.quaternion.setFromUnitVectors(Y, direction.normalize());
    for (const [radius, color, opacity] of [[1.35, '#087dff', 0.28], [0.9, '#28d6ff', 0.6], [0.46, '#e5ffff', 1]]) {
      const ray = this.mesh(new THREE.CylinderGeometry(radius, radius * 0.6, length, 24), color, root,
        { emissive: color, emissiveIntensity: 2, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
      ray.position.y = length / 2; ray.castShadow = false;
    }
    const charge = this.sphere(0, 0, 0, 0.7, 0.7, 0.7, '#c2ffff', root);
    charge.material = this.material('#c2ffff', { emissive: '#2ddbff', emissiveIntensity: 2 });
    root.name = 'hyper-goku-blue-beam';
    return root;
  }
  superGoku(hyper = false) {
    const root = this.group(), body = this.group(0, 0, 0, root);
    const rig = { arms: [], legs: [], stalks: [] };
    const orange = '#f77c21', blue = '#193c93', skin = '#f1b887', gold = hyper ? '#26c7ff' : '#ffd847';
    // Orange gi, blue undershirt/belt/boots, turquoise eyes and swept golden spikes.
    this.box(0, 1.25, 0, 0.92, 0.9, 0.48, orange, body);
    this.box(0, 1.58, 0.25, 0.5, 0.22, 0.06, blue, body);
    this.box(0, 0.92, 0, 0.98, 0.16, 0.54, blue, body);
    this.box(0.17, 0.7, 0.3, 0.13, 0.4, 0.07, blue, body);
    this.sphere(0, 2.03, 0, 0.43, 0.5, 0.36, skin, body);
    for (const side of [-1, 1]) {
      const leg = this.group(side * 0.26, 0.82, 0, body);
      rig.legs.push(leg);
      this.box(0, -0.24, 0, 0.4, 0.54, 0.43, orange, leg);
      this.box(0, -0.64, 0.06, 0.35, 0.3, 0.54, blue, leg);
      this.box(0, -0.51, 0.27, 0.26, 0.06, 0.04, '#efb345', leg);
      const arm = this.group(side * 0.65, 1.55, 0, body);
      rig.arms.push(arm);
      this.sphere(0, -0.08, 0, 0.23, 0.25, 0.24, orange, arm);
      this.box(0, -0.33, 0, 0.24, 0.38, 0.28, skin, arm);
      this.box(0, -0.54, 0, 0.26, 0.14, 0.29, blue, arm);
      this.sphere(0, -0.68, 0.04, 0.17, 0.17, 0.16, skin, arm);
      this.box(side * 0.17, 2.08, 0.337, 0.2, 0.075, 0.04, '#fffdf1', body, 0.015);
      this.box(side * 0.15, 2.08, 0.364, 0.065, 0.075, 0.025, '#23c9b1', body, 0.005);
      const brow = this.box(side * 0.17, 2.18, 0.34, 0.24, 0.065, 0.055, gold, body, 0.015);
      brow.rotation.z = side * 0.18;
      this.sphere(side * 0.43, 2, 0, 0.09, 0.15, 0.1, skin, body);
    }
    this.sphere(0, 2.36, -0.06, 0.47, 0.22, 0.36, gold, body);
    for (let i = 0; i < 9; i++) {
      const angle = (i - 4) * 0.22;
      const spike = this.mesh(new THREE.ConeGeometry(0.18, 0.85 + (i % 3) * 0.16, 4), gold, body,
        { emissive: hyper ? '#079dff' : '#ffc52d', emissiveIntensity: hyper ? 0.9 : 0.22 });
      spike.position.set(Math.sin(angle) * 0.4, 2.68 + Math.cos(angle) * 0.06, i % 2 ? -0.17 : 0.02);
      spike.rotation.z = -angle * 0.85;
    }
    this.box(0, 1.84, 0.34, 0.16, 0.025, 0.025, '#ad6348', body, 0.005);
    this.bake(body, [...rig.legs, ...rig.arms]);
    for (const limb of [...rig.legs, ...rig.arms]) this.bake(limb);
    const aura = this.mesh(new THREE.SphereGeometry(1, 20, 16), hyper ? '#159fff' : '#ffe35b', root,
      { transparent: true, opacity: hyper ? 0.19 : 0.12, emissive: gold, emissiveIntensity: 1, depthWrite: false });
    aura.position.y = 1.45;
    aura.scale.set(1.1, 1.9, 0.9);
    aura.castShadow = false;
    if (hyper) for (let i = 0; i < 20; i++) {
      const angle = i * Math.PI * 2 / 20, height = 0.9 + (i % 4) * 0.53;
      const spike = this.mesh(new THREE.ConeGeometry(0.17 + (i % 2) * 0.06, 1 + (i % 3) * 0.35, 3), '#37cfff', root,
        { emissive: '#058dff', emissiveIntensity: 1.6, transparent: true, opacity: 0.65, depthWrite: false });
      spike.position.set(Math.cos(angle) * 0.95, height, Math.sin(angle) * 0.75);
      spike.quaternion.setFromUnitVectors(Y, new THREE.Vector3(Math.cos(angle) * 0.65, 1, Math.sin(angle) * 0.65).normalize());
      spike.castShadow = false;
    }
    root.scale.setScalar(0.85);
    const model = { root, body, rig, kind: hyper ? 'hyper-goku' : 'super-goku', baseScale: 0.85 };
    root.userData.actor = model;
    this.actors.push(model);
    return model;
  }
  handsomeSquidward() {
    const root=this.group(),body=this.group(0,0,0,root),rig={legs:[],arms:[],stalks:[]};
    for(const side of [-1,1]) {
      const leg=this.group(side*.27,.62,0,body);rig.legs.push(leg);
      this.cylinder(0,-.22,0,.12,.17,.55,'#74b7ae',leg);
      this.box(side*.12,-.48,.1,.42,.16,.4,'#74b7ae',leg);
    }
    const portrait=this.glamourPortrait();body.add(portrait);
    portrait.position.set(0,1.65,0);portrait.scale.set(2.3,2.3,1);
    portrait.material.depthTest=true;portrait.renderOrder=2;
    const model={root,body,rig,kind:'handsome-squidward'};
    portrait.userData.ownMaterial=true;
    root.userData.actor=model;this.actors.push(model);return model;
  }
  character(kind = "A", shadow = false) {
    const root = this.group(),
      g = this.group(0, 0, 0, root);
    const isHero = kind === "A" || kind === "B";
    const rig = { legs: [], arms: [], stalks: [] };
    const color = shadow
      ? "#706487"
      : {
          grandad: "#c2a16c",
          nana: "#a9b995",
          mummy: "#c8a2bf",
          leah: "#ce9a88",
          daddy: "#91b3c6",
          bigboss: "#a39abb",
        }[kind] || "#efe7d3";
    if (kind === "A") {
      for (const side of [-1, 1]) {
        const leg = this.group(side * 0.61, 1.15, 0, g);
        rig.legs.push(leg);
        this.tube(
          [
            [0, 0, 0],
            [side * 0.12, -0.45, 0.03],
            [side * 0.17, -1.1, 0.08],
          ],
          0.14,
          "#267b50",
          leg,
        );
        this.tube(
          [
            [-side * 0.035, -0.1, 0.125],
            [side * 0.06, -0.55, 0.15],
            [side * 0.1, -1.02, 0.16],
          ],
          0.035,
          "#55b780",
          leg,
        );
        const flap = this.box(
          side * 0.22,
          -0.55,
          -0.04,
          0.26,
          1.06,
          0.08,
          "#f4edde",
          leg,
          0.08,
        );
        flap.rotation.z = side * 0.15;
        for (let i = 0; i < 5; i++) {
          const stripe = this.box(
            side * (0.18 + i * 0.009),
            -0.16 - i * 0.18,
            0.012,
            0.27,
            0.025,
            0.018,
            "#d6446a",
            leg,
            0.005,
          );
          stripe.rotation.z = side * 0.15;
        }
      }
      for (let i = 0; i < 7; i++) {
        const x = -0.32 + i * 0.105;
        const tooth = this.mesh(
          new THREE.ConeGeometry(0.045, 0.09, 3),
          "#e6c0c9",
          g,
        );
        tooth.position.set(x, 1.68 + Math.abs(x) * 0.24, 0.61);
        tooth.rotation.z = Math.PI;
      }
      this.sphere(-0.4, 2.3, 0.56, 0.025, 0.035, 0.012, "#fff8e9", g);
      this.sphere(0.4, 2.24, 0.565, 0.018, 0.022, 0.01, "#fff8e9", g);
      const shape = new THREE.Shape();
      shape.moveTo(-0.72, 0);
      shape.lineTo(-0.78, 1.2);
      shape.quadraticCurveTo(-0.58, 2.1, -0.12, 1.46);
      shape.quadraticCurveTo(0.15, 2.35, 0.47, 1.47);
      shape.quadraticCurveTo(0.9, 2.02, 0.91, 0.87);
      shape.lineTo(0.86, 0);
      shape.closePath();
      const headGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.42,
        bevelEnabled: true,
        bevelSize: 0.075,
        bevelThickness: 0.06,
        bevelSegments: 3,
        steps: 1,
      });
      const back = this.mesh(headGeo, "#d6545a", g);
      back.position.set(-0.04, 1.15, -0.2);
      const face = this.mesh(headGeo, "#f5eedc", g);
      face.position.set(-0.04, 1.23, 0.23);
      face.scale.set(0.9, 0.91, 0.3);
      this.box(0, 1.18, 0.15, 1.65, 0.14, 0.7, "#d45154", g);
      this.sphere(-0.38, 2.25, 0.46, 0.21, 0.29, 0.055, "#e6b32f", g);
      this.sphere(0.4, 2.2, 0.47, 0.13, 0.23, 0.06, "#bb3663", g);
      this.sphere(-0.37, 2.24, 0.52, 0.085, 0.12, 0.035, "#303737", g);
      this.sphere(0.42, 2.2, 0.53, 0.055, 0.08, 0.025, "#303737", g);
      this.tube(
        [
          [-0.4, 1.78, 0.49],
          [0, 1.6, 0.52],
          [0.47, 1.82, 0.5],
        ],
        0.11,
        "#493c41",
        g,
      );
      this.tube(
        [
          [0, 2.93, 0.47],
          [0.03, 2.3, 0.48],
          [0.08, 1.83, 0.5],
        ],
        0.038,
        "#c44461",
        g,
      );
      this.tube(
        [
          [-0.72, 1.3, 0],
          [-1.02, 1.25, 0.05],
        ],
        0.055,
        "#e5b7b3",
        g,
      );
      this.tube(
        [
          [0.7, 1.38, 0],
          [1.07, 1.5, 0],
          [1.45, 2.6, 0],
        ],
        0.065,
        "#e5b7b3",
        g,
      );
      this.sphere(1.46, 2.7, 0, 0.21, 0.3, 0.16, "#a8aba5", g);
    } else if (kind === "B") {
      this.cylinder(0, 0.65, 0, 0.32, 0.82, 1.3, "#f0eee2", g);
      this.box(-0.28, 0.62, 0.66, 0.3, 0.32, 0.035, "#f6f1e6", g, 0.02);
      this.sphere(-0.28, 0.73, 0.7, 0.04, 0.04, 0.02, "#3b4141", g);
      this.sphere(0.38, 0.38, 0.65, 0.23, 0.13, 0.04, "#4d9471", g);
      this.sphere(0.29, 0.9, 0.48, 0.19, 0.08, 0.03, "#4d9471", g);
      this.tube(
        [
          [0, 0.08, 0.78],
          [0.025, 0.5, 0.57],
          [0, 1.2, 0.35],
        ],
        0.012,
        "#c4c8bb",
        g,
      );
      for (let i = 0; i < 4; i++)
        this.sphere(
          0.055,
          0.35 + i * 0.2,
          0.68 - i * 0.085,
          0.025,
          0.025,
          0.018,
          "#8d9992",
          g,
        );
      this.sphere(0, 1.7, 0, 0.72, 0.68, 0.47, "#e8b638", g);
      const half = this.mesh(
        new THREE.SphereGeometry(1, 24, 18, Math.PI / 2, Math.PI),
        "#9b959d",
        g,
      );
      half.position.y = 1.7;
      half.scale.set(0.728, 0.688, 0.478);
      for (const [side, eye] of [
        [-1, true],
        [1, false],
      ]) {
        this.sphere(side * 0.26, 1.85, 0.45, 0.14, 0.13, 0.035, "#eeeade", g);
        if (eye)
          this.sphere(side * 0.26, 1.85, 0.49, 0.075, 0.08, 0.02, "#344044", g);
      }
      this.tube(
        [
          [-0.35, 1.5, 0.44],
          [0, 1.4, 0.48],
          [0.34, 1.55, 0.44],
        ],
        0.065,
        "#9b405b",
        g,
      );
      const stalks = [
        {
          points: [
            [-0.2, 2.2, 0],
            [-0.75, 3.05, 0],
            [-1.45, 3.1, 0],
          ],
          color: "#4d9471",
          tip: "#e5ad35",
        },
        {
          points: [
            [0, 2.2, 0],
            [-0.04, 3.4, 0],
            [-0.55, 4.05, 0],
          ],
          color: "#4398b4",
          tip: "#ce9639",
        },
        {
          points: [
            [0.2, 2.2, 0],
            [0.85, 3.1, 0],
            [1.55, 2.95, 0],
          ],
          color: "#c7515e",
          tip: "#a7544e",
        },
      ];
      stalks.forEach((s) => {
        const stalk = this.group(0, 0, 0, g);
        rig.stalks.push(stalk);
        this.tube(s.points, 0.11, s.color, stalk);
        const end = s.points.at(-1);
        this.sphere(end[0], end[1], end[2], 0.27, 0.27, 0.2, s.tip, stalk);
        this.sphere(
          end[0] - 0.07,
          end[1] + 0.08,
          end[2] + 0.18,
          0.08,
          0.045,
          0.02,
          "#fff1d3",
          stalk,
        );
      });
      this.tube(
        [
          [-0.45, 0.85, 0],
          [-1.05, 0.5, 0],
        ],
        0.08,
        "#e9e6dc",
        g,
      );
      for (let i = 0; i < 3; i++) {
        const arm = this.group(0, 0, 0, g);
        rig.arms.push(arm);
        this.tube(
          [
            [0.45, 0.45 + i * 0.24, 0],
            [0.95, 0.55 + i * 0.33, 0],
            [1.25, 0.9 + i * 0.35, 0],
          ],
          0.08,
          "#eae5de",
          arm,
        );
        this.sphere(1.08, 0.72 + i * 0.33, 0, 0.1, 0.1, 0.1, "#4d9471", arm);
      }
    } else {
      for (const side of [-1, 1]) {
        this.sphere(
          side * 0.27,
          0.08,
          0.18,
          0.22,
          0.12,
          0.33,
          shadow ? "#655b80" : "#7e817a",
          g,
        );
        this.sphere(side * 0.21, 1.54, 0.515, 0.025, 0.035, 0.01, "#fff4d5", g);
        this.tube(
          [
            [side * 0.12, 1.72, 0.47],
            [side * 0.22, 1.76, 0.48],
            [side * 0.32, 1.73, 0.44],
          ],
          0.025,
          shadow ? "#51496a" : "#8e7b68",
          g,
        );
      }
      this.cylinder(0, 0.55, 0, 0.45, 0.57, 1.05, color, g);
      this.sphere(
        0,
        1.45,
        0,
        0.62,
        0.64,
        0.52,
        shadow ? "#807394" : "#ead5ba",
        g,
      );
      for (const side of [-1, 1]) {
        this.sphere(
          side * 0.21,
          1.5,
          0.48,
          0.07,
          0.12,
          0.035,
          shadow ? "#e5efb4" : "#394951",
          g,
        );
        this.sphere(side * 0.62, 0.8, 0, 0.17, 0.35, 0.2, color, g);
      }
      this.tube(
        [
          [-0.19, 1.24, 0.47],
          [0, 1.18, 0.52],
          [0.2, 1.24, 0.47],
        ],
        0.035,
        shadow ? "#efe5d4" : "#766658",
        g,
      );
      if (kind === "grandad") {
        this.box(0, 1.53, 0.55, 0.12, 0.025, 0.03, "#6d746d", g, 0.005);
        this.tube(
          [
            [0.2, 0.65, 0.51],
            [0.2, 0.32, 0.57],
            [0.38, 0.3, 0.55],
          ],
          0.035,
          "#ad8661",
          g,
        );
        this.box(0.3, 0.7, 0.52, 0.12, 0.35, 0.045, "#b5c2bc", g, 0.02);
        this.box(0, 1.94, 0, 1.12, 0.16, 0.9, "#d6d3c5", g);
        for (const side of [-1, 1]) {
          const glass = this.mesh(
            new THREE.TorusGeometry(0.19, 0.025, 6, 20),
            "#6d746d",
            g,
          );
          glass.position.set(side * 0.24, 1.53, 0.52);
        }
        this.box(0, 0.55, 0.5, 0.95, 0.12, 0.07, "#eee5ca", g);
      }
      if (kind === "nana") {
        this.box(
          0,
          0.65,
          0.49,
          0.48,
          0.66,
          0.04,
          shadow ? "#9685ad" : "#e4dcba",
          g,
          0.1,
        );
        for (let i = 0; i < 3; i++)
          this.sphere(
            0,
            0.75 - i * 0.13,
            0.53,
            0.025,
            0.025,
            0.02,
            "#91ad9e",
            g,
          );
        this.sphere(0.5, 1.93, -0.1, 0.27, 0.25, 0.27, "#d4d0c5", g);
        this.sphere(-0.45, 1.93, 0.2, 0.16, 0.14, 0.05, "#e9c3a2", g);
        this.cylinder(0.7, 0.6, 0.2, 0.12, 0.12, 0.4, "#94c6bb", g);
      }
      if (kind === "mummy") {
        this.ring(0, 1.01, 0.08, 0.42, shadow ? "#ac93c6" : "#dec3a3", g);
        this.sphere(0, 0.93, 0.5, 0.075, 0.12, 0.04, "#e5c98c", g);
        this.cylinder(0, 2, 0, 0.34, 0.63, 0.22, "#b788aa", g);
        this.sphere(0.73, 0.75, 0.1, 0.18, 0.24, 0.15, "#c6a0c2", g);
      }
      if (kind === "leah") {
        this.sphere(
          0.5,
          0.48,
          0.5,
          0.32,
          0.16,
          0.28,
          shadow ? "#9b8caf" : "#e4d7b7",
          g,
        );
        this.tube(
          [
            [0.44, 0.65, 0.73],
            [0.5, 0.62, 0.75],
            [0.56, 0.65, 0.73],
          ],
          0.018,
          "#917567",
          g,
        );
        this.box(0, 1.8, 0.39, 1, 0.13, 0.25, "#ba7b79", g);
        this.sphere(0.5, 0.75, 0.5, 0.3, 0.35, 0.25, "#ead6ba", g);
        this.sphere(0.44, 0.79, 0.74, 0.035, 0.04, 0.025, "#394951", g);
        this.sphere(0.57, 0.79, 0.74, 0.035, 0.04, 0.025, "#394951", g);
      }
      if (kind === "daddy") {
        for (const side of [-1, 1])
          this.box(
            side * 0.33,
            0.65,
            0.44,
            0.06,
            0.65,
            0.05,
            "#e9e5cd",
            g,
            0.015,
          );
        this.sphere(0.75, 0.55, 0.25, 0.25, 0.25, 0.25, "#eee7d1", g);
        this.sphere(0.75, 0.58, 0.49, 0.085, 0.085, 0.025, "#617977", g);
        this.box(0, 1.87, 0.3, 1.1, 0.14, 0.6, "#e2e5d6", g);
        this.box(0, 0.8, 0.5, 0.17, 0.33, 0.03, "#e7e8d6", g);
      }
      if (kind === "bigboss") {
        this.cylinder(0, 2.02, 0, 0.54, 0.66, 0.14, "#d6d4a5", g);
        this.sphere(0, 2.13, 0, 0.2, 0.13, 0.2, "#d5bca0", g);
      }
    }
    this.bake(g, [...rig.legs, ...rig.arms, ...rig.stalks]);
    for (const bone of [...rig.legs, ...rig.arms, ...rig.stalks])
      this.bake(bone);
    const model = {
      rig,
      root,
      body: g,
      kind,
      shadow,
      baseScale: isHero ? 0.68 : 0.7,
    };
    root.scale.setScalar(model.baseScale);
    root.userData.actor = model;
    this.actors.push(model);
    return model;
  }
  prop(type, x, z) {
    const g = this.group(x, 0, z);
    if (type === "machine") {
      this.box(0, 0.7, 0, 1, 1.4, 0.85, "#8ca9a4", g);
      const gear = this.gear(0, 0.8, 0.48, 0.36, "#d3ba88");
      this.root.remove(gear);
      g.add(gear);
      this.decor.push({ mesh: gear, kind: "gear" });
      this.cylinder(0, 1.55, 0, 0.35, 0.4, 0.18, "#c5c1a6", g);
    }
    if (type === "barrier") {
      for (let i = 0; i < 3; i++)
        this.box(
          (i - 1) * 0.5,
          0.8,
          0,
          0.42,
          1.6,
          0.5,
          i % 2 ? "#d7b198" : "#c38e88",
          g,
        );
      this.box(0, 0.7, 0.3, 1.8, 0.18, 0.13, "#e1c6a1", g);
    }
    if (type === "target") {
      this.cylinder(0, 0.8, 0, 0.045, 0.05, 1.6, "#ada992", g);
      for (const [r, c] of [
        [0.62, "#e8d6b9"],
        [0.43, "#bd8580"],
        [0.22, "#e8d6b9"],
      ]) {
        const disc = this.mesh(new THREE.CircleGeometry(r, 28), c, g, {
          side: THREE.DoubleSide,
        });
        disc.position.set(0, 1.5, 0.1 + (1 - r) * 0.04);
      }
      g.rotation.y = 0.6;
    }
    if (type === "crystal") {
      const gem = this.mesh(
        new THREE.OctahedronGeometry(0.75, 0),
        "#c29cb5",
        g,
        { roughness: 0.25, metalness: 0.15 },
      );
      gem.position.y = 0.75;
      this.ring(0, 0.15, 0, 1, "#d0bd93", g);
    }
    if (type === "checkpoint") {
      this.cylinder(0, 0.5, 0, 0.45, 0.6, 1, "#bcb79b", g);
      const orb = this.sphere(0, 1.3, 0, 0.3, 0.4, 0.3, "#ead7a3", g);
      orb.material = this.material("#f6deb3", {
        emissive: "#efc478",
        emissiveIntensity: 0.5,
      });
      this.floaters.push({
        mesh: orb,
        kind: "mote",
        base: orb.position.clone(),
        phase: 4,
      });
    }
    return g;
  }
  questItem(type, x, z) {
    const g = this.group(x, 0.75, z);
    if (type === "cog") {
      const gear = this.gear(0, 0, 0, 0.3, "#ddb361");
      g.add(gear);
    } else if (type === "potion") {
      this.cylinder(0, 0, 0, 0.18, 0.24, 0.4, "#c48fbe", g);
      this.cylinder(0, 0.3, 0, 0.08, 0.08, 0.24, "#ebd3a5", g);
    } else if (type === "ball") {
      this.sphere(0, 0, 0, 0.28, 0.28, 0.28, "#e6e2cc", g);
      this.sphere(0, 0.23, 0.1, 0.1, 0.08, 0.08, "#526761", g);
    } else if (type === "letter") {
      this.box(0, 0, 0, 0.5, 0.32, 0.06, "#f0e3c4", g);
      this.sphere(0, 0, 0.06, 0.07, 0.07, 0.025, "#c98683", g);
    } else {
      this.box(
        0,
        0,
        0,
        0.4,
        0.3,
        0.35,
        type === "soap" ? "#a1c9bf" : "#d8b9ae",
        g,
      );
      this.box(0, 0.17, 0, 0.08, 0.03, 0.37, "#ece0bd", g);
    }
    this.ring(x, 0.32, z, 0.55, "#e0c887");
    this.floaters.push({
      mesh: g,
      kind: "star",
      base: g.position.clone(),
      phase: x + z,
    });
    return g;
  }
  star(x, z) {
    const g = this.group(x, this.floorHeight(x, z) + 0.95, z);
    if (!this.geometry.has('collectible-star')) {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.16 : 0.35;
        if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      shape.closePath();
      this.geometry.set('collectible-star', new THREE.ExtrudeGeometry(shape, {depth:0.09,bevelEnabled:false}));
    }
    const mesh = this.mesh(
      this.geometry.get('collectible-star'),
      "#ffe36b",
      g,
      { emissive: "#ffd747", emissiveIntensity: 0.65, roughness: 0.25, depthTest:false, depthWrite:false, fog:false },
    );
    mesh.renderOrder = 81;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const outline = this.mesh(new THREE.TorusGeometry(0.44,0.035,6,24), '#534323', g,
      { emissive:'#352700', emissiveIntensity:0.15, depthTest:false, depthWrite:false, fog:false });
    outline.renderOrder = 80;
    outline.castShadow = false;
    this.floaters.push({
      mesh: g,
      kind: "collectible-star",
      base: g.position.clone(),
      phase: x + z,
    });
    return g;
  }
  projectile(type, x, z) {
    if (type === 'ball') return this.football(x, .6, z);
    if (type === 'basketball') return this.basketball(x, 0.6, z);
    const colors = {
      bubble: "#c0e4df",
      potion: "#cd9dc2",
      nappy: "#e8d5b1",
      ball: "#e8e5cf",
      basketball: "#d4a073",
      star: "#d9d0a9",
    };
    const g = this.group(x, 0.6, z);
    if (type === "nappy") this.box(0, 0, 0, 0.45, 0.22, 0.35, colors[type], g);
    else this.sphere(0, 0, 0, 0.23, 0.23, 0.23, colors[type] || colors.star, g);
    if (type === "ball")
      for (const p of [
        [0, 0.2, 0],
        [0, 0, 0.2],
        [0.2, 0, 0],
      ])
        this.sphere(...p, 0.08, 0.08, 0.08, "#556563", g);
    return g;
  }
  effect(x, z, color = "#e4cf9c", count = 18) {
    if (this.reducedMotion) count = Math.min(count, 5);
    for (let i = 0; i < count; i++) {
      const m = this.sphere(x, 0.7, z, 0.035, 0.05, 0.035, color);
      m.castShadow = false;
      this.particles.push({
        mesh: m,
        velocity: new THREE.Vector3(
          (this.random() - 0.5) * 4,
          2 + this.random() * 3,
          (this.random() - 0.5) * 4,
        ),
        life: 1 + this.random(),
      });
    }
  }
  glamourPortrait() {
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glamourTexture(),transparent:true,alphaTest:.08,depthWrite:false,depthTest:false}));
    sprite.name='Handsome Squidward · Ultimate Rizzler';sprite.renderOrder=20;this.root.add(sprite);return sprite;
  }
  marker(x, z, color = "#e6d49d") {
    const ring = this.ring(x, 0.24, z, 0.65, color);
    this.floaters.push({ mesh: ring, kind: "ripple", phase: 0 });
    return ring;
  }
  remove(model) {
    const object = model?.root || model;
    if (!object) return;
    object.visible = false;
    object.parent?.remove(object);
    const cached = new Set(this.geometry.values());
    const disposed = new Set();
    object.traverse?.((child) => {
      if(child.userData.ownMaterial)child.material?.dispose();
      if (
        child.geometry &&
        !cached.has(child.geometry) &&
        !disposed.has(child.geometry)
      ) {
        child.geometry.dispose();
        disposed.add(child.geometry);
      }
    });
    if (model?.root)
      this.actors = this.actors.filter((actor) => actor !== model);
  }
  walkable(x, z) {
    if (this.layout) {
      if (this.world.id === 2) {
        const land = [
          [-19, 5, 15, 12],
          [1, -1, 16, 13],
          [22, -8, 15, 12],
        ];
        if (
          land.some(
            ([a, b, rx, rz]) =>
              (x - a) ** 2 / rx ** 2 + (z - b) ** 2 / rz ** 2 < 1,
          )
        )
          return true;
        return Math.abs(z - (1 - x * 0.3)) < 2.3 && x > -29 && x < 29;
      }
      return (
        Math.abs(x) < this.layout.bounds[0] - 0.7 &&
        Math.abs(z) < this.layout.bounds[1] - 0.7
      );
    }
    return (x * x) / 190 + (z * z) / 126 < 0.96;
  }
  wet(x, z) {
    if (this.layout) return false;
    const river = 2.5 - x * 0.18;
    return Math.abs(z - river) < 0.85 && Math.abs(x + 3) > 1.5;
  }
  blocked(x, z) {
    return this.sportsBlocked(x, 0, z) || this.solids.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + 0.35);
  }
  sportsBlocked(x, y, z, height = 1.9) { return sportsBlocked(this.sportsColliders, x, y, z, height); }
  project(x, y, z) {
    const p = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (p.x + 1) * 50, y: (1 - p.y) * 50 };
  }
  render(dt, focus = null, cinematic = null) {
    this.elapsed += dt;
    const t = this.reducedMotion ? 0 : this.elapsed;
    if (focus) {
      const target = cinematic
        ? new THREE.Vector3(...cinematic.look)
        : new THREE.Vector3(
            this.layout ? focus.x : THREE.MathUtils.clamp(focus.x * 0.5, -4, 4),
            0.3 + Math.max(0, focus.y || 0) * 0.7,
            this.layout ? focus.z : THREE.MathUtils.clamp(focus.z * 0.5, -4, 4),
          );
      this.look.lerp(target, Math.min(1, dt * (cinematic ? 1.5 : 3)));
      const zoom =
        cinematic?.zoom ||
        (focus.spread > 8 ? Math.max(0.45, 20 / (focus.spread + 10)) : 1.12);
      this.camera.zoom = THREE.MathUtils.lerp(
        this.camera.zoom,
        zoom,
        Math.min(1, dt * 2),
      );
      this.camera.updateProjectionMatrix();
    }
    if (this.menu) {
      this.look.set(2.7, 0.2, -1.8);
      this.camera.zoom = 1.07;
      this.camera.updateProjectionMatrix();
    }
    this.shotOffset.lerp(
      cinematic?.offset
        ? new THREE.Vector3(...cinematic.offset)
        : this.cameraOffset,
      Math.min(1, dt * 1.5),
    );
    this.camera.position.copy(this.look).add(this.shotOffset);
    this.camera.lookAt(this.look);
    for (const f of this.floaters) {
      if (!f.mesh.visible) continue;
      if (f.kind === 'collectible-star') {
        f.mesh.quaternion.copy(this.camera.quaternion);
        f.mesh.rotation.z += Math.sin(t * 1.5 + f.phase) * 0.12;
        f.mesh.position.y = f.base.y + Math.sin(t * 2 + f.phase) * 0.09;
      } else if (f.kind === "star") {
        f.mesh.rotation.y = t * 0.8;
        f.mesh.position.y = f.base.y + Math.sin(t * 2 + f.phase) * 0.09;
      } else if (f.kind === "ripple") {
        const s = 1 + Math.sin(t + f.phase) * 0.12;
        f.mesh.scale.set(s, s, 1);
      } else if (f.kind === "mote") {
        f.mesh.position.y = f.base.y + Math.sin(t * 0.8 + f.phase) * 0.18;
        f.mesh.position.x = f.base.x + Math.cos(t * 0.6 + f.phase) * 0.1;
      } else if (f.kind === "portal")
        f.mesh.material.opacity = 0.4 + Math.sin(t * 1.4) * 0.1;
    }
    for (const d of this.decor)
      if (d.kind === "gear") d.mesh.rotation.z = t * 0.22;
      else if (d.kind === "banner")
        d.mesh.rotation.y = Math.sin(t * 1.2 + d.mesh.position.x) * 0.13;
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.velocity.y -= dt * 5;
      p.mesh.position.addScaledVector(p.velocity, dt);
      const size = Math.max(0.01, Math.min(1, p.life));
      p.mesh.scale.set(0.035 * size, 0.05 * size, 0.035 * size);
      if (p.life <= 0) {
        this.remove(p.mesh);
        return false;
      }
      return true;
    });
    this.renderer.render(this.scene, this.camera);
  }
}

let shared;
export function worldView() {
  return (shared ||= new WorldView());
}
