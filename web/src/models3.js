// Act III models: the Iron Cliff mine, the forge, rails and ore cart, the
// steam drill, the icebreaker and its slipway, the Kitchen of Dawn canopy,
// the cannery, steam cannons, Station Aube with the Heart of Winter, and
// the endings' greenhouses.
import * as THREE from 'three';
import { mat, hdr, glow, makeHuman, makeBear, makeRock, makeDeck } from './models.js';
import { makePipe } from './machines.js';
import { makeCanvas, canvasTexture } from './textures.js';

function mesh(geo, material, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
const stoneM = () => new THREE.MeshLambertMaterial({ color: 0x80848b, flatShading: true });
const ironM = () => mat(0x4a4e55, { standard: true, metalness: 0.6, roughness: 0.5 });
const steelM = () => mat(0xb9c4cf, { standard: true, metalness: 0.75, roughness: 0.3 });
const copperM = () => mat(0xc27a3a, { standard: true, metalness: 0.7, roughness: 0.35 });
const woodM = () => mat(0x7a5233), darkWood = () => mat(0x4e3422), snowM = () => mat(0xf6f9fd);

// The rising-sun emblem of the old world's Project Dawn.
export function sunEmblem(ctx, cx, cy, r, color = '#f2c94c') {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = r * 0.12;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, Math.PI, 0); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i + 0.5) / 7 * Math.PI;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
  }
  ctx.fillRect(cx - r, cy + r * 0.05, r * 2, r * 0.1);
  ctx.restore();
}

function signTexture(text, sub) {
  const c = makeCanvas(512, 160), x = c.getContext('2d');
  x.fillStyle = '#2b3138'; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = '#9aa3ad'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 148);
  sunEmblem(x, 82, 92, 52);
  x.fillStyle = '#f2efe6'; x.font = '900 52px "Trebuchet MS", sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
  x.fillText(text, 150, sub ? 64 : 82);
  if (sub) { x.font = '700 28px "Trebuchet MS", sans-serif'; x.fillStyle = '#c9d2db'; x.fillText(sub, 152, 112); }
  return canvasTexture(c);
}

// ---------------------------------------------------------------------------
// Mine
// ---------------------------------------------------------------------------
export function makeOreNode(seed = 1) {
  const g = new THREE.Group();
  const rock = mesh(new THREE.DodecahedronGeometry(0.85, 0), new THREE.MeshLambertMaterial({ color: 0x4a4744, flatShading: true }));
  rock.scale.set(1.15, 0.85, 1); rock.position.y = 0.6; rock.rotation.y = seed; g.add(rock);
  const oreM = mat(0xd0662a, { emissive: 0x401000 });
  for (let i = 0; i < 6; i++) {
    const a = seed * 2 + i * 1.05;
    const c = mesh(new THREE.OctahedronGeometry(0.2 + (i % 3) * 0.05, 0), oreM);
    c.position.set(Math.cos(a) * 0.72, 0.45 + (i % 2) * 0.4, Math.sin(a) * 0.62); c.rotation.set(a, a * 2, 0); g.add(c);
  }
  const cap = mesh(new THREE.DodecahedronGeometry(0.62, 0), new THREE.MeshLambertMaterial({ color: 0xf2f6fb, flatShading: true }));
  cap.scale.set(1.1, 0.32, 0.95); cap.position.y = 1.22; g.add(cap);
  return g;
}

export function makeCliff(group, x0, z0, z1) {
  for (let z = z0, i = 0; z <= z1; z += 4.2, i++) {
    const r = makeRock(2.2 + (i % 3) * 0.35);
    r.position.set(x0 - 2.4 - (i % 2) * 1.2, 0, z); r.rotation.y = i * 1.7;
    group.add(r);
  }
}

