// Civilisation engine: the Kardashev index computed from the power the town
// really produces, eras, population and rent, and generic factories that
// turn input pads into an output pad. Installed as methods on Game.
import * as THREE from 'three';
import { ITEM_HEIGHT } from './models.js';

// Kardashev: K = (log10 P[W] - 6) / 10. Type I = 1e16 W, II = 1e26 W, III = 1e36 W.
export const ERAS = [
  [0.12, 'Âge du Feu'],
  [0.3, 'Âge de la Vapeur'],
  [0.45, 'Âge du Fer'],
  [0.6, 'Âge de la Foudre'],
  [0.73, 'Âge des Tours'],
  [1.0, 'Âge de l’Atome'],
  [2.0, 'Type I · planétaire'],
  [3.0, 'Type II · stellaire'],
  [Infinity, 'Type III · galactique'],
];
export const eraName = (k) => ERAS.find(([max]) => k < max - 1e-9)[1];

const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;

// Generic production building: consumes its input pads, fills its output pad.
export class Factory {
  constructor(game, { id, at, inputs, output, time, batch = 1, mouth = { x: 0, y: 1, z: 0.8 }, exit = mouth, power = 0, onMake = null }) {
    this.game = game; this.id = id; this.at = at;
    this.time = time; this.mult = 1; this.batch = batch; this.power = power;
    this.mouth = mouth; this.exit = exit; this.onMake = onMake;
    this.t = 0; this.busy = 0; this.queue = 0; this.made = 0;
    const pile = (type, cap) => ({ cols: 3, rows: 3, sp: 0.6, h: ITEM_HEIGHT[type], cap });
    this.inputs = inputs.map((inp) => {
      const pad = { x: inp.at.x, z: inp.at.z, n: 0, pile: pile(inp.type, inp.cap || 45), type: inp.type };
      game.pads[`${id}_${inp.type}`] = pad;
      game.extraPads.push(pad);
      return { ...inp, need: inp.need || 1, pad };
    });
    this.output = null;
    if (output) {
      const pad = { x: output.at.x, z: output.at.z, n: 0, pile: pile(output.type, output.cap || 60), type: output.type };
      game.pads[`${id}_out`] = pad;
      game.extraPads.push(pad);
      this.output = { ...output, pad };
    }
    this.meshes = [
      ...this.inputs.map((i) => game.padMesh(i.icon || i.type, i.at)),
      ...(this.output ? [game.padMesh(this.output.icon || this.output.type, this.output.at, { dashed: true })] : []),
    ];
    this.meshes.forEach((m) => game.scene.add(m));
    game.factories.push(this);
  }

  world(o) { return { x: this.at.x + o.x, y: o.y, z: this.at.z + o.z }; }

  update(dt) {
    const g = this.game;
    this.busy = Math.max(0, this.busy - dt);
    if (this.queue > 0) {
      this.t -= dt * this.mult;
      this.busy = 0.6;
      if (this.t <= 0) {
        this.queue--;
        this.made++;
        const out = this.output && this.output.pad;
        if (out) g.fly(out.type, this.world(this.exit), g.incoming(out), { dur: 0.45, arc: 1.5, onArrive: () => { out.inflight--; } });
        this.onMake && this.onMake(this);
        if (this.queue > 0) this.t = this.time;
      }
      return;
    }
    const outRoom = !this.output || this.output.pad.n + this.batch <= this.output.pad.pile.cap;
    if (!outRoom) return;
    if (!this.inputs.every((i) => i.pad.n - (i.pad.inflight || 0) >= i.need)) return;
    for (const i of this.inputs) {
      for (let k = 0; k < i.need; k++) {
        const from = g.pickPos(i.pad);
        i.pad.n--;
        g.fly(i.type, from, () => this.world(this.mouth), { dur: 0.4, arc: 1.2 });
      }
    }
    this.queue = this.batch;
    this.t = this.time;
  }

  // The hero drops inputs and picks outputs by standing on the pads.
  stations(p, dt) {
    const g = this.game;
    for (const i of this.inputs) if (near(p, i.pad, 1.2)) g.transfer(p, i.pad, 'drop', dt, 0.05);
    if (this.output && near(p, this.output.pad, 1.2)) g.transfer(p, this.output.pad, 'pick', dt, 0.05);
  }
}

const methods = {
  initCiv() {
    this.civ = { on: false, extra: {}, swarm: 0, colonies: 0, rentT: 10, shown: 0, residents: 0 };
    this.factories = [];
    this.extraPads = [];
  },

  // Power produced by everything Fort-Aube has built, in watts.
  power() {
    let P = 1.4e6;
    if (this.stage >= 1) P += 4e6 + this.campfires.length * 1.5e6 + (this.burning() ? 3e6 : 0);
    if (this.grill2) P += 3e6;
    if (this.saw) P += 6e6 * (this.saw.level || 1);
    if (this.boiler) P += 4e7;
    if (this.beaconLit) P += 2e7;
    if (this.brasierModel) P += 2.5e8;
    if (this.forge) P += 6e8 * (this.forge.level || 1);
    if (this.drill) P += 2e8;
    if (this.ship && this.ship.parts[1].visible) P += 3e8;
    for (const k in this.civ.extra) P += this.civ.extra[k];
    for (const f of this.factories) P += f.power;
    // the Dyson swarm and the colonies multiply everything
    P *= 10 ** this.civ.swarm * 10 ** this.civ.colonies;
    return P;
  },
  kardashev() { return Math.max(0, (Math.log10(this.power()) - 6) / 10); },
  addPower(key, watts) { this.civ.extra[key] = watts; },

  population() {
    return 1 + this.workers.length + this.npcs.length + (this.bought.camp ? 2 : 0) + this.civ.residents;
  },

  updateCiv(dt) {
    for (const f of this.factories) f.update(dt);
    const c = this.civ;
    // residents of the towers pay their rent
    if (c.residents > 0) {
      c.rentT -= dt;
      if (c.rentT <= 0) {
        c.rentT = 12;
        const rent = Math.round(c.residents * 2 * this.priceMult) * 5;
        this.money += rent; this.stats.earned += rent;
        if (this.region(this.player) === 'camp' && rent > 0) this.fx.label(`+$${rent} loyers`, this.player.x, 3.2, this.player.z, { cls: 'cash' });
      }
    }
    if (!c.on) return;
    const k = this.kardashev();
    c.shown += (k - c.shown) * Math.min(1, dt * 1.5);
    this.civK = k;
    this.hud.civ(c.shown, eraName(k), this.population());
  },

  civStations(dt) {
    for (const f of this.factories) f.stations(this.player, dt);
  },

  civSerialize() {
    const pads = {};
    for (const f of this.factories) {
      for (const i of f.inputs) pads[`${f.id}_${i.type}`] = i.pad.n;
      if (f.output) pads[`${f.id}_out`] = f.output.pad.n;
    }
    return { on: this.civ.on, swarm: this.civ.swarm, colonies: this.civ.colonies, pads };
  },
  civLoad(d) {
    if (!d) return;
    this.civ.on = !!d.on; this.civ.swarm = d.swarm || 0; this.civ.colonies = d.colonies || 0;
    if (this.civ.on) document.body.classList.add('kardashev');
    for (const [k, n] of Object.entries(d.pads || {})) if (this.pads[k]) this.pads[k].n = n;
  },
};

export function installCiv(Game) {
  Object.assign(Game.prototype, methods);
}
export { THREE };
