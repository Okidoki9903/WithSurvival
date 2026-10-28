// Acts IV and V — the Age of Lightning and the Age of Towers.
// Ivan's radio hears other survivors; the east quarter opens on a copper
// ridge; the wire mill, the power plant, the grid and the radio mast bring
// electricity and night to Fort-Aube. Then the fort runs out of ground and
// grows upwards: a quarry and a cement works, apartment towers rising floor
// by floor, vertical farms, wind turbines and the Tower of Dawn, raised on
// the Beacon's foundations, with a lift to a sky deck you can walk on.
// Installed as methods on Game.
import * as THREE from 'three';
import { Factory } from './civ.js';
import { makeDrill } from './models3.js';
import { makeCopperNode, makeStoneNode, makeWireMill, makePowerPlant, makePylon, makeWire, makeRadioMast, makeStreetLamp, makeTowerBase, addTowerFloor, makeSkyscraper, DECK_Y, makeVerticalFarm, makeCementWorks, makeWindTurbine, setNightWindows } from './models4.js';
import { backOut } from './world.js';

const P = (x, z) => ({ x, z });
export const ACT4_POS = {
  eastTile: P(16.0, -1.4),
  mill: P(22.5, -4.7), copperIn: P(24.8, -1.4), wireOut: P(20.2, -1.4),
  cement: P(39.6, -21.8), stoneIn: P(37.6, -17.6), concreteOut: P(34.4, -17.6),
  plant: P(37.2, -1.6), plantTile: P(37.2, 1.4),
  drill: P(41.8, -4.4), drillPad: P(41.0, -1.2),
  radio: P(24.8, -21.4),
  gridTile: P(23.0, 1.8), electricTile: P(27.0, 1.8), floorsTile: P(35.6, -10.0),
  vfarm1: P(34.5, 11.0), vfarm2: P(34.5, 17.6),
  dawn: P(11.8, -13.2), dawnTile: P(11.8, -9.4), lift: P(11.8, -9.9),
  turbinesTile: P(-6.0, -9.4),
  towers1Tile: P(30.6, -9.0), towers2Tile: P(-22.0, -9.4),
};
const E = ACT4_POS;
const COPPER = [[41.9, 2.4], [41.9, 4.9], [39.3, 5.0]];
const STONE = [[41.6, -16.2], [41.6, -13.4], [41.6, -10.6]];
const TURBINES = [[-9.5, -12.0], [-3.5, -16.5], [3.0, -12.2], [19.0, -20.0], [-10.0, -20.5]];
const LAMPS = [[18.4, -2.6], [22.6, 3.6], [30.0, 4.6], [34.6, -1.0], [-1.0, -4.8], [7.0, -4.9], [-9.0, -4.8], [-20.0, -4.9], [-28.0, 0.0], [5.8, 8.0], [5.8, 16.0], [12.4, 9.5], [-3.6, 7.8]];
const PYLONS = [[37.2, -7.6], [27.0, -7.6], [17.0, -7.6], [7.0, -7.6], [-3.0, -7.6], [-13.0, -7.6], [-23.0, -7.6], [-31.0, -7.6]];
const DAY = 150;

