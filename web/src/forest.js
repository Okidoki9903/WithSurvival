// Dense snowy pine forest rendered with chunked InstancedMeshes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SNOW = new THREE.Color(0xffffff);
const SNOW_SHADE = new THREE.Color(0xd5e1ee);
const NEEDLE = new THREE.Color(0x35585b);
const NEEDLE_DARK = new THREE.Color(0x14282b);
const TRUNK = new THREE.Color(0x4a3426);

// One tier of branches: a star-shaped cone whose tips droop, snow on top and
// dark needles on the rim and underside so tiers read clearly from above.
function tier(r, y0, h, seed, tips) {
  const prof = [[0.15, -0.1], [1.0, -0.2], [0.84, 0.06], [0.56, 0.38], [0.04, 1.0]];
  const pts = prof.map(([x, y]) => new THREE.Vector2(x * r, y0 + y * h));
  const seg = tips * 2;
  const geo = new THREE.LatheGeometry(pts, seg);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const phase = seed * 0.37;
  for (let i = 0; i < pos.count; i++) {
    const j = i % pts.length;
    const x = pos.getX(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const tip = Math.pow(Math.abs(Math.cos((a + phase) * tips / 2)), 2);
    const amp = j <= 2 ? 0.2 : j === 3 ? 0.08 : 0.02;
    const k = 1 - amp * (1 - tip) + (rnd() - 0.5) * 0.05;
    pos.setX(i, x * k); pos.setZ(i, z * k);
    if (j === 1) pos.setY(i, pos.getY(i) - tip * 0.16 * h);
    if (j === 0) c.copy(NEEDLE_DARK);
    else if (j === 1) c.copy(NEEDLE).lerp(SNOW_SHADE, 0.1 + tip * 0.45);
    else if (j === 2) c.copy(SNOW_SHADE).lerp(SNOW, 0.3 + rnd() * 0.5);
    else c.copy(SNOW).lerp(SNOW_SHADE, rnd() * 0.25);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

function treeGeometry(variant) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.12, 0.2, 1.2, 4, 1, true).translate(0, 0.6, 0);
  const tc = new Float32Array(trunk.attributes.position.count * 3);
  for (let i = 0; i < tc.length; i += 3) { tc[i] = TRUNK.r; tc[i + 1] = TRUNK.g; tc[i + 2] = TRUNK.b; }
  trunk.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  parts.push(trunk);
  const n = variant === 0 ? 6 : 5;
  const H = variant === 0 ? 6.6 : 5.6, R = variant === 0 ? 1.6 : 1.8;
  for (let k = 0; k < n; k++) {
    const t = k / n;
    const r = R * Math.pow(1 - t, 1.0) + 0.16;
    const y = 0.8 + t * (H - 1.3);
    parts.push(tier(r, y, 1.25 - t * 0.3, 11 + k * 7 + variant * 31, k > n - 3 ? 5 : 7));
  }
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

export class Forest {
  constructor(scene, trees, { chunk = 16, castShadow = true } = {}) {
    this.scene = scene;
    this.trees = trees;
    this.geos = [treeGeometry(0), treeGeometry(1)];
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2c3a4c });
    this.chunks = new Map();
    this.dirty = new Set();
    this.animating = new Set();
    this.hash = new Map();
    for (const t of trees) {
      const key = `${Math.floor(t.x / chunk)},${Math.floor(t.z / chunk)},${t.variant}`;
      if (!this.chunks.has(key)) this.chunks.set(key, []);
      this.chunks.get(key).push(t);
      const hk = `${Math.floor(t.x / 4)},${Math.floor(t.z / 4)}`;
      if (!this.hash.has(hk)) this.hash.set(hk, []);
      this.hash.get(hk).push(t);
      t.k = 1; t.alive = true; t.tilt = null; t.anim = null; t.hp = 3;
    }
    for (const [key, list] of this.chunks) {
      const v = Number(key.split(',')[2]);
      const im = new THREE.InstancedMesh(this.geos[v], this.material, list.length);
      im.castShadow = castShadow; im.receiveShadow = false;
      list.forEach((t, i) => { t.mesh = im; t.index = i; this.write(t); });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.boundingSphere.radius += 6;
      scene.add(im);
    }
  }

  write(t) {
    _p.set(t.x, 0, t.z);
    const k = t.k;
    if (t.tilt) {
      _e.set(t.tilt.x, t.rot, t.tilt.z, 'YXZ');
      _q.setFromEuler(_e);
    } else _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t.rot);
    _s.set(t.s * k, t.s * t.sy * k, t.s * k);
    _m.compose(_p, _q, _s);
    t.mesh.setMatrixAt(t.index, _m);
    this.dirty.add(t.mesh);
  }

  near(x, z, r) {
    const out = [];
    const c0 = Math.floor((x - r) / 4), c1 = Math.floor((x + r) / 4), d0 = Math.floor((z - r) / 4), d1 = Math.floor((z + r) / 4);
    for (let i = c0; i <= c1; i++) for (let j = d0; j <= d1; j++) {
      const l = this.hash.get(`${i},${j}`);
      if (!l) continue;
      for (const t of l) if ((t.x - x) ** 2 + (t.z - z) ** 2 < r * r) out.push(t);
    }
    return out;
  }

  shake(t) { if (t.alive && !t.anim) { t.anim = { type: 'shake', t: 0 }; this.animating.add(t); } }

  fell(t, dx, dz, done) {
    t.alive = false;
    t.anim = { type: 'fall', t: 0, dx, dz, done };
    this.animating.add(t);
  }

  poof(t, delay = 0, done) {
    t.alive = false;
    t.anim = { type: 'poof', t: -delay, done };
    this.animating.add(t);
  }

  regrow(t) {
    t.anim = { type: 'grow', t: 0 };
    t.alive = true; t.hp = 3;
    this.animating.add(t);
  }

  update(dt) {
    for (const t of this.animating) {
      const a = t.anim;
      a.t += dt;
      if (a.t < 0) continue;
      if (a.type === 'shake') {
        const w = Math.sin(a.t * 40) * 0.07 * Math.max(0, 1 - a.t / 0.35);
        t.tilt = { x: w, z: w * 0.6 };
        if (a.t > 0.35) { t.tilt = null; t.anim = null; this.animating.delete(t); }
      } else if (a.type === 'fall') {
        const f = Math.min(1, a.t / 0.55);
        const ang = f * f * 1.45;
        t.tilt = { x: a.dz * ang, z: -a.dx * ang };
        if (a.t > 0.55) t.k = Math.max(0, 1 - (a.t - 0.55) / 0.25);
        if (a.t > 0.8) { t.k = 0; t.tilt = null; t.anim = null; this.animating.delete(t); a.done && a.done(); }
      } else if (a.type === 'poof') {
        const f = Math.min(1, a.t / 0.35);
        t.k = f < 0.3 ? 1 + f * 0.4 : Math.max(0, 1.12 * (1 - (f - 0.3) / 0.7));
        if (f >= 1) { t.k = 0; t.anim = null; this.animating.delete(t); a.done && a.done(); }
      } else if (a.type === 'grow') {
        const f = Math.min(1, a.t / 1.6);
        t.k = f < 0.8 ? (f / 0.8) * 1.08 : 1.08 - (f - 0.8) / 0.2 * 0.08;
        if (f >= 1) { t.k = 1; t.anim = null; this.animating.delete(t); }
      }
      this.write(t);
    }
    for (const m of this.dirty) m.instanceMatrix.needsUpdate = true;
    this.dirty.clear();
  }
}
