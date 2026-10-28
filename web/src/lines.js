// Conveyor lines: raised leather belts on trestles and cable lines with
// hanging baskets. Items are pulled from pads, ride the line and are handed
// to a sink (another pad, a machine). Drawn through the shared ItemRenderer.
import * as THREE from 'three';
import { ITEM_HEIGHT, mat } from './models.js';
import { makeCanvas, canvasTexture } from './textures.js';

let beltTex = null;
function beltTexture() {
  if (beltTex) return beltTex;
  const c = makeCanvas(64, 64), g = c.getContext('2d');
  g.fillStyle = '#3b3029'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#4c3d33'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 16, 64, 7);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, 4, 64); g.fillRect(60, 0, 4, 64);
  beltTex = canvasTexture(c, { repeat: true });
  return beltTex;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class Line {
  // path: [{x, y, z}], kind: 'belt' | 'cable'
  // sources: [{ pad, s, when?() }]  sink: { accept(type), deliver(type, from) }
  constructor(game, { path, kind = 'belt', speed = 1.8, spacing = 0.55, sources = [], sink, pullEvery = 0.12, posts = null, camp = true, color = 0x2f2a26 }) {
    this.game = game;
    this.kind = kind;
    this.pts = path.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.L = this.cum[this.cum.length - 1];
    this.speed = speed; this.spacing = spacing;
    this.sources = sources; this.sink = sink;
    this.pullEvery = pullEvery; this.pullT = 0;
    this.items = [];
    this.cap = Math.floor(this.L / spacing);
    this.moving = 0;
    this.group = new THREE.Group();
    this.colliders = [];
    if (kind === 'belt') this.buildBelt(posts, camp);
    else this.buildCable(posts, camp, color);
    game.scene.add(this.group);
  }

  pointAt(s, out = new THREE.Vector3()) {
    s = Math.max(0, Math.min(this.L, s));
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < s) i++;
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    return out.copy(this.pts[i - 1]).lerp(this.pts[i], (s - this.cum[i - 1]) / seg);
  }
  angleAt(s) {
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < s) i++;
    const a = this.pts[i - 1], b = this.pts[i];
    return Math.atan2(b.x - a.x, b.z - a.z);
  }
  // where an item riding at s sits (on the belt, or in its basket)
  itemPos(s, type, out = new THREE.Vector3()) {
    this.pointAt(s, out);
    if (this.kind === 'belt') out.y += 0.1;
    else out.y -= 0.78 - (ITEM_HEIGHT[type] || 0.12) * 0.5;
    return out;
  }

  addPost(x, z, camp) {
    const c = { x, z, r: 0.2, camp };
    this.game.world.circles.push(c);
    this.colliders.push(c);
  }

  buildBelt(posts, camp) {
    const tex = beltTexture().clone();
    const frameM = mat(0x5b3c26), legM = mat(0x4a3324), steel = mat(0x6d747c, { standard: true, metalness: 0.6, roughness: 0.45 });
    const beltM = new THREE.MeshLambertMaterial({ map: tex });
    this.beltMat = beltM;
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i];
      const len = a.distanceTo(b);
      const seg = new THREE.Group();
      seg.position.copy(a).lerp(b, 0.5);
      seg.lookAt(b.x, b.y, b.z);
      const surf = new THREE.PlaneGeometry(0.62, len).rotateX(-Math.PI / 2);
      const uv = surf.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) * len / 0.5);
      const top = new THREE.Mesh(surf, beltM); top.position.y = 0.02; seg.add(top);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, len), frameM); body.position.y = -0.06; body.castShadow = true; seg.add(body);
      for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, len), steel); r.position.set(sx * 0.36, 0.04, 0); seg.add(r); }
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 10).rotateZ(Math.PI / 2), steel);
      roll.position.z = len / 2; seg.add(roll);
      this.group.add(seg);
    }
    // trestle legs
    const legAt = posts || this.defaultSupports(2.4);
    for (const s of legAt) {
      const p = this.pointAt(s, _a);
      const h = p.y - 0.12;
      const leg = new THREE.Group();
      for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, 0.1), legM); l.position.set(sx * 0.28, h / 2, 0); l.castShadow = true; leg.add(l); }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.08), legM); bar.position.y = h * 0.55; leg.add(bar);
      leg.position.set(p.x, 0, p.z); leg.rotation.y = this.angleAt(s);
      this.group.add(leg);
      this.addPost(p.x, p.z, camp);
    }
  }

  buildCable(posts, camp, color) {
    const wood = mat(0x5a3f2a), snow = mat(0xf6f9fd), steel = mat(0x6d747c, { standard: true, metalness: 0.6, roughness: 0.45 });
    const cableM = mat(color);
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i];
      const len = a.distanceTo(b);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 5).rotateX(Math.PI / 2), cableM);
      c.position.copy(a).lerp(b, 0.5); c.lookAt(b); this.group.add(c);
    }
    const at = posts || this.pts.map((_, i) => this.cum[i]);
    for (const s of at) {
      const p = this.pointAt(s, _a);
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, p.y + 0.25, 6), wood); pole.position.y = (p.y + 0.25) / 2; pole.castShadow = true; g.add(pole);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.07, 6), snow); cap.position.y = p.y + 0.29; g.add(cap);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 5, 12), steel); wheel.position.set(0, p.y + 0.02, 0); wheel.rotation.y = this.angleAt(Math.min(s + 0.01, this.L)) + Math.PI / 2; g.add(wheel);
      g.position.set(p.x, 0, p.z);
      this.group.add(g);
      this.addPost(p.x, p.z, camp);
    }
    // hanging baskets, one per riding item
    const bg = new THREE.BoxGeometry(0.62, 0.14, 0.62).translate(0, -0.84, 0);
    const hook = new THREE.BoxGeometry(0.04, 0.72, 0.04).translate(0, -0.42, 0);
    const geo = mergeBasket(bg, hook);
    this.baskets = new THREE.InstancedMesh(geo, mat(0x7a5233), 64);
    this.baskets.count = 0; this.baskets.castShadow = true; this.baskets.frustumCulled = false;
    this.group.add(this.baskets);
  }

  defaultSupports(every) {
    const out = [];
    let flatLen = 0;
    for (let i = 1; i < this.pts.length; i++) flatLen += Math.hypot(this.pts[i].x - this.pts[i - 1].x, this.pts[i].z - this.pts[i - 1].z);
    const n = Math.max(1, Math.round(flatLen / every));
    for (let k = 0; k <= n; k++) out.push(0.25 + (this.L - 0.5) * k / n);
    return out;
  }

  hasRoomAt(s) { for (const it of this.items) if (Math.abs(it.s - s) < this.spacing) return false; return true; }

  update(dt) {
    const g = this.game;
    this.items.sort((a, b) => b.s - a.s);
    let ahead = Infinity, moved = 0;
    for (const it of this.items) {
      if (!it.loading) {
        const limit = Math.min(this.L, ahead - this.spacing);
        const ns = Math.min(limit, it.s + this.speed * dt);
        if (ns > it.s) { it.s = ns; moved = 1; }
      }
      ahead = it.s;
    }
    const head = this.items[0];
    if (head && !head.loading && head.s >= this.L - 1e-3 && this.sink.accept(head.type)) {
      this.items.shift();
      this.sink.deliver(head.type, this.itemPos(this.L, head.type, new THREE.Vector3()));
    }
    this.pullT -= dt;
    if (this.pullT <= 0) {
      this.pullT = this.pullEvery;
      for (const src of this.sources) {
        const pad = src.pad;
        if (pad.n - (pad.inflight || 0) <= 0 || this.items.length >= this.cap) continue;
        if (src.when && !src.when()) continue;
        if (!this.hasRoomAt(src.s)) continue;
        const it = { type: pad.type, s: src.s, loading: true };
        this.items.push(it);
        const from = g.pickPos(pad);
        pad.n--;
        const dest = this.itemPos(src.s, pad.type, new THREE.Vector3());
        g.fly(pad.type, from, () => dest, { dur: 0.42, arc: 1.0, onArrive: () => { it.loading = false; } });
      }
    }
    this.moving += ((moved ? 1 : 0) - this.moving) * Math.min(1, dt * 4);
    if (this.beltMat) this.beltMat.map.offset.y -= dt * this.speed * 2 * this.moving;
  }

  // Push an item produced on the spot (a machine output) onto the start.
  push(type) {
    if (!this.hasRoomAt(0) || this.items.length >= this.cap) return false;
    this.items.push({ type, s: 0 });
    return true;
  }

  draw(R) {
    let n = 0;
    for (const it of this.items) {
      if (it.loading) continue;
      const p = this.itemPos(it.s, it.type, _b);
      const rot = this.angleAt(it.s) + (it.type === 'log' || it.type === 'cash' ? Math.PI / 2 : 0);
      R.add(it.type, p.x, p.y, p.z, rot);
      if (this.baskets && n < 64) {
        const q = this.pointAt(it.s, _a);
        _m.makeRotationY(this.angleAt(it.s)); _m.setPosition(q.x, q.y, q.z);
        this.baskets.setMatrixAt(n++, _m);
      }
    }
    if (this.baskets) { this.baskets.count = n; this.baskets.instanceMatrix.needsUpdate = true; }
  }

  remove() {
    this.game.scene.remove(this.group);
    this.game.world.circles = this.game.world.circles.filter((c) => !this.colliders.includes(c));
  }
}
const _m = new THREE.Matrix4();

function mergeBasket(a, b) {
  const pa = a.toNonIndexed(), pb = b.toNonIndexed();
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(pa.attributes.position.count * 3 + pb.attributes.position.count * 3);
  pos.set(pa.attributes.position.array, 0); pos.set(pb.attributes.position.array, pa.attributes.position.array.length);
  const nor = new Float32Array(pos.length);
  nor.set(pa.attributes.normal.array, 0); nor.set(pb.attributes.normal.array, pa.attributes.normal.array.length);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}

// Sink that drops items onto a pad pile.
export function padSink(game, pad, { dur = 0.4, arc = 0.6 } = {}) {
  const cap = () => (pad.pile ? pad.pile.cap : pad.cap);
  return {
    accept: () => pad.n < cap(),
    deliver: (type, from) => { game.fly(type, from, game.incoming(pad), { dur, arc, onArrive: () => { pad.inflight--; } }); },
  };
}
export { UP };