const T = (id, icon, cost, at, req, label, extra = {}) => ({ id, icon, cost, at, req, label, ...extra });
const A4 = (g) => g.act4 || {};
export const ACT4_TILES = [
  // Act IV — lightning
  T('eastGate', 'expand', 10000, E.eastTile, (g) => A4(g).phase && A4(g).phase !== 'none', 'Quartier de la Foudre', { big: true, beat: 'eastTile', reveal: true }),
  T('oskar', 'person', 4000, P(37.2, 4.2), (g) => g.stage >= 6 && (g.stats.copper || 0) >= 6, 'Recruter Oskar'),
  T('plant1', 'fire', 6000, E.plantTile, (g) => g.stage >= 6 && (g.stats.wire || 0) >= 4, 'Salle des turbines', { items: { steel: 20, plank: 20 }, beat: 'plantTile', reveal: true }),
  T('plant2', 'gear', 8000, E.plantTile, (g) => g.bought.plant1, 'Alternateurs', { items: { wire: 20, steel: 10 } }),
  T('plant3', 'bolt', 10000, E.plantTile, (g) => g.bought.plant2, 'Transformateurs', { items: { wire: 30 } }),
  T('copperDrill', 'gear', 7000, E.drill, (g) => g.bought.plant2, 'Foreuse électrique', { items: { steel: 15, wire: 10 } }),
  T('grid', 'bolt', 9000, E.gridTile, (g) => g.bought.plant3, 'Réseau électrique', { items: { wire: 30, steel: 10 }, reveal: true }),
  T('radio', 'beacon', 8000, E.radio, (g) => g.bought.plant3 && g.bought.distNordEst, 'Antenne radio', { items: { steel: 15, wire: 20 } }),
  T('electric', 'gear', 12000, E.electricTile, (g) => g.bought.grid, 'Machines électriques', { items: { wire: 25, steel: 10 } }),
  // Act V — towers
  T('quarry', 'pickaxe', 20000, E.cement, (g) => A4(g).towers && g.bought.distNordEst, 'Carrière et cimenterie', { items: { steel: 20, wire: 10 }, beat: 'quarryTile', reveal: true }),
  T('stoneDrill', 'gear', 30000, P(39.0, -9.2), (g) => g.bought.quarry, 'Concasseur électrique', { items: { steel: 20, wire: 10 } }),
  T('kaja', 'person', 9000, P(36.2, -13.6), (g) => g.bought.quarry && (g.stats.concrete || 0) >= 4, 'Recruter Kaja'),
  T('towers1', 'tower', 25000, E.towers1Tile, (g) => g.bought.quarry && (g.stats.concrete || 0) >= 6, 'Immeubles de l’Est', { items: { concrete: 30, steel: 15 }, reveal: true }),
  T('towers2', 'tower', 25000, E.towers2Tile, (g) => g.bought.towers1, 'Immeubles de l’Ouest', { items: { concrete: 30, steel: 15 }, reveal: true }),
  T('vfarm1', 'leaf', 20000, E.vfarm1, (g) => g.bought.towers1 && g.bought.distLac, 'Ferme verticale', { items: { concrete: 20, wire: 10, plank: 10 } }),
  T('floors1', 'tower', 30000, E.floorsTile, (g) => g.bought.towers2, 'Surélever les tours', { items: { concrete: 40, wire: 10 } }),
  T('vfarm2', 'leaf', 30000, E.vfarm2, (g) => g.bought.floors1 && g.bought.vfarm1, 'Seconde ferme verticale', { items: { concrete: 25, wire: 15 } }),
  T('turbines', 'wind', 30000, E.turbinesTile, (g) => g.bought.towers1, 'Éoliennes', { items: { steel: 25, wire: 20 } }),
  T('floors2', 'tower', 45000, E.floorsTile, (g) => g.bought.floors1 && g.bought.vfarm1, 'Surélever encore', { items: { concrete: 50, steel: 20 } }),
  T('dawn1', 'tower', 40000, E.dawnTile, (g) => g.bought.towers2, 'Tour de l’Aube · fondations', { items: { concrete: 40, steel: 20 }, beat: 'dawnTile', reveal: true }),
  T('dawn2', 'tower', 50000, E.dawnTile, (g) => g.bought.dawn1, 'Tour de l’Aube · charpente', { items: { steel: 50 } }),
  T('dawn3', 'tower', 60000, E.dawnTile, (g) => g.bought.dawn2, 'Tour de l’Aube · verrière', { items: { concrete: 40, wire: 30 } }),
  T('dawn4', 'sun', 80000, E.dawnTile, (g) => g.bought.dawn3, 'Tour de l’Aube · couronne', { items: { steel: 30, wire: 30, concrete: 30 }, big: true }),
];

