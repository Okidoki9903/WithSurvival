// Procedural low-poly models: people, polar bears, stations and carried items.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!matCache.has(key)) {
    const { standard, ...rest } = opts;
    const m = standard
      ? new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...rest })
      : new THREE.MeshLambertMaterial({ color, ...rest });
    matCache.set(key, m);
  }
  return matCache.get(key);
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,0.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
// Additive halo sprite used instead of a bloom pass.
export function glow(color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1);
  s.renderOrder = 6;
  return s;
}

export function hdr(r, g, b) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: true });
}

function mesh(geo, material, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// Paint a geometry with a per-vertex colour function.
export function paint(geo, fn) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(c, pos.getX(i), pos.getY(i), pos.getZ(i), nor ? nor.getY(i) : 0, i);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const solid = (hex) => { const k = new THREE.Color(hex); return (c) => c.copy(k); };

// ---------------------------------------------------------------------------
// Shared geometries
// ---------------------------------------------------------------------------
const G = {
  leg: new THREE.BoxGeometry(0.2, 0.5, 0.22).translate(0, -0.25, 0),
  boot: new THREE.BoxGeometry(0.23, 0.15, 0.32).translate(0, -0.53, 0.04),
  torso: new THREE.CapsuleGeometry(0.3, 0.4, 4, 12),
  skirt: new THREE.CylinderGeometry(0.31, 0.37, 0.28, 12),
  head: new THREE.SphereGeometry(0.24, 14, 12),
  hood: new THREE.SphereGeometry(0.31, 14, 12),
  fur: new THREE.TorusGeometry(0.21, 0.075, 8, 18),
  eye: new THREE.SphereGeometry(0.035, 6, 6),
  arm: new THREE.CapsuleGeometry(0.09, 0.34, 4, 8).translate(0, -0.24, 0),
  mitt: new THREE.SphereGeometry(0.1, 8, 8).translate(0, -0.5, 0),
  handle: new THREE.CylinderGeometry(0.035, 0.04, 0.85, 6).translate(0, -0.42, 0),
  blade: (() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(0.34, -0.06, 0.32, -0.34); s.quadraticCurveTo(0.12, -0.26, 0, -0.2); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }).translate(0, 0, -0.025);
  })(),
};

// ---------------------------------------------------------------------------
// Humans
// ---------------------------------------------------------------------------
export function makeHuman({ parka = 0x2f6db0, pants = 0x2b3140, fur = 0xf3f3f0, skin = 0xf1c49f, mitt = 0x252a33, tool = 'axe', scale = 1, scarf = null } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const parkaM = mat(parka), pantsM = mat(pants), furM = mat(fur), skinM = mat(skin), dark = mat(0x1b1b22), mittM = mat(mitt);

  const legs = [];
  for (const sx of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(sx * 0.13, 0.62, 0);
    p.add(mesh(G.leg, pantsM)); p.add(mesh(G.boot, dark));
    body.add(p); legs.push(p);
  }
  const torso = mesh(G.torso, parkaM); torso.position.y = 1.08; torso.scale.set(1, 1, 0.86); body.add(torso);
  const skirt = mesh(G.skirt, parkaM); skirt.position.y = 0.76; body.add(skirt);
  const headG = new THREE.Group(); headG.position.set(0, 1.6, 0); body.add(headG);
  const hood = mesh(G.hood, parkaM); hood.position.set(0, 0.02, -0.05); headG.add(hood);
  const head = mesh(G.head, skinM); head.position.set(0, -0.01, 0.08); headG.add(head);
  const furRim = mesh(G.fur, furM); furRim.position.set(0, 0, 0.16); headG.add(furRim);
  for (const sx of [-1, 1]) { const e = mesh(G.eye, dark, { cast: false }); e.position.set(sx * 0.08, 0.02, 0.3); headG.add(e); }
  if (scarf) {
    const sc = mesh(new THREE.TorusGeometry(0.24, 0.07, 6, 14), mat(scarf));
    sc.rotation.x = Math.PI / 2; sc.position.y = 1.36; body.add(sc);
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(sx * 0.37, 1.3, 0); p.rotation.z = sx * 0.12;
    p.add(mesh(G.arm, parkaM)); p.add(mesh(G.mitt, mittM));
    body.add(p); arms.push(p);
  }
  let toolMesh = null;
  if (tool === 'axe') {
    toolMesh = new THREE.Group();
    toolMesh.add(mesh(G.handle, mat(0x7a5233)));
    const b = mesh(G.blade, mat(0xcfd6de, { standard: true, metalness: 0.7, roughness: 0.35 }));
    b.position.set(0.02, -0.62, 0); b.rotation.y = -Math.PI / 2; toolMesh.add(b);
    toolMesh.position.y = -0.5; toolMesh.rotation.x = -Math.PI / 2 + 0.25;
    arms[1].add(toolMesh);
  }
  root.scale.setScalar(scale);

  const h = {
    root, body, legs, arms, tool: toolMesh, headG,
    phase: Math.random() * 10,
    pose(dt, move, swing = -1, carrying = false) {
      h.phase += dt * (6 + move * 7);
      const s = Math.sin(h.phase), amp = Math.min(1, move);
      legs[0].rotation.x = s * 0.75 * amp; legs[1].rotation.x = -s * 0.75 * amp;
      body.position.y = Math.abs(Math.cos(h.phase)) * 0.06 * amp + Math.sin(h.phase * 0.35) * 0.008 * (1 - amp);
      const armBase = carrying ? -0.35 : 0;
      arms[0].rotation.x = armBase - s * 0.6 * amp;
      if (swing >= 0) {
        // windup over the head, fast strike forward, recover.
        let a;
        if (swing < 0.4) a = THREE.MathUtils.lerp(-0.2, -2.7, easeOut(swing / 0.4));
        else if (swing < 0.6) a = THREE.MathUtils.lerp(-2.7, -0.55, easeIn((swing - 0.4) / 0.2));
        else a = THREE.MathUtils.lerp(-0.55, -0.2, (swing - 0.6) / 0.4);
        arms[1].rotation.x = a;
        body.rotation.x = swing > 0.4 && swing < 0.7 ? 0.12 : 0;
      } else {
        arms[1].rotation.x = armBase + s * 0.6 * amp;
        body.rotation.x = 0;
      }
    },
  };
  return h;
}
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeIn = (t) => t * t;

