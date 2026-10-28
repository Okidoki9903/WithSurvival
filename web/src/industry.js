// Industrialisation of Fort-Aube: the hearth's firewood, conveyor belts,
// the rampart hoist, steam cauldrons, the automatic till, worker gear, the
// lake cable car and the ice nets. Installed as methods on Game.
import * as THREE from 'three';
import { Line, padSink } from './lines.js';
import { makeBoiler, upgradeSteamPot, makeRegister, makeBuoy, makePipe, makeTipper } from './machines.js';
import { makeDeck, mat, ITEM_HEIGHT } from './models.js';
import { ACT2_POS } from './act2.js';

const P = (x, z) => ({ x, z });
export const IND_POS = {
  fuelPad: P(-2.4, -1.4),
  boiler: P(-2.8, -3.4),
  register: P(0.6, 4.5),
};

export const INDUSTRY_TILES = [
  { id: 'belt1', icon: 'belt', cost: 400, at: P(-3.8, 1.5), req: (g) => g.bought.porter && g.bought.counter2, label: 'Tapis roulant', beat: 'beltTile' },
  { id: 'hoist', icon: 'hook', cost: 650, at: P(-6.4, -3.4), req: (g) => g.stage >= 2 && g.bought.ballista, label: 'Treuil du rempart', beat: 'hoistTile' },
  { id: 'boots', icon: 'boot', cost: 500, at: P(-5.8, 1.8), req: (g) => g.bought.hunter && g.bought.lumberjack, label: 'Bottes fourrées' },
  { id: 'steam', icon: 'steam', cost: 1600, at: IND_POS.boiler, req: (g) => g.stage >= 3 && g.bought.grill2 && g.bought.ballista, label: 'Chaudron à vapeur', beat: 'steamTile', reveal: true },
  { id: 'register', icon: 'register', cost: 1200, at: P(-1.7, 4.5), req: (g) => g.stage >= 3 && g.bought.counter3, label: 'Caisse automatique', beat: 'registerTile' },
  { id: 'lumberjack2', icon: 'person', cost: 900, at: P(6.2, 1.6), req: (g) => g.stage >= 3 && g.bought.lumberjack && g.bought.sawUp, label: 'Recruter Nadia' },
  { id: 'porter2', icon: 'person', cost: 1500, at: P(-5.6, -1.2), req: (g) => g.bought.lakeRoad, label: 'Recruter Ivan' },
  { id: 'cable', icon: 'cable', cost: 2600, at: P(17.0, 11.8), req: (g) => g.stage >= 4 && (g.bought.fumoirUp || g.stats.smoked >= 25), label: 'Téléphérique du lac', beat: 'cableTile', reveal: true },
  { id: 'nets', icon: 'net', cost: 1800, at: P(21.8, 23.6), req: (g) => g.bought.fisher, label: 'Filets sous la glace' },
];

const FUEL_PILE = { cols: 2, rows: 3, sp: 0.62, h: ITEM_HEIGHT.log, cap: 30, rot: Math.PI / 2 };
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;

