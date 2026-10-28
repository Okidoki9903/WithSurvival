// Tiny WebAudio synth: no audio files needed.
export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    try { this.enabled = localStorage.getItem('ws-sound') !== '0'; } catch { /* storage unavailable */ }
    this.last = {};
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.55 : 0;
    this.master.connect(this.ctx.destination);
    this.startWind();
  }
  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('ws-sound', this.enabled ? '1' : '0'); } catch { /* ignore */ }
    if (this.master) this.master.gain.value = this.enabled ? 0.55 : 0;
    return this.enabled;
  }
  throttle(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return false;
    this.last[name] = now; return true;
  }
  tone(freq, dur, { type = 'sine', vol = 0.2, slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, { vol = 0.2, freq = 800, q = 1, type = 'bandpass', delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }
  startWind() {
    const len = this.ctx.sampleRate * 4;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.015; d[i] = last * 6; }
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.windGain = g; this.windFilter = f;
  }

  setWind(level) {
    if (!this.windGain) return;
    this.windGain.gain.value = 0.05 + level * 0.35;
    this.windFilter.frequency.value = 500 + level * 900;
  }
  hit() { if (!this.throttle('hit', 60)) return; this.noise(0.12, { vol: 0.35, freq: 420, q: 0.8 }); this.tone(120, 0.12, { type: 'triangle', vol: 0.25, slide: -60 }); }
  chop() { if (!this.throttle('chop', 60)) return; this.noise(0.09, { vol: 0.3, freq: 1600, q: 2 }); this.tone(220, 0.08, { type: 'square', vol: 0.06, slide: -80 }); }
  growl() { if (!this.throttle('growl', 600)) return; this.tone(85, 0.5, { type: 'sawtooth', vol: 0.08, slide: -25 }); this.noise(0.4, { vol: 0.1, freq: 300, q: 3 }); }
  splat() { if (!this.throttle('splat', 80)) return; this.noise(0.25, { vol: 0.35, freq: 600, q: 0.7 }); this.tone(90, 0.25, { type: 'sine', vol: 0.3, slide: -40 }); }
  pop(i = 0) { if (!this.throttle('pop', 35)) return; this.tone(520 + Math.min(i, 30) * 22, 0.06, { type: 'sine', vol: 0.12, slide: 200 }); }
  drop(i = 0) { if (!this.throttle('drop', 40)) return; this.tone(420 - Math.min(i, 20) * 6, 0.05, { type: 'triangle', vol: 0.1 }); }
  cash() { if (!this.throttle('cash', 45)) return; this.tone(1320, 0.05, { type: 'square', vol: 0.04 }); this.tone(1760, 0.08, { type: 'square', vol: 0.04, delay: 0.04 }); }
  pay() { if (!this.throttle('pay', 40)) return; this.tone(880, 0.04, { type: 'triangle', vol: 0.08, slide: 120 }); }
  sizzle() { if (!this.throttle('sizzle', 300)) return; this.noise(0.35, { vol: 0.06, freq: 4000, q: 0.5, type: 'highpass' }); }
  happy() { if (!this.throttle('happy', 120)) return; this.tone(660, 0.1, { vol: 0.12 }); this.tone(990, 0.14, { vol: 0.12, delay: 0.08 }); }
  build() {
    this.noise(0.6, { vol: 0.25, freq: 300, q: 0.6, type: 'lowpass' });
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.12, delay: i * 0.07 }));
  }
  whoosh() { if (!this.throttle('whoosh', 250)) return; this.noise(0.25, { vol: 0.12, freq: 900, q: 1.5 }); }
  shoot() { if (!this.throttle('shoot', 90)) return; this.tone(300, 0.08, { type: 'square', vol: 0.05, slide: -150 }); this.noise(0.08, { vol: 0.08, freq: 2000, q: 3 }); }
  boom() { this.noise(0.9, { vol: 0.5, freq: 150, q: 0.5, type: 'lowpass' }); this.tone(55, 0.8, { vol: 0.4, slide: -20 }); }
  whistle() { if (!this.throttle('whistle', 3500)) return; this.tone(1180, 0.55, { type: 'triangle', vol: 0.05, slide: 40 }); this.tone(1490, 0.55, { type: 'triangle', vol: 0.04, slide: 40 }); this.noise(0.5, { vol: 0.05, freq: 5000, q: 0.6, type: 'highpass' }); }
  cannon() { if (!this.throttle('cannon', 110)) return; this.noise(0.35, { vol: 0.28, freq: 260, q: 0.6, type: 'lowpass' }); this.tone(70, 0.3, { vol: 0.22, slide: -30 }); }
  clank() { if (!this.throttle('clank', 260)) return; this.tone(180 + Math.random() * 60, 0.07, { type: 'square', vol: 0.035 }); }
  heartbeat() { if (!this.throttle('heart', 900)) return; this.tone(55, 0.25, { vol: 0.3 }); this.tone(50, 0.25, { vol: 0.25, delay: 0.22 }); }
  fanfare() { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.13, delay: i * 0.12 })); }
}