export function makeHeadframe() {
  const g = new THREE.Group();
  const w = woodM(), d = darkWood();
  for (const sx of [-1, 1]) {
    const leg = mesh(new THREE.BoxGeometry(0.22, 5.4, 0.22), w); leg.position.set(sx * 1.0, 2.6, 0); leg.rotation.z = sx * 0.16; g.add(leg);
    const brace = mesh(new THREE.BoxGeometry(0.16, 4.6, 0.16), d); brace.position.set(sx * 0.8, 2.3, 1.3); brace.rotation.set(-0.5, 0, sx * 0.12); g.add(brace);
  }
  for (const y of [1.4, 3.0, 4.4]) { const b = mesh(new THREE.BoxGeometry(2.2 - y * 0.25, 0.14, 0.18), d); b.position.y = y; g.add(b); }
  const wheel = new THREE.Group(); wheel.position.y = 5.3; g.add(wheel);
  wheel.add(mesh(new THREE.TorusGeometry(0.85, 0.08, 6, 20), ironM()));
  for (let i = 0; i < 6; i++) { const s = mesh(new THREE.BoxGeometry(0.05, 1.7, 0.05), ironM()); s.rotation.z = i * Math.PI / 6; wheel.add(s); }
  const cable = mesh(new THREE.CylinderGeometry(0.02, 0.02, 5.2, 4), mat(0x222222)); cable.position.set(0.85, 2.7, 0); g.add(cable);
  // tunnel mouth in timber
  const mouth = new THREE.Group(); mouth.position.set(0, 0, -2.2); g.add(mouth);
  const dark = mesh(new THREE.PlaneGeometry(2.0, 2.2), mat(0x0e0c0b), { cast: false }); dark.position.y = 1.1; mouth.add(dark);
  for (const sx of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.26, 2.5, 0.26), w); p.position.set(sx * 1.1, 1.25, 0.05); mouth.add(p); }
  const lintel = mesh(new THREE.BoxGeometry(2.6, 0.3, 0.3), w); lintel.position.set(0, 2.5, 0.05); mouth.add(lintel);
  const lamp = glow(0xffb050, 1.2, 0.6); lamp.position.set(0.9, 2.2, 0.4); mouth.add(lamp);
  return { group: g, wheel };
}

// Steam drill biting into the cliff (mine level 2).
export function makeDrill() {
  const g = new THREE.Group();
  g.add(makeDeck(2.6, 1.8));
  const boiler = mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 14).rotateZ(Math.PI / 2), copperM()); boiler.position.set(0.3, 0.75, 0.3); g.add(boiler);
  const chim = mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.4, 8), ironM()); chim.position.set(0.8, 1.7, 0.3); g.add(chim);
  const shaft = mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8).rotateZ(Math.PI / 2), steelM()); shaft.position.set(-0.9, 0.85, -0.3); g.add(shaft);
  const bit = new THREE.Group(); bit.position.set(-1.9, 0.85, -0.3); g.add(bit);
  const cone = mesh(new THREE.ConeGeometry(0.32, 0.8, 8).rotateZ(Math.PI / 2), steelM()); cone.position.x = -0.2; bit.add(cone);
  for (let i = 0; i < 4; i++) { const f = mesh(new THREE.BoxGeometry(0.6, 0.04, 0.12), ironM()); f.rotation.x = i * Math.PI / 4; f.position.x = -0.1; bit.add(f); }
  return { group: g, bit, chimney: new THREE.Vector3(0.8, 2.45, 0.3) };
}

// Straight rail line along a polyline on the ground.
export function makeRails(points) {
  const g = new THREE.Group();
  const railM = steelM(), sleeperM = darkWood();
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z), ang = Math.atan2(b.x - a.x, b.z - a.z);
    const seg = new THREE.Group(); seg.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2); seg.rotation.y = ang; g.add(seg);
    for (const sx of [-0.42, 0.42]) { const r = mesh(new THREE.BoxGeometry(0.08, 0.1, len), railM, { cast: false }); r.position.set(sx, 0.11, 0); seg.add(r); }
    const n = Math.floor(len / 0.6);
    for (let k = 0; k <= n; k++) { const s = mesh(new THREE.BoxGeometry(1.2, 0.07, 0.24), sleeperM, { cast: false, receive: true }); s.position.set(0, 0.04, -len / 2 + k * (len / Math.max(1, n))); seg.add(s); }
  }
  return g;
}

