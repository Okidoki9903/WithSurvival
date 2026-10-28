// Acts VI to IX — from the atom to the galaxy.
// VI: the caravan road becomes a railway linking the cities the radio found,
// and the Great Brazier becomes a fusion reactor: Type I. Twenty years pass;
// Aube, Sasha's daughter, takes over. VII: the cosmodrome, the first rocket,
// the orbital ring and the space elevator rising from the Tower of Dawn.
// VIII: panel works, delivery drones and a mass driver throw mirrors around
// the sun: the Dyson swarm, Type II. IX: the Arches carry Fort-Aube to other
// stars: Type III, and somewhere a new frozen world where it all begins again.
// Installed as methods on Game.
import * as THREE from 'three';
import { Factory } from './civ.js';
import { mat } from './models.js';
import { DECK_Y } from './models4.js';
import { makeReactor, makeRailway, makeTrain, makePanelWorks, makeLaunchPad, makeRocket, makeTether, makeMassDriver } from './models5.js';
import { ACT2_POS } from './act2.js';
import { ACT4_POS } from './act4.js';

const P = (x, z) => ({ x, z });
export const COSMO = { x0: -9, x1: 14, z0: -34, z1: -17.5, fringe: 1.2 };
export const ACT6_POS = {
  railTile: P(5.8, 8.4),
  linkTile: P(9.6, 8.8),
  reactor: ACT2_POS.brasier, reactorTile: P(30.6, 17.8),
  cosmoTile: P(4.0, -16.4),
  pad: P(6.0, -27.0), rocketTile: P(6.0, -21.2),
  works: P(-3.6, -23.0), wireIn: P(-6.0, -19.8), steelIn: P(-3.4, -19.8), panelOut: P(-0.8, -19.8),
  driver: P(-5.2, -29.0), driverIn: P(-1.8, -27.2),
  arche: P(6.0, -27.0), archePanel: P(10.6, -20.6), archeCan: P(12.4, -23.4), archeSteel: P(12.4, -26.4),
  elevatorTile: P(9.0, -9.0),
};
const S = ACT6_POS;
const LINKS = [['link1', 'Port-Glace', 'train'], ['link2', 'Kiruna', 'train'], ['link3', 'Ville-Ouest', 'train'], ['link4', 'Nouvelle-Solenne', 'train']];

const T = (id, icon, cost, at, req, label, extra = {}) => ({ id, icon, cost, at, req, label, ...extra });
const A6 = (g) => g.act6 || {};
export const ACT6_TILES = [
  // VI — the network and the atom
  T('railway', 'train', 120000, S.railTile, (g) => g.act4?.deckSeen, 'Chemin de fer', { items: { steel: 60, plank: 30 }, beat: 'railTile', reveal: true }),
  ...LINKS.map(([id, name], i) => T(id, 'globe', 40000 + i * 20000, S.linkTile, (g) => g.bought.railway && (i === 0 || g.bought[LINKS[i - 1][0]]), `Relier ${name}`, { items: { wire: 30 + i * 10, steel: 20 } })),
  T('fusion1', 'atom', 100000, S.reactorTile, (g) => g.bought.link1, 'Réacteur · enceinte', { items: { concrete: 60, steel: 40 }, beat: 'fusionTile', reveal: true }),
  T('fusion2', 'atom', 150000, S.reactorTile, (g) => g.bought.fusion1, 'Réacteur · tore', { items: { wire: 60, steel: 40 } }),
  T('fusion3', 'sun', 200000, S.reactorTile, (g) => g.bought.fusion2, 'Réacteur · allumage', { items: { concrete: 40, wire: 40 }, big: true }),
  // VII — the stars
  T('cosmodrome', 'rocket', 200000, S.cosmoTile, (g) => A6(g).aube, 'Cosmodrome', { items: { concrete: 60, steel: 40 }, big: true, reveal: true }),
  T('panels', 'panel', 150000, S.works, (g) => g.bought.cosmodrome, 'Usine de panneaux et drones', { items: { steel: 40, wire: 40 }, reveal: true }),
  T('rocket1', 'rocket', 250000, S.rocketTile, (g) => g.bought.cosmodrome && (g.stats.panels || 0) >= 4, 'Fusée Aube-1', { items: { steel: 40, wire: 30, can: 30, panel: 10 }, big: true }),
  T('elevator', 'tower', 400000, S.elevatorTile, (g) => A6(g).launched >= 1, 'Ascenseur spatial', { items: { steel: 60, wire: 60, panel: 30 }, big: true, reveal: true }),
  // VIII — the swarm
  T('massDriver', 'star', 500000, S.driverIn, (g) => g.bought.elevator, 'Catapulte solaire', { items: { concrete: 50, steel: 50, wire: 50 }, big: true, reveal: true }),
  // IX — the Arches
  T('shipyard', 'rocket', 800000, S.rocketTile, (g) => g.civ.swarm >= 8, 'Chantier des Arches', { items: { steel: 60, concrete: 60, panel: 20 }, big: true, reveal: true }),
];

