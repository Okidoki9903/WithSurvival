// Act III — What the ice keeps. Véra's black box, Brann's confession, the
// forge district and the Iron Cliff mine, steel upgrades for the whole fort,
// the icebreaker, the voyage to Station Aube and the final choice.
// Installed as methods on Game.
import * as THREE from 'three';
import { makeHuman, ITEM_HEIGHT, mat } from './models.js';
import { makeOreNode, makeCliff, makeHeadframe, makeDrill, makeRails, makeCart, makeForge, upgradeForge, makeCanopy, makeCannery, upgradeCannon, upgradeSawmill3, makeSlipway, makeIcebreaker, makeStation, makeVeilTower, makeGreenhouse, makeRelic, makeCub } from './models3.js';
import { MINE, STATION, WEST_GATE, backOut } from './world.js';

const P = (x, z) => ({ x, z });
const WGZ = (WEST_GATE.z0 + WEST_GATE.z1) / 2;
export const ACT3_POS = {
  westTile: P(-15.8, 0.5),
  wgIn: P(-31.4, WGZ), wgOut: P(-34.8, WGZ),
  dock: P(-37.4, WGZ),
  orePad: P(-26.6, WGZ),
  forge: P(-23.4, WGZ),
  steelPad: P(-20.2, WGZ),
  cannery: P(-27.6, 4.6),
  canPad: P(-24.6, 4.4),
  ship: P(-29.0, -2.0),
  shipTile: P(-25.4, -2.4),
  headframe: P(-43.4, -4.4),
  drill: P(-43.0, 2.6),
  relic: P(14.6, 18.8),
  station: P(-29.0, -90.0),
  stationShip: P(-35.5, -79.0),
  arrive: P(-30.6, -80.2),
  desk: P(-26.0, -88.4),
  well: P(-32.0, -89.8),
  choiceA: P(-31.8, -83.4),
  choiceB: P(-26.2, -83.4),
};
const A3 = ACT3_POS;
const ORE_NODES = [[-39.6, -6.6], [-41.2, -1.0], [-38.4, -3.4], [-44.0, -1.4], [-40.4, 5.6], [-43.8, 6.0], [-37.6, 6.9], [-36.4, -6.6], [-42.0, -7.4]];
const GREENHOUSES = [[-20.8, -3.4], [-19.4, 4.6], [24.0, 24.2]];

const T = (id, icon, cost, at, req, label, extra = {}) => ({ id, icon, cost, at, req, label, ...extra });
export const ACT3_TILES = [
  T('westGate', 'expand', 8000, A3.westTile, (g) => g.act3.phase !== 'none' && g.act3.phase !== 'relic' && g.act3.heard, 'Porte de l’Ouest', { big: true, beat: 'westTile', reveal: true }),
  T('rail', 'cable', 3000, P(-30.6, 4.9), (g) => g.stage >= 5, 'Voie ferrée et wagonnet'),
  T('miner', 'person', 2500, P(-37.6, 4.8), (g) => g.stage >= 5 && g.stats.mined >= 6, 'Recruter Gustav'),
  T('drill', 'gear', 4000, A3.drill, (g) => g.bought.rail && g.stats.steel >= 4, 'Foreuse à vapeur', { items: { steel: 8 } }),
  T('furnace2', 'fire', 5000, P(-23.4, -0.6), (g) => g.stats.steel >= 10, 'Haut-fourneau', { items: { steel: 12 } }),
  T('cuisine', 'pot', 6000, P(5.6, -2.0), (g) => g.bought.steam && g.stats.steel >= 6, 'Cuisine de l’Aube', { items: { steel: 16 }, beat: 'cuisineTile', reveal: true }),
  T('cannery', 'can', 4000, A3.cannery, (g) => g.bought.cuisine && g.bought.belt1, 'Conserverie', { items: { steel: 10 } }),
  T('cannons', 'bow', 5000, P(8.4, -3.6), (g) => g.stats.steel >= 15, 'Canons à vapeur', { items: { steel: 16 } }),
  T('sawmill3', 'axeplus', 3500, P(13.4, 1.6), (g) => g.stats.steel >= 15 && g.bought.sawUp, 'Scierie industrielle', { items: { steel: 12 } }),
  T('market2', 'register', 4500, P(-1.7, 4.5), (g) => g.stats.steel >= 20 && g.bought.register, 'Grand Marché', { items: { steel: 10 } }),
  T('ship1', 'ship', 2000, A3.shipTile, (g) => g.stage >= 5 && g.stats.steel >= 2, 'Coque du Brise-Glace', { items: { plank: 30, steel: 10 }, beat: 'shipTile', reveal: true }),
  T('ship2', 'steam', 5000, A3.shipTile, (g) => g.bought.ship1, 'Chaudière du Brise-Glace', { items: { steel: 20 } }),
  T('ship3', 'ingot', 6000, A3.shipTile, (g) => g.bought.ship2, 'Étrave d’acier', { items: { steel: 25, plank: 10 } }),
  T('ship4', 'can', 8000, A3.shipTile, (g) => g.bought.ship3, 'Vivres pour le voyage', { items: { can: 30 } }),
  T('depart', 'ship', 0, A3.shipTile, (g) => g.bought.ship4 && g.act3.phase === 'west', 'Partir vers le Nord', { free: true, big: true }),
  T('choiceA', 'sun', 0, A3.choiceA, (g) => g.act3.phase === 'station' && g.act3.chooseReady, 'Rendre le ciel', { free: true, big: true }),
  T('choiceB', 'heart', 0, A3.choiceB, (g) => g.act3.phase === 'station' && g.act3.chooseReady, 'Garder le Cœur', { free: true, big: true }),
];

const PILES = {
  orePad: { cols: 3, rows: 3, sp: 0.6, h: ITEM_HEIGHT.ore, cap: 45 },
  steelPad: { cols: 3, rows: 3, sp: 0.6, h: ITEM_HEIGHT.steel, cap: 60 },
  dockPad: { cols: 3, rows: 3, sp: 0.6, h: ITEM_HEIGHT.ore, cap: 45 },
  canPad: { cols: 3, rows: 3, sp: 0.55, h: ITEM_HEIGHT.can, cap: 60 },
};
const rand = (a, b) => a + Math.random() * (b - a);
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lerpAngle = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
const fadeEl = () => document.getElementById('fade');

