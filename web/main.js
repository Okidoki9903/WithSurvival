// Polar Camp — three.js front-end.
// Gameplay runs in Rust (game.wasm); this file only renders the exported state,
// reads input and plays effects.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// WebAssembly core
// ---------------------------------------------------------------------------

const ITEM = { NONE: 0, MEAT: 1, RAW: 2, COOKED: 3, CASH: 4 };
const EV = { FLY: 1, BLOOD: 2, BEAR_DIE: 3, SWING: 4, PURCHASE: 5, HURT: 6, PLAYER_DIE: 7, HAPPY: 8, CASH: 9 };
const PAD_INFO = [
  { icon: '⚙️', name: 'Tapis roulant', done: 'Tapis roulant installé !' },
  { icon: '🚚', name: 'Tapis vers comptoir', done: 'Livraison automatique !' },
  { icon: '⚔️', name: 'Héros', done: 'Tu es devenu un HÉROS !' },
  { icon: '🎒', name: 'Grand sac', done: 'Sac agrandi !' },
  { icon: '👟', name: 'Bottes', done: 'Plus rapide !' },
  { icon: '🔥', name: 'Grill turbo', done: 'Grill 2x plus rapide !' },
];
const SAVE_KEY = 'polar-camp-save-v1';

const wasmBytes = await fetch('game.wasm').then((r) => {
  if (!r.ok) throw new Error('game.wasm introuvable');
  return r.arrayBuffer();
});
const { instance } = await WebAssembly.instantiate(wasmBytes, {});
const W = instance.exports;
W.pc_init((Math.random() * 0xffffffff) >>> 0 || 1);
loadSave();

function f32(ptr, len) {
  return new Float32Array(W.memory.buffer, ptr, len);
}
const layoutArr = Array.from(f32(W.pc_layout_ptr(), W.pc_layout_len()));
const L = (() => {
  let i = 0;
  const rect = () => ({ x0: layoutArr[i++], x1: layoutArr[i++], z0: layoutArr[i++], z1: layoutArr[i++] });
  const pt = () => ({ x: layoutArr[i++], z: layoutArr[i++] });
  const camp = rect(), gate = rect(), field = rect();
  const grinder = pt(), grinderIn = pt(), grinderOut = pt(), grill = pt(), grillIn = pt(), grillOut = pt();
  const counter = pt(), counterIn = pt(), cash = pt();
  const conv1 = [pt(), pt()], conv2 = [pt(), pt()];
  const queueX = layoutArr[i++], queueZ0 = layoutArr[i++], queueGap = layoutArr[i++], zoneR = layoutArr[i++];
  return { camp, gate, field, grinder, grinderIn, grinderOut, grill, grillIn, grillOut, counter, counterIn, cash, conv1, conv2, queueX, queueZ0, queueGap, zoneR };
})();

function readState() {
  const ptr = W.pc_state_ptr();
  const a = f32(ptr, W.pc_state_len());
  let i = 0;
  const s = {};
  s.time = a[i++]; s.money = a[i++];
  s.player = { x: a[i++], z: a[i++], angle: a[i++], swing: a[i++], hero: a[i++] > 0, stack: a[i++], stackN: a[i++], cap: a[i++], hp: a[i++], moving: a[i++] > 0, dead: a[i++] };
  s.grinderIn = a[i++]; s.grinderOut = a[i++]; s.grindT = a[i++];
  s.grillIn = a[i++]; s.grillOut = a[i++]; s.grillT = a[i++];
  s.counter = a[i++]; s.cashPile = a[i++]; s.conv1On = a[i++] > 0; s.conv2On = a[i++] > 0;
  let n = a[i++]; s.bears = [];
  for (let k = 0; k < n; k++) { s.bears.push({ x: a[i], z: a[i + 1], angle: a[i + 2], hp: a[i + 3], flash: a[i + 4], walk: a[i + 5], moving: a[i + 6] > 0 }); i += 7; }
  n = a[i++]; s.meats = [];
  for (let k = 0; k < n; k++) { s.meats.push({ x: a[i], z: a[i + 1], age: a[i + 2] }); i += 3; }
  n = a[i++]; s.conv1 = Array.from(a.subarray(i, i + n)); i += n;
  n = a[i++]; s.conv2 = Array.from(a.subarray(i, i + n)); i += n;
  n = a[i++]; s.customers = [];
  for (let k = 0; k < n; k++) { s.customers.push({ id: a[i], x: a[i + 1], z: a[i + 2], angle: a[i + 3], want: a[i + 4], got: a[i + 5], state: a[i + 6], walk: a[i + 7] }); i += 8; }
  n = a[i++]; s.pads = [];
  for (let k = 0; k < n; k++) { s.pads.push({ kind: a[i], x: a[i + 1], z: a[i + 2], cost: a[i + 3], paid: a[i + 4], visible: a[i + 5] > 0, level: a[i + 6] }); i += 7; }
  n = a[i++]; s.events = [];
  for (let k = 0; k < n; k++) { s.events.push(Array.from(a.subarray(i, i + 7))); i += 7; }
  return s;
}

function saveGame() {
  try {
    const n = W.pc_save();
    const v = Array.from(new Uint32Array(W.memory.buffer, W.pc_save_ptr(), n));
    localStorage.setItem(SAVE_KEY, JSON.stringify(v));
  } catch (_) { /* storage unavailable */ }
}
function loadSave() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!Array.isArray(v)) return;
    const buf = new Uint32Array(W.memory.buffer, W.pc_save_ptr(), 16);
    v.slice(0, 16).forEach((x, k) => { buf[k] = x >>> 0; });
    W.pc_load(Math.min(v.length, 16));
  } catch (_) { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e3edf5');
scene.fog = new THREE.Fog('#e3edf5', 45, 85);

const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
const CAM_OFFSET = new THREE.Vector3(0, 21, 13.5);
let camZoom = 1;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camZoom = w < h ? Math.min(1.85, 1.2 + 0.9 * (h / w - 1)) : 1.0;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

scene.add(new THREE.HemisphereLight('#f4f8ff', '#b9c9d8', 1.6));
const sun = new THREE.DirectionalLight('#fff6e8', 2.1);
sun.position.set(-8, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function paint(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { arr[k * 3] = c.r; arr[k * 3 + 1] = c.g; arr[k * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  geo.deleteAttribute('uv');
  return geo;
}
function part(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz));
  const g = geo.clone();
  g.applyMatrix4(m);
  return paint(g, color);
}
const merge = (parts) => mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);
const vmat = new THREE.MeshLambertMaterial({ vertexColors: true });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const sph = (r, s = 10) => new THREE.SphereGeometry(r, s, Math.max(6, s * 0.7 | 0));
const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const cap = (r, l, s = 8) => new THREE.CapsuleGeometry(r, l, 4, s);
const cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);

function mesh(geo, mat = vmat, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

// canvas textures ------------------------------------------------------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { tex: t, canvas: c, ctx };
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

// snow ground with subtle noise
{
  const { tex } = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#eef4f9';
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 2200; k++) {
      const x = Math.random() * w, y = Math.random() * h, r = Math.random() * 3 + 0.5;
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(190,210,228,.35)' : 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -10;
  ground.receiveShadow = true;
  scene.add(ground);
}

// camp dirt floor (slightly chamfered rectangle)
{
  const c = L.camp, ch = 2.2, m = 0.15;
  const s = new THREE.Shape();
  s.moveTo(c.x0 + ch, c.z0 - m);
  s.lineTo(c.x1 - ch, c.z0 - m);
  s.lineTo(c.x1 + m, c.z0 + ch);
  s.lineTo(c.x1 + m, c.z1 + m);
  s.lineTo(c.x0 - m, c.z1 + m);
  s.lineTo(c.x0 - m, c.z0 + ch);
  s.closePath();
  const { tex } = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d9976a';
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 500; k++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(170,110,70,.25)' : 'rgba(240,190,150,.3)';
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 4 + 1, 0, 7); ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.25, 0.25);
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(Math.PI / 2);
  const floor = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  floor.position.y = 0.02;
  floor.receiveShadow = true;
  scene.add(floor);
  // gate path
  const path = new THREE.Mesh(new THREE.PlaneGeometry(L.gate.x1 - L.gate.x0 - 0.6, 5), new THREE.MeshLambertMaterial({ color: '#dcb89c' }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.015, c.z0 - 2.3);
  path.receiveShadow = true;
  scene.add(path);
  // trodden customer trail
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 26), new THREE.MeshLambertMaterial({ color: '#d4e1ec' }));
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(L.queueX, 0.012, c.z1 + 13);
  trail.receiveShadow = true;
  scene.add(trail);
  const trail2 = trail.clone();
  trail2.position.set(4.5, 0.012, c.z1 + 13);
  scene.add(trail2);
}

