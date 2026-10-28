// Models of the electric age and the vertical city: copper veins, the wire
// mill, the power plant, pylons and cables, the radio mast, street lamps,
// apartment towers that grow floor by floor, the Tower of Dawn with its sky
// deck and lift, vertical farms, the cement works, wind turbines.
import * as THREE from 'three';
import { mat, hdr, glow, makeDeck } from './models.js';
import { makePipe } from './machines.js';
import { makeCanvas, canvasTexture } from './textures.js';
import { sunEmblem } from './models3.js';

function mesh(geo, material, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
const ironM = () => mat(0x4a4e55, { standard: true, metalness: 0.6, roughness: 0.5 });
const steelM = () => mat(0xb9c4cf, { standard: true, metalness: 0.75, roughness: 0.3 });
const copperM = () => mat(0xc27a3a, { standard: true, metalness: 0.7, roughness: 0.35 });
const concreteM = () => mat(0xc9c6bf);
const darkConcrete = () => mat(0x8f8c86);
const snowM = () => mat(0xf6f9fd);

// Windows that light up at night: one shared material per tint.
const WINDOWS = new Map();
export function windowMat(tint = 0xffd890) {
  if (!WINDOWS.has(tint)) {
    const c = new THREE.Color(tint);
    WINDOWS.set(tint, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.45) }));
  }
  return WINDOWS.get(tint);
}
// 0 = day (dim glass), 1 = night (glowing)
export function setNightWindows(k) {
  for (const [tint, m] of WINDOWS) m.color.set(tint).multiplyScalar(0.35 + k * 1.1);
}

export function makeCopperNode(seed = 1) {
  const g = new THREE.Group();
  const rock = mesh(new THREE.DodecahedronGeometry(0.85, 0), new THREE.MeshLambertMaterial({ color: 0x55504a, flatShading: true }));
  rock.scale.set(1.1, 0.8, 1.05); rock.position.y = 0.58; rock.rotation.y = seed; g.add(rock);
  const cu = mat(0x2fb8a0, { emissive: 0x08332c });
  for (let i = 0; i < 6; i++) {
    const a = seed * 1.7 + i * 1.05;
    const c = mesh(new THREE.OctahedronGeometry(0.18 + (i % 3) * 0.05, 0), cu);
    c.position.set(Math.cos(a) * 0.7, 0.45 + (i % 2) * 0.4, Math.sin(a) * 0.62); c.rotation.set(a, a * 2, 0); g.add(c);
  }
  const cap = mesh(new THREE.DodecahedronGeometry(0.6, 0), new THREE.MeshLambertMaterial({ color: 0xf2f6fb, flatShading: true }));
  cap.scale.set(1.1, 0.3, 0.95); cap.position.y = 1.18; g.add(cap);
  return g;
}

// Wire mill: copper is drawn through dies and wound on spools.
export function makeWireMill() {
  const g = new THREE.Group();
  g.add(makeDeck(3.2, 2.4));
  const hall = mesh(new THREE.BoxGeometry(2.2, 1.6, 1.4), mat(0x7a5a46)); hall.position.set(-0.3, 0.85, -0.35); g.add(hall);
  const roof = mesh(new THREE.BoxGeometry(2.4, 0.16, 1.6), ironM()); roof.position.set(-0.3, 1.72, -0.35); g.add(roof);
  const roofSnow = mesh(new THREE.BoxGeometry(2.4, 0.12, 1.5), snowM()); roofSnow.position.set(-0.3, 1.84, -0.35); g.add(roofSnow);
  const bench = mesh(new THREE.BoxGeometry(2.6, 0.5, 0.5), ironM()); bench.position.set(0, 0.45, 0.75); g.add(bench);
  const spools = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Group(); s.position.set(-0.9 + i * 0.9, 0.95, 0.75);
    s.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.36, 14).rotateZ(Math.PI / 2), copperM()));
    for (const sx of [-0.2, 0.2]) s.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 14).rotateZ(Math.PI / 2), ironM()).translateX(sx));
    g.add(s); spools.push(s);
  }
  const lamp = glow(0xffc060, 1.2, 0.6); lamp.position.set(0.9, 1.4, 0.4); g.add(lamp);
  return { group: g, spools };
}