const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const methods = {
  initAct4() {
    this.act4 = { phase: 'none', t: 0, towers: false, deckSeen: false };
    this.stats.copper = this.stats.copper || 0;
    this.stats.wire = this.stats.wire || 0;
    this.stats.concrete = this.stats.concrete || 0;
    this.night = 0; this.dayT = DAY * 0.3; this.nightOn = false;
    this.lamps = [];
    this.towerBlocks = [];
  },

  // ---------------------------------------------------------------------
  // The story clock of Act IV and V
  // ---------------------------------------------------------------------
  act4Story(dt) {
    const s = this.act4;
    if (s.phase === 'none') {
      if (this.act3.phase !== 'done') return;
      s.t += dt;
      if (s.t > (this.creditsSeen ? 25 : 70)) this.startAct4(true);
      return;
    }
    // the fort is full: time to build upwards
    if (!s.towers && this.bought.plant3 && this.bought.grid && this.bought.radio && this.bought.electric) {
      s.towers = true;
      this.setChapter(17, true);
      this.story.beat('noRoom', 2);
      this.refreshTiles();
      this.save?.();
    }
  },

  startAct4(fresh) {
    const s = this.act4;
    s.phase = 'radio';
    this.civ.on = true;
    document.body.classList.add('kardashev');
    // Lina organises the town: every family now pays a small rent
    this.updateResidents();
    if (fresh) {
      this.story.beat('radio1');
      setTimeout(() => { this.story.beat('kardashev'); this.setChapter(15, true); this.refreshTiles(); }, 12000);
      this.save?.();
    }
  },

  // ---------------------------------------------------------------------
  // East quarter: copper ridge and wire mill
  // ---------------------------------------------------------------------
  openEast(fresh) {
    if (this.wireMill) return;
    this.act4.phase = 'east';
    this.setStage(6, fresh);
    const g = new THREE.Group();
    this.scene.add(g);
    this.eastGroup = g;
    this.oreNodes = this.oreNodes || [];
    COPPER.forEach(([x, z], i) => {
      const m = makeCopperNode(i + 3); m.position.set(x, 0, z); g.add(m);
      const c = { x, z, r: 0.95 };
      this.world.circles.push(c);
      this.oreNodes.push({ x, z, g: m, hp: 4, alive: true, t: 0, circle: c, type: 'copper' });
    });
    const mill = makeWireMill(); mill.group.position.set(E.mill.x, 0, E.mill.z); this.scene.add(mill.group);
    this.wireMill = mill;
    for (const dx of [-0.9, 0.9]) this.world.circles.push({ x: E.mill.x + dx, z: E.mill.z - 0.2, r: 1.2, camp: true });
    this.wireFactory = new Factory(this, {
      id: 'wire', at: E.mill, time: 1.1,
      inputs: [{ type: 'copper', at: E.copperIn, cap: 45 }],
      output: { type: 'wire', at: E.wireOut, cap: 60 },
      mouth: { x: 1.2, y: 1.0, z: 0.75 }, exit: { x: -1.3, y: 1.0, z: 0.75 }, power: 2e9,
      onMake: () => { this.stats.wire++; if (this.stats.wire === 1) this.story.beat('firstWire', 0.3); this.audio.drop(5); },
    });
    this.addNpc(28, 1, fresh, { x0: 18, x1: 34, z0: -2, z1: 4 });
    this.addNpc(22, 3, fresh, { x0: 18, x1: 34, z0: -2, z1: 4 });
    if (fresh) {
      this.popIn(g, 0.6); this.popIn(mill.group, 0.9); this.wireFactory.meshes.forEach((m) => this.popIn(m, 1.1));
      this.setChapter(16, true);
      this.story.beat('east', 2.0);
      this.showcase(30, 1, 2.6, 1.45);
    }
  },

  updateWireMill(dt) {
    const m = this.wireMill;
    if (!m) return;
    const busy = this.wireFactory.busy > 0;
    m.spools.forEach((s, i) => { s.rotation.x += dt * (busy ? 9 + i : 0.3); });
  },

  // ---------------------------------------------------------------------
  // Power plant: turbines, alternators, transformers
  // ---------------------------------------------------------------------
  plantStage(n, fresh) {
    if (!this.plant) {
      const pl = makePowerPlant(); pl.group.position.set(E.plant.x, 0, E.plant.z); this.scene.add(pl.group);
      this.plant = pl;
    }
    const pl = this.plant;
    pl.parts[n - 1].visible = true;
    const X = E.plant.x, Z = E.plant.z;
    if (n === 1) for (const dx of [-1.8, 0, 1.8]) this.world.circles.push({ x: X + dx, z: Z - 2.4, r: 1.6, camp: true });
    if (n === 2) for (const dx of [-1.6, 0, 1.6]) this.world.circles.push({ x: X + dx, z: Z + 0.4, r: 0.72, camp: true });
    if (n === 3) this.world.circles.push({ x: X - 2, z: Z + 2.2, r: 0.62, camp: true }, { x: X + 2, z: Z + 2.2, r: 0.62, camp: true }, { x: X, z: Z + 3.6, r: 0.5, camp: true });
    this.addPower('plant', [0, 2e10, 9e10, 4.5e11][n]);
    if (fresh) {
      this.popIn(pl.parts[n - 1]);
      this.fx.sparks(X, 2, Z, { n: 30, color: [0.6, 0.9, 1], speed: 6 });
      this.story.beat(`plant${n}`, 0.6);
      this.showcase(X, Z, 1.4, 1.2);
      if (n === 3) { this.audio.fanfare(); this.shake = 0.4; }
    }
  },

  updatePlant(dt) {
    const pl = this.plant;
    if (!pl) return;
    if (pl.parts[0].visible && Math.random() < dt * 4) { const v = pl.stack.clone().applyMatrix4(pl.group.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
    if (pl.parts[1].visible) pl.coils.forEach((c, i) => { c.material.color.setRGB(0.5, 1.2 + Math.sin(this.time * 7 + i) * 0.3, 1.6); c.rotation.z += dt * 20; });
  },

  buildCopperDrill(fresh) {
    const d = makeDrill(); d.group.position.set(E.drill.x, 0, E.drill.z); d.group.rotation.y = Math.PI; this.scene.add(d.group);
    this.copperDrill = { ...d, t: 1 };
    this.world.circles.push({ x: E.drill.x, z: E.drill.z, r: 1.6, camp: true });
    this.pads.drillPad = { ...E.drillPad, n: 0, pile: { cols: 3, rows: 2, sp: 0.55, h: 0.2, cap: 18 }, type: 'copper' };
    this.extraPads.push(this.pads.drillPad);
    const pin = this.pads.wire_copper;
    const y = 3.8;
    this.copperLine = this.addLine({
      kind: 'cable', speed: 2.8, spacing: 0.9, color: 0x2b2b30,
      path: [{ x: E.drillPad.x, y, z: E.drillPad.z }, { x: 33.0, y, z: 0.4 }, { x: 28.0, y, z: 0.0 }, { x: E.copperIn.x, y, z: E.copperIn.z + 0.4 }],
      posts: null,
      sources: [{ pad: this.pads.drillPad, s: 0.05 }],
      sink: { accept: () => pin.n < pin.pile.cap - 1, deliver: (type, from) => { this.fly(type, from, this.incoming(pin), { dur: 0.35, arc: 0.4, onArrive: () => { pin.inflight--; } }); } },
    }, fresh);
    this.addPower('drill', 3e10);
    if (fresh) { this.popIn(d.group); this.showcase(E.drill.x - 2, E.drill.z, 1.6); this.story.beat('copperDrill'); }
  },

  updateCopperDrill(dt) {
    const d = this.copperDrill;
    if (!d) return;
    const out = this.pads.drillPad;
    const working = out.n < out.pile.cap;
    d.bit.rotation.x += dt * (working ? 22 : 2);
    d.t -= dt;
    if (working && d.t <= 0) {
      d.t = 1.8;
      const at = { x: E.drill.x + 1.6, y: 0.9, z: E.drill.z + 0.4 };
      this.fx.sparks(at.x, at.y, at.z, { n: 6, color: [0.5, 1, 0.9], speed: 3 });
      this.stats.copper++;
      this.fly('copper', at, this.incoming(out), { dur: 0.7, arc: 2.0, onArrive: () => { out.inflight--; } });
    }
  },

  // ---------------------------------------------------------------------
  // Grid: pylons, high-voltage lines, street lamps, the night
  // ---------------------------------------------------------------------
  buildGrid(fresh) {
    const g = new THREE.Group();
    const tops = [];
    for (const [x, z] of PYLONS) { const p = makePylon(6.5); p.position.set(x, 0, z); p.rotation.y = Math.PI / 2; g.add(p); tops.push(new THREE.Vector3(x, p.userData.top, z)); }
    // three conductors per span, hanging from the ends of the cross-arms
    for (let i = 0; i + 1 < tops.length; i++) for (const off of [-1.1, 0, 1.1]) {
      const a = tops[i].clone(), b = tops[i + 1].clone(); a.z += off; b.z += off;
      g.add(makeWire(a, b, 0.9));
    }
    this.scene.add(g);
    this.gridGroup = g;
    for (const [x, z] of LAMPS) {
      const l = makeStreetLamp(); l.group.position.set(x, 0, z); l.group.rotation.y = Math.atan2(-x, -z) + Math.PI / 2; this.scene.add(l.group);
      this.lamps.push(l);
      if (fresh) this.popIn(l.group, 0.3 + Math.random() * 0.8);
    }
    this.nightOn = true;
    this.litDistricts?.(fresh);
    this.addPower('grid', 1e11);
    this.updateResidents();
    if (fresh) {
      this.popIn(g, 0.2);
      this.story.beat('grid', 0.6);
      this.dayT = DAY * 0.62;
    }
  },

  updateNight(dt) {
    if (!this.nightOn) { this.night = 0; return; }
    this.dayT = (this.dayT + dt) % DAY;
    const f = this.dayT / DAY;
    // a long day, dusk, a short night, dawn
    const n = smooth(0.6, 0.7, f) * (1 - smooth(0.9, 1.0, f));
    this.night = n * 0.72;
    setNightWindows(this.night / 0.72);
    for (const l of this.lamps) l.halo.material.opacity = 0.1 + this.night * 0.9;
  },

  buildRadio(fresh) {
    const r = makeRadioMast(16); r.group.position.set(E.radio.x, 0, E.radio.z); this.scene.add(r.group);
    this.radioMast = r;
    this.world.circles.push({ x: E.radio.x, z: E.radio.z, r: 1.25, camp: true });
    this.addPower('radio', 2e10);
    if (fresh) { this.popIn(r.group); this.showcase(E.radio.x, E.radio.z, 1.6, 1.4); this.story.beat('radioMast', 0.8); }
  },

  electrify(fresh) {
    this.cookTime = (this.cookTime || 0.4) * 0.7;
    this.sawTime = (this.sawTime || 0.5) * 0.7;
    this.smeltTime = (this.smeltTime || 1) * 0.7;
    if (this.wireFactory) this.wireFactory.mult += 0.5;
    this.priceMult *= 1.2;
    this.addPower('electric', 2.5e11);
    if (fresh) { this.story.beat('electric', 0.5); this.fx.ring(this.player.x, this.player.z, { r0: 1, r1: 14, color: 0x9fe0ff, life: 1.2, opacity: 0.8 }); }
  },

  // ---------------------------------------------------------------------
  // Act V: quarry, cement, towers
  // ---------------------------------------------------------------------
  buildQuarry(fresh) {
    if (this.cementWorks) return;
    const g = new THREE.Group(); this.scene.add(g);
    STONE.forEach(([x, z], i) => {
      const m = makeStoneNode(i + 2); m.position.set(x, 0, z); g.add(m);
      const c = { x, z, r: 0.9 };
      this.world.circles.push(c);
      this.oreNodes.push({ x, z, g: m, hp: 3, alive: true, t: 0, circle: c, type: 'stone' });
    });
    const cw = makeCementWorks(); cw.group.position.set(E.cement.x, 0, E.cement.z); this.scene.add(cw.group);
    this.cementWorks = cw;
    for (const dx of [-1.1, 1.1]) this.world.circles.push({ x: E.cement.x + dx, z: E.cement.z - 0.1, r: 1.3, camp: true });
    this.world.circles.push({ x: E.cement.x + 2.7, z: E.cement.z - 1.5, r: 1.0, camp: true });
    this.cementFactory = new Factory(this, {
      id: 'cement', at: E.cement, time: 1.4,
      inputs: [{ type: 'stone', at: E.stoneIn, cap: 45 }],
      output: { type: 'concrete', at: E.concreteOut, cap: 60 },
      mouth: { x: 1.6, y: 1.3, z: 0.3 }, exit: { x: -1.6, y: 1.0, z: 0.3 }, power: 1e12,
      onMake: () => { this.stats.concrete++; if (this.stats.concrete === 1) this.story.beat('firstConcrete', 0.3); },
    });
    if (fresh) { this.popIn(g, 0.3); this.popIn(cw.group, 0.6); this.cementFactory.meshes.forEach((m) => this.popIn(m, 0.9)); this.story.beat('quarry', 0.6); }
  },

  // The electric crusher bites the ridge and throws stone straight to the cement works.
  buildStoneDrill(fresh) {
    const d = makeDrill(); d.group.position.set(41.2, 0, -7.9); d.group.rotation.y = Math.PI; this.scene.add(d.group);
    this.stoneDrill = { ...d, t: 1 };
    this.world.circles.push({ x: 41.4, z: -7.9, r: 1.8, camp: true });
    this.addPower('stoneDrill', 2e12);
    if (fresh) { this.popIn(d.group); this.showcase(40, -10, 1.4); this.story.beat('stoneDrill', 0.4); }
  },

  updateStoneDrill(dt) {
    const d = this.stoneDrill, pad = this.pads.cement_stone;
    if (!d || !pad) return;
    const working = pad.n < pad.pile.cap - 1;
    d.bit.rotation.x += dt * (working ? 20 : 2);
    d.t -= dt;
    if (working && d.t <= 0) {
      d.t = 1.6;
      const at = { x: 42.6, y: 0.9, z: -7.5 };
      this.fx.puff(at.x, at.y, at.z, { n: 4, size: [0.5, 1.2], speed: 2.5, color: [0.75, 0.73, 0.7], alpha: 0.7 });
      this.fly('stone', at, this.incoming(pad), { dur: 0.9, arc: 3.2, onArrive: () => { pad.inflight--; } });
    }
  },

  updateCement(dt) {
    this.updateStoneDrill(dt);
    const c = this.cementWorks;
    if (!c) return;
    const busy = this.cementFactory.busy > 0;
    c.kiln.rotation.x += dt * (busy ? 2 : 0.2);
    if (Math.random() < dt * (busy ? 4 : 0.8)) { const v = c.chimney.clone().applyMatrix4(c.group.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
  },

  // Cabins become apartment towers that keep growing.
  raiseTowers(which, fresh) {
    const list = this.cabins.filter((c) => c.towerable && (which === 1 ? c.x > 0 : c.x < 0));
    list.forEach((c, i) => this.convertCabin(c, 2, fresh, 0.3 + i * 0.25));
    this.updateResidents();
    this.addPower(`towers${which}`, 4e12);
    if (fresh) { this.story.beat(`towers${which}`, 0.8); this.showcase(list[0]?.x ?? 0, list[0]?.z ?? 0, 1.6, 1.5); }
  },

  // A cabin becomes an apartment tower with `floors` storeys.
  convertCabin(c, floors, fresh, delay = 0.3) {
    if (c.tower) return;
    const t = makeTowerBase();
    t.group.position.set(c.x, 0, c.z);
    t.group.rotation.y = c.rot ? (c.x < 0 ? Math.PI / 2 : -Math.PI / 2) : c.z > 0 ? 0 : Math.PI;
    this.scene.add(t.group);
    c.g.visible = false;
    c.tower = t;
    this.towerBlocks.push(t);
    for (let k = 0; k < floors; k++) addTowerFloor(t);
    if (fresh) { this.popIn(t.group, delay); setTimeout(() => this.fx.puff(c.x, 1, c.z, { n: 20, speed: 4, size: [2, 4] }), delay * 1000); }
  },

  addFloors(n, fresh) {
    this.towerBlocks.forEach((t, i) => {
      for (let k = 0; k < n; k++) {
        const f = addTowerFloor(t);
        if (fresh) { f.scale.setScalar(0.001); const d = 0.2 + i * 0.15 + k * 0.25; this.world.tween(d + 0.5, (x) => { const q = Math.max(0, (x * (d + 0.5) - d) / 0.5); f.scale.setScalar(Math.max(0.001, backOut(q))); }); }
      }
    });
    this.updateResidents();
    if (fresh) { this.audio.build(); this.shake = 0.3; }
  },

  updateResidents() {
    let floors = 0;
    for (const t of this.towerBlocks) floors += t.n;
    const farms = (this.bought.vfarm1 ? 1 : 0) + (this.bought.vfarm2 ? 1 : 0);
    const links = ['link1', 'link2', 'link3', 'link4'].filter((id) => this.bought[id]).length;
    // the families of the cabins, lit homes, six people per tower floor
    // (vertical farms feed bigger families), newcomers brought by the trains,
    // and twenty years later, a town twice as big
    const base = (this.act4.phase !== 'none' ? 30 + (this.districts?.length || 0) * 15 : 0) + (this.bought.grid ? 30 : 0);
    this.civ.residents = Math.round((base + floors * 6 * (1 + farms * 0.25) + links * 120) * (this.act6?.aube ? 2 : 1));
    this.addPower('floors', floors * 4e11);
  },

  buildVerticalFarm(i, fresh) {
    const at = i === 1 ? E.vfarm1 : E.vfarm2;
    const f = makeVerticalFarm(i === 1 ? 5 : 7); f.position.set(at.x, 0, at.z); this.scene.add(f);
    this.world.circles.push({ x: at.x, z: at.z, r: 1.5, camp: true });
    this.addPower(`vfarm${i}`, 2e12);
    this.updateResidents();
    if (fresh) { this.popIn(f); this.story.beat(`vfarm${i}`, 0.5); }
  },

  buildTurbines(fresh) {
    this.turbines = TURBINES.map(([x, z], i) => {
      const t = makeWindTurbine(9 + (i % 2) * 2); t.group.position.set(x, 0, z); t.group.rotation.y = -0.6; this.scene.add(t.group);
      this.world.circles.push({ x, z, r: 0.45 });
      this.forest.near(x, z, 2.5).forEach((tr) => { if (tr.alive) { tr.alive = false; tr.k = 0; this.forest.write(tr); } });
      if (fresh) this.popIn(t.group, 0.2 + i * 0.25);
      return t;
    });
    this.addPower('turbines', 8e12);
    if (fresh) { this.story.beat('turbines', 0.6); this.showcase(0, -13, 1.8, 1.7); }
  },

  // ---------------------------------------------------------------------
  // The Tower of Dawn, its lift and its sky deck
  // ---------------------------------------------------------------------
  dawnStage(n, fresh) {
    if (!this.dawn) {
      const d = makeSkyscraper(); d.group.position.set(E.dawn.x, 0, E.dawn.z); this.scene.add(d.group);
      this.dawn = d;
      this.lift = { y: 0, state: 'down', armed: true };
    }
    const d = this.dawn;
    d.stages[n - 1].visible = true;
    if (n === 1) this.world.circles.push({ x: E.dawn.x, z: E.dawn.z, r: 2.6, camp: true });
    // the Beacon's flame moves to the crown once the frame rises around it
    if (n >= 2 && this.beacon) this.beacon.group.visible = false;
    if (n === 4) { d.cabin.visible = true; d.cabin.position.y = 1.0; }
    this.addPower('dawn', [0, 2e12, 6e12, 1.2e13, 2.5e13][n]);
    if (fresh) {
      this.popIn(d.stages[n - 1]);
      this.fx.sparks(E.dawn.x, 3, E.dawn.z, { n: 30, color: [1, 0.85, 0.4], speed: 6 });
      this.story.beat(`dawn${n}`, 0.6);
      this.showcase(E.dawn.x, E.dawn.z, 2.0, n >= 3 ? 2.2 : 1.6);
      if (n === 4) { this.audio.fanfare(); this.setChapter(18, true); this.save?.(); }
    }
  },

  // Movement on the sky deck: a square around the crown.
  deckMove(p, dx, dz) {
    const cx = E.dawn.x, cz = E.dawn.z, h = 5.6;
    let nx = THREE.MathUtils.clamp(p.x + dx, cx - h, cx + h), nz = THREE.MathUtils.clamp(p.z + dz, cz - h, cz + h);
    const rx = nx - cx, rz = nz - cz, r = Math.hypot(rx, rz);
    if (r < 2.1) { nx = cx + rx / (r || 1) * 2.1; nz = cz + rz / (r || 1) * 2.1; }
    p.x = nx; p.z = nz;
  },

  updateLift(dt) {
    const L = this.lift, d = this.dawn;
    if (!L || !d || !d.cabin.visible) return;
    const p = this.player;
    const cab = { x: E.dawn.x, z: E.dawn.z + 2.6 };
    if (L.state === 'down' || L.state === 'up') {
      const atDoor = L.state === 'down' ? near(p, E.lift, 0.9) && !p.deck : p.deck && near(p, cab, 1.0);
      const away = L.state === 'down' ? !near(p, E.lift, 1.8) : !near(p, cab, 1.9);
      if (away) L.armed = true;
      if (atDoor && L.armed && !this.cutscene) {
        L.state = L.state === 'down' ? 'rising' : 'falling'; L.t = 0; L.armed = false;
        p.riding = true; p.deck = false;
        this.audio.whoosh();
      }
    }
    if (L.state === 'rising' || L.state === 'falling') {
      L.t += dt / 3.2;
      const k = smooth(0, 1, L.t);
      const y = L.state === 'rising' ? k * DECK_Y : (1 - k) * DECK_Y;
      d.cabin.position.y = 1.0 + y;
      p.x = cab.x; p.z = cab.z; p.elev = y; p.vx = 0; p.vz = 0; p.stun = 0.15;
      this.camZoom = 1 + k * (L.state === 'rising' ? 0.6 : 0) + (L.state === 'falling' ? (1 - k) * 0.6 : 0);
      if (L.t >= 1) {
        p.riding = false;
        if (L.state === 'rising') {
          L.state = 'up'; p.deck = true; p.elev = DECK_Y; p.z = cab.z + 1.3; this.camZoom = 1.6;
          if (!this.act4.deckSeen) { this.act4.deckSeen = true; this.story.beat('deck', 0.4); this.save?.(); }
        } else {
          L.state = 'down'; p.deck = false; p.elev = 0; p.z = E.lift.z + 0.4; this.camZoom = 0;
        }
      }
    }
  },

  // ---------------------------------------------------------------------
  // Hooks called by Game
  // ---------------------------------------------------------------------
  act4Apply(id, fresh) {
    switch (id) {
      case 'eastGate': this.openEast(fresh); return true;
      case 'oskar': { const w = this.addWorker('miner', fresh, 'oskar'); w.res = 'copper'; w.dest = 'wire_copper'; w.x = 34; w.z = 3; if (fresh) this.story.beat('oskar'); return true; }
      case 'kaja': { const w = this.addWorker('miner', fresh, 'kaja'); w.res = 'stone'; w.dest = 'cement_stone'; w.x = 38.4; w.z = -12.0; if (fresh) this.story.beat('kaja'); return true; }
      case 'plant1': case 'plant2': case 'plant3': this.plantStage(Number(id[5]), fresh); return true;
      case 'copperDrill': this.buildCopperDrill(fresh); return true;
      case 'grid': this.buildGrid(fresh); return true;
      case 'radio': this.buildRadio(fresh); return true;
      case 'electric': this.electrify(fresh); return true;
      case 'quarry': this.buildQuarry(fresh); return true;
      case 'stoneDrill': this.buildStoneDrill(fresh); return true;
      case 'towers1': this.raiseTowers(1, fresh); return true;
      case 'towers2': this.raiseTowers(2, fresh); return true;
      case 'floors1': this.addFloors(3, fresh); if (fresh) this.story.beat('floors1', 0.6); return true;
      case 'floors2': this.addFloors(4, fresh); if (fresh) this.story.beat('floors2', 0.6); return true;
      case 'vfarm1': this.buildVerticalFarm(1, fresh); return true;
      case 'vfarm2': this.buildVerticalFarm(2, fresh); return true;
      case 'turbines': this.buildTurbines(fresh); return true;
      case 'dawn1': case 'dawn2': case 'dawn3': case 'dawn4': this.dawnStage(Number(id[4]), fresh); return true;
      default: return false;
    }
  },

  // Where to send the hero for the materials the new tiles wait for.
  act4Objective(p) {
    const s = this.act4;
    if (s.phase === 'none') return null;
    if (this.lift && (this.lift.state === 'rising' || this.lift.state === 'falling')) return { at: null, text: this.lift.state === 'rising' ? 'L’ascenseur monte…' : 'L’ascenseur descend…', icon: 'tower' };
    if (p.deck) return { at: { x: E.dawn.x, z: E.dawn.z + 2.6 }, text: 'Admire Fort-Aube depuis le sommet · l’ascenseur te redescend', icon: 'tower' };
    if (this.bought.dawn4 && !s.deckSeen) return { at: E.lift, text: 'Prends l’ascenseur de la Tour de l’Aube', icon: 'tower' };
    // the first copper and the first stone open the next steps: lead there first
    const first = (res, pad, need, text, icon) => {
      if (!pad || this.workers.some((w) => w.res === res) || !need) return null;
      if (p.carry[res] >= 6 || (p.carry[res] > 0 && !this.nearestOreNode(p, 5, res))) return { at: pad, text: res === 'copper' ? 'Porte le cuivre à la tréfilerie' : 'Porte la pierre à la cimenterie', icon };
      const n = this.nearestOreNode(p, 300, res);
      return n && this.load_total(p) < p.cap * 0.9 ? { at: n, text, icon } : null;
    };
    const o1 = first('copper', this.pads.wire_copper, !this.bought.plant1 && (this.stats.wire || 0) + (this.pads.wire_copper?.n || 0) < 6 && !this.copperDrill, 'Mine le cuivre de la crête', 'copper')
      || first('stone', this.pads.cement_stone, this.cementWorks && (this.stats.concrete || 0) + (this.pads.cement_stone?.n || 0) < 8 && !this.stoneDrill, 'Taille la pierre de la carrière', 'stone');
    if (o1) return o1;
    if (p.carry.copper > 0 && this.pads.wire_copper && this.pads.wire_copper.n < 43 && (this.load_total(p) >= p.cap * 0.5 || !this.nearestOreNode(p, 6))) return { at: E.copperIn, text: 'Porte le cuivre à la tréfilerie', icon: 'copper' };
    if (p.carry.stone > 0 && this.pads.cement_stone && this.pads.cement_stone.n < 43 && (this.load_total(p) >= p.cap * 0.5 || !this.nearestOreNode(p, 6))) return { at: E.stoneIn, text: 'Porte la pierre à la cimenterie', icon: 'stone' };
    return null;
  },

  // Late guidance: fetch what the waiting tiles need.
  act4LateObjective(p) {
    if (!this.wireMill || this.load_total(p) >= p.cap * 0.85) return null;
    const need = new Set();
    for (const t of this.itemTiles()) for (const [k, n] of this.tileItemsLeft(t)) if (n > 0) need.add(k);
    if (!this.plant && (this.stats.wire || 0) < 4) need.add('wire');
    if (this.cementWorks && (this.stats.concrete || 0) < 6) need.add('concrete');
    const pick = (pad, text, icon) => (pad && pad.n >= 1 ? { at: pad, text, icon } : null);
    let o;
    if (!this.couriers() && need.has('wire') && (o = pick(this.pads.wire_out, 'Ramasse les bobines de fil', 'wire'))) return o;
    if (!this.couriers() && need.has('concrete') && (o = pick(this.pads.cement_out, 'Ramasse les parpaings', 'concrete'))) return o;
    if (need.has('wire') && !this.workers.some((w) => w.res === 'copper') && !this.copperDrill) {
      const n = this.nearestOreNode(p, 300, 'copper');
      if (n) return { at: n, text: 'Mine le cuivre de la crête', icon: 'copper' };
    }
    if (need.has('concrete') && !this.workers.some((w) => w.res === 'stone')) {
      const n = this.nearestOreNode(p, 300, 'stone');
      if (n) return { at: n, text: 'Taille la pierre de la carrière', icon: 'stone' };
    }
    if (!this.couriers() && need.has('steel') && this.pads.steelPad.n >= 1) return { at: this.pads.steelPad, text: 'Ramasse les lingots d’acier', icon: 'ingot' };
    if (!this.couriers() && need.has('can') && this.pads.canPad.n >= 1) return { at: this.pads.canPad, text: 'Ramasse les conserves', icon: 'can' };
    if (need.has('plank')) {
      if (!this.couriers() && this.pads.plankPad.n >= 2) return { at: this.pads.plankPad, text: 'Va chercher du bois fendu', icon: 'log' };
      if (p.carry.log >= 6 || (p.carry.log > 0 && this.load_total(p) >= p.cap * 0.6)) return { at: this.pads.logPad, text: 'Porte les bûches à la scierie', icon: 'log' };
      const t = this.nearestChoppable(p);
      if (t) return { at: { x: t.x, z: t.z }, text: 'Coupe du bois pour le chantier', icon: 'axe' };
    }
    if (need.has('steel')) {
      const n = this.nearestOreNode(p, 300, 'ore');
      if (n && !this.workers.some((w) => w.kind === 'miner' && (w.res || 'ore') === 'ore')) return { at: n, text: 'Mine le fer de la falaise', icon: 'ore' };
    }
    return null;
  },

  updateAct4(dt) {
    this.act4Story(dt);
    this.updateWireMill(dt);
    this.updatePlant(dt);
    this.updateCopperDrill(dt);
    this.updateCement(dt);
    this.updateNight(dt);
    this.updateLift(dt);
    if (this.radioMast) this.radioMast.blink.visible = Math.sin(this.time * 4) > 0;
    if (this.turbines) for (const t of this.turbines) t.rotor.rotation.z += dt * 2.2;
    if (this.dawn && this.dawn.stages[3].visible) this.dawn.beacon.material.opacity = 0.6 + Math.sin(this.time * 2) * 0.3;
  },

  act4Serialize() {
    const s = this.act4;
    return { phase: s.phase, towers: s.towers, deckSeen: s.deckSeen, dayT: this.dayT, drill: this.pads.drillPad?.n || 0 };
  },

  act4Load(d) {
    if (!d) return;
    const s = this.act4;
    s.towers = !!d.towers; s.deckSeen = !!d.deckSeen;
    if (d.phase && d.phase !== 'none') { this.startAct4(false); s.phase = this.wireMill ? 'east' : d.phase; }
    this.dayT = d.dayT ?? this.dayT;
    if (this.pads.drillPad) this.pads.drillPad.n = d.drill || 0;
  },
};

export function installAct4(Game) {
  Object.assign(Game.prototype, methods);
}