// fences ----------------------------------------------------------------------
{
  const posts = [], rails = [];
  function fence(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 1.3));
    for (let k = 0; k <= n; k++) posts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    rails.push([ax, az, bx, bz, len]);
  }
  function fenceWithGaps(ax, az, bx, bz, gaps) {
    // gaps: list of [t0,t1] along the segment (0..1)
    let t = 0;
    const sorted = gaps.slice().sort((p, q) => p[0] - q[0]);
    for (const [g0, g1] of sorted) {
      if (g0 > t) fence(ax + (bx - ax) * t, az + (bz - az) * t, ax + (bx - ax) * g0, az + (bz - az) * g0);
      t = g1;
    }
    if (t < 1) fence(ax + (bx - ax) * t, az + (bz - az) * t, bx, bz);
  }
  const c = L.camp, f = L.field, g = L.gate, ch = 2.2;
  const w = c.x1 - c.x0;
  // camp: north side with gate
  fenceWithGaps(c.x0 + ch, c.z0, c.x1 - ch, c.z0, [[(g.x0 - c.x0 - ch) / (w - 2 * ch), (g.x1 - c.x0 - ch) / (w - 2 * ch)]]);
  fence(c.x1 - ch, c.z0, c.x1, c.z0 + ch);
  fence(c.x0 + ch, c.z0, c.x0, c.z0 + ch);
  fence(c.x1, c.z0 + ch, c.x1, c.z1);
  fence(c.x0, c.z0 + ch, c.x0, c.z1);
  // camp south: gap for the counter
  const cg0 = (L.counter.x - 2.1 - c.x0) / w, cg1 = (L.counter.x + 2.1 - c.x0) / w;
  fenceWithGaps(c.x0, c.z1, c.x1, c.z1, [[cg0, cg1]]);
  // corridor
  fence(g.x0, c.z0, g.x0, f.z1);
  fence(g.x1, c.z0, g.x1, f.z1);
  // field
  const fw = f.x1 - f.x0;
  fenceWithGaps(f.x0, f.z1, f.x1, f.z1, [[(g.x0 - f.x0) / fw, (g.x1 - f.x0) / fw]]);
  fence(f.x0, f.z0, f.x1, f.z0);
  fence(f.x0, f.z0, f.x0, f.z1);
  fence(f.x1, f.z0, f.x1, f.z1);

  const postGeo = merge([
    part(cyl(0.13, 0.15, 1.1, 8), '#d4866a', 0, 0.55, 0),
    part(sph(0.17, 8), '#ffffff', 0, 1.14, 0, 0, 0, 0, 1, 0.6, 1),
  ]);
  const postMesh = new THREE.InstancedMesh(postGeo, vmat, posts.length);
  const m4 = new THREE.Matrix4();
  posts.forEach(([x, z], k) => postMesh.setMatrixAt(k, m4.makeTranslation(x, 0, z)));
  postMesh.castShadow = true; postMesh.receiveShadow = true;
  scene.add(postMesh);

  const railGeo = merge([
    part(box(1, 0.13, 0.08), '#e0977a', 0, 0.45, 0),
    part(box(1, 0.13, 0.08), '#e0977a', 0, 0.85, 0),
    part(box(1, 0.05, 0.1), '#ffffff', 0, 0.93, 0),
  ]);
  const railMesh = new THREE.InstancedMesh(railGeo, vmat, rails.length);
  rails.forEach(([ax, az, bx, bz, len], k) => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(bz - az, bx - ax));
    m4.compose(new THREE.Vector3((ax + bx) / 2, 0, (az + bz) / 2), q, new THREE.Vector3(len, 1, 1));
    railMesh.setMatrixAt(k, m4);
  });
  railMesh.castShadow = true; railMesh.receiveShadow = true;
  scene.add(railMesh);
}

// trees & rocks -----------------------------------------------------------------
{
  const treeGeo = merge([
    part(cyl(0.18, 0.22, 0.8, 6), '#7a5a48', 0, 0.4, 0),
    part(cone(1.35, 1.6, 7), '#d8e8f4', 0, 1.3, 0),
    part(cone(1.05, 1.4, 7), '#eef6fc', 0, 2.1, 0),
    part(cone(0.7, 1.2, 7), '#ffffff', 0, 2.85, 0),
  ]);
  const spots = [];
  const f = L.field, c = L.camp;
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let k = 0; k < 70; k++) spots.push([rnd(f.x0 - 12, f.x1 + 12), rnd(f.z0 - 10, f.z0 - 1.5)]);
  for (let k = 0; k < 40; k++) spots.push([rnd(f.x1 + 1.5, f.x1 + 14), rnd(f.z0, f.z1 + 4)]);
  for (let k = 0; k < 40; k++) spots.push([rnd(f.x0 - 14, f.x0 - 1.5), rnd(f.z0, f.z1 + 4)]);
  for (let k = 0; k < 30; k++) spots.push([rnd(c.x1 + 3, c.x1 + 16), rnd(c.z0 + 1, c.z1 + 16)]);
  for (let k = 0; k < 30; k++) spots.push([rnd(c.x0 - 16, c.x0 - 3), rnd(c.z0 + 1, c.z1 + 16)]);
  for (let k = 0; k < 12; k++) spots.push([rnd(c.x0 + 5, c.x1 - 5) * 0.3 + rnd(-10, 10), rnd(c.z1 + 3, c.z1 + 16)]);
  const ok = spots.filter(([x, z]) => !(Math.abs(x - L.queueX) < 2.2 && z > c.z1) && !(Math.abs(x - 4.5) < 2 && z > c.z1));
  const trees = new THREE.InstancedMesh(treeGeo, vmat, ok.length);
  const m4 = new THREE.Matrix4();
  ok.forEach(([x, z], k) => {
    const s = rnd(0.8, 1.5);
    m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd(0, 6), 0)), new THREE.Vector3(s, s, s));
    trees.setMatrixAt(k, m4);
  });
  trees.castShadow = true; trees.receiveShadow = true;
  scene.add(trees);

  const rockGeo = merge([part(new THREE.DodecahedronGeometry(0.5, 0), '#c7d6e3'), part(sph(0.3, 6), '#ffffff', 0.1, 0.3, 0, 0, 0, 0, 1.2, 0.5, 1.2)]);
  const rocks = new THREE.InstancedMesh(rockGeo, vmat, 26);
  for (let k = 0; k < 26; k++) {
    const x = rnd(f.x0 - 8, f.x1 + 8), z = rnd(f.z0 - 6, c.z1 + 12);
    const inside = (x > f.x0 - 1 && x < f.x1 + 1 && z > f.z0 - 1 && z < f.z1 + 1) || (x > c.x0 - 1 && x < c.x1 + 1 && z > c.z0 - 5 && z < c.z1 + 6);
    const s = rnd(0.6, 1.6);
    m4.compose(new THREE.Vector3(inside ? 999 : x, 0.15, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(0, 3), rnd(0, 3), 0)), new THREE.Vector3(s, s * 0.7, s));
    rocks.setMatrixAt(k, m4);
  }
  rocks.castShadow = true;
  scene.add(rocks);
}

// ---------------------------------------------------------------------------
// Items (instanced batches)
// ---------------------------------------------------------------------------

const ITEM_GEO = {
  [ITEM.MEAT]: merge([
    part(cap(0.22, 0.32, 8), '#c4523c', 0, 0, 0, 0, 0, Math.PI / 2),
    part(cap(0.17, 0.2, 8), '#d86a52', 0.05, 0.08, 0, 0, 0, Math.PI / 2),
    part(cyl(0.06, 0.06, 0.3, 6), '#f5ece0', -0.36, 0, 0, 0, 0, Math.PI / 2),
    part(sph(0.08, 6), '#f5ece0', -0.52, 0.04, 0),
    part(sph(0.08, 6), '#f5ece0', -0.52, -0.04, 0),
  ]),
  [ITEM.RAW]: merge([
    part(cyl(0.3, 0.3, 0.09, 14), '#f1e1d6', 0, 0, 0),
    part(cyl(0.25, 0.25, 0.1, 14), '#d83b45', 0, 0.005, 0),
    part(cyl(0.07, 0.07, 0.105, 8), '#f7ece6', 0.08, 0.006, 0.02),
  ]),
  [ITEM.COOKED]: merge([
    part(cyl(0.3, 0.28, 0.12, 14), '#8b4a2b', 0, 0, 0),
    part(box(0.42, 0.02, 0.05), '#4a2413', 0, 0.065, -0.1, 0, 0.5, 0),
    part(box(0.42, 0.02, 0.05), '#4a2413', 0, 0.065, 0.06, 0, 0.5, 0),
    part(box(0.42, 0.02, 0.05), '#4a2413', 0.02, 0.065, 0.2, 0, 0.5, 0),
  ]),
  [ITEM.CASH]: merge([
    part(box(0.55, 0.09, 0.3), '#3fbf4a', 0, 0, 0),
    part(box(0.12, 0.095, 0.31), '#b8f0b0', 0, 0, 0),
  ]),
};
const ITEM_STEP = { [ITEM.MEAT]: 0.4, [ITEM.RAW]: 0.1, [ITEM.COOKED]: 0.13, [ITEM.CASH]: 0.1 };

