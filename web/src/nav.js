// Navigation grid for the guide arrow: a walkability grid of the open world
// and a distance field from the current objective, so the arrow always
// points along a real path around cabins, machines and palisades.
const SQ2 = Math.SQRT2;

export class NavGrid {
  constructor(world) {
    this.world = world;
    this.step = 0.5;
    this.grid = null;
    this.version = -1;
    this.fieldKey = '';
  }

  signature() {
    const w = this.world;
    return `${w.stage}|${w.circles.length}|${w.segments.length}|${(w.extraZones || []).length}|${w.shipGate ? 1 : 0}`;
  }

  // Rasterise the walkable ground and stamp every obstacle onto it: much
  // cheaper than testing every cell against every obstacle.
  build(b) {
    const s = this.step, w = this.world, R = 0.46;
    const nx = Math.ceil((b.x1 - b.x0) / s) + 1, nz = Math.ceil((b.z1 - b.z0) / s) + 1;
    const free = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) free[j * nx + i] = w.walkable(b.x0 + i * s, b.z0 + j * s) ? 1 : 0;
    const stamp = (x0, z0, x1, z1, test) => {
      const i0 = Math.max(0, Math.floor((x0 - b.x0) / s)), i1 = Math.min(nx - 1, Math.ceil((x1 - b.x0) / s));
      const j0 = Math.max(0, Math.floor((z0 - b.z0) / s)), j1 = Math.min(nz - 1, Math.ceil((z1 - b.z0) / s));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * nx + i; if (free[k] && test(b.x0 + i * s, b.z0 + j * s)) free[k] = 0; }
    };
    for (const g of w.segments) {
      const m = R + 0.12, vx = g.bx - g.ax, vz = g.bz - g.az, l2 = vx * vx + vz * vz || 1;
      stamp(Math.min(g.ax, g.bx) - m, Math.min(g.az, g.bz) - m, Math.max(g.ax, g.bx) + m, Math.max(g.az, g.bz) + m, (x, z) => {
        const t = Math.max(0, Math.min(1, ((x - g.ax) * vx + (z - g.az) * vz) / l2));
        return Math.hypot(x - g.ax - vx * t, z - g.az - vz * t) < m;
      });
    }
    for (const c of w.circles) {
      if (c.camp && w.stage < 1) continue;
      const m = c.r + R;
      stamp(c.x - m, c.z - m, c.x + m, c.z + m, (x, z) => (x - c.x) ** 2 + (z - c.z) ** 2 < m * m);
    }
    if (w.forest) for (const t of w.forest.trees) {
      if (!t.alive || t.k < 0.6 || t.x < b.x0 - 2 || t.x > b.x1 + 2 || t.z < b.z0 - 2 || t.z > b.z1 + 2) continue;
      const m = 0.55 * t.s + R;
      stamp(t.x - m, t.z - m, t.x + m, t.z + m, (x, z) => (x - t.x) ** 2 + (z - t.z) ** 2 < m * m);
    }
    this.grid = { b, nx, nz, free, dist: new Float64Array(nx * nz) };
    this.sig = this.signature();
    this.builtAt = performance.now();
    this.fieldKey = '';
  }

  // Rebuild when the world changed (a building, a fence, a zone), at most every few seconds.
  ensure(bounds) {
    const sig = this.signature();
    const b = this.grid && this.grid.b;
    const sameBounds = b && b.x0 === bounds.x0 && b.x1 === bounds.x1 && b.z0 === bounds.z0 && b.z1 === bounds.z1;
    if (!this.grid || !sameBounds || (sig !== this.sig && performance.now() - this.builtAt > 2500) || this.dirty) {
      this.dirty = false;
      this.build(bounds);
    }
  }

  cell(x, z) {
    const g = this.grid;
    const i = Math.round((x - g.b.x0) / this.step), j = Math.round((z - g.b.z0) / this.step);
    if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) return -1;
    return j * g.nx + i;
  }

  nearestFree(k, r = 6) {
    const g = this.grid;
    if (k < 0) return -1;
    if (g.free[k]) return k;
    const i0 = k % g.nx, j0 = (k - i0) / g.nx;
    let best = -1, bd = Infinity;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const i = i0 + di, j = j0 + dj;
      if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
      const kk = j * g.nx + i;
      if (g.free[kk] && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = kk; }
    }
    return best;
  }

  // Dijkstra-lite (8-connected, no corner cutting) from the target cell.
  field(tk) {
    const g = this.grid;
    const D = g.dist;
    D.fill(Infinity);
    D[tk] = 0;
    // bucketed queue: distances are multiples of 1 or sqrt2, a binary heap is plenty
    const heap = [[0, tk]];
    const push = (d, k) => { heap.push([d, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const { nx, nz, free } = g;
    while (heap.length) {
      const [d, k] = pop();
      if (d > D[k]) continue;
      const i = k % nx, j = (k - i) / nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = i + di, c = j + dj;
        if (a < 0 || c < 0 || a >= nx || c >= nz) continue;
        const kk = c * nx + a;
        if (!free[kk]) continue;
        if (di && dj && (!free[j * nx + a] || !free[c * nx + i])) continue;
        const nd = d + (di && dj ? SQ2 : 1);
        if (nd < D[kk]) { D[kk] = nd; push(nd, kk); }
      }
    }
  }

  clearLine(k0, k1) {
    const g = this.grid;
    const i0 = k0 % g.nx, j0 = (k0 - i0) / g.nx, i1 = k1 % g.nx, j1 = (k1 - i1) / g.nx;
    const n = Math.max(Math.abs(i1 - i0), Math.abs(j1 - j0)) * 2;
    for (let t = 1; t < n; t++) {
      const i = Math.round(i0 + (i1 - i0) * t / n), j = Math.round(j0 + (j1 - j0) * t / n);
      if (!g.free[j * g.nx + i]) return false;
    }
    return true;
  }

  // Can a walker standing at `from` go straight to the centre of cell k?
  sight(from, k) {
    const g = this.grid;
    const i = k % g.nx, j = (k - i) / g.nx;
    const x = g.b.x0 + i * this.step, z = g.b.z0 + j * this.step;
    const d = Math.hypot(x - from.x, z - from.z), n = Math.ceil(d / 0.3);
    for (let t = 1; t <= n; t++) if (!this.world.freeAt(from.x + (x - from.x) * t / n, from.z + (z - from.z) * t / n, 0.47)) return false;
    return true;
  }

  // Next point to walk towards on the way from `from` to `to`, or null.
  next(from, to) {
    const g = this.grid;
    if (!g) return null;
    const tk = this.nearestFree(this.cell(to.x, to.z));
    const fk = this.nearestFree(this.cell(from.x, from.z), 3);
    if (tk < 0 || fk < 0) return null;
    if (this.fieldKey !== tk) { this.field(tk); this.fieldKey = tk; }
    const D = g.dist;
    if (!isFinite(D[fk])) return null;
    // walk down the field, keep the furthest cell still in straight sight
    let k = fk, best = fk, first = -1;
    for (let s = 0; s < 24 && D[k] > 0; s++) {
      const i = k % g.nx, j = (k - i) / g.nx;
      let nk = k, nd = D[k];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, c = j + dj;
        if (a < 0 || c < 0 || a >= g.nx || c >= g.nz) continue;
        if (di && dj && (!g.free[j * g.nx + a] || !g.free[c * g.nx + i])) continue;
        const kk = c * g.nx + a;
        if (D[kk] < nd) { nd = D[kk]; nk = kk; }
      }
      if (nk === k) break;
      k = nk;
      if (first < 0) first = k;
      if (this.sight(from, k)) best = k;
      else break;
    }
    // always lead at least one step down the path
    if (best === fk && first >= 0) best = first;
    if (D[best] === 0) return { x: to.x, z: to.z, final: true };
    const i = best % g.nx, j = (best - i) / g.nx;
    return { x: g.b.x0 + i * this.step, z: g.b.z0 + j * this.step, final: false };
  }

  // Where a walker at `p` should stand to be connected to `anchor`, or null if it already is.
  rescue(p, anchor) {
    const g = this.grid;
    const ak = this.nearestFree(this.cell(anchor.x, anchor.z));
    if (ak < 0) return null;
    this.field(ak); this.fieldKey = ak;
    const pk = this.cell(p.x, p.z);
    if (pk < 0) return null;
    if (g.free[pk] && isFinite(g.dist[pk]) && this.world.freeAt(p.x, p.z, 0.45)) return null;
    const i0 = pk % g.nx, j0 = (pk - i0) / g.nx;
    let best = -1, bd = Infinity;
    for (let k = 0; k < g.nx * g.nz; k++) {
      if (!isFinite(g.dist[k])) continue;
      const i = k % g.nx, j = (k - i) / g.nx, d = (i - i0) ** 2 + (j - j0) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    if (best < 0) return null;
    const i = best % g.nx, j = (best - i) / g.nx;
    return { x: g.b.x0 + i * this.step, z: g.b.z0 + j * this.step };
  }
}
