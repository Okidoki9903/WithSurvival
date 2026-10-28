// Districts: Fort-Aube does not only stretch from west to east. As each age
// brings more people, walled quarters open to the south and to the north of
// the fort, so the town grows in width as well as in length (and, in the
// towers, in height). Each district opens from inside the fort on a tile set
// against the palisade it will replace, and brings homes, a square and
// residents. Installed as methods on Game.
import * as THREE from 'three';
import { makeStreetLamp, makePlaza, makeYoungFir } from './models4.js';

const P = (x, z) => ({ x, z });
// Homes stand flush against the outer palisade, like the first cabins.
export const DISTRICTS = {
  distSud: {
    rect: { x0: -33, x1: -17, z0: 6, z1: 16 },
    homes: [[-30.0, 14.05, -30.2, 10.4], [-24.6, 14.05], [-19.6, 14.05, -19.4, 10.4]],
    plaza: [-24.8, 10.0], firs: [[-31.6, 7.6], [-19.0, 9.2], [-27.8, 7.4], [-22.6, 7.6]],
    lamps: [[-31.8, 8.0], [-18.2, 8.0]],
  },
  distNordEst: {
    rect: { x0: 17, x1: 43, z0: -16, z1: -6 },
    homes: [[20.6, -14.05, 23.4, -10.4], [26.6, -14.05], [32.6, -14.05], [38.6, -14.05, 36.4, -10.4]],
    plaza: [30.0, -10.2], firs: [[18.4, -11.0], [41.6, -11.0], [26.4, -10.2], [33.6, -10.2]],
    lamps: [[18.2, -8.0], [29.6, -7.8], [41.8, -8.0]],
  },
  distNord: {
    rect: { x0: -33, x1: -14, z0: -16, z1: -6 },
    homes: [[-30.4, -14.05, -30.4, -10.4], [-24.4, -14.05], [-18.4, -14.05]],
    plaza: [-23.2, -10.2], firs: [[-15.4, -11.2], [-19.6, -10.2], [-26.8, -10.2]],
    lamps: [[-31.8, -8.0], [-15.2, -8.0], [-23.2, -7.6]],
  },
  distLac: {
    rect: { x0: 33, x1: 43, z0: 6, z1: 16 },
    homes: [[36.0, 14.05], [40.5, 14.05]],
    plaza: [38.2, 10.0], firs: [[34.4, 10.6], [42.0, 10.6]],
    lamps: [[34.2, 8.0], [41.8, 8.0]],
  },
};

const T = (id, icon, cost, at, req, label, extra = {}) => ({ id, icon, cost, at, req, label, ...extra });
export const DISTRICT_TILES = [
  // Act III: the miners and smiths need homes, south of the forge quarter
  T('distSud', 'expand', 6000, P(-31.2, 4.8), (g) => g.stage >= 5 && g.stats.steel >= 6, 'Faubourg de la Forge', { beat: 'distSudTile', reveal: true }),
  // Act IV: the electricians want to live next to their machines, north of the east quarter
  T('distNordEst', 'expand', 14000, P(18.8, -4.6), (g) => g.bought.grid, 'Cité de la Foudre', { items: { wire: 10 }, beat: 'distNordEstTile', reveal: true }),
  // Act V: the town spreads north of the forges as well as upwards
  T('distNord', 'expand', 30000, P(-25.0, -4.8), (g) => g.bought.towers1, 'Les Hauts du Nord', { items: { concrete: 20, steel: 10 }, reveal: true }),
  // Act VI: the newcomers of the railway settle by the lake
  T('distLac', 'expand', 60000, P(33.7, 4.8), (g) => g.bought.railway, 'Quartier du Lac', { items: { concrete: 30, wire: 10 }, reveal: true }),
];

const methods = {
  openDistrict(id, fresh) {
    const D = DISTRICTS[id];
    if (!D || this.world.districts.includes(D.rect)) return;
    const r = D.rect;
    this.world.addDistrict(r, fresh);
    // the forest inside the new walls is cleared for good
    for (const t of this.forest.trees) {
      if (!t.alive || t.x < r.x0 - 3.1 || t.x > r.x1 + 3.1 || t.z < r.z0 - 3.1 || t.z > r.z1 + 3.1) continue;
      t.clearStage = -1;
      if (fresh) this.forest.poof(t, Math.random() * 0.6, () => this.fx.puff(t.x, 2.2, t.z, { n: 5, speed: 2.5, size: [2.5, 5], life: 0.9 }));
      else { t.alive = false; t.k = 0; this.forest.write(t); }
    }
    // homes: cabins at first, towers once the town has started to build upwards
    const floors = this.towerBlocks.length ? Math.max(...this.towerBlocks.map((t) => t.n)) : 0;
    D.homes.forEach(([x, z, fx, fz], i) => {
      const cab = this.addCabin(x, z, i, fresh, fx, fz, r);
      const side = x > 0 ? 'towers1' : 'towers2';
      if (cab && this.bought[side]) this.convertCabin(cab, floors || 2, fresh, 0.6 + i * 0.25);
    });
    // a square with the rising sun and benches, and young firs planted by Oleg
    const pl = makePlaza(2.2); pl.group.position.set(D.plaza[0], 0, D.plaza[1]); this.scene.add(pl.group);
    this.world.circles.push({ x: D.plaza[0], z: D.plaza[1], r: 0.7, camp: true });
    if (fresh) this.popIn(pl.group, 0.5);
    for (const [x, z] of D.firs) {
      const f = makeYoungFir(0.9 + Math.random() * 0.3); f.position.set(x, 0, z); f.rotation.y = Math.random() * 6; this.scene.add(f);
      this.world.circles.push({ x, z, r: 0.38, camp: true });
      if (fresh) this.popIn(f, 0.7 + Math.random() * 0.5);
    }
    this.districtLamps(D, fresh);
    this.addPower(id, 1e9 * (1 + Object.keys(DISTRICTS).indexOf(id)));
    this.computeChoppable();
    if (this.updateResidents) this.updateResidents();
    if (fresh) {
      this.story.beat(id, 1.0);
      this.showcase((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, 1.8, 1.5);
    }
  },

  // Street lamps light the districts once the grid exists.
  districtLamps(D, fresh) {
    this.litDistrictSet ||= new Set();
    if (!this.nightOn || this.litDistrictSet.has(D)) return;
    this.litDistrictSet.add(D);
    for (const [x, z] of D.lamps) {
      const l = makeStreetLamp(); l.group.position.set(x, 0, z); l.group.rotation.y = Math.atan2(-x, -z) + Math.PI / 2; this.scene.add(l.group);
      this.lamps.push(l);
      if (fresh) this.popIn(l.group, 0.3 + Math.random() * 0.6);
    }
  },

  litDistricts(fresh) {
    for (const id of Object.keys(DISTRICTS)) if (this.world.districts.includes(DISTRICTS[id].rect)) this.districtLamps(DISTRICTS[id], fresh);
  },

  districtApply(id, fresh) {
    if (!DISTRICTS[id]) return false;
    this.openDistrict(id, fresh);
    return true;
  },
};

export function installDistricts(Game) {
  Object.assign(Game.prototype, methods);
}
export { THREE };