export function makeCart() {
  const g = new THREE.Group();
  const tub = new THREE.Group(); tub.position.y = 0.42; g.add(tub);
  const m = ironM();
  const floor = mesh(new THREE.BoxGeometry(0.95, 0.08, 1.2), m); tub.add(floor);
  for (const [w, d, x, z] of [[0.95, 0.06, 0, 0.6], [0.95, 0.06, 0, -0.6], [0.06, 1.2, 0.47, 0], [0.06, 1.2, -0.47, 0]]) { const s = mesh(new THREE.BoxGeometry(w, 0.5, d), m); s.position.set(x, 0.25, z); tub.add(s); }
  for (const sx of [-0.42, 0.42]) for (const sz of [-0.38, 0.38]) { const wh = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 10).rotateZ(Math.PI / 2), mat(0x2b2b30)); wh.position.set(sx, 0.2, sz); g.add(wh); }
  return g;
}

// ---------------------------------------------------------------------------
// Forge
// ---------------------------------------------------------------------------
export function makeForge() {
  const g = new THREE.Group();
  const st = stoneM();
  const base = mesh(new THREE.BoxGeometry(3.0, 0.3, 2.4), st, { receive: true }); base.position.y = 0.15; g.add(base);
  const body = mesh(new THREE.BoxGeometry(1.9, 1.6, 1.7), st); body.position.set(0, 1.1, -0.2); g.add(body);
  const top = mesh(new THREE.BoxGeometry(2.1, 0.2, 1.9), st); top.position.set(0, 1.95, -0.2); g.add(top);
  const chim = mesh(new THREE.CylinderGeometry(0.32, 0.5, 2.6, 6), st); chim.position.set(0.3, 3.2, -0.45); g.add(chim);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16, 0, Math.PI), hdr(1.6, 0.65, 0.1)); mouth.position.set(0, 0.62, 0.66); g.add(mouth);
  const mouthBase = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.32), hdr(1.6, 0.65, 0.1)); mouthBase.position.set(0, 0.47, 0.66); g.add(mouthBase);
  const halo = glow(0xff8a30, 2.6, 0.55); halo.position.set(0, 0.8, 1.0); g.add(halo);
  // anvil and bellows
  const anvil = new THREE.Group(); anvil.position.set(1.15, 0.3, 0.75); g.add(anvil);
  anvil.add(mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), ironM()).translateY(0.22));
  anvil.add(mesh(new THREE.BoxGeometry(0.7, 0.18, 0.32), ironM()).translateY(0.52));
  const bellows = mesh(new THREE.ConeGeometry(0.4, 0.9, 4).rotateZ(Math.PI / 2), mat(0x6b3f22)); bellows.position.set(-1.25, 0.75, 0.2); g.add(bellows);
  const barrel = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 10), woodM()); barrel.position.set(-1.1, 0.6, 0.85); g.add(barrel);
  const water = mesh(new THREE.CircleGeometry(0.27, 10).rotateX(-Math.PI / 2), mat(0x6fa8c8), { cast: false }); water.position.set(-1.1, 0.91, 0.85); g.add(water);
  const light = new THREE.PointLight(0xff7a2a, 7, 8, 1.5); light.position.set(0, 1.0, 1.4); g.add(light);
  return { group: g, mouth: [mouth, mouthBase], light, halo, chimneys: [new THREE.Vector3(0.3, 4.6, -0.45)], level: 1 };
}

// Blast furnace: a tall brick stack pouring molten steel (forge level 2).
export function upgradeForge(f) {
  const parts = new THREE.Group();
  const brick = mat(0x8e4a32);
  const stack = mesh(new THREE.CylinderGeometry(0.62, 0.95, 4.2, 10), brick); stack.position.set(-0.9, 2.1, -1.5); parts.add(stack);
  for (const y of [1.0, 2.2, 3.4]) { const b = mesh(new THREE.TorusGeometry(0.92 - y * 0.08, 0.06, 6, 18).rotateX(Math.PI / 2), ironM()); b.position.set(-0.9, y, -1.5); parts.add(b); }
  const spout = mesh(new THREE.BoxGeometry(0.2, 0.12, 1.0), ironM()); spout.position.set(-0.9, 1.2, -0.75); spout.rotation.x = 0.35; parts.add(spout);
  const melt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), hdr(1.8, 0.9, 0.2)); melt.position.set(-0.9, 0.8, -0.3); parts.add(melt);
  const mold = mesh(new THREE.BoxGeometry(0.7, 0.2, 0.5), ironM()); mold.position.set(-0.9, 0.4, -0.15); parts.add(mold);
  const glowM = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4).rotateX(-Math.PI / 2), hdr(1.8, 0.8, 0.15)); glowM.position.set(-0.9, 0.52, -0.15); parts.add(glowM);
  const ladder = mesh(new THREE.BoxGeometry(0.5, 3.6, 0.05), darkWood()); ladder.position.set(-0.2, 1.8, -1.0); ladder.rotation.x = -0.15; parts.add(ladder);
  f.group.add(parts);
  f.chimneys.push(new THREE.Vector3(-0.9, 4.4, -1.5));
  f.level = 2;
  return parts;
}