class Batch {
  constructor(geo, max, mat = vmat) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.max = max;
    this.n = 0;
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.p = new THREE.Vector3();
    this.s = new THREE.Vector3(1, 1, 1);
    scene.add(this.mesh);
  }
  begin() { this.n = 0; }
  add(x, y, z, ry = 0, rx = 0, rz = 0, sc = 1) {
    if (this.n >= this.max) return;
    this.e.set(rx, ry, rz);
    this.q.setFromEuler(this.e);
    this.p.set(x, y, z);
    this.s.set(sc, sc, sc);
    this.m4.compose(this.p, this.q, this.s);
    this.mesh.setMatrixAt(this.n++, this.m4);
  }
  addMatrix(m) {
    if (this.n >= this.max) return;
    this.mesh.setMatrixAt(this.n++, m);
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
const items = {};
for (const k of [ITEM.MEAT, ITEM.RAW, ITEM.COOKED, ITEM.CASH]) items[k] = new Batch(ITEM_GEO[k], 900);

// pile of `n` items in a grid of columns
function pile(kind, n, x, z, cols = 2, rows = 2, perCol = 14, spacing = 0.62, y0 = 0.05) {
  const b = items[kind], step = ITEM_STEP[kind];
  const colCount = cols * rows;
  for (let k = 0; k < n; k++) {
    const col = k % colCount;
    const h = Math.floor(k / colCount);
    if (h >= perCol) break;
    const cx = (col % cols) - (cols - 1) / 2, cz = Math.floor(col / cols) - (rows - 1) / 2;
    b.add(x + cx * spacing, y0 + h * step + step / 2, z + cz * spacing, (k * 0.7) % 0.3);
  }
}

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

function zonePlate(x, z, w = 2.2, d = 1.6) {
  const { tex } = canvasTex(256, 192, (ctx, cw, chh) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.setLineDash([26, 18]);
    roundRect(ctx, 12, 12, cw - 24, chh - 24, 34);
    ctx.stroke();
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: '#ffffff' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.04, z);
  scene.add(m);
  return m;
}

// grinder
const grinderGroup = new THREE.Group();
{
  const g = merge([
    part(box(2.4, 0.3, 2.0), '#394650', 0, 0.15, 0),
    part(box(2.2, 1.3, 1.8), '#2f62d8', 0, 0.95, 0),
    part(box(2.25, 0.2, 1.85), '#244aa6', 0, 0.35, 0),
    part(box(1.5, 0.5, 0.05), '#1b2a46', 0, 1.0, 0.92),
    part(box(1.2, 0.08, 0.06), '#8fd6ff', 0, 1.1, 0.95),
    part(box(1.7, 0.6, 1.4), '#56606a', 0, 1.9, 0),
    part(box(1.9, 0.12, 1.6), '#3c444c', 0, 2.2, 0),
  ]);
  const spikes = [];
  for (let k = 0; k < 4; k++) spikes.push(part(cone(0.16, 0.7, 6), '#e8eef4', -0.6 + k * 0.4, 2.6, 0.1, 0, 0, 0.15 * (k - 1.5)));
  grinderGroup.add(mesh(merge([g, ...spikes])));
  // feed belt towards input zone
  const belt = mesh(merge([
    part(box(2.0, 0.35, 1.2), '#444c55', 0, 0.45, 0),
    part(box(2.0, 0.06, 1.0), '#23282e', 0, 0.65, 0),
  ]));
  belt.position.set(1.9, 0, -0.4);
  grinderGroup.add(belt);
  // output tray
  const tray = mesh(merge([part(box(1.6, 0.08, 1.4), '#5a6570', 0, 0.05, 0)]));
  tray.position.set(L.grinderOut.x - L.grinder.x, 0, L.grinderOut.z - L.grinder.z);
  grinderGroup.add(tray);
  grinderGroup.position.set(L.grinder.x, 0, L.grinder.z);
  scene.add(grinderGroup);
}
const grinderBody = grinderGroup.children[0];

// grill
const grillGroup = new THREE.Group();
let grillLight, grillGlow;
{
  const body = merge([
    part(box(2.2, 1.0, 1.7), '#4a5058', 0, 0.5, 0),
    part(box(2.3, 0.12, 1.8), '#343940', 0, 1.05, 0),
    part(box(1.3, 1.5, 0.3), '#d86a38', -0.3, 1.6, -0.65, -0.15, 0, 0),
    part(box(1.1, 1.3, 0.1), '#ff9a4a', -0.3, 1.6, -0.48, -0.15, 0, 0),
    part(box(0.8, 0.8, 1.2), '#3c4148', 1.2, 0.4, 0.1),
  ]);
  grillGroup.add(mesh(body));
  grillGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: '#ff7a22' }));
  grillGlow.rotation.x = -Math.PI / 2;
  grillGlow.position.set(-0.2, 1.12, 0.1);
  grillGroup.add(grillGlow);
  grillLight = new THREE.PointLight('#ff8a3a', 6, 6, 1.6);
  grillLight.position.set(-0.2, 1.8, 0.3);
  grillGroup.add(grillLight);
  grillGroup.position.set(L.grill.x, 0, L.grill.z);
  scene.add(grillGroup);
  const inTray = mesh(merge([part(box(1.6, 0.6, 1.2), '#4b545c', 0, 0.3, 0), part(box(1.5, 0.05, 1.1), '#2d3339', 0, 0.62, 0)]));
  inTray.position.set(L.grillIn.x - 1.4, 0, L.grillIn.z - 0.2);
  scene.add(inTray);
  const outTable = mesh(merge([part(box(1.5, 0.7, 1.2), '#6c7680', 0, 0.35, 0), part(box(1.6, 0.06, 1.3), '#8c96a0', 0, 0.72, 0)]));
  outTable.position.set(L.grillOut.x - 1.3, 0, L.grillOut.z + 0.1);
  scene.add(outTable);
}
const GRILL_IN_PILE = { x: L.grillIn.x - 1.4, z: L.grillIn.z - 0.2, y: 0.65 };
const GRILL_OUT_PILE = { x: L.grillOut.x - 1.3, z: L.grillOut.z + 0.1, y: 0.75 };

// counter (wooden bench across the south fence)
{
  const g = merge([
    part(box(3.6, 0.18, 1.3), '#e3a86a', 0, 0.85, 0),
    part(box(3.6, 0.05, 1.32), '#c98a50', 0, 0.75, 0),
    part(box(0.18, 0.75, 1.1), '#a86c3e', -1.6, 0.38, 0),
    part(box(0.18, 0.75, 1.1), '#a86c3e', 1.6, 0.38, 0),
    part(box(3.4, 0.5, 0.08), '#c98a50', 0, 0.45, -0.55),
  ]);
  const counter = mesh(g);
  counter.position.set(L.counter.x, 0, L.counter.z - 0.3);
  scene.add(counter);
}
const COUNTER_PILE = { x: L.counter.x, z: L.counter.z - 0.3, y: 0.95 };

// cash area frame
{
  const { tex } = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(80,60,40,.35)';
    roundRect(ctx, 6, 6, w - 12, h - 12, 18); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; roundRect(ctx, 6, 6, w - 12, h - 12, 18); ctx.stroke();
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(L.cash.x, 0.035, L.cash.z);
  scene.add(m);
}

const zones = {
  grinderIn: zonePlate(L.grinderIn.x, L.grinderIn.z),
  grinderOut: zonePlate(L.grinderOut.x, L.grinderOut.z, 2.0, 2.0),
  grillIn: zonePlate(L.grillIn.x, L.grillIn.z),
  grillOut: zonePlate(L.grillOut.x, L.grillOut.z),
  counterIn: zonePlate(L.counterIn.x, L.counterIn.z, 2.6, 1.5),
};