// ---------------------------------------------------------------------------
// Polar bear
// ---------------------------------------------------------------------------
const BG = {
  body: new THREE.SphereGeometry(1, 16, 12),
  head: new THREE.SphereGeometry(0.4, 14, 10),
  snout: new THREE.SphereGeometry(0.22, 10, 8),
  nose: new THREE.SphereGeometry(0.075, 8, 6),
  eye: new THREE.SphereGeometry(0.045, 6, 6),
  ear: new THREE.SphereGeometry(0.11, 8, 6),
  leg: new THREE.CapsuleGeometry(0.17, 0.42, 4, 8).translate(0, -0.38, 0),
  paw: new THREE.SphereGeometry(0.2, 8, 6).scale(1, 0.6, 1.25).translate(0, -0.72, 0.05),
  tail: new THREE.SphereGeometry(0.13, 8, 6),
  barBg: new THREE.PlaneGeometry(1.3, 0.17),
  barFg: new THREE.PlaneGeometry(1.2, 0.09).translate(0.6, 0, 0),
};

export function makeBear({ scale = 1, color = 0xf3f1ea, boss = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const furM = new THREE.MeshLambertMaterial({ color, emissive: 0x000000 });
  const dark = mat(0x16161a);
  const trunk = mesh(BG.body, furM); trunk.scale.set(0.72, 0.64, 1.12); trunk.position.y = 0.98; body.add(trunk);
  const hump = mesh(BG.body, furM); hump.scale.set(0.62, 0.58, 0.6); hump.position.set(0, 1.12, 0.45); body.add(hump);
  const headG = new THREE.Group(); headG.position.set(0, 1.2, 1.05); body.add(headG);
  const head = mesh(BG.head, furM); head.scale.set(0.92, 0.86, 1); headG.add(head);
  const snout = mesh(BG.snout, furM); snout.scale.set(0.8, 0.72, 1.15); snout.position.set(0, -0.09, 0.36); headG.add(snout);
  const nose = mesh(BG.nose, dark, { cast: false }); nose.position.set(0, -0.04, 0.6); headG.add(nose);
  for (const sx of [-1, 1]) {
    const e = mesh(BG.eye, dark, { cast: false }); e.position.set(sx * 0.17, 0.09, 0.3); headG.add(e);
    const ear = mesh(BG.ear, furM); ear.position.set(sx * 0.25, 0.3, -0.06); headG.add(ear);
  }
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const p = new THREE.Group(); p.position.set(sx * 0.38, 0.86, sz * 0.6);
    p.add(mesh(BG.leg, furM)); p.add(mesh(BG.paw, furM));
    body.add(p); legs.push(p);
  }
  const tail = mesh(BG.tail, furM); tail.position.set(0, 1.08, -1.1); body.add(tail);
  if (boss) {
    // Icy shards on the back of the colossus.
    const shardM = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x2a6ab0, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.1, flatShading: true });
    for (let i = 0; i < 7; i++) {
      const s = mesh(new THREE.ConeGeometry(0.16, 0.7 + Math.random() * 0.4, 5), shardM);
      s.position.set((Math.random() - 0.5) * 0.6, 1.55, -0.6 + i * 0.22);
      s.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.6);
      body.add(s);
    }
  }
  root.scale.setScalar(scale);

  // Health bar (billboarded by the game).
  const bar = new THREE.Group();
  const bg = new THREE.Mesh(BG.barBg, new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false, transparent: true, opacity: 0.85 }));
  const fg = new THREE.Mesh(BG.barFg, new THREE.MeshBasicMaterial({ color: 0xff2b3a, depthTest: false }));
  fg.position.x = -0.6; fg.position.z = 0.001;
  bg.renderOrder = 10; fg.renderOrder = 11;
  bar.add(bg); bar.add(fg);
  bar.visible = false;

  const b = {
    root, body, legs, headG, furM, bar, barFg: fg,
    phase: Math.random() * 10,
    pose(dt, move, attack = -1) {
      b.phase += dt * (3 + move * 6);
      const s = Math.sin(b.phase), amp = Math.min(1, move);
      legs[0].rotation.x = s * 0.6 * amp; legs[3].rotation.x = s * 0.6 * amp;
      legs[1].rotation.x = -s * 0.6 * amp; legs[2].rotation.x = -s * 0.6 * amp;
      body.position.y = Math.abs(Math.cos(b.phase)) * 0.05 * amp;
      headG.rotation.x = Math.sin(b.phase * 0.5) * 0.06 + (attack >= 0 ? -Math.sin(attack * Math.PI) * 0.5 : 0);
      if (attack >= 0) {
        body.rotation.x = -Math.sin(attack * Math.PI) * 0.35;
        legs[0].rotation.x = legs[1].rotation.x = -Math.sin(attack * Math.PI) * 1.2;
      } else body.rotation.x = 0;
    },
  };
  return b;
}

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------
export function makeGrill() {
  const g = new THREE.Group();
  const stoneM = new THREE.MeshLambertMaterial({ color: 0x8e9299, flatShading: true });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const s = mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.06, 0), stoneM);
    s.position.set(Math.cos(a) * 1.05, 0.2, Math.sin(a) * 1.05);
    s.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    s.scale.set(1, 0.75, 1);
    g.add(s);
  }
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20).rotateX(-Math.PI / 2), hdr(1.3, 0.38, 0.05));
  coals.position.y = 0.16; g.add(coals);
  const logM = mat(0x5b3a24);
  for (let i = 0; i < 4; i++) {
    const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), logM);
    l.rotation.z = Math.PI / 2; l.rotation.y = i * Math.PI / 4; l.position.y = 0.22; g.add(l);
  }
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa1aa, metalness: 0.65, roughness: 0.38 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), metal);
    leg.position.set(Math.cos(a) * 0.62, 0.55, Math.sin(a) * 0.62);
    leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    g.add(leg);
  }
  const prof = [[0.0, 0.62], [0.45, 0.66], [0.72, 0.85], [0.82, 1.12], [0.78, 1.42], [0.86, 1.5], [0.82, 1.56], [0.7, 1.5]].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = mesh(new THREE.LatheGeometry(prof, 22), metal);
  g.add(pot);
  const band = mesh(new THREE.TorusGeometry(0.82, 0.04, 6, 24).rotateX(Math.PI / 2), mat(0x5d636b, { standard: true, metalness: 0.6, roughness: 0.5 }));
  band.position.y = 1.1; g.add(band);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.72, 22).rotateX(-Math.PI / 2), hdr(1.35, 0.62, 0.06));
  soup.position.y = 1.47; g.add(soup);
  const halo = glow(0xffa040, 3.6, 0.38); halo.position.y = 1.7; g.add(halo);
  const halo2 = glow(0xff7a20, 3.0, 0.5); halo2.position.y = 0.35; g.add(halo2);
  const flameM = hdr(1.4, 0.5, 0.05);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 6), flameM);
    f.position.set(Math.cos(a) * 0.55, 0.42, Math.sin(a) * 0.55); g.add(f);
  }
  const light = new THREE.PointLight(0xff8a2a, 16, 11, 1.4);
  light.position.set(0, 2.9, 0); g.add(light);
  return { group: g, light, soup, coals, halo };
}