// ---------------------------------------------------------------------------
// Fort upgrades made of steel
// ---------------------------------------------------------------------------
// Iron-framed canopy over the cauldrons with turning gears (cauldron level 5).
export function makeCanopy(cols, height = 3.6) {
  const g = new THREE.Group();
  const iron = ironM();
  for (const c of cols) {
    const p = mesh(new THREE.CylinderGeometry(0.11, 0.14, height, 8), iron); p.position.set(c.x, height / 2, c.z); g.add(p);
    const foot = mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 8), stoneM()); foot.position.set(c.x, 0.1, c.z); g.add(foot);
  }
  // roof: a quad stretched over the four columns
  const geo = new THREE.BufferGeometry();
  const v = cols.map((c) => new THREE.Vector3(c.x, height + 0.1, c.z));
  const ctr = v.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / 4); ctr.y += 0.9;
  const tris = [];
  for (let i = 0; i < 4; i++) { const a = v[i], b = v[(i + 1) % 4]; tris.push(a.x, a.y, a.z, ctr.x, ctr.y, ctr.z, b.x, b.y, b.z); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  geo.computeVertexNormals();
  const roof = mesh(geo, new THREE.MeshLambertMaterial({ color: 0xeef3f8, side: THREE.DoubleSide }));
  g.add(roof);
  for (let i = 0; i < 4; i++) g.add(makePipe(v[i], v[(i + 1) % 4], 0.07, iron));
  const gears = [];
  for (let i = 0; i < 2; i++) {
    const gear = new THREE.Group();
    gear.add(mesh(new THREE.TorusGeometry(0.42, 0.1, 6, 16), copperM()));
    for (let k = 0; k < 8; k++) { const t = mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), copperM()); t.position.set(Math.cos(k * Math.PI / 4) * 0.55, Math.sin(k * Math.PI / 4) * 0.55, 0); gear.add(t); }
    gear.position.copy(v[i]).lerp(v[i + 1], 0.5); gear.position.y = height - 0.5; gear.position.x += i ? 0.38 : 0;
    gear.lookAt(ctr.x, gear.position.y, ctr.z);
    g.add(gear); gears.push(gear);
  }
  // sign
  const sign = mesh(new THREE.BoxGeometry(2.6, 0.7, 0.08), [mat(0x2b3138), mat(0x2b3138), mat(0x2b3138), mat(0x2b3138), new THREE.MeshLambertMaterial({ map: signTexture('CUISINE', 'de l’Aube') }), mat(0x2b3138)]);
  sign.position.copy(v[2]).lerp(v[3], 0.5); sign.position.y = height + 0.55; sign.lookAt(sign.position.x + 1, sign.position.y, sign.position.z + 1);
  g.add(sign);
  return { group: g, gears };
}

