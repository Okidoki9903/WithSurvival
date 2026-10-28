// Map layout, terrain, palisades, walkable area and collisions.
import * as THREE from 'three';
import { snowTexture, packedSnowTexture, campGroundTexture } from './textures.js';
import { makeRock } from './models.js';

// Camp rectangle for each stage (stage 0 = only the clearing).
export const STAGES = [
  { x0: -7, x1: 7, z0: -6, z1: 6 },
  { x0: -7, x1: 7, z0: -6, z1: 6 },
  { x0: -7, x1: 17, z0: -6, z1: 6 },
  { x0: -17, x1: 17, z0: -6, z1: 6 },
  { x0: -17, x1: 17, z0: -6, z1: 6 }, // stage 4: same fort, the frozen lake opens to the south-east
];
export const BAND = 2.6;
export const MEADOW = { x0: -13, x1: 21, z0: -25, z1: -6.6 };
export const TREE_GAP = 3.1;
export const WALK_GAP = 2.0;
export const PATH = { x0: -7.8, x1: -2.2, z0: 6, z1: 90 };
export const GATE = { x0: -1.4, x1: 1.4 };
export const COUNTER = { x0: -5.4, x1: -2.6, z: 6 };
export const LANE_QUEUE = -4.0;
export const LANE_EXIT = -6.5;
// Act II: caravan road (south), frozen lake region and its south gate.
export const ROAD = { x0: 3.4, x1: 8.2, z0: 6, z1: 90 };
export const LAKE = { x0: 9.5, x1: 30, z0: 10.5, z1: 26 };
export const CORRIDOR = { x0: 11.2, x1: 13.6, z0: 5.5, z1: 11.5 };
export const SOUTH_GATE = { x0: 11.2, x1: 13.6 };

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function roundRectDist(x, z, r, grow) {
  // signed distance to a rect expanded by `grow` with rounded corners
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
  const hx = (r.x1 - r.x0) / 2, hz = (r.z1 - r.z0) / 2;
  const dx = Math.abs(x - cx) - hx, dz = Math.abs(z - cz) - hz;
  const out = Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
  return out + Math.min(Math.max(dx, dz), 0) - grow;
}
export const inRect = (x, z, r, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

function meadowDist(x, z) {
  const wob = (noise(x * 0.2, z * 0.2) - 0.5) * 5;
  return roundRectDist(x, z, MEADOW, 1.5 + wob);
}

export function generateTrees() {
  const trees = [];
  const sp = 2.2;
  for (let gx = -64; gx <= 70; gx += sp) {
    for (let gz = -70; gz <= 60; gz += sp) {
      const x = gx + (hash2(gx, gz) - 0.5) * sp * 0.9;
      const z = gz + (hash2(gz + 3.1, gx - 7.7) - 0.5) * sp * 0.9;
      const margin = 1.2;
      if (meadowDist(x, z) < margin) continue;
      if (roundRectDist(x, z, STAGES[0], TREE_GAP) < 0) continue;
      if (Math.hypot(x - ROCKS[0][0], z - ROCKS[0][1]) < 3.4) continue;
      let clearStage = Infinity;
      if (inRect(x, z, PATH, margin + 0.4)) clearStage = 1;
      for (let s = 3; s >= 2; s--) if (roundRectDist(x, z, STAGES[s], TREE_GAP) < 0) clearStage = Math.min(clearStage, s);
      if (clearStage === Infinity && inRect(x, z, ROAD, 1.4)) clearStage = 3.5;
      if (clearStage === Infinity && (roundRectDist(x, z, LAKE, 1.7) < 0 || inRect(x, z, CORRIDOR, 1.6))) clearStage = 4;
      const s = 0.85 + hash2(x * 3, z * 5) * 0.35;
      trees.push({ x, z, s, sy: 0.9 + hash2(z, x) * 0.3, rot: hash2(x, z * 2) * Math.PI * 2, variant: hash2(x * 7, z) < 0.5 ? 0 : 1, clearStage });
    }
  }
  return trees;
}
export const ROCKS = [[16.5, -10.5, 0.8], [-27, -24, 1.3], [33, -30, 1.0], [-20, 13, 0.9]];

// ---------------------------------------------------------------------------
export class World {
  constructor(scene) {
    this.scene = scene;
    this.stage = 0;
    this.segments = [];   // fence/rail colliders
    this.circles = [];    // solid props
    this.fence = null;
    this.campGround = null;

    const snowTex = snowTexture();
    snowTex.repeat.set(36, 36);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf3f7fc, map: snowTex }));
    ground.receiveShadow = true;
    scene.add(ground);
    this.ground = ground;

    for (const [x, z, s] of ROCKS) {
      const r = makeRock(s); r.position.set(x, 0, z); scene.add(r);
      this.circles.push({ x, z, r: 2.2 * s, rock: true });
    }

    this.pathTex = packedSnowTexture();
    this.pathTex.repeat.set(2, 30);
  }

  setStage(stage, animate = true) {
    const prev = this.stage;
    this.stage = stage;
    if (stage >= 1) {
      if (stage <= 3 || prev < 3) this.buildGround(animate);
      this.buildFence(animate);
      if (prev < 1) this.buildPath(animate);
    }
  }

  // Packed-snow caravan road with sled ruts, opened when the beacon is lit.
  buildRoad(animate) {
    if (this.road) return;
    const r = ROAD, w = r.x1 - r.x0, h = r.z1 - r.z0;
    const g = new THREE.Group();
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: this.pathTex, color: 0xdfe8f2 }));
    road.position.set((r.x0 + r.x1) / 2, 0.011, (r.z0 + r.z1) / 2); road.receiveShadow = true; g.add(road);
    const rutM = new THREE.MeshLambertMaterial({ color: 0xb9c7d6 });
    for (const dx of [-0.75, 0.75]) {
      const rut = new THREE.Mesh(new THREE.PlaneGeometry(0.22, h).rotateX(-Math.PI / 2), rutM);
      rut.position.set((r.x0 + r.x1) / 2 + dx, 0.016, (r.z0 + r.z1) / 2); g.add(rut);
    }
    const postM = new THREE.MeshLambertMaterial({ color: 0x6b4a2e }), snowM = new THREE.MeshLambertMaterial({ color: 0xf7f9fc });
    for (let z = 12; z < 70; z += 9) for (const x of [r.x0 - 0.3, r.x1 + 0.3]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 0.16), postM); p.position.set(x, 0.7, z); p.castShadow = true; g.add(p);
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.22), snowM); c.position.set(x, 1.45, z); g.add(c);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.24), new THREE.MeshLambertMaterial({ color: 0xd23b3b, side: THREE.DoubleSide })); flag.position.set(x + 0.2, 1.25, z); g.add(flag);
    }
    this.scene.add(g);
    this.road = g;
    if (animate) { g.scale.set(1, 1, 0.001); this.tween(1.2, (f) => g.scale.set(1, 1, Math.max(0.001, f))); }
  }

  buildGround(animate) {
    const r = STAGES[this.stage];
    const w = r.x1 - r.x0 + 0.6, h = r.z1 - r.z0 + 0.6;
    const tex = campGroundTexture(w, h);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set((r.x0 + r.x1) / 2, 0.012, (r.z0 + r.z1) / 2);
    m.receiveShadow = true;
    this.scene.add(m);
    const old = this.campGround;
    this.campGround = m;
    if (old) { old.position.y = 0.006; }
    if (animate) {
      m.scale.set(0.001, 1, 0.001);
      this.tween(0.6, (f) => { const k = Math.max(0.001, backOut(f)); m.scale.set(k, 1, k); }, () => { if (old) { this.scene.remove(old); old.material.map.dispose(); } });
    } else if (old) this.scene.remove(old);
  }

  buildFence(animate) {
    const r = STAGES[this.stage];
    const group = new THREE.Group();
    const segs = [];
    const add = (ax, az, bx, bz) => segs.push({ ax, az, bx, bz });
    // north (towards the bear meadow) with a gate
    add(r.x0, r.z0, GATE.x0, r.z0); add(GATE.x1, r.z0, r.x1, r.z0);
    // south with the counter opening (and the lake gate from stage 4)
    add(r.x0, r.z1, COUNTER.x0, r.z1);
    if (this.stage >= 4) { add(COUNTER.x1, r.z1, SOUTH_GATE.x0, r.z1); add(SOUTH_GATE.x1, r.z1, r.x1, r.z1); }
    else add(COUNTER.x1, r.z1, r.x1, r.z1);
    add(r.x0, r.z0, r.x0, r.z1); add(r.x1, r.z0, r.x1, r.z1);

    let planks = 0;
    for (const s of segs) planks += Math.ceil(Math.hypot(s.bx - s.ax, s.bz - s.az) / 0.38);
    const plankGeo = new THREE.BoxGeometry(0.36, 1.55, 0.14);
    const capGeo = new THREE.BoxGeometry(0.39, 0.13, 0.24);
    const plankMesh = new THREE.InstancedMesh(plankGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), planks);
    const capMesh = new THREE.InstancedMesh(capGeo, new THREE.MeshLambertMaterial({ color: 0xf5f8fc }), planks);
    plankMesh.castShadow = capMesh.castShadow = true;
    plankMesh.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();
    let i = 0;
    for (const s of segs) {
      const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
      const n = Math.ceil(len / 0.38);
      const ang = Math.atan2(s.bx - s.ax, s.bz - s.az) + Math.PI / 2;
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, ang);
      for (let k = 0; k < n; k++) {
        const f = (k + 0.5) / n;
        const hv = 0.92 + hash2(i * 1.3, 2.1) * 0.16;
        const x = s.ax + (s.bx - s.ax) * f, z = s.az + (s.bz - s.az) * f;
        p.set(x, 0.775 * hv, z); sc.set(1, hv, 1);
        m.compose(p, q, sc); plankMesh.setMatrixAt(i, m);
        col.setHSL(0.07, 0.22 + hash2(i, 5) * 0.08, 0.27 + hash2(i, 9) * 0.08);
        plankMesh.setColorAt(i, col);
        p.set(x, 1.55 * hv + 0.04, z); sc.set(1, 1, 1);
        m.compose(p, q, sc); capMesh.setMatrixAt(i, m);
        i++;
      }
    }
    group.add(plankMesh, capMesh);
    // posts with snow caps at corners and along the fence
    const postM = new THREE.MeshLambertMaterial({ color: 0x4b3628 }), snowM = new THREE.MeshLambertMaterial({ color: 0xf6f9fd });
    const post = new THREE.BoxGeometry(0.3, 1.95, 0.3), postCap = new THREE.BoxGeometry(0.42, 0.22, 0.42);
    const addPost = (x, z) => {
      const a = new THREE.Mesh(post, postM); a.position.set(x, 0.975, z); a.castShadow = true;
      const b = new THREE.Mesh(postCap, snowM); b.position.set(x, 2.02, z); b.castShadow = true;
      group.add(a, b);
    };
    for (const s of segs) {
      const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
      const n = Math.max(1, Math.round(len / 4));
      for (let k = 0; k <= n; k++) addPost(s.ax + (s.bx - s.ax) * k / n, s.az + (s.bz - s.az) * k / n);
    }
    // open gate leaves
    const leafGeo = new THREE.BoxGeometry(1.3, 1.4, 0.12);
    const leafM = new THREE.MeshLambertMaterial({ color: 0x5a4030 });
    for (const [x, sgn] of [[GATE.x0, 1], [GATE.x1, -1]]) {
      const leaf = new THREE.Mesh(leafGeo, leafM);
      leaf.position.set(x - sgn * 0.05, 0.75, r.z0 - 0.62); leaf.rotation.y = sgn * Math.PI / 2;
      leaf.castShadow = true; group.add(leaf);
    }
    if (this.stage >= 4) for (const [x, sgn] of [[SOUTH_GATE.x0, 1], [SOUTH_GATE.x1, -1]]) {
      const leaf = new THREE.Mesh(leafGeo, leafM);
      leaf.position.set(x - sgn * 0.05, 0.75, r.z1 + 0.62); leaf.rotation.y = sgn * Math.PI / 2;
      leaf.castShadow = true; group.add(leaf);
    }

    this.scene.add(group);
    const old = this.fence;
    this.fence = group;
    this.fenceSegs = segs;
    this.rebuildColliders();
    if (animate) {
      group.scale.y = 0.001;
      this.tween(0.7, (f) => { group.scale.y = Math.max(0.001, backOut(f)); });
      if (old) this.tween(0.5, (f) => { old.scale.y = Math.max(0.001, 1 - f); old.position.y = -f * 0.3; }, () => this.scene.remove(old));
    } else if (old) this.scene.remove(old);
  }

  buildPath(animate) {
    const p = PATH;
    const w = p.x1 - p.x0, h = p.z1 - p.z0;
    const path = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: this.pathTex, color: 0xe7eef6 }));
    path.position.set((p.x0 + p.x1) / 2, 0.01, (p.z0 + p.z1) / 2);
    path.receiveShadow = true;
    this.scene.add(path);
    const group = new THREE.Group();
    const railM = new THREE.MeshLambertMaterial({ color: 0xb8ab9b }), snowM = new THREE.MeshLambertMaterial({ color: 0xf7f9fc });
    const postG = new THREE.BoxGeometry(0.16, 0.85, 0.16), postCap = new THREE.BoxGeometry(0.22, 0.1, 0.22);
    const lines = [[PATH.x0, 7.6, 70], [-5.25, 9.2, 70], [PATH.x1, 7.6, 70]];
    this.railSegs = [];
    for (const [x, z0, z1] of lines) {
      for (let z = z0; z <= z1; z += 2.2) {
        const a = new THREE.Mesh(postG, railM); a.position.set(x, 0.42, z); a.castShadow = true;
        const c = new THREE.Mesh(postCap, snowM); c.position.set(x, 0.88, z);
        group.add(a, c);
      }
      for (const y of [0.42, 0.72]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, z1 - z0), railM);
        rail.position.set(x, y, (z0 + z1) / 2); rail.castShadow = true; group.add(rail);
      }
      const snowTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, z1 - z0), snowM);
      snowTop.position.set(x, 0.79, (z0 + z1) / 2); group.add(snowTop);
      this.railSegs.push({ ax: x, az: z0, bx: x, bz: z1 });
    }
    this.scene.add(group);
    this.rebuildColliders();
    if (animate) {
      group.scale.y = 0.001; path.scale.x = 0.001;
      this.tween(0.9, (f) => { path.scale.x = Math.max(0.001, f); group.scale.y = Math.max(0.001, backOut(f)); });
    }
  }

  rebuildColliders() {
    this.segments = [...(this.fenceSegs || []), ...(this.railSegs || [])];
  }

  // ------------------------------------------------------------------------
  walkable(x, z) {
    if (inRect(x, z, MEADOW, 1.0) && meadowDist(x, z) < -0.4) return true;
    if (this.stage >= 4 && (roundRectDist(x, z, LAKE, -0.6) < 0 || inRect(x, z, CORRIDOR))) return true;
    const r = STAGES[this.stage];
    return roundRectDist(x, z, r, WALK_GAP) < 0;
  }

  insideCamp(x, z) { return this.stage >= 1 && inRect(x, z, STAGES[this.stage]); }
  atLake(x, z) { return this.stage >= 4 && !this.insideCamp(x, z) && (inRect(x, z, LAKE, 0.5) || inRect(x, z, CORRIDOR)); }

  // Move a circle with sliding along the walkable border and colliders.
  move(pos, dx, dz, rad = 0.45) {
    let nx = pos.x + dx, nz = pos.z + dz;
    if (!this.walkable(nx, nz)) {
      if (this.walkable(pos.x + dx, pos.z)) nz = pos.z;
      else if (this.walkable(pos.x, pos.z + dz)) nx = pos.x;
      else { nx = pos.x; nz = pos.z; }
    }
    for (let it = 0; it < 2; it++) {
      for (const s of this.segments) {
        const vx = s.bx - s.ax, vz = s.bz - s.az;
        const l2 = vx * vx + vz * vz;
        let t = ((nx - s.ax) * vx + (nz - s.az) * vz) / l2;
        t = Math.max(0, Math.min(1, t));
        const cx = s.ax + vx * t, cz = s.az + vz * t;
        const ddx = nx - cx, ddz = nz - cz;
        const d = Math.hypot(ddx, ddz), min = rad + 0.12;
        if (d < min) {
          if (d < 1e-4) { nx = pos.x; nz = pos.z; continue; }
          nx = cx + ddx / d * min; nz = cz + ddz / d * min;
        }
      }
      for (const c of this.circles) {
        if (c.camp && this.stage < 1) continue;
        const ddx = nx - c.x, ddz = nz - c.z, d = Math.hypot(ddx, ddz), min = c.r + rad;
        if (d < min && d > 1e-4) { nx = c.x + ddx / d * min; nz = c.z + ddz / d * min; }
      }
    }
    if (!this.walkable(nx, nz)) { nx = pos.x; nz = pos.z; }
    pos.x = nx; pos.z = nz;
  }

  // tiny internal tween helper
  tween(dur, fn, done) { (this.tweens ||= []).push({ t: 0, dur, fn, done }); }
  update(dt) {
    if (!this.tweens) return;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const f = Math.min(1, tw.t / tw.dur);
      tw.fn(f);
      if (f >= 1) { this.tweens.splice(i, 1); tw.done && tw.done(); }
    }
  }
}

export function backOut(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