// Power plant built in three stages over the old Great Brazier.
export function makePowerPlant() {
  const g = new THREE.Group();
  const parts = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  parts.forEach((p) => { p.visible = false; g.add(p); });
  // 1. turbine hall in brick with arched windows and a tall stack
  const brick = mat(0x8e4a32);
  const hall = mesh(new THREE.BoxGeometry(5.2, 3.2, 3.2), brick); hall.position.set(0, 1.6, -2.4); parts[0].add(hall);
  const roof = mesh(new THREE.CylinderGeometry(1.7, 1.7, 5.3, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), ironM()); roof.position.set(0, 3.2, -2.4); roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI / 2; parts[0].add(roof);
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.5), windowMat(0xffd890)); w.position.set(-1.8 + i * 1.2, 1.6, -0.79); parts[0].add(w); }
  const stack = mesh(new THREE.CylinderGeometry(0.55, 0.85, 8, 12), brick); stack.position.set(2.2, 4, -3.4); parts[0].add(stack);
  for (const y of [2.5, 5, 7.5]) { const b = mesh(new THREE.TorusGeometry(0.75 - y * 0.03, 0.06, 6, 18).rotateX(Math.PI / 2), ironM()); b.position.set(2.2, y, -3.4); parts[0].add(b); }
  const lamp = glow(0xff3030, 1.2, 0.9); lamp.position.set(2.2, 8.2, -3.4); parts[0].add(lamp);
  // 2. alternators in front of the hall, humming with light
  const coils = [];
  for (const x of [-1.6, 0, 1.6]) {
    const a = new THREE.Group(); a.position.set(x, 0, 0.4); parts[1].add(a);
    a.add(mesh(new THREE.BoxGeometry(1.1, 0.4, 1.4), darkConcrete()).translateY(0.2));
    a.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 16).rotateX(Math.PI / 2), copperM()).translateY(0.9));
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.15, 10).rotateX(Math.PI / 2), hdr(0.5, 1.2, 1.6)); core.position.y = 0.9; a.add(core);
    coils.push(core);
  }
  const hum = glow(0x8fd8ff, 3.6, 0.5); hum.position.set(0, 1.2, 0.6); parts[1].add(hum);
  // 3. transformer yard and the first pylon
  for (const x of [-2, 2]) {
    const t = mesh(new THREE.BoxGeometry(1.0, 1.2, 0.8), mat(0x5d6b78)); t.position.set(x, 0.6, 2.2); parts[2].add(t);
    for (let k = 0; k < 3; k++) { const ins = mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.5, 6), mat(0xd9dee4)); ins.position.set(x - 0.3 + k * 0.3, 1.45, 2.2); parts[2].add(ins); }
  }
  const p = makePylon(5.5); p.position.set(0, 0, 3.6); parts[2].add(p);
  return { group: g, parts, coils, stack: new THREE.Vector3(2.2, 8.3, -3.4) };
}

// Lattice pylon carrying high-voltage lines.
export function makePylon(h = 6) {
  const g = new THREE.Group();
  const m = steelM();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 5), m, { cast: true });
    leg.position.set(sx * 0.4, h / 2, sz * 0.4); leg.rotation.set(-sz * 0.06, 0, sx * 0.06); g.add(leg);
  }
  for (let k = 1; k < 5; k++) { const y = h * k / 5; const r = mesh(new THREE.BoxGeometry(0.9 - k * 0.1, 0.04, 0.04), m, { cast: false }); r.position.y = y; g.add(r); const r2 = r.clone(); r2.rotation.y = Math.PI / 2; g.add(r2); }
  const arm = mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), m); arm.position.y = h - 0.2; g.add(arm);
  for (const x of [-1.1, 0, 1.1]) { const ins = mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.35, 6), mat(0xd9dee4), { cast: false }); ins.position.set(x, h - 0.45, 0); g.add(ins); }
  g.userData.top = h - 0.6;
  return g;
}

// Sagging cable between two points.
export function makeWire(a, b, sag = 0.6, color = 0x2b2b30) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag, a.z + (b.z - a.z) * t));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color }));
}