// Cannery: stamping press that seals stew into tins.
export function makeCannery() {
  const g = new THREE.Group();
  g.add(makeDeck(3.0, 2.2));
  const body = mesh(new THREE.BoxGeometry(1.8, 1.3, 1.2), mat(0x5d6b78)); body.position.set(0, 0.75, -0.2); g.add(body);
  const hood = mesh(new THREE.BoxGeometry(2.0, 0.2, 1.4), ironM()); hood.position.set(0, 1.5, -0.2); g.add(hood);
  const press = new THREE.Group(); press.position.set(0.4, 1.95, 0.45); g.add(press);
  press.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), steelM()));
  const head = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), steelM()); head.position.y = -0.5; press.add(head);
  const table = mesh(new THREE.BoxGeometry(1.4, 0.12, 0.7), steelM()); table.position.set(0.2, 0.95, 0.5); g.add(table);
  const chim = mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.5, 8), ironM()); chim.position.set(-0.6, 2.2, -0.5); g.add(chim);
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.25), hdr(0.5, 1.4, 0.5)); lamp.position.set(-0.4, 0.95, 0.41); g.add(lamp);
  const sign = mesh(new THREE.BoxGeometry(1.9, 0.5, 0.06), [mat(0x2b3138), mat(0x2b3138), mat(0x2b3138), mat(0x2b3138), new THREE.MeshLambertMaterial({ map: signTexture('CONSERVES') }), mat(0x2b3138)]);
  sign.position.set(0, 1.95, -0.85); g.add(sign);
  return { group: g, press, chimney: new THREE.Vector3(-0.6, 3.0, -0.5) };
}

// Steam cannon replacing the crossbow head (turret level 3).
export function upgradeCannon(t) {
  const parts = new THREE.Group();
  t.head.children.forEach((c) => { c.visible = false; });
  const barrel = mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.5, 12).rotateX(Math.PI / 2), ironM()); barrel.position.z = 0.35; t.head.add(barrel);
  const muzzle = mesh(new THREE.TorusGeometry(0.22, 0.06, 6, 12), copperM()); muzzle.position.z = 1.1; t.head.add(muzzle);
  const tank = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 12).rotateZ(Math.PI / 2), copperM()); tank.position.set(0, 0.1, -0.45); t.head.add(tank);
  const valve = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), copperM()); valve.position.set(0.2, 0.4, -0.45); t.head.add(valve);
  t.group.add(parts);
  t.level = 3;
  t.cannon = true;
  return parts;
}

// Industrial sawmill: log intake ramp, hopper and a third blade (sawmill level 3).
export function upgradeSawmill3(saw) {
  const parts = new THREE.Group();
  const ramp = mesh(new THREE.BoxGeometry(1.6, 0.1, 0.8), steelM()); ramp.position.set(-2.0, 0.75, 0); ramp.rotation.z = 0.35; parts.add(ramp);
  const hopper = mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.8, 4), ironM()); hopper.position.set(-1.2, 1.7, 0); hopper.rotation.y = Math.PI / 4; parts.add(hopper);
  const blade3 = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 26).rotateX(Math.PI / 2), steelM()); blade3.position.set(-0.6, 0.95, 0.0); parts.add(blade3);
  const gear = mesh(new THREE.TorusGeometry(0.3, 0.08, 6, 12), copperM()); gear.position.set(-0.6, 0.95, -0.4); parts.add(gear);
  saw.group.add(parts);
  saw.blades.push(blade3, gear);
  saw.level = 3;
  return parts;
}

// ---------------------------------------------------------------------------
// Icebreaker and its slipway
// ---------------------------------------------------------------------------
export function makeSlipway(len = 7.4) {
  const g = new THREE.Group();
  for (const sx of [-0.8, 0.8]) { const r = mesh(new THREE.BoxGeometry(0.2, 0.16, len), darkWood(), { cast: false, receive: true }); r.position.set(sx, 0.08, 0); g.add(r); }
  for (let k = 0; k < 6; k++) {
    const z = -len / 2 + 0.6 + k * (len - 1.2) / 5;
    const cr = mesh(new THREE.BoxGeometry(2.6, 0.3, 0.3), woodM()); cr.position.set(0, 0.25, z); g.add(cr);
  }
  // crane on the side
  const mast = mesh(new THREE.BoxGeometry(0.3, 5.5, 0.3), darkWood()); mast.position.set(2.2, 2.75, 1.5); g.add(mast);
  const jib = mesh(new THREE.BoxGeometry(0.2, 0.2, 3.6), darkWood()); jib.position.set(1.6, 5.3, 0.2); jib.rotation.y = 0.5; g.add(jib);
  const hook = mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 4), mat(0x222222)); hook.position.set(1.0, 4.1, -0.9); g.add(hook);
  return g;
}

