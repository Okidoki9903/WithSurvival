// Lina's town hall and the shops of the districts: places to invest.
// Four slots in front of the town hall always offer the cheapest upgrades
// available among some twenty lines that can be bought level after level
// (prices, cooking pace, more porters, hunters, lumberjacks and builders,
// bigger bag, sharper axe, faster forge, comfier homes...). Every district
// also has plots where shops rise a storey per level and pay their takings
// every few seconds. Installed as methods on Game.
import * as THREE from 'three';
import { makeTownHall, makeShop, makeSlotMarker } from './models6.js';

const P = (x, z) => ({ x, z });
export const TOWN_HALL = P(-21.6, 9.4);
export const SLOTS = [P(-25.6, 13.6), P(-22.4, 13.6), P(-19.2, 13.6), P(-16.0, 13.6)];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// Upgrade lines sold at the town hall, level by level.
const LINES = [
  { id: 'lvPrice', label: 'Enseigne du marché', icon: 'cash', n: 8, cost: 1500, k: 1.9, req: (g) => g.bought.counter3, apply: (g) => { g.lv.price *= 1.1; } },
  { id: 'lvCook', label: 'Cadence des chaudrons', icon: 'pot', n: 6, cost: 1800, k: 2.0, req: (g) => g.bought.grill2, apply: (g) => { g.lv.cook *= 0.88; } },
  { id: 'lvBag', label: 'Sac plus grand', icon: 'bag', n: 5, cost: 1500, k: 2.1, req: (g) => g.bought.bag2, apply: (g) => { g.player.cap += 15; } },
  { id: 'lvAxe', label: 'Hache affûtée', icon: 'axeplus', n: 5, cost: 1200, k: 2.0, req: (g) => g.bought.axe2, apply: (g) => { g.player.dmg += 6; } },
  { id: 'lvBoots', label: 'Bottes des ouvriers', icon: 'boot', n: 4, cost: 3000, k: 2.2, req: (g) => g.bought.boots, apply: (g) => { g.lv.speed *= 1.1; } },
  { id: 'lvPorter', label: 'Recruter un porteur', icon: 'person', n: 3, cost: 3000, k: 3, req: (g) => g.bought.porter2, apply: (g, f) => g.addWorker('porter', f) },
  { id: 'lvHunter', label: 'Recruter un chasseur', icon: 'bow', n: 3, cost: 2500, k: 3, req: (g) => g.bought.hunter, apply: (g, f) => g.addWorker('hunter', f) },
  { id: 'lvJack', label: 'Recruter un bûcheron', icon: 'axe', n: 3, cost: 2500, k: 3, req: (g) => g.bought.lumberjack2, apply: (g, f) => g.addWorker('lumberjack', f) },
  { id: 'lvSaw', label: 'Lames de scie', icon: 'axeplus', n: 4, cost: 2500, k: 2.0, req: (g) => g.bought.sawUp, apply: (g) => { g.lv.saw *= 0.85; } },
  { id: 'lvTurret', label: 'Carreaux renforcés', icon: 'bow', n: 4, cost: 3000, k: 2.0, req: (g) => g.bought.ballista, apply: (g) => { g.lv.turret *= 1.25; } },
  { id: 'lvCust', label: 'Affiches sur les routes', icon: 'person', n: 4, cost: 4000, k: 2.0, req: (g) => g.beaconLit, apply: (g) => { g.lv.cust *= 0.88; } },
  { id: 'lvSmoke', label: 'Fumoir ventilé', icon: 'fish', n: 3, cost: 4000, k: 2.0, req: (g) => g.bought.fumoirUp, apply: (g) => { g.lv.smoke *= 0.8; } },
  { id: 'lvSmelt', label: 'Soufflets de forge', icon: 'fire', n: 4, cost: 6000, k: 2.0, req: (g) => g.bought.furnace2, apply: (g) => { g.lv.smelt *= 0.85; } },
  { id: 'lvDrill', label: 'Trépan d’acier', icon: 'gear', n: 3, cost: 6000, k: 2.2, req: (g) => g.bought.drill, apply: (g) => { g.lv.drill *= 0.8; } },
  { id: 'lvMiner', label: 'Recruter un mineur', icon: 'pickaxe', n: 2, cost: 6000, k: 3, req: (g) => g.bought.miner, apply: (g, f) => g.addWorker('miner', f) },
  { id: 'lvBuilder', label: 'Recruter un bâtisseur', icon: 'hut', n: 4, cost: 4000, k: 2.6, req: (g) => g.bought.distNord, apply: (g, f) => g.addBuilder(f) },
  { id: 'lvTreasury', label: 'Intendance de Lina', icon: 'register', n: 1, cost: 20000, k: 1, req: (g) => g.bought.lvBuilder1, apply: (g) => { g.treasury = true; } },
  { id: 'lvRent', label: 'Confort des logements', icon: 'tower', n: 6, cost: 15000, k: 2.0, req: (g) => g.act4 && g.act4.phase !== 'none', apply: (g) => { g.lv.rent *= 1.25; } },
  { id: 'lvIncome', label: 'Commerce florissant', icon: 'register', n: 5, cost: 12000, k: 2.4, req: (g) => g.bought.shop_auberge1, apply: (g) => { g.lv.income *= 1.2; } },
  { id: 'lvWire', label: 'Filières de la tréfilerie', icon: 'wire', n: 3, cost: 12000, k: 2.2, req: (g) => !!g.wireFactory, apply: (g) => { g.wireFactory.mult += 0.5; } },
  { id: 'lvCement', label: 'Four de la cimenterie', icon: 'concrete', n: 3, cost: 25000, k: 2.2, req: (g) => !!g.cementFactory, apply: (g) => { g.cementFactory.mult += 0.5; } },
  { id: 'lvPanel', label: 'Chaîne des panneaux', icon: 'panel', n: 3, cost: 150000, k: 2.2, req: (g) => !!g.panelFactory, apply: (g) => { g.panelFactory.mult += 0.5; } },
];
const LINE_OF = {};
export const LEVEL_TILES = [];
for (const L of LINES) {
  for (let i = 1; i <= L.n; i++) {
    const id = `${L.id}${i}`;
    const prev = i > 1 ? `${L.id}${i - 1}` : null;
    LINE_OF[id] = L;
    LEVEL_TILES.push({
      id, icon: L.icon, cost: Math.round(L.cost * L.k ** (i - 1) / 50) * 50, at: null, slot: true, label: `${L.label} · ${ROMAN[i]}`,
      req: (g) => g.bought.distSud && (!prev || g.bought[prev]) && L.req(g),
    });
  }
}
// cheapest first: the slots always show the next affordable steps
LEVEL_TILES.sort((a, b) => a.cost - b.cost);

