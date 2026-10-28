// Civic buildings of the districts: Lina's town hall, shops that grow a
// storey with every level, and the builders' yard.
import * as THREE from 'three';
import { mat, glow, makeDeck } from './models.js';
import { windowMat } from './models4.js';
import { makeCanvas, canvasTexture, drawIcon } from './textures.js';
import { sunEmblem } from './models3.js';

function mesh(geo, material, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
const snowM = () => mat(0xf6f9fd);
const stoneM = () => mat(0xc9c2b4);

function signTexture(icon, bg, fg = '#ffffff') {
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f2d24b'; g.lineWidth = 7; g.stroke();
  drawIcon(g, icon, 64, 64, 66, fg);
  return canvasTexture(c);
}

// Lina's town hall: stone hall, columns, a clock tower with the rising sun.
export function makeTownHall() {
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(5.6, 0.3, 3.6), stoneM(), { receive: true }); base.position.y = 0.15; g.add(base);
  const hall = mesh(new THREE.BoxGeometry(5.0, 2.4, 2.8), mat(0xe8dcc6)); hall.position.set(0, 1.5, -0.2); g.add(hall);
  const roof = mesh(new THREE.ConeGeometry(3.8, 1.2, 4, 1), mat(0x6a3d2a)); roof.position.set(0, 3.3, -0.2); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.62); g.add(roof);
  const roofSnow = mesh(new THREE.ConeGeometry(3.6, 0.5, 4, 1), snowM(), { cast: false }); roofSnow.position.set(0, 3.75, -0.2); roofSnow.rotation.y = Math.PI / 4; roofSnow.scale.set(1, 1, 0.62); g.add(roofSnow);
  for (const x of [-2.0, -0.7, 0.7, 2.0]) { const c = mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.4, 10), mat(0xf4efe4)); c.position.set(x, 1.5, 1.35); g.add(c); }
  const pediment = mesh(new THREE.BoxGeometry(5.0, 0.3, 0.4), mat(0xf4efe4)); pediment.position.set(0, 2.85, 1.3); g.add(pediment);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.6), windowMat(0xffd890)); door.position.set(0, 1.1, 1.21); g.add(door);
  for (const x of [-1.4, 1.4]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), windowMat(0xffd890)); w.position.set(x, 1.5, 1.21); g.add(w); }
  // clock tower
  const tower = mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), mat(0xe8dcc6)); tower.position.set(0, 4.4, -0.4); g.add(tower);
  const cap = mesh(new THREE.ConeGeometry(0.95, 1.2, 4), mat(0x2f6db0)); cap.position.set(0, 6.1, -0.4); cap.rotation.y = Math.PI / 4; g.add(cap);
  const c = makeCanvas(256, 256), x = c.getContext('2d');
  x.fillStyle = '#fff8e6'; x.beginPath(); x.arc(128, 128, 120, 0, Math.PI * 2); x.fill();
  sunEmblem(x, 128, 150, 90, '#d9a520');
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), new THREE.MeshBasicMaterial({ map: canvasTexture(c) })); clock.position.set(0, 4.7, 0.21); g.add(clock);
  const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), mat(0x4a4e55)); pole.position.set(0, 7.3, -0.4); g.add(pole);
  const flag = mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshLambertMaterial({ color: 0xf2c94c, side: THREE.DoubleSide }), { cast: false }); flag.position.set(0.42, 7.75, -0.4); g.add(flag);
  const lamp = glow(0xffd890, 2.2, 0.5); lamp.position.set(0, 1.3, 1.6); g.add(lamp);
  return { group: g, flag };
}

const SHOP_STYLES = {
  auberge: { wall: 0x9a6a46, awning: 0xc0392b },
  boulangerie: { wall: 0xe0c89a, awning: 0xe67e22 },
  pelleterie: { wall: 0x8e6a52, awning: 0x5a8f4a },
  coutellerie: { wall: 0x6f6a66, awning: 0x2f6db0 },
  bains: { wall: 0xd9e2ea, awning: 0x2f8f8a },
  ecole: { wall: 0xd8c3a5, awning: 0x8a5ab0 },
  atelier: { wall: 0x7a8794, awning: 0xf2c94c },
  cinema: { wall: 0x3a3f47, awning: 0xd23b3b },
  marche: { wall: 0xe8dcc6, awning: 0x3a86c8 },
  dispensaire: { wall: 0xf2f4f6, awning: 0xd23b3b },
  bibliotheque: { wall: 0xb9a37f, awning: 0x2f7a6a },
};