export function makeIcebreaker() {
  const g = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.25, 2.7); hullShape.lineTo(1.25, 2.7); hullShape.lineTo(1.3, -1.4); hullShape.quadraticCurveTo(0.9, -2.9, 0, -3.3); hullShape.quadraticCurveTo(-0.9, -2.9, -1.3, -1.4); hullShape.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 }).rotateX(Math.PI / 2).translate(0, 1.6, 0);
  const parts = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  parts.forEach((p) => g.add(p));
  // 1. hull
  const hull = mesh(hullGeo, mat(0x7a2e24)); parts[0].add(hull);
  const band = mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.18, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 1.75, 0).scale(1.04, 1, 1.02), mat(0xe8e2d4)); parts[0].add(band);
  const deck = mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.06, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 1.66, 0).scale(0.94, 1, 0.94), mat(0xa47a4c)); parts[0].add(deck);
  // 2. boiler and funnel
  const boiler = mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 14).rotateX(Math.PI / 2), copperM()); boiler.position.set(0, 2.25, 0.9); parts[1].add(boiler);
  const funnel = mesh(new THREE.CylinderGeometry(0.32, 0.38, 2.2, 12), mat(0xc0392b)); funnel.position.set(0, 3.4, 1.3); parts[1].add(funnel);
  const fband = mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.3, 12), mat(0x1e1e22)); fband.position.set(0, 4.35, 1.3); parts[1].add(fband);
  // 3. steel ice plough and caterpillar treads
  const plowShape = new THREE.Shape(); plowShape.moveTo(-1.4, 0); plowShape.lineTo(1.4, 0); plowShape.lineTo(0, -1.6); plowShape.closePath();
  const plow = mesh(new THREE.ExtrudeGeometry(plowShape, { depth: 1.2, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 1.2, -2.3), steelM()); parts[2].add(plow);
  for (const sx of [-1, 1]) {
    const tread = mesh(new THREE.BoxGeometry(0.5, 0.7, 4.6), mat(0x2b2b30)); tread.position.set(sx * 1.45, 0.4, 0.2); parts[2].add(tread);
    for (let k = 0; k < 8; k++) { const r = mesh(new THREE.BoxGeometry(0.54, 0.1, 0.12), steelM(), { cast: false }); r.position.set(sx * 1.45, 0.77, -1.9 + k * 0.6); parts[2].add(r); }
  }
  // 4. wheelhouse, cargo and flag
  const house = mesh(new THREE.BoxGeometry(1.7, 1.1, 1.3), mat(0xe8e2d4)); house.position.set(0, 2.25, -0.6); parts[3].add(house);
  const roof = mesh(new THREE.BoxGeometry(1.9, 0.14, 1.5), mat(0x7a2e24)); roof.position.set(0, 2.88, -0.6); parts[3].add(roof);
  for (const sx of [-0.45, 0.45]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), hdr(1.3, 1.0, 0.5)); w.position.set(sx, 2.35, -1.26); w.rotation.y = Math.PI; parts[3].add(w); }
  for (const [x, z, s] of [[-0.7, 2.0, 0.55], [0.6, 2.1, 0.5], [0.0, 2.3, 0.45], [-0.6, 1.4, 0.45]]) { const c = mesh(new THREE.BoxGeometry(s, s * 0.8, s), woodM()); c.position.set(x, 1.75 + s * 0.4, z); parts[3].add(c); }
  const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), darkWood()); pole.position.set(0.6, 3.6, -0.6); parts[3].add(pole);
  const flag = mesh(new THREE.PlaneGeometry(0.7, 0.42), new THREE.MeshLambertMaterial({ color: 0xf2c94c, side: THREE.DoubleSide })); flag.position.set(0.95, 4.1, -0.6); parts[3].add(flag);
  parts.forEach((p) => { p.visible = false; });
  return { group: g, parts, flag, funnelTop: new THREE.Vector3(0, 4.6, 1.3) };
}