// Shops: three levels each, on plots in the districts.
// [kind, label, icon, district, plot, facing, cost, income per pay day]
const SHOPS = [
  ['auberge', 'Auberge du Traîneau', 'hut', 'distSud', P(-12.4, 9.4), 0, 3000, 100],
  ['boulangerie', 'Boulangerie de Lina', 'steak', 'distSud', P(-26.4, 17.6), Math.PI / 2, 4500, 150],
  ['pelleterie', 'Pelleterie de Yuki', 'bag', 'distSud', P(-11.6, 22.4), Math.PI, 6000, 200],
  ['coutellerie', 'Coutellerie', 'axeplus', 'distNord', P(-24.8, -16.8), 0, 8000, 260],
  ['bains', 'Bains chauds', 'steam', 'distNord', P(-17.4, -14.6), -Math.PI / 2, 11000, 360],
  ['ecole', 'École de Piotr', 'book', 'distNord', P(-24.6, -9.8), Math.PI / 2, 14000, 420],
  ['atelier', 'Atelier d’électricité', 'bolt', 'distNordEst', P(24.6, -15.0), Math.PI / 2, 20000, 650],
  ['cinema', 'Cinéma de l’Aube', 'sun', 'distNordEst', P(25.2, -9.6), 0, 30000, 950],
  ['marche', 'Marché couvert', 'register', 'distLac', P(39.4, 9.2), 0, 50000, 1500],
  ['dispensaire', 'Dispensaire', 'heart', 'distLac', P(47.6, 9.6), -Math.PI / 2, 70000, 2100],
  ['bibliotheque', 'Bibliothèque Véra-Solenne', 'book', 'distLac', P(47.8, 16.0), -Math.PI / 2, 90000, 2700],
];
const SHOP_OF = {};
export const SHOP_TILES = [];
for (const [kind, label, icon, dist, at, rot, cost, income] of SHOPS) {
  for (let lvl = 1; lvl <= 3; lvl++) {
    const id = `shop_${kind}${lvl}`;
    SHOP_OF[id] = { kind, label, icon, dist, at, rot, income, lvl };
    // higher floors are bought in front of the shop's door
    const front = lvl === 1 ? at : P(at.x + Math.sin(rot) * 2.6, at.z + Math.cos(rot) * 2.6);
    SHOP_TILES.push({
      id, icon, cost: cost * 4 ** (lvl - 1), at: front, label: lvl === 1 ? label : `${label} · étage ${lvl}`,
      req: (g) => g.bought[dist] && (lvl === 1 || g.bought[`shop_${kind}${lvl - 1}`]),
      beat: lvl === 1 && kind === 'auberge' ? 'shopTile' : undefined,
    });
  }
}
const INCOME_MULT = [0, 1, 2.5, 6];
const PAYDAY = 12;

const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;