export function makeRadioMast(h = 16) {
  const g = new THREE.Group();
  g.add(makeDeck(2.2, 2.2));
  const m = mat(0xd23b3b), w = mat(0xf2f2f2);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const seg = new THREE.Group(); seg.position.y = i * h / n;
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; const leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, h / n, 4), i % 2 ? w : m); leg.position.set(Math.cos(a) * 0.35 * (1 - i / n * 0.5), h / n / 2, Math.sin(a) * 0.35 * (1 - i / n * 0.5)); seg.add(leg); }
    const ring = mesh(new THREE.TorusGeometry(0.36 * (1 - i / n * 0.5), 0.025, 4, 12).rotateX(Math.PI / 2), m, { cast: false }); seg.add(ring);
    g.add(seg);
  }
  const dish = mesh(new THREE.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), w); dish.rotation.x = -1.2; dish.position.set(0, h * 0.6, 0.6); g.add(dish);
  const blink = glow(0xff3030, 1.4, 1); blink.position.y = h + 0.3; g.add(blink);
  return { group: g, blink };
}

export function makeStreetLamp() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.8, 6), ironM()).translateY(1.4));
  const arm = mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), ironM()); arm.position.set(0.3, 2.75, 0); g.add(arm);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), windowMat(0xfff0c0)); bulb.position.set(0.6, 2.62, 0); g.add(bulb);
  const halo = glow(0xffe0a0, 2.4, 0.0); halo.position.set(0.6, 2.55, 0); g.add(halo);
  return { group: g, halo };
}

// Apartment tower replacing a cabin; floors are added one by one.
export function makeTowerBase() {
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(3.4, 1.8, 3.0), mat(0x8e6a52)); base.position.y = 0.9; g.add(base);
  const shop = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), windowMat(0xffd890)); shop.position.set(0, 0.85, 1.51); g.add(shop);
  const awning = mesh(new THREE.BoxGeometry(2.8, 0.08, 0.6), mat(0x3a86c8)); awning.position.set(0, 1.5, 1.75); awning.rotation.x = 0.25; g.add(awning);
  const floors = new THREE.Group(); g.add(floors);
  const roof = new THREE.Group(); g.add(roof);
  roof.add(mesh(new THREE.BoxGeometry(3.5, 0.2, 3.1), darkConcrete()));
  const tank = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 10), mat(0x7a5233)); tank.position.set(0.9, 0.55, -0.6); roof.add(tank);
  const ant = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), ironM()); ant.position.set(-1.1, 0.8, 0.8); roof.add(ant);
  const roofSnow = mesh(new THREE.BoxGeometry(3.3, 0.08, 2.9), snowM()); roofSnow.position.y = 0.13; roof.add(roofSnow);
  roof.position.y = 1.9;
  return { group: g, floors, roof, n: 0, tint: [0xffd890, 0xffe6b0, 0xcfe8ff][Math.floor(Math.random() * 3)] };
}
const FLOOR_H = 1.45;
export function addTowerFloor(t) {
  const f = new THREE.Group();
  const y = 1.8 + t.n * FLOOR_H;
  const body = mesh(new THREE.BoxGeometry(3.2, FLOOR_H - 0.06, 2.8), t.n % 2 ? concreteM() : mat(0xb9b3a8)); body.position.y = FLOOR_H / 2; f.add(body);
  for (const side of [1, -1]) for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.7), windowMat(t.tint)); w.position.set(-1.0 + i * 1.0, FLOOR_H / 2, side * 1.41); if (side < 0) w.rotation.y = Math.PI; f.add(w);
  }
  for (const side of [1, -1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.7), windowMat(t.tint)); w.position.set(side * 1.61, FLOOR_H / 2, 0); w.rotation.y = side * Math.PI / 2; f.add(w); }
  const balcony = mesh(new THREE.BoxGeometry(1.2, 0.08, 0.45), darkConcrete(), { cast: false }); balcony.position.set(t.n % 2 ? 0.8 : -0.8, 0.08, 1.62); f.add(balcony);
  const rail = mesh(new THREE.BoxGeometry(1.2, 0.35, 0.03), ironM(), { cast: false }); rail.position.set(balcony.position.x, 0.28, 1.84); f.add(rail);
  f.position.y = y;
  t.floors.add(f);
  t.n++;
  t.roof.position.y = 1.8 + t.n * FLOOR_H;
  return f;
}

