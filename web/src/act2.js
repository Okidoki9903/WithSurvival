// Act II — after the Dawn Beacon: the caravan of Mira, the Frozen Lake,
// the Great Blizzard and the Great Brazier, then free play with caravan
// orders and town embellishments. Installed as methods on Game.
import * as THREE from 'three';
import { makeHuman, makeFumoir, upgradeFumoir, makeBrasier, makeMuskOx, makeCaravanSled, makeStatue, makeIceSculpture, makeLanternPost, makeTent, makeRod, ITEM_HEIGHT } from './models.js';
import { LAKE, STAGES, backOut } from './world.js';
import { makeCanvas, canvasTexture, drawIcon, roundRect } from './textures.js';

const P = (x, z) => ({ x, z });
export const ACT2_POS = {
  relay: P(5.8, 4.6),
  caravan: P(5.8, 10.6),
  sgIn: P(12.4, 4.4),
  sgOut: P(12.4, 7.8),
  fumoir: P(15.8, 14.8),
  fishPad: P(12.2, 14.4),
  smokedPad: P(19.0, 13.6),
  lakeC: P(21.5, 19.5),
  brasier: P(27.2, 13.6),
  statue: P(22.0, 12.0),
  holes: [P(17.8, 18.2), P(20.6, 16.2), P(24.4, 17.0), P(18.8, 21.9), P(23.0, 22.5), P(26.3, 20.4)],
  tents: [P(12.4, 24.0), P(15.8, 24.8), P(28.2, 24.0)],
};
const A = ACT2_POS;

// Upgrade tiles of Act II (appended to the game's tile list).
export const ACT2_TILES = [
  { id: 'courier', icon: 'person', cost: 1200, at: P(3.0, 4.6), req: (g) => g.act2.orders >= 1, label: 'Recruter Piotr' },
  { id: 'lakeRoad', icon: 'expand', cost: 2500, at: P(12.4, 3.6), req: (g) => g.act2.orders >= 2, label: 'Route du Lac Gelé', beat: 'lakeTile' },
  { id: 'fisher', icon: 'person', cost: 900, at: P(11.4, 20.2), req: (g) => g.stage >= 4, label: 'Recruter Anouk' },
  { id: 'rod', icon: 'fish', cost: 600, at: P(14.2, 21.0), req: (g) => g.stage >= 4 && g.stats.fished >= 5, label: 'Canne en os' },
  { id: 'fumoirUp', icon: 'fire', cost: 1400, at: P(13.6, 17.6), req: (g) => g.stage >= 4 && g.stats.smoked >= 8, label: 'Fumoir double', beat: 'fumoirTile' },
  { id: 'brasier', icon: 'fire', cost: 6000, at: A.brasier, req: (g) => g.act2.blizzard, label: 'Grand Brasier', big: true, beat: 'brasierTile' },
  { id: 'lanterns', icon: 'beacon', cost: 3000, at: P(-2.4, -3.4), req: (g) => g.act2.ended, label: 'Lanternes du fort' },
  { id: 'statue', icon: 'person', cost: 5000, at: A.statue, req: (g) => g.act2.ended, label: 'Statue de Brann' },
  { id: 'sculpt', icon: 'snowflake', cost: 4000, at: A.lakeC, req: (g) => g.act2.ended, label: 'Ours de glace' },
  { id: 'festival', icon: 'fire', cost: 12000, at: P(12.4, 3.6), req: (g) => g.act2.ended && g.bought.lanterns && g.bought.statue && g.bought.sculpt, label: 'Fête de l’Aube', big: true },
];

const PILES = {
  fishPad: { cols: 3, rows: 3, sp: 0.62, h: ITEM_HEIGHT.fish, cap: 45 },
  smokedPad: { cols: 3, rows: 3, sp: 0.62, h: ITEM_HEIGHT.smoked, cap: 45 },
};
const UNIT = { cooked: 15, plank: 15, smoked: 25 };
const SOURCE = { cooked: 'cookedPad', plank: 'plankPad', smoked: 'smokedPad' };
const rand = (a, b) => a + Math.random() * (b - a);
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < r * r;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lerpAngle = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

