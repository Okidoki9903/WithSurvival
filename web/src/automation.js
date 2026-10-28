// Builders: the last thing Sasha still carried by hand were the materials
// for new buildings. The builders' yard sends workers in yellow parkas who
// take steel, planks, cans, wire, concrete and panels from their pads and
// bring them to every construction site that waits for them, walking real
// streets (navigation grid) rather than through walls. Installed on Game.
import { makeHuman } from './models.js';
import { makeBuilderYard } from './models6.js';
import { backOut } from './world.js';

const P = (x, z) => ({ x, z });
export const BUILDER_YARD = P(-16.8, -9.4);
// where each building material waits once it has been produced
const SOURCES = { steel: 'steelPad', plank: 'plankPad', can: 'canPad', wire: 'wire_out', concrete: 'cement_out', panel: 'panel_out' };
const lerpAngle = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;

const methods = {
  buildBuilderYard(fresh) {
    if (this.builderYard) return;
    const y = makeBuilderYard(); y.group.position.set(BUILDER_YARD.x, 0, BUILDER_YARD.z); this.scene.add(y.group);
    this.builderYard = y;
    for (const dx of [-0.8, 0.8]) this.world.circles.push({ x: BUILDER_YARD.x + dx, z: BUILDER_YARD.z - 0.2, r: 1.15, camp: true });
    if (fresh) this.popIn(y.group, 0.5);
  },

  addBuilder(fresh) {
    this.buildBuilderYard(fresh);
    const n = this.workers.filter((w) => w.kind === 'builder').length;
    const w = this.makeCarrier(makeHuman({ parka: 0xf2c94c, pants: 0x2b2b35, scarf: 0x3a3f47, fur: 0x9a9a9a, tool: null }), { x: BUILDER_YARD.x + 1.6, z: BUILDER_YARD.z + 1.6 + n * 0.5 });
    w.kind = 'builder'; w.name = 'builder'; w.state = 'idle'; w.path = []; w.cap = 14; w.timer = 0; w.speed = 5.2; w.dmg = 0;
    this.scene.add(w.model.root);
    this.workers.push(w);
    if (this.workerSpeed > 1) this.gearWorker(w, false);
    if (fresh) {
      this.fx.puff(w.x, 0.6, w.z, { n: 16, size: [1.4, 3] });
      w.model.root.scale.setScalar(0.001);
      this.world.tween(0.5, (f) => w.model.root.scale.setScalar(Math.max(0.001, backOut(f))));
      this.story.beat('builder', 0.4);
    }
    return w;
  },

  walkTo(w, to) { this.route(w, to); },

  // What still has to be brought, minus what other builders already carry there.
  builderJob(w) {
    const claimed = new Map();
    for (const o of this.workers) if (o !== w && o.kind === 'builder' && o.job) {
      const key = `${o.job.tile.def.id}|${o.job.type}`;
      claimed.set(key, (claimed.get(key) || 0) + o.job.want);
    }
    let best = null, bd = Infinity;
    for (const tile of this.itemTiles ? this.itemTiles() : []) {
      for (const [type, left] of this.tileItemsLeft(tile)) {
        const pad = this.pads[SOURCES[type]];
        if (!pad || pad.n - (pad.inflight || 0) <= 0) continue;
        const need = left - (claimed.get(`${tile.def.id}|${type}`) || 0);
        if (need <= 0) continue;
        const d = Math.hypot(pad.x - w.x, pad.z - w.z) + Math.hypot(tile.def.at.x - pad.x, tile.def.at.z - pad.z);
        if (d < bd) { bd = d; best = { tile, type, pad, want: Math.min(need, w.cap) }; }
      }
    }
    return best;
  },

  builderWorker(w, dt, arrived, total) {
    if (w.state === 'idle') {
      w.job = null;
      if (total > 0) {
        // leftovers go back to their pad
        const type = Object.keys(w.carry).find((t) => w.carry[t] > 0);
        const pad = this.pads[SOURCES[type]];
        if (pad) { w.state = 'return'; w.back = pad; this.walkTo(w, pad); return; }
      }
      const job = this.builderJob(w);
      if (job) { w.job = job; w.state = 'fetch'; this.walkTo(w, job.pad); }
      else { w.state = 'wait'; w.timer = 1.5; if (!near(w, BUILDER_YARD, 3)) this.walkTo(w, { x: BUILDER_YARD.x + 1.6, z: BUILDER_YARD.z + 1.8 }); }
    } else if (w.state === 'wait') {
      w.timer -= dt;
      if (w.timer <= 0) w.state = 'idle';
    } else if (w.state === 'fetch' && arrived) {
      const j = w.job;
      if (!this.tiles.includes(j.tile)) { w.state = 'idle'; return; }
      if (w.carry[j.type] + w.reserved >= j.want || this.transfer(w, j.pad, 'pick', dt, 0.06) === 'done') {
        if (w.carry[j.type] + w.reserved <= 0) { w.state = 'idle'; return; }
        w.state = 'deliver';
        this.walkTo(w, { x: j.tile.def.at.x, z: j.tile.def.at.z + 0.6, reach: 0.6 });
      }
    } else if (w.state === 'deliver' && arrived) {
      const j = w.job;
      if (!this.tiles.includes(j.tile) || w.reserved > 0) { if (!this.tiles.includes(j.tile)) w.state = 'idle'; return; }
      w.timer -= dt;
      w.facing = lerpAngle(w.facing, Math.atan2(j.tile.def.at.x - w.x, j.tile.def.at.z - w.z), dt * 8);
      const left = this.tileItemsLeft(j.tile).find(([t]) => t === j.type);
      if (w.carry[j.type] <= 0 || !left || left[1] <= 0) { w.state = 'idle'; return; }
      if (w.timer <= 0) { w.timer = 0.07; this.giveToTile(w, j.tile, j.type); }
    } else if (w.state === 'return' && arrived) {
      if (this.transfer(w, w.back, 'drop', dt, 0.06) === 'done') w.state = 'idle';
    }
  },

  // One item flies from a carrier into a construction site (same as the hero's).
  giveToTile(c, tile, t) {
    const def = tile.def;
    const from = this.stackTop(c, t);
    c.carry[t]--;
    tile.itemIn[t] = (tile.itemIn[t] || 0) + 1;
    this.fly(t, from, () => ({ x: def.at.x + (Math.random() - 0.5) * 0.8, y: 0.15, z: def.at.z + (Math.random() - 0.5) * 0.8 }), {
      dur: 0.3, arc: 1.4, onArrive: () => {
        tile.itemIn[t]--; tile.got[t] = (tile.got[t] || 0) + 1;
        this.itemsPartial[def.id] = { ...tile.got };
        this.drawTile(tile);
        if (this.tileComplete(tile) && !tile.done) { tile.done = true; this.completeTile(tile); }
      },
    });
  },
};

export function installAutomation(Game) {
  Object.assign(Game.prototype, methods);
}
