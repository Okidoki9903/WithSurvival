// Models of the atomic and stellar ages: the fusion reactor on the old
// Brazier, the railway and its train, the panel works, the cosmodrome and
// its rockets, the space elevator tether, the mass driver that throws
// mirrors at the sun, and the Arches that carry Fort-Aube to the stars.
import * as THREE from 'three';
import { mat, hdr, glow, makeDeck } from './models.js';
import { windowMat } from './models4.js';
import { makeCanvas, canvasTexture } from './textures.js';
import { sunEmblem } from './models3.js';

function mesh(geo, material, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
const steelM = () => mat(0xb9c4cf, { standard: true, metalness: 0.75, roughness: 0.3 });
const whiteM = () => mat(0xf2f4f6);
const darkM = () => mat(0x3a3f47);
const concreteM = () => mat(0xc9c6bf);

function emblem(size, color = '#ffd25a') {
  const c = makeCanvas(256, 256), x = c.getContext('2d'); x.clearRect(0, 0, 256, 256); sunEmblem(x, 128, 150, 110, color);
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false }));
}

// Tokamak under a glass dome, built in three stages over the Great Brazier.
export function makeReactor() {
  const g = new THREE.Group();
  const parts = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  parts.forEach((p) => { p.visible = false; g.add(p); });
  // 1. shielded base ring
  const base = mesh(new THREE.CylinderGeometry(3.0, 3.2, 0.8, 24), concreteM(), { receive: true }); base.position.y = 0.4; parts[0].add(base);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const b = mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), mat(0x8f8c86)); b.position.set(Math.cos(a) * 2.7, 1.4, Math.sin(a) * 2.7); parts[0].add(b); }
  // 2. the torus and its magnets
  const torusM = new THREE.MeshStandardMaterial({ color: 0x9aa5b0, metalness: 0.8, roughness: 0.3 });
  const torus = mesh(new THREE.TorusGeometry(1.7, 0.55, 14, 36).rotateX(Math.PI / 2), torusM); torus.position.y = 1.7; parts[1].add(torus);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const c = mesh(new THREE.TorusGeometry(0.66, 0.12, 6, 14), mat(0xc27a3a, { standard: true, metalness: 0.7, roughness: 0.35 })); c.position.set(Math.cos(a) * 1.7, 1.7, Math.sin(a) * 1.7); c.rotation.y = -a; parts[1].add(c); }
  const plasmaM = hdr(1.6, 0.9, 2.2);
  const plasma = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.22, 10, 48).rotateX(Math.PI / 2), plasmaM); plasma.position.y = 1.7; parts[1].add(plasma);
  const halo = glow(0xc890ff, 7, 0.0); halo.position.y = 1.9; parts[1].add(halo);
  // 3. glass dome and the sun on top
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.3, depthWrite: false }));
  dome.position.y = 0.8; parts[2].add(dome);
  for (let k = 0; k < 6; k++) { const r = mesh(new THREE.TorusGeometry(3.1, 0.05, 4, 40, Math.PI), steelM(), { cast: false }); r.position.y = 0.8; r.rotation.y = k * Math.PI / 6; parts[2].add(r); }
  const em = emblem(1.6); em.position.set(0, 4.3, 0); em.rotation.y = Math.PI / 4; parts[2].add(em);
  const top = glow(0xffd36b, 3, 0.9); top.position.y = 4.1; parts[2].add(top);
  return { group: g, parts, plasma, plasmaM, halo };
}

// Railway along the old caravan road, with a platform and a train.
export function makeRailway(x, z0, z1) {
  const g = new THREE.Group();
  const len = z1 - z0;
  const bed = mesh(new THREE.BoxGeometry(2.4, 0.12, len), mat(0x8f8a82), { cast: false, receive: true }); bed.position.set(x, 0.06, (z0 + z1) / 2); g.add(bed);
  for (const dx of [-0.55, 0.55]) { const r = mesh(new THREE.BoxGeometry(0.1, 0.12, len), steelM(), { cast: false }); r.position.set(x + dx, 0.18, (z0 + z1) / 2); g.add(r); }
  const sleeperM = mat(0x5a3d26);
  for (let zz = z0 + 0.4; zz < z1; zz += 0.9) { const s = mesh(new THREE.BoxGeometry(1.7, 0.08, 0.28), sleeperM, { cast: false }); s.position.set(x, 0.13, zz); g.add(s); }
  return g;
}

