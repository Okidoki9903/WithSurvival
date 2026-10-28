// Districts: Fort-Aube does not only stretch from west to east. As each age
// brings more people, walled quarters open to the south and to the north of
// the fort, so the town grows in width as well as in length (and, in the
// towers, in height). Each district opens from inside the fort on a tile set
// against the palisade it will replace, and brings homes, a square and
// residents. Installed as methods on Game.
import * as THREE from 'three';
import { makeStreetLamp, makePlaza, makeYoungFir } from './models4.js';

const P = (x, z) => ({ x, z });
// Four large quarters, one on each side of the fort, so the town grows in
// every direction instead of along one street. Tall buildings only rise
// against northern or western palisades: the camera looks from the south-east
// and never has a tower between it and the hero. Homes: [x, z, fire x, fire z,
// options] where rot turns a cabin against a west wall and tower marks a home
// that becomes an apartment block in the age of towers.
const W = { rot: Math.PI / 2, tower: true };
export const DISTRICTS = {
  // South-west, Act II: the caravaners' quarter and Lina's town hall
  distSud: {
    rect: { x0: -33, x1: -9, z0: 6, z1: 24 },
    homes: [[-31.05, 11.0, -27.6, 11.0, W], [-31.05, 15.2, null, null, W], [-31.05, 19.4, -27.6, 19.6, W], [-25.6, 22.05], [-21.0, 22.05, -21.0, 18.6], [-16.4, 22.05]],
    plaza: [-14.0, 17.0], firs: [[-10.4, 14.6], [-28.0, 7.8], [-18.8, 18.8]],
    lamps: [[-28.0, 8.4], [-11.0, 13.8], [-20.0, 15.6], [-30.0, 23.0]],
  },
  // North-west, Act III: the smiths' quarter, the icebreaker's avenue through the middle
  distNord: {
    rect: { x0: -33, x1: -14, z0: -24, z1: -6 },
    homes: [[-25.3, -22.05, -25.0, -18.4, { tower: true }], [-20.8, -22.05, null, null, { tower: true }], [-16.3, -22.05, -16.6, -18.4, { tower: true }]],
    plaza: [-21.4, -14.2], firs: [[-32.0, -10.0], [-32.0, -15.0], [-32.0, -20.0]],
    lamps: [[-26.6, -8.6], [-15.2, -8.0], [-21.4, -19.0], [-31.6, -23.0]],
  },
  // North-east, Act IV: the electricians' quarter, radio mast and later the quarry
  distNordEst: {
    rect: { x0: 22, x1: 43, z0: -24, z1: -6 },
    homes: [[28.6, -22.05, 28.6, -18.4, { tower: true }], [32.4, -22.05, null, null, { tower: true }]],
    plaza: [30.0, -14.4], firs: [[33.6, -11.2]],
    lamps: [[23.4, -8.0], [36.0, -17.0], [41.8, -8.0]],
    fill: [[23.0, -23.0, 1.3], [25.9, -23.4, 0.9], [42.3, -23.3, 1.1]],
  },
  // South-east, Act V: the lakeside quarter with its vertical farms
  distLac: {
    rect: { x0: 33, x1: 50, z0: 6, z1: 24 },
    homes: [[39.6, 22.05, 39.6, 18.6], [44.0, 22.05], [47.6, 22.05, 47.0, 18.6]],
    plaza: [43.0, 13.4], firs: [[38.6, 15.0]],
    lamps: [[38.6, 14.0], [48.6, 8.0], [43.0, 18.0]],
  },
};

const T = (id, icon, cost, at, req, label, extra = {}) => ({ id, icon, cost, at, req, label, ...extra });
export const DISTRICT_TILES = [
  // Act II: the caravans bring families; the south-west of the fort opens for them
  T('distSud', 'expand', 2500, P(-13.0, 4.4), (g) => g.bought.beacon && g.act2.orders >= 1, 'Quartier des Caravaniers', { beat: 'distSudTile', reveal: true, big: true }),
  // Act III: north of the forges, the smiths' quarter
  T('distNord', 'expand', 7000, P(-24.4, -4.7), (g) => g.stage >= 5 && g.stats.steel >= 6, 'Quartier des Forgerons', { items: { plank: 10 }, beat: 'distNordTile', reveal: true, big: true }),
  // Act IV: north of the electric quarter
  T('distNordEst', 'expand', 12000, P(29.2, -4.4), (g) => g.bought.eastGate && (g.stats.wire || 0) >= 4, 'Cité de la Foudre', { items: { wire: 10 }, beat: 'distNordEstTile', reveal: true, big: true }),
  // Act V: by the lake, south of the electric quarter
  T('distLac', 'expand', 30000, P(36.6, 4.4), (g) => g.act4 && g.act4.towers, 'Quartier du Lac', { items: { concrete: 20, steel: 10 }, reveal: true, big: true }),
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
    D.homes.forEach(([x, z, fx, fz, opts], i) => {
      const cab = this.addCabin(x, z, i, fresh, fx ?? undefined, fz ?? undefined, r, opts || {});
      const side = x > 0 ? 'towers1' : 'towers2';
      if (cab && cab.towerable && this.bought[side]) this.convertCabin(cab, floors || 2, fresh, 0.6 + i * 0.25);
    });
    for (const [x, z, rr] of D.fill || []) this.world.circles.push({ x, z, r: rr, camp: true });
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
    // Lina's town hall in the caravaners' quarter, the builders' yard with the smiths
    if (id === 'distSud') this.buildTownHall(fresh);
    if (id === 'distNord') this.buildBuilderYard(fresh);
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
