// WithSurvival gameplay: hunting, carried stacks, the cauldron, the counter,
// customers, paid tiles, workers, crossbows, spinning blades and the colossus.
import * as THREE from 'three';
import { makeHuman, makeBear, makeGrill, makeTurret, makeCounter, makeCabin, makeBeacon, makeCampfire, ITEM_HEIGHT, mat, hdr, upgradeGrill, makeAwning, makeMarketDecor, upgradeTurret, makeSled, makeWoodCrib, makeHearth, makeDeck, makeSawmill, upgradeSawmill } from './models.js';
import { padTexture, TileTexture, bubbleTexture, bracketTexture, radialGlowTexture } from './textures.js';
import { STAGES, MEADOW, COUNTER, LANE_QUEUE, LANE_EXIT, inRect, backOut } from './world.js';
import { ACT2_TILES, ACT2_POS, installAct2 } from './act2.js';

const P = (x, z) => ({ x, z });
export const POS = {
  spawn: P(1.6, 3.4),
  sled: P(-4.4, 2.2),
  sellPad: P(-2.2, 2.6),
  brann: P(-4.6, 4.3),
  grill: P(1.0, -1.4),
  grill2: P(3.8, 0.9),
  rawPad: P(3.4, -2.1),
  cookedPad: P(-1.6, 1.0),
  cashier: P(-4.0, 4.3),
  counterDrop: P(-2.2, 4.6),
  cashPad: P(0.6, 4.5),
  gateIn: P(0, -4.4),
  gateOut: P(0, -7.6),
  counterSteak: P(-4.85, COUNTER.z),
  counterLog: P(-3.15, COUNTER.z),
  logPad: P(8.4, -1.0),
  sawmill: P(10.9, -0.9),
  plankPad: P(13.4, -0.9),
};
const TURRETS = [
  { x: -4.6, z: -6, pad: P(-4.6, -4.3) },
  { x: 4.6, z: -6, pad: P(4.6, -4.3) },
  { x: 10.6, z: -6, pad: P(10.6, -4.3) },
  { x: -11, z: -6, pad: P(-11, -4.3) },
];
const CABINS = { 2: [[8.6, 4.4], [15.4, 4.0], [15.2, -3.6]], 3: [[-10.2, 3.6], [-14.4, 3.6], [-14.6, -2.4]] };
const WOOD_CRIB = P(15.9, 0.9);
const BEACON_POS = P(-11.0, -0.4);

// Upgrade tiles bought in the world. Machine upgrades sit right next to the
// machine they improve.
const TILES = [
  { id: 'camp', icon: 'fort', cost: 200, at: P(0, 0.4), req: () => true, label: 'Bâtir le camp' },
  { id: 'cashier', icon: 'person', cost: 50, at: P(-5.6, 1.6), req: (g) => g.bought.camp && g.stats.served >= 2, label: 'Recruter Lina', beat: 'cashierTile' },
  { id: 'grillUp', icon: 'pot', cost: 150, at: P(1.0, 1.3), req: (g) => g.bought.camp && g.stats.cooked >= 12, label: 'Chaudron renforcé', beat: 'grillUpTile' },
  { id: 'axe2', icon: 'axeplus', cost: 100, at: P(5.4, 4.4), req: (g) => g.bought.camp && g.stats.kills >= 5, label: 'Hache d’acier' },
  { id: 'counter2', icon: 'hut', cost: 120, at: P(-1.7, 4.5), req: (g) => g.bought.cashier, label: 'Comptoir couvert', beat: 'counterTile' },
  { id: 'turret1', icon: 'bow', cost: 175, at: TURRETS[0].pad, req: (g) => g.bought.cashier, label: 'Arbalète' },
  { id: 'bag', icon: 'bag', cost: 120, at: P(3.0, 4.6), req: (g) => g.bought.turret1, label: 'Grand sac' },
  { id: 'porter', icon: 'person', cost: 150, at: P(-5.6, -1.2), req: (g) => g.bought.turret1, label: 'Recruter Tomas' },
  { id: 'turret2', icon: 'bow', cost: 175, at: TURRETS[1].pad, req: (g) => g.bought.porter, label: 'Arbalète' },
  { id: 'ballista', icon: 'bow', cost: 300, at: P(-2.4, -3.4), req: (g) => g.bought.turret2, label: 'Balistes' },
  { id: 'whirl', icon: 'blades', cost: 400, at: P(5.8, -0.6), req: (g) => g.bought.porter && g.bought.axe2, label: 'Danse des Lames' },
  { id: 'expand1', icon: 'expand', cost: 500, at: P(5.8, -0.6), req: (g) => g.bought.whirl && g.bought.turret2 && g.bought.grillUp && g.bought.counter2, label: 'Agrandir', beat: 'expandTile' },
  { id: 'grill2', icon: 'pot', cost: 300, at: POS.grill2, req: (g) => g.stage >= 2, label: 'Second chaudron' },
  { id: 'counter3', icon: 'cash', cost: 400, at: P(-1.7, 4.5), req: (g) => g.stage >= 2 && g.bought.counter2, label: 'Étal du marché', beat: 'marketTile' },
  { id: 'sawUp', icon: 'axeplus', cost: 350, at: P(13.6, 1.8), req: (g) => g.stage >= 2 && g.stats.sawn >= 6, label: 'Scie à vapeur', beat: 'sawUpTile' },
  { id: 'lumberjack', icon: 'person', cost: 200, at: P(8.4, 1.6), req: (g) => g.stage >= 2, label: 'Recruter Oleg' },
  { id: 'hunter', icon: 'person', cost: 250, at: P(11.0, 1.8), req: (g) => g.stage >= 2, label: 'Recruter Yuki' },
  { id: 'turret3', icon: 'bow', cost: 250, at: TURRETS[2].pad, req: (g) => g.stage >= 2, label: 'Arbalète' },
  { id: 'bag2', icon: 'bag', cost: 300, at: P(8.4, -3.6), req: (g) => g.bought.lumberjack, label: 'Sac de trappeur' },
  { id: 'whirl2', icon: 'blades', cost: 600, at: P(15.8, -1.3), req: (g) => g.bought.hunter, label: 'Lames tempête' },
  { id: 'expand2', icon: 'expand', cost: 1200, at: P(-5.8, -1.6), req: (g) => g.bought.grill2 && g.bought.hunter && g.bought.lumberjack && g.bought.counter3, label: 'Agrandir' },
  { id: 'turret4', icon: 'bow', cost: 350, at: TURRETS[3].pad, req: (g) => g.stage >= 3, label: 'Arbalète' },
  { id: 'beacon', icon: 'beacon', cost: 2000, at: BEACON_POS, req: (g) => g.bossDown, label: 'Phare de l’Aube', big: true },
  ...ACT2_TILES,
];

const PILE = {
  rawPad: { cols: 3, rows: 3, sp: 0.6, h: ITEM_HEIGHT.raw, cap: 60 },
  cookedPad: { cols: 3, rows: 3, sp: 0.6, h: ITEM_HEIGHT.cooked, cap: 60 },
  cashPad: { cols: 2, rows: 3, sp: 0.6, h: ITEM_HEIGHT.cash, cap: 400, rot: Math.PI / 2 },
  turret: { cols: 3, rows: 3, sp: 0.6, h: ITEM_HEIGHT.raw, cap: 45 },
  logPad: { cols: 2, rows: 3, sp: 0.62, h: ITEM_HEIGHT.log, cap: 40, rot: Math.PI / 2 },
  plankPad: { cols: 2, rows: 3, sp: 0.62, h: ITEM_HEIGHT.plank, cap: 40 },
};
const BILL = 5;

const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;
const easeOut = (t) => 1 - (1 - t) ** 2;
const lerpAngle = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

export class Game {
  constructor(env, save) {
    Object.assign(this, env); // scene, camera, world, forest, items, fx, audio, hud, story
    this.time = 0;
    this.stage = 0;
    this.money = 0;
    this.bought = {};
    this.paidPartial = {};
    this.stats = { kills: 0, served: 0, cooked: 0, chopped: 0, earned: 0, sold: 0, sawn: 0 };
    this.sawTime = 1.1;
    this.sawTimer = 0;
    this.cookTime = 0.9;
    this.serveInterval = 0.2;
    this.priceMult = 1;
    this.queueBonus = 0;
    this.turretCd = 0.85;
    this.turretDmg = 12;
    this.bossDown = false;
    this.beaconLit = false;
    this.chapter = 1;
    this.flying = [];
    this.loose = [];
    this.bears = [];
    this.customers = [];
    this.workers = [];
    this.turrets = [];
    this.npcs = [];
    this.cabins = [];
    this.tiles = [];
    this.bolts = [];
    this.campfires = [];
    this.shake = 0;
    this.zoom = 1;
    this.pads = {
      rawPad: { ...POS.rawPad, n: 0, pile: PILE.rawPad, type: 'raw' },
      cookedPad: { ...POS.cookedPad, n: 0, pile: PILE.cookedPad, type: 'cooked' },
      cashPad: { ...POS.cashPad, n: 0, pile: PILE.cashPad, type: 'cash' },
      counterSteak: { ...POS.counterSteak, n: 0, type: 'cooked', cap: 40 },
      counterLog: { ...POS.counterLog, n: 0, type: 'plank', cap: 40 },
      logPad: { ...POS.logPad, n: 0, pile: PILE.logPad, type: 'log' },
      plankPad: { ...POS.plankPad, n: 0, pile: PILE.plankPad, type: 'plank' },
      turrets: TURRETS.map((t) => ({ ...t.pad, n: 0, pile: PILE.turret, type: 'raw' })),
    };
    this.initAct2();

    this.player = this.makeCarrier(makeHuman({ parka: 0x2c5f9e, pants: 0x262b38, scarf: 0xe2702e }), POS.spawn);
    this.player.cap = 20;
    this.player.isPlayer = true;
    this.player.dmg = 10;
    this.player.whirl = 0;
    this.player.facing = Math.PI * 0.75;
    this.player.knock = { x: 0, z: 0 };
    this.player.stun = 0;
    this.scene.add(this.player.model.root);

    this.buildStaticVisuals();
    this.buildBlades();
    this.buildGuide();

    if (save) this.load(save);
    else {
      this.world.setStage(0, false);
      this.refreshTiles(true);
    }
    if (!this.bought.camp) this.buildSled();
    this.spawnInitialBears();
    this.bubbleCache = new Map();
    this.cookTimer = 0;
    this.custTimer = 2;
    this.payTimer = 0;
    this.transferTimer = 0;
    this.objTimer = 0;
  }

  // -------------------------------------------------------------------------
  // Construction of visuals
  // -------------------------------------------------------------------------
  makeCarrier(model, at) {
    return {
      model, x: at.x, z: at.z, vx: 0, vz: 0, facing: 0,
      carry: { raw: 0, cooked: 0, log: 0, plank: 0, fish: 0, smoked: 0 }, reserved: 0, cap: 10,
      sway: { x: 0, z: 0, vx: 0, vz: 0 }, pvx: 0, pvz: 0,
      swing: -1, swingCd: 0, moving: 0,
    };
  }
  load_total(c) { return c.carry.raw + c.carry.cooked + c.carry.log + c.carry.plank + c.carry.fish + c.carry.smoked + c.reserved; }
  region(q) { return this.world.insideCamp(q.x, q.z) ? 'camp' : this.world.atLake(q.x, q.z) ? 'lake' : 'out'; }

