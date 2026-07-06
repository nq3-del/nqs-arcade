// The world-building toolkit. Static scenery is built as a big list of
// coloured "parts" (boxes, cylinders, cones) that get MERGED into a single
// mesh — hundreds of shapes for the price of one draw call, which is how
// the town stays inside the performance budget (threejs-performance skill).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A faint plank-grain texture shared by ALL merged scenery. It multiplies
// with the vertex colours, so everything keeps its own hue but picks up a
// whisper of wood. One 128px texture for the entire world.
function makeGrainTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    // Each "plank" edge, plus a couple of grain streaks inside it.
    ctx.fillStyle = 'rgba(60, 40, 20, 0.10)';
    ctx.fillRect(x, 0, 2, 128);
    ctx.fillStyle = 'rgba(60, 40, 20, 0.045)';
    ctx.fillRect(x + 6 + (x % 5), 0, 1, 128);
    ctx.fillRect(x + 11 - (x % 3), 0, 1, 128);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// One shared material for all merged scenery; the colours live on the
// vertices themselves, with the grain multiplied on top.
const worldMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  map: makeGrainTexture(),
});

const _color = new THREE.Color();

// Stamp a colour onto every vertex — darker toward the geometry's base,
// which fakes the soft "grounded" shading real ambient occlusion gives
// (real AO is a banned postprocessing pass; this costs nothing).
const AO_STRENGTH = 0.16;
function paint(geometry, colorHex) {
  _color.setHex(colorHex);
  geometry.computeBoundingBox();
  const minY = geometry.boundingBox.min.y;
  const height = Math.max(0.001, geometry.boundingBox.max.y - minY);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const t = (positions.getY(i) - minY) / height; // 0 at base, 1 at top
    const shade = 1 - AO_STRENGTH * (1 - t);
    colors[i * 3] = _color.r * shade;
    colors[i * 3 + 1] = _color.g * shade;
    colors[i * 3 + 2] = _color.b * shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function box(parts, x, y, z, w, h, d, color, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  paint(g, color);
  if (rz) g.rotateZ(rz); // tilt (for roof slabs)
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  parts.push(g);
}

export function cylinder(parts, x, y, z, radiusTop, radiusBottom, h, color, segments = 10) {
  const g = new THREE.CylinderGeometry(radiusTop, radiusBottom, h, segments);
  paint(g, color);
  g.translate(x, y, z);
  parts.push(g);
}

export function cone(parts, x, y, z, radius, h, color, segments = 8, ry = 0) {
  const g = new THREE.ConeGeometry(radius, h, segments);
  paint(g, color);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  parts.push(g);
}

// Merge a parts list into one mesh and add it to the scene.
export function mergeParts(scene, parts) {
  const merged = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  parts.length = 0;
  const mesh = new THREE.Mesh(merged, worldMaterial);
  scene.add(mesh);
  return mesh;
}

// A painted wooden sign with real lettering, drawn once onto a canvas.
// Signs stay separate from the merge (each has its own little texture).
export function makeSign(scene, text, x, y, z, width, ry = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3c2c18';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 58);
  ctx.fillStyle = '#e8dbb5';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);

  const texture = new THREE.CanvasTexture(canvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * 0.25),
    new THREE.MeshLambertMaterial({ map: texture })
  );
  sign.position.set(x, y, z);
  sign.rotation.y = ry;
  scene.add(sign);
  return sign;
}