export function makeTurret() {
  const g = new THREE.Group();
  const wood = mat(0x8a5a37), woodDark = mat(0x5e3c25), snow = mat(0xf5f8fc);
  const crate = mesh(new THREE.BoxGeometry(1.25, 1.7, 1.25), wood); crate.position.y = 0.85; g.add(crate);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = mesh(new THREE.BoxGeometry(0.16, 1.75, 0.16), woodDark); post.position.set(sx * 0.6, 0.875, sz * 0.6); g.add(post);
  }
  for (const y of [0.35, 1.0, 1.62]) {
    const band = mesh(new THREE.BoxGeometry(1.3, 0.1, 1.3), woodDark); band.position.y = y; g.add(band);
  }
  const cap = mesh(new THREE.BoxGeometry(1.32, 0.12, 1.32), snow); cap.position.y = 1.76; g.add(cap);
  const head = new THREE.Group(); head.position.y = 1.95; g.add(head);
  const stock = mesh(new THREE.BoxGeometry(0.2, 0.2, 1.2), woodDark); head.add(stock);
  const steel = new THREE.MeshStandardMaterial({ color: 0x3f74ad, metalness: 0.55, roughness: 0.4 });
  const bow = mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 18, Math.PI).rotateX(Math.PI / 2), steel);
  bow.position.z = 0.3; head.add(bow);
  const string = mesh(new THREE.BoxGeometry(1.24, 0.02, 0.02), mat(0xdddddd), { cast: false }); string.position.z = 0.3; head.add(string);
  const bolt = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5).rotateX(Math.PI / 2), mat(0x3a2a1c)); bolt.position.set(0, 0.12, 0.2); head.add(bolt);
  return { group: g, head, bolt };
}