  padMesh(icon, at, { dashed = false, size = 2.0 } = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: padTexture(icon, { dashed }), transparent: true, depthWrite: false }));
    m.position.set(at.x, 0.03, at.z);
    m.renderOrder = 2;
    return m;
  }

  buildStaticVisuals() {
    const camp = new THREE.Group();
    camp.visible = false;
    this.campGroup = camp;
    this.scene.add(camp);
    const grill = makeGrill();
    grill.group.position.set(POS.grill.x, 0, POS.grill.z);
    camp.add(grill.group);
    this.grill = grill;
    this.world.circles.push({ x: POS.grill.x, z: POS.grill.z, r: 1.15, camp: true });
    const hearth = makeHearth(1.75); hearth.position.set(POS.grill.x, 0, POS.grill.z); camp.add(hearth);
    const deck = makeDeck(3.6, 1.7); deck.position.set((COUNTER.x0 + COUNTER.x1) / 2, 0, COUNTER.z + 0.55); camp.add(deck);
    camp.add(this.padMesh('meat', POS.rawPad));
    camp.add(this.padMesh('steak', POS.cookedPad, { dashed: true }));
    camp.add(this.padMesh('cash', POS.cashPad, { dashed: true }));
    const zone = this.padMesh('person', POS.cashier, { dashed: true, size: 2.0 });
    camp.add(zone);
    this.cashierZone = zone;
    const counter = makeCounter(COUNTER.x1 - COUNTER.x0);
    counter.position.set((COUNTER.x0 + COUNTER.x1) / 2, 0, COUNTER.z);
    camp.add(counter);
    this.counterModel = counter;
    this.world.circles.push({ x: -4.65, z: COUNTER.z, r: 0.62, camp: true }, { x: -3.35, z: COUNTER.z, r: 0.62, camp: true });
    // little decorations: barrels, crates
    const crateM = mat(0x8a5a37), snow = mat(0xf6f9fd);
    for (const [x, z] of [[-6.2, 5.2], [-6.3, -5.2]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), crateM); c.position.set(x, 0.35, z); c.rotation.y = Math.random(); c.castShadow = true; camp.add(c);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.82), snow); s.position.set(x, 0.74, z); s.rotation.y = c.rotation.y; camp.add(s);
    }
    this.grillMarks = [];
  }

  buildBlades() {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 0.8, roughness: 0.25 });
    const wood = mat(0x6b4529);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.quadraticCurveTo(0.55, -0.1, 0.5, -0.55); shape.quadraticCurveTo(0.2, -0.42, 0, -0.32); shape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }).rotateX(Math.PI / 2);
    this.bladeParts = [];
    for (let i = 0; i < 12; i++) {
      const arm = new THREE.Group();
      const h = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.07), wood); h.position.x = 1.7; h.castShadow = true; arm.add(h);
      const b = new THREE.Mesh(bladeGeo, steel); b.position.set(2.3, 0.03, 0.05); b.castShadow = true; arm.add(b);
      g.add(arm);
      this.bladeParts.push(arm);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.9, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.y = -0.9;
    g.add(ring);
    g.position.y = 1.0;
    g.scale.setScalar(0.001);
    g.visible = false;
    this.blades = g;
    this.bladeAmt = 0;
    this.scene.add(g);
  }

  buildGuide() {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 4).rotateX(Math.PI), hdr(0.4, 1.6, 0.35));
    this.marker = cone;
    this.scene.add(cone);
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.7); arrowShape.lineTo(0.5, 0); arrowShape.lineTo(0.2, 0); arrowShape.lineTo(0.2, -0.5); arrowShape.lineTo(-0.2, -0.5); arrowShape.lineTo(-0.2, 0); arrowShape.lineTo(-0.5, 0); arrowShape.closePath();
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6bff6b, transparent: true, opacity: 0.85, depthWrite: false }));
    arrow.renderOrder = 3;
    this.arrow = arrow;
    this.scene.add(arrow);
    this.bracket = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: bracketTexture(), transparent: true, depthWrite: false }));
    this.bracket.renderOrder = 3;
    this.bracket.visible = false;
    this.scene.add(this.bracket);
    this.target = null;
  }

  // -------------------------------------------------------------------------
  // Tiles
  // -------------------------------------------------------------------------
  // Brann's trading sled: the only way to earn the first 200 bills.
  buildSled() {
    const sled = makeSled();
    sled.position.set(POS.sled.x, 0, POS.sled.z);
    sled.rotation.y = 0.35;
    this.scene.add(sled);
    const pad = this.padMesh('cash', POS.sellPad, { dashed: true });
    this.scene.add(pad);
    const brann = makeHuman({ parka: 0x8a5a2e, pants: 0x3a2a20, fur: 0xdcd2c0, scarf: 0x2f6db0, tool: null, scale: 1.05 });
    brann.root.position.set(POS.brann.x, 0, POS.brann.z);
    brann.root.rotation.y = 1.4;
    this.scene.add(brann.root);
    this.sled = { group: sled, pad, brann, circle: { x: POS.sled.x, z: POS.sled.z, r: 1.5 } };
    this.world.circles.push(this.sled.circle);
  }

  removeSled(fresh) {
    const s = this.sled;
    if (!s) return;
    this.sled = null;
    this.world.circles = this.world.circles.filter((c) => c !== s.circle);
    this.scene.remove(s.pad);
    const done = () => { this.scene.remove(s.group); this.scene.remove(s.brann.root); };
    if (!fresh) { done(); return; }
    // Brann waves and drags his sled off down the southern trail
    const sx = s.group.position.x, sz = s.group.position.z;
    this.world.tween(3.2, (f) => {
      const k = f * f;
      s.group.position.set(sx - k * 2, 0, sz + k * 26);
      s.group.rotation.y = 0.35 - k * 0.35;
      s.brann.root.position.set(sx - k * 2 - 0.4, 0, sz + k * 26 + 2.1);
      s.brann.root.rotation.y = 0;
      s.brann.pose(1 / 60, 0.7);
    }, done);
  }

  sellToSled(dt) {
    const p = this.player;
    p.tt = (p.tt || 0) - dt;
    if (p.carry.raw <= 0 || p.tt > 0) return;
    p.tt = 0.08;
    const from = this.stackTop(p, 'raw');
    p.carry.raw--;
    const sled = { x: POS.sled.x, y: 1.2, z: POS.sled.z };
    this.fly('raw', from, () => sled, {
      dur: 0.3, arc: 1.6, onArrive: () => {
        this.audio.drop(this.stats.sold);
        this.stats.sold++;
        this.story.beat('firstSale', 0.2);
        for (let i = 0; i < 2; i++) {
          setTimeout(() => this.fly('cash', sled, () => this.stackTop(p, 'cash'), { dur: 0.35, arc: 1.4, onArrive: () => { this.money += BILL; this.audio.cash(); } }), i * 70);
        }
      },
    });
  }

  // ---- machine upgrades -------------------------------------------------
  popIn(obj, delay = 0) {
    obj.scale.setScalar(0.001);
    this.world.tween(delay + 0.6, (f) => { const k = Math.max(0, (f * (delay + 0.6) - delay) / 0.6); obj.scale.setScalar(Math.max(0.001, backOut(k))); });
  }

  upgradeGrillMachine(fresh) {
    const parts = upgradeGrill(this.grill);
    this.cookTime = 0.6;
    this.world.circles.forEach((c) => { if (c.x === POS.grill.x && c.z === POS.grill.z) c.r = 1.5; });
    if (fresh) { this.popIn(parts); this.fx.sparks(POS.grill.x, 1.5, POS.grill.z, { n: 30, color: [1, 0.6, 0.2], speed: 6 }); }
  }

  upgradeCounter(level, fresh) {
    const len = COUNTER.x1 - COUNTER.x0;
    if (level === 2) {
      const aw = makeAwning(len); this.counterModel.add(aw);
      this.serveInterval = 0.12; this.queueBonus = 2;
      if (fresh) this.popIn(aw);
    } else {
      const deco = makeMarketDecor(len); this.counterModel.add(deco);
      this.priceMult = 1.3;
      if (fresh) this.popIn(deco);
    }
  }

  upgradeTurrets(fresh) {
    this.turretCd = 0.5; this.turretDmg = 18;
    for (const t of this.turrets) if (!t.model.level) { const parts = upgradeTurret(t.model); if (fresh) this.popIn(parts, t.i * 0.15); }
  }

  refreshTiles(initial = false) {
    for (const def of TILES) {
      if (this.bought[def.id]) continue;
      if (this.tiles.some((t) => t.def === def)) continue;
      if (!def.req(this)) continue;
      const tex = new TileTexture(def.icon, def.label);
      const size = def.big ? 2.6 : 2.0;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex.tex, transparent: true, depthWrite: false }));
      m.position.set(def.at.x, 0.05, def.at.z);
      m.renderOrder = 3;
      this.scene.add(m);
      const tile = { def, mesh: m, tex, paid: this.paidPartial[def.id] || 0, inflight: 0, appear: initial ? 1 : 0, half: size / 2, active: false };
      tex.draw(def.cost - tile.paid, tile.paid / def.cost, false);
      this.tiles.push(tile);
      if (!initial) {
        this.fx.ring(def.at.x, def.at.z, { r0: 0.4, r1: 2.2, color: 0xffffff, life: 0.6 });
        if (def.beat) this.story.beat(def.beat, 0.3);
      }
    }
  }

  updateTiles(dt) {
    const p = this.player;
    this.payTimer -= dt;
    for (const tile of this.tiles) {
      if (tile.appear < 1) { tile.appear = Math.min(1, tile.appear + dt * 2.5); }
      const s = backOut(tile.appear) * (1 + (tile.active ? Math.sin(this.time * 10) * 0.03 : 0));
      tile.mesh.scale.set(s, 1, s);
      const inside = Math.abs(p.x - tile.def.at.x) < tile.half * 0.85 && Math.abs(p.z - tile.def.at.z) < tile.half * 0.85;
      const remaining = tile.def.cost - tile.paid - tile.inflight;
      const active = inside && this.money > 0 && remaining > 0;
      if (active !== tile.active) { tile.active = active; tile.tex.draw(tile.def.cost - tile.paid, tile.paid / tile.def.cost, active); }
      if (active && this.payTimer <= 0) {
        this.payTimer = 0.035;
        const step = Math.max(BILL, Math.round(tile.def.cost / 40 / BILL) * BILL);
        const amt = Math.min(step, remaining, this.money);
        this.money -= amt;
        tile.inflight += amt;
        const from = this.stackTop(p, 'cash');
        this.fly('cash', from, () => ({ x: tile.def.at.x, y: 0.1, z: tile.def.at.z }), {
          dur: 0.28, arc: 1.2, onArrive: () => {
            tile.inflight -= amt; tile.paid += amt;
            this.paidPartial[tile.def.id] = tile.paid;
            tile.tex.draw(tile.def.cost - tile.paid, tile.paid / tile.def.cost, tile.active);
            this.audio.pay();
            if (tile.paid >= tile.def.cost && !tile.done) { tile.done = true; this.completeTile(tile); }
          },
        });
      }
    }
  }

  completeTile(tile) {
    const def = tile.def;
    this.bought[def.id] = true;
    delete this.paidPartial[def.id];
    this.scene.remove(tile.mesh);
    tile.mesh.material.map.dispose();
    this.tiles = this.tiles.filter((t) => t !== tile);
    this.audio.build();
    this.fx.puff(def.at.x, 0.4, def.at.z, { n: 18, speed: 5, size: [0.8, 2.0], life: 0.7, alpha: 0.7 });
    this.fx.ring(def.at.x, def.at.z, { r0: 0.5, r1: 4, color: 0x8cff7a, life: 0.7 });
    this.fx.sparks(def.at.x, 0.6, def.at.z, { n: 24, color: [1, 0.85, 0.3], speed: 7 });
    this.applyUpgrade(def.id, true);
    this.refreshTiles();
    this.save?.();
  }

  applyUpgrade(id, fresh) {
    const p = this.player;
    switch (id) {
      case 'camp': this.setStage(1, fresh); this.removeSled(fresh); if (fresh) this.story.beat('camp', 1.2); break;
      case 'grillUp': this.upgradeGrillMachine(fresh); if (fresh) this.story.beat('grillUp'); break;
      case 'counter2': this.upgradeCounter(2, fresh); if (fresh) this.story.beat('counter2'); break;
      case 'counter3': this.upgradeCounter(3, fresh); if (fresh) this.story.beat('counter3'); break;
      case 'ballista': this.upgradeTurrets(fresh); if (fresh) this.story.beat('ballista'); break;
      case 'sawUp': { const parts = upgradeSawmill(this.saw); this.sawTime = 0.55; if (fresh) { this.popIn(parts); this.story.beat('sawUp'); } break; }
      case 'cashier': this.addWorker('cashier', fresh); if (fresh) this.story.beat('cashier'); break;
      case 'porter': this.addWorker('porter', fresh); if (fresh) this.story.beat('porter'); break;
      case 'hunter': this.addWorker('hunter', fresh); if (fresh) this.story.beat('hunter'); break;
      case 'lumberjack': this.addWorker('lumberjack', fresh); if (fresh) this.story.beat('lumberjack'); break;
      case 'axe2':
        p.dmg = 18;
        p.model.tool.children[1].material = new THREE.MeshStandardMaterial({ color: 0xffd36b, metalness: 0.8, roughness: 0.3, emissive: 0x553300 });
        if (fresh) this.story.beat('axe2');
        break;
      case 'bag': p.cap = 35; break;
      case 'bag2': p.cap = 60; break;
      case 'turret1': this.addTurret(0, fresh); if (fresh) { this.story.beat('turret1'); this.setChapter(2, fresh); } break;
      case 'turret2': this.addTurret(1, fresh); break;
      case 'turret3': this.addTurret(2, fresh); break;
      case 'turret4': this.addTurret(3, fresh); break;
      case 'whirl': p.whirl = 1; if (fresh) this.story.beat('whirl'); break;
      case 'whirl2': p.whirl = 2; break;
      case 'grill2': this.addGrill2(fresh); if (fresh) this.story.beat('grill2'); break;
      case 'expand1': this.setStage(2, fresh); if (fresh) { this.setChapter(3, fresh); this.story.beat('expand1', 1.0); } break;
      case 'expand2': this.setStage(3, fresh); if (fresh) { this.setChapter(4, fresh); this.story.beat('expand2', 1.0); setTimeout(() => this.spawnBoss(), 6000); } break;
      case 'beacon': this.lightBeacon(fresh); break;
      default: this.act2Apply(id, fresh); break;
    }
  }

  setChapter(n, fresh) {
    if (n < this.chapter || (n === this.chapter && !(fresh && n === 1))) return;
    this.chapter = n;
    if (fresh) setTimeout(() => this.story.chapter(n), 400);
  }

  setStage(stage, fresh) {
    this.stage = stage;
    this.world.setStage(stage, fresh);
    this.campGroup.visible = true;
    if (fresh && stage === 1) {
      this.campGroup.scale.setScalar(0.001);
      this.world.tween(0.8, (f) => this.campGroup.scale.setScalar(Math.max(0.001, backOut(f))));
      this.shake = 0.5;
      setTimeout(() => this.setChapter(1, true), 600);
    }
    // trees inside the new clearing disappear
    let k = 0;
    for (const t of this.forest.trees) {
      if (t.clearStage <= stage && t.alive) {
        if (fresh) {
          const d = Math.hypot(t.x - this.player.x, t.z - this.player.z);
          this.forest.poof(t, d * 0.03, () => this.fx.puff(t.x, 2.2, t.z, { n: 6, speed: 2.5, size: [2.5, 5], life: 0.9 }));
          k++;
        } else { t.alive = false; t.k = 0; this.forest.write(t); }
      }
    }
    if (stage >= 2) {
      this.wood = true;
      if (!this.saw) {
        this.saw = makeSawmill();
        this.saw.group.position.set(POS.sawmill.x, 0, POS.sawmill.z);
        this.scene.add(this.saw.group);
        this.sawPads = [this.padMesh('log', POS.logPad), this.padMesh('log', POS.plankPad, { dashed: true })];
        this.sawPads.forEach((m) => this.scene.add(m));
        this.world.circles.push({ x: POS.sawmill.x, z: POS.sawmill.z, r: 1.45, camp: true });
        if (fresh) { this.popIn(this.saw.group, 0.5); this.sawPads.forEach((m) => this.popIn(m, 0.7)); }
      }
      if (!this.crib) {
        this.crib = makeWoodCrib();
        this.crib.group.position.set(WOOD_CRIB.x, 0, WOOD_CRIB.z);
        this.scene.add(this.crib.group);
        this.world.circles.push({ x: WOOD_CRIB.x, z: WOOD_CRIB.z, r: 1.1, camp: true });
      }
    }
    if (CABINS[stage]) CABINS[stage].forEach(([x, z], i) => this.addCabin(x, z, i, fresh));
    this.computeChoppable();
  }

  addCabin(x, z, i, fresh) {
    if (this.cabins.some((c) => c.x === x && c.z === z)) return;
    const g = makeCabin(i);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const fire = makeCampfire();
    fire.group.position.set(x + (x > 0 ? -2.2 : 2.2), 0, z + (z > 0 ? -2.4 : 2.4));
    this.scene.add(fire.group);
    this.campfires.push(fire);
    const cab = { x, z, g, smokeT: Math.random() };
    this.cabins.push(cab);
    this.world.circles.push({ x, z, r: 2.0, camp: true });
    if (fresh) {
      g.scale.setScalar(0.001);
      fire.group.scale.setScalar(0.001);
      const delay = 0.4 + i * 0.25;
      this.world.tween(delay + 0.7, (f) => { const k = Math.max(0, (f * (delay + 0.7) - delay) / 0.7); g.scale.setScalar(Math.max(0.001, backOut(k))); fire.group.scale.setScalar(Math.max(0.001, backOut(k))); });
      setTimeout(() => this.fx.puff(x, 0.6, z, { n: 20, speed: 5, size: [2, 4.5] }), delay * 1000);
    }
    for (let n = 0; n < 2; n++) this.addNpc(x, z, fresh);
  }

  addNpc(x, z, fresh, zone = null) {
    const colors = [0x3f7fbf, 0xb24a3a, 0x5a8f4a, 0x8a5ab0, 0xc08a2a, 0x4a9aa0];
    const m = makeHuman({ parka: colors[Math.floor(Math.random() * colors.length)], tool: null, scale: 0.92 });
    const npc = { model: m, x: x + rand(-2, 2), z: z + rand(-2, 2), tx: x, tz: z, wait: rand(0, 3), home: P(x, z), facing: 0, zone };
    m.root.position.set(npc.x, 0, npc.z);
    this.scene.add(m.root);
    if (fresh) { m.root.scale.setScalar(0.001); this.world.tween(0.6, (f) => m.root.scale.setScalar(Math.max(0.001, backOut(f) * 0.92))); }
    this.npcs.push(npc);
  }

  addGrill2(fresh) {
    const g = makeGrill();
    g.group.position.set(POS.grill2.x, 0, POS.grill2.z);
    this.scene.add(g.group);
    this.grill2 = g;
    this.world.circles.push({ x: POS.grill2.x, z: POS.grill2.z, r: 1.15, camp: true });
    if (fresh) { g.group.scale.setScalar(0.001); this.world.tween(0.7, (f) => g.group.scale.setScalar(Math.max(0.001, backOut(f)))); }
  }

  addTurret(i, fresh) {
    const def = TURRETS[i];
    const t = makeTurret();
    t.group.position.set(def.x, 0, def.z);
    this.scene.add(t.group);
    const pad = this.padMesh('meat', def.pad);
    this.scene.add(pad);
    this.turrets.push({ i, def, model: t, cd: rand(0, 1), pad: this.pads.turrets[i], aim: Math.PI });
    if (this.bought.ballista) upgradeTurret(t);
    if (fresh) { t.group.scale.setScalar(0.001); this.world.tween(0.7, (f) => t.group.scale.setScalar(Math.max(0.001, backOut(f)))); }
  }

  lightBeacon(fresh) {
    const b = makeBeacon();
    b.group.position.set(BEACON_POS.x, 0, BEACON_POS.z);
    this.scene.add(b.group);
    this.beacon = b;
    this.world.circles.push({ x: BEACON_POS.x, z: BEACON_POS.z, r: 2.3, camp: true });
    this.beaconLit = true;
    b.flame.visible = true;
    if (fresh) {
      b.group.scale.set(1, 0.001, 1);
      this.world.tween(1.4, (f) => b.group.scale.set(1, Math.max(0.001, backOut(f)), 1), () => {
        this.audio.fanfare();
        this.world.tween(2.5, (f) => { b.beam.material.opacity = f * 0.35; b.light.intensity = f * 60; });
        this.zoomPulse = 4;
        this.story.beat('beacon', 0.5);
        setTimeout(() => this.story.chapter(5), 2500);
        this.chapter = 5;
        this.startAct2(true);
      });
    } else { b.beam.material.opacity = 0.35; b.light.intensity = 60; this.chapter = Math.max(this.chapter, 5); this.startAct2(false); }
  }

  // -------------------------------------------------------------------------
  // Workers
  // -------------------------------------------------------------------------
  addWorker(kind, fresh) {
    const looks = {
      cashier: { parka: 0xc0394b, pants: 0x2b2b35, scarf: 0xf2d24b, tool: null },
      porter: { parka: 0x3f9b5a, pants: 0x2b2b35, tool: null },
      hunter: { parka: 0x6b4fc4, pants: 0x2b2b35, scarf: 0xeeeeee, tool: 'axe' },
      lumberjack: { parka: 0xb06a2c, pants: 0x3a2a20, tool: 'axe' },
      courier: { parka: 0xd08a2a, pants: 0x2b2b35, scarf: 0x3a6ea5, tool: null },
      fisher: { parka: 0x2f8f8a, pants: 0x2b2b35, fur: 0xe9e2d0, tool: null },
    }[kind];
    const spawnAt = kind === 'hunter' || kind === 'lumberjack' ? POS.gateIn : kind === 'fisher' ? ACT2_POS.fishPad : kind === 'courier' ? ACT2_POS.relay : P(POS.cashier.x + 1, POS.cashier.z - 1);
    const w = this.makeCarrier(makeHuman(looks), spawnAt);
    w.kind = kind; w.state = 'idle'; w.path = []; w.cap = kind === 'porter' ? 12 : 10; w.timer = 0; w.speed = kind === 'hunter' ? 5 : 4.5;
    w.dmg = 14;
    this.scene.add(w.model.root);
    this.workers.push(w);
    if (fresh) {
      this.fx.puff(spawnAt.x, 0.6, spawnAt.z, { n: 16, size: [1.4, 3] });
      w.model.root.scale.setScalar(0.001);
      this.world.tween(0.5, (f) => w.model.root.scale.setScalar(Math.max(0.001, backOut(f))));
    }
  }

  route(w, to) {
    const ra = this.region(w), rb = this.region(to);
    const N = [POS.gateIn, POS.gateOut], S = [ACT2_POS.sgIn, ACT2_POS.sgOut];
    let via = [];
    if (ra === rb) via = [];
    else if (ra === 'camp') via = rb === 'out' ? N : S;
    else if (rb === 'camp') via = ra === 'out' ? [N[1], N[0]] : [S[1], S[0]];
    else if (ra === 'lake') via = [S[1], S[0], N[0], N[1]];
    else via = [N[1], N[0], S[0], S[1]];
    w.path = [...via, to];
  }

  stepWorker(w, dt) {
    let moving = 0;
    if (w.path.length) {
      const tgt = w.path[0];
      const dx = tgt.x - w.x, dz = tgt.z - w.z, d = Math.hypot(dx, dz);
      const reach = w.path.length > 1 ? 0.5 : (tgt.reach || 0.35);
      if (d < reach) w.path.shift();
      else {
        const sp = Math.min(d / dt, w.speed);
        w.vx = dx / d * sp; w.vz = dz / d * sp;
        w.x += w.vx * dt; w.z += w.vz * dt;
        w.facing = lerpAngle(w.facing, Math.atan2(dx, dz), Math.min(1, dt * 10));
        moving = 1;
      }
    }
    if (!moving) { w.vx = 0; w.vz = 0; }
    w.moving = moving;
    return !w.path.length;
  }

  updateWorker(w, dt) {
    w.swingCd -= dt;
    const arrived = this.stepWorker(w, dt);
    const total = this.load_total(w);
    switch (w.kind) {
      case 'cashier': {
        if (w.state === 'idle') { this.route(w, { ...POS.cashier, reach: 0.15 }); w.state = 'go'; }
        if (arrived) { w.facing = lerpAngle(w.facing, 0, dt * 6); w.atPost = true; }
        break;
      }
      case 'porter': {
        if (w.state === 'idle') {
          const tp = this.pads.turrets.find((pd) => pd.n > 0);
          if (this.pads.cookedPad.n > 0 && this.pads.counterSteak.n < this.pads.counterSteak.cap) { w.state = 'toCooked'; this.route(w, POS.cookedPad); }
          else if (this.saw && this.pads.plankPad.n > 0 && this.pads.counterLog.n < this.pads.counterLog.cap) { w.state = 'toPlank'; this.route(w, POS.plankPad); }
          else if (this.fumoir && this.pads.smokedPad.n > 0 && this.pads.counterFish.n < this.pads.counterFish.cap) { w.state = 'toSmoked'; this.route(w, this.pads.smokedPad); }
          else if (tp && this.pads.rawPad.n < PILE.rawPad.cap) { w.state = 'toTurret'; w.tp = tp; this.route(w, tp); }
          else { w.state = 'wait'; w.timer = 1; this.route(w, P(-0.6, -2.8)); }
        } else if (w.state === 'wait') { w.timer -= dt; if (w.timer <= 0) w.state = 'idle'; }
        else if (w.state === 'toCooked' && arrived) {
          if (this.transfer(w, this.pads.cookedPad, 'pick', dt) === 'done' || total >= w.cap) { w.state = 'toCounter'; this.route(w, POS.counterDrop); }
        } else if (w.state === 'toSmoked' && arrived) {
          if (this.transfer(w, this.pads.smokedPad, 'pick', dt) === 'done' || total >= w.cap) { w.state = 'toCounter'; this.route(w, POS.counterDrop); }
        } else if (w.state === 'toPlank' && arrived) {
          if (this.transfer(w, this.pads.plankPad, 'pick', dt) === 'done' || total >= w.cap) { w.state = 'toCounter'; this.route(w, POS.counterDrop); }
        } else if (w.state === 'toCounter' && arrived) {
          if (this.dropToCounter(w, dt) === 'done') w.state = 'idle';
        } else if (w.state === 'toTurret' && arrived) {
          if (this.transfer(w, w.tp, 'pick', dt) === 'done' || total >= w.cap) { w.state = 'toRaw'; this.route(w, POS.rawPad); }
        } else if (w.state === 'toRaw' && arrived) {
          if (this.transfer(w, this.pads.rawPad, 'drop', dt) === 'done') w.state = 'idle';
        }
        break;
      }
      case 'hunter': {
        this.magnet(w, 3.2);
        if (w.state === 'idle') {
          if (total >= w.cap || (total > 0 && !this.bears.some((b) => !b.dead && !b.boss))) { w.state = 'return'; this.route(w, POS.rawPad); break; }
          const b = this.nearestBear(w, 60, true);
          if (b) { w.state = 'hunt'; w.prey = b; this.route(w, b); w.timer = 0.6; }
          else { w.state = 'wait'; w.timer = 1.5; }
        } else if (w.state === 'wait') { w.timer -= dt; if (w.timer <= 0) w.state = 'idle'; }
        else if (w.state === 'hunt') {
          const b = w.prey;
          if (!b || b.dead || total >= w.cap) { w.state = 'idle'; break; }
          w.timer -= dt;
          if (w.timer <= 0) { w.timer = 0.5; if (!this.world.insideCamp(w.x, w.z)) w.path = [b]; else this.route(w, b); }
          if (dist(w, b) < 1.3 + b.radius) {
            w.path = [];
            w.facing = lerpAngle(w.facing, Math.atan2(b.x - w.x, b.z - w.z), dt * 12);
            if (w.swing < 0 && w.swingCd <= 0) { w.swing = 0; w.swingCd = 0.62; w.hitDone = false; }
            if (w.swing >= 0.5 && !w.hitDone) { w.hitDone = true; this.damageBear(b, w.dmg, w); }
          }
        } else if (w.state === 'return' && arrived) {
          if (this.transfer(w, this.pads.rawPad, 'drop', dt) === 'done') w.state = 'idle';
        }
        break;
      }
      case 'lumberjack': {
        this.magnet(w, w.state === 'collect' ? 5 : 3.2, 'log');
        if (w.state === 'idle') {
          if (total >= w.cap) { w.state = 'deliver'; this.route(w, POS.logPad); break; }
          const t = this.nearestChoppable(w, true);
          if (t) { w.state = 'walk'; w.tree = t; this.route(w, { x: t.sx, z: t.sz, reach: 0.3 }); }
          else if (total > 0) { w.state = 'deliver'; this.route(w, POS.logPad); }
          else { w.state = 'wait'; w.timer = 2; }
        } else if (w.state === 'wait') { w.timer -= dt; if (w.timer <= 0) w.state = 'idle'; }
        else if (w.state === 'walk' && arrived) {
          const t = w.tree;
          if (!t.alive) { w.state = 'idle'; break; }
          w.facing = lerpAngle(w.facing, Math.atan2(t.x - w.x, t.z - w.z), dt * 12);
          if (w.swing < 0 && w.swingCd <= 0) { w.swing = 0; w.swingCd = 0.7; w.hitDone = false; }
          if (w.swing >= 0.5 && !w.hitDone) { w.hitDone = true; this.chopTree(t, w); if (!t.alive) { w.timer = 3; w.state = 'collect'; } }
        } else if (w.state === 'collect') {
          // wait for the tree to fall, then walk over to the logs
          if (!w.tree || !w.tree.anim) w.timer -= dt;
          const log = this.loose.find((it) => it.type === 'log' && !it.claimed && it.owner === w && it.age > 0.3);
          if (log && dist(w, log) > 2.5) w.path = [{ x: log.x, z: log.z, reach: 1.5 }];
          if (w.timer <= 0 || (w.timer < 2 && !this.loose.some((it) => it.type === 'log' && !it.claimed && it.owner === w))) w.state = 'idle';
        }
        else if (w.state === 'deliver' && arrived) {
          if (this.transfer(w, this.pads.logPad, 'drop', dt) === 'done') w.state = 'idle';
        }
        break;
      }
      default: this.act2Worker(w, dt, arrived, total); break;
    }
    if (w.swing >= 0) { w.swing += dt / 0.45; if (w.swing >= 1) w.swing = -1; }
  }

  // Item transfer between a carrier and a pad, throttled per carrier.
  transfer(c, pad, dir, dt, rate = 0.07) {
    c.tt = (c.tt || 0) - dt;
    const type = pad.type;
    const cap = pad.pile ? pad.pile.cap : pad.cap;
    if (dir === 'pick') {
      if (pad.n - (pad.inflight || 0) <= 0) return 'done';
      if (type !== 'cash' && this.load_total(c) >= c.cap) return 'done';
      if (c.tt > 0) return 'busy';
      c.tt = rate;
      const from = this.pickPos(pad);
      pad.n--;
      if (type === 'cash') {
        this.fly('cash', from, () => this.stackTop(c, 'cash'), { dur: 0.25, arc: 1.4, onArrive: () => { this.money += BILL; this.audio.cash(); } });
      } else {
        c.reserved++;
        this.fly(type, from, () => this.stackTop(c, type), { dur: 0.25, arc: 1.2, dest: c, onArrive: () => { c.reserved--; c.carry[type]++; if (c.isPlayer) this.audio.pop(c.carry[type]); } });
      }
      return 'busy';
    }
    if (c.carry[type] <= 0) return 'done';
    if (pad.n >= cap) return 'done';
    if (c.tt > 0) return 'busy';
    c.tt = rate;
    const from = this.stackTop(c, type);
    c.carry[type]--;
    const tgt = this.incoming(pad);
    this.fly(type, from, tgt, { dur: 0.26, arc: 1.3, onArrive: () => { pad.inflight--; if (c.isPlayer) this.audio.drop(pad.n); } });
    return 'busy';
  }

  dropToCounter(c, dt) {
    const a = c.carry.cooked > 0 ? this.transfer(c, this.pads.counterSteak, 'drop', dt) : 'done';
    if (a === 'busy') return 'busy';
    const b = c.carry.smoked > 0 ? this.transfer(c, this.pads.counterFish, 'drop', dt) : 'done';
    if (b === 'busy') return 'busy';
    return c.carry.plank > 0 ? this.transfer(c, this.pads.counterLog, 'drop', dt) : 'done';
  }
  counterPad(type) { return type === 'plank' ? this.pads.counterLog : type === 'smoked' ? this.pads.counterFish : this.pads.counterSteak; }

  // -------------------------------------------------------------------------
  // Positions of stacked items
  // -------------------------------------------------------------------------
  columns(c) {
    const cols = [];
    if (c.isPlayer && this.money > 0) cols.push('cash');
    for (const t of ['raw', 'cooked', 'log', 'plank', 'fish', 'smoked']) if (c.carry[t] > 0 || this.reservedType(c, t)) cols.push(t);
    return cols;
  }
  reservedType(c, t) { return c.reserved > 0 && this.flying.some((f) => f.dest === c && f.type === t); }
  columnCount(c, type) { return type === 'cash' ? Math.min(90, Math.ceil(this.money / BILL)) : c.carry[type]; }

  stackLocal(c, type, idx, cols = this.columns(c)) {
    let k = cols.indexOf(type);
    if (k < 0) { cols.push(type); k = cols.length - 1; }
    const n = cols.length;
    const lx = (k - (n - 1) / 2) * 0.62;
    const h = idx * ITEM_HEIGHT[type];
    const base = 0.78;
    const bend = (h / 2) ** 1.6;
    const sin = Math.sin(c.facing), cos = Math.cos(c.facing);
    // local back offset, rotated by facing
    const bx = lx * cos + -0.62 * sin, bz = -lx * sin + -0.62 * cos;
    return { x: c.x + bx + c.sway.x * bend, y: base + h, z: c.z + bz + c.sway.z * bend, k, bend };
  }
  stackTop(c, type) { return this.stackLocal(c, type, this.columnCount(c, type)); }

  pilePos(pad, i) {
    if (!pad.pile) { // counter: two side by side columns
      const col = i % 2, lvl = Math.floor(i / 2);
      return { x: pad.x + (col - 0.5) * 0.36, y: 0.98 + lvl * ITEM_HEIGHT[pad.type], z: pad.z + (col - 0.5) * 0.12 };
    }
    const { cols, rows, sp, h } = pad.pile;
    const per = cols * rows;
    const lvl = Math.floor(i / per), r = i % per;
    const cx = r % cols, cz = Math.floor(r / cols);
    return { x: pad.x + (cx - (cols - 1) / 2) * sp, y: 0.06 + lvl * h, z: pad.z + (cz - (rows - 1) / 2) * sp * (pad.type === 'cash' ? 0.6 : 1) };
  }
  pickPos(pad) { return this.pilePos(pad, Math.max(0, pad.n - (pad.inflight || 0) - 1)); }
  // Reserve a slot on a pad for an incoming item and return its target getter.
  incoming(pad) {
    pad.n++; pad.inflight = (pad.inflight || 0) + 1;
    const idx = pad.n - 1;
    return () => this.pilePos(pad, Math.max(0, Math.min(idx, pad.n - 1)));
  }

  // -------------------------------------------------------------------------
  // Flying and loose items
  // -------------------------------------------------------------------------
  fly(type, from, target, { dur = 0.3, arc = 1, onArrive, dest = null, spin = 0 } = {}) {
    this.flying.push({ type, sx: from.x, sy: from.y, sz: from.z, target, t: 0, dur, arc, onArrive, dest, spin: spin || rand(-8, 8), x: from.x, y: from.y, z: from.z });
  }

  burst(type, x, y, z, n, { owner = null, pad = null, speed = 4.5 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.5 + Math.random() * 0.7);
      this.loose.push({ type, x, y, z, vx: Math.cos(a) * sp, vy: 4 + Math.random() * 4, vz: Math.sin(a) * sp, age: 0, rot: Math.random() * 6, spin: rand(-10, 10), owner, pad });
    }
  }

  magnet(c, r, onlyType = null) {
    if (this.load_total(c) >= c.cap) return;
    for (const it of this.loose) {
      if (it.claimed || it.age < 0.35 || it.pad) continue;
      if (onlyType && it.type !== onlyType) continue;
      if (it.owner && it.owner !== c && it.age < 4) continue;
      if (!near(it, c, r)) continue;
      if (this.load_total(c) >= c.cap) { if (c.isPlayer && this.story.beat('full')) { /* once */ } return; }
      it.claimed = true;
      c.reserved++;
      const type = it.type;
      this.fly(type, it, () => this.stackTop(c, type), { dur: 0.32, arc: 1.6, dest: c, onArrive: () => { c.reserved--; c.carry[type]++; if (c.isPlayer) { this.audio.pop(c.carry[type]); this.onPlayerGot(type); } } });
    }
  }

  onPlayerGot(type) {
    if (type === 'raw') this.story.beat('firstMeat');
    if (type === 'log') this.story.beat('firstLog');
  }

  updateItems(dt) {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      const tg = f.target();
      const e = easeOut(k);
      f.x = f.sx + (tg.x - f.sx) * e;
      f.z = f.sz + (tg.z - f.sz) * e;
      f.y = f.sy + (tg.y - f.sy) * k + f.arc * 4 * k * (1 - k);
      f.rot = (f.rot || 0) + f.spin * dt * (1 - k);
      if (k >= 1) { this.flying.splice(i, 1); f.onArrive && f.onArrive(); }
    }
    for (let i = this.loose.length - 1; i >= 0; i--) {
      const it = this.loose[i];
      if (it.claimed) { this.loose.splice(i, 1); continue; }
      it.age += dt;
      if (it.y > 0.07 || it.vy > 0) {
        it.vy -= 22 * dt;
        it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
        it.rot += it.spin * dt;
        if (it.y <= 0.07) { it.y = 0.07; it.vy = it.vy < -4 ? -it.vy * 0.3 : 0; it.vx *= 0.5; it.vz *= 0.5; it.spin *= 0.5; }
      }
      if (it.pad && it.age > 0.4) {
        const pad = it.pad;
        if (pad.n < pad.pile.cap) {
          it.claimed = true;
          this.fly(it.type, it, this.incoming(pad), { dur: 0.5, arc: 2.5, onArrive: () => { pad.inflight--; } });
        } else it.pad = null;
      }
      if (it.age > 90) this.loose.splice(i, 1);
    }
  }

  // -------------------------------------------------------------------------
  // Bears
  // -------------------------------------------------------------------------
  bearTarget() { return [0, 7, 11, 15, 18, 22, 22, 24, 24][this.chapter] || 24; }

  spawnInitialBears() {
    const n = this.bearTarget();
    for (let i = 0; i < n; i++) this.spawnBear(rand(MEADOW.x0 + 3, MEADOW.x1 - 3), rand(MEADOW.z0 + 3, -12));
  }

  spawnBear(x, z, { boss = false } = {}) {
    const size = boss ? 2.7 : rand(0.92, 1.12);
    const model = makeBear({ scale: size, boss, color: boss ? 0xe8f2fb : 0xf3f1ea });
    model.root.position.set(x, 0, z);
    this.scene.add(model.root);
    this.scene.add(model.bar);
    const hp = boss ? 1400 : 30;
    const b = { x, z, model, hp, max: hp, size, radius: 1.0 * size, rot: rand(0, 6), state: 'wander', tx: x, tz: z, timer: rand(0, 3), speed: boss ? 1.7 : rand(1.0, 1.5), aggro: 0, attack: -1, flash: 0, dead: false, boss, moving: 0, slam: null };
    if (boss) { b.state = 'enter'; b.tx = 2; b.tz = -14; }
    this.bears.push(b);
    if (!boss) {
      model.root.scale.setScalar(0.001);
      this.world.tween(0.5, (f) => model.root.scale.setScalar(Math.max(0.001, backOut(f) * size)));
    }
    return b;
  }

  spawnBoss() {
    if (this.bossDown || this.bears.some((b) => b.boss)) return;
    const b = this.spawnBear(4, MEADOW.z0 - 6, { boss: true });
    this.boss = b;
    this.shake = 1.2;
    this.audio.boom();
    this.story.beat('boss', 1);
    // knock down a line of trees as it arrives
    for (const t of this.forest.near(4, MEADOW.z0 - 4, 7)) if (t.alive && t.clearStage === Infinity) this.forest.fell(t, rand(-0.5, 0.5), 1, () => {});
  }

  nearestBear(from, r, noBoss = false) {
    let best = null, bd = r * r;
    for (const b of this.bears) {
      if (b.dead || (noBoss && b.boss)) continue;
      const d = (b.x - from.x) ** 2 + (b.z - from.z) ** 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  damageBear(b, dmg, src) {
    if (b.dead) return;
    b.hp -= dmg;
    b.flash = 1;
    b.aggro = 5;
    b.foe = src && src.isPlayer ? this.player : src && src.kind ? src : b.foe;
    this.audio.hit();
    const hx = b.x, hz = b.z;
    this.fx.sparks(hx, 1.2 * b.size, hz, { n: 7, color: [1, 0.35, 0.55] });
    this.fx.flash(hx, 1.1 * b.size, hz, { size: 2.6 * b.size, color: [1, 0.3, 0.55], life: 0.18 });
    this.fx.puff(hx, 0.8, hz, { n: 3, size: [0.8, 1.6], speed: 2, color: [1, 0.8, 0.85], alpha: 0.6 });
    if (Math.random() < 0.25) this.audio.growl();
    if (b.hp <= 0) this.killBear(b, src);
  }

  killBear(b, src) {
    b.dead = true;
    this.stats.kills++;
    this.audio.splat();
    const n = b.boss ? 40 : 5;
    const fromTurret = src && src.turret;
    this.burst('raw', b.x, 1.2 * b.size, b.z, n, { owner: src && src.kind === 'hunter' ? src : (src && src.isPlayer ? this.player : null), pad: fromTurret ? src.pad : null, speed: b.boss ? 9 : 4.5 });
    this.fx.flash(b.x, 1.2 * b.size, b.z, { size: 5 * b.size, color: [1, 0.3, 0.55], life: 0.3 });
    this.fx.sparks(b.x, 1.2 * b.size, b.z, { n: 18, color: [1, 0.25, 0.4], speed: 8 });
    this.fx.puff(b.x, 0.5, b.z, { n: 12, size: [0.8, 2.2], speed: 4, alpha: 0.7 });
    const m = b.model;
    this.world.tween(0.3, (f) => { m.root.scale.set(b.size * (1 + f * 0.3), b.size * (1 - f), b.size * (1 + f * 0.3)); }, () => { this.scene.remove(m.root); this.scene.remove(m.bar); });
    if (b.boss) {
      this.bossDown = true;
      this.shake = 1.5;
      this.audio.boom();
      this.story.beat('bossDown', 1.2);
      setTimeout(() => this.refreshTiles(), 1500);
    }
  }

  updateBears(dt) {
    const target = this.bearTarget();
    const alive = this.bears.filter((b) => !b.dead && !b.boss).length;
    this.respawnT = (this.respawnT || 0) - dt;
    if (alive < target && this.respawnT <= 0) {
      this.respawnT = this.chapter >= 3 ? 1.2 : 2.2;
      this.spawnBear(rand(MEADOW.x0 + 4, MEADOW.x1 - 4), MEADOW.z0 + 1);
    }
    this.bears = this.bears.filter((b) => !b.dead || b.model.root.parent);
    const p = this.player;
    for (const b of this.bears) {
      if (b.dead) continue;
      b.timer -= dt; b.aggro -= dt;
      let mx = 0, mz = 0, sp = b.speed;
      const foe = b.foe && b.aggro > 0 ? b.foe : null;
      if (b.boss) {
        this.updateBoss(b, dt);
      } else if (b.attack >= 0) {
        b.attack += dt / 0.7;
        if (b.attack >= 0.5 && !b.hitDone && foe) {
          b.hitDone = true;
          if (dist(b, foe) < 2.4 * b.size && foe === p) {
            this.shake = Math.max(this.shake, 0.12);
            this.audio.growl();
          }
        }
        if (b.attack >= 1) { b.attack = -1; b.timer = 1.2; }
      } else if (foe) {
        const d = dist(b, foe);
        if (d > 1.6 + b.radius) { mx = foe.x - b.x; mz = foe.z - b.z; sp = 2.6; }
        else if (b.timer <= 0) { b.attack = 0; b.hitDone = false; }
        b.rot = lerpAngle(b.rot, Math.atan2(foe.x - b.x, foe.z - b.z), Math.min(1, dt * 6));
      } else {
        if (b.timer <= 0) {
          if (Math.random() < 0.35) { b.tx = b.x; b.tz = b.z; b.timer = rand(1.5, 4); }
          else { b.tx = THREE.MathUtils.clamp(b.x + rand(-8, 8), MEADOW.x0 + 2, MEADOW.x1 - 2); b.tz = THREE.MathUtils.clamp(b.z + rand(-8, 8), MEADOW.z0 + 2, -10.5); if (Math.abs(b.tx) < 3.5 && b.tz > -13) b.tx += b.tx < 0 ? -4 : 4; b.timer = rand(3, 6); }
        }
        mx = b.tx - b.x; mz = b.tz - b.z;
        if (Math.hypot(mx, mz) < 0.4) { mx = 0; mz = 0; }
      }
      // separation
      for (const o of this.bears) {
        if (o === b || o.dead) continue;
        const dx = b.x - o.x, dz = b.z - o.z, d2 = dx * dx + dz * dz, min = b.radius + o.radius;
        if (d2 < min * min && d2 > 1e-4) { const d = Math.sqrt(d2), push = (min - d) * 3; b.x += dx / d * push * dt; b.z += dz / d * push * dt; }
      }
      const dp = dist(b, p), minp = b.radius + 0.5;
      if (dp < minp && dp > 1e-4) { const push = (minp - dp); b.x += (b.x - p.x) / dp * push * 0.9; b.z += (b.z - p.z) / dp * push * 0.9; }
      const ml = Math.hypot(mx, mz);
      b.moving = 0;
      if (ml > 0.01 && b.attack < 0 && !b.boss) {
        b.x += mx / ml * sp * dt; b.z += mz / ml * sp * dt;
        b.rot = lerpAngle(b.rot, Math.atan2(mx, mz), Math.min(1, dt * 5));
        b.moving = sp / 2;
      }
      if (!b.boss) {
        b.x = THREE.MathUtils.clamp(b.x, MEADOW.x0 + 1, MEADOW.x1 - 1);
        b.z = THREE.MathUtils.clamp(b.z, MEADOW.z0 + 1, -7.4);
        // keep the path through the north gate clear
        const gx = b.x - POS.gateOut.x, gz = b.z - (POS.gateOut.z + 0.6), gd = Math.hypot(gx, gz), clear = 2.6 + b.radius;
        if (gd < clear && gd > 1e-3) { b.x += gx / gd * (clear - gd) * Math.min(1, dt * 4); b.z += gz / gd * (clear - gd) * Math.min(1, dt * 4); }
      }
      // visuals
      const m = b.model;
      m.root.position.set(b.x, 0, b.z);
      m.root.rotation.y = b.rot;
      m.pose(dt, b.moving, b.attack);
      b.flash = Math.max(0, b.flash - dt * 5);
      m.furM.emissive.setRGB(b.flash * 0.9, b.flash * 0.15, b.flash * 0.35);
      if (b.hp < b.max) {
        m.bar.visible = true;
        m.bar.position.set(b.x, 2.6 * b.size + (b.boss ? 1 : 0), b.z);
        m.bar.quaternion.copy(this.camera.quaternion);
        m.bar.scale.setScalar(b.boss ? 3 : 1);
        m.barFg.scale.x = Math.max(0.001, b.hp / b.max);
      }
    }
  }

  updateBoss(b, dt) {
    const p = this.player;
    const m = b.model;
    if (b.state === 'enter') {
      const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz);
      if (d < 0.6) b.state = 'hunt';
      else { b.x += dx / d * 2.2 * dt; b.z += dz / d * 2.2 * dt; b.rot = Math.atan2(dx, dz); b.moving = 1; }
      if (Math.random() < dt * 3) this.shake = Math.max(this.shake, 0.15);
      return;
    }
    if (b.slam) {
      b.slam.t += dt;
      const f = b.slam.t / 1.1;
      b.attack = Math.min(0.99, f * 0.5);
      b.slam.ring.material.opacity = 0.25 + 0.35 * Math.abs(Math.sin(b.slam.t * 12));
      if (f >= 1) {
        this.scene.remove(b.slam.ring);
        this.shake = 0.9;
        this.audio.boom();
        this.fx.ring(b.slam.x, b.slam.z, { r0: 1, r1: 6, color: 0xbfe6ff, life: 0.5 });
        this.fx.puff(b.slam.x, 0.4, b.slam.z, { n: 30, speed: 8, size: [2, 5], life: 1 });
        if (near(p, b.slam, 4.2)) {
          const d = dist(b.slam, p) || 1;
          p.knock.x = (p.x - b.slam.x) / d * 16; p.knock.z = (p.z - b.slam.z) / d * 16;
          p.stun = 0.6;
        }
        b.slam = null; b.attack = -1; b.timer = 1.4;
      }
      return;
    }
    b.attack = -1;
    const playerOut = !this.world.insideCamp(p.x, p.z) && p.z < -6.5;
    const tgt = playerOut ? p : { x: 2, z: -12 };
    const dx = tgt.x - b.x, dz = tgt.z - b.z, d = Math.hypot(dx, dz);
    b.rot = lerpAngle(b.rot, Math.atan2(dx, dz), Math.min(1, dt * 3));
    if (playerOut && d < 5.5 && b.timer <= 0) {
      const fx = b.x + Math.sin(b.rot) * 2.5, fz = b.z + Math.cos(b.rot) * 2.5;
      const ring = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.4, depthWrite: false }));
      ring.position.set(fx, 0.05, fz); ring.renderOrder = 3;
      this.scene.add(ring);
      b.slam = { t: 0, x: fx, z: fz, ring };
      this.audio.growl();
      return;
    }
    b.timer -= dt;
    if (d > 3) { b.x += dx / d * b.speed * dt; b.z += dz / d * b.speed * dt; b.moving = 0.8; } else b.moving = 0;
    b.x = THREE.MathUtils.clamp(b.x, MEADOW.x0 + 3, MEADOW.x1 - 3);
    b.z = THREE.MathUtils.clamp(b.z, MEADOW.z0 + 2, -9.5);
    m.root.position.set(b.x, 0, b.z);
  }

  // -------------------------------------------------------------------------
  // Trees and wood
  // -------------------------------------------------------------------------
  computeChoppable() {
    const out = [];
    const dirs = [];
    for (let i = 0; i < 16; i++) dirs.push([Math.cos(i / 16 * Math.PI * 2), Math.sin(i / 16 * Math.PI * 2)]);
    for (const t of this.forest.trees) {
      if (t.clearStage <= this.stage) continue;
      if (Math.abs(t.x) > 45 || t.z < -45 || t.z > 25) continue;
      search: for (const r of [2.1, 2.4, 2.65]) {
        for (const [dx, dz] of dirs) {
          const sx = t.x + dx * r, sz = t.z + dz * r;
          if (this.world.walkable(sx, sz) && !this.world.insideCamp(sx, sz)) { t.sx = sx; t.sz = sz; t.choppable = true; out.push(t); break search; }
        }
      }
    }
    this.choppable = out;
  }

  nearestChoppable(from, worker = false) {
    let best = null, bd = Infinity;
    for (const t of this.choppable || []) {
      if (!t.alive || t.anim) continue;
      if (worker && t.sz > -7) continue;
      if (worker && this.workers.some((w) => w !== from && w.tree === t)) continue;
      const d = (t.x - from.x) ** 2 + (t.z - from.z) ** 2;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  chopTree(t, src) {
    if (!t.alive) return;
    t.hp--;
    this.audio.chop();
    this.fx.puff(t.x, 2.5, t.z, { n: 6, size: [1.2, 2.6], speed: 2.5, life: 0.7 });
    this.forest.shake(t);
    if (t.hp <= 0) {
      const dx = t.x - src.x, dz = t.z - src.z, d = Math.hypot(dx, dz) || 1;
      this.forest.fell(t, dx / d, dz / d, () => {
        this.fx.puff(t.x + dx / d * 2, 0.8, t.z + dz / d * 2, { n: 16, speed: 4, size: [2, 4] });
        this.burst('log', t.x, 1.2, t.z, 3, { owner: src, speed: 3 });
        this.audio.whoosh();
      });
      this.stats.chopped++;
      setTimeout(() => { if (!t.alive && t.clearStage > this.stage) this.forest.regrow(t); }, 40000);
    }
  }

  // -------------------------------------------------------------------------
  // Customers
  // -------------------------------------------------------------------------
  spot(i) { return { x: LANE_QUEUE, z: 7.5 + i * 1.3 }; }

  updateCustomers(dt) {
    if (this.stage < 1) return;
    const maxQ = (this.chapter >= 3 ? 10 : 8) + this.queueBonus;
    const waiting = this.customers.filter((c) => c.state !== 'leave');
    this.custTimer -= dt;
    if (this.custTimer <= 0 && waiting.length < maxQ) {
      this.custTimer = (this.bought.counter3 ? 1.6 : this.bought.counter2 ? 2.3 : 3.2) * (this.chapter >= 3 ? 0.8 : 1) * (this.beaconLit ? 0.6 : 1);
      const colors = [0x2f74b8, 0x3a86c8, 0x2a68a8, 0x4a90cf, 0x2d5f99];
      const m = makeHuman({ parka: colors[Math.floor(Math.random() * colors.length)], tool: null, scale: rand(0.92, 1.0) });
      const woodFlow = this.pads.counterLog.n > 0 || this.pads.plankPad.n > 0 || this.player.carry.plank > 0 || this.workers.some((w) => w.kind === 'lumberjack');
      const wantLog = this.wood && Math.random() < (woodFlow ? 0.4 : 0.15);
      const wantFish = !!this.fumoir && Math.random() < 0.35;
      const qty = Math.ceil(rand(0.01, Math.min(5, 1 + this.chapter)));
      const c = { model: m, x: LANE_QUEUE, z: 34, facing: Math.PI, state: 'queue', want: wantFish ? 'smoked' : wantLog ? 'plank' : 'cooked', qty, got: 0, slot: waiting.length, bubbleKey: '', serveT: 0 };
      m.root.position.set(c.x, 0, c.z);
      this.scene.add(m.root);
      c.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true }));
      c.bubble.scale.set(1.1, 1.1, 1);
      c.bubble.renderOrder = 12;
      c.bubble.visible = false;
      this.scene.add(c.bubble);
      this.customers.push(c);
    }
    // re-slot queue
    let slot = 0;
    for (const c of this.customers) if (c.state !== 'leave') c.slot = slot++;
    const serverHere = near(this.player, POS.cashier, 1.25) || this.workers.some((w) => w.kind === 'cashier' && w.atPost);
    for (const c of this.customers) {
      let tx, tz;
      if (c.state === 'leave') {
        if (c.leaveStep === 0) { tx = LANE_EXIT; tz = 7.6; if (near(c, { x: tx, z: tz }, 0.4)) c.leaveStep = 1; }
        else { tx = LANE_EXIT; tz = 42; }
      } else { const s = this.spot(c.slot); tx = s.x; tz = s.z; }
      const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
      const speed = 3.2;
      let moving = 0;
      if (d > 0.05) {
        const sp = Math.min(speed, d / dt);
        c.x += dx / d * sp * dt; c.z += dz / d * sp * dt;
        c.facing = lerpAngle(c.facing, Math.atan2(dx, dz), Math.min(1, dt * 8));
        moving = Math.min(1, d * 2);
      } else if (c.state !== 'leave') c.facing = lerpAngle(c.facing, Math.PI, Math.min(1, dt * 8));
      c.model.root.position.set(c.x, 0, c.z);
      c.model.root.rotation.y = c.facing;
      c.model.pose(dt, moving * 0.7, -1, c.got > 0);
      // serving
      if (c.state === 'queue' && c.slot === 0 && d < 0.3 && serverHere) {
        let pad = this.counterPad(c.want);
        // a customer waiting too long for wood settles for a steak
        c.waitT = (c.waitT || 0) + dt;
        if (c.want !== 'cooked' && c.got === 0 && !c.incoming && pad.n === 0 && c.waitT > 7 && this.pads.counterSteak.n > 0) { c.want = 'cooked'; pad = this.pads.counterSteak; }
        c.serveT -= dt;
        if (c.serveT <= 0 && pad.n - (pad.inflight || 0) > 0 && c.got + (c.incoming || 0) < c.qty) {
          c.serveT = this.serveInterval;
          const from = this.pickPos(pad);
          pad.n--;
          c.incoming = (c.incoming || 0) + 1;
          this.fly(pad.type, from, () => ({ x: c.x + Math.sin(c.facing) * 0.45, y: 0.95 + c.got * ITEM_HEIGHT[pad.type], z: c.z + Math.cos(c.facing) * 0.45 }), {
            dur: 0.25, arc: 0.8, onArrive: () => {
              c.incoming--; c.got++;
              if (c.got >= c.qty && c.state === 'queue') this.payCustomer(c);
            },
          });
        }
      }
      if (c.state === 'leave' && c.z > 40) c.gone = true;
      // bubble
      const showBubble = c.state === 'queue' && c.slot < 4 && d < 1.5;
      const key = c.state === 'paid' || c.checkT > 0 ? 'check' : `${c.want}:${c.qty - c.got}`;
      c.checkT = (c.checkT || 0) - dt;
      if (showBubble || c.checkT > 0) {
        if (key !== c.bubbleKey) { c.bubble.material.map = this.bubble(key); c.bubble.material.needsUpdate = true; c.bubbleKey = key; }
        c.bubble.visible = true;
        c.bubble.position.set(c.x, 2.55 + Math.sin(this.time * 4 + c.z) * 0.05, c.z);
      } else c.bubble.visible = false;
    }
    for (const c of this.customers) if (c.gone) { this.scene.remove(c.model.root); this.scene.remove(c.bubble); }
    this.customers = this.customers.filter((c) => !c.gone);
  }

  bubble(key) {
    if (this.bubbleCache.has(key)) return this.bubbleCache.get(key);
    let tex;
    if (key === 'check') tex = bubbleTexture('check', 0, { bg: '#4fd04a', fg: '#ffffff' });
    else { const [type, n] = key.split(':'); tex = bubbleTexture(type === 'plank' ? 'log' : type === 'smoked' ? 'fish' : 'steak', Number(n), { fg: type === 'plank' ? '#8b5530' : type === 'smoked' ? '#c0702a' : '#b8402a' }); }
    this.bubbleCache.set(key, tex);
    return tex;
  }

  price() { return (this.beaconLit ? 15 : 10) * (this.chapter >= 3 ? 1.5 : 1) * this.priceMult; }

  payCustomer(c) {
    c.state = 'leave'; c.leaveStep = 0; c.checkT = 1.2;
    this.stats.served++;
    this.audio.happy();
    if (this.stats.served === 1) this.story.beat('firstServed', 0.4);
    const bills = Math.max(1, Math.round(c.qty * this.price() * (c.want === 'smoked' ? 1.6 : 1) / BILL));
    this.stats.earned += bills * BILL;
    const pad = this.pads.cashPad;
    for (let i = 0; i < bills; i++) {
      setTimeout(() => {
        if (pad.n >= pad.pile.cap) return;
        this.fly('cash', { x: c.x, y: 1.4, z: c.z }, this.incoming(pad), { dur: 0.45, arc: 2.2, onArrive: () => { pad.inflight--; this.audio.cash(); } });
      }, i * 60);
    }
    this.fx.label(`+$${bills * BILL}`, c.x, 2.4, c.z, { cls: 'cash' });
    this.refreshTiles();
    // carried items vanish with the customer after a moment
  }

  // -------------------------------------------------------------------------
  // Turrets
  // -------------------------------------------------------------------------
  updateTurrets(dt) {
    for (const t of this.turrets) {
      t.cd -= dt;
      const origin = { x: t.def.x, z: t.def.z };
      const b = this.nearestBear(origin, 11);
      if (b) {
        const want = Math.atan2(b.x - origin.x, b.z - origin.z);
        t.aim = lerpAngle(t.aim, want, Math.min(1, dt * 8));
        if (t.cd <= 0) {
          t.cd = this.turretCd;
          this.audio.shoot();
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 5).rotateX(Math.PI / 2), mat(0x3a2a1c));
          bolt.position.set(origin.x, 2.05, origin.z);
          this.scene.add(bolt);
          this.bolts.push({ mesh: bolt, sx: origin.x, sz: origin.z, target: b, t: 0, dur: Math.max(0.12, dist(origin, b) / 30), turret: t });
        }
      }
      t.model.head.rotation.y = t.aim;
      if (t.model.flag) t.model.flag.rotation.y = Math.sin(this.time * 5 + t.i) * 0.35;
      t.model.bolt.visible = t.cd < 0.5;
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bo = this.bolts[i];
      bo.t += dt;
      const k = Math.min(1, bo.t / bo.dur);
      const b = bo.target;
      const x = bo.sx + (b.x - bo.sx) * k, z = bo.sz + (b.z - bo.sz) * k, y = 2.05 + (1.1 * b.size - 2.05) * k + Math.sin(k * Math.PI) * 0.8;
      bo.mesh.position.set(x, y, z);
      bo.mesh.lookAt(b.x, 1.1 * b.size, b.z);
      if (k >= 1) {
        this.scene.remove(bo.mesh); bo.mesh.geometry.dispose();
        this.bolts.splice(i, 1);
        if (!b.dead) this.damageBear(b, b.boss ? this.turretDmg * 2 : this.turretDmg, { turret: true, pad: bo.turret.pad });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Player
  // -------------------------------------------------------------------------
  updatePlayer(dt, input) {
    const p = this.player;
    // camera-relative input: screen up = world (-sin yaw, -cos yaw)
    const yaw = this.camYaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let mx = input.x * rx - input.z * fx, mz = input.x * rz - input.z * fz;
    const ml = Math.hypot(mx, mz);
    p.stun = Math.max(0, p.stun - dt);
    const speed = 7.0;
    if (p.stun > 0) { mx = 0; mz = 0; }
    const tvx = ml > 0.01 && p.stun <= 0 ? mx * speed : 0, tvz = ml > 0.01 && p.stun <= 0 ? mz * speed : 0;
    const acc = Math.min(1, dt * 14);
    p.vx += (tvx - p.vx) * acc; p.vz += (tvz - p.vz) * acc;
    const kx = p.knock.x, kz = p.knock.z;
    p.knock.x *= Math.exp(-dt * 6); p.knock.z *= Math.exp(-dt * 6);
    this.world.move(p, (p.vx + kx) * dt, (p.vz + kz) * dt, 0.45);
    const sp = Math.hypot(p.vx, p.vz);
    p.moving = sp / speed;
    if (sp > 0.5) p.facing = lerpAngle(p.facing, Math.atan2(p.vx, p.vz), Math.min(1, dt * 14));

    // auto attack
    p.swingCd -= dt;
    const bear = this.nearestBear(p, 1.9 + 2.7);
    let target = null;
    if (bear && dist(p, bear) < 1.55 + bear.radius) target = { kind: 'bear', o: bear };
    else if (this.wood && !p.fishing) {
      let best = null, bd = 2.75 * 2.75;
      for (const t of this.forest.near(p.x, p.z, 2.8)) {
        if (!t.alive || t.anim || t.clearStage <= this.stage) continue;
        const d = (t.x - p.x) ** 2 + (t.z - p.z) ** 2;
        if (d < bd) { bd = d; best = t; }
      }
      if (best && this.load_total(p) < p.cap) target = { kind: 'tree', o: best };
    }
    if (target) {
      const o = target.o;
      if (sp < 2) p.facing = lerpAngle(p.facing, Math.atan2(o.x - p.x, o.z - p.z), Math.min(1, dt * 12));
      if (p.swing < 0 && p.swingCd <= 0) { p.swing = 0; p.swingCd = 0.42; p.hitDone = false; p.target = target; this.audio.whoosh(); }
    }
    if (p.swing >= 0) {
      p.swing += dt / 0.4;
      if (p.swing >= 0.5 && !p.hitDone && p.target) {
        p.hitDone = true;
        const o = p.target.o;
        if (p.target.kind === 'bear' && !o.dead && dist(p, o) < 2.3 + o.radius) this.damageBear(o, p.dmg, p);
        if (p.target.kind === 'tree') this.chopTree(o, p);
      }
      if (p.swing >= 1) p.swing = -1;
    }

    // spinning blades
    if (p.whirl > 0) {
      const r = p.whirl === 2 ? 3.4 : 2.9;
      const enemies = this.bears.some((b) => !b.dead && dist(b, p) < r + b.radius + 1.5);
      this.bladeAmt += ((enemies ? 1 : 0) - this.bladeAmt) * Math.min(1, dt * 6);
      this.bladeTick = (this.bladeTick || 0) - dt;
      if (enemies && this.bladeTick <= 0) {
        this.bladeTick = 0.28;
        for (const b of this.bears) if (!b.dead && dist(b, p) < r + b.radius * 0.6) this.damageBear(b, p.whirl === 2 ? 12 : 8, p);
      }
    } else this.bladeAmt = 0;
    const n = p.whirl === 2 ? 12 : 8;
    this.blades.visible = this.bladeAmt > 0.02;
    if (this.blades.visible) {
      this.blades.position.set(p.x, 1.0, p.z);
      this.blades.rotation.y -= dt * 9;
      this.blades.scale.setScalar(this.bladeAmt * (p.whirl === 2 ? 1.18 : 1));
      this.bladeParts.forEach((a, i) => { a.visible = i < n; a.rotation.y = (i / n) * Math.PI * 2; });
    }

    // magnet & stations
    this.magnet(p, 2.6);
    if (this.sled && near(p, POS.sellPad, 1.2)) this.sellToSled(dt);
    if (this.stage === 0 && this.money >= 200) this.story.beat('campReady');
    if (this.stage >= 1) {
      if (near(p, POS.rawPad, 1.2)) this.transfer(p, this.pads.rawPad, 'drop', dt, 0.05);
      if (near(p, POS.cookedPad, 1.2)) this.transfer(p, this.pads.cookedPad, 'pick', dt, 0.05);
      if (near(p, POS.cashPad, 1.25)) this.transfer(p, this.pads.cashPad, 'pick', dt, 0.03);
      if (near(p, POS.cashier, 1.25)) this.dropToCounter(p, dt);
      for (const t of this.turrets) if (near(p, t.pad, 1.2)) this.transfer(p, t.pad, 'pick', dt, 0.05);
      if (this.saw && near(p, POS.logPad, 1.2)) this.transfer(p, this.pads.logPad, 'drop', dt, 0.05);
      if (this.saw && near(p, POS.plankPad, 1.2)) this.transfer(p, this.pads.plankPad, 'pick', dt, 0.05);
    }
    this.act2Stations(dt);
    if (p.carry.cooked > 0) this.story.beat('firstCooked');
    this.carrierVisual(p, dt);
  }

  carrierVisual(c, dt) {
    // wobble spring driven by acceleration
    const ax = (c.vx - c.pvx) / Math.max(dt, 1e-3), az = (c.vz - c.pvz) / Math.max(dt, 1e-3);
    c.pvx = c.vx; c.pvz = c.vz;
    const k = 60, damp = 7;
    c.sway.vx += (-ax * 0.012 - c.sway.x) * k * dt - c.sway.vx * damp * dt;
    c.sway.vz += (-az * 0.012 - c.sway.z) * k * dt - c.sway.vz * damp * dt;
    c.sway.x += c.sway.vx * dt; c.sway.z += c.sway.vz * dt;
    const lim = 0.5;
    c.sway.x = THREE.MathUtils.clamp(c.sway.x, -lim, lim); c.sway.z = THREE.MathUtils.clamp(c.sway.z, -lim, lim);
    const m = c.model;
    m.root.position.set(c.x, 0, c.z);
    m.root.rotation.y = c.facing;
    m.pose(dt, c.moving, c.swing, this.load_total(c) > 0);
  }

  // -------------------------------------------------------------------------
  // Grill
  // -------------------------------------------------------------------------
  updateGrill(dt) {
    if (this.stage < 1) return;
    const pots = this.grill2 ? 2 : 1;
    this.cookTimer -= dt * pots;
    const raw = this.pads.rawPad, out = this.pads.cookedPad;
    if (this.cookTimer <= 0 && raw.n - (raw.inflight || 0) > 0 && out.n < out.pile.cap) {
      this.cookTimer = this.cookTime;
      const g = this.grill2 && (this.potFlip = !this.potFlip) ? POS.grill2 : POS.grill;
      const from = this.pickPos(raw);
      raw.n--;
      this.fly('raw', from, () => ({ x: g.x, y: 1.5, z: g.z }), {
        dur: 0.35, arc: 1.4, onArrive: () => {
          this.audio.sizzle();
          this.fx.puff(g.x, 1.7, g.z, { n: 3, size: [0.8, 2.2], speed: 0.8, up: 2.5, g: -1, life: 1, alpha: 0.5 });
          setTimeout(() => {
            this.stats.cooked++;
            this.fly('cooked', { x: g.x, y: 1.6, z: g.z }, this.incoming(out), { dur: 0.45, arc: 1.8, onArrive: () => { out.inflight--; } });
          }, 700);
        },
      });
    }
    for (const gr of [this.grill, this.grill2]) {
      if (!gr) continue;
      gr.light.intensity = 9 + Math.sin(this.time * 13) * 1.2 + Math.sin(this.time * 7.3) * 1.2;
      gr.soup.position.y = 1.47 + Math.sin(this.time * 3) * 0.01;
      if (Math.random() < dt * 8) {
        const pos = gr === this.grill ? POS.grill : POS.grill2;
        this.fx.ember(pos.x, 1.6, pos.z);
      }
    }
  }

  updateSawmill(dt) {
    const saw = this.saw;
    if (!saw) return;
    const logs = this.pads.logPad, out = this.pads.plankPad;
    const busy = logs.n - (logs.inflight || 0) > 0 || saw.cutting > 0;
    saw.spin = THREE.MathUtils.lerp(saw.spin || 0, busy ? 1 : 0.15, Math.min(1, dt * 3));
    for (const b of saw.blades) b.rotation.z -= dt * 22 * saw.spin;
    saw.log.visible = saw.cutting > 0;
    if (saw.cutting > 0) {
      saw.cutting -= dt;
      saw.log.position.x = -0.75 + (1 - Math.max(0, saw.cutting) / this.sawTime) * 0.9;
      if (Math.random() < dt * 30) this.fx.puff(POS.sawmill.x, 1.1, POS.sawmill.z + 0.3, { n: 1, color: [0.93, 0.8, 0.6], size: [0.25, 0.6], speed: 2, up: 1.5, g: 4, life: 0.5, alpha: 0.9 });
      if (saw.cutting <= 0) {
        this.stats.sawn++;
        this.audio.chop();
        this.fly('plank', { x: POS.sawmill.x + 0.9, y: 1.1, z: POS.sawmill.z }, this.incoming(out), { dur: 0.45, arc: 1.6, onArrive: () => { out.inflight--; } });
      }
    } else {
      this.sawTimer -= dt;
      if (this.sawTimer <= 0 && logs.n - (logs.inflight || 0) > 0 && out.n < out.pile.cap) {
        this.sawTimer = 0.15;
        const from = this.pickPos(logs);
        logs.n--;
        this.fly('log', from, () => ({ x: POS.sawmill.x - 0.75, y: 1.05, z: POS.sawmill.z }), { dur: 0.35, arc: 1.2, onArrive: () => { saw.cutting = this.sawTime; } });
        saw.cutting = 0.0001 + this.sawTime + 0.35;
      }
    }
    if (saw.chimney && Math.random() < dt * 4) { const v = saw.chimney.clone().applyMatrix4(saw.group.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
  }

  // -------------------------------------------------------------------------
  // Guidance: objective chip and 3D pointer
  // -------------------------------------------------------------------------
  computeObjective() {
    const p = this.player;
    const tile = (id) => this.tiles.find((t) => t.def.id === id);
    if (this.stage === 0) {
      const campTile = tile('camp');
      const need = campTile ? campTile.def.cost - campTile.paid : 200;
      if (this.money >= need || (this.money > 0 && p.carry.raw === 0 && this.money + (campTile?.paid || 0) >= 200)) return { at: campTile?.def.at, text: 'Bâtis ton camp avec tes billets', icon: 'fort' };
      if (p.carry.raw > 0 && (this.money + p.carry.raw * 10 >= need || this.load_total(p) >= p.cap * 0.6)) return { at: POS.sellPad, text: 'Vends ta viande au traîneau de Brann', icon: 'cash' };
      const b = this.nearestBear(p, 80, true);
      return { at: b ? { x: b.x, z: b.z } : null, text: `Chasse les ours · ${this.money}/200 billets`, icon: 'meat', hunt: true };
    }
    const affordable = this.tiles.filter((t) => this.money >= Math.min(t.def.cost - t.paid, 60) && this.money >= (t.def.cost - t.paid) * 0.5).sort((a, b) => (a.def.cost - a.paid) - (b.def.cost - b.paid))[0];
    const starving = this.pads.rawPad.n === 0 && this.pads.cookedPad.n === 0 && this.pads.counterSteak.n < 2;
    if (p.carry.raw > 0 && (this.load_total(p) >= p.cap * 0.6 || (starving && p.carry.raw >= 5))) return { at: POS.rawPad, text: 'Dépose la viande près du chaudron', icon: 'meat' };
    if (p.carry.log > 0 && this.saw && (this.load_total(p) >= p.cap * 0.6 || p.carry.log >= 6)) return { at: POS.logPad, text: 'Apporte les bûches à la scierie', icon: 'log' };
    const a2 = this.act2Objective(p);
    if (a2) return a2;
    if (p.carry.cooked > 0 || p.carry.plank > 0) return { at: POS.cashier, text: 'Sers les rescapés au comptoir', icon: 'person' };
    if (this.saw && this.pads.plankPad.n >= 3 && !this.workers.some((w) => w.kind === 'porter')) return { at: POS.plankPad, text: 'Ramasse le bois fendu', icon: 'log' };
    if (this.pads.cashPad.n >= 6 && this.stats.served < 30) return { at: POS.cashPad, text: 'Ramasse les billets', icon: 'cash' };
    if (affordable) return { at: affordable.def.at, text: affordable.def.label, icon: affordable.def.icon };
    if (this.pads.cookedPad.n >= 3 && !this.workers.some((w) => w.kind === 'porter')) return { at: POS.cookedPad, text: 'Ramasse les steaks cuits', icon: 'steak' };
    if (this.pads.cashPad.n >= 6) return { at: POS.cashPad, text: 'Ramasse les billets', icon: 'cash' };
    if (this.boss && !this.boss.dead && this.boss.state !== 'enter') return { at: this.boss, text: 'Abats Grand-Blanc !', icon: 'blades' };
    const a2l = this.act2LateObjective(p);
    if (a2l) return a2l;
    const tp = this.pads.turrets.find((t) => t.n >= 6);
    if (tp && !this.workers.some((w) => w.kind === 'porter')) return { at: tp, text: 'Récupère la viande des arbalètes', icon: 'meat' };
    if (p.carry.log > 0 && this.saw) return { at: POS.logPad, text: 'Apporte les bûches à la scierie', icon: 'log' };
    if (this.wood && this.pads.counterLog.n < 3 && this.pads.plankPad.n < 3 && this.pads.logPad.n < 3 && this.customers.some((c) => c.want === 'plank') && !this.workers.some((w) => w.kind === 'lumberjack')) {
      const t = this.nearestChoppable(p);
      if (t) return { at: { x: t.x, z: t.z }, text: 'Coupe du bois en lisière', icon: 'axe' };
    }
    const b = this.nearestBear(p, 80, true);
    return { at: b ? { x: b.x, z: b.z } : null, text: 'Chasse les ours polaires', icon: 'meat', hunt: true };
  }

  updateGuide(dt) {
    this.objTimer -= dt;
    if (this.objTimer <= 0) {
      this.objTimer = 0.4;
      this.refreshTiles();
      const o = this.computeObjective();
      this.objective = o;
      this.hud.objective(o.text, o.icon);
    }
    const o = this.objective;
    const p = this.player;
    let at = o && o.at;
    // route through the south gate when the frozen lake is involved
    let viaSouth = false;
    if (at && this.stage >= 4) {
      const pr = this.region(p), tr = this.region(at);
      if (pr !== tr && (pr === 'lake' || tr === 'lake')) {
        const S = ACT2_POS;
        const inLane = Math.abs(p.x - S.sgIn.x) < 1.1 && p.z > S.sgIn.z - 0.6 && p.z < S.sgOut.z + 0.6;
        if (pr === 'lake') at = inLane ? S.sgIn : S.sgOut;
        else if (pr === 'camp') at = inLane ? S.sgOut : S.sgIn;
        else at = S.sgIn;
        viaSouth = pr !== 'out';
      }
    }
    // route the pointer through the north gate when the fence is in the way
    if (at && this.stage >= 1 && !viaSouth) {
      const pin = this.world.insideCamp(p.x, p.z), tin = this.world.insideCamp(at.x, at.z);
      const outsideNorth = (q) => q.z < STAGES[this.stage].z0 - 0.7;
      if (pin && !tin) at = Math.abs(p.x - POS.gateIn.x) < 1 && p.z < POS.gateIn.z + 0.6 ? POS.gateOut : POS.gateIn;
      else if (!pin && tin) {
        const r = STAGES[this.stage];
        const inGateLane = Math.abs(p.x - POS.gateOut.x) < 1.1 && p.z > POS.gateOut.z - 0.6 && p.z < r.z0 + 0.5;
        if (inGateLane) at = POS.gateIn;
        else if (outsideNorth(p)) at = POS.gateOut;
        else {
          // walk round the palisade corners towards the north gate
          const sx = p.x > (r.x0 + r.x1) / 2 ? r.x1 + 0.9 : r.x0 - 0.9;
          const besideX = p.x < r.x0 - 0.3 || p.x > r.x1 + 0.3;
          at = !besideX && p.z > r.z1 - 0.2 ? { x: sx, z: r.z1 + 1.0 } : { x: sx, z: r.z0 - 1.0 };
        }
      }
    }
    if (at && o) this.guideAt = at !== o.at ? at : null;
    this.guideTarget = at;
    const d = at ? dist(p, at) : 0;
    const routed = !!this.guideAt;
    const show = at && (routed || (d > 3.2 && !(o.hunt && d < 9)));
    this.marker.visible = !!(at && !o.hunt && !routed && d > 1.5);
    if (this.marker.visible) this.marker.position.set(at.x, 2.4 + Math.abs(Math.sin(this.time * 4)) * 0.5, at.z);
    this.marker.rotation.y += dt * 2;
    this.arrow.visible = !!show;
    if (show) {
      const ang = Math.atan2(at.x - p.x, at.z - p.z);
      this.arrow.position.set(p.x + Math.sin(ang) * 1.9, 0.08, p.z + Math.cos(ang) * 1.9);
      this.arrow.rotation.y = ang;
      this.arrow.material.opacity = 0.55 + Math.sin(this.time * 6) * 0.25;
    }
    const tileHere = this.tiles.find((t) => t.active);
    this.bracket.visible = !!tileHere;
    if (tileHere) { this.bracket.position.set(tileHere.def.at.x, 0.07, tileHere.def.at.z); const s = 1 + Math.sin(this.time * 8) * 0.05; this.bracket.scale.set(s * tileHere.half, 1, s * tileHere.half); }
  }

  // -------------------------------------------------------------------------
  // Main update + rendering of items
  // -------------------------------------------------------------------------
  update(dt, input) {
    this.time += dt;
    this.updatePlayer(dt, input);
    for (const w of this.workers) { this.updateWorker(w, dt); this.carrierVisual(w, dt); }
    this.updateBears(dt);
    this.updateTurrets(dt);
    this.updateGrill(dt);
    this.updateSawmill(dt);
    this.updateAct2(dt);
    this.updateCustomers(dt);
    this.updateTiles(dt);
    this.updateItems(dt);
    this.updateNpcs(dt);
    this.updateGuide(dt);
    for (const c of this.cabins) {
      c.smokeT -= dt;
      if (c.smokeT <= 0 && c.g.scale.x > 0.9) { c.smokeT = 0.35; const v = c.g.userData.chimney.clone().applyMatrix4(c.g.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
    }
    for (const f of this.campfires) { f.light.intensity = 5 + Math.sin(this.time * 11 + f.group.position.x) * 1.2; f.flame.scale.y = 1 + Math.sin(this.time * 15 + f.group.position.z) * 0.12; if (Math.random() < dt * 4) this.fx.ember(f.group.position.x, 0.6, f.group.position.z); }
    if (this.beacon && this.beaconLit) {
      this.beacon.flame.scale.set(1 + Math.sin(this.time * 9) * 0.08, 1 + Math.sin(this.time * 13) * 0.15, 1 + Math.sin(this.time * 9) * 0.08);
      if (Math.random() < dt * 10) this.fx.ember(BEACON_POS.x, 9, BEACON_POS.z);
    }
    if (this.time > 1.5) this.story.beat('intro');
    if (this.crib) this.crib.setLevel(Math.min(10, 1 + Math.floor(this.stats.sawn / 4)));
    this.hud.setMoney(this.money);
    this.drawItems();
    this.shake = Math.max(0, this.shake - dt * 2.2);
  }

  updateNpcs(dt) {
    for (const n of this.npcs) {
      n.wait -= dt;
      const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
      let moving = 0;
      if (d > 0.2) { const sp = 1.6; n.x += dx / d * sp * dt; n.z += dz / d * sp * dt; n.facing = lerpAngle(n.facing, Math.atan2(dx, dz), dt * 6); moving = 0.6; }
      else if (n.wait <= 0) {
        n.wait = rand(2, 6);
        const r = n.zone || STAGES[this.stage];
        n.tx = THREE.MathUtils.clamp(n.home.x + rand(-3.5, 3.5), r.x0 + 1, r.x1 - 1);
        n.tz = THREE.MathUtils.clamp(n.home.z + rand(-3, 3), r.z0 + 1, r.z1 - 1);
      }
      n.model.root.position.set(n.x, 0, n.z);
      n.model.root.rotation.y = n.facing;
      n.model.pose(dt, moving);
    }
  }

  drawItems() {
    const R = this.items;
    R.begin();
    const carriers = [this.player, ...this.workers];
    for (const c of carriers) {
      const cols = this.columns(c);
      for (const type of cols) {
        const n = this.columnCount(c, type);
        for (let i = 0; i < n; i++) {
          const s = this.stackLocal(c, type, i, cols);
          R.add(type, s.x, s.y, s.z, c.facing + (type === 'log' ? Math.PI / 2 : 0) + Math.sin(i * 1.7) * 0.08, 1, c.sway.z * s.bend * 0.15, -c.sway.x * s.bend * 0.15);
        }
      }
    }
    const pads = [this.pads.rawPad, this.pads.cookedPad, this.pads.cashPad, this.pads.counterSteak, this.pads.counterLog, this.pads.counterFish, this.pads.logPad, this.pads.plankPad, this.pads.fishPad, this.pads.smokedPad, ...this.pads.turrets];
    for (const pad of pads) {
      const n = pad.n - (pad.inflight || 0);
      for (let i = 0; i < n; i++) {
        const q = this.pilePos(pad, i);
        R.add(pad.type, q.x, q.y, q.z, (pad.pile?.rot || 0) + Math.sin(i * 2.3) * 0.12);
      }
    }
    for (const c of this.customers) {
      for (let i = 0; i < c.got; i++) R.add(c.want, c.x + Math.sin(c.facing) * 0.45, 0.95 + i * ITEM_HEIGHT[c.want], c.z + Math.cos(c.facing) * 0.45, c.facing);
    }
    for (const f of this.flying) R.add(f.type, f.x, f.y, f.z, f.rot || 0, 1, (f.rot || 0) * 0.3, 0);
    for (const it of this.loose) {
      const s = it.age > 80 ? Math.max(0.01, (90 - it.age) / 10) : 1;
      R.add(it.type, it.x, it.y, it.z, it.rot, s, it.y > 0.1 ? it.rot * 0.5 : 0, 0);
    }
    R.end();
  }

  // -------------------------------------------------------------------------
  // Save / load
  // -------------------------------------------------------------------------
  serialize() {
    const p = this.player;
    return {
      v: 1, money: this.money, carry: { ...p.carry }, bought: Object.keys(this.bought), paid: this.paidPartial,
      pads: { raw: this.pads.rawPad.n, cooked: this.pads.cookedPad.n, cash: this.pads.cashPad.n, steak: this.pads.counterSteak.n, log: this.pads.counterLog.n, logs: this.pads.logPad.n, planks: this.pads.plankPad.n, turrets: this.pads.turrets.map((t) => t.n) },
      stats: this.stats, bossDown: this.bossDown, beats: this.story.serialize(), chapter: this.chapter, act2: this.act2Serialize(),
    };
  }

  load(s) {
    this.money = s.money ?? 200;
    this.stats = { ...this.stats, ...(s.stats || {}) };
    this.paidPartial = s.paid || {};
    this.bossDown = !!s.bossDown;
    this.chapter = s.chapter || 1;
    this.world.setStage(0, false);
    const order = TILES.map((t) => t.id);
    const bought = (s.bought || []).slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const id of bought) { this.bought[id] = true; this.applyUpgrade(id, false); }
    this.act2Load(s.act2);
    const b = this.bought;
    this.chapter = Math.max(this.chapter, b.brasier ? 8 : this.act2.blizzard ? 7 : b.lakeRoad ? 6 : b.beacon ? 5 : b.expand2 ? 4 : b.expand1 ? 3 : b.turret1 ? 2 : 1);
    Object.assign(this.player.carry, s.carry || {});
    const pd = s.pads || {};
    this.pads.rawPad.n = pd.raw || 0; this.pads.cookedPad.n = pd.cooked || 0; this.pads.cashPad.n = pd.cash || 0;
    this.pads.counterSteak.n = pd.steak || 0; this.pads.counterLog.n = pd.log || 0;
    this.pads.logPad.n = pd.logs || 0; this.pads.plankPad.n = pd.planks || 0;
    (pd.turrets || []).forEach((n, i) => { if (this.pads.turrets[i]) this.pads.turrets[i].n = n; });
    if (this.stage >= 1) { this.player.x = POS.cashPad.x + 1.5; this.player.z = POS.cashPad.z - 1.5; }
    if (bought.includes('expand2') && !this.bossDown) setTimeout(() => this.spawnBoss(), 4000);
    this.refreshTiles(true);
  }
}

installAct2(Game);
