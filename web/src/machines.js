// Industrial machines of Fort-Aube: steam boiler and automated cauldrons,
// cash register, buoys, pipes. Same procedural low-poly style as models.js.
import * as THREE from 'three';
import { mat, hdr, glow, makeDeck } from './models.js';

function mesh(geo, material, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
const copperM = () => mat(0xc27a3a, { standard: true, metalness: 0.7, roughness: 0.35 });
const ironM = () => mat(0x4a4e55, { standard: true, metalness: 0.6, roughness: 0.5 });
const brassM = () => mat(0xd8a83a, { standard: true, metalness: 0.8, roughness: 0.3 });

// A pipe between two points (world or local space).
export function makePipe(a, b, r = 0.09, material = copperM()) {
  const A = new THREE.Vector3(a.x, a.y, a.z), B = new THREE.Vector3(b.x, b.y, b.z);
  const len = A.distanceTo(B);
  const m = mesh(new THREE.CylinderGeometry(r, r, len, 8).rotateX(Math.PI / 2), material);
  m.position.copy(A).lerp(B, 0.5);
  m.lookAt(B);
  return m;
}

// Steam boiler that feeds the cauldrons (cauldron level 4).
export function makeBoiler() {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0x80848b, flatShading: true });
  const plinth = mesh(new THREE.BoxGeometry(1.7, 0.35, 1.7), stone); plinth.position.y = 0.17; g.add(plinth);
  const body = mesh(new THREE.CylinderGeometry(0.62, 0.66, 1.7, 18), copperM()); body.position.y = 1.2; g.add(body);
  const dome = mesh(new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), copperM()); dome.position.y = 2.05; g.add(dome);
  for (const y of [0.55, 1.15, 1.75]) { const b = mesh(new THREE.TorusGeometry(0.665, 0.045, 6, 22).rotateX(Math.PI / 2), ironM()); b.position.y = y; g.add(b); }
  // firebox door glowing at the front
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), hdr(1.5, 0.55, 0.08)); door.position.set(0, 0.62, 0.67); g.add(door);
  const doorFrame = mesh(new THREE.BoxGeometry(0.56, 0.44, 0.06), ironM()); doorFrame.position.set(0, 0.62, 0.64); g.add(doorFrame);
  const dh = glow(0xff8030, 1.4, 0.5); dh.position.set(0, 0.62, 0.85); g.add(dh);
  // chimney, gauge and whistle
  const chim = mesh(new THREE.CylinderGeometry(0.13, 0.16, 2.0, 8), ironM()); chim.position.set(-0.25, 3.2, -0.15); g.add(chim);
  const chimCap = mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.18, 8), ironM()); chimCap.position.set(-0.25, 4.25, -0.15); g.add(chimCap);
  const gauge = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 16).rotateX(Math.PI / 2), mat(0xf4efe2)); gauge.position.set(0.3, 1.55, 0.6); gauge.rotation.y = 0.4; g.add(gauge);
  const needle = mesh(new THREE.BoxGeometry(0.02, 0.13, 0.02), mat(0xb02020), { cast: false }); needle.position.set(0, 0.05, 0.04); needle.geometry.translate(0, 0.05, 0); gauge.add(needle);
  needle.rotation.x = Math.PI / 2;
  const whistle = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.32, 8), brassM()); whistle.position.set(0.22, 2.75, 0.1); g.add(whistle);
  return { group: g, door, needle, chimney: new THREE.Vector3(-0.25, 4.35, -0.15), whistle: new THREE.Vector3(0.22, 2.95, 0.1) };
}