const methods = {
  initTownHall() {
    this.shops = {};
    this.shopT = PAYDAY;
  },

  buildTownHall(fresh) {
    if (this.townHall) return;
    const th = makeTownHall(); th.group.position.set(TOWN_HALL.x, 0, TOWN_HALL.z); this.scene.add(th.group);
    this.townHall = th;
    for (const dx of [-1.8, 0, 1.8]) this.world.circles.push({ x: TOWN_HALL.x + dx, z: TOWN_HALL.z - 0.2, r: 1.5, camp: true });
    this.slotMarks = SLOTS.map((s) => { const m = makeSlotMarker(); m.position.set(s.x, 0, s.z); this.scene.add(m); return m; });
    if (fresh) { this.popIn(th.group, 0.6); this.slotMarks.forEach((m, i) => this.popIn(m, 0.8 + i * 0.1)); }
  },

  // A level tile takes the first free slot in front of the town hall.
  slotFor(def) {
    const used = new Set(this.tiles.filter((t) => t.def.slot).map((t) => t.def.slotIndex));
    for (let i = 0; i < SLOTS.length; i++) if (!used.has(i)) { def.slotIndex = i; def.at = SLOTS[i]; return true; }
    return false;
  },

  townHallApply(id, fresh) {
    const L = LINE_OF[id];
    if (L) {
      L.apply(this, fresh);
      if (fresh) { this.fx.label(L.label, TOWN_HALL.x, 3.6, TOWN_HALL.z + 3, { cls: 'cash' }); this.story.beat('firstLevel', 0.4); this.story.beat(L.id, 0.8); }
      return true;
    }
    const S = SHOP_OF[id];
    if (S) { this.raiseShop(S, fresh); return true; }
    return false;
  },

  raiseShop(S, fresh) {
    let sh = this.shops[S.kind];
    if (!sh) {
      const m = makeShop(S.kind, S.icon);
      m.group.position.set(S.at.x, 0, S.at.z); m.group.rotation.y = S.rot;
      this.scene.add(m.group);
      sh = this.shops[S.kind] = { ...m, def: S, lvl: 0 };
      const along = Math.abs(Math.sin(S.rot)) > 0.5;
      for (const d of [-0.8, 0.8]) this.world.circles.push({ x: S.at.x + (along ? 0 : d), z: S.at.z + (along ? d : 0), r: 1.3, camp: true });
      const zone = this.world.districts.find((r) => S.at.x > r.x0 && S.at.x < r.x1 && S.at.z > r.z0 && S.at.z < r.z1) || null;
      this.addNpc(S.at.x, S.at.z, fresh, zone);
      this.addNpc(S.at.x, S.at.z, fresh, zone);
    }
    sh.lvl = Math.max(sh.lvl, S.lvl);
    const part = sh.levels[S.lvl - 1];
    part.visible = true;
    // shops are part of the economy, and of the energy the town uses
    this.addPower(`shop_${S.kind}`, 2e6 * 10 ** sh.lvl);
    if (S.kind === 'auberge') this.lv.cust *= 0.9;
    if (S.kind === 'ecole') this.lv.speed *= 1.08;
    if (S.kind === 'marche') this.lv.price *= 1.05;
    if (fresh) {
      this.popIn(part, 0.2);
      this.fx.sparks(S.at.x, 2, S.at.z, { n: 24, color: [1, 0.85, 0.3], speed: 6 });
      this.story.beat(`shop_${S.kind}`, 0.6);
    }
  },

  shopIncome() {
    let sum = 0;
    for (const k in this.shops) { const s = this.shops[k]; sum += s.def.income * INCOME_MULT[s.lvl]; }
    return Math.round(sum * this.lv.income);
  },

  // Lina's treasury finances a construction site as soon as the builders
  // have brought all of its materials.
  updateTreasury(dt) {
    if (!this.treasury) return;
    this.treasuryT = (this.treasuryT || 0) - dt;
    if (this.treasuryT > 0) return;
    this.treasuryT = 0.5;
    for (const tile of this.tiles) {
      const d = tile.def;
      if (!d.items || tile.done || tile.inflight) continue;
      if (this.tileItemsLeft(tile).some(([, n]) => n > 0) || Object.values(tile.itemIn).some((n) => n > 0)) continue;
      const left = d.cost - tile.paid;
      if (left <= 0 || this.money < left) continue;
      this.money -= left; tile.paid = d.cost;
      this.fx.label('Financé par Lina', d.at.x, 2.6, d.at.z, { cls: 'cash' });
      this.audio.pay();
      if (this.tileComplete(tile)) { tile.done = true; this.completeTile(tile); }
      return;
    }
  },

  // Pay day: every shop hands over its takings.
  updateShops(dt) {
    this.updateTreasury(dt);
    if (!this.townHall) return;
    if (this.townHall.flag) this.townHall.flag.rotation.y = Math.sin(this.time * 2) * 0.3;
    this.shopT -= dt;
    if (this.shopT > 0) return;
    this.shopT = PAYDAY;
    const p = this.player;
    for (const k in this.shops) {
      const s = this.shops[k];
      const amt = Math.round(s.def.income * INCOME_MULT[s.lvl] * this.lv.income);
      if (!amt) continue;
      this.money += amt; this.stats.earned += amt;
      if (near(p, s.def.at, 16)) this.fx.label(`+$${amt}`, s.def.at.x, 3.4, s.def.at.z, { cls: 'cash' });
    }
  },
};

export function installTownHall(Game) {
  Object.assign(Game.prototype, methods);
}
export { THREE };