// conveyors
function makeConveyor(a, b) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const ang = Math.atan2(b.x - a.x, b.z - a.z);
  const grp = new THREE.Group();
  const frame = mesh(merge([
    part(box(1.0, 0.45, len), '#3c434b', 0, 0.28, 0),
    part(box(0.12, 0.2, len), '#f2b33a', 0.52, 0.5, 0),
    part(box(0.12, 0.2, len), '#f2b33a', -0.52, 0.5, 0),
  ]));
  grp.add(frame);
  const { tex } = canvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#1f2327'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#39414a'; ctx.fillRect(0, 0, w, 10);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, len * 2);
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(0.9, len), new THREE.MeshLambertMaterial({ map: tex }));
  belt.rotation.x = -Math.PI / 2;
  belt.position.y = 0.515;
  belt.receiveShadow = true;
  grp.add(belt);
  grp.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  grp.rotation.y = ang;
  grp.visible = false;
  scene.add(grp);
  return { grp, tex, a, b, len };
}
const conveyors = [makeConveyor(L.conv1[0], L.conv1[1]), makeConveyor(L.conv2[0], L.conv2[1])];

// ---------------------------------------------------------------------------
// Upgrade pads
// ---------------------------------------------------------------------------

const pads = new Map();
function drawPad(p, ctx, w, h, remaining, frac) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(92,72,58,.82)';
  roundRect(ctx, 8, 8, w - 16, h - 16, 34); ctx.fill();
  if (frac > 0) {
    ctx.save();
    roundRect(ctx, 8, 8, w - 16, h - 16, 34); ctx.clip();
    ctx.fillStyle = 'rgba(80,200,90,.55)';
    ctx.fillRect(8, h - 8 - (h - 16) * frac, w - 16, (h - 16) * frac);
    ctx.restore();
  }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.setLineDash([22, 14]);
  roundRect(ctx, 8, 8, w - 16, h - 16, 34); ctx.stroke(); ctx.setLineDash([]);
  const info = PAD_INFO[p.kind];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '86px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.fillText(info.icon, w / 2, h * 0.36);
  ctx.font = 'bold 26px "Trebuchet MS",sans-serif';
  ctx.fillStyle = '#fff';
  const lvl = p.kind === 3 || p.kind === 4 ? ` ${p.level + 1}` : '';
  ctx.fillText(info.name + lvl, w / 2, h * 0.62);
  // price pill
  ctx.fillStyle = '#3fbf4a';
  roundRect(ctx, w * 0.16, h * 0.72, w * 0.68, h * 0.18, 20); ctx.fill();
  ctx.fillStyle = '#b8f0b0'; ctx.fillRect(w * 0.21, h * 0.765, 36, 26);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px "Trebuchet MS",sans-serif';
  ctx.fillText(String(remaining), w * 0.58, h * 0.815);
}
function syncPads(list) {
  for (const p of list) {
    let e = pads.get(p.kind);
    if (!e) {
      const c = canvasTex(256, 256, () => {});
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: c.tex, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(p.x, 0.05, p.z);
      scene.add(m);
      e = { mesh: m, c, last: '' };
      pads.set(p.kind, e);
    }
    e.mesh.visible = p.visible;
    if (!p.visible) continue;
    const remaining = Math.max(0, Math.round(p.cost - p.paid));
    const key = `${remaining}|${p.level}`;
    if (key !== e.last) {
      e.last = key;
      drawPad(p, e.c.ctx, 256, 256, remaining, p.cost > 0 ? p.paid / p.cost : 0);
      e.c.tex.needsUpdate = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

function makeHuman(coat, trim, scale = 1, hero = false) {
  const g = new THREE.Group();
  const legs = [];
  for (const sx of [-0.17, 0.17]) {
    const leg = new THREE.Group();
    leg.add(mesh(merge([part(box(0.22, 0.5, 0.24), '#2b3440', 0, -0.25, 0), part(box(0.26, 0.14, 0.32), '#3a2b22', 0, -0.52, 0.04)])));
    leg.position.set(sx, 0.6, 0);
    legs.push(leg);
    g.add(leg);
  }
  const bodyParts = [
    part(cap(0.36, 0.5, 10), coat, 0, 1.05, 0),
    part(cyl(0.4, 0.42, 0.14, 12), trim, 0, 0.72, 0),
    part(sph(0.26, 12), '#f1c9a5', 0, 1.62, 0.04),
    part(sph(0.33, 12), trim, 0, 1.66, -0.06, 0, 0, 0, 1, 1, 0.9),
    part(sph(0.28, 12), coat, 0, 1.78, -0.04),
    part(box(0.06, 0.06, 0.02), '#1d2a36', -0.09, 1.65, 0.29),
    part(box(0.06, 0.06, 0.02), '#1d2a36', 0.09, 1.65, 0.29),
  ];
  if (hero) {
    bodyParts.push(
      part(sph(0.22, 8), '#8a9aa4', -0.42, 1.35, 0, 0, 0, 0, 1, 0.7, 1),
      part(sph(0.22, 8), '#8a9aa4', 0.42, 1.35, 0, 0, 0, 0, 1, 0.7, 1),
      part(box(0.5, 0.3, 0.1), '#6d7c86', 0, 1.1, 0.33),
      part(cone(0.07, 0.25, 6), '#f4f4f4', -0.2, 2.03, -0.04, 0, 0, 0.4),
      part(cone(0.07, 0.25, 6), '#f4f4f4', 0.2, 2.03, -0.04, 0, 0, -0.4),
    );
  }
  g.add(mesh(merge(bodyParts)));
  const armL = new THREE.Group();
  armL.add(mesh(merge([part(cap(0.1, 0.35, 6), coat, 0, -0.25, 0), part(sph(0.1, 6), '#f1c9a5', 0, -0.5, 0)])));
  armL.position.set(-0.42, 1.3, 0);
  g.add(armL);
  const armR = new THREE.Group();
  armR.add(mesh(merge([part(cap(0.1, 0.35, 6), coat, 0, -0.25, 0), part(sph(0.1, 6), '#f1c9a5', 0, -0.5, 0)])));
  armR.position.set(0.42, 1.3, 0);
  g.add(armR);
  g.scale.setScalar(scale);
  return { g, legs, armL, armR };
}

// player
const player = { obj: null, hero: null, lastHero: null, bar: null, axe: null };
function buildPlayer(hero) {
  if (player.obj) scene.remove(player.obj.g);
  player.obj = hero ? makeHuman('#4e7a3c', '#e9e2d0', 1.25, true) : makeHuman('#2c7fd0', '#f2f2f2', 1.0);
  const axe = new THREE.Group();
  axe.add(mesh(merge([
    part(cyl(0.04, 0.05, 1.0, 6), '#7a5236', 0, 0.3, 0),
    part(box(0.08, 0.38, 0.42), hero ? '#c9d3da' : '#9aa7b1', 0, 0.68, 0.18),
    part(box(0.09, 0.4, 0.06), '#e9eef2', 0, 0.68, 0.4),
  ])));
  axe.position.set(0, -0.5, 0.05);
  axe.rotation.x = Math.PI / 2 - 0.3;
  player.obj.armR.add(axe);
  player.axe = axe;
  scene.add(player.obj.g);
  player.lastHero = hero;
}
buildPlayer(false);

// ring under player
const playerRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), new THREE.MeshBasicMaterial({ color: '#38e0ff', transparent: true, opacity: 0.8, depthWrite: false }));
playerRing.rotation.x = -Math.PI / 2;
scene.add(playerRing);

// billboard bars (hp)
function makeBar(color, w = 1.0) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.08, 0.2), new THREE.MeshBasicMaterial({ color: '#2a2f36', depthTest: false, transparent: true }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.13), new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true }));
  fg.geometry.translate(w / 2, 0, 0);
  fg.position.set(-w / 2, 0, 0.001);
  bg.renderOrder = fg.renderOrder = 10;
  g.add(bg, fg);
  g.userData.fg = fg;
  scene.add(g);
  return g;
}
player.bar = makeBar('#4cd964', 1.1);

