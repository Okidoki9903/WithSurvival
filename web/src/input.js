// Floating joystick (touch / mouse drag) and keyboard input.
export class Input {
  constructor(el, joyEl, knobEl) {
    this.x = 0; this.z = 0; // screen-space intent: x right, z down
    this.keys = new Set();
    this.active = null;
    this.joy = joyEl; this.knob = knobEl;
    this.onFirst = null;
    const R = 56;
    el.addEventListener('pointerdown', (e) => {
      if (this.active !== null) return;
      this.active = e.pointerId;
      this.ox = e.clientX; this.oy = e.clientY;
      this.joy.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      this.joy.classList.add('on');
      this.knob.style.transform = 'translate(-50%, -50%)';
      el.setPointerCapture?.(e.pointerId);
      this.onFirst && this.onFirst();
    });
    el.addEventListener('pointermove', (e) => {
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
      if (e.pointerId !== this.active) return;
      this.active = null; this.x = 0; this.z = 0;
      this.joy.classList.remove('on');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    window.addEventListener('keydown', (e) => { this.keys.add(e.code); this.onFirst && this.onFirst(); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.active = null; this.x = 0; this.z = 0; this.joy.classList.remove('on'); });
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
