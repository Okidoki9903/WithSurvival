// Particles, ground rings and floating labels.
import * as THREE from 'three';
import { ringTexture } from './textures.js';

const VERT = `
attribute float size;
attribute float alpha;
attribute vec3 tint;
varying float vAlpha;
varying vec3 vTint;
uniform float uScale;
void main() {
  vAlpha = alpha; vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying float vAlpha;
varying vec3 vTint;
uniform float uSoft;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float a = smoothstep(1.0, uSoft, r) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vTint, a);
}`;

class PointPool {
  constructor(scene, max, additive, soft) {
    this.max = max;
    this.list = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.tint = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uScale: { value: 600 }, uSoft: { value: soft } },
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }
  spawn(p) { if (this.list.length < this.max) this.list.push(p); }
  update(dt) {
    let n = 0;
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.max) { L[i] = L[L.length - 1]; L.pop(); continue; }
      p.vy -= p.g * dt;
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05 && p.g > 0) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
    }
    for (const p of L) {
      const f = p.life / p.max;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = p.y; this.pos[n * 3 + 2] = p.z;
      this.tint[n * 3] = p.r; this.tint[n * 3 + 1] = p.gc; this.tint[n * 3 + 2] = p.b;
      this.size[n] = p.s0 + (p.s1 - p.s0) * f;
      this.alpha[n] = p.a * (f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85);
      n++;
    }
    this.geo.setDrawRange(0, n);
    for (const k of ['position', 'tint', 'size', 'alpha']) this.geo.attributes[k].needsUpdate = true;
  }
}

export class FX {
  constructor(scene, camera, layer) {
    this.scene = scene; this.camera = camera; this.layer = layer;
    this.soft = new PointPool(scene, 1500, false, 0.2);
    this.glow = new PointPool(scene, 900, true, 0.0);
    this.rings = [];
    this.ringTex = ringTexture();
    this.labels = [];
    this.v = new THREE.Vector3();
  }
  setScale(h) { this.soft.material.uniforms.uScale.value = h; this.glow.material.uniforms.uScale.value = h; }

  puff(x, y, z, { n = 14, color = [1, 1, 1], size = [1.4, 3.2], speed = 3, up = 2, life = 0.8, g = -0.5, spread = 0.6, alpha = 0.9 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.6);
      this.soft.spawn({ x: x + Math.cos(a) * spread * Math.random(), y: y + Math.random() * 0.5, z: z + Math.sin(a) * spread * Math.random(), vx: Math.cos(a) * sp, vy: up * (0.5 + Math.random()), vz: Math.sin(a) * sp, g, drag: 2.5, life: 0, max: life * (0.7 + Math.random() * 0.6), s0: size[0], s1: size[1], r: color[0], gc: color[1], b: color[2], a: alpha });
    }
  }
  sparks(x, y, z, { n = 10, color = [1, 0.4, 0.55], size = [0.6, 0.1], speed = 6, life = 0.45, g = 8 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.6);
      this.glow.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: 2 + Math.random() * 4, vz: Math.sin(a) * sp, g, drag: 1.5, life: 0, max: life * (0.6 + Math.random() * 0.8), s0: size[0], s1: size[1], r: color[0], gc: color[1], b: color[2], a: 1 });
    }
  }
  flash(x, y, z, { color = [1, 0.3, 0.55], size = 5, life = 0.25 } = {}) {
    this.glow.spawn({ x, y, z, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, life: 0, max: life, s0: size * 0.6, s1: size, r: color[0], gc: color[1], b: color[2], a: 0.9 });
  }
  smoke(x, y, z) {
    this.soft.spawn({ x: x + (Math.random() - 0.5) * 0.2, y, z: z + (Math.random() - 0.5) * 0.2, vx: 0.3 + Math.random() * 0.3, vy: 1.0 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.3, g: 0, drag: 0.4, life: 0, max: 2.6, s0: 0.8, s1: 3.2, r: 0.82, gc: 0.85, b: 0.9, a: 0.45 });
  }
  ember(x, y, z) {
    this.glow.spawn({ x: x + (Math.random() - 0.5) * 0.9, y, z: z + (Math.random() - 0.5) * 0.9, vx: (Math.random() - 0.5) * 0.6, vy: 1.5 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 0.6, g: -0.3, drag: 0.8, life: 0, max: 0.9 + Math.random() * 0.6, s0: 0.35, s1: 0.05, r: 1, gc: 0.55, b: 0.15, a: 1 });
  }

  ring(x, z, { color = 0xffffff, r0 = 0.5, r1 = 3, life = 0.5, opacity = 0.8, y = 0.06 } = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.ringTex, color, transparent: true, depthWrite: false, opacity }));
    m.position.set(x, y, z);
    m.renderOrder = 4;
    this.scene.add(m);
    this.rings.push({ m, t: 0, r0, r1, life, opacity });
    return m;
  }

  label(text, x, y, z, { cls = '', life = 1.1 } = {}) {
    const el = document.createElement('div');
    el.className = `float-label ${cls}`;
    el.textContent = text;
    this.layer.appendChild(el);
    this.labels.push({ el, x, y, z, t: 0, life });
  }

  update(dt, viewH, viewW) {
    this.soft.update(dt); this.glow.update(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      const f = Math.min(1, r.t / r.life);
      const s = r.r0 + (r.r1 - r.r0) * (1 - (1 - f) ** 3);
      r.m.scale.set(s, 1, s);
      r.m.material.opacity = r.opacity * (1 - f);
      if (f >= 1) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); this.rings.splice(i, 1); }
    }
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const l = this.labels[i];
      l.t += dt;
      const f = l.t / l.life;
      this.v.set(l.x, l.y + f * 1.6, l.z).project(this.camera);
      const sx = (this.v.x * 0.5 + 0.5) * viewW, sy = (-this.v.y * 0.5 + 0.5) * viewH;
      l.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(${f < 0.15 ? 0.6 + f / 0.15 * 0.5 : 1.1 - Math.min(0.1, f)})`;
      l.el.style.opacity = f > 0.7 ? String(1 - (f - 0.7) / 0.3) : '1';
      if (f >= 1) { l.el.remove(); this.labels.splice(i, 1); }
    }
  }
}