// bears (instanced body + legs) ---------------------------------------------
const MAX_BEARS = 90;
const bearBodyGeo = merge([
  part(cap(0.62, 1.05, 10), '#f6f5f0', 0, 1.0, -0.05, Math.PI / 2, 0, 0, 1, 0.92, 1),
  part(sph(0.5, 10), '#f3f2ec', 0, 1.2, -0.75),
  part(sph(0.42, 10), '#f8f7f2', 0, 1.35, 0.95),
  part(box(0.36, 0.3, 0.42), '#efeee8', 0, 1.25, 1.35),
  part(box(0.16, 0.12, 0.08), '#20242a', 0, 1.32, 1.58),
  part(sph(0.13, 6), '#e8e6de', -0.26, 1.72, 0.9),
  part(sph(0.13, 6), '#e8e6de', 0.26, 1.72, 0.9),
  part(box(0.07, 0.07, 0.03), '#20242a', -0.16, 1.45, 1.3),
  part(box(0.07, 0.07, 0.03), '#20242a', 0.16, 1.45, 1.3),
]);
const bearLegGeo = merge([part(box(0.34, 0.8, 0.38), '#ecebe5', 0, -0.4, 0), part(box(0.36, 0.1, 0.42), '#d9d8d2', 0, -0.78, 0.03)]);
const bearBodies = new Batch(bearBodyGeo, MAX_BEARS);
const bearLegs = new Batch(bearLegGeo, MAX_BEARS * 4);
bearBodies.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BEARS * 3).fill(1), 3);
const bearBars = { bg: new Batch(new THREE.PlaneGeometry(1.0, 0.16), MAX_BEARS, new THREE.MeshBasicMaterial({ color: '#2a2f36', depthTest: false, transparent: true })),
  fg: new Batch(new THREE.PlaneGeometry(0.94, 0.1).translate(0.47, 0, 0), MAX_BEARS, new THREE.MeshBasicMaterial({ color: '#e5484d', depthTest: false, transparent: true })) };
bearBars.bg.mesh.castShadow = bearBars.fg.mesh.castShadow = false;
bearBars.bg.mesh.renderOrder = 9; bearBars.fg.mesh.renderOrder = 10;
const dyingBears = [];

// customers ------------------------------------------------------------------
const customerObjs = new Map();
function bubbleTexture(text, emoji) {
  const c = canvasTex(128, 150, (ctx, w) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(w / 2, 62, 56, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w / 2 - 14, 110); ctx.lineTo(w / 2 + 14, 110); ctx.lineTo(w / 2, 140); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '54px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.fillText(emoji, w / 2, 52);
    if (text) {
      ctx.fillStyle = '#1d2a36'; ctx.font = 'bold 28px "Trebuchet MS",sans-serif';
      ctx.fillText(text, w / 2, 96);
    }
  });
  return c.tex;
}
const bubbleCache = new Map();
function bubble(text, emoji = '🥩') {
  const k = emoji + text;
  if (!bubbleCache.has(k)) bubbleCache.set(k, bubbleTexture(text, emoji));
  return bubbleCache.get(k);
}
function getCustomer(id) {
  let c = customerObjs.get(id);
  if (!c) {
    const coats = ['#2f7fd4', '#2a6fb8', '#3b8ee0', '#2464a8'];
    const h = makeHuman(coats[id % coats.length], '#f2f2f2', 0.9);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubble('x1'), depthTest: false }));
    spr.scale.set(1.1, 1.3, 1);
    spr.position.y = 2.7;
    spr.renderOrder = 12;
    spr.visible = false;
    h.g.add(spr);
    scene.add(h.g);
    c = { ...h, spr, key: '' };
    customerObjs.set(id, c);
  }
  return c;
}

// guide arrow -----------------------------------------------------------------
const arrow = new THREE.Group();
{
  const a = mesh(merge([part(cone(0.45, 0.7, 4), '#35d04a', 0, 0.35, 0, Math.PI), part(box(0.3, 0.6, 0.3), '#35d04a', 0, 0.95, 0)]), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#1b7a25' }), false);
  arrow.add(a);
  scene.add(arrow);
}
const groundArrow = new THREE.Mesh(
  new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.55), new THREE.Vector2(0.42, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.16, -0.4), new THREE.Vector2(-0.16, -0.4), new THREE.Vector2(-0.16, 0), new THREE.Vector2(-0.42, 0)])),
  new THREE.MeshBasicMaterial({ color: '#35d04a', transparent: true, opacity: 0.9, depthWrite: false }));
groundArrow.rotation.x = -Math.PI / 2;
const groundArrowPivot = new THREE.Group();
groundArrowPivot.add(groundArrow);
groundArrow.position.z = -1.6;
groundArrow.rotation.z = 0;
scene.add(groundArrowPivot);

// "MAX" label over full stack
const maxSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 64, (ctx) => {
  ctx.font = '900 44px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 8; ctx.strokeStyle = '#7a1010'; ctx.strokeText('MAX', 64, 34);
  ctx.fillStyle = '#ffdf3a'; ctx.fillText('MAX', 64, 34);
}).tex, depthTest: false }));
maxSprite.scale.set(1.3, 0.65, 1);
maxSprite.renderOrder = 12;
scene.add(maxSprite);

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

const flyers = [];
const particles = [];
const decals = [];
const floatTexts = [];
const swings = [];
const particleBatch = new Batch(box(0.12, 0.12, 0.12), 600, new THREE.MeshBasicMaterial({ color: '#ffffff' }));
particleBatch.mesh.castShadow = false;
particleBatch.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(600 * 3), 3);
const decalBatch = new Batch(new THREE.CircleGeometry(0.2, 8).rotateX(-Math.PI / 2), 300, new THREE.MeshBasicMaterial({ color: '#c8202a', transparent: true, opacity: 0.8, depthWrite: false }));
decalBatch.mesh.castShadow = false;

function spawnParticles(x, y, z, n, color, speed = 4, life = 0.7, size = 1) {
  const c = new THREE.Color(color);
  for (let k = 0; k < n; k++) {
    if (particles.length > 580) particles.shift();
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, z, vx: Math.cos(a) * s, vy: 2 + Math.random() * speed, vz: Math.sin(a) * s, life, t: 0, c, size: size * (0.6 + Math.random() * 0.8), decal: color === '#d8202c' });
  }
}

const swingMatA = new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
function spawnSwing(x, z, angle, hero, reach) {
  let geo;
  if (hero) geo = new THREE.RingGeometry(reach * 0.55, reach, 48);
  else geo = new THREE.RingGeometry(0.8, reach, 24, 1, -Math.PI * 0.35, Math.PI * 0.7);
  const m = new THREE.Mesh(geo, swingMatA.clone());
  m.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group();
  holder.add(m);
  holder.position.set(x, 0.9, z);
  holder.rotation.y = angle - Math.PI / 2;
  if (hero) m.material.color.set('#ffb830');
  scene.add(holder);
  swings.push({ obj: holder, m, t: 0, life: hero ? 0.35 : 0.22, hero });
}

const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(text, bad = false) {
  toastEl.textContent = text;
  toastEl.classList.toggle('bad', bad);
  toastEl.classList.add('show');
  toastTimer = 2.2;
}

function floatText(text, x, y, z, color = '#3fe04a') {
  const t = canvasTex(256, 96, (ctx) => {
    ctx.font = '900 56px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 10; ctx.strokeStyle = '#123'; ctx.strokeText(text, 128, 48);
    ctx.fillStyle = color; ctx.fillText(text, 128, 48);
  }).tex;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(2.2, 0.82, 1);
  s.position.set(x, y, z);
  s.renderOrder = 13;
  scene.add(s);
  floatTexts.push({ s, t: 0, own: true });
}
function emojiPop(emoji, x, y, z) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubble('', emoji), depthTest: false, transparent: true }));
  s.scale.set(1.1, 1.3, 1);
  s.position.set(x, y, z);
  s.renderOrder = 13;
  scene.add(s);
  floatTexts.push({ s, t: 0 });
}

// ---------------------------------------------------------------------------
// Audio (tiny synth)
// ---------------------------------------------------------------------------

let actx = null, muted = false;
const lastSfx = {};
function sfx(kind) {
  if (muted || !actx) return;
  const now = actx.currentTime;
  if (lastSfx[kind] && now - lastSfx[kind] < 0.045) return;
  lastSfx[kind] = now;
  const o = actx.createOscillator(), g = actx.createGain();
  o.connect(g); g.connect(actx.destination);
  const cfg = {
    hit: ['square', 180, 90, 0.08, 0.09],
    pop: ['sine', 520, 880, 0.06, 0.07],
    drop: ['sine', 700, 380, 0.06, 0.06],
    cash: ['triangle', 1250, 1650, 0.07, 0.08],
    buy: ['triangle', 520, 1040, 0.35, 0.12],
    die: ['sawtooth', 160, 60, 0.25, 0.08],
    hurt: ['sawtooth', 220, 120, 0.12, 0.08],
  }[kind];
  if (!cfg) return;
  const [type, f0, f1, dur, vol] = cfg;
  o.type = type;
  o.frequency.setValueAtTime(f0, now);
  o.frequency.exponentialRampToValueAtTime(f1, now + dur);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.start(now); o.stop(now + dur + 0.02);
}
document.getElementById('btn-sound').addEventListener('click', (e) => {
  muted = !muted;
  e.currentTarget.textContent = muted ? '🔇' : '🔊';
});
document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('Recommencer une nouvelle partie ?')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* ignore */ }
  location.reload();
});