// The Tower of Dawn: a skyscraper with a walkable sky deck at its crown.
export const DECK_Y = 26;
export function makeSkyscraper() {
  const g = new THREE.Group();
  const stages = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  stages.forEach((s) => { s.visible = false; g.add(s); });
  // 1. foundations and the lobby
  const plinth = mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.5, 8), darkConcrete(), { receive: true }); plinth.position.y = 0.25; stages[0].add(plinth);
  const lobby = mesh(new THREE.CylinderGeometry(2.0, 2.2, 3.0, 8), concreteM()); lobby.position.y = 2.0; stages[0].add(lobby);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), windowMat(0xfff0c0)); door.position.set(0, 1.4, 2.06); stages[0].add(door);
  // 2. steel frame
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    const col = mesh(new THREE.BoxGeometry(0.22, DECK_Y - 3.5, 0.22), steelM()); col.position.set(Math.cos(a) * 1.75, 3.5 + (DECK_Y - 3.5) / 2, Math.sin(a) * 1.75); stages[1].add(col);
  }
  for (let y = 5; y < DECK_Y; y += 3) { const r = mesh(new THREE.TorusGeometry(1.8, 0.07, 4, 8).rotateX(Math.PI / 2), steelM(), { cast: false }); r.position.y = y; r.rotation.y = Math.PI / 8; stages[1].add(r); }
  // 3. glass curtain wall with lit floors
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.95, DECK_Y - 3.5, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x8fc0e0, metalness: 0.6, roughness: 0.15, transparent: true, opacity: 0.75 }));
  glass.position.y = 3.5 + (DECK_Y - 3.5) / 2; stages[2].add(glass);
  for (let y = 5; y < DECK_Y - 1; y += 1.6) { const band = new THREE.Mesh(new THREE.CylinderGeometry(1.7 - y * 0.008, 1.7 - y * 0.008, 0.25, 8, 1, true), windowMat(0xcfe8ff)); band.position.y = y; stages[2].add(band); }
  // 4. crown and the sky deck
  const deck = mesh(new THREE.BoxGeometry(12.4, 0.5, 12.4), concreteM(), { receive: true }); deck.position.y = DECK_Y - 0.25; stages[3].add(deck);
  const deckTop = mesh(new THREE.BoxGeometry(12.2, 0.06, 12.2), mat(0x9b7a5a), { receive: true }); deckTop.position.y = DECK_Y + 0.02; stages[3].add(deckTop);
  for (const [sx, sz, len, rot] of [[0, 6.1, 12.4, 0], [0, -6.1, 12.4, 0], [6.1, 0, 12.4, Math.PI / 2], [-6.1, 0, 12.4, Math.PI / 2]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.06), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, metalness: 0.4, roughness: 0.1 }));
    rail.position.set(sx, DECK_Y + 0.45, sz); rail.rotation.y = rot; stages[3].add(rail);
    const top = mesh(new THREE.BoxGeometry(len, 0.08, 0.12), steelM(), { cast: false }); top.position.set(sx, DECK_Y + 0.92, sz); top.rotation.y = rot; stages[3].add(top);
  }
  for (let k = 0; k < 4; k++) { const brace = mesh(new THREE.BoxGeometry(0.3, 0.3, 6.5), steelM()); brace.position.set(0, DECK_Y - 1.6, 0); brace.rotation.set(0.6, k * Math.PI / 2, 0); stages[3].add(brace); }
  const crown = mesh(new THREE.CylinderGeometry(0.9, 1.7, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xd9c27a, metalness: 0.8, roughness: 0.3 })); crown.position.y = DECK_Y + 1.6; stages[3].add(crown);
  const spire = mesh(new THREE.CylinderGeometry(0.05, 0.25, 5, 6), steelM()); spire.position.y = DECK_Y + 5.6; stages[3].add(spire);
  const beacon = glow(0xffc070, 4, 0.9); beacon.position.y = DECK_Y + 8.2; stages[3].add(beacon);
  // the sun emblem on the crown
  const c = makeCanvas(256, 256), x = c.getContext('2d'); x.clearRect(0, 0, 256, 256); sunEmblem(x, 128, 150, 110, '#ffd25a');
  const emb = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true })); emb.position.set(0, DECK_Y + 1.8, 1.32); emb.rotation.x = -0.15; stages[3].add(emb);
  // the lift: a glass cabin running up the south face
  const cabin = new THREE.Group();
  cabin.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 1.2), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, metalness: 0.4, roughness: 0.1 })));
  cabin.add(mesh(new THREE.BoxGeometry(1.25, 0.1, 1.25), steelM()).translateY(-0.95));
  cabin.add(mesh(new THREE.BoxGeometry(1.25, 0.1, 1.25), steelM()).translateY(0.95));
  cabin.position.set(0, 1.0, 2.6);
  const shaft = mesh(new THREE.BoxGeometry(0.15, DECK_Y, 0.15), steelM()); shaft.position.set(0.7, DECK_Y / 2, 2.6); stages[2].add(shaft);
  const shaft2 = shaft.clone(); shaft2.position.x = -0.7; stages[2].add(shaft2);
  cabin.visible = false;
  g.add(cabin);
  return { group: g, stages, cabin, beacon };
}