const methods = {
  initIndustry() {
    this.pads.fuelPad = { ...IND_POS.fuelPad, n: 0, pile: FUEL_PILE, type: 'log' };
    this.fuelT = 0;
    this.potQ = 0;
    this.lines = [];
    this.workerSpeed = 1;
  },

  // Called from buildStaticVisuals: the firewood pad belongs to the camp.
  buildIndustryStatics(camp) {
    camp.add(this.padMesh('fire', IND_POS.fuelPad));
  },

  burning() { return this.fuelT > 0; },
  potCount() { return this.grill2 ? 2 : 1; },

  // Firewood: while it burns the cauldrons (or the boiler) work faster.
  updateFuel(dt, working) {
    if (this.stage < 1) return;
    if (working && this.fuelT > 0) this.fuelT -= dt;
    const pad = this.pads.fuelPad;
    if (working && this.fuelT <= 0.5 && pad.n - (pad.inflight || 0) > 0 && !this.fuelFly) {
      const from = this.pickPos(pad);
      pad.n--;
      this.fuelFly = true;
      const to = this.boiler ? { x: IND_POS.boiler.x, y: 0.7, z: IND_POS.boiler.z + 0.5 } : { x: this.grill.group.position.x - 0.6, y: 0.4, z: this.grill.group.position.z + 0.4 };
      this.fly('log', from, () => to, {
        dur: 0.45, arc: 1.2, onArrive: () => {
          this.fuelFly = false;
          this.fuelT += this.boiler ? 7 : 9;
          this.fx.sparks(to.x, to.y + 0.2, to.z, { n: 10, color: [1, 0.6, 0.2], speed: 3 });
          this.audio.whoosh();
          this.story.beat('firstFuel', 0.3);
        },
      });
    }
  },

  // The rampart hoist and other lines can tip meat straight into the pot.
  potSink() {
    return {
      accept: () => this.potQ < 6,
      deliver: (type, from) => {
        this.potQ++;
        const g = this.grill.group.position;
        this.fly(type, from, () => ({ x: g.x, y: 1.5, z: g.z }), { dur: 0.35, arc: 0.3, onArrive: () => { this.audio.sizzle(); this.fx.puff(g.x, 1.7, g.z, { n: 2, size: [0.8, 1.8], speed: 0.6, up: 2, g: -1, life: 0.9, alpha: 0.45 }); } });
      },
    };
  },

  industryApply(id, fresh) {
    switch (id) {
      case 'belt1': this.buildBelt1(fresh); if (fresh) this.story.beat('belt1'); return true;
      case 'hoist': this.buildHoist(fresh); if (fresh) this.story.beat('hoist'); return true;
      case 'boots': this.workerSpeed = 1.35; this.workers.forEach((w) => this.gearWorker(w, fresh)); if (fresh) this.story.beat('boots'); return true;
      case 'steam': this.buildSteam(fresh); if (fresh) this.story.beat('steam'); return true;
      case 'register': this.buildRegister(fresh); this.bank = true; if (fresh) this.story.beat('register'); return true;
      case 'lumberjack2': this.addWorker('lumberjack', fresh, 'nadia'); if (fresh) this.story.beat('nadia'); return true;
      case 'porter2': this.addWorker('porter', fresh, 'ivan'); if (fresh) this.story.beat('porter2'); return true;
      case 'cable': this.buildCable(fresh); if (fresh) this.story.beat('cable'); return true;
      case 'nets': this.buildNets(fresh); if (fresh) this.story.beat('nets'); return true;
      default: return false;
    }
  },

  showcase(x, z, hold = 1.8, zoom = 0) {
    this.camFocus = { x, z, t: 0, hold, zoom };
  },

  addLine(opts, fresh) {
    const line = new Line(this, opts);
    this.lines.push(line);
    if (fresh) this.popIn(line.group, 0.1);
    return line;
  },

  // ---- conveyor from the cooked pad to the counter -----------------------
  buildBelt1(fresh) {
    const y = 2.15;
    this.belt1 = this.addLine({
      kind: 'belt', speed: 1.9, spacing: 0.5,
      path: [{ x: -1.9, y, z: 2.3 }, { x: -5.4, y, z: 3.5 }, { x: -5.4, y, z: 4.55 }],
      posts: [0.3, 2.0, 3.65, 4.6],
      sources: [{ pad: this.pads.cookedPad, s: 0.05, when: () => this.pads.counterSteak.n + this.belt1.items.length < this.pads.counterSteak.cap }],
      sink: padSink(this, this.pads.counterSteak, { dur: 0.35, arc: 0.3 }),
    }, fresh);
    this.belt1.colliders.forEach((c) => { c.r = 0.34; });
    if (fresh) this.showcase(-3.6, 3.2, 1.6);
  },

  // ---- cable from the crossbow pads straight into the cauldron -----------
  buildHoist(fresh) {
    const y = 2.9, t = this.pads.turrets;
    const west = this.addLine({
      kind: 'cable', speed: 2.4, spacing: 0.8,
      path: [{ x: -12.4, y, z: -5.5 }, { x: -7.8, y, z: -5.5 }, { x: -3.2, y, z: -5.5 }, { x: -1.6, y, z: -3.4 }, { x: 0.55, y, z: -1.75 }],
      posts: [0, 4.6, 9.2, 11.84],
      sources: [{ pad: t[3], s: 1.4 }, { pad: t[0], s: 7.8 }],
      sink: this.potSink(),
    }, fresh);
    const east = this.addLine({
      kind: 'cable', speed: 2.4, spacing: 0.8,
      path: [{ x: 12.2, y, z: -5.5 }, { x: 7.0, y, z: -5.5 }, { x: 3.0, y, z: -3.6 }, { x: 1.45, y, z: -1.75 }],
      posts: [0, 5.2, 9.63],
      sources: [{ pad: t[2], s: 1.6 }, { pad: t[1], s: 7.86 }],
      sink: this.potSink(),
    }, fresh);
    // wooden jibs carry the last stretch over the cauldron, with a tipping pulley
    for (const [line, a, b] of [[west, { x: -1.6, z: -3.4 }, { x: 0.55, z: -1.75 }], [east, { x: 3.0, z: -3.6 }, { x: 1.45, z: -1.75 }]]) {
      const jib = makePipe({ x: a.x, y: y + 0.12, z: a.z }, { x: b.x, y: y + 0.12, z: b.z }, 0.07, mat(0x6b4529));
      line.group.add(jib);
      const tip = makeTipper(); tip.position.set(b.x, y, b.z); line.group.add(tip);
    }
    this.hoistLines = [west, east];
    if (fresh) this.showcase(0, -4.2, 2.0, 1.25);
  },

  // ---- steam boiler + lids + ladle arms on both cauldrons ----------------
  buildSteam(fresh) {
    const b = makeBoiler();
    b.group.position.set(IND_POS.boiler.x, 0, IND_POS.boiler.z);
    b.group.rotation.y = 0.5;
    this.scene.add(b.group);
    this.boiler = b;
    this.world.circles.push({ x: IND_POS.boiler.x, z: IND_POS.boiler.z, r: 0.9, camp: true });
    const parts = [upgradeSteamPot(this.grill)];
    if (this.grill2) parts.push(upgradeSteamPot(this.grill2));
    const pipes = new THREE.Group();
    const g1 = this.grill.group.position, g2 = this.grill2 ? this.grill2.group.position : null;
    const top1 = { x: g1.x - 0.95, y: 2.3, z: g1.z + 0.55 };
    pipes.add(makePipe({ x: IND_POS.boiler.x + 0.45, y: 2.3, z: IND_POS.boiler.z + 0.2 }, top1));
    pipes.add(makePipe({ x: IND_POS.boiler.x + 0.45, y: 1.6, z: IND_POS.boiler.z + 0.2 }, { x: IND_POS.boiler.x + 0.45, y: 2.38, z: IND_POS.boiler.z + 0.2 }));
    if (g2) pipes.add(makePipe(top1, { x: g2.x - 0.95, y: 2.3, z: g2.z + 0.55 }));
    // flanges where the pipes meet the posts
    for (const gp of [g1, g2]) if (gp) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 10), mat(0x8a5a2a, { standard: true, metalness: 0.7, roughness: 0.4 }));
      f.position.set(gp.x - 0.95, 2.3, gp.z + 0.55); pipes.add(f);
    }
    this.scene.add(pipes);
    this.steamPipes = pipes;
    this.cookTime = 0.32;
    if (fresh) {
      this.popIn(b.group); parts.forEach((p) => this.popIn(p, 0.3)); this.popIn(pipes, 0.6);
      this.fx.sparks(IND_POS.boiler.x, 1.5, IND_POS.boiler.z, { n: 30, color: [1, 0.7, 0.3], speed: 6 });
      this.showcase(0.4, -1.4, 2.2, 1.1);
    }
  },

  swingLadle(gr) { if (gr && gr.arm) gr.armT = 0; },

  // ---- automatic till: bills go straight into the wallet ------------------
  buildRegister(fresh) {
    const g = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.9), mat(0x7a5233)); stand.position.y = 0.45; stand.castShadow = true; g.add(stand);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.0), mat(0xb07a4c)); top.position.y = 0.94; g.add(top);
    const r = makeRegister(); r.group.position.y = 0.98; r.group.rotation.y = Math.PI; g.add(r.group);
    g.position.set(IND_POS.register.x, 0, IND_POS.register.z);
    this.scene.add(g);
    this.register = { group: g, drawer: r.drawer, ching: 0 };
    this.world.circles.push({ x: IND_POS.register.x, z: IND_POS.register.z, r: 0.75, camp: true });
    if (this.cashPadMesh) this.cashPadMesh.visible = false;
    // what was left on the old cash pad goes to Sasha
    const pad = this.pads.cashPad;
    const left = pad.n; pad.n = 0;
    for (let i = 0; i < left; i++) setTimeout(() => this.fly('cash', { x: IND_POS.register.x, y: 1.2, z: IND_POS.register.z }, () => this.stackTop(this.player, 'cash'), { dur: 0.45, arc: 1.6, onArrive: () => { this.money += 5; this.audio.cash(); } }), i * 25);
    if (fresh) { this.popIn(g); this.showcase(IND_POS.register.x - 1.5, IND_POS.register.z + 0.8, 1.4); }
  },

  // A paying customer's bills fly into the till.
  payToRegister(c, bills) {
    const R = this.register;
    const to = { x: IND_POS.register.x, y: 1.35, z: IND_POS.register.z };
    for (let i = 0; i < bills; i++) {
      setTimeout(() => this.fly('cash', { x: c.x, y: 1.4, z: c.z }, () => to, { dur: 0.5, arc: 2.0, onArrive: () => { this.money += 5; R.ching = 1; this.audio.cash(); } }), i * 50);
    }
  },

  gearWorker(w, fresh) {
    const fur = mat(0x9a6a3c);
    w.model.legs.forEach((l) => { if (l.children[1]) l.children[1].material = fur; });
    if (fresh) this.fx.puff(w.x, 0.3, w.z, { n: 8, size: [0.6, 1.4], speed: 2 });
  },

  // ---- cable car from the smokehouse to the counter ----------------------
  buildCable(fresh) {
    const y = 3.2;
    this.lakeCable = this.addLine({
      kind: 'cable', speed: 2.3, spacing: 0.9, camp: false, color: 0x2b2b30,
      path: [{ x: 19.0, y, z: 12.2 }, { x: 14.4, y, z: 9.0 }, { x: 14.4, y, z: 5.75 }, { x: 8.0, y, z: 5.75 }, { x: 4.4, y, z: 5.75 }, { x: -0.5, y, z: 5.75 }, { x: -2.1, y, z: 5.75 }],
      sources: [{ pad: this.pads.smokedPad, s: 0.05, when: () => this.pads.counterFish.n + this.lakeCable.items.length < 30 }],
      sink: padSink(this, this.pads.counterFish, { dur: 0.5, arc: 0.4 }),
    }, fresh);
    if (fresh) this.showcase(12, 8, 2.4, 1.4);
  },

  // ---- nets under every ice hole -------------------------------------------
  buildNets(fresh) {
    this.netBuoys = this.holes.map((h, i) => {
      const b = makeBuoy();
      b.group.position.set(h.x + 0.62, 0, h.z - 0.3);
      this.scene.add(b.group);
      if (fresh) this.popIn(b.group, i * 0.12);
      return { ...b, hole: h, t: 2 + i * 0.9 };
    });
    if (fresh) this.showcase(ACT2_POS.lakeC.x, ACT2_POS.lakeC.z, 1.8);
  },

  updateIndustry(dt) {
    for (const l of this.lines) l.update(dt);
    const B = this.boiler;
    if (B) {
      const busy = this.cookBusy > 0;
      if (Math.random() < dt * (busy ? 6 : 1.5)) { const v = B.chimney.clone().applyMatrix4(B.group.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
      if (busy && Math.random() < dt * 0.25) { const v = B.whistle.clone().applyMatrix4(B.group.matrixWorld); this.fx.puff(v.x, v.y, v.z, { n: 6, size: [0.5, 1.6], speed: 1.2, up: 3, g: -1, life: 0.8, alpha: 0.7 }); if (Math.hypot(this.player.x - IND_POS.boiler.x, this.player.z - IND_POS.boiler.z) < 14) this.audio.whistle(); }
      const pressure = this.burning() ? 1 : busy ? 0.6 : 0.25;
      B.needle.rotation.z += ((-1.2 + pressure * 2.4) - B.needle.rotation.z) * Math.min(1, dt * 3);
      B.door.material.color.setRGB(1.2 + pressure * 0.5, 0.4 + pressure * 0.25, 0.06);
    }
    for (const gr of [this.grill, this.grill2]) {
      if (!gr || !gr.arm) continue;
      const pos = gr.group.position;
      const armX = pos.x - 0.95, armZ = pos.z + 0.55;
      const toPot = Math.atan2(pos.x - armX, pos.z - armZ);
      const out = Math.atan2(this.pads.cookedPad.x - armX, this.pads.cookedPad.z - armZ);
      let a = toPot;
      if (gr.armT !== undefined && gr.armT < 1) {
        gr.armT += dt / 0.7;
        const k = Math.sin(Math.min(1, gr.armT) * Math.PI);
        let d = out - toPot; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        a = toPot + d * k * 0.8;
      }
      gr.arm.rotation.y = a;
      if (gr.lid) gr.lid.rotation.z = 0.2 + (this.cookBusy > 0 ? Math.abs(Math.sin(this.time * 7 + pos.x)) * 0.12 : 0);
    }
    if (this.register) {
      const R = this.register;
      R.ching = Math.max(0, R.ching - dt * 4);
      R.drawer.position.z = 0.04 + R.ching * 0.25;
      R.group.children[2].scale.setScalar(1 + R.ching * 0.08);
    }
    if (this.netBuoys) {
      const pad = this.pads.fishPad;
      for (const b of this.netBuoys) {
        b.flag.rotation.y = Math.sin(this.time * 4 + b.hole.x) * 0.4;
        b.group.position.y = Math.sin(this.time * 2 + b.hole.z) * 0.03;
        b.t -= dt;
        if (b.t <= 0 && !b.hole.busy && pad.n < pad.pile.cap) {
          b.t = 6 + Math.random() * 2;
          const h = b.hole;
          this.fx.puff(h.x, 0.3, h.z, { n: 6, color: [0.75, 0.9, 1], size: [0.4, 1.0], speed: 2, up: 3, g: 9, life: 0.5 });
          this.fly('fish', { x: h.x, y: 0.2, z: h.z }, this.incoming(pad), { dur: 0.9, arc: 3.0, onArrive: () => { pad.inflight--; } });
        } else if (b.t <= 0) b.t = 1;
      }
    }
  },

  drawIndustry(R) { for (const l of this.lines) l.draw(R); },

  industrySerialize() { return { fuel: this.pads.fuelPad.n, potQ: this.potQ }; },
  industryLoad(d) {
    if (!d) return;
    this.pads.fuelPad.n = d.fuel || 0;
    this.potQ = d.potQ || 0;
  },
};

export function installIndustry(Game) {
  Object.assign(Game.prototype, methods);
}
export { near };