export function makeTrain(cars = 4) {
  const g = new THREE.Group();
  const loco = new THREE.Group(); g.add(loco);
  const body = mesh(new THREE.BoxGeometry(1.7, 1.6, 4.2), mat(0xc0392b)); body.position.y = 1.15; loco.add(body);
  const nose = mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.7, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), mat(0xc0392b)); nose.rotation.y = Math.PI / 2; nose.position.set(0, 1.15, -2.1); nose.scale.set(1, 0.95, 0.7); loco.add(nose);
  const band = mesh(new THREE.BoxGeometry(1.74, 0.18, 4.25), whiteM()); band.position.y = 0.75; loco.add(band);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.1), windowMat(0xcfe8ff)); glass.position.set(0, 1.6, -2.62); loco.add(glass);
  const lamp = glow(0xfff0c0, 2.2, 0.9); lamp.position.set(0, 0.9, -2.8); loco.add(lamp);
  const em = emblem(0.9); em.position.set(0.86, 1.2, 0); em.rotation.y = Math.PI / 2; loco.add(em);
  for (let i = 1; i <= cars; i++) {
    const c = new THREE.Group(); c.position.z = i * 4.6; g.add(c);
    const b = mesh(new THREE.BoxGeometry(1.7, 1.5, 4.2), mat(i % 2 ? 0xe9e4da : 0xd9d2c4)); b.position.y = 1.1; c.add(b);
    for (const side of [-1, 1]) for (let k = 0; k < 4; k++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), windowMat(0xffe6b0)); w.position.set(side * 0.86, 1.35, -1.4 + k * 0.93); w.rotation.y = side * Math.PI / 2; c.add(w); }
    const roof = mesh(new THREE.BoxGeometry(1.6, 0.1, 4.0), mat(0xf6f9fd)); roof.position.y = 1.9; c.add(roof);
  }
  for (let i = 0; i <= cars; i++) for (const dz of [-1.3, 1.3]) for (const dx of [-0.7, 0.7]) { const w = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12).rotateZ(Math.PI / 2), darkM(), { cast: false }); w.position.set(dx, 0.35, i * 4.6 + dz); g.add(w); }
  return { group: g, length: cars * 4.6 + 4.2 };
}

export function makePlatform() {
  const g = new THREE.Group();
  const deck = mesh(new THREE.BoxGeometry(2.4, 0.4, 7.0), concreteM(), { receive: true }); deck.position.y = 0.2; g.add(deck);
  const roof = mesh(new THREE.BoxGeometry(2.8, 0.12, 6.2), mat(0x3a86c8)); roof.position.y = 2.9; g.add(roof);
  for (const z of [-2.6, 0, 2.6]) { const c = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6), steelM()); c.position.set(-0.9, 1.65, z); g.add(c); }
  const clock = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16).rotateZ(Math.PI / 2), whiteM()); clock.position.set(-0.9, 2.4, 0); g.add(clock);
  return g;
}

// Panel works: copper and steel become mirrors and solar panels.
export function makePanelWorks() {
  const g = new THREE.Group();
  g.add(makeDeck(3.6, 2.6));
  const hall = mesh(new THREE.BoxGeometry(3.0, 1.8, 1.6), mat(0xe9edf1)); hall.position.set(0, 0.95, -0.4); g.add(hall);
  const stripe = mesh(new THREE.BoxGeometry(3.02, 0.2, 1.62), mat(0x2a5fb0)); stripe.position.set(0, 1.6, -0.4); g.add(stripe);
  const roofPanels = [];
  for (let i = 0; i < 4; i++) { const p = mesh(new THREE.BoxGeometry(0.66, 0.05, 1.2), mat(0x2a5fb0, { standard: true, metalness: 0.4, roughness: 0.2 })); p.position.set(-1.1 + i * 0.73, 2.0, -0.4); p.rotation.x = -0.35; g.add(p); roofPanels.push(p); }
  const arm = new THREE.Group(); arm.position.set(0.9, 0.5, 0.8); g.add(arm);
  arm.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), mat(0xf2c94c)).translateY(0.3));
  const a2 = mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), mat(0xf2c94c)); a2.position.set(0, 0.95, 0); a2.rotation.z = 0.6; arm.add(a2);
  const spark = glow(0xaee6ff, 0.9, 0.0); spark.position.set(-0.4, 1.3, 0); arm.add(spark);
  return { group: g, arm, spark };
}

// Launch pad with a gantry tower; the rocket is a separate object.
export function makeLaunchPad() {
  const g = new THREE.Group();
  const pad = mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.5, 24), concreteM(), { receive: true }); pad.position.y = 0.25; g.add(pad);
  const flame = mesh(new THREE.BoxGeometry(2.2, 0.06, 2.2), darkM(), { cast: false }); flame.position.y = 0.52; g.add(flame);
  const tower = new THREE.Group(); tower.position.set(-2.8, 0, 0); g.add(tower);
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) { const leg = mesh(new THREE.BoxGeometry(0.12, 14, 0.12), mat(0xd23b3b)); leg.position.set(sx, 7, sz); tower.add(leg); }
  for (let y = 1; y < 14; y += 1.4) { const r = mesh(new THREE.BoxGeometry(1.1, 0.08, 1.1), mat(0xd23b3b), { cast: false }); r.position.y = y; tower.add(r); }
  const arms = [];
  for (const y of [5, 10]) { const a = mesh(new THREE.BoxGeometry(1.8, 0.15, 0.3), steelM()); a.position.set(1.1, y, 0); tower.add(a); arms.push(a); }
  const beacon = glow(0xff3030, 1.2, 0.9); beacon.position.y = 14.3; tower.add(beacon);
  return { group: g, arms };
}