// ---------------------------------------------------------------------------
// Input: floating joystick + keyboard
// ---------------------------------------------------------------------------

const input = { x: 0, z: 0 };
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const joyEl = document.getElementById('joy'), knobEl = document.getElementById('joy-knob');
const JOY_R = 50;
canvas.addEventListener('pointerdown', (e) => {
  if (joy.id !== null) return;
  joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
  joyEl.style.display = 'block';
  joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px';
  knobEl.style.transform = 'translate(0,0)';
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const d = Math.hypot(dx, dy);
  if (d > JOY_R) { dx *= JOY_R / d; dy *= JOY_R / d; }
  joy.x = dx / JOY_R; joy.y = dy / JOY_R;
  knobEl.style.transform = `translate(${dx}px,${dy}px)`;
});
const endJoy = (e) => {
  if (e.pointerId !== joy.id) return;
  joy.id = null; joy.x = joy.y = 0;
  joyEl.style.display = 'none';
};
canvas.addEventListener('pointerup', endJoy);
canvas.addEventListener('pointercancel', endJoy);
const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
function readInput() {
  let x = joy.x, z = joy.y;
  const k = (...c) => c.some((q) => keys.has(q));
  if (k('KeyA', 'KeyQ', 'ArrowLeft')) x -= 1;
  if (k('KeyD', 'ArrowRight')) x += 1;
  if (k('KeyW', 'KeyZ', 'ArrowUp')) z -= 1;
  if (k('KeyS', 'ArrowDown')) z += 1;
  if (window.__polarInput) { x = window.__polarInput.x; z = window.__polarInput.z; }
  const l = Math.hypot(x, z);
  if (l > 1) { x /= l; z /= l; }
  input.x = x; input.z = z;
}

// ---------------------------------------------------------------------------
// Frame update
// ---------------------------------------------------------------------------

const moneyEl = document.getElementById('money'), moneyVal = document.getElementById('money-val');
const hintEl = document.getElementById('hint');
const vignetteEl = document.getElementById('vignette');
let shownMoney = 0, lastMoney = 0, shake = 0;
const camTarget = new THREE.Vector3(0, 0, 0);
const stackSway = { x: 0, z: 0 };
let prevPlayer = { x: 0, z: 0 };
let S = null;
let playing = false;
let saveTimer = 0;
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();

function stackTop(s) {
  return 1.35 * (s.player.hero ? 1.25 : 1) + s.player.stackN * (ITEM_STEP[s.player.stack] || 0.3);
}
function stackBase(s) {
  const a = s.player.angle, sc = s.player.hero ? 1.25 : 1;
  return { x: s.player.x - Math.sin(a) * 0.55 * sc, z: s.player.z - Math.cos(a) * 0.55 * sc, y: 1.0 * sc };
}

function handleEvents(s) {
  for (const e of s.events) {
    const k = e[0];
    if (k === EV.FLY) {
      const kind = e[1], toPlayer = e[6] > 0;
      const fromPlayer = !toPlayer && Math.hypot(e[2] - s.player.x, e[3] - s.player.z) < 0.01;
      const base = stackBase(s);
      const y0 = fromPlayer ? base.y + s.player.stackN * (ITEM_STEP[kind] || 0.3) : (kind === ITEM.CASH ? 1.0 : 0.6);
      flyers.push({ kind, fx: fromPlayer ? base.x : e[2], fy: y0, fz: fromPlayer ? base.z : e[3], tx: e[4], tz: e[5], ty: 0.9, toPlayer, t: 0, dur: 0.32 });
      sfx(toPlayer ? 'pop' : 'drop');
    } else if (k === EV.BLOOD) {
      spawnParticles(e[1], 1.1, e[2], 8, '#d8202c', 3.5, 0.6);
      sfx('hit');
    } else if (k === EV.BEAR_DIE) {
      dyingBears.push({ x: e[1], z: e[2], angle: e[3], t: 0 });
      spawnParticles(e[1], 0.8, e[2], 14, '#ffffff', 3, 0.7, 1.4);
      spawnParticles(e[1], 1.0, e[2], 10, '#d8202c', 4, 0.7);
      shake = Math.max(shake, 0.12);
    } else if (k === EV.SWING) {
      spawnSwing(e[1], e[2], e[3], e[4] > 0, e[5]);
    } else if (k === EV.PURCHASE) {
      const info = PAD_INFO[e[1]];
      toast(info.done);
      spawnParticles(e[2], 0.5, e[3], 40, '#ffd23a', 6, 1.0, 1.3);
      spawnParticles(e[2], 0.5, e[3], 30, '#3fbf4a', 6, 1.0, 1.3);
      sfx('buy');
      shake = 0.2;
      saveGame();
    } else if (k === EV.HURT) {
      vignetteEl.classList.add('on');
      setTimeout(() => vignetteEl.classList.remove('on'), 90);
      sfx('hurt');
      shake = Math.max(shake, 0.15);
    } else if (k === EV.PLAYER_DIE) {
      toast('Assommé ! Retour au camp…', true);
      sfx('die');
    } else if (k === EV.HAPPY) {
      emojiPop('😊', e[1], 2.9, e[2]);
      floatText(`+$${Math.round(e[3] * 10)}`, L.cash.x, 2.2, L.cash.z);
      sfx('cash');
    } else if (k === EV.CASH) {
      for (let q = 0; q < e[3]; q++) flyers.push({ kind: ITEM.CASH, fx: e[1] + (Math.random() - 0.5), fy: 0.4, fz: e[2] + (Math.random() - 0.5), tx: 0, tz: 0, ty: 1.4, toPlayer: true, t: -q * 0.03, dur: 0.28, noStack: true });
      sfx('cash');
    }
  }
}

function guideTarget(s) {
  const p = s.player;
  if (p.dead > 0) return null;
  const inField = p.z < L.camp.z0 - 1;
  const full = p.stackN >= p.cap;
  if (p.stack === ITEM.MEAT && (full || !inField)) return { ...L.grinderIn, hint: full ? 'Sac plein ! Apporte la viande au hachoir' : 'Dépose la viande dans le hachoir' };
  if (p.stack === ITEM.MEAT) return null;
  if (p.stack === ITEM.RAW) return { ...L.grillIn, hint: 'Mets la viande sur le grill 🔥' };
  if (p.stack === ITEM.COOKED) return { ...L.counterIn, hint: 'Sers les steaks au comptoir' };
  if (s.cashPile > 0) return { ...L.cash, hint: "Ramasse l'argent 💵" };
  if (!s.conv2On && s.grillOut > 0) return { ...L.grillOut, hint: 'Récupère les steaks cuits' };
  if (!s.conv1On && s.grinderOut > 0) return { ...L.grinderOut, hint: 'Récupère la viande hachée' };
  const afford = s.pads.filter((q) => q.visible && s.money >= Math.min(q.cost - q.paid, 40) && s.money > 0)
    .sort((a, b) => (a.cost - a.paid) - (b.cost - b.paid))[0];
  if (afford && s.money >= afford.cost - afford.paid) return { x: afford.x, z: afford.z, hint: 'Achète une amélioration !' };
  if (!inField) return { x: 0, z: L.field.z1 - 2, hint: 'Va chasser les ours 🐻‍❄️' };
  return null;
}