const methods = {
  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  initAct2() {
    this.act2 = { started: false, orders: 0, order: null, caravan: 'away', timer: 0, blizzard: false, blizzardT: 0, ended: false, festival: false };
    this.weather = 0;
    this.clearSky = 0;
    this.stats.fished = this.stats.fished || 0;
    this.stats.smoked = this.stats.smoked || 0;
    this.smokeTime = 1.3;
    this.smokeTimer = 0;
    this.catchTime = 1.5;
    this.pads.fishPad = { ...A.fishPad, n: 0, pile: PILES.fishPad, type: 'fish' };
    this.pads.smokedPad = { ...A.smokedPad, n: 0, pile: PILES.smokedPad, type: 'smoked' };
    this.pads.counterFish = { x: -4.0, z: 6, n: 0, type: 'smoked', cap: 40 };
    this.rewardMult = 1;
  },

  // Called when the Dawn Beacon is lit (fresh) or when loading after it.
  startAct2(fresh) {
    if (this.act2.started) return;
    this.act2.started = true;
    this.clearTrees(3.5, fresh);
    this.world.buildRoad(fresh);
    this.buildCaravan();
    if (fresh) { this.act2.caravan = 'away'; this.act2.timer = 9; }
  },

  clearTrees(level, fresh) {
    for (const t of this.forest.trees) {
      if (t.clearStage <= level && t.alive) {
        if (fresh) {
          const d = Math.hypot(t.x - this.player.x, t.z - this.player.z);
          this.forest.poof(t, d * 0.02, () => this.fx.puff(t.x, 2.2, t.z, { n: 5, speed: 2.5, size: [2.2, 4.5], life: 0.8 }));
        } else { t.alive = false; t.k = 0; this.forest.write(t); }
      }
    }
  },

  // ---------------------------------------------------------------------
  // Caravan & orders
  // ---------------------------------------------------------------------
  buildCaravan() {
    const g = new THREE.Group();
    const sled = makeCaravanSled(); g.add(sled);
    const sled2 = makeCaravanSled(); sled2.position.z = 3.4; sled2.scale.setScalar(0.9); g.add(sled2);
    const oxen = [makeMuskOx(), makeMuskOx()];
    oxen.forEach((o, i) => { o.root.position.set(i ? 0.8 : -0.8, 0, -3.0); o.root.rotation.y = Math.PI; g.add(o.root); });
    const mira = makeHuman({ parka: 0x4fa3d9, pants: 0x2b3140, scarf: 0xf2d24b, tool: null });
    mira.root.position.set(-1.9, 0, -0.8); mira.root.rotation.y = Math.PI * 0.85; g.add(mira.root);
    const brann = makeHuman({ parka: 0x8a5a2e, pants: 0x3a2a20, fur: 0xdcd2c0, scarf: 0x2f6db0, tool: null, scale: 1.05 });
    brann.root.position.set(1.9, 0, 0.6); brann.root.rotation.y = Math.PI * 1.15; g.add(brann.root);
    g.position.set(A.caravan.x, 0, 70);
    this.scene.add(g);
    const pad = this.padMesh('sled', A.relay, { dashed: true });
    this.scene.add(pad);
    this.board = { canvas: makeCanvas(512, 300) };
    this.board.tex = canvasTexture(this.board.canvas);
    this.board.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.board.tex, depthTest: false, transparent: true }));
    this.board.sprite.scale.set(4.2, 2.46, 1);
    this.board.sprite.renderOrder = 13;
    this.board.sprite.visible = false;
    this.scene.add(this.board.sprite);
    this.caravan = { group: g, oxen, mira, brann, pad };
  },

  newOrder() {
    const k = this.act2.orders;
    const need = { cooked: Math.min(60, 14 + 6 * k) };
    if (this.saw) need.plank = Math.min(50, 8 + 4 * k);
    if (this.fumoir) need.smoked = Math.min(40, 6 + 4 * Math.min(k, 8));
    let reward = 0;
    for (const t in need) reward += need[t] * UNIT[t] * 3;
    reward = Math.round(reward * this.rewardMult / 5) * 5;
    return { need, got: { cooked: 0, plank: 0, smoked: 0 }, incoming: { cooked: 0, plank: 0, smoked: 0 }, reward };
  },

  orderLeft(type) {
    const o = this.act2.order;
    if (!o || this.act2.caravan !== 'parked' || !o.need[type]) return 0;
    return o.need[type] - o.got[type] - o.incoming[type];
  },

  drawBoard() {
    const o = this.act2.order;
    const c = this.board.canvas, g = c.getContext('2d');
    g.clearRect(0, 0, 512, 300);
    if (!o) return;
    g.fillStyle = 'rgba(30,22,16,0.9)'; roundRect(g, 6, 6, 500, 288, 28); g.fill();
    g.strokeStyle = '#f2c94c'; g.lineWidth = 6; roundRect(g, 14, 14, 484, 272, 22); g.stroke();
    g.fillStyle = '#ffd25a'; g.font = '900 38px "Trebuchet MS", sans-serif'; g.textAlign = 'center';
    g.fillText(`COMMANDE #${this.act2.orders + 1}`, 256, 60);
    const rows = Object.keys(o.need);
    rows.forEach((t, i) => {
      const y = 112 + i * 62;
      drawIcon(g, t === 'cooked' ? 'steak' : t === 'plank' ? 'log' : 'fish', 120, y, 48, '#fff');
      const done = o.got[t] >= o.need[t];
      g.fillStyle = done ? '#7bff6a' : '#ffffff'; g.font = '800 40px "Trebuchet MS", sans-serif'; g.textAlign = 'left';
      g.fillText(done ? `${o.need[t]} ✓` : `${o.got[t]} / ${o.need[t]}`, 170, y + 14);
    });
    g.fillStyle = '#8dff73'; g.font = '900 34px "Trebuchet MS", sans-serif'; g.textAlign = 'center';
    g.fillText(`+$${o.reward}`, 256, 278);
    this.board.tex.needsUpdate = true;
  },

  deliverToCaravan(c, dt) {
    c.tt = (c.tt || 0) - dt;
    if (c.tt > 0) return false;
    for (const type of ['cooked', 'plank', 'smoked']) {
      if (c.carry[type] > 0 && this.orderLeft(type) > 0) {
        c.tt = 0.06;
        const from = this.stackTop(c, type);
        c.carry[type]--;
        const o = this.act2.order;
        o.incoming[type]++;
        const target = { x: A.caravan.x + rand(-0.4, 0.4), y: 1.4, z: A.caravan.z + rand(-0.6, 0.6) };
        this.fly(type, from, () => target, {
          dur: 0.45, arc: 2.4, onArrive: () => {
            o.incoming[type]--; o.got[type]++;
            this.audio.drop(o.got[type]);
            this.drawBoard();
            if (Object.keys(o.need).every((t) => o.got[t] >= o.need[t]) && !o.done) { o.done = true; this.completeOrder(); }
          },
        });
        return true;
      }
    }
    return false;
  },

  completeOrder() {
    const o = this.act2.order;
    this.act2.orders++;
    this.money += o.reward;
    this.stats.earned += o.reward;
    this.audio.fanfare();
    this.fx.label(`+$${o.reward}`, A.caravan.x, 3.6, A.caravan.z, { cls: 'cash big', life: 2 });
    this.fx.sparks(A.caravan.x, 2, A.caravan.z, { n: 40, color: [1, 0.85, 0.3], speed: 8 });
    const p = this.player;
    for (let i = 0; i < 24; i++) setTimeout(() => this.fly('cash', { x: A.caravan.x, y: 2, z: A.caravan.z }, () => this.stackTop(p, 'cash'), { dur: 0.5, arc: 3 }), i * 40);
    if (this.act2.orders === 1) this.story.beat('firstOrder', 1);
    if (this.act2.orders === 3 && this.stage < 4) this.story.beat('orderNudge', 1);
    this.act2.caravan = 'leaving'; this.act2.timer = 0;
    this.board.sprite.visible = false;
    this.refreshTiles();
    this.save?.();
  },

  updateCaravan(dt) {
    const cv = this.caravan;
    if (!cv) return;
    const s = this.act2;
    const g = cv.group;
    let moving = 0;
    if (s.caravan === 'away') {
      s.timer -= dt;
      g.visible = false;
      if (s.timer <= 0) { s.caravan = 'arriving'; s.timer = 0; s.order = this.newOrder(); g.visible = true; }
    } else if (s.caravan === 'arriving') {
      s.timer += dt;
      const f = Math.min(1, s.timer / 7);
      g.position.z = A.caravan.z + (1 - (1 - (1 - f) ** 3)) * 60;
      moving = 1 - f;
      if (f >= 1) {
        s.caravan = 'parked';
        this.drawBoard();
        this.audio.happy();
        this.fx.ring(A.relay.x, A.relay.z, { r0: 0.5, r1: 3, color: 0xf2c94c, life: 0.8 });
        if (!this.story.beat('caravanArrives', 0.3)) this.story.beat('orderHint', 0.3);
      }
    } else if (s.caravan === 'parked') {
      g.position.z = A.caravan.z;
    } else if (s.caravan === 'leaving') {
      s.timer += dt;
      const f = Math.min(1, s.timer / 6);
      g.position.z = A.caravan.z + f * f * 60;
      moving = f;
      if (f >= 1) { s.caravan = 'away'; s.timer = s.ended ? 18 : 24; s.order = null; }
    }
    g.position.x = A.caravan.x;
    cv.oxen.forEach((o) => o.pose(dt, moving * 1.2));
    cv.mira.pose(dt, 0); cv.brann.pose(dt, 0);
    const b = this.board.sprite;
    b.visible = s.caravan === 'parked' && !!s.order;
    if (b.visible) b.position.set(A.caravan.x, 4.2 + Math.sin(this.time * 2) * 0.08, A.caravan.z + 0.4);
  },

  // ---------------------------------------------------------------------
  // The Frozen Lake
  // ---------------------------------------------------------------------
  openLake(fresh) {
    this.setStage(4, fresh);
    if (this.lake) return;
    const g = new THREE.Group();
    // ice sheet with cracks, snowy shore ring
    const c = makeCanvas(512, 512), x = c.getContext('2d');
    const grad = x.createRadialGradient(256, 256, 40, 256, 256, 256);
    grad.addColorStop(0, '#9fd3ef'); grad.addColorStop(0.75, '#c4e6f6'); grad.addColorStop(0.97, '#eef7fc'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = grad; x.beginPath(); x.arc(256, 256, 256, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 2.2;
    for (let i = 0; i < 26; i++) {
      let px = 256 + rand(-200, 200), py = 256 + rand(-200, 200);
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += rand(-40, 40); py += rand(-40, 40); x.lineTo(px, py); }
      x.stroke();
    }
    const ice = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: canvasTexture(c), transparent: true, roughness: 0.18, metalness: 0.15 }));
    ice.scale.set(7.4, 1, 5.6);
    ice.position.set(A.lakeC.x, 0.02, A.lakeC.z);
    ice.receiveShadow = true;
    g.add(ice);
    this.holes = A.holes.map((h) => {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0d3550 }));
      hole.position.set(h.x, 0.035, h.z); g.add(hole);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 6, 18).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf6fbff }));
      rim.position.set(h.x, 0.05, h.z); g.add(rim);
      return { ...h, mesh: hole, busy: null };
    });
    for (const [i, t] of A.tents.entries()) {
      const tent = makeTent([0x3a6ea5, 0xb24a3a, 0x5a8f4a][i]); tent.position.set(t.x, 0, t.z); tent.rotation.y = rand(-0.5, 0.5); g.add(tent);
      this.world.circles.push({ x: t.x, z: t.z, r: 1.3 });
    }
    this.scene.add(g);
    this.lake = g;
    // smokehouse on the shore
    const f = makeFumoir();
    f.group.position.set(A.fumoir.x, 0, A.fumoir.z);
    this.scene.add(f.group);
    this.fumoir = f;
    this.world.circles.push({ x: A.fumoir.x, z: A.fumoir.z - 0.2, r: 1.5 });
    const pads = [this.padMesh('fish', A.fishPad), this.padMesh('fish', A.smokedPad, { dashed: true })];
    pads.forEach((m) => this.scene.add(m));
    // survivors of the caravan living by the lake
    const zone = { x0: LAKE.x0 + 1, x1: 18, z0: 21.5, z1: LAKE.z1 - 1 };
    for (let i = 0; i < 4; i++) this.addNpc(rand(12, 17), rand(22, 25), fresh, zone);
    if (fresh) {
      this.popIn(g, 0.3); this.popIn(f.group, 0.8); pads.forEach((m) => this.popIn(m, 1));
      this.setChapter(6, true);
      this.story.beat('lake', 2.5);
    }
  },

  updateFumoir(dt) {
    const f = this.fumoir;
    if (!f) return;
    const inp = this.pads.fishPad, out = this.pads.smokedPad;
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0 && inp.n - (inp.inflight || 0) > 0 && out.n < out.pile.cap) {
      this.smokeTimer = this.smokeTime;
      const from = this.pickPos(inp);
      inp.n--;
      const door = { x: A.fumoir.x - 0.4, y: 0.8, z: A.fumoir.z + 0.6 };
      this.fly('fish', from, () => door, {
        dur: 0.4, arc: 1.4, onArrive: () => {
          setTimeout(() => {
            this.stats.smoked++;
            if (this.stats.smoked === 1) this.story.beat('firstSmoked', 0.2);
            this.fly('smoked', { x: A.fumoir.x + 1.2, y: 1.2, z: A.fumoir.z }, this.incoming(out), { dur: 0.45, arc: 1.6, onArrive: () => { out.inflight--; } });
          }, 600);
        },
      });
    }
    const busy = inp.n > 0;
    for (const ch of f.chimneys) if (Math.random() < dt * (busy ? 7 : 2)) { const v = ch.clone().applyMatrix4(f.group.matrixWorld); this.fx.smoke(v.x, v.y, v.z); }
  },

  // Fishing: stand still next to a hole in the ice.
  updateFishing(c, dt, catchTime) {
    let hole = null;
    if (this.holes && this.load_total(c) < c.cap) {
      for (const h of this.holes) if (near(c, h, 1.55) && (!h.busy || h.busy === c)) { hole = h; break; }
    }
    const still = Math.hypot(c.vx || 0, c.vz || 0) < 0.8;
    if (!hole || !still) {
      if (c.fishing) { c.fishing.busy = null; c.fishing = null; }
      c.fishT = 0;
      return false;
    }
    if (c.fishing !== hole) { c.fishing = hole; hole.busy = c; c.fishT = 0; }
    c.facing = lerpAngle(c.facing, Math.atan2(hole.x - c.x, hole.z - c.z), Math.min(1, dt * 8));
    c.fishT += dt;
    if (c.fishT >= catchTime) {
      c.fishT = 0;
      this.fx.puff(hole.x, 0.3, hole.z, { n: 8, color: [0.75, 0.9, 1], size: [0.4, 1.0], speed: 2.5, up: 4, g: 9, life: 0.6 });
      this.audio.pop(4);
      c.reserved++;
      this.fly('fish', { x: hole.x, y: 0.2, z: hole.z }, () => this.stackTop(c, 'fish'), {
        dur: 0.5, arc: 2.2, dest: c, onArrive: () => {
          c.reserved--; c.carry.fish++;
          if (c.isPlayer) { this.stats.fished++; this.story.beat('firstFish', 0.2); this.audio.pop(c.carry.fish); }
        },
      });
    }
    return true;
  },

  updateRodVisual(c) {
    if (!c.rod) {
      c.rod = makeRod();
      c.model.root.add(c.rod);
      c.rod.position.set(0.3, 1.1, 0.25);
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      c.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
      c.line.frustumCulled = false;
      this.scene.add(c.line);
      c.bobber = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
      this.scene.add(c.bobber);
    }
    const on = !!c.fishing;
    c.rod.visible = on; c.line.visible = on; c.bobber.visible = on;
    if (c.model.tool) c.model.tool.visible = !on;
    if (!on) return;
    const tip = new THREE.Vector3(0, 1.75, 0).applyMatrix4(c.rod.matrixWorld);
    const h = c.fishing;
    const bob = Math.sin(this.time * 6) * 0.04 - (c.fishT > (c === this.player ? this.catchTime : 1.6) - 0.35 ? 0.12 : 0);
    c.bobber.position.set(h.x, 0.08 + bob, h.z);
    c.line.geometry.attributes.position.setXYZ(0, tip.x, tip.y, tip.z);
    c.line.geometry.attributes.position.setXYZ(1, h.x, 0.1 + bob, h.z);
    c.line.geometry.attributes.position.needsUpdate = true;
  },

  // ---------------------------------------------------------------------
  // Blizzard, Great Brazier and the ending
  // ---------------------------------------------------------------------
  startBlizzard(fresh) {
    if (this.act2.blizzard) return;
    this.act2.blizzard = true;
    if (fresh) { this.setChapter(7, true); this.story.beat('blizzard', 1.5); this.shake = 0.4; }
    else this.weather = 0.7;
    this.refreshTiles();
  },

  buildBrasier(fresh) {
    const b = makeBrasier();
    b.group.position.set(A.brasier.x, 0, A.brasier.z);
    this.scene.add(b.group);
    this.brasierModel = b;
    this.world.circles.push({ x: A.brasier.x, z: A.brasier.z, r: 3.0 });
    const ignite = () => {
      b.lit = true;
      b.flames.forEach((f) => { f.visible = true; }); b.halo.visible = true; b.torches.forEach((t) => { t.visible = true; });
    };
    if (!fresh) { ignite(); b.light.intensity = 70; this.act2.ended = true; this.weather = 0; this.clearSky = 1; return; }
    this.popIn(b.group);
    this.act2.finale = 0.001;
    this.weatherTarget = 1;
    this.zoomPulse = 9;
    setTimeout(() => {
      ignite();
      this.audio.boom(); this.audio.fanfare();
      this.shake = 1.4;
      this.fx.ring(A.brasier.x, A.brasier.z, { r0: 1, r1: 30, color: 0xffc070, life: 2.2, opacity: 0.9 });
      for (let i = 0; i < 4; i++) setTimeout(() => this.fx.sparks(A.brasier.x, 4, A.brasier.z, { n: 60, color: [1, 0.7, 0.2], speed: 12, life: 1.2 }), i * 180);
      this.world.tween(3, (f) => { b.light.intensity = f * 70; });
      this.act2.ended = true;
      this.weatherTarget = 0;
      this.story.beat('ending', 2);
      setTimeout(() => { this.setChapter(8, true); }, 4500);
      setTimeout(() => { document.getElementById('credits')?.classList.add('on'); }, 11000);
      setTimeout(() => this.story.beat('postGame', 0.5), 14000);
      this.refreshTiles();
      this.save?.();
    }, 2600);
  },

  updateWeather(dt) {
    const s = this.act2;
    if (s.blizzard && !s.ended) {
      s.blizzardT += dt;
      this.weatherTarget = this.weatherTarget === 1 ? 1 : Math.min(0.72, s.blizzardT / 80);
      if (this.weather > 0.55) this.story.beat('blizzardMid');
    }
    const want = s.ended && this.weatherTarget !== 1 ? 0 : (this.weatherTarget ?? 0);
    this.weather += (want - this.weather) * Math.min(1, dt * (s.ended ? 0.5 : 0.8));
    if (s.ended) this.clearSky = Math.min(1, this.clearSky + dt * 0.15);
    if (this.weather > 0.4 && Math.random() < dt * this.weather * 0.6) this.shake = Math.max(this.shake, 0.08);
  },

  // ---------------------------------------------------------------------
  // Embellishments (free play)
  // ---------------------------------------------------------------------
  buildLanterns(fresh) {
    const r = STAGES[4];
    const posts = [];
    for (let x = r.x0 + 1.2; x <= r.x1 - 1; x += 4.4) { posts.push([x, r.z0 + 0.8, 0]); }
    for (let z = r.z0 + 3; z <= r.z1 - 1.5; z += 4.4) { posts.push([r.x0 + 0.8, z, Math.PI / 2]); posts.push([r.x1 - 0.8, z, -Math.PI / 2]); }
    posts.forEach(([x, z, rot], i) => {
      if (this.world.circles.some((c) => near(c, { x, z }, c.r + 0.5))) return;
      const l = makeLanternPost(); l.position.set(x, 0, z); l.rotation.y = rot; this.scene.add(l);
      if (fresh) this.popIn(l, i * 0.05);
    });
  },

  buildStatue(fresh) {
    const s = makeStatue(); s.position.set(A.statue.x, 0, A.statue.z); s.rotation.y = Math.PI * 1.1; this.scene.add(s);
    this.world.circles.push({ x: A.statue.x, z: A.statue.z, r: 1.0 });
    if (fresh) this.popIn(s);
  },

  buildSculptures(fresh) {
    [[0, -0.9, 0.2], [1.6, 0.8, 2.3], [-1.6, 0.9, 4.2]].forEach(([dx, dz, rot], i) => {
      const b = makeIceSculpture(1.1 + i * 0.1); b.position.set(A.lakeC.x + dx, 0, A.lakeC.z + dz); b.rotation.y = rot; this.scene.add(b);
      if (fresh) this.popIn(b, i * 0.2);
    });
    this.world.circles.push({ x: A.lakeC.x, z: A.lakeC.z, r: 2.2 });
  },

  updateFestival(dt) {
    if (!this.act2.festival) return;
    this.fireworkT = (this.fireworkT || 0) - dt;
    if (this.fireworkT <= 0) {
      this.fireworkT = rand(1.2, 3.2);
      const x = this.player.x + rand(-8, 8), z = this.player.z + rand(-10, 4), y = rand(9, 13);
      const cols = [[1, 0.4, 0.4], [0.5, 0.8, 1], [1, 0.85, 0.3], [0.6, 1, 0.5], [1, 0.5, 1]];
      const col = cols[Math.floor(Math.random() * cols.length)];
      this.fx.sparks(x, y, z, { n: 50, color: col, speed: 9, life: 1.4, g: 3, size: [0.7, 0.1] });
      this.fx.flash(x, y, z, { color: col, size: 8, life: 0.3 });
      this.audio.pop(10);
    }
  },

  // ---------------------------------------------------------------------
  // Hooks called by Game
  // ---------------------------------------------------------------------
  act2Apply(id, fresh) {
    const p = this.player;
    switch (id) {
      case 'courier': this.addWorker('courier', fresh); if (fresh) this.story.beat('courier'); break;
      case 'lakeRoad': this.openLake(fresh); break;
      case 'fisher': this.addWorker('fisher', fresh); if (fresh) this.story.beat('fisher'); break;
      case 'rod': this.catchTime = 0.8; if (fresh) this.story.beat('rod'); break;
      case 'fumoirUp': { const parts = upgradeFumoir(this.fumoir); this.smokeTime = 0.6; if (fresh) { this.popIn(parts); this.story.beat('fumoirUp'); } break; }
      case 'brasier': this.buildBrasier(fresh); break;
      case 'lanterns': this.buildLanterns(fresh); if (fresh) this.story.beat('lanterns'); break;
      case 'statue': this.buildStatue(fresh); if (fresh) this.story.beat('statue'); break;
      case 'sculpt': this.buildSculptures(fresh); if (fresh) this.story.beat('sculpt'); break;
      case 'festival': this.act2.festival = true; this.rewardMult = 2; this.priceMult *= 1.25; if (fresh) this.story.beat('festival'); break;
      default: break;
    }
    void p;
  },

  act2Stations(dt) {
    const p = this.player;
    if (this.caravan && near(p, A.relay, 1.25)) this.deliverToCaravan(p, dt);
    if (this.fumoir) {
      if (near(p, A.fishPad, 1.2)) this.transfer(p, this.pads.fishPad, 'drop', dt, 0.05);
      if (near(p, A.smokedPad, 1.2)) this.transfer(p, this.pads.smokedPad, 'pick', dt, 0.05);
    }
    if (this.holes) { this.updateFishing(p, dt, this.catchTime); this.updateRodVisual(p); }
  },

  act2Worker(w, dt, arrived, total) {
    if (w.kind === 'fisher') {
      if (w.state === 'idle') {
        if (total >= w.cap) { w.state = 'deliver'; this.route(w, A.fishPad); return; }
        const free = this.holes.filter((h) => !h.busy).sort((a, b) => dist(a, w) - dist(b, w))[0];
        if (free) { w.hole = free; free.busy = w; w.state = 'walk'; const ang = Math.atan2(w.x - free.x, w.z - free.z); this.route(w, { x: free.x + Math.sin(ang) * 1.1, z: free.z + Math.cos(ang) * 1.1, reach: 0.25 }); }
        else { w.state = 'wait'; w.timer = 2; }
      } else if (w.state === 'wait') { w.timer -= dt; if (w.timer <= 0) w.state = 'idle'; }
      else if (w.state === 'walk' && arrived) {
        w.hole.busy = null;
        if (total >= w.cap) { w.fishing = null; w.state = 'idle'; return; }
        this.updateFishing(w, dt, 1.6);
        if (!w.fishing) w.state = 'idle';
      } else if (w.state === 'deliver' && arrived) {
        if (this.transfer(w, this.pads.fishPad, 'drop', dt) === 'done') w.state = 'idle';
      }
      this.updateRodVisual(w);
    } else if (w.kind === 'courier') {
      if (w.state === 'idle') {
        if (total > 0) { w.state = 'deliver'; this.route(w, A.relay); return; }
        const type = ['smoked', 'plank', 'cooked'].find((t) => this.orderLeft(t) > 0 && this.pads[SOURCE[t]] && this.pads[SOURCE[t]].n - (this.pads[SOURCE[t]].inflight || 0) > 0);
        if (type) { w.state = 'fetch'; w.want = type; this.route(w, this.pads[SOURCE[type]]); }
        else { w.state = 'wait'; w.timer = 1.2; this.route(w, { x: A.relay.x - 1.2, z: A.relay.z - 1.2 }); }
      } else if (w.state === 'wait') { w.timer -= dt; if (w.timer <= 0) w.state = 'idle'; }
      else if (w.state === 'fetch' && arrived) {
        const left = this.orderLeft(w.want) - (w.carry[w.want] || 0) - w.reserved;
        if (left <= 0 || total >= w.cap || this.transfer(w, this.pads[SOURCE[w.want]], 'pick', dt) === 'done') { w.state = 'deliver'; this.route(w, A.relay); }
      } else if (w.state === 'deliver' && arrived) {
        if (w.reserved > 0) return;
        if (!this.deliverToCaravan(w, dt) && w.tt <= 0) {
          // nothing more the caravan wants: hand leftovers to the counter
          if (total > 0) { w.state = 'toCounter'; this.route(w, { x: -2.2, z: 4.6 }); } else w.state = 'idle';
        }
      } else if (w.state === 'toCounter' && arrived) {
        if (this.dropToCounter(w, dt) === 'done') w.state = 'idle';
      }
    }
  },

  act2Objective(p) {
    if (!this.act2.started) return null;
    const parked = this.act2.caravan === 'parked';
    const carriesForOrder = ['cooked', 'plank', 'smoked'].some((t) => p.carry[t] > 0 && this.orderLeft(t) > 0);
    if (parked && carriesForOrder) return { at: A.relay, text: 'Livre la commande de la caravane', icon: 'sled' };
    if (p.carry.fish > 0 && this.fumoir && (this.load_total(p) >= p.cap * 0.6 || !p.fishing)) return { at: A.fishPad, text: 'Porte le poisson au fumoir', icon: 'fish' };
    if (p.carry.smoked > 0) return { at: { x: -4.0, z: 4.3 }, text: 'Sers le poisson fumé au comptoir', icon: 'person' };
    return null;
  },

  act2LateObjective(p) {
    if (!this.act2.started) return null;
    const parked = this.act2.caravan === 'parked';
    const courier = this.workers.some((w) => w.kind === 'courier');
    if (parked && !courier) {
      const type = ['smoked', 'plank', 'cooked'].find((t) => this.orderLeft(t) > 0 && this.pads[SOURCE[t]] && this.pads[SOURCE[t]].n >= 3);
      if (type) return { at: this.pads[SOURCE[type]], text: 'Prépare la commande de la caravane', icon: 'sled' };
    }
    if (this.act2.blizzard && !this.bought.brasier) {
      const t = this.tiles.find((x) => x.def.id === 'brasier');
      if (t && this.money >= 200) return { at: t.def.at, text: 'Finance le Grand Brasier', icon: 'fire' };
    }
    if (this.holes && !this.workers.some((w) => w.kind === 'fisher') && this.pads.fishPad.n + this.pads.smokedPad.n < 6) {
      const h = this.holes.find((x) => !x.busy) || this.holes[0];
      return { at: h, text: 'Pêche sur le lac gelé', icon: 'fish' };
    }
    return null;
  },

  updateAct2(dt) {
    if (!this.act2.started) return;
    this.updateCaravan(dt);
    this.updateFumoir(dt);
    this.updateWeather(dt);
    this.updateFestival(dt);
    if (!this.act2.blizzard && this.stage >= 4 && this.act2.orders >= 4 && this.stats.smoked >= 10) this.startBlizzard(true);
    if (this.brasierModel && this.brasierModel.lit) {
      const b = this.brasierModel;
      b.flames.forEach((f, i) => { f.scale.set(1 + Math.sin(this.time * 9 + i) * 0.1, 1 + Math.sin(this.time * 13 + i * 2) * 0.18, 1 + Math.cos(this.time * 9 + i) * 0.1); });
      b.light.intensity = Math.max(b.light.intensity * 0.999, 55) + Math.sin(this.time * 11) * 4;
      if (Math.random() < dt * 20) this.fx.ember(A.brasier.x + rand(-1, 1), 3.5, A.brasier.z + rand(-1, 1));
    }
  },

  act2Serialize() {
    const s = this.act2;
    return { started: s.started, orders: s.orders, order: s.order && s.caravan === 'parked' ? { need: s.order.need, got: s.order.got, reward: s.order.reward } : null, blizzard: s.blizzard, blizzardT: s.blizzardT, fish: this.pads.fishPad.n, smoked: this.pads.smokedPad.n, counterFish: this.pads.counterFish.n };
  },

  act2Load(d) {
    if (!d) return;
    const s = this.act2;
    s.orders = d.orders || 0;
    s.blizzardT = d.blizzardT || 0;
    this.pads.fishPad.n = d.fish || 0; this.pads.smokedPad.n = d.smoked || 0; this.pads.counterFish.n = d.counterFish || 0;
    if (s.started && d.order) {
      s.order = { ...d.order, incoming: { cooked: 0, plank: 0, smoked: 0 } };
      s.caravan = 'parked';
      this.caravan.group.visible = true;
      this.caravan.group.position.z = A.caravan.z;
      this.drawBoard();
    } else if (s.started) { s.caravan = 'away'; s.timer = 4; }
    if (d.blizzard && !this.bought.brasier) this.startBlizzard(false);
  },
};

export function installAct2(Game) {
  Object.assign(Game.prototype, methods);
}
export { backOut };