export function makeVerticalFarm(levels = 6) {
  const g = new THREE.Group();
  const frame = steelM();
  for (let i = 0; i < levels; i++) {
    const y = 0.3 + i * 1.35;
    const slab = mesh(new THREE.BoxGeometry(2.6, 0.14, 2.6), concreteM()); slab.position.y = y; g.add(slab);
    for (let k = 0; k < 6; k++) { const p = mesh(new THREE.SphereGeometry(0.22, 6, 5), mat(k % 2 ? 0x4f9a3a : 0x7cc44f), { cast: false }); p.position.set(-0.9 + (k % 3) * 0.9, y + 0.24, -0.5 + Math.floor(k / 3) * 1.0); p.scale.y = 1.3; g.add(p); }
    const grow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.4, 1.4) })); grow.position.set(0, y + 1.15, 1.25); g.add(grow);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = mesh(new THREE.BoxGeometry(0.14, levels * 1.35 + 0.3, 0.14), frame); c.position.set(sx * 1.28, (levels * 1.35 + 0.3) / 2, sz * 1.28); g.add(c); }
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.7, levels * 1.35, 2.7), new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.3, depthWrite: false }));
  glass.position.y = levels * 1.35 / 2 + 0.3; g.add(glass);
  const halo = glow(0xff80ff, 3, 0.25); halo.position.y = levels * 0.7; g.add(halo);
  return g;
}

export function makeCementWorks() {
  const g = new THREE.Group();
  g.add(makeDeck(3.6, 2.8));
  const kiln = mesh(new THREE.CylinderGeometry(0.55, 0.55, 3.6, 14).rotateZ(Math.PI / 2 - 0.12), mat(0x9a8f80)); kiln.position.set(0, 1.2, 0.3); g.add(kiln);
  for (const x of [-1.2, 0, 1.2]) { const r = mesh(new THREE.TorusGeometry(0.58, 0.07, 6, 16).rotateY(Math.PI / 2), ironM()); r.position.set(x, 1.2 + x * 0.12, 0.3); g.add(r); }
  for (const x of [-1.2, 0.9]) { const silo = mesh(new THREE.CylinderGeometry(0.55, 0.55, 3.4, 12), concreteM()); silo.position.set(x, 1.7, -0.9); g.add(silo); const cone = mesh(new THREE.ConeGeometry(0.56, 0.5, 12), darkConcrete()); cone.position.set(x, 3.65, -0.9); g.add(cone); }
  const chim = mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.2, 8), ironM()); chim.position.set(1.6, 2.4, 0.3); g.add(chim);
  return { group: g, kiln, chimney: new THREE.Vector3(1.6, 3.6, 0.3) };
}

export function makeWindTurbine(h = 9) {
  const g = new THREE.Group();
  const mast = mesh(new THREE.CylinderGeometry(0.16, 0.32, h, 10), mat(0xf2f4f6)); mast.position.y = h / 2; g.add(mast);
  const nacelle = mesh(new THREE.BoxGeometry(0.5, 0.5, 1.1), mat(0xf2f4f6)); nacelle.position.set(0, h, 0); g.add(nacelle);
  const rotor = new THREE.Group(); rotor.position.set(0, h, 0.6); g.add(rotor);
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.BoxGeometry(0.22, 3.6, 0.06), mat(0xf7f9fb)); b.geometry.translate(0, 1.8, 0); b.rotation.z = i * Math.PI * 2 / 3; rotor.add(b); }
  rotor.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0xd23b3b)));
  const tip = glow(0xff3030, 0.8, 0.8); tip.position.set(0, h + 0.4, 0); g.add(tip);
  return { group: g, rotor };
}

export { makePipe };