export function makeCounter(len = 2.8) {
  const g = new THREE.Group();
  const wood = mat(0x9a6840), top = mat(0xb07a4c), snow = mat(0xf5f8fc);
  const base = mesh(new THREE.BoxGeometry(len, 0.85, 0.9), wood); base.position.y = 0.42; g.add(base);
  const plank = mesh(new THREE.BoxGeometry(len + 0.2, 0.12, 1.05), top); plank.position.y = 0.9; g.add(plank);
  for (let i = 0; i < 5; i++) {
    const s = mesh(new THREE.BoxGeometry(0.04, 0.8, 0.92), mat(0x7d5232)); s.position.set(-len / 2 + (i + 0.5) * (len / 5), 0.42, 0); g.add(s);
  }
  const lip = mesh(new THREE.BoxGeometry(len + 0.22, 0.06, 0.2), snow); lip.position.set(0, 0.98, -0.45); g.add(lip);
  return g;
}

export function makeCabin(seed = 1) {
  const g = new THREE.Group();
  const logM = mat(0x93623d), dark = mat(0x5a3a24), snow = mat(0xf7f9fc), stone = mat(0x8c9097);
  const w = 3.2, d = 2.8, h = 1.9;
  const walls = mesh(new THREE.BoxGeometry(w, h, d), logM); walls.position.y = h / 2; g.add(walls);
  for (let i = 0; i < 6; i++) {
    const l = mesh(new THREE.CylinderGeometry(0.1, 0.1, w + 0.25, 6).rotateZ(Math.PI / 2), dark);
    l.position.set(0, 0.15 + i * 0.33, d / 2 + 0.02); g.add(l);
  }
  const roofLen = d / 2 / Math.cos(0.6) + 0.35;
  for (const sz of [-1, 1]) {
    const r = mesh(new THREE.BoxGeometry(w + 0.6, 0.16, roofLen), dark);
    r.position.set(0, h + Math.sin(0.6) * roofLen / 2 - 0.05, sz * (d / 4 + 0.05)); r.rotation.x = sz * 0.6; g.add(r);
    const s = mesh(new THREE.BoxGeometry(w + 0.66, 0.24, roofLen * 0.98), snow);
    s.position.set(0, h + Math.sin(0.6) * roofLen / 2 + 0.12, sz * (d / 4 + 0.08)); s.rotation.x = sz * 0.6; g.add(s);
  }
  const gable = new THREE.Shape(); gable.moveTo(-d / 2, 0); gable.lineTo(d / 2, 0); gable.lineTo(0, Math.tan(0.6) * d / 2); gable.closePath();
  for (const sx of [-1, 1]) {
    const gm = mesh(new THREE.ShapeGeometry(gable), logM); gm.rotation.y = Math.PI / 2 * sx; gm.position.set(sx * w / 2, h, 0); g.add(gm);
  }
  const door = mesh(new THREE.BoxGeometry(0.7, 1.2, 0.1), mat(0x3d2716)); door.position.set(-0.6, 0.6, d / 2 + 0.08); g.add(door);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5), hdr(1.3, 0.85, 0.35)); win.position.set(0.7, 1.15, d / 2 + 0.13); g.add(win);
  const chim = mesh(new THREE.BoxGeometry(0.45, 1.3, 0.45), stone); chim.position.set(w / 2 - 0.6, h + 0.9, -0.4); g.add(chim);
  const chimSnow = mesh(new THREE.BoxGeometry(0.52, 0.1, 0.52), snow); chimSnow.position.set(w / 2 - 0.6, h + 1.58, -0.4); g.add(chimSnow);
  g.userData.chimney = new THREE.Vector3(w / 2 - 0.6, h + 1.7, -0.4);
  g.rotation.y = (seed % 2) * Math.PI;
  return g;
}

export function makeBeacon() {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0x9aa0a8, flatShading: true });
  const base = mesh(new THREE.CylinderGeometry(2.0, 2.4, 1.0, 8), stone); base.position.y = 0.5; g.add(base);
  const tower = mesh(new THREE.CylinderGeometry(1.1, 1.6, 6.5, 8), stone); tower.position.y = 4.2; g.add(tower);
  for (const y of [2.2, 4.4, 6.6]) {
    const ring = mesh(new THREE.CylinderGeometry(1.45 - y * 0.05, 1.5 - y * 0.05, 0.25, 8), mat(0x5b3a24)); ring.position.y = y; g.add(ring);
  }
  const bowl = mesh(new THREE.CylinderGeometry(1.5, 0.9, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0x7c838c, metalness: 0.6, roughness: 0.4 }));
  bowl.position.y = 7.8; g.add(bowl);
  const snowCap = mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.12, 8), mat(0xf6f9fc)); snowCap.position.y = 1.02; g.add(snowCap);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.0, 10, 1, true), hdr(1.5, 0.85, 0.2));
  const fhalo = glow(0xffc070, 9, 0.85); fhalo.position.y = 9; flame.add(fhalo); fhalo.position.set(0, 0, 0);
  flame.position.y = 9.0; flame.visible = false; g.add(flame);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.5, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 38; g.add(beam);
  const light = new THREE.PointLight(0xffb45a, 0, 30, 1.4); light.position.y = 9; g.add(light);
  return { group: g, flame, beam, light };
}

