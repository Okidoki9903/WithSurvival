// Floating joystick (touch / mouse drag), two-finger pinch or mouse wheel
// zoom, and keyboard input.
const ZMIN = 0.72, ZMAX = 1.55;
const clampZ = (z) => Math.min(ZMAX, Math.max(ZMIN, z));

export class Input {
  constructor(el, joyEl, knobEl) {
    this.x = 0; this.z = 0; // screen-space intent: x right, z down
    this.keys = new Set();
    this.active = null;
    this.joy = joyEl; this.knob = knobEl;
    this.onFirst = null;
    this.zoom = 1;
    this.pointers = new Map();
    this.pinch = null;
    const R = 56;
    const releaseStick = () => { this.active = null; this.x = 0; this.z = 0; this.joy.classList.remove('on'); };
    el.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture?.(e.pointerId);
      this.onFirst && this.onFirst();
      if (this.pointers.size === 2) {
        // second finger: pinch to zoom instead of walking
        releaseStick();
        const [a, b] = [...this.pointers.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.zoom };
        return;
      }
      if (this.active !== null || this.pinch) return;
      this.active = e.pointerId;
      this.ox = e.clientX; this.oy = e.clientY;
      this.joy.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      this.joy.classList.add('on');
      this.knob.style.transform = 'translate(-50%, -50%)';
    });
    el.addEventListener('pointermove', (e) => {
      const pt = this.pointers.get(e.pointerId);
      if (pt) { pt.x = e.clientX; pt.y = e.clientY; }
      if (this.pinch && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        this.zoom = clampZ(this.pinch.zoom * this.pinch.d / d);
        return;
      }
      if (e.pointerId !== this.active) return;
      let dx = e.clientX - this.ox, dy = e.clientY - this.oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { this.ox += dx - dx / d * R; this.oy += dy - dy / d * R; dx = dx / d * R; dy = dy / d * R; this.joy.style.transform = `translate(${this.ox}px, ${this.oy}px)`; }
      this.x = dx / R; this.z = dy / R;
      const m = Math.hypot(this.x, this.z);
      if (m < 0.12) { this.x = 0; this.z = 0; }
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (e.pointerId === this.active) releaseStick();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = clampZ(this.zoom * Math.exp(e.deltaY * 0.0012)); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code); this.onFirst && this.onFirst();
      if (e.code === 'Equal' || e.code === 'NumpadAdd') this.zoom = clampZ(this.zoom / 1.12);
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.zoom = clampZ(this.zoom * 1.12);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); this.pinch = null; releaseStick(); });
  }
  read() {
    let kx = 0, kz = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('KeyQ') || k.has('ArrowLeft')) kx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) kx += 1;
    if (k.has('KeyW') || k.has('KeyZ') || k.has('ArrowUp')) kz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) kz += 1;
    if (kx || kz) { const m = Math.hypot(kx, kz); return { x: kx / m, z: kz / m }; }
    const m = Math.hypot(this.x, this.z);
    if (m > 1) return { x: this.x / m, z: this.z / m };
    return { x: this.x, z: this.z };
  }
}
