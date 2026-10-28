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
  { x0: -33, x1: 17, z0: -6, z1: 6 }, // stage 5: the forge district to the west
  { x0: -33, x1: 43, z0: -6, z1: 6 }, // stage 6: the electric quarter to the east
];
export const BAND = 2.6;
export const MEADOW = { x0: -13, x1: 21, z0: -25, z1: -6.6 };
export const TREE_GAP = 3.1;
export const WALK_GAP = 2.0;
export const FRINGE = 3.0;
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
// Act III: the west gate, the Iron Cliff mine, the icebreaker's glacier gate
// and Station Aube far to the north.
export const WEST_GATE = { z0: 0.6, z1: 3.4 };
export const MINE = { x0: -46, x1: -34.5, z0: -8.5, z1: 8, fringe: 1.0 };
export const SHIP_GATE = { x0: -30.8, x1: -27.2 };
export const STATION = { x0: -40, x1: -18, z0: -98, z1: -76, fringe: 0.5 };

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
      if (clearStage === Infinity && (roundRectDist(x, z, STAGES[5], TREE_GAP) < 0 || inRect(x, z, MINE, 2.4))) clearStage = 5;
      if (clearStage === Infinity && inRect(x, z, ROAD, 1.4)) clearStage = 3.5;
      if (clearStage === Infinity && (roundRectDist(x, z, LAKE, 1.7) < 0 || inRect(x, z, CORRIDOR, 1.6))) clearStage = 4;
      if (clearStage === Infinity && roundRectDist(x, z, STAGES[6], TREE_GAP) < 0) clearStage = 6;
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
    this.districts = [];  // walled quarters added around the fort
    this.fence = null;
    this.campGround = null;

    const snowTex = snowTexture();
    snowTex.repeat.set(36, 36);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf3f7fc, map: snowTex }));
    ground.receiveShadow = true;
    scene.add(ground);
    this.ground = ground;

    this.rocks = []; this.rockCircles = [];
    for (const [x, z, s] of ROCKS) {
      const r = makeRock(s); r.position.set(x, 0, z); scene.add(r);
      const c = { x, z, r: 2.2 * s, rock: true };
      this.circles.push(c);
      this.rocks.push(r); this.rockCircles.push(c);
    }

    this.pathTex = packedSnowTexture();
    this.pathTex.repeat.set(2, 30);
  }

  setStage(stage, animate = true) {
    const prev = this.stage;
    this.stage = stage;
    if (stage >= 1) {
      const a = STAGES[stage], b = STAGES[prev] || {};
      if (prev < 1 || a.x0 !== b.x0 || a.x1 !== b.x1 || a.z0 !== b.z0 || a.z1 !== b.z1) this.buildGround(animate);
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

  // The palisade surrounds the main fort and every district: each edge is
  // a wall minus its gates and minus the stretches shared with a
  // neighbouring rectangle, so districts open widely onto the town.
  buildFence(animate) {
    const r = STAGES[this.stage];
    const group = new THREE.Group();
    const segs = [];
    const rects = [r, ...this.districts];
    const holesOn = (self, axis, c) => {
      const out = [];
      for (const o of rects) {
        if (o === self) continue;
        if (axis === 'z' && (Math.abs(o.z0 - c) < 1e-6 || Math.abs(o.z1 - c) < 1e-6)) out.push([o.x0, o.x1]);
        if (axis === 'x' && (Math.abs(o.x0 - c) < 1e-6 || Math.abs(o.x1 - c) < 1e-6)) out.push([o.z0, o.z1]);
      }
      return out;
    };
    const wall = (self, axis, c, a, b, gates = []) => {
      let parts = [[a, b]];
      for (const [h0, h1] of [...gates, ...holesOn(self, axis, c)]) {
        parts = parts.flatMap(([p0, p1]) => (h1 <= p0 || h0 >= p1 ? [[p0, p1]] : [[p0, Math.max(p0, h0)], [Math.min(p1, h1), p1]]).filter(([u, v]) => v - u > 0.05));
      }
      for (const [u, v] of parts) segs.push(axis === 'z' ? { ax: u, az: c, bx: v, bz: c } : { ax: c, az: u, bx: c, bz: v });
    };
    // north (towards the bear meadow) with a gate, and the icebreaker's gate
    wall(r, 'z', r.z0, r.x0, r.x1, [[GATE.x0, GATE.x1], ...(this.shipGate ? [[SHIP_GATE.x0, SHIP_GATE.x1]] : [])]);
    // south with the counter opening (and the lake gate from stage 4)
    wall(r, 'z', r.z1, r.x0, r.x1, [[COUNTER.x0, COUNTER.x1], ...(this.stage >= 4 ? [[SOUTH_GATE.x0, SOUTH_GATE.x1]] : [])]);
    wall(r, 'x', r.x0, r.z0, r.z1, this.stage >= 5 ? [[WEST_GATE.z0, WEST_GATE.z1]] : []);
    wall(r, 'x', r.x1, r.z0, r.z1);
    for (const d of this.districts) {
      // the icebreaker's road north runs through the northern quarters too
      wall(d, 'z', d.z0, d.x0, d.x1, this.shipGate ? [[SHIP_GATE.x0, SHIP_GATE.x1]] : []); wall(d, 'z', d.z1, d.x0, d.x1);
      wall(d, 'x', d.x0, d.z0, d.z1); wall(d, 'x', d.x1, d.z0, d.z1);
    }

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
    if (this.stage >= 5) for (const [z, sgn] of [[WEST_GATE.z0, 1], [WEST_GATE.z1, -1]]) {
      const leaf = new THREE.Mesh(leafGeo, leafM);
      leaf.position.set(r.x0 - 0.62, 0.75, z - sgn * 0.05);
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
  // Open ground plus a fringe of forest the hero can walk into: trees there
  // only block with their trunks, so every edge tree can be reached and cut.
  walkable(x, z) {
    if (meadowDist(x, z) < FRINGE) return true;
    if (this.stage >= 4 && (roundRectDist(x, z, LAKE, FRINGE - 0.6) < 0 || inRect(x, z, CORRIDOR))) return true;
    if (this.extraZones) for (const zr of this.extraZones) if (roundRectDist(x, z, zr, zr.fringe ?? FRINGE) < 0) return true;
    for (const d of this.districts) if (roundRectDist(x, z, d, WALK_GAP + FRINGE * 0.85) < 0) return true;
    const r = STAGES[this.stage];
    return roundRectDist(x, z, r, WALK_GAP + FRINGE * 0.85) < 0;
  }

  insideCamp(x, z) { return this.stage >= 1 && (inRect(x, z, STAGES[this.stage]) || this.districts.some((d) => inRect(x, z, d))); }

  // A new walled district attached to the fort: its own ground and walls.
  addDistrict(d, animate) {
    if (this.districts.includes(d)) return;
    this.districts.push(d);
    // boulders inside the new walls are quarried away
    this.rocks.forEach((r, i) => {
      const c = this.rockCircles[i];
      if (!c || !inRect(c.x, c.z, d, c.r)) return;
      this.scene.remove(r);
      this.circles = this.circles.filter((x) => x !== c);
      this.rockCircles[i] = null;
    });
    const w = d.x1 - d.x0 + 0.6, h = d.z1 - d.z0 + 0.6;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: campGroundTexture(w, h) }));
    m.position.set((d.x0 + d.x1) / 2, 0.011, (d.z0 + d.z1) / 2);
    m.receiveShadow = true;
    this.scene.add(m);
    if (animate) { m.scale.set(0.001, 1, 0.001); this.tween(0.6, (f) => { const k = Math.max(0.001, backOut(f)); m.scale.set(k, 1, k); }); }
    this.buildFence(animate);
  }
  atMine(x, z) { return this.stage >= 5 && !this.insideCamp(x, z) && x < STAGES[5].x0 + 0.2 && inRect(x, z, MINE, 3); }
  atStation(x, z) { return inRect(x, z, STATION, 4); }
  atLake(x, z) { return this.stage >= 4 && !this.insideCamp(x, z) && (inRect(x, z, LAKE, 0.5) || inRect(x, z, CORRIDOR)); }

  // Move a circle with sliding along the walkable border and colliders.
  // When an obstacle is hit head-on, try deflected directions so the mover
  // slides around it instead of stopping dead.
  move(pos, dx, dz, rad = 0.45) {
    const want = Math.hypot(dx, dz);
    const res = this.tryMove(pos, dx, dz, rad);
    let got = Math.hypot(res.x - pos.x, res.z - pos.z);
    if (want > 1e-4 && got < want * 0.35) {
      for (const a of [0.7, -0.7, 1.2, -1.2, 1.6, -1.6]) {
        const c = Math.cos(a), sn = Math.sin(a);
        const alt = this.tryMove(pos, (dx * c - dz * sn) * 0.85, (dx * sn + dz * c) * 0.85, rad);
        const g2 = Math.hypot(alt.x - pos.x, alt.z - pos.z);
        if (g2 > got + want * 0.2) { res.x = alt.x; res.z = alt.z; got = g2; break; }
      }
    }
    pos.x = res.x; pos.z = res.z;
  }

  tryMove(pos, dx, dz, rad) {
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
      // tree trunks (and the lowest branches) are solid
      if (this.forest) for (const t of this.forest.near(nx, nz, 1.7)) {
        if (!t.alive || t.k < 0.6) continue;
        const ddx = nx - t.x, ddz = nz - t.z, d = Math.hypot(ddx, ddz), min = 0.55 * t.s + rad;
        if (d < min && d > 1e-4) { nx = t.x + ddx / d * min; nz = t.z + ddz / d * min; this.bumped = t; }
      }
    }
    if (!this.walkable(nx, nz)) { nx = pos.x; nz = pos.z; }
    return { x: nx, z: nz };
  }

  // ------------------------------------------------------------------------
  // Architecture checks: which ground can a walker of radius `rad` stand on,
  // and which of it is connected to a given point.
  freeAt(x, z, rad = 0.45) {
    if (!this.walkable(x, z)) return false;
    for (const s of this.segments) {
      const vx = s.bx - s.ax, vz = s.bz - s.az, l2 = vx * vx + vz * vz;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * vx + (z - s.az) * vz) / l2));
      if (Math.hypot(x - s.ax - vx * t, z - s.az - vz * t) < rad + 0.12) return false;
    }
    for (const c of this.circles) {
      if (c.camp && this.stage < 1) continue;
      if (Math.hypot(x - c.x, z - c.z) < c.r + rad) return false;
    }
    if (this.forest) for (const t of this.forest.near(x, z, 1.7)) {
      if (t.alive && t.k >= 0.6 && Math.hypot(x - t.x, z - t.z) < 0.55 * t.s + rad) return false;
    }
    return true;
  }

  reachMap(b, from, step = 0.3, rad = 0.45) {
    const nx = Math.ceil((b.x1 - b.x0) / step) + 1, nz = Math.ceil((b.z1 - b.z0) / step) + 1;
    const free = new Uint8Array(nx * nz), seen = new Uint8Array(nx * nz);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) free[j * nx + i] = this.freeAt(b.x0 + i * step, b.z0 + j * step, rad) ? 1 : 0;
    const cell = (x, z) => [Math.round((x - b.x0) / step), Math.round((z - b.z0) / step)];
    let [si, sj] = cell(from.x, from.z);
    // start from the nearest free cell
    let best = -1, bd = Infinity;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (free[j * nx + i]) { const d = (i - si) ** 2 + (j - sj) ** 2; if (d < bd) { bd = d; best = j * nx + i; } }
    if (best >= 0) {
      const q = [best]; seen[best] = 1;
      while (q.length) {
        const k = q.pop(), i = k % nx, j = (k - i) / nx;
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
          const a = i + di, c = j + dj;
          if (a < 0 || c < 0 || a >= nx || c >= nz) continue;
          const kk = c * nx + a;
          if (free[kk] && !seen[kk]) { seen[kk] = 1; q.push(kk); }
        }
      }
    }
    return { b, step, nx, nz, free, seen, cell };
  }

  // Free ground that cannot be reached: closed pockets.
  pockets(map, minCells = 4) {
    const { nx, nz, free, seen, b, step } = map;
    const done = new Uint8Array(nx * nz), out = [];
    for (let k = 0; k < nx * nz; k++) {
      if (!free[k] || seen[k] || done[k]) continue;
      const q = [k]; done[k] = 1; let n = 0, sx = 0, sz = 0;
      while (q.length) {
        const c = q.pop(), i = c % nx, j = (c - i) / nx;
        n++; sx += b.x0 + i * step; sz += b.z0 + j * step;
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
          const a = i + di, cc = j + dj;
          if (a < 0 || cc < 0 || a >= nx || cc >= nz) continue;
          const kk = cc * nx + a;
          if (free[kk] && !seen[kk] && !done[kk]) { done[kk] = 1; q.push(kk); }
        }
      }
      if (n >= minCells) out.push({ x: +(sx / n).toFixed(1), z: +(sz / n).toFixed(1), cells: n });
    }
    return out;
  }

  // Nearest reachable free spot to (x, z), or null.
  nearestReachable(map, x, z) {
    const { nx, nz, seen, b, step } = map;
    let best = null, bd = Infinity;
    for (let k = 0; k < nx * nz; k++) {
      if (!seen[k]) continue;
      const i = k % nx, j = (k - i) / nx;
      const px = b.x0 + i * step, pz = b.z0 + j * step;
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bd) { bd = d; best = { x: px, z: pz }; }
    }
    return best;
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