// ---------------------------------------------------------------------------
// Station Aube and the Heart of Winter
// ---------------------------------------------------------------------------
export function makeStation() {
  const g = new THREE.Group();
  const concrete = new THREE.MeshLambertMaterial({ color: 0x9aa0a6, side: THREE.DoubleSide, flatShading: true });
  // cracked dome, open towards the camera
  const dome = mesh(new THREE.SphereGeometry(6.5, 28, 12, Math.PI * 0.99, Math.PI * 1.45, 0, Math.PI / 2), concrete);
  dome.position.set(0, 0, -1); g.add(dome);
  const snowRim = mesh(new THREE.SphereGeometry(6.6, 28, 4, Math.PI * 0.99, Math.PI * 1.45, 0, 0.5), snowM()); snowRim.position.set(0, 0, -1); g.add(snowRim);
  const floor = mesh(new THREE.CircleGeometry(6.3, 32).rotateX(-Math.PI / 2), mat(0x6c7178), { cast: false, receive: true }); floor.position.set(0, 0.02, -1); g.add(floor);
  // the well with the valve
  const well = mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.25, 20), mat(0x3a3e45)); well.position.set(-3.0, 0.12, 0.2); g.add(well);
  const hole = mesh(new THREE.CircleGeometry(1.05, 20).rotateX(-Math.PI / 2), mat(0x05080c), { cast: false }); hole.position.set(-3.0, 0.26, 0.2); g.add(hole);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const p = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 4), steelM()); p.position.set(-3.0 + Math.cos(a) * 1.3, 0.7, 0.2 + Math.sin(a) * 1.3); g.add(p); }
  const rail = mesh(new THREE.TorusGeometry(1.3, 0.04, 4, 24).rotateX(Math.PI / 2), steelM()); rail.position.set(-3.0, 1.15, 0.2); g.add(rail);
  const wheel = mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 14), mat(0xb02020)); wheel.position.set(-3.0, 1.6, 0.2); wheel.rotation.x = Math.PI / 2; g.add(wheel);
  // the Heart
  const heart = new THREE.Group(); heart.position.set(-0.6, 2.6, -2.0); g.add(heart);
  const ped = mesh(new THREE.CylinderGeometry(1.2, 1.6, 1.2, 10), mat(0x50565e)); ped.position.set(-0.6, 0.6, -2.0); g.add(ped);
  const coreM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.9, 1.5) });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), coreM); heart.add(core);
  const rings = [];
  for (let i = 0; i < 3; i++) { const r = mesh(new THREE.TorusGeometry(1.5 + i * 0.25, 0.06, 6, 30), steelM()); r.rotation.x = i * 0.9; heart.add(r); rings.push(r); }
  const halo = glow(0x7fd8ff, 7, 0.8); heart.add(halo);
  const light = new THREE.PointLight(0x7fd8ff, 30, 22, 1.3); heart.add(light);
  for (const [x, z] of [[-3.6, -6.0], [2.6, -6.4]]) g.add(makePipe({ x: -0.6, y: 2.0, z: -2.0 }, { x, y: 3.5, z }, 0.22, ironM()));
  g.add(makePipe({ x: -0.6, y: 0.5, z: -2.0 }, { x: -3.0, y: 0.4, z: 0.2 }, 0.18, ironM()));
  // Véra's desk with a terminal and her coat
  const desk = new THREE.Group(); desk.position.set(3.0, 0, 1.6); desk.rotation.y = -0.9; g.add(desk);
  desk.add(mesh(new THREE.BoxGeometry(1.4, 0.8, 0.7), mat(0x5a5f66)).translateY(0.4));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.3, 0.6) })); screen.position.set(0, 1.15, -0.1); desk.add(screen);
  desk.add(mesh(new THREE.BoxGeometry(0.75, 0.5, 0.06), mat(0x2b2b30)).translateY(1.15).translateZ(-0.14));
  const coat = mesh(new THREE.CapsuleGeometry(0.28, 0.5, 4, 8), mat(0x8a2e2e)); coat.position.set(0.9, 0.6, 0.4); coat.rotation.z = 1.2; desk.add(coat);
  // entrance sign
  const sign = mesh(new THREE.BoxGeometry(3.6, 1.1, 0.12), [mat(0x2b3138), mat(0x2b3138), mat(0x2b3138), mat(0x2b3138), new THREE.MeshLambertMaterial({ map: signTexture('STATION AUBE', 'Projet du Voile · 2041') }), mat(0x2b3138)]);
  sign.position.set(6.4, 1.3, 4.2); sign.rotation.y = 0.65; g.add(sign);
  for (const sx of [-1.6, 1.6]) { const p = mesh(new THREE.BoxGeometry(0.15, 1.3, 0.15), ironM()); p.position.set(6.4 + sx * Math.cos(0.65), 0.65, 4.2 - sx * Math.sin(0.65)); g.add(p); }
  return { group: g, heart, core, coreM, rings, halo, light, wheel, screen };
}