export function makeRock(scale = 1) {
  const g = new THREE.Group();
  const rock = mesh(new THREE.DodecahedronGeometry(1.6, 0), new THREE.MeshLambertMaterial({ color: 0x3a3e46, flatShading: true }));
  rock.scale.set(1.3, 1.0, 1.1); rock.position.y = 0.9; rock.rotation.y = Math.random() * 3; g.add(rock);
  const cap = mesh(new THREE.DodecahedronGeometry(1.3, 0), new THREE.MeshLambertMaterial({ color: 0xf2f6fb, flatShading: true }));
  cap.scale.set(1.25, 0.35, 1.05); cap.position.y = 2.25; cap.rotation.y = rock.rotation.y; g.add(cap);
  g.scale.setScalar(scale);
  return g;
}

export function makeCampfire() {
  const g = new THREE.Group();
  const stoneM = new THREE.MeshLambertMaterial({ color: 0x8e9299, flatShading: true });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const s = mesh(new THREE.DodecahedronGeometry(0.18, 0), stoneM); s.position.set(Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55); g.add(s);
  }
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 7), hdr(1.4, 0.6, 0.08)); fl.position.y = 0.45; g.add(fl);
  const halo = glow(0xff9030, 2.6, 0.6); halo.position.y = 0.6; g.add(halo);
  const light = new THREE.PointLight(0xff8a2a, 6, 6, 1.6); light.position.y = 0.9; g.add(light);
  return { group: g, flame: fl, light };
}

// ---------------------------------------------------------------------------
// Carried items (instanced): raw meat, cooked steak, cash bill, log
// ---------------------------------------------------------------------------
export const ITEM_TYPES = ['raw', 'cooked', 'cash', 'log', 'plank'];
export const ITEM_HEIGHT = { raw: 0.13, cooked: 0.12, cash: 0.1, log: 0.2, plank: 0.22 };

export function itemGeometry(type) {
  if (type === 'raw') {
    const top = new THREE.Color(0xd8333f), rim = new THREE.Color(0xf4d2cc);
    return paint(new THREE.CylinderGeometry(0.3, 0.3, 0.11, 14), (c, x, y, z, ny) => c.copy(Math.abs(ny) > 0.5 ? top : rim));
  }
  if (type === 'cooked') {
    const top = new THREE.Color(0x8a3d1c), rim = new THREE.Color(0xc77a45);
    const geo = new THREE.CylinderGeometry(0.29, 0.29, 0.1, 14);
    geo.scale(1, 1, 0.8);
    return paint(geo, (c, x, y, z, ny) => c.copy(Math.abs(ny) > 0.5 ? top : rim));
  }
  if (type === 'cash') {
    const main = new THREE.Color(0x56c84a), band = new THREE.Color(0x2f8f36);
    return paint(new THREE.BoxGeometry(0.56, 0.085, 0.32, 4, 1, 1), (c, x) => c.copy(Math.abs(x) < 0.08 ? band : main));
  }
  if (type === 'plank') {
    // bundle of split firewood tied with a rope
    const wood = new THREE.Color(0xe2b37a), rope = new THREE.Color(0x6b4a2a);
    const parts = [[-0.11, 0.06], [0.11, 0.06], [0, 0.16]].map(([x, y]) => new THREE.BoxGeometry(0.2, 0.1, 0.62).translate(x, y - 0.06, 0));
    parts.push(new THREE.BoxGeometry(0.44, 0.24, 0.07).translate(0, 0.0, 0.14), new THREE.BoxGeometry(0.44, 0.24, 0.07).translate(0, 0.0, -0.14));
    parts.forEach((g, i) => paint(g, (c) => c.copy(i < 3 ? wood : rope)));
    return mergeGeometries(parts.map((g) => g.toNonIndexed()));
  }
  if (type === 'log') {
    const bark = new THREE.Color(0x8b5530), end = new THREE.Color(0xe7b87c);
    const geo = new THREE.CylinderGeometry(0.11, 0.11, 0.7, 8).rotateZ(Math.PI / 2);
    paint(geo, (c, x) => c.copy(Math.abs(x) > 0.34 ? end : bark));
    const g2 = geo.clone().translate(0, 0, 0.12), g1 = geo.clone().translate(0, 0, -0.12);
    return mergeGeometries([g1, g2]);
  }
  return new THREE.BoxGeometry(0.3, 0.1, 0.3);
}

export { solid };