const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;
const fadeEl = () => document.getElementById('fade');

// A delivery drone shuttling items between two pads.
class Drone {
  constructor(game, { from, to, type, load = 4, home }) {
    this.game = game; this.from = from; this.to = to; this.type = type; this.load = load;
    this.x = home.x; this.z = home.z; this.y = 6; this.state = 'go'; this.n = 0; this.t = 0;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), mat(0xf2f4f6)));
    this.rotors = [];
    for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.64), mat(0x3a3f47)); arm.position.set(dx / 2, 0, dz / 2); arm.rotation.y = Math.atan2(dx, dz); g.add(arm);
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.06), mat(0x3a3f47)); r.position.set(dx, 0.12, dz); g.add(r); this.rotors.push(r);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x9fe0ff })); lamp.position.y = -0.12; g.add(lamp);
    this.group = g;
    game.scene.add(g);
  }

  pad(which) { const p = typeof which === 'function' ? which() : which; return p; }

  update(dt) {
    const g = this.game;
    for (const r of this.rotors) r.rotation.y += dt * 40;
    const target = this.state === 'go' || this.state === 'load' ? this.pad(this.from) : this.pad(this.to);
    if (!target) return;
    const dx = target.x - this.x, dz = target.z - this.z, d = Math.hypot(dx, dz);
    const cruise = 7.5;
    if (this.state === 'go' || this.state === 'back') {
      if (d > 0.3) { const sp = Math.min(d * 2, 9); this.x += dx / d * sp * dt; this.z += dz / d * sp * dt; this.y += (cruise - this.y) * Math.min(1, dt * 2); }
      else this.state = this.state === 'go' ? 'load' : 'unload';
    } else {
      this.y += (2.4 - this.y) * Math.min(1, dt * 3);
      this.t -= dt;
      if (this.state === 'load') {
        const room = this.pad(this.to);
        const roomOk = room && room.n + this.load <= room.pile.cap;
        if (this.t <= 0 && roomOk && target.n - (target.inflight || 0) > 0 && this.n < this.load) {
          this.t = 0.12; target.n--; this.n++;
          g.fly(this.type, g.pickPos(target), () => ({ x: this.x, y: this.y - 0.3, z: this.z }), { dur: 0.3, arc: 0.6 });
        }
        if (this.n >= this.load || (this.n > 0 && target.n - (target.inflight || 0) <= 0)) this.state = 'back';
      } else if (this.state === 'unload') {
        if (this.t <= 0 && this.n > 0 && target.n < target.pile.cap) {
          this.t = 0.12; this.n--;
          g.fly(this.type, { x: this.x, y: this.y - 0.3, z: this.z }, g.incoming(target), { dur: 0.35, arc: 0.5, onArrive: () => { target.inflight--; } });
        }
        if (this.n === 0) this.state = 'go';
      }
    }
    this.group.position.set(this.x, this.y + Math.sin(g.time * 3 + this.z) * 0.1, this.z);
    this.group.rotation.z = THREE.MathUtils.clamp(-dx * 0.05, -0.3, 0.3);
  }
}