// Steam lids and an automatic ladle arm on a cauldron (cauldron level 4).
export function upgradeSteamPot(grill) {
  const parts = new THREE.Group();
  const lid = mesh(new THREE.SphereGeometry(0.8, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.42, 1), copperM());
  // hinged on the -x rim so it can puff open
  const lidG = new THREE.Group(); lidG.position.set(-0.75, 1.56, 0); lidG.rotation.z = 0.25;
  lid.position.set(0.75, 0, 0); lidG.add(lid);
  parts.add(lidG);
  const knob = mesh(new THREE.SphereGeometry(0.1, 8, 6), brassM()); knob.position.set(0.75, 0.36, 0); lidG.add(knob);
  const valve = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), brassM()); valve.position.set(0.4, 0.38, 0.25); lidG.add(valve);
  // the arm: post beside the pot and a swinging boom with a ladle
  const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.3, 8), ironM()); post.position.set(-0.95, 1.15, 0.55); parts.add(post);
  const arm = new THREE.Group(); arm.position.set(-0.95, 2.25, 0.55); parts.add(arm);
  const boom = mesh(new THREE.BoxGeometry(0.08, 0.08, 1.3), ironM()); boom.position.z = 0.6; arm.add(boom);
  const cup = mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), copperM()); cup.position.set(0, -0.45, 1.2); arm.add(cup);
  const rod = mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), ironM()); rod.position.set(0, -0.22, 1.2); arm.add(rod);
  grill.group.add(parts);
  grill.arm = arm; grill.lid = lidG;
  return parts;
}

// Brass cash register for the counter (counter level 4).
export function makeRegister() {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.62, 0.32, 0.46), brassM()); body.position.y = 0.16; g.add(body);
  const top = mesh(new THREE.BoxGeometry(0.62, 0.22, 0.26), brassM()); top.position.set(0, 0.4, -0.08); top.rotation.x = -0.35; g.add(top);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.12), hdr(0.4, 1.3, 0.5)); screen.position.set(0, 0.5, -0.215); screen.rotation.y = Math.PI; screen.rotation.x = 0.35; g.add(screen);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.12), hdr(0.4, 1.3, 0.5)); sign.position.set(0, 0.5, 0.06); sign.rotation.x = -0.35; g.add(sign);
  for (let i = 0; i < 6; i++) { const k = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), mat(0x2b2b30), { cast: false }); k.position.set(-0.2 + (i % 3) * 0.2, 0.34, 0.08 + Math.floor(i / 3) * 0.08); g.add(k); }
  const drawer = mesh(new THREE.BoxGeometry(0.66, 0.1, 0.5), mat(0x6b4529)); drawer.position.set(0, 0.03, 0.04); g.add(drawer);
  const crank = mesh(new THREE.TorusGeometry(0.1, 0.02, 4, 10, Math.PI), brassM()); crank.position.set(0.34, 0.2, 0); crank.rotation.y = Math.PI / 2; g.add(crank);
  return { group: g, drawer };
}

// Little float with a pennant marking a net under an ice hole.
export function makeBuoy() {
  const g = new THREE.Group();
  const f = mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xd23b3b)); f.position.y = 0.12; g.add(f);
  const band = mesh(new THREE.TorusGeometry(0.15, 0.04, 5, 12).rotateX(Math.PI / 2), mat(0xf6f6f6)); band.position.y = 0.14; g.add(band);
  const stick = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), mat(0x5a3f2a)); stick.position.y = 0.55; g.add(stick);
  const flag = mesh(new THREE.PlaneGeometry(0.28, 0.18), new THREE.MeshLambertMaterial({ color: 0xf2c94c, side: THREE.DoubleSide }), { cast: false });
  flag.position.set(0.14, 0.85, 0); g.add(flag);
  return { group: g, flag };
}

// Pulley block where a cable line tips its baskets into a cauldron.
export function makeTipper() {
  const g = new THREE.Group();
  const hood = mesh(new THREE.ConeGeometry(0.35, 0.45, 8, 1, true), ironM()); hood.rotation.x = Math.PI; hood.position.y = -0.4; g.add(hood);
  const wheel = mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 14), brassM()); g.add(wheel);
  return g;
}

export { makeDeck };