// ---------------------------------------------------------------------------
// Machine upgrades: each level adds visible parts to the station.
// ---------------------------------------------------------------------------
function stripes(colA, colB, n = 8) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? colB : colA; g.fillRect(i * 256 / n, 0, 256 / n + 1, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Cauldron level 2: iron-bound bigger pot, outer hearth, roaring fire, firewood.
export function upgradeGrill(grill) {
  const g = grill.group;
  const parts = new THREE.Group();
  const copper = new THREE.MeshStandardMaterial({ color: 0xc27a3a, metalness: 0.7, roughness: 0.35 });
  for (const y of [0.82, 1.32]) {
    const b = mesh(new THREE.TorusGeometry(y < 1 ? 0.76 : 0.82, 0.05, 6, 26).rotateX(Math.PI / 2), copper);
    b.position.y = y; parts.add(b);
  }
  for (const sx of [-1, 1]) {
    const h = mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12), copper);
    h.position.set(sx * 0.9, 1.3, 0); h.rotation.y = Math.PI / 2; parts.add(h);
  }
  const stoneM = new THREE.MeshLambertMaterial({ color: 0x777c84, flatShading: true });
  for (let i = 0; i < 15; i++) {
    const a = (i / 15) * Math.PI * 2;
    const s = mesh(new THREE.DodecahedronGeometry(0.26, 0), stoneM);
    s.position.set(Math.cos(a) * 1.42, 0.16, Math.sin(a) * 1.42); s.scale.set(1, 0.7, 1); s.rotation.y = a;
    parts.add(s);
  }
  const flameM = hdr(1.5, 0.6, 0.05);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 6), flameM);
    f.position.set(Math.cos(a) * 0.7, 0.5, Math.sin(a) * 0.7); parts.add(f);
  }
  // firewood pile beside the hearth
  const logM = mat(0x7a4b2a), endM = mat(0xd9a86c);
  const pile = new THREE.Group();
  [[-0.3, 0.12], [0, 0.12], [0.3, 0.12], [-0.15, 0.34], [0.15, 0.34], [0, 0.56]].forEach(([x, y]) => {
    const l = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 7).rotateX(Math.PI / 2), logM); l.position.set(x, y, 0); pile.add(l);
    for (const sz of [-1, 1]) { const e = mesh(new THREE.CircleGeometry(0.12, 7), endM, { cast: false }); e.position.set(x, y, sz * 0.451); e.rotation.y = sz > 0 ? 0 : Math.PI; pile.add(e); }
  });
  pile.position.set(-1.9, 0, 0.6); pile.rotation.y = 0.4; parts.add(pile);
  // ladle hanging on the rim
  const ladle = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), mat(0x6b4529));
  ladle.position.set(0.55, 1.75, 0.3); ladle.rotation.z = -0.5; parts.add(ladle);
  g.add(parts);
  grill.halo.scale.set(4.4, 4.4, 1);
  grill.level = 2;
  return parts;
}

// Counter level 2: striped awning on posts with two lanterns.
export function makeAwning(len) {
  const g = new THREE.Group();
  const wood = mat(0x6e4a2e), snow = mat(0xf7f9fc);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), wood); p.position.set(sx * (len / 2 + 0.15), 1.25, sz * 0.75 - 0.2); g.add(p);
  }
  const cloth = new THREE.MeshLambertMaterial({ map: stripes('#c8323c', '#f3e8d2'), side: THREE.DoubleSide });
  const roof = mesh(new THREE.BoxGeometry(len + 0.7, 0.06, 2.0), cloth); roof.position.set(0, 2.55, -0.2); roof.rotation.x = -0.22; g.add(roof);
  const roofSnow = mesh(new THREE.BoxGeometry(len + 0.6, 0.12, 1.4), snow); roofSnow.position.set(0, 2.66, -0.35); roofSnow.rotation.x = -0.22; g.add(roofSnow);
  const valance = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const v = mesh(new THREE.ConeGeometry(0.18, 0.3, 3), cloth, { cast: false });
    v.position.set(-len / 2 - 0.2 + i * (len + 0.4) / 8, 2.15, 0.82); v.rotation.x = Math.PI; valance.add(v);
  }
  g.add(valance);
  const lanterns = [];
  for (const sx of [-1, 1]) {
    const l = new THREE.Group();
    l.add(mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), mat(0x2b2b30)));
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), hdr(1.6, 1.0, 0.35)); l.add(glass);
    const h = glow(0xffc060, 1.1, 0.5); l.add(h);
    l.position.set(sx * (len / 2 + 0.15), 2.05, 0.6);
    g.add(l); lanterns.push(l);
  }
  return g;
}

// Counter level 3: market stall sign, bunting and goods crates.
export function makeMarketDecor(len) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#5a3a22'; x.fillRect(0, 0, 512, 128);
  x.strokeStyle = '#3a2414'; x.lineWidth = 10; x.strokeRect(5, 5, 502, 118);
  x.fillStyle = '#ffd25a'; x.font = '900 70px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('FORT-AUBE', 256, 68);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = mesh(new THREE.BoxGeometry(len + 0.4, 0.62, 0.1), [mat(0x5a3a22), mat(0x5a3a22), mat(0x5a3a22), mat(0x5a3a22), new THREE.MeshLambertMaterial({ map: tex }), mat(0x5a3a22)]);
  sign.position.set(0, 3.15, 0.75); sign.rotation.x = -0.15; g.add(sign);
  const snowCap = mesh(new THREE.BoxGeometry(len + 0.45, 0.1, 0.18), mat(0xf7f9fc)); snowCap.position.set(0, 3.5, 0.72); g.add(snowCap);
  const colors = [0xd23b3b, 0xf2c94c, 0x3a86c8, 0x56b14a];
  for (let i = 0; i < 10; i++) {
    const f = mesh(new THREE.ConeGeometry(0.13, 0.32, 3), mat(colors[i % 4]), { cast: false });
    f.position.set(-len / 2 - 0.1 + i * (len + 0.2) / 9, 2.86 - Math.sin((i / 9) * Math.PI) * 0.18, 0.95); f.rotation.x = Math.PI; g.add(f);
  }
  const crateM = mat(0x8a5a37);
  for (const [cx, cz, s] of [[-len / 2 - 0.8, -0.6, 0.7], [len / 2 + 0.8, -0.7, 0.6], [len / 2 + 0.75, -0.05, 0.45]]) {
    const cr = mesh(new THREE.BoxGeometry(s, s * 0.8, s), crateM); cr.position.set(cx, s * 0.4, cz); g.add(cr);
    for (let i = 0; i < 4; i++) {
      const fr = mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(i % 2 ? 0xc8323c : 0xe0a030)); fr.position.set(cx + (i % 2 - 0.5) * 0.2, s * 0.8 + 0.07, cz + (Math.floor(i / 2) - 0.5) * 0.2); g.add(fr);
    }
  }
  const bell = mesh(new THREE.ConeGeometry(0.16, 0.26, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }));
  bell.position.set(len / 2 + 0.15, 2.3, 0.9); g.add(bell);
  return g;
}