// One of the Veil towers that keep spraying dust into the sky.
export function makeVeilTower(h = 16) {
  const g = new THREE.Group();
  const white = mat(0xe2e6ea);
  const shaft = mesh(new THREE.CylinderGeometry(0.7, 1.4, h, 10), white); shaft.position.y = h / 2; g.add(shaft);
  for (const y of [h * 0.3, h * 0.6, h * 0.9]) { const b = mesh(new THREE.CylinderGeometry(0.95 - y / h * 0.4, 1.1 - y / h * 0.4, 0.35, 10), mat(0xc0392b)); b.position.y = y; g.add(b); }
  const nozzle = mesh(new THREE.CylinderGeometry(1.1, 0.6, 1.2, 10), ironM()); nozzle.position.y = h + 0.6; g.add(nozzle);
  const lamp = glow(0xff4040, 1.6, 0.8); lamp.position.y = h + 1.4; g.add(lamp);
  return { group: g, top: new THREE.Vector3(0, h + 1.3, 0), lamp };
}

// Glass greenhouse for the Heart's warmth (ending B).
export function makeGreenhouse() {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(1.7, 1.75, 0.3, 16), stoneM()); base.position.y = 0.15; g.add(base);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const p = mesh(new THREE.ConeGeometry(0.3, 0.9 + (i % 3) * 0.3, 6), mat(i % 2 ? 0x4f9a3a : 0x6cbf4a)); p.position.set(Math.cos(a) * 0.9, 0.7, Math.sin(a) * 0.9); g.add(p);
  }
  const tom = mesh(new THREE.SphereGeometry(0.12, 6, 5), mat(0xd23b3b)); tom.position.set(0.4, 0.9, 0.3); g.add(tom);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.65, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2, depthWrite: false }));
  glass.position.y = 0.3; g.add(glass);
  const frame = mesh(new THREE.TorusGeometry(1.65, 0.04, 4, 24).rotateX(Math.PI / 2), ironM()); frame.position.y = 0.3; g.add(frame);
  for (let i = 0; i < 4; i++) { const arc = mesh(new THREE.TorusGeometry(1.65, 0.035, 4, 16, Math.PI), ironM()); arc.rotation.y = i * Math.PI / 4; arc.position.y = 0.3; g.add(arc); }
  const light = new THREE.PointLight(0xffd090, 3, 5, 1.6); light.position.y = 1.2; g.add(light);
  return g;
}

// The black box Anouk's nets bring up from the drowned town.
export function makeRelic() {
  const g = new THREE.Group();
  const box = mesh(new THREE.BoxGeometry(0.55, 0.35, 0.4), mat(0x1c1e22, { standard: true, metalness: 0.4, roughness: 0.5 })); box.position.y = 0.2; g.add(box);
  const stripe = mesh(new THREE.BoxGeometry(0.56, 0.06, 0.41), mat(0xd4a640)); stripe.position.y = 0.3; g.add(stripe);
  const ant = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), mat(0x888888)); ant.position.set(0.18, 0.6, 0); g.add(ant);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff3030 })); led.position.set(0.18, 0.86, 0); g.add(led);
  const halo = glow(0x8fd8ff, 2.2, 0.7); halo.position.y = 0.4; g.add(halo);
  return { group: g, led, halo };
}

export function makeCub() { return makeBear({ scale: 0.45, color: 0xf7f5ef }); }
export function makeNpcHuman(opts) { return makeHuman({ tool: null, ...opts }); }