function update(dt) {
  readInput();
  if (playing) W.pc_tick(dt, input.x, input.z);
  else W.pc_tick(dt, 0, 0);
  const s = readState();
  S = s;
  const p = s.player;

  if (p.hero !== player.lastHero) {
    buildPlayer(p.hero);
    if (p.hero) spawnParticles(p.x, 1, p.z, 50, '#ffd23a', 7, 1.2, 1.5);
  }
  handleEvents(s);

  // --- player ---------------------------------------------------------------
  const po = player.obj;
  po.g.position.set(p.x, 0, p.z);
  po.g.rotation.y = p.angle;
  po.g.visible = p.dead <= 0 || Math.floor(p.dead * 10) % 2 === 0;
  if (p.dead > 0) { po.g.rotation.z = Math.min(1.4, (2 - p.dead) * 5); } else po.g.rotation.z = 0;
  const walkT = s.time * 11;
  const sw = p.moving ? Math.sin(walkT) * 0.6 : 0;
  po.legs[0].rotation.x = sw; po.legs[1].rotation.x = -sw;
  po.armL.rotation.x = -sw * 0.6 + (p.stackN > 0 ? -0.9 : 0);
  if (p.swing >= 0) {
    const t = p.swing;
    po.armR.rotation.x = t < 0.35 ? -2.4 * (t / 0.35) : -2.4 + 3.2 * ((t - 0.35) / 0.65);
    if (p.hero) po.g.rotation.y = p.angle + t * Math.PI * 2;
  } else po.armR.rotation.x = p.moving ? sw * 0.6 : 0;
  po.g.position.y = p.moving ? Math.abs(Math.sin(walkT)) * 0.08 : 0;
  playerRing.position.set(p.x, 0.05, p.z);
  playerRing.visible = p.dead <= 0;
  player.bar.visible = p.hp < 0.999 && p.dead <= 0;
  player.bar.position.set(p.x, 2.6 * (p.hero ? 1.25 : 1), p.z);
  player.bar.quaternion.copy(camera.quaternion);
  player.bar.userData.fg.scale.x = Math.max(0.001, p.hp);

  // stack sway (lags behind movement)
  const vx = (p.x - prevPlayer.x) / Math.max(dt, 1e-3), vz = (p.z - prevPlayer.z) / Math.max(dt, 1e-3);
  prevPlayer = { x: p.x, z: p.z };
  stackSway.x += (-vx * 0.012 - stackSway.x) * Math.min(1, dt * 6);
  stackSway.z += (-vz * 0.012 - stackSway.z) * Math.min(1, dt * 6);

  for (const b of Object.values(items)) b.begin();
  if (p.stackN > 0 && p.dead <= 0) {
    const base = stackBase(s), step = ITEM_STEP[p.stack];
    const bob = po.g.position.y;
    for (let k = 0; k < p.stackN; k++) {
      const h = k * step;
      const lag = Math.pow(h / 6, 1.6);
      items[p.stack].add(base.x + stackSway.x * lag * 6, base.y + bob + h + step / 2, base.z + stackSway.z * lag * 6, p.angle + (p.stack === ITEM.MEAT ? Math.PI / 2 : 0));
    }
  }
  maxSprite.visible = p.stackN >= p.cap && p.dead <= 0;
  if (maxSprite.visible) {
    const base = stackBase(s);
    maxSprite.position.set(base.x, base.y + p.stackN * ITEM_STEP[p.stack] + 0.6, base.z);
  }

  // --- stations ---------------------------------------------------------------
  pile(ITEM.MEAT, Math.min(s.grinderIn, 6), L.grinder.x + 1.9, L.grinder.z - 0.4, 3, 1, 2, 0.55, 0.7);
  if (!s.conv1On) pile(ITEM.RAW, s.grinderOut, L.grinderOut.x, L.grinderOut.z, 2, 2, 20, 0.66, 0.1);
  pile(ITEM.RAW, s.grillIn, GRILL_IN_PILE.x, GRILL_IN_PILE.z, 2, 2, 18, 0.62, GRILL_IN_PILE.y);
  if (!s.conv2On) pile(ITEM.COOKED, s.grillOut, GRILL_OUT_PILE.x, GRILL_OUT_PILE.z, 2, 2, 18, 0.62, GRILL_OUT_PILE.y);
  pile(ITEM.COOKED, s.counter, COUNTER_PILE.x, COUNTER_PILE.z, 5, 2, 12, 0.62, COUNTER_PILE.y);
  pile(ITEM.CASH, s.cashPile, L.cash.x, L.cash.z, 3, 3, 20, 0.6, 0.04);
  // raw steak sizzling on the grill
  if (s.grillIn > 0) items[ITEM.RAW].add(L.grill.x - 0.2, 1.2, L.grill.z + 0.1, s.time);
  // grinder shake
  grinderBody.position.x = s.grinderIn > 0 ? Math.sin(s.time * 60) * 0.03 : 0;
  grillLight.intensity = 4 + Math.sin(s.time * 13) * 1.2 + Math.sin(s.time * 29) * 0.8 + (s.grillIn > 0 ? 3 : 0);
  if (s.grillIn > 0 && Math.random() < dt * 20) spawnParticles(L.grill.x - 0.2 + (Math.random() - 0.5), 1.3, L.grill.z, 1, Math.random() < 0.5 ? '#ffb03a' : '#ff6a22', 0.6, 0.6, 0.8);

  // conveyors
  const convOn = [s.conv1On, s.conv2On];
  [s.conv1, s.conv2].forEach((list, ci) => {
    const c = conveyors[ci];
    if (convOn[ci] && !c.grp.visible) { c.grp.visible = true; }
    c.tex.offset.y -= dt * 1.4;
    const kind = ci === 0 ? ITEM.RAW : ITEM.COOKED;
    for (const t of list) {
      items[kind].add(c.a.x + (c.b.x - c.a.x) * t, 0.58, c.a.z + (c.b.z - c.a.z) * t, t * 3);
    }
  });
  zones.grinderOut.visible = !s.conv1On;
  zones.grillOut.visible = !s.conv2On;
  const inZone = (z) => Math.hypot(p.x - z.x, p.z - z.z) < L.zoneR;
  zones.grinderIn.material.color.set(inZone(L.grinderIn) ? '#5dff6a' : '#ffffff');
  zones.grinderOut.material.color.set(inZone(L.grinderOut) ? '#5dff6a' : '#ffffff');
  zones.grillIn.material.color.set(inZone(L.grillIn) ? '#5dff6a' : '#ffffff');
  zones.grillOut.material.color.set(inZone(L.grillOut) ? '#5dff6a' : '#ffffff');
  zones.counterIn.material.color.set(inZone(L.counterIn) ? '#5dff6a' : '#ffffff');

  // meat on the ground
  for (const m of s.meats) {
    const pop = Math.min(1, m.age / 0.35);
    items[ITEM.MEAT].add(m.x, 0.25 + Math.sin(pop * Math.PI) * 1.2, m.z, m.x * 3, 0, 0, 1.15);
  }

  // flyers
  for (let k = flyers.length - 1; k >= 0; k--) {
    const f = flyers[k];
    f.t += dt;
    if (f.t < 0) continue;
    const u = Math.min(1, f.t / f.dur);
    let tx = f.tx, ty = f.ty, tz = f.tz;
    if (f.toPlayer) {
      const base = stackBase(s);
      tx = base.x; tz = base.z;
      ty = f.noStack ? 1.4 : base.y + Math.max(0, p.stackN - 1) * (ITEM_STEP[f.kind] || 0.3);
    }
    const x = f.fx + (tx - f.fx) * u, z = f.fz + (tz - f.fz) * u;
    const y = f.fy + (ty - f.fy) * u + Math.sin(u * Math.PI) * 1.6;
    items[f.kind].add(x, y, z, u * 6, u * 3);
    if (u >= 1) flyers.splice(k, 1);
  }
  for (const b of Object.values(items)) b.end();

  // --- bears ------------------------------------------------------------------
  bearBodies.begin(); bearLegs.begin(); bearBars.bg.begin(); bearBars.fg.begin();
  const col = new THREE.Color();
  const legOff = [[-0.33, 0.55], [0.33, 0.55], [-0.33, -0.65], [0.33, -0.65]];
  const addBear = (x, z, angle, walk, moving, flash, tilt, sink) => {
    const idx = bearBodies.n;
    tmpQ.setFromEuler(new THREE.Euler(0, angle, tilt, 'YXZ'));
    tmpM.compose(tmpV.set(x, -sink, z), tmpQ, tmpS.set(1, 1, 1));
    bearBodies.addMatrix(tmpM);
    col.setRGB(1, 1 - flash * 0.6, 1 - flash * 0.6);
    bearBodies.mesh.setColorAt(idx, col);
    const ca = Math.cos(angle), sa = Math.sin(angle);
    legOff.forEach(([lx, lz], li) => {
      const swing = moving ? Math.sin(walk + (li === 0 || li === 3 ? 0 : Math.PI)) * 0.5 : 0;
      const wx = x + lx * ca + lz * sa, wz = z - lx * sa + lz * ca;
      tmpQ.setFromEuler(new THREE.Euler(swing, angle, tilt, 'YXZ'));
      tmpM.compose(tmpV.set(wx, 0.82 - sink, wz), tmpQ, tmpS.set(1, 1, 1));
      bearLegs.addMatrix(tmpM);
    });
  };
  for (const b of s.bears) {
    addBear(b.x, b.z, b.angle, b.walk, b.moving, b.flash, 0, 0);
    if (b.hp < 0.999) {
      tmpM.compose(tmpV.set(b.x - 0.5, 2.35, b.z), camera.quaternion, tmpS.set(1, 1, 1));
      bearBars.bg.addMatrix(tmpM.clone().setPosition(b.x, 2.35, b.z));
      tmpM.compose(tmpV.set(b.x - 0.47, 2.35, b.z), camera.quaternion, tmpS.set(Math.max(0.01, b.hp), 1, 1));
      bearBars.fg.addMatrix(tmpM);
    }
  }
  for (let k = dyingBears.length - 1; k >= 0; k--) {
    const d = dyingBears[k];
    d.t += dt;
    const tilt = Math.min(1, d.t / 0.3) * Math.PI / 2;
    const sink = Math.max(0, d.t - 0.6) * 1.5;
    addBear(d.x, d.z, d.angle, 0, false, Math.max(0, 1 - d.t * 3), tilt, sink);
    if (d.t > 1.6) dyingBears.splice(k, 1);
  }
  bearBodies.end(); bearLegs.end(); bearBars.bg.end(); bearBars.fg.end();

  // --- customers --------------------------------------------------------------
  const seen = new Set();
  for (const c of s.customers) {
    seen.add(c.id);
    const o = getCustomer(c.id);
    o.g.position.set(c.x, 0, c.z);
    o.g.rotation.y = c.angle;
    const moving = c.state !== 1 && Math.abs(Math.sin(c.walk)) > 0.001;
    const lsw = moving ? Math.sin(c.walk) * 0.5 : 0;
    o.legs[0].rotation.x = lsw; o.legs[1].rotation.x = -lsw;
    o.armL.rotation.x = -lsw * 0.5; o.armR.rotation.x = lsw * 0.5;
    const waiting = c.state === 1;
    o.spr.visible = waiting;
    if (waiting) {
      const key = `x${Math.max(0, c.want - c.got)}`;
      if (key !== o.key) { o.key = key; o.spr.material.map = bubble(key); o.spr.material.needsUpdate = true; }
    }
    if (c.state === 2 && c.got > 0) { o.armL.rotation.x = -1.2; }
  }
  for (const [id, o] of customerObjs) {
    if (!seen.has(id)) { scene.remove(o.g); customerObjs.delete(id); }
  }
  // steaks held by leaving customers
  for (const c of s.customers) {
    if (c.state === 2) {
      for (let k = 0; k < c.got; k++) {
        items[ITEM.COOKED].add(c.x + Math.sin(c.angle) * 0.45, 1.05 + k * 0.13, c.z + Math.cos(c.angle) * 0.45, 0);
      }
    }
  }
  items[ITEM.COOKED].end();

  // --- pads -------------------------------------------------------------------
  syncPads(s.pads);

  // --- guide ----------------------------------------------------------------------
  const target = playing ? guideTarget(s) : null;
  arrow.visible = !!target;
  groundArrowPivot.visible = false;
  if (target) {
    arrow.position.set(target.x, 2.4 + Math.sin(s.time * 5) * 0.3, target.z);
    arrow.rotation.y += dt * 2;
    const d = Math.hypot(target.x - p.x, target.z - p.z);
    if (d > 3) {
      groundArrowPivot.visible = true;
      groundArrowPivot.position.set(p.x, 0.07, p.z);
      groundArrowPivot.rotation.y = Math.atan2(-(target.x - p.x), -(target.z - p.z));
    }
  }
  hintEl.textContent = target ? target.hint : '';

  // --- effects ----------------------------------------------------------------
  particleBatch.begin();
  for (let k = particles.length - 1; k >= 0; k--) {
    const q = particles[k];
    q.t += dt;
    q.vy -= 14 * dt;
    q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    if (q.y < 0.05) {
      if (q.decal && decals.length < 290) decals.push({ x: q.x, z: q.z, t: 0, s: 0.4 + Math.random() * 0.6 });
      q.y = 0.05; q.vy = 0; q.vx *= 0.5; q.vz *= 0.5;
    }
    if (q.t > q.life) { particles.splice(k, 1); continue; }
    const idx = particleBatch.n;
    particleBatch.add(q.x, q.y, q.z, q.t * 5, q.t * 3, 0, q.size * (1 - q.t / q.life * 0.6));
    particleBatch.mesh.setColorAt(idx, q.c);
  }
  particleBatch.end();
  decalBatch.begin();
  for (let k = decals.length - 1; k >= 0; k--) {
    const d = decals[k];
    d.t += dt;
    if (d.t > 8) { decals.splice(k, 1); continue; }
    decalBatch.add(d.x, 0.03, d.z, 0, 0, 0, d.s * (d.t > 6 ? (8 - d.t) / 2 : 1));
  }
  decalBatch.end();
  for (let k = swings.length - 1; k >= 0; k--) {
    const w = swings[k];
    w.t += dt;
    const u = w.t / w.life;
    w.m.material.opacity = 0.85 * (1 - u);
    w.obj.rotation.y += dt * (w.hero ? 14 : 9);
    w.obj.scale.setScalar(0.85 + u * 0.3);
    if (u >= 1) { scene.remove(w.obj); w.m.geometry.dispose(); w.m.material.dispose(); swings.splice(k, 1); }
  }
  for (let k = floatTexts.length - 1; k >= 0; k--) {
    const f = floatTexts[k];
    f.t += dt;
    f.s.position.y += dt * 1.5;
    f.s.material.opacity = 1 - Math.max(0, f.t - 0.6) / 0.5;
    if (f.t > 1.1) { scene.remove(f.s); if (f.own) f.s.material.map.dispose(); f.s.material.dispose(); floatTexts.splice(k, 1); }
  }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastEl.classList.remove('show'); }

  // --- HUD --------------------------------------------------------------------
  if (s.money !== lastMoney) {
    if (s.money > lastMoney) { moneyEl.classList.add('pulse'); setTimeout(() => moneyEl.classList.remove('pulse'), 120); }
    lastMoney = s.money;
  }
  shownMoney += (s.money - shownMoney) * Math.min(1, dt * 12);
  if (Math.abs(s.money - shownMoney) < 0.5) shownMoney = s.money;
  moneyVal.textContent = Math.round(shownMoney);

  // --- camera -----------------------------------------------------------------
  camTarget.x += (p.x - camTarget.x) * Math.min(1, dt * 5);
  camTarget.z += (p.z - camTarget.z) * Math.min(1, dt * 5);
  shake = Math.max(0, shake - dt);
  const sh = shake * 1.2;
  camera.position.set(camTarget.x + CAM_OFFSET.x * camZoom + (Math.random() - 0.5) * sh, CAM_OFFSET.y * camZoom, camTarget.z + CAM_OFFSET.z * camZoom + (Math.random() - 0.5) * sh);
  camera.lookAt(camTarget.x, 0, camTarget.z - 1);
  sun.position.set(camTarget.x - 8, 20, camTarget.z + 10);
  sun.target.position.set(camTarget.x, 0, camTarget.z);
  snow.position.set(camTarget.x, 0, camTarget.z);
  const sp = snow.geometry.attributes.position;
  for (let k = 0; k < sp.count; k++) {
    let y = sp.getY(k) - dt * (1.2 + (k % 5) * 0.2);
    if (y < 0) y += 16;
    sp.setY(k, y);
    sp.setX(k, sp.getX(k) + Math.sin(s.time + k) * dt * 0.3);
  }
  sp.needsUpdate = true;

  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; saveGame(); }
}

// snowfall
const snow = (() => {
  const n = 500;
  const pos = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { pos[k * 3] = (Math.random() - 0.5) * 50; pos[k * 3 + 1] = Math.random() * 16; pos[k * 3 + 2] = (Math.random() - 0.5) * 50; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = canvasTex(32, 32, (ctx) => {
    const gr = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 32, 32);
  }).tex;
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.28, map: tex, transparent: true, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  return pts;
})();

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const playBtn = document.getElementById('play');
playBtn.disabled = false;
playBtn.textContent = 'JOUER';
playBtn.addEventListener('click', () => {
  document.getElementById('start').classList.add('hidden');
  playing = true;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (_) { actx = null; }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.__polar = { get state() { return S; }, guide: () => S && guideTarget(S), layout: L };