const methods = {
  initAct3() {
    this.act3 = { phase: 'none', relicT: 0, heard: false, chooseReady: false, veraHeard: false, ending: null, t: 0, triggers: {} };
    this.stats.mined = this.stats.mined || 0;
    this.stats.steel = this.stats.steel || 0;
    this.stats.canned = this.stats.canned || 0;
    this.pads.orePad = { ...A3.orePad, n: 0, pile: PILES.orePad, type: 'ore' };
    this.pads.steelPad = { ...A3.steelPad, n: 0, pile: PILES.steelPad, type: 'steel' };
    this.pads.dockPad = { ...A3.dock, n: 0, pile: PILES.dockPad, type: 'ore' };
    this.pads.canPad = { ...A3.canPad, n: 0, pile: PILES.canPad, type: 'can' };
    this.smeltTime = 1.5; this.smeltT = 0;
    this.canQ = 0; this.canT = 0;
    this.spring = 0;
  },

  // ---------------------------------------------------------------------
  // Flocon, Grand-Blanc's cub, follows Sasha everywhere
  // ---------------------------------------------------------------------
  spawnCub(fresh) {
    if (this.cub) return;
    const m = makeCub();
    const p = this.player;
    const at = fresh && this.boss ? { x: this.boss.x, z: this.boss.z } : { x: p.x - 1.5, z: p.z + 1 };
    m.root.position.set(at.x, 0, at.z);
    this.scene.add(m.root);
    this.cub = { model: m, x: at.x, z: at.z, rot: 0, sit: 0, hop: 0 };
    if (fresh) { m.root.scale.setScalar(0.001); this.world.tween(0.8, (f) => m.root.scale.setScalar(Math.max(0.001, backOut(f) * 0.45))); }
  },

  updateCub(dt) {
    const c = this.cub;
    if (!c) return;
    const p = this.player;
    if (this.act3.leftCub) return;
    if (this.cutscene && this.ship) {
      // Flocon rides on the icebreaker's deck
      const sp = this.ship.group.position;
      c.x = sp.x - 0.7; c.z = sp.z + 0.9;
      c.model.root.position.set(c.x, 1.7, c.z); c.model.root.rotation.y = Math.PI; c.model.pose(dt, 0, -1);
      return;
    }
    const back = { x: p.x - Math.sin(p.facing) * 1.5 + Math.cos(p.facing) * 0.6, z: p.z - Math.cos(p.facing) * 1.5 - Math.sin(p.facing) * 0.6 };
    const dx = back.x - c.x, dz = back.z - c.z, d = Math.hypot(dx, dz);
    let moving = 0;
    if (d > 4.5) { c.x = back.x - dx / d * 3; c.z = back.z - dz / d * 3; }
    if (d > 0.5) {
      const sp = Math.min(d * 3.2, 7.8);
      c.x += dx / d * sp * dt; c.z += dz / d * sp * dt;
      c.rot = lerpAngle(c.rot, Math.atan2(dx, dz), Math.min(1, dt * 8));
      moving = Math.min(1, sp / 4);
    } else c.rot = lerpAngle(c.rot, Math.atan2(p.x - c.x, p.z - c.z), Math.min(1, dt * 3));
    const m = c.model;
    m.root.position.set(c.x, (p.elev || 0) * (d < 3 ? 1 : 0), c.z);
    m.root.rotation.y = c.rot;
    m.pose(dt, moving * 1.4, -1);
  },

  // ---------------------------------------------------------------------
  // Story triggers spread over the whole game
  // ---------------------------------------------------------------------
  storyTriggers(dt) {
    const p = this.player, s = this.act3, tr = s.triggers;
    if (this.stage >= 1 && p.carry.log > 0) this.story.beat('fuelHint', 0.3);
    if (this.act2.orders >= 2) this.story.beat('rope', 2);
    if (this.stage >= 4 && this.stats.smoked >= 15) this.story.beat('musicBox', 1);
    if (this.act2.ended && !tr.shadow) { tr.shadow = true; setTimeout(() => this.story.beat('endingShadow'), 9000); }
    if (this.bossDown && !this.cub) this.spawnCub(false);
    // Act III begins a while after the thaw
    if (s.phase === 'none' && this.act2.ended) {
      s.relicT += dt;
      if (s.relicT > (this.creditsSeen ? 40 : 90)) this.spawnRelic(true);
    }
  },

  onCreditsClosed() {
    this.creditsSeen = true;
    if (this.act3.ending && !this.act3.afterSaid) { this.act3.afterSaid = true; this.story.beat(this.act3.ending === 'A' ? 'afterA' : 'afterB', 2); }
  },

  // ---------------------------------------------------------------------
  // The black box from the drowned town
  // ---------------------------------------------------------------------
  spawnRelic(fresh) {
    const s = this.act3;
    s.phase = 'relic';
    if (this.relic) return;
    const r = makeRelic();
    r.group.position.set(A3.relic.x, 0, A3.relic.z);
    this.scene.add(r.group);
    this.relic = r;
    if (fresh) { this.popIn(r.group); this.story.beat('relic', 0.5); this.fx.puff(A3.relic.x, 0.3, A3.relic.z, { n: 12, color: [0.75, 0.9, 1], speed: 3 }); }
  },

  updateRelic(dt) {
    const r = this.relic;
    if (!r) return;
    r.led.visible = Math.sin(this.time * 6) > 0;
    r.group.rotation.y += dt * 0.6;
    r.halo.material.opacity = 0.5 + Math.sin(this.time * 3) * 0.2;
    if (this.act3.phase === 'relic' && near(this.player, A3.relic, 1.4)) {
      this.act3.phase = 'heard';
      const g = r.group;
      const p = this.player;
      this.world.tween(0.6, (f) => { g.position.set(A3.relic.x + (p.x - A3.relic.x) * f, Math.sin(f * Math.PI) * 1.5 + f * 1.4, A3.relic.z + (p.z - A3.relic.z) * f); g.scale.setScalar(1 - f * 0.6); }, () => { this.scene.remove(g); this.relic = null; });
      this.audio.fanfare();
      this.story.beat('relicOpen', 0.4);
      setTimeout(() => this.story.beat('confession'), 1000);
      setTimeout(() => { this.act3.heard = true; this.setChapter(9, true); this.refreshTiles(); this.save?.(); }, 26000);
    }
  },

  // ---------------------------------------------------------------------
  // The forge district and the Iron Cliff
  // ---------------------------------------------------------------------
  openWest(fresh) {
    if (this.forge) return;
    this.act3.phase = this.act3.phase === 'none' || this.act3.phase === 'relic' || this.act3.phase === 'heard' ? 'west' : this.act3.phase;
    this.act3.heard = true;
    this.westGate = [A3.wgIn, A3.wgOut];
    this.world.extraZones = [...(this.world.extraZones || []), MINE];
    this.setStage(5, fresh);
    const g = new THREE.Group();
    this.scene.add(g);
    this.westGroup = g;
    // the cliff, the old headframe and the veins of ore
    makeCliff(g, MINE.x0 - 2.0, MINE.z0 - 1.5, MINE.z1 + 1.5);
    for (let z = MINE.z0 - 1.5; z <= MINE.z1 + 1.5; z += 4.2) this.world.circles.push({ x: MINE.x0 - 4.6, z, r: 4.0 });
    const hf = makeHeadframe(); hf.group.position.set(A3.headframe.x, 0, A3.headframe.z); hf.group.rotation.y = Math.PI / 2; g.add(hf.group);
    this.headframe = hf;
    this.world.circles.push({ x: A3.headframe.x, z: A3.headframe.z, r: 1.4 });
    this.oreNodes = ORE_NODES.map(([x, z], i) => {
      const m = makeOreNode(i + 1); m.position.set(x, 0, z); g.add(m);
      const c = { x, z, r: 0.95 };
      this.world.circles.push(c);
      return { x, z, g: m, hp: 4, alive: true, t: 0, circle: c };
    });
    // the forge line: ore pad -> forge -> steel pad
    const f = makeForge(); f.group.position.set(A3.forge.x, 0, A3.forge.z); this.scene.add(f.group);
    this.forge = f;
    this.world.circles.push({ x: A3.forge.x, z: A3.forge.z - 0.2, r: 1.25, camp: true });
    const pads = [this.padMesh('ore', A3.orePad), this.padMesh('ingot', A3.steelPad, { dashed: true })];
    pads.forEach((m) => this.scene.add(m));
    // the slipway waits for the icebreaker
    const sl = makeSlipway(); sl.position.set(A3.ship.x, 0, A3.ship.z); this.scene.add(sl);
    const ship = makeIcebreaker(); ship.group.position.set(A3.ship.x, 0, A3.ship.z); this.scene.add(ship.group);
    this.ship = ship;
    this.world.circles.push({ x: A3.ship.x + 2.2, z: A3.ship.z + 1.5, r: 0.35, camp: true });
    // Gustav waits at the cliff, Piotr at the forge
    this.addStationNpc('gustav', A3.headframe.x + 2.2, A3.headframe.z + 2.6);
    if (fresh) {
      this.popIn(g, 0.6); this.popIn(f.group, 0.9); pads.forEach((m) => this.popIn(m, 1.1)); this.popIn(sl, 1.2);
      this.setChapter(10, true);
      this.story.beat('west', 2.2);
      this.showcase(-30, 1, 2.6, 1.45);
    }
  },

  addStationNpc(kind, x, z) {
    const looks = { gustav: { parka: 0x6a5a4a, pants: 0x2b2b35, fur: 0x9a9a9a, scarf: 0xb06a2c, tool: null }, brann: { parka: 0x8a5a2e, pants: 0x3a2a20, fur: 0xdcd2c0, scarf: 0x2f6db0, tool: null, scale: 1.05 }, mira: { parka: 0x4fa3d9, pants: 0x2b3140, scarf: 0xf2d24b, tool: null } }[kind];
    const m = makeHuman(looks);
    m.root.position.set(x, 0, z);
    this.scene.add(m.root);
    const npc = { kind, model: m, x, z, facing: 0, follow: null };
    (this.storyNpcs ||= []).push(npc);
    return npc;
  },

  nearestOreNode(from, reach) {
    let best = null, bd = Infinity;
    for (const n of this.oreNodes || []) {
      if (!n.alive) continue;
      const d = Math.hypot(n.x - from.x, n.z - from.z) - 0.95;
      if (d < reach && d < bd) { bd = d; best = n; }
    }
    return best;
  },

  mineOre(n, src) {
    if (!n.alive) return;
    n.hp--;
    this.audio.chop();
    this.fx.sparks(n.x, 0.9, n.z, { n: 10, color: [1, 0.6, 0.25], speed: 4 });
    this.fx.puff(n.x, 0.6, n.z, { n: 4, size: [0.6, 1.4], speed: 2, color: [0.7, 0.68, 0.66], alpha: 0.6 });
    n.g.scale.set(1.08, 0.92, 1.08);
    this.world.tween(0.15, (f) => n.g.scale.setScalar(1 + (1 - f) * 0.06));
    if (n.hp <= 0) {
      n.alive = false; n.t = 26;
      this.world.circles = this.world.circles.filter((c) => c !== n.circle);
      this.burst('ore', n.x, 0.9, n.z, 4, { owner: src, speed: 3.2 });
      this.world.tween(0.3, (f) => n.g.scale.setScalar(Math.max(0.001, 1 - f)));
      this.audio.whoosh();
    }
  },

  updateOreNodes(dt) {
    for (const n of this.oreNodes || []) {
      if (n.alive) continue;
      n.t -= dt;
      if (n.t <= 0 && !near(this.player, n, 1.6)) {
        n.alive = true; n.hp = 4;
        this.world.circles.push(n.circle);
        this.world.tween(1.0, (f) => n.g.scale.setScalar(Math.max(0.001, backOut(f))));
      }
    }
  },

  updateForge(dt) {
    const f = this.forge;
    if (!f) return;
    const inp = this.pads.orePad, out = this.pads.steelPad;
    this.smeltT -= dt;
    const busy = inp.n - (inp.inflight || 0) > 0;
    if (this.smeltT <= 0 && busy && out.n < out.pile.cap) {
      this.smeltT = this.smeltTime;
      const from = this.pickPos(inp);
      inp.n--;
      const mouth = { x: A3.forge.x, y: 0.7, z: A3.forge.z + 0.6 };
      this.fly('ore', from, () => mouth, {
        dur: 0.4, arc: 1.2, onArrive: () => {
          this.fx.sparks(mouth.x, 0.9, mouth.z + 0.2, { n: 8, color: [1, 0.6, 0.2], speed: 3 });
          setTimeout(() => {
            this.stats.steel++;
            if (this.stats.steel === 1) this.story.beat('firstSteel', 0.3);
            this.audio.chop();
            this.fly('steel', { x: A3.forge.x + 1.15, y: 1.0, z: A3.forge.z + 0.75 }, this.incoming(out), { dur: 0.45, arc: 1.4, onArrive: () => { out.inflight--; } });
          }, 500);
        },
      });
    }
    const heat = busy ? 1 : 0.4;
    f.light.intensity = (5 + Math.sin(this.time * 11) * 1.2) * (0.6 + heat * 0.6);
    f.mouth.forEach((m) => m.material.color.setRGB(1.2 + heat * 0.6, 0.45 + heat * 0.25, 0.08));
    for (const c of f.chimneys) if (Math.random() < dt * (busy ? 6 : 2)) { const v = c.clone().applyMatrix4(f.group.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
    if (busy && Math.random() < dt * 5) this.fx.ember(A3.forge.x, 0.9, A3.forge.z + 0.8);
  },

  // ---- rail line with an ore cart -----------------------------------------
  buildRail(fresh) {
    const z = WGZ;
    const rails = makeRails([{ x: A3.dock.x + 1.0, z }, { x: A3.orePad.x - 1.1, z }]);
    this.scene.add(rails);
    const cart = makeCart(); cart.rotation.y = Math.PI / 2; this.scene.add(cart);
    this.cart = { group: cart, x: A3.dock.x + 1.2, state: 'load', load: 0, in: 0, t: 0, idle: 0 };
    this.scene.add(this.padMesh('ore', A3.dock));
    if (fresh) { this.popIn(rails); this.popIn(cart, 0.3); this.showcase(-32, z, 1.6); }
  },

  updateCart(dt) {
    const c = this.cart;
    if (!c) return;
    const xA = A3.dock.x + 1.2, xB = A3.orePad.x - 1.3;
    const dock = this.pads.dockPad, ore = this.pads.orePad;
    const top = () => ({ x: c.x, y: 0.75 + Math.min(c.load, 7) * 0.05, z: WGZ });
    c.t -= dt;
    let moving = 0;
    if (c.state === 'load') {
      if (c.t <= 0 && dock.n - (dock.inflight || 0) > 0 && c.load + c.in < 10) {
        c.t = 0.12; c.idle = 0;
        const from = this.pickPos(dock); dock.n--; c.in++;
        this.fly('ore', from, top, { dur: 0.3, arc: 0.8, onArrive: () => { c.in--; c.load++; } });
      } else if (c.in === 0) c.idle += dt;
      if (c.in === 0 && (c.load >= 10 || (c.load > 0 && c.idle > 1.5))) c.state = 'go';
    } else if (c.state === 'go' || c.state === 'back') {
      const tx = c.state === 'go' ? xB : xA;
      const d = tx - c.x;
      const sp = 4.2 * Math.min(1, Math.abs(d) / 1.2 + 0.2);
      c.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
      moving = 1;
      if (Math.abs(d) < 0.02) c.state = c.state === 'go' ? 'unload' : 'load';
    } else if (c.state === 'unload') {
      if (c.t <= 0 && c.load > 0 && ore.n < ore.pile.cap) {
        c.t = 0.1; c.load--;
        this.fly('ore', top(), this.incoming(ore), { dur: 0.35, arc: 1.0, onArrive: () => { ore.inflight--; } });
      }
      if (c.load === 0) c.state = 'back';
    }
    c.group.position.set(c.x, 0, WGZ);
    if (moving && Math.random() < dt * 4 && Math.abs(this.player.x - c.x) < 12) this.audio.clank();
  },

  // ---- steam drill: the cliff mines itself ------------------------------
  buildDrill(fresh) {
    const d = makeDrill(); d.group.position.set(A3.drill.x, 0, A3.drill.z); this.scene.add(d.group);
    this.drill = { ...d, t: 1 };
    this.world.circles.push({ x: A3.drill.x, z: A3.drill.z, r: 1.2 });
    if (fresh) { this.popIn(d.group); this.showcase(A3.drill.x + 2, A3.drill.z, 1.6); }
  },

  updateDrill(dt) {
    const d = this.drill;
    if (!d) return;
    const dock = this.pads.dockPad;
    const working = dock.n < dock.pile.cap;
    d.bit.rotation.x += dt * (working ? 18 : 2);
    if (Math.random() < dt * (working ? 5 : 1)) { const v = d.chimney.clone().applyMatrix4(d.group.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
    d.t -= dt;
    if (working && d.t <= 0) {
      d.t = 2.2;
      const at = { x: A3.drill.x - 2.1, y: 0.9, z: A3.drill.z - 0.3 };
      this.fx.puff(at.x, at.y, at.z, { n: 5, size: [0.5, 1.3], speed: 2.5, color: [0.7, 0.68, 0.66], alpha: 0.7 });
      this.stats.mined++;
      this.fly('ore', at, this.incoming(dock), { dur: 0.8, arc: 2.2, onArrive: () => { dock.inflight--; } });
    }
  },

  // ---- Kitchen of Dawn: glass canopy over the cauldrons ------------------
  buildCuisine(fresh) {
    const c = makeCanopy([P(-0.55, -3.0), P(2.0, -3.5), P(5.3, 1.3), P(2.2, 2.6)]);
    this.scene.add(c.group);
    this.canopy = c;
    for (const q of [P(-0.55, -3.0), P(2.0, -3.5), P(5.3, 1.3), P(2.2, 2.6)]) this.world.circles.push({ x: q.x, z: q.z, r: 0.28, camp: true });
    this.cookTime = 0.2;
    if (fresh) { this.popIn(c.group); this.showcase(2, -0.5, 2.0, 1.2); }
  },

  // ---- cannery and the food cable that feeds it -------------------------
  buildCannery(fresh) {
    const c = makeCannery(); c.group.position.set(A3.cannery.x, 0, A3.cannery.z); this.scene.add(c.group);
    this.cannery = c;
    this.world.circles.push({ x: A3.cannery.x, z: A3.cannery.z - 0.2, r: 1.15, camp: true });
    const pad = this.padMesh('can', A3.canPad, { dashed: true }); this.scene.add(pad);
    const y = 3.6;
    this.foodLine = this.addLine({
      kind: 'cable', speed: 2.6, spacing: 0.9, color: 0x2b2b30,
      path: [{ x: -2.9, y, z: 0.6 }, { x: -6.8, y, z: 5.2 }, { x: -12.4, y, z: 5.45 }, { x: -17.0, y, z: 5.45 }, { x: -24.6, y, z: 5.75 }, { x: -26.9, y, z: 4.7 }],
      posts: null,
      sources: [{ pad: this.pads.cookedPad, s: 0.05, when: () => this.pads.cookedPad.n > 4 && this.pads.canPad.n + this.canQ + this.foodLine.items.length < this.pads.canPad.pile.cap }],
      sink: { accept: () => this.canQ < 6, deliver: (type, from) => { this.canQ++; this.fly(type, from, () => ({ x: A3.cannery.x + 0.4, y: 1.1, z: A3.cannery.z + 0.45 }), { dur: 0.3, arc: 0.3 }); } },
    }, fresh);
    if (fresh) { this.popIn(c.group); this.popIn(pad, 0.3); this.showcase(-14, 4, 2.4, 1.5); }
  },

  updateCannery(dt) {
    const c = this.cannery;
    if (!c) return;
    const out = this.pads.canPad;
    this.canT -= dt;
    if (this.canT <= 0 && this.canQ > 0 && out.n < out.pile.cap) {
      this.canT = 0.9;
      this.canQ--;
      c.pressT = 0;
      setTimeout(() => {
        this.stats.canned++;
        this.audio.drop(6);
        this.fly('can', { x: A3.cannery.x + 0.4, y: 1.1, z: A3.cannery.z + 0.45 }, this.incoming(out), { dur: 0.45, arc: 1.2, onArrive: () => { out.inflight--; } });
      }, 350);
    }
    if (c.pressT !== undefined && c.pressT < 1) { c.pressT += dt / 0.4; c.press.position.y = 1.95 - Math.sin(Math.min(1, c.pressT) * Math.PI) * 0.45; }
    if (Math.random() < dt * 2) { const v = c.chimney.clone().applyMatrix4(c.group.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
  },

  // ---- Grand Market: two serving windows ---------------------------------
  buildMarket2(fresh) {
    this.windows = 2;
    this.serveInterval = 0.09;
    const g = new THREE.Group();
    for (const [i, x] of [[1, -4.75], [2, -3.25]]) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const x2 = c.getContext('2d');
      x2.fillStyle = '#2b3138'; x2.beginPath(); x2.arc(64, 64, 60, 0, Math.PI * 2); x2.fill();
      x2.strokeStyle = '#f2c94c'; x2.lineWidth = 8; x2.stroke();
      x2.fillStyle = '#f2c94c'; x2.font = '900 78px "Trebuchet MS", sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(String(i), 64, 70);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(x, 1.95, 6.95); g.add(sign);
      const rope = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), mat(0x3a2a1c)); rope.position.set(x, 2.4, 6.95); g.add(rope);
    }
    this.scene.add(g);
    if (fresh) this.popIn(g);
  },

  // ---------------------------------------------------------------------
  // The icebreaker
  // ---------------------------------------------------------------------
  shipStage(n, fresh) {
    const s = this.ship;
    if (!s) return;
    const part = s.parts[n - 1];
    part.visible = true;
    if (n === 1) for (const dz of [-2.4, -0.2, 1.8]) this.world.circles.push({ x: A3.ship.x, z: A3.ship.z + dz, r: 1.35, camp: true, ship: true });
    if (fresh) {
      this.popIn(part);
      this.fx.sparks(A3.ship.x, 2, A3.ship.z, { n: 30, color: [1, 0.8, 0.3], speed: 6 });
      this.story.beat(`ship${n}`, 0.6);
      if (n === 4) { this.setChapter(11, true); this.save?.(); }
      this.showcase(A3.ship.x, A3.ship.z, 1.4, 1.1);
    }
    if (n === 4 && !fresh) this.act3.shipReady = true;
  },

  // ---------------------------------------------------------------------
  // Voyage north, Station Aube, the choice, the endings
  // ---------------------------------------------------------------------
  depart() {
    const s = this.act3;
    s.phase = 'voyage'; s.t = 0;
    this.cutscene = true;
    this.story.beat('departure');
    this.world.shipGate = true;
    this.world.buildFence(true);
    this.world.circles = this.world.circles.filter((c) => !c.ship);
    this.crew = [this.addStationNpc('brann', 0, 0), this.addStationNpc('mira', 0, 0)];
  },

  updateVoyage(dt) {
    const s = this.act3, ship = this.ship, p = this.player;
    s.t += dt;
    const g = ship.group;
    const v = Math.min(7, 0.6 + s.t * 0.9);
    g.position.z -= v * dt;
    const sx = g.position.x, sz = g.position.z;
    p.x = sx + 0.5; p.z = sz + 1.6; p.elev = 1.7; p.vx = 0; p.vz = -v; p.stun = 0.2;
    this.crew[0].x = sx - 0.6; this.crew[0].z = sz + 2.0;
    this.crew[1].x = sx + 0.2; this.crew[1].z = sz - 0.1;
    for (const c of this.crew) { c.elev = 1.7; c.facing = Math.PI; }
    for (const t of this.forest.near(sx, sz - 3.5, 3.6)) {
      if (t.alive) { this.forest.poof(t, 0, () => this.fx.puff(t.x, 2.2, t.z, { n: 6, speed: 3, size: [2, 4.5] })); }
    }
    if (Math.random() < dt * 10) { const f = ship.funnelTop.clone().applyMatrix4(g.matrixWorld); this.fx.smoke(f.x, f.y, f.z); }
    if (Math.random() < dt * 6) this.fx.puff(sx + rand(-1.4, 1.4), 0.3, sz - 3.4, { n: 3, size: [1, 2.5], speed: 3, alpha: 0.8 });
    if (sz < -38 && !s.fading) { s.fading = true; fadeEl()?.classList.add('on'); }
    if (sz < -50 || s.t > 16) this.arriveStation(true);
  },

  buildStationScene() {
    if (this.station) return;
    const st = makeStation();
    st.group.position.set(A3.station.x, 0, A3.station.z);
    this.scene.add(st.group);
    this.station = st;
    this.world.extraZones = [...(this.world.extraZones || []), STATION];
    // dome wall colliders, open towards the south
    const cx = A3.station.x, cz = A3.station.z - 1;
    for (let k = 0; k <= 30; k++) {
      const phi = Math.PI * 0.99 + k / 30 * Math.PI * 1.45;
      this.world.circles.push({ x: cx - Math.cos(phi) * 6.4, z: cz + Math.sin(phi) * 6.4, r: 0.6 });
    }
    this.world.circles.push({ x: cx - 0.6, z: cz - 2.0, r: 1.7 }, { x: A3.well.x, z: A3.well.z, r: 1.4 }, { x: A3.desk.x, z: A3.desk.z, r: 0.7 });
    this.towers = [[-41, -96, 17], [-16, -98, 15], [-30, -106, 19], [-46, -83, 13]].map(([x, z, h]) => {
      const t = makeVeilTower(h); t.group.position.set(x, 0, z); this.scene.add(t.group);
      return { ...t, x, z, on: true };
    });
  },

  arriveStation(fresh) {
    const s = this.act3;
    s.phase = 'station'; s.t = 0;
    this.buildStationScene();
    const g = this.ship.group;
    g.position.set(A3.stationShip.x, 0, A3.stationShip.z);
    const p = this.player;
    p.x = A3.arrive.x; p.z = A3.arrive.z; p.elev = 0; p.vx = 0; p.vz = 0;
    this.rig?.snapTo(p.x, p.z);
    if (!this.crew) this.crew = [this.addStationNpc('brann', 0, 0), this.addStationNpc('mira', 0, 0)];
    this.crew[0].x = p.x - 1.4; this.crew[0].z = p.z + 0.8;
    this.crew[1].x = p.x + 1.3; this.crew[1].z = p.z + 0.6;
    this.crew.forEach((c) => { c.elev = 0; c.follow = true; });
    this.weatherTarget = 0.45;
    this.cutscene = false;
    if (fresh) {
      setTimeout(() => { fadeEl()?.classList.remove('on'); this.act3.fading = false; }, 600);
      setTimeout(() => this.setChapter(12, true), 1500);
      this.story.beat('station', 3);
      this.save?.();
    }
  },

  updateStation(dt) {
    const st = this.station;
    if (!st) return;
    const s = this.act3;
    st.heart.rotation.y += dt * (s.ending === 'A' ? 0.1 : 0.6);
    st.rings.forEach((r, i) => { r.rotation.z += dt * (s.ending === 'A' ? 0.05 : 0.8 + i * 0.4); r.rotation.y += dt * 0.3; });
    st.core.scale.setScalar(1 + Math.sin(this.time * 3) * 0.04);
    if (s.ending !== 'A' && this.region(this.player) === 'station' && Math.sin(this.time * 3) > 0.97) this.audio.heartbeat();
    st.screen.material.color.setRGB(0.4, 1.0 + Math.sin(this.time * 9) * 0.3, 0.6);
    for (const t of this.towers || []) {
      t.lamp.visible = t.on && Math.sin(this.time * 2 + t.x) > -0.3;
      if (t.on && Math.random() < dt * 5) {
        const v = t.top.clone().applyMatrix4(t.group.matrixWorld);
        this.fx.puff(v.x, v.y, v.z, { n: 2, size: [2.5, 6], speed: 1.2, up: 2.5, g: -0.6, life: 2.5, color: [0.55, 0.57, 0.6], alpha: 0.55 });
      }
    }
    if (s.phase === 'station' && !s.veraHeard && near(this.player, A3.desk, 2.2)) {
      s.veraHeard = true;
      this.story.beat('veraLast', 0.2);
      setTimeout(() => { this.story.beat('choice'); s.chooseReady = true; this.refreshTiles(); this.save?.(); }, 24000);
    }
  },

  updateStoryNpcs(dt) {
    const p = this.player;
    for (const n of this.storyNpcs || []) {
      if (n.follow && this.act3.phase === 'station') {
        const tgt = n.goal || { x: p.x + (n.kind === 'brann' ? -1.5 : 1.5), z: p.z + 1.0 };
        const dx = tgt.x - n.x, dz = tgt.z - n.z, d = Math.hypot(dx, dz);
        if (d > (n.goal ? 0.1 : 0.8)) { const sp = Math.min(3.6, d * 2); n.x += dx / d * sp * dt; n.z += dz / d * sp * dt; n.facing = lerpAngle(n.facing, Math.atan2(dx, dz), dt * 6); n.moving = 0.6; }
        else { n.moving = 0; n.facing = lerpAngle(n.facing, Math.atan2(p.x - n.x, p.z - n.z), dt * 3); }
      } else n.moving = 0;
      n.model.root.position.set(n.x, n.elev || 0, n.z);
      n.model.root.rotation.y = n.facing;
      n.model.pose(dt, n.moving || 0);
    }
  },

  choose(which) {
    const s = this.act3;
    s.ending = which; s.phase = 'ending'; s.t = 0;
    s.chooseReady = false;
    this.tiles.filter((t) => t.def.id === 'choiceA' || t.def.id === 'choiceB').forEach((t) => { this.scene.remove(t.mesh); });
    this.tiles = this.tiles.filter((t) => t.def.id !== 'choiceA' && t.def.id !== 'choiceB');
    this.story.beat(which === 'A' ? 'endingA' : 'endingB', 0.5);
    if (which === 'A') { const b = this.crew[0]; b.goal = { x: A3.well.x + 1.2, z: A3.well.z + 1.4 }; }
    this.save?.();
  },

  updateEnding(dt) {
    const s = this.act3, st = this.station;
    s.t += dt;
    const t = s.t;
    if (s.ending === 'A') {
      const b = this.crew[0];
      if (t > 7 && !s.brannGone) {
        s.brannGone = true;
        this.fx.puff(b.x, 0.8, b.z, { n: 18, size: [1, 2.5], speed: 2, color: [0.8, 0.9, 1] });
        const m = b.model.root;
        this.world.tween(1.2, (f) => { m.position.y = -f * 1.5; m.scale.setScalar(Math.max(0.001, 1 - f)); }, () => { m.visible = false; });
        b.follow = false;
      }
      if (t > 9) {
        const k = Math.min(1, (t - 9) / 6);
        st.coreM.color.setRGB(0.45 * (1 - k) + 0.12 * k, 0.9 * (1 - k) + 0.14 * k, 1.5 * (1 - k) + 0.18 * k);
        st.light.intensity = 30 * (1 - k); st.halo.material.opacity = 0.8 * (1 - k);
        if (k > 0.5) this.towers.forEach((tw) => { tw.on = false; });
        this.weatherTarget = 0; this.clearSky = Math.min(1, this.clearSky + dt * 0.1);
        if (!s.shake && k > 0.2) { s.shake = true; this.shake = 0.8; this.audio.boom(); }
      }
      if (t > 15 && !s.chap) { s.chap = true; this.setChapter(13, true); }
    } else {
      if (t > 3) {
        const k = Math.min(1, (t - 3) / 4);
        st.coreM.color.setRGB(0.45 + k * 1.2, 0.9 + k * 0.1, 1.5 - k * 1.2);
        st.light.color.setRGB(1, 0.8 - k * 0.2, 1 - k * 0.6);
        st.light.intensity = 30 + k * 30;
        if (!s.flare) { s.flare = true; this.audio.boom(); this.shake = 0.6; this.fx.ring(st.group.position.x - 0.6, st.group.position.z - 3.0, { r0: 1, r1: 20, color: 0xffc070, life: 2, opacity: 0.9 }); }
      }
      if (t > 10 && !s.chap) { s.chap = true; this.setChapter(14, true); }
    }
    if (t > 20 && !s.fading) { s.fading = true; fadeEl()?.classList.add('on'); }
    if (t > 22) this.returnHome(true);
  },

  returnHome(fresh) {
    const s = this.act3;
    s.phase = 'done';
    const p = this.player;
    p.x = A3.ship.x + 3.2; p.z = A3.ship.z + 4.6; p.elev = 0;
    this.rig?.snapTo(p.x, p.z);
    if (this.ship) this.ship.group.position.set(A3.ship.x, 0, A3.ship.z);
    for (const n of this.storyNpcs || []) if (n.kind !== 'gustav') { this.scene.remove(n.model.root); }
    this.storyNpcs = (this.storyNpcs || []).filter((n) => n.kind === 'gustav');
    this.crew = null;
    this.weatherTarget = 0;
    if (s.ending === 'A') {
      if (this.caravan) this.caravan.brann.root.visible = false;
      this.act3.springOn = true;
    } else this.buildGreenhouses(fresh);
    if (fresh) {
      setTimeout(() => fadeEl()?.classList.remove('on'), 500);
      setTimeout(() => this.showFinalCredits(), 3500);
      this.save?.();
    }
  },

  buildGreenhouses(fresh) {
    if (this.greenhouses) return;
    this.greenhouses = GREENHOUSES.map(([x, z], i) => {
      const g = makeGreenhouse(); g.position.set(x, 0, z); this.scene.add(g);
      this.world.circles.push({ x, z, r: 1.75, camp: true });
      if (fresh) this.popIn(g, 0.4 + i * 0.3);
      return g;
    });
  },

  showFinalCredits() {
    const A = this.act3.ending === 'A';
    const $ = (id) => document.getElementById(id);
    $('credits-eyebrow').textContent = A ? 'FIN · LE CIEL RENDU' : 'FIN · LA VILLE-LUMIÈRE';
    $('credits-story').textContent = A
      ? 'Brann est descendu dans le puits pour fermer la vanne que Véra n’avait pas pu fermer seule. Les Tours du Voile se sont tues. Le ciel revient, lentement, pour le monde entier. Et Fort-Aube apprend à vivre sans hiver.'
      : 'Le Cœur de l’Hiver bat désormais pour Fort-Aube. Serres, lumière, chaleur : la ville est devenue le seul refuge chaud d’un monde de glace, et chaque caravane perdue marche vers elle.';
    $('credits-hint').textContent = A ? 'Merci d’avoir joué. Fort-Aube continue de vivre : les caravanes, la ville, et Flocon qui regarde vers le nord.' : 'Merci d’avoir joué. Fort-Aube continue de grandir : les caravanes arrivent, et Brann regarde les lumières depuis le phare.';
    $('credits').classList.add('on');
  },

  updateSpring(dt) {
    if (!this.act3.springOn) return;
    this.spring = Math.min(1, this.spring + dt / 40);
    this.clearSky = Math.max(this.clearSky, this.spring);
  },

  // ---------------------------------------------------------------------
  // Hooks called by Game
  // ---------------------------------------------------------------------
  act3Apply(id, fresh) {
    switch (id) {
      case 'westGate': this.openWest(fresh); return true;
      case 'rail': this.buildRail(fresh); if (fresh) this.story.beat('rail'); return true;
      case 'miner': this.addWorker('miner', fresh, 'gustav'); this.storyNpcs?.filter((n) => n.kind === 'gustav').forEach((n) => { this.scene.remove(n.model.root); n.gone = true; }); if (this.storyNpcs) this.storyNpcs = this.storyNpcs.filter((n) => !n.gone); if (fresh) this.story.beat('miner'); return true;
      case 'drill': this.buildDrill(fresh); if (fresh) this.story.beat('drill'); return true;
      case 'furnace2': { const parts = upgradeForge(this.forge); this.smeltTime = 0.7; if (fresh) { this.popIn(parts); this.story.beat('furnace2'); } return true; }
      case 'cuisine': this.buildCuisine(fresh); if (fresh) this.story.beat('cuisine'); return true;
      case 'cannery': this.buildCannery(fresh); if (fresh) this.story.beat('cannery'); return true;
      case 'cannons': this.turretCd = 0.42; this.turretDmg = 30; this.cannons = true; for (const t of this.turrets) { const parts = upgradeCannon(t.model); if (fresh) this.popIn(parts, t.i * 0.15); } if (fresh) this.story.beat('cannons'); return true;
      case 'sawmill3': { const parts = upgradeSawmill3(this.saw); this.sawTime = 0.3; if (fresh) { this.popIn(parts); this.story.beat('sawmill3'); } return true; }
      case 'market2': this.buildMarket2(fresh); if (fresh) this.story.beat('market2'); return true;
      case 'ship1': case 'ship2': case 'ship3': case 'ship4': this.shipStage(Number(id[4]), fresh); return true;
      case 'depart': if (fresh) this.depart(); return true;
      case 'choiceA': if (fresh) this.choose('A'); return true;
      case 'choiceB': if (fresh) this.choose('B'); return true;
      default: return false;
    }
  },

  act3Stations(dt) {
    const p = this.player;
    if (!this.forge) return;
    if (near(p, A3.orePad, 1.2)) this.transfer(p, this.pads.orePad, 'drop', dt, 0.05);
    if (near(p, A3.steelPad, 1.2)) this.transfer(p, this.pads.steelPad, 'pick', dt, 0.05);
    if (this.cart && near(p, A3.dock, 1.2)) this.transfer(p, this.pads.dockPad, 'drop', dt, 0.05);
    if (this.cannery && near(p, A3.canPad, 1.2)) this.transfer(p, this.pads.canPad, 'pick', dt, 0.05);
  },

  act3Worker(w, dt, arrived, total) {
    if (w.kind !== 'miner') return;
    this.magnet(w, w.state === 'collect' ? 5 : 3.2, 'ore');
    const dest = () => (this.cart ? this.pads.dockPad : this.pads.orePad);
    if (w.state === 'idle') {
      if (total >= w.cap) { w.state = 'deliver'; this.route(w, dest()); return; }
      const n = (this.oreNodes || []).filter((o) => o.alive && !this.workers.some((x) => x !== w && x.node === o)).sort((a, b) => dist(a, w) - dist(b, w))[0];
      if (n) { w.state = 'walk'; w.node = n; const ang = Math.atan2(w.x - n.x, w.z - n.z); this.route(w, { x: n.x + Math.sin(ang) * 1.45, z: n.z + Math.cos(ang) * 1.45, reach: 0.3 }); }
      else if (total > 0) { w.state = 'deliver'; this.route(w, dest()); }
      else { w.state = 'wait'; w.timer = 2; }
    } else if (w.state === 'wait') { w.timer -= dt; if (w.timer <= 0) w.state = 'idle'; }
    else if (w.state === 'walk' && arrived) {
      const n = w.node;
      if (!n.alive) { w.state = 'idle'; w.node = null; return; }
      w.facing = lerpAngle(w.facing, Math.atan2(n.x - w.x, n.z - w.z), dt * 12);
      if (w.swing < 0 && w.swingCd <= 0) { w.swing = 0; w.swingCd = 0.7; w.hitDone = false; }
      if (w.swing >= 0.5 && !w.hitDone) { w.hitDone = true; this.mineOre(n, w); if (!n.alive) { w.timer = 2.5; w.state = 'collect'; w.node = null; } }
    } else if (w.state === 'collect') {
      w.timer -= dt;
      const it = this.loose.find((x) => x.type === 'ore' && !x.claimed && x.owner === w && x.age > 0.3);
      if (it && dist(w, it) > 2.5) w.path = [{ x: it.x, z: it.z, reach: 1.5 }];
      if (w.timer <= 0 || !this.loose.some((x) => x.type === 'ore' && !x.claimed && x.owner === w)) w.state = 'idle';
    } else if (w.state === 'deliver' && arrived) {
      if (this.transfer(w, dest(), 'drop', dt) === 'done') w.state = 'idle';
    }
  },

  act3Objective(p) {
    const s = this.act3;
    if (s.phase === 'relic') return { at: A3.relic, text: 'Rejoins Anouk au lac : quelque chose clignote', icon: 'fish' };
    if (s.phase === 'station') {
      if (!s.veraHeard) return { at: A3.desk, text: 'Entre dans la Station Aube', icon: 'beacon' };
      if (!s.chooseReady) return { at: null, text: 'Écoute le dernier message de Véra', icon: 'heart' };
      return { at: A3.choiceA, text: 'Choisis : rendre le ciel ou garder le Cœur', icon: 'heart' };
    }
    if (s.phase === 'voyage' || s.phase === 'ending') return { at: null, text: s.phase === 'voyage' ? 'Cap au nord' : 'Le monde change…', icon: 'ship' };
    if (!this.forge) return null;
    const oreRoom = this.pads.orePad.n < this.pads.orePad.pile.cap - 2, dockRoom = this.cart && this.pads.dockPad.n < this.pads.dockPad.pile.cap - 2;
    if (p.carry.ore > 0 && (oreRoom || dockRoom) && (this.load_total(p) >= p.cap * 0.5 || !this.nearestOreNode(p, 6))) {
      const dock = dockRoom && (!oreRoom || dist(p, A3.dock) < dist(p, A3.orePad));
      return { at: dock ? A3.dock : A3.orePad, text: 'Porte le minerai à la forge', icon: 'ore' };
    }
    const ship = this.tiles.find((t) => t.def.id.startsWith('ship') || t.def.id === 'depart');
    if (ship) {
      if (ship.def.id === 'depart') return { at: ship.def.at, text: 'Monte à bord du Brise-Glace', icon: 'ship' };
      const left = this.tileItemsLeft(ship);
      if (left.some(([t, n]) => n > 0 && p.carry[t] > 0)) return { at: ship.def.at, text: 'Livre au chantier du Brise-Glace', icon: 'ship' };
    }
    return null;
  },

  act3LateObjective(p) {
    if (!this.forge || this.act3.phase !== 'west') return null;
    const ship = this.tiles.find((t) => t.def.id.startsWith('ship'));
    const need = ship ? this.tileItemsLeft(ship).filter(([, n]) => n > 0).map(([t]) => t) : ['steel'];
    if (need.includes('steel') && this.pads.steelPad.n >= 4) return { at: A3.steelPad, text: 'Ramasse les lingots d’acier', icon: 'ingot' };
    if (need.includes('can') && this.pads.canPad.n >= 4) return { at: A3.canPad, text: 'Ramasse les conserves', icon: 'can' };
    if (need.includes('plank') && this.pads.plankPad.n >= 4) return { at: this.pads.plankPad, text: 'Va chercher du bois fendu', icon: 'log' };
    if (need.includes('steel') || !ship) {
      const n = this.nearestOreNode(p, 200);
      if (n && !this.workers.some((w) => w.kind === 'miner')) return { at: n, text: 'Mine le fer de la falaise', icon: 'ore' };
    }
    return null;
  },

  updateAct3(dt) {
    this.storyTriggers(dt);
    this.updateCub(dt);
    this.updateRelic(dt);
    this.updateOreNodes(dt);
    this.updateForge(dt);
    this.updateCart(dt);
    this.updateDrill(dt);
    this.updateCannery(dt);
    this.updateStation(dt);
    this.updateStoryNpcs(dt);
    this.updateSpring(dt);
    if (this.canopy) this.canopy.gears.forEach((g, i) => { g.rotation.z += dt * (this.cookBusy > 0 ? 2.5 : 0.4) * (i ? -1 : 1); });
    const ph = this.act3.phase;
    if (ph === 'voyage') this.updateVoyage(dt);
    else if (ph === 'ending') this.updateEnding(dt);
  },

  drawAct3(R) {
    const c = this.cart;
    if (c) for (let i = 0; i < c.load; i++) R.add('ore', c.x + ((i % 3) - 1) * 0.28, 0.62 + Math.floor(i / 6) * 0.18, WGZ + (Math.floor(i / 3) % 2 - 0.5) * 0.4, i);
  },

  act3Serialize() {
    const s = this.act3;
    return {
      phase: s.phase, heard: s.heard, veraHeard: s.veraHeard, chooseReady: s.chooseReady, ending: s.ending, relicT: s.relicT,
      ore: this.pads.orePad.n, steel: this.pads.steelPad.n, dock: this.pads.dockPad.n, cans: this.pads.canPad.n, canQ: this.canQ,
    };
  },

  act3Load(d) {
    if (!d) return;
    const s = this.act3;
    s.heard = !!d.heard; s.relicT = d.relicT || 0;
    this.pads.orePad.n = d.ore || 0; this.pads.steelPad.n = d.steel || 0; this.pads.dockPad.n = d.dock || 0; this.pads.canPad.n = d.cans || 0;
    this.canQ = d.canQ || 0;
    const ph = d.phase || 'none';
    if (ph === 'relic') this.spawnRelic(false);
    else if (ph === 'heard') { s.phase = 'heard'; s.heard = true; }
    else if (ph !== 'none') s.phase = this.forge ? 'west' : ph;
    if (ph === 'voyage' || ph === 'station') {
      this.world.shipGate = true; this.world.buildFence(false);
      this.arriveStation(false);
      s.veraHeard = !!d.veraHeard; s.chooseReady = !!d.chooseReady;
      if (s.veraHeard && !s.chooseReady) s.chooseReady = true;
    }
    if (ph === 'ending' || ph === 'done') {
      s.ending = d.ending;
      this.world.shipGate = true; this.world.buildFence(false);
      this.buildStationScene();
      if (s.ending === 'A') this.towers.forEach((t) => { t.on = false; });
      s.afterSaid = true;
      this.returnHome(false);
      if (s.ending === 'A') this.spring = 1;
    }
  },
};

export function installAct3(Game) {
  Object.assign(Game.prototype, methods);
}