export function makeRocket(kind = 'rocket') {
  const g = new THREE.Group();
  const big = kind === 'arche';
  const R = big ? 1.4 : 0.9, H = big ? 14 : 10;
  const hull = mesh(new THREE.CylinderGeometry(R, R, H, 20), whiteM()); hull.position.y = H / 2 + 0.6; g.add(hull);
  for (const y of [H * 0.3, H * 0.62]) { const b = mesh(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.35, 20), mat(big ? 0x2a5fb0 : 0x222222)); b.position.y = y + 0.6; g.add(b); }
  const nose = mesh(new THREE.ConeGeometry(R, R * 2.6, 20), mat(big ? 0xffd36b : 0xd23b3b, { standard: true, metalness: 0.4, roughness: 0.4 })); nose.position.y = H + 0.6 + R * 1.3; g.add(nose);
  for (let k = 0; k < 4; k++) {
    const fin = mesh(new THREE.BoxGeometry(0.1, 2.2, 1.2), mat(big ? 0x2a5fb0 : 0xd23b3b)); const a = k * Math.PI / 2;
    fin.position.set(Math.cos(a) * (R + 0.45), 1.7, Math.sin(a) * (R + 0.45)); fin.rotation.y = -a; g.add(fin);
  }
  const em = emblem(R * 1.4); em.position.set(0, H * 0.78, R + 0.02); g.add(em);
  if (big) for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), windowMat(0xcfe8ff)); const a = i / 6 * Math.PI * 2; w.position.set(Math.sin(a) * (R + 0.02), H * 0.5, Math.cos(a) * (R + 0.02)); w.rotation.y = a; g.add(w); }
  const engine = mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.75, 0.7, 14), darkM()); engine.position.y = 0.35; g.add(engine);
  const flame = new THREE.Group(); g.add(flame);
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(R * 0.7, 4.5, 14).rotateX(Math.PI), hdr(2.2, 1.4, 0.5)); f1.position.y = -2.2; flame.add(f1);
  const f2 = glow(0xffb050, 7, 0.9); f2.position.y = -1.2; flame.add(f2);
  flame.visible = false;
  return { group: g, flame, height: H + R * 2.6 };
}

// Space elevator: a glowing tether from the Tower of Dawn up into orbit, with climbers.
export function makeTether(h = 320) {
  const g = new THREE.Group();
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 6), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, fog: false }));
  cable.position.y = h / 2; g.add(cable);
  const climbers = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Group();
    c.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 10), whiteM()));
    const l = glow(0x9fe0ff, 2, 0.9); c.add(l);
    g.add(c); climbers.push({ g: c, t: i / 3 });
  }
  return { group: g, climbers, h };
}

// Electromagnetic mass driver: a long ramp of rings that flings mirrors to orbit.
export function makeMassDriver(len = 16) {
  const g = new THREE.Group();
  const ramp = new THREE.Group(); g.add(ramp);
  ramp.rotation.x = 0.32;
  const rail = mesh(new THREE.BoxGeometry(0.6, 0.3, len), steelM()); rail.position.set(0, 0, -len / 2); ramp.add(rail);
  const rings = [];
  for (let i = 0; i < 9; i++) {
    const r = mesh(new THREE.TorusGeometry(0.9, 0.16, 8, 20), mat(0x2fb8a0, { standard: true, metalness: 0.6, roughness: 0.3 })); r.position.set(0, 0.7, -1 - i * (len - 2) / 8); ramp.add(r);
    const core = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 20), hdr(0.3, 1.6, 1.4)); core.position.copy(r.position); ramp.add(core);
    rings.push(core);
  }
  for (let i = 0; i < 5; i++) { const z = -2 - i * (len - 4) / 4; const leg = mesh(new THREE.BoxGeometry(0.3, 1, 0.3), concreteM()); const h = -z * Math.tan(0.32); leg.scale.y = Math.max(0.3, h); leg.position.set(0, h / 2, z * Math.cos(0.32)); g.add(leg); }
  const base = mesh(new THREE.BoxGeometry(2.6, 1.0, 2.2), mat(0x5d6b78)); base.position.set(0, 0.5, 0.6); g.add(base);
  return { group: g, ramp, rings, len, muzzle: new THREE.Vector3(0, Math.sin(0.32) * len + 0.7, -Math.cos(0.32) * len) };
}