// Crossbow → ballista: steel armour, bigger double bow, pennant.
export function upgradeTurret(t) {
  const g = t.group;
  const parts = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8d969f, metalness: 0.7, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const p = mesh(new THREE.BoxGeometry(1.0, 0.7, 0.06), steel);
    p.position.set(Math.sin(i * Math.PI / 2) * 0.66, 1.15, Math.cos(i * Math.PI / 2) * 0.66); p.rotation.y = i * Math.PI / 2; parts.add(p);
    for (const sx of [-1, 1]) { const r = mesh(new THREE.SphereGeometry(0.05, 6, 4), steel); r.position.set(sx * 0.35, 0.25, 0.04); p.add(r); }
  }
  g.add(parts);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 0.8, roughness: 0.3 });
  const bow2 = mesh(new THREE.TorusGeometry(0.85, 0.07, 6, 20, Math.PI).rotateX(Math.PI / 2), gold);
  bow2.position.set(0, 0.12, 0.42); t.head.add(bow2);
  t.head.scale.setScalar(1.18);
  const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), mat(0x3a2a1c)); pole.position.set(0.55, 2.45, -0.55); parts.add(pole);
  const flag = mesh(new THREE.PlaneGeometry(0.6, 0.36), new THREE.MeshLambertMaterial({ color: 0xd23b3b, side: THREE.DoubleSide }));
  flag.position.set(0.85, 2.95, -0.55); parts.add(flag);
  t.flag = flag;
  t.level = 2;
  return parts;
}

// Brann's trading sled, parked in the clearing before the fort exists.
export function makeSled() {
  const g = new THREE.Group();
  const wood = mat(0x8a5a37), dark = mat(0x4a3220), snow = mat(0xf7f9fc), steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.7, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const run = mesh(new THREE.BoxGeometry(0.08, 0.08, 3.0), steel); run.position.set(sx * 0.7, 0.06, 0); g.add(run);
    const tip = mesh(new THREE.TorusGeometry(0.22, 0.04, 5, 10, Math.PI), steel); tip.position.set(sx * 0.7, 0.28, 1.5); tip.rotation.y = Math.PI / 2; g.add(tip);
    for (const z of [-1.1, 0, 1.1]) { const s = mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), dark); s.position.set(sx * 0.7, 0.25, z); g.add(s); }
  }
  const bed = mesh(new THREE.BoxGeometry(1.6, 0.12, 2.9), wood); bed.position.y = 0.45; g.add(bed);
  for (const sx of [-1, 1]) { const rail = mesh(new THREE.BoxGeometry(0.08, 0.3, 2.9), dark); rail.position.set(sx * 0.78, 0.66, 0); g.add(rail); }
  const crates = [[0, 0.8, -0.7, 0.8], [-0.3, 0.75, 0.4, 0.6], [0.35, 0.7, 0.5, 0.5], [0.05, 1.42, -0.7, 0.5]];
  for (const [x, y, z, s] of crates) {
    const c = mesh(new THREE.BoxGeometry(s, s * 0.8, s), wood); c.position.set(x, y, z); c.rotation.y = x * 0.6; g.add(c);
    const sn = mesh(new THREE.BoxGeometry(s * 1.02, 0.06, s * 1.02), snow); sn.position.set(x, y + s * 0.42, z); sn.rotation.y = x * 0.6; g.add(sn);
  }
  const fur = mesh(new THREE.SphereGeometry(0.5, 10, 6), mat(0xe9e4da)); fur.scale.set(1.2, 0.35, 0.8); fur.position.set(0, 0.6, 1.0); g.add(fur);
  const pole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5), dark); pole.position.set(0.7, 1.2, -1.35); g.add(pole);
  const lamp = new THREE.Group();
  lamp.add(mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), mat(0x2b2b30)));
  lamp.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), hdr(1.6, 1.0, 0.35)));
  lamp.add(glow(0xffc060, 1.0, 0.5));
  lamp.position.set(0.7, 1.9, -1.35); g.add(lamp);
  return g;
}