const methods = {
  initAct6() {
    this.act6 = { aube: false, skipT: 0, launched: 0, typeI: false, typeII: false, typeIII: false, epilogue: false, arches: 0 };
    this.stats.panels = this.stats.panels || 0;
    this.drones = [];
    this.launches = [];
  },

  // ---------------------------------------------------------------------
  // VI — the railway and the network of cities
  // ---------------------------------------------------------------------
  buildRailway(fresh) {
    if (this.railway) return;
    const x = ACT2_POS.caravan.x;
    this.railway = makeRailway(x, 7.2, 92);
    this.scene.add(this.railway);
    const t = makeTrain(4);
    if (this.caravan) {
      this.caravan.group.children.forEach((c) => { c.visible = false; });
      this.caravan.group.add(t.group);
      t.group.position.set(0, 0, -1.0);
    }
    this.train = t;
    this.rewardMult = (this.rewardMult || 1) * 2;
    this.addPower('rail', 2e14);
    if (fresh) { this.popIn(this.railway); this.setChapter(19, true); this.story.beat('railway', 0.8); }
  },

  link(i, fresh) {
    this.addPower(`link${i}`, 1.6e15);
    this.rewardMult = (this.rewardMult || 1) * 1.25;
    this.updateResidents();
    if (fresh) { this.story.beat(`link${i}`, 0.6); this.fx.ring(S.linkTile.x, S.linkTile.z, { r0: 1, r1: 18, color: 0xffd36b, life: 1.4, opacity: 0.8 }); this.audio.fanfare(); }
  },

  // ---------------------------------------------------------------------
  // VI — fusion on the old Brazier
  // ---------------------------------------------------------------------
  reactorStage(n, fresh) {
    if (!this.reactor) {
      const r = makeReactor(); r.group.position.set(S.reactor.x, 0, S.reactor.z); this.scene.add(r.group);
      this.reactor = r;
    }
    const r = this.reactor;
    r.parts[n - 1].visible = true;
    if (n === 1) {
      if (this.brasierModel) (this.brasierModel.group || this.brasierModel).visible = false;
      this.world.circles.push({ x: S.reactor.x, z: S.reactor.z, r: 3.0 });
    }
    this.addPower('fusion', [0, 1e14, 6e14, 3.4e15][n]);
    if (fresh) {
      this.popIn(r.parts[n - 1]);
      this.fx.sparks(S.reactor.x, 2, S.reactor.z, { n: 30, color: [0.9, 0.6, 1], speed: 6 });
      this.story.beat(`fusion${n}`, 0.6);
      this.showcase(S.reactor.x, S.reactor.z, 1.8, 1.4);
      if (n === 1) this.setChapter(20, true);
      if (n === 3) { this.audio.boom(); this.shake = 0.8; this.fx.ring(S.reactor.x, S.reactor.z, { r0: 1, r1: 30, color: 0xc890ff, life: 2, opacity: 0.9 }); }
    }
  },

  updateReactor(dt) {
    const r = this.reactor;
    if (!r || !r.parts[1].visible) return;
    const lit = r.parts[2].visible;
    r.plasma.rotation.y += dt * (lit ? 3 : 0.5);
    const k = lit ? 1 + Math.sin(this.time * 6) * 0.15 : 0.25;
    r.plasmaM.color.setRGB(1.6 * k, 0.9 * k, 2.2 * k);
    r.halo.material.opacity = lit ? 0.5 + Math.sin(this.time * 4) * 0.15 : 0;
  },

  // Eras crossed: the big milestones of the ladder.
  checkMilestones(dt) {
    const s = this.act6;
    if (!this.civ.on) return;
    const k = this.kardashev();
    if (!s.typeI && k >= 1) {
      s.typeI = true;
      this.hud.banner('Kardashev', 'Type I', 'Toute l’énergie d’une planète. Sans brûler le ciel.');
      this.audio.fanfare(); this.zoomPulse = 3;
      this.story.beat('typeI', 4);
      this.save?.();
    }
    if (s.typeI && !s.aube) {
      s.skipT += dt;
      if (s.skipT > 40 && !s.fading && !this.cutscene && !this.player.deck && !this.player.riding) {
        s.fading = true;
        fadeEl()?.classList.add('on');
        setTimeout(() => this.becomeAube(true), 1600);
      }
    }
    if (!s.typeII && k >= 2) {
      s.typeII = true;
      this.hud.banner('Kardashev', 'Type II', 'Un soleil entier, enveloppé de miroirs.');
      this.audio.fanfare(); this.zoomPulse = 3;
      this.story.beat('typeII', 4);
      this.setChapter(25, true);
      this.refreshTiles();
      this.save?.();
    }
    if (!s.typeIII && k >= 3) {
      s.typeIII = true;
      this.hud.banner('Kardashev', 'Type III', 'Des milliers de soleils. Une seule histoire.');
      this.audio.fanfare();
      this.story.beat('typeIII', 3);
      setTimeout(() => this.startEpilogue(), 16000);
      this.save?.();
    }
  },

  // Twenty years later: Sasha's daughter Aube takes the axe.
  becomeAube(fresh) {
    const s = this.act6;
    s.aube = true;
    const p = this.player;
    const recolor = { 0x2c5f9e: 0xf2f4f6, 0xe2702e: 0xffb627 };
    p.model.root.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.color) return;
      const hex = o.material.color.getHex();
      if (recolor[hex] !== undefined) o.material = mat(recolor[hex]);
    });
    document.body.classList.add('aube');
    this.updateResidents();
    if (fresh) {
      setTimeout(() => fadeEl()?.classList.remove('on'), 800);
      s.fading = false;
      this.setChapter(21, true);
      this.story.beat('aube', 2.5);
      this.refreshTiles();
      this.save?.();
    }
  },

  // ---------------------------------------------------------------------
  // VII — the cosmodrome, rockets and the space elevator
  // ---------------------------------------------------------------------
  buildCosmodrome(fresh) {
    if (this.launchPad) return;
    this.world.extraZones = [...(this.world.extraZones || []), COSMO];
    this.forest.trees.forEach((t) => { if (t.alive && t.x > COSMO.x0 - 2.5 && t.x < COSMO.x1 + 2.5 && t.z > COSMO.z0 - 2.5 && t.z < COSMO.z1 + 1) { if (fresh) this.forest.poof(t, Math.random() * 0.6, () => {}); else { t.alive = false; t.k = 0; this.forest.write(t); } } });
    const lp = makeLaunchPad(); lp.group.position.set(S.pad.x, 0, S.pad.z); this.scene.add(lp.group);
    this.launchPad = lp;
    this.world.circles.push({ x: S.pad.x, z: S.pad.z, r: 3.2 }, { x: S.pad.x - 2.8, z: S.pad.z, r: 0.9 });
    this.addPower('cosmo', 5e15);
    if (fresh) { this.popIn(lp.group, 0.8); this.setChapter(22, true); this.story.beat('cosmodrome', 1.0); this.showcase(S.pad.x, S.pad.z, 2.0, 1.7); }
  },

  buildPanelWorks(fresh) {
    if (this.panelWorks) return;
    const w = makePanelWorks(); w.group.position.set(S.works.x, 0, S.works.z); this.scene.add(w.group);
    this.panelWorks = w;
    for (const dx of [-1, 1]) this.world.circles.push({ x: S.works.x + dx, z: S.works.z - 0.3, r: 1.25 });
    this.panelFactory = new Factory(this, {
      id: 'panel', at: S.works, time: 1.6,
      inputs: [{ type: 'wire', at: S.wireIn, cap: 30 }, { type: 'steel', at: S.steelIn, cap: 30 }],
      output: { type: 'panel', at: S.panelOut, cap: 60 },
      mouth: { x: -0.6, y: 1.0, z: 0.9 }, exit: { x: 1.2, y: 1.0, z: 0.9 }, power: 2e15,
      onMake: () => { this.stats.panels++; if (this.stats.panels === 1) this.story.beat('firstPanel', 0.3); },
    });
    // drones bring wire from the east quarter and steel from the forge
    this.drones.push(new Drone(this, { from: () => this.pads.wire_out, to: () => this.pads.panel_wire, type: 'wire', home: ACT4_POS.wireOut }));
    this.drones.push(new Drone(this, { from: () => this.pads.steelPad, to: () => this.pads.panel_steel, type: 'steel', home: this.pads.steelPad }));
    if (fresh) { this.popIn(w.group); this.panelFactory.meshes.forEach((m) => this.popIn(m, 0.4)); this.drones.forEach((d) => this.popIn(d.group, 0.6)); this.story.beat('drones', 0.6); }
  },

  updatePanelWorks(dt) {
    const w = this.panelWorks;
    if (!w) return;
    const busy = this.panelFactory.busy > 0;
    w.arm.rotation.y += dt * (busy ? 4 : 0.3);
    w.spark.material.opacity = busy && Math.sin(this.time * 30) > 0 ? 0.9 : 0;
    for (const d of this.drones) d.update(dt);
  },

  // A rocket on the pad, then the launch.
  launch(kind, fresh, onDone) {
    const r = makeRocket(kind);
    r.group.position.set(S.pad.x, 0.5, S.pad.z);
    this.scene.add(r.group);
    const L = { r, t: 0, kind, onDone };
    this.launches.push(L);
    if (fresh) { this.popIn(r.group); this.story.beat(kind === 'arche' ? `arche${Math.min(5, this.act6.arches + 1)}` : 'countdown', 0.2); }
    return L;
  },

  updateLaunches(dt) {
    for (const L of this.launches) {
      L.t += dt;
      const r = L.r;
      const t = L.t - 4.5;
      if (L.t > 2 && L.t < 4.5) this.fx.puff(S.pad.x + (Math.random() - 0.5) * 3, 0.6, S.pad.z + (Math.random() - 0.5) * 3, { n: 1, size: [1.5, 3], speed: 2, alpha: 0.5 });
      if (t > 0) {
        r.flame.visible = true;
        r.flame.scale.setScalar(1 + Math.sin(this.time * 40) * 0.12);
        const y = 0.5 + t * t * 2.2;
        r.group.position.y = y;
        if (!L.lift) { L.lift = true; this.audio.boom(); this.shake = 0.9; this.skyView = true; }
        this.skyLook = { x: S.pad.x, y: Math.min(y + 4, 140), z: S.pad.z };
        if (Math.random() < dt * 30 && y < 120) this.fx.puff(S.pad.x + (Math.random() - 0.5) * 1.2, y - 1.5, S.pad.z + (Math.random() - 0.5) * 1.2, { n: 2, size: [1.5, 4], speed: 2, up: -1, g: 0, life: 2.2, alpha: 0.7 });
        if (this.region(this.player) !== 'out' || near(this.player, S.pad, 40)) this.shake = Math.max(this.shake, 0.25 * Math.max(0, 1 - t / 6));
      }
      if (t > 9 && !L.done) {
        L.done = true;
        this.scene.remove(r.group);
        this.skyView = false; this.skyLook = null;
        L.onDone && L.onDone();
      }
    }
    this.launches = this.launches.filter((L) => !L.done);
  },

  rocketDone() {
    this.act6.launched++;
    this.civ.orbital = true;
    this.addPower('orbit', 5e16);
    this.story.beat('orbit', 0.5);
    this.refreshTiles();
    this.save?.();
  },

  buildElevator(fresh) {
    if (this.tether) return;
    const t = makeTether(330);
    t.group.position.set(ACT4_POS.dawn.x, DECK_Y + 8, ACT4_POS.dawn.z);
    this.scene.add(t.group);
    this.tether = t;
    this.civ.orbital = true;
    this.addPower('elevator', 1e18);
    if (fresh) { this.popIn(t.group); this.setChapter(23, true); this.story.beat('elevator', 0.6); this.skyView = true; setTimeout(() => { this.skyView = false; }, 6000); }
  },

  updateTether(dt) {
    const t = this.tether;
    if (!t) return;
    for (const c of t.climbers) { c.t = (c.t + dt * 0.02) % 1; c.g.position.y = c.t * t.h; }
  },

  // ---------------------------------------------------------------------
  // VIII — the mass driver and the Dyson swarm
  // ---------------------------------------------------------------------
  buildMassDriver(fresh) {
    if (this.driver) return;
    const d = makeMassDriver(16); d.group.position.set(S.driver.x, 0, S.driver.z); this.scene.add(d.group);
    this.driver = d;
    this.world.circles.push({ x: S.driver.x, z: S.driver.z + 0.6, r: 1.4 });
    this.driverFactory = new Factory(this, {
      id: 'driver', at: S.driver, time: 2.5,
      inputs: [{ type: 'panel', at: S.driverIn, cap: 40, need: 8 }],
      output: null,
      mouth: { x: 0, y: 1.2, z: 0.6 }, power: 0,
      onMake: () => this.volley(),
    });
    this.drones.push(new Drone(this, { from: () => this.pads.panel_out, to: () => this.archesOpen() && this.civ.swarm >= 8 ? this.pads.arche_panel : this.pads.driver_panel, type: 'panel', home: S.panelOut }));
    if (fresh) { this.popIn(d.group); this.driverFactory.meshes.forEach((m) => this.popIn(m, 0.4)); this.setChapter(24, true); this.story.beat('massDriver', 0.6); this.showcase(S.driver.x, S.driver.z - 4, 2, 1.8); }
  },

  volley() {
    const d = this.driver;
    const m = d.muzzle.clone().add(d.group.position);
    this.civ.swarm = Math.min(10, Math.round((this.civ.swarm + 0.5) * 10) / 10);
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.fly('panel', { x: S.driver.x, y: 1.2, z: S.driver.z }, () => m, { dur: 0.35, arc: 0.2 });
        setTimeout(() => this.fly('panel', m, () => ({ x: m.x - 40, y: m.y + 160, z: m.z - 120 }), { dur: 1.6, arc: 0 }), 350);
        d.rings.forEach((r, k) => setTimeout(() => r.material.color.setRGB(1.5, 2.5, 2.4), k * 40));
      }, i * 120);
    }
    this.audio.whoosh();
    this.fx.sparks(m.x, m.y, m.z, { n: 20, color: [0.5, 1, 0.9], speed: 6 });
    if (this.civ.swarm === 0.5) this.story.beat('firstVolley', 0.5);
    if (this.civ.swarm === 4) this.story.beat('halfSwarm', 0.5);
    this.save?.();
  },

  updateDriver(dt) {
    const d = this.driver;
    if (!d) return;
    for (const r of d.rings) r.material.color.lerp(new THREE.Color(0.3, 1.6, 1.4), Math.min(1, dt * 3));
  },

  // ---------------------------------------------------------------------
  // IX — the Arches
  // ---------------------------------------------------------------------
  archesOpen() { return !!this.archeFactory; },

  buildShipyard(fresh) {
    if (this.archeFactory) return;
    this.archeFactory = new Factory(this, {
      id: 'arche', at: S.arche, time: 6,
      inputs: [{ type: 'panel', at: S.archePanel, cap: 30, need: 12 }, { type: 'can', at: S.archeCan, cap: 40, need: 20 }, { type: 'steel', at: S.archeSteel, cap: 40, need: 16 }],
      output: null, mouth: { x: 0, y: 3, z: 0 }, power: 0,
      onMake: () => this.launch('arche', true, () => this.archeDone()),
    });
    this.drones.push(new Drone(this, { from: () => this.pads.canPad, to: () => this.pads.arche_can, type: 'can', home: this.pads.canPad }));
    this.drones.push(new Drone(this, { from: () => this.pads.steelPad, to: () => this.pads.arche_steel, type: 'steel', home: this.pads.steelPad }));
    if (fresh) { this.archeFactory.meshes.forEach((m) => this.popIn(m, 0.3)); this.story.beat('shipyard', 0.6); }
  },

  archeDone() {
    const s = this.act6;
    s.arches++;
    this.civ.colonies = Math.min(10, this.civ.colonies + 2);
    this.story.beat(`colony${Math.min(5, s.arches)}`, 1.0);
    this.save?.();
  },

  startEpilogue() {
    const s = this.act6;
    if (s.epilogue) return;
    s.epilogue = true;
    this.setChapter(26, true);
    this.story.beat('epilogue', 3);
    setTimeout(() => {
      const $ = (id) => document.getElementById(id);
      $('credits-eyebrow').textContent = 'FIN · TYPE III · UNE NOUVELLE AUBE';
      $('credits-story').textContent = 'Un feu, un chaudron, une palissade. Puis la vapeur, le fer, la foudre, les tours, l’atome, les étoiles. Fort-Aube a gravi toute l’échelle sans jamais rallumer l’incendie qui avait gelé le monde. Et quelque part, à quarante années-lumière, sur une planète blanche, une femme se réveille sous la neige avec une hache…';
      $('credits-hint').textContent = 'Merci d’avoir joué. « Continuer » te laisse dans ta galaxie ; le menu te permet de tout recommencer, sur un nouveau monde gelé.';
      $('credits').classList.add('on');
      try { localStorage.setItem('ws-loop', String((Number(localStorage.getItem('ws-loop')) || 0) + 1)); } catch { /* private mode */ }
    }, 22000);
  },

  // ---------------------------------------------------------------------
  // Hooks called by Game
  // ---------------------------------------------------------------------
  act6Apply(id, fresh) {
    switch (id) {
      case 'railway': this.buildRailway(fresh); return true;
      case 'link1': case 'link2': case 'link3': case 'link4': this.link(Number(id[4]), fresh); return true;
      case 'fusion1': case 'fusion2': case 'fusion3': this.reactorStage(Number(id[6]), fresh); return true;
      case 'cosmodrome': this.buildCosmodrome(fresh); return true;
      case 'panels': this.buildPanelWorks(fresh); return true;
      case 'rocket1': if (fresh) this.launch('rocket', true, () => this.rocketDone()); else { this.civ.orbital = true; this.addPower('orbit', 5e16); } return true;
      case 'elevator': this.buildElevator(fresh); return true;
      case 'massDriver': this.buildMassDriver(fresh); return true;
      case 'shipyard': this.buildShipyard(fresh); return true;
      default: return false;
    }
  },

  act6Objective(p) {
    const s = this.act6;
    if (this.launches.length) return { at: null, text: this.launches[0].kind === 'arche' ? 'Une Arche s’élève vers les étoiles…' : 'Décollage !', icon: 'rocket' };
    if (p.carry.panel > 0) {
      const tile = this.itemTiles().find((t) => this.tileItemsLeft(t).some(([k, n]) => k === 'panel' && n > 0));
      if (tile) return { at: tile.def.at, text: `Apporte les panneaux : ${tile.def.label}`, icon: 'panel' };
      if (this.pads.driver_panel && this.pads.driver_panel.n < 38 && !(this.archeFactory && this.civ.swarm >= 8)) return { at: S.driverIn, text: 'Charge la catapulte solaire', icon: 'star' };
      if (this.pads.arche_panel && this.pads.arche_panel.n < 28) return { at: S.archePanel, text: 'Charge l’Arche en panneaux', icon: 'panel' };
    }
    if (this.archeFactory && p.carry.can > 0 && this.pads.arche_can.n < 38) return { at: S.archeCan, text: 'Charge les vivres de l’Arche', icon: 'can' };
    if (s.typeI && !s.aube) return { at: null, text: 'Fort-Aube est devenue une civilisation planétaire…', icon: 'globe' };
    return null;
  },

  act6LateObjective(p) {
    if (!this.panelFactory || this.load_total(p) >= p.cap * 0.85) return null;
    const need = new Set();
    for (const t of this.itemTiles()) for (const [k, n] of this.tileItemsLeft(t)) if (n > 0) need.add(k);
    if (this.driverFactory && this.civ.swarm < 8) need.add('panel');
    if (this.archeFactory) need.add('panel');
    if (!this.couriers() && need.has('panel') && this.pads.panel_out.n >= 1) return { at: S.panelOut, text: 'Ramasse les panneaux solaires', icon: 'panel' };
    return null;
  },

  updateAct6(dt) {
    this.checkMilestones(dt);
    this.updateReactor(dt);
    this.updatePanelWorks(dt);
    this.updateLaunches(dt);
    this.updateTether(dt);
    this.updateDriver(dt);
  },

  act6Serialize() {
    const s = this.act6;
    return { aube: s.aube, launched: s.launched, typeI: s.typeI, typeII: s.typeII, typeIII: s.typeIII, epilogue: s.epilogue, arches: s.arches, skipT: s.skipT };
  },

  act6Load(d) {
    if (!d) return;
    const s = this.act6;
    Object.assign(s, { launched: d.launched || 0, typeI: !!d.typeI, typeII: !!d.typeII, typeIII: !!d.typeIII, epilogue: !!d.epilogue, arches: d.arches || 0, skipT: d.skipT || 0 });
    if (d.aube) this.becomeAube(false);
    if (s.launched > 0) { this.civ.orbital = true; this.addPower('orbit', 5e16); }
  },
};

export function installAct6(Game) {
  Object.assign(Game.prototype, methods);
}