// A shop: one storey per level, a striped awning and a round sign.
export function makeShop(kind, icon) {
  const st = SHOP_STYLES[kind] || SHOP_STYLES.auberge;
  const g = new THREE.Group();
  const levels = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  levels.forEach((l) => { l.visible = false; g.add(l); });
  // level 1: ground floor with a shop window and awning
  const L1 = levels[0];
  L1.add(mesh(new THREE.BoxGeometry(3.0, 1.9, 2.4), mat(st.wall)).translateY(0.95));
  const shopWin = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.9), windowMat(0xffd890)); shopWin.position.set(0.2, 0.9, 1.21); L1.add(shopWin);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.3), mat(0x4a3020)); door.position.set(-1.05, 0.65, 1.21); L1.add(door);
  for (let i = 0; i < 6; i++) {
    const s = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.8), mat(i % 2 ? 0xf6f2ea : st.awning), { cast: false });
    s.position.set(-1.25 + i * 0.5, 1.85, 1.55); s.rotation.x = 0.35; L1.add(s);
  }
  const sign = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ map: signTexture(icon, '#2b3138') }));
  sign.position.set(0, 2.4, 1.22); L1.add(sign);
  const roof1 = mesh(new THREE.BoxGeometry(3.2, 0.18, 2.6), mat(0x5a3a24)); roof1.position.y = 1.99; L1.add(roof1);
  const snow1 = mesh(new THREE.BoxGeometry(3.0, 0.08, 2.4), snowM(), { cast: false }); snow1.position.y = 2.12; L1.add(snow1);
  // level 2: an upper floor with lit windows and a chimney
  const L2 = levels[1];
  L2.add(mesh(new THREE.BoxGeometry(2.8, 1.5, 2.2), mat(st.wall)).translateY(2.85));
  for (const x of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.7), windowMat(0xffe6b0)); w.position.set(x, 2.9, 1.11); L2.add(w); }
  const chim = mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), stoneM()); chim.position.set(1.0, 3.9, -0.5); L2.add(chim);
  const roof2 = mesh(new THREE.ConeGeometry(2.1, 0.9, 4), mat(0x6a3d2a)); roof2.position.y = 4.05; roof2.rotation.y = Math.PI / 4; roof2.scale.set(1, 1, 0.8); L2.add(roof2);
  // level 3: a lit roof terrace with a flag and garlands
  const L3 = levels[2];
  const banner = mesh(new THREE.PlaneGeometry(0.5, 1.2), new THREE.MeshLambertMaterial({ color: st.awning, side: THREE.DoubleSide }), { cast: false }); banner.position.set(-1.45, 2.8, 1.2); L3.add(banner);
  const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), mat(0x4a4e55)); pole.position.set(0, 5.0, 0); L3.add(pole);
  const flag = mesh(new THREE.PlaneGeometry(0.7, 0.42), new THREE.MeshLambertMaterial({ color: 0xf2c94c, side: THREE.DoubleSide }), { cast: false }); flag.position.set(0.37, 5.55, 0); L3.add(flag);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), windowMat([0xffd890, 0xcfe8ff, 0xffb0b0][i % 3])); b.position.set(-1.5 + i * 0.5, 2.2 - Math.sin(i / 6 * Math.PI) * 0.18, 1.6); L3.add(b); }
  const lamp = glow(0xffe0a0, 1.8, 0.45); lamp.position.set(0.2, 1.0, 1.7); L3.add(lamp);
  return { group: g, levels };
}

// The builders' yard: a crane, stacked beams and a site hut.
export function makeBuilderYard() {
  const g = new THREE.Group();
  g.add(makeDeck(3.2, 2.4));
  const hut = mesh(new THREE.BoxGeometry(1.6, 1.4, 1.4), mat(0xf2c94c)); hut.position.set(-0.7, 0.75, -0.4); g.add(hut);
  const hutRoof = mesh(new THREE.BoxGeometry(1.8, 0.12, 1.6), mat(0x3a3f47)); hutRoof.position.set(-0.7, 1.5, -0.4); g.add(hutRoof);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), windowMat(0xffd890)); win.position.set(-0.7, 0.9, 0.31); g.add(win);
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.BoxGeometry(1.2, 0.16, 0.18), mat(0xe2b37a)); b.position.set(0.9, 0.2 + i * 0.17, 0.5 - (i % 2) * 0.2); g.add(b); }
  const crane = new THREE.Group(); crane.position.set(1.0, 0, -0.6); g.add(crane);
  const mast = mesh(new THREE.BoxGeometry(0.22, 4.2, 0.22), mat(0xf2c94c)); mast.position.y = 2.1; crane.add(mast);
  const jib = new THREE.Group(); jib.position.y = 4.2; crane.add(jib);
  const arm = mesh(new THREE.BoxGeometry(3.2, 0.16, 0.16), mat(0xf2c94c)); arm.position.x = 0.8; jib.add(arm);
  const counter = mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), mat(0x8c9097)); counter.position.x = -0.7; jib.add(counter);
  const hook = mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), mat(0x3a3f47)); hook.position.set(2.0, -0.7, 0); jib.add(hook);
  return { group: g, jib };
}

export function makeSlotMarker() {
  const g = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(1.25, 0.06, 4, 28).rotateX(Math.PI / 2), mat(0xf2d24b), { cast: false }); ring.position.y = 0.04; g.add(ring);
  return g;
}