// Stack of sawn logs that grows as wood is chopped.
export function makeWoodCrib() {
  const g = new THREE.Group();
  const logM = mat(0xa86a3c), endM = mat(0xe6b77e);
  const layers = [];
  for (let k = 0; k < 10; k++) {
    const layer = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const l = mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.6, 7).rotateZ(Math.PI / 2), logM);
      l.position.set(0, 0, (i - 1.5) * 0.36); layer.add(l);
      for (const sx of [-1, 1]) { const e = mesh(new THREE.CircleGeometry(0.16, 7), endM, { cast: false }); e.position.set(sx * 0.801, 0, (i - 1.5) * 0.36); e.rotation.y = sx * Math.PI / 2; layer.add(e); }
    }
    layer.position.y = 0.17 + k * 0.32; layer.rotation.y = k % 2 ? Math.PI / 2 : 0;
    layer.visible = false;
    g.add(layer); layers.push(layer);
  }
  return { group: g, setLevel(n) { layers.forEach((l, i) => { l.visible = i < n; }); } };
}

// Stone hearth slab and wooden decking that anchor stations in the ground.
export function makeHearth(r = 1.7) {
  const m = mesh(new THREE.CylinderGeometry(r, r + 0.1, 0.1, 18), new THREE.MeshLambertMaterial({ color: 0x8b8a88, flatShading: true }), { cast: false, receive: true });
  m.position.y = 0.05;
  return m;
}
export function makeDeck(w, d) {
  const g = new THREE.Group();
  const n = Math.round(w / 0.42);
  for (let i = 0; i < n; i++) {
    const p = mesh(new THREE.BoxGeometry(w / n - 0.04, 0.08, d), mat(i % 2 ? 0x9b6a42 : 0x8e603a), { cast: false, receive: true });
    p.position.set(-w / 2 + (i + 0.5) * (w / n), 0.04, 0); g.add(p);
  }
  return g;
}

// Sawmill: log bench with a spinning circular blade under a snowy roof.
export function makeSawmill() {
  const g = new THREE.Group();
  const wood = mat(0x93623d), dark = mat(0x5a3a24), snow = mat(0xf7f9fc);
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9d0d8, metalness: 0.85, roughness: 0.25 });
  const deck = makeDeck(3.4, 2.4); g.add(deck);
  const bench = mesh(new THREE.BoxGeometry(2.8, 0.75, 0.9), wood); bench.position.y = 0.45; g.add(bench);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), dark); l.position.set(sx * 1.25, 0.2, sz * 0.36); g.add(l); }
  const blade = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 28).rotateX(Math.PI / 2), steel);
  blade.position.set(0, 0.95, 0); g.add(blade);
  const teeth = mesh(new THREE.TorusGeometry(0.62, 0.035, 4, 28), steel, { cast: false }); blade.add(teeth);
  const hub = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 10).rotateX(Math.PI / 2), mat(0x3a3a40)); blade.add(hub);
  const log = mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 8).rotateZ(Math.PI / 2), mat(0x8b5530)); log.position.set(-0.75, 1.03, 0); g.add(log);
  for (const sx of [-1, 1]) { const post = mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), dark); post.position.set(sx * 1.55, 1.3, -0.95); g.add(post); }
  const roof = mesh(new THREE.BoxGeometry(3.6, 0.12, 1.6), dark); roof.position.set(0, 2.6, -0.45); roof.rotation.x = 0.25; g.add(roof);
  const roofSnow = mesh(new THREE.BoxGeometry(3.6, 0.16, 1.5), snow); roofSnow.position.set(0, 2.72, -0.47); roofSnow.rotation.x = 0.25; g.add(roofSnow);
  const sawdust = mesh(new THREE.CircleGeometry(0.6, 12).rotateX(-Math.PI / 2), mat(0xe9c48e), { cast: false }); sawdust.position.set(0.9, 0.09, 0.85); g.add(sawdust);
  return { group: g, blades: [blade], log, level: 1 };
}

// Steam saw: copper boiler with chimney, drive belt and a second blade.
export function upgradeSawmill(saw) {
  const parts = new THREE.Group();
  const copper = new THREE.MeshStandardMaterial({ color: 0xc27a3a, metalness: 0.7, roughness: 0.35 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x4a4e55, metalness: 0.6, roughness: 0.5 });
  const boiler = mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 14).rotateZ(Math.PI / 2), copper); boiler.position.set(0.6, 0.62, -1.15); parts.add(boiler);
  for (const x of [0.15, 1.05]) { const b = mesh(new THREE.TorusGeometry(0.46, 0.04, 6, 16).rotateY(Math.PI / 2), iron); b.position.set(x, 0.62, -1.15); parts.add(b); }
  const chim = mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.2, 8), iron); chim.position.set(1.0, 1.4, -1.15); parts.add(chim);
  const gauge = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12).rotateX(Math.PI / 2), mat(0xf2efe6)); gauge.position.set(0.3, 0.9, -0.72); parts.add(gauge);
  const belt = mesh(new THREE.TorusGeometry(0.35, 0.03, 4, 16), mat(0x2a2420)); belt.position.set(0.4, 0.95, -0.5); belt.rotation.y = Math.PI / 2; parts.add(belt);
  const steel = new THREE.MeshStandardMaterial({ color: 0xffd36b, metalness: 0.85, roughness: 0.25 });
  const blade2 = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 26).rotateX(Math.PI / 2), steel);
  blade2.position.set(0.75, 0.92, 0.0); parts.add(blade2);
  saw.group.add(parts);
  saw.blades.push(blade2);
  saw.chimney = new THREE.Vector3(1.0, 2.1, -1.15);
  saw.level = 2;
  return parts;
}
