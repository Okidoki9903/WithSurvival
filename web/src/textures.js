// Procedural canvas textures: icons, pads, upgrade tiles, bubbles, ground.
import * as THREE from 'three';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function canvasTexture(canvas, { repeat = false, srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = aniso;
  return t;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Vector icons drawn in a [-1, 1] box.
// ---------------------------------------------------------------------------
const ICONS = {
  meat(c) {
    c.beginPath(); c.ellipse(0.22, -0.2, 0.62, 0.5, -0.7, 0, Math.PI * 2); c.fill();
    c.lineWidth = 0.24; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.15, 0.15); c.lineTo(-0.62, 0.62); c.stroke();
    c.beginPath(); c.arc(-0.74, 0.56, 0.15, 0, Math.PI * 2); c.arc(-0.56, 0.76, 0.15, 0, Math.PI * 2); c.fill();
  },
  steak(c) {
    c.beginPath(); c.ellipse(0, 0.05, 0.85, 0.62, -0.2, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 0.1;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(-0.45 + i * 0.3, -0.35); c.lineTo(-0.05 + i * 0.3, 0.45); c.stroke(); }
    c.beginPath(); c.arc(0.42, -0.1, 0.13, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  log(c) {
    c.save(); c.rotate(-0.45);
    roundRect(c, -0.85, -0.32, 1.45, 0.64, 0.1); c.fill();
    c.beginPath(); c.ellipse(0.62, 0, 0.26, 0.34, 0, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.lineWidth = 0.07;
    c.beginPath(); c.ellipse(0.62, 0, 0.13, 0.18, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(-0.6, -0.1); c.lineTo(0.15, -0.1); c.stroke();
    c.beginPath(); c.moveTo(-0.35, 0.12); c.lineTo(0.3, 0.12); c.stroke();
    c.restore();
  },
  person(c) {
    c.beginPath(); c.arc(0, -0.42, 0.32, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(-0.72, 0.85); c.quadraticCurveTo(-0.7, 0.02, 0, 0.0); c.quadraticCurveTo(0.7, 0.02, 0.72, 0.85); c.closePath(); c.fill();
  },
  axe(c) {
    c.lineWidth = 0.17; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.65, 0.75); c.lineTo(0.45, -0.55); c.stroke();
    c.beginPath(); c.moveTo(0.12, -0.7); c.quadraticCurveTo(0.95, -0.85, 0.85, 0.05); c.lineTo(0.5, -0.2); c.lineTo(0.3, -0.42); c.closePath(); c.fill();
  },
  axeplus(c) {
    c.save(); c.translate(-0.15, 0.05); c.scale(0.85, 0.85); ICONS.axe(c); c.restore();
    c.fillRect(0.38, 0.42, 0.5, 0.14); c.fillRect(0.56, 0.24, 0.14, 0.5);
  },
  bow(c) {
    c.lineWidth = 0.14; c.lineCap = 'round';
    c.beginPath(); c.arc(0.1, 0.1, 0.78, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(-0.67, -0.1); c.lineTo(0.87, -0.1); c.stroke();
    c.lineWidth = 0.13;
    c.beginPath(); c.moveTo(0.1, 0.85); c.lineTo(0.1, -0.85); c.stroke();
    c.beginPath(); c.moveTo(0.1, -0.95); c.lineTo(-0.08, -0.65); c.lineTo(0.28, -0.65); c.closePath(); c.fill();
  },
  bag(c) {
    roundRect(c, -0.62, -0.35, 1.24, 1.15, 0.25); c.fill();
    c.lineWidth = 0.13;
    c.beginPath(); c.arc(0, -0.38, 0.32, Math.PI, 0); c.stroke();
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(-0.62, 0.1, 1.24, 0.08);
    c.globalCompositeOperation = 'source-over';
  },
  fort(c) {
    c.fillRect(-0.75, -0.2, 1.5, 0.95);
    for (let i = 0; i < 4; i++) c.fillRect(-0.75 + i * 0.42, -0.45, 0.24, 0.3);
    c.fillRect(-0.25, -0.85, 0.5, 0.7);
    c.fillRect(-0.32, -0.95, 0.15, 0.15); c.fillRect(0.17, -0.95, 0.15, 0.15);
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(0, 0.75, 0.25, Math.PI, 0); c.lineTo(0.25, 0.76); c.lineTo(-0.25, 0.76); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  expand(c) {
    const arrow = (a) => {
      c.save(); c.rotate(a);
      c.beginPath(); c.moveTo(0.92, 0); c.lineTo(0.45, -0.38); c.lineTo(0.45, -0.13); c.lineTo(0.12, -0.13); c.lineTo(0.12, 0.13); c.lineTo(0.45, 0.13); c.lineTo(0.45, 0.38); c.closePath(); c.fill();
      c.restore();
    };
    for (let i = 0; i < 4; i++) arrow(Math.PI / 4 + i * Math.PI / 2);
  },
  fire(c) {
    c.beginPath(); c.moveTo(0, -0.95);
    c.bezierCurveTo(0.55, -0.4, 0.8, 0.0, 0.62, 0.42);
    c.bezierCurveTo(0.48, 0.82, -0.48, 0.82, -0.62, 0.42);
    c.bezierCurveTo(-0.78, 0.05, -0.38, -0.2, -0.32, -0.55);
    c.bezierCurveTo(-0.08, -0.3, 0.02, -0.55, 0, -0.95); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(0, -0.05); c.bezierCurveTo(0.3, 0.2, 0.35, 0.5, 0.0, 0.62); c.bezierCurveTo(-0.32, 0.5, -0.25, 0.2, 0, -0.05); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  pot(c) {
    c.beginPath(); c.moveTo(-0.7, -0.35); c.lineTo(0.7, -0.35); c.quadraticCurveTo(0.7, 0.55, 0, 0.6); c.quadraticCurveTo(-0.7, 0.55, -0.7, -0.35); c.fill();
    c.fillRect(-0.85, -0.5, 1.7, 0.18);
    c.lineWidth = 0.1;
    c.beginPath(); c.moveTo(-0.3, -0.62); c.quadraticCurveTo(-0.15, -0.8, -0.3, -0.95); c.stroke();
    c.beginPath(); c.moveTo(0.2, -0.62); c.quadraticCurveTo(0.35, -0.8, 0.2, -0.95); c.stroke();
  },
  blades(c) {
    c.lineWidth = 0.1;
    c.beginPath(); c.arc(0, 0, 0.55, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      c.save(); c.rotate(a);
      c.beginPath(); c.moveTo(0.45, -0.08); c.quadraticCurveTo(0.95, -0.2, 0.92, 0.22); c.lineTo(0.55, 0.1); c.closePath(); c.fill();
      c.restore();
    }
    c.beginPath(); c.arc(0, 0, 0.2, 0, Math.PI * 2); c.fill();
  },
  beacon(c) {
    c.beginPath(); c.moveTo(-0.32, 0.85); c.lineTo(-0.18, -0.25); c.lineTo(0.18, -0.25); c.lineTo(0.32, 0.85); c.closePath(); c.fill();
    c.fillRect(-0.34, -0.48, 0.68, 0.18);
    c.beginPath(); c.arc(0, -0.62, 0.17, 0, Math.PI * 2); c.fill();
    c.lineWidth = 0.09; c.lineCap = 'round';
    for (const [x, y] of [[-0.75, -0.95], [0.75, -0.95], [-0.85, -0.55], [0.85, -0.55]]) { c.beginPath(); c.moveTo(x * 0.5, -0.62 + (y + 0.62) * 0.4); c.lineTo(x, y); c.stroke(); }
  },
  hut(c) {
    c.beginPath(); c.moveTo(-0.9, 0.0); c.lineTo(0, -0.8); c.lineTo(0.9, 0.0); c.closePath(); c.fill();
    c.fillRect(-0.62, -0.05, 1.24, 0.85);
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(-0.18, 0.3, 0.36, 0.5);
    c.globalCompositeOperation = 'source-over';
  },
  cash(c) {
    roundRect(c, -0.9, -0.5, 1.8, 1.0, 0.12); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(0, 0, 0.28, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.beginPath(); c.arc(0, 0, 0.15, 0, Math.PI * 2); c.fill();
  },
  fish(c) {
    c.beginPath(); c.ellipse(-0.1, 0, 0.62, 0.36, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(0.45, 0); c.lineTo(0.92, -0.4); c.lineTo(0.92, 0.4); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(-0.42, -0.08, 0.08, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  sled(c) {
    c.fillRect(-0.7, -0.35, 1.3, 0.45);
    c.lineWidth = 0.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.85, 0.45); c.lineTo(0.6, 0.45); c.quadraticCurveTo(0.95, 0.45, 0.9, 0.1); c.stroke();
    c.beginPath(); c.moveTo(-0.5, 0.1); c.lineTo(-0.5, 0.45); c.moveTo(0.3, 0.1); c.lineTo(0.3, 0.45); c.stroke();
    c.fillRect(-0.55, -0.7, 0.5, 0.36); c.fillRect(0.05, -0.62, 0.42, 0.28);
  },
  snowflake(c) {
    c.lineWidth = 0.12; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      c.save(); c.rotate(i * Math.PI / 3);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -0.88); c.moveTo(0, -0.55); c.lineTo(-0.22, -0.75); c.moveTo(0, -0.55); c.lineTo(0.22, -0.75); c.stroke();
      c.restore();
    }
  },
  check(c) {
    c.lineWidth = 0.3; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-0.55, 0.0); c.lineTo(-0.15, 0.42); c.lineTo(0.6, -0.42); c.stroke();
  },
  gear(c) {
    for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * Math.PI / 4); c.fillRect(-0.14, -0.95, 0.28, 0.4); c.restore(); }
    c.beginPath(); c.arc(0, 0, 0.66, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(0, 0, 0.24, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  belt(c) {
    c.lineWidth = 0.14;
    c.beginPath(); c.moveTo(-0.62, 0.0); c.lineTo(0.62, 0.0); c.arc(0.62, 0.3, 0.3, -Math.PI / 2, Math.PI / 2); c.lineTo(-0.62, 0.6); c.arc(-0.62, 0.3, 0.3, Math.PI / 2, Math.PI * 1.5); c.stroke();
    c.beginPath(); c.arc(-0.62, 0.3, 0.12, 0, Math.PI * 2); c.arc(0.62, 0.3, 0.12, 0, Math.PI * 2); c.fill();
    roundRect(c, -0.5, -0.6, 0.42, 0.5, 0.06); c.fill(); roundRect(c, 0.1, -0.5, 0.36, 0.4, 0.06); c.fill();
  },
  hook(c) {
    c.lineWidth = 0.13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.95, -0.75); c.lineTo(0.95, -0.75); c.stroke();
    c.beginPath(); c.moveTo(0, -0.75); c.lineTo(0, 0.05); c.arc(-0.22, 0.05, 0.22, 0, Math.PI * 0.9); c.stroke();
    c.beginPath(); c.moveTo(0.05, 0.35); c.lineTo(0.75, 0.35); c.lineTo(0.62, 0.85); c.lineTo(0.18, 0.85); c.closePath(); c.fill();
  },
  boot(c) {
    c.beginPath(); c.moveTo(-0.45, -0.9); c.lineTo(0.2, -0.9); c.lineTo(0.2, 0.15); c.quadraticCurveTo(0.85, 0.2, 0.9, 0.55); c.lineTo(0.9, 0.8); c.lineTo(-0.55, 0.8); c.lineTo(-0.55, -0.6); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(-0.6, -0.6, 0.9, 0.12);
    c.globalCompositeOperation = 'source-over';
  },
  steam(c) {
    roundRect(c, -0.55, -0.35, 1.1, 1.2, 0.3); c.fill();
    c.fillRect(0.2, -0.85, 0.22, 0.6);
    c.lineWidth = 0.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.3, -0.5); c.quadraticCurveTo(-0.55, -0.7, -0.3, -0.95); c.stroke();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(0, 0.2, 0.22, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  register(c) {
    roundRect(c, -0.85, 0.0, 1.7, 0.75, 0.1); c.fill();
    c.beginPath(); c.moveTo(-0.6, 0.0); c.lineTo(-0.45, -0.75); c.lineTo(0.45, -0.75); c.lineTo(0.6, 0.0); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(-0.3, -0.6, 0.6, 0.25);
    for (let i = 0; i < 3; i++) c.fillRect(-0.55 + i * 0.4, 0.18, 0.28, 0.16);
    c.globalCompositeOperation = 'source-over';
  },
  cable(c) {
    c.lineWidth = 0.09;
    c.beginPath(); c.moveTo(-0.95, -0.75); c.lineTo(0.95, -0.35); c.stroke();
    c.beginPath(); c.moveTo(0, -0.55); c.lineTo(0, -0.1); c.stroke();
    roundRect(c, -0.45, -0.1, 0.9, 0.75, 0.12); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(-0.3, 0.02, 0.6, 0.25);
    c.globalCompositeOperation = 'source-over';
  },
  net(c) {
    c.save(); c.beginPath(); c.arc(0, 0, 0.88, 0, Math.PI * 2); c.clip();
    c.lineWidth = 0.08;
    for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 0.25 - 1, -1); c.lineTo(i * 0.25 + 1, 1); c.stroke(); c.beginPath(); c.moveTo(i * 0.25 + 1, -1); c.lineTo(i * 0.25 - 1, 1); c.stroke(); }
    c.restore();
    c.lineWidth = 0.12; c.beginPath(); c.arc(0, 0, 0.88, 0, Math.PI * 2); c.stroke();
  },
  can(c) {
    c.fillRect(-0.55, -0.6, 1.1, 1.25);
    c.beginPath(); c.ellipse(0, -0.6, 0.55, 0.2, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, 0.65, 0.55, 0.2, 0, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(-0.55, -0.2, 1.1, 0.4);
    c.globalCompositeOperation = 'source-over';
    c.fillRect(-0.4, -0.1, 0.8, 0.2);
  },
  ingot(c) {
    c.beginPath(); c.moveTo(-0.9, 0.5); c.lineTo(0.9, 0.5); c.lineTo(0.55, -0.35); c.lineTo(-0.55, -0.35); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 0.08; c.beginPath(); c.moveTo(-0.62, 0.2); c.lineTo(0.62, 0.2); c.stroke();
    c.globalCompositeOperation = 'source-over';
  },
  ore(c) {
    c.beginPath(); c.moveTo(-0.85, 0.5); c.lineTo(-0.6, -0.3); c.lineTo(-0.1, -0.7); c.lineTo(0.55, -0.5); c.lineTo(0.9, 0.2); c.lineTo(0.5, 0.7); c.lineTo(-0.4, 0.75); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    for (const [x, y] of [[-0.3, 0.1], [0.25, -0.2], [0.35, 0.35]]) { c.beginPath(); c.arc(x, y, 0.11, 0, Math.PI * 2); c.fill(); }
    c.globalCompositeOperation = 'source-over';
  },
  ship(c) {
    c.beginPath(); c.moveTo(-0.95, 0.1); c.lineTo(0.65, 0.1); c.lineTo(0.95, -0.15); c.lineTo(0.75, 0.6); c.lineTo(-0.85, 0.6); c.closePath(); c.fill();
    c.fillRect(-0.55, -0.4, 0.75, 0.42); c.fillRect(-0.4, -0.85, 0.2, 0.45);
    c.lineWidth = 0.08; c.beginPath(); c.moveTo(-0.9, 0.85); c.lineTo(0.8, 0.85); c.stroke();
  },
  sun(c) {
    c.beginPath(); c.arc(0, 0, 0.42, 0, Math.PI * 2); c.fill();
    c.lineWidth = 0.13; c.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * 0.6, Math.sin(a) * 0.6); c.lineTo(Math.cos(a) * 0.92, Math.sin(a) * 0.92); c.stroke(); }
  },
  heart(c) {
    c.beginPath(); c.moveTo(0, 0.85); c.bezierCurveTo(-1.1, 0.0, -0.75, -0.95, 0, -0.4); c.bezierCurveTo(0.75, -0.95, 1.1, 0.0, 0, 0.85); c.fill();
  },
  book(c) {
    c.beginPath(); c.moveTo(0, -0.55); c.quadraticCurveTo(-0.45, -0.85, -0.92, -0.65); c.lineTo(-0.92, 0.65); c.quadraticCurveTo(-0.45, 0.45, 0, 0.75); c.quadraticCurveTo(0.45, 0.45, 0.92, 0.65); c.lineTo(0.92, -0.65); c.quadraticCurveTo(0.45, -0.85, 0, -0.55); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 0.07; c.beginPath(); c.moveTo(0, -0.5); c.lineTo(0, 0.7); c.stroke();
    c.globalCompositeOperation = 'source-over';
  },
  copper(c) {
    c.beginPath(); c.moveTo(-0.85, 0.5); c.lineTo(-0.55, -0.35); c.lineTo(0.0, -0.75); c.lineTo(0.6, -0.45); c.lineTo(0.9, 0.25); c.lineTo(0.45, 0.72); c.lineTo(-0.45, 0.75); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(-0.3, 0.3); c.lineTo(0, -0.35); c.lineTo(0.3, 0.3); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  wire(c) {
    c.fillRect(-0.85, -0.75, 0.25, 1.5); c.fillRect(0.6, -0.75, 0.25, 1.5);
    c.lineWidth = 0.13;
    for (let i = 0; i < 5; i++) { const x = -0.45 + i * 0.22; c.beginPath(); c.moveTo(x, -0.5); c.lineTo(x + 0.12, 0.5); c.stroke(); }
  },
  stone(c) {
    roundRect(c, -0.9, -0.15, 0.85, 0.65, 0.08); c.fill();
    roundRect(c, 0.05, -0.15, 0.85, 0.65, 0.08); c.fill();
    roundRect(c, -0.45, -0.85, 0.9, 0.62, 0.08); c.fill();
  },
  concrete(c) {
    roundRect(c, -0.9, -0.5, 1.8, 1.0, 0.08); c.fill();
    c.globalCompositeOperation = 'destination-out';
    roundRect(c, -0.65, -0.25, 0.5, 0.5, 0.06); c.fill(); roundRect(c, 0.15, -0.25, 0.5, 0.5, 0.06); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  panel(c) {
    c.save(); c.transform(1, 0, -0.35, 1, 0, 0);
    c.fillRect(-0.7, -0.7, 1.5, 1.2);
    c.globalCompositeOperation = 'destination-out'; c.lineWidth = 0.08;
    for (const x of [-0.2, 0.3]) { c.beginPath(); c.moveTo(x, -0.7); c.lineTo(x, 0.5); c.stroke(); }
    c.beginPath(); c.moveTo(-0.7, -0.1); c.lineTo(0.8, -0.1); c.stroke();
    c.restore();
    c.fillRect(-0.1, 0.5, 0.2, 0.4);
  },
  bolt(c) {
    c.beginPath(); c.moveTo(0.2, -0.95); c.lineTo(-0.55, 0.12); c.lineTo(-0.05, 0.12); c.lineTo(-0.25, 0.95); c.lineTo(0.55, -0.15); c.lineTo(0.05, -0.15); c.closePath(); c.fill();
  },
  tower(c) {
    c.fillRect(-0.45, -0.9, 0.9, 1.8);
    c.fillRect(-0.85, 0.1, 0.4, 0.8); c.fillRect(0.45, -0.3, 0.4, 1.2);
    c.globalCompositeOperation = 'destination-out';
    for (let y = -0.75; y < 0.7; y += 0.32) for (const x of [-0.25, 0.08]) c.fillRect(x, y, 0.16, 0.18);
    c.globalCompositeOperation = 'source-over';
  },
  rocket(c) {
    c.beginPath(); c.moveTo(0, -0.95); c.quadraticCurveTo(0.42, -0.5, 0.32, 0.45); c.lineTo(-0.32, 0.45); c.quadraticCurveTo(-0.42, -0.5, 0, -0.95); c.fill();
    c.beginPath(); c.moveTo(-0.32, 0.05); c.lineTo(-0.7, 0.6); c.lineTo(-0.32, 0.5); c.fill();
    c.beginPath(); c.moveTo(0.32, 0.05); c.lineTo(0.7, 0.6); c.lineTo(0.32, 0.5); c.fill();
    c.beginPath(); c.moveTo(-0.18, 0.55); c.lineTo(0, 0.95); c.lineTo(0.18, 0.55); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(0, -0.3, 0.14, 0, Math.PI * 2); c.fill(); c.globalCompositeOperation = 'source-over';
  },
  atom(c) {
    c.lineWidth = 0.1;
    for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * Math.PI / 3); c.beginPath(); c.ellipse(0, 0, 0.9, 0.34, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
    c.beginPath(); c.arc(0, 0, 0.18, 0, Math.PI * 2); c.fill();
  },
  star(c) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.4 : 0.95; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill();
  },
  train(c) {
    roundRect(c, -0.85, -0.7, 1.7, 1.2, 0.25); c.fill();
    c.globalCompositeOperation = 'destination-out';
    roundRect(c, -0.6, -0.5, 1.2, 0.45, 0.08); c.fill();
    c.beginPath(); c.arc(-0.45, 0.22, 0.12, 0, Math.PI * 2); c.arc(0.45, 0.22, 0.12, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.lineWidth = 0.1; c.beginPath(); c.moveTo(-0.5, 0.55); c.lineTo(-0.8, 0.95); c.moveTo(0.5, 0.55); c.lineTo(0.8, 0.95); c.stroke();
  },
  leaf(c) {
    c.beginPath(); c.moveTo(-0.7, 0.8); c.quadraticCurveTo(-0.9, -0.6, 0.85, -0.85); c.quadraticCurveTo(0.7, 0.8, -0.7, 0.8); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.lineWidth = 0.08; c.beginPath(); c.moveTo(-0.6, 0.7); c.lineTo(0.55, -0.55); c.stroke(); c.globalCompositeOperation = 'source-over';
  },
  wind(c) {
    c.fillRect(-0.06, -0.15, 0.12, 1.1);
    for (let i = 0; i < 3; i++) { c.save(); c.translate(0, -0.2); c.rotate(i * Math.PI * 2 / 3); c.beginPath(); c.ellipse(0, -0.42, 0.11, 0.42, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  },
  globe(c) {
    c.lineWidth = 0.1;
    c.beginPath(); c.arc(0, 0, 0.85, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 0.38, 0.85, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(-0.85, 0); c.lineTo(0.85, 0); c.stroke();
    c.beginPath(); c.moveTo(-0.72, -0.42); c.lineTo(0.72, -0.42); c.moveTo(-0.72, 0.42); c.lineTo(0.72, 0.42); c.stroke();
  },
  pickaxe(c) {
    c.lineWidth = 0.15; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.6, 0.8); c.lineTo(0.3, -0.3); c.stroke();
    c.beginPath(); c.moveTo(-0.45, -0.75); c.quadraticCurveTo(0.35, -0.75, 0.8, 0.2); c.lineTo(0.62, 0.25); c.quadraticCurveTo(0.25, -0.45, -0.45, -0.55); c.closePath(); c.fill();
  },
};

export function drawIcon(ctx, name, cx, cy, size, color = '#fff') {
  const fn = ICONS[name];
  if (!fn) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 2, size / 2);
  ctx.fillStyle = color; ctx.strokeStyle = color;
  fn(ctx);
  ctx.restore();
}

export function iconDataURL(name, size = 64, color = '#fff') {
  const c = makeCanvas(size, size);
  drawIcon(c.getContext('2d'), name, size / 2, size / 2, size * 0.8, color);
  return c.toDataURL();
}

// ---------------------------------------------------------------------------
// Ground pads (dark rounded squares with an icon) and dashed zones.
// ---------------------------------------------------------------------------
export function padTexture(icon, { dashed = false, w = 256, h = 256, tint = 'rgba(46,32,24,0.82)' } = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  if (dashed) {
    g.setLineDash([26, 18]);
    g.lineWidth = 12; g.strokeStyle = 'rgba(255,255,255,0.95)';
    roundRect(g, 10, 10, w - 20, h - 20, 26); g.stroke();
    g.setLineDash([]);
    if (icon) drawIcon(g, icon, 52, 52, 54, 'rgba(255,255,255,0.9)');
  } else {
    g.fillStyle = tint;
    roundRect(g, 8, 8, w - 16, h - 16, 30); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 5;
    roundRect(g, 18, 18, w - 36, h - 36, 22); g.stroke();
    if (icon) drawIcon(g, icon, w / 2, h / 2, Math.min(w, h) * 0.45, 'rgba(255,240,225,0.92)');
  }
  return canvasTexture(c);
}

// Upgrade tile: icon + price, with a green fill that rises as it is paid.
export class TileTexture {
  constructor(icon, label) {
    this.icon = icon; this.label = label;
    this.canvas = makeCanvas(256, 256);
    this.tex = canvasTexture(this.canvas);
    this.draw(0, 0, false);
  }
  draw(remaining, progress, active, items = [], free = false) {
    const g = this.canvas.getContext('2d');
    const s = 256;
    g.clearRect(0, 0, s, s);
    g.save();
    roundRect(g, 10, 10, s - 20, s - 20, 34);
    g.fillStyle = free ? 'rgba(30,50,80,0.9)' : 'rgba(40,28,22,0.9)'; g.fill();
    g.clip();
    if (progress > 0) {
      g.fillStyle = 'rgba(92,214,84,0.92)';
      g.fillRect(0, s - (s * Math.min(1, progress)), s, s * Math.min(1, progress));
    }
    g.restore();
    g.lineWidth = active ? 10 : 6;
    g.strokeStyle = active ? 'rgba(120,255,110,1)' : free ? 'rgba(255,214,90,0.95)' : 'rgba(255,255,255,0.75)';
    roundRect(g, 14, 14, s - 28, s - 28, 30); g.stroke();
    g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (free) {
      drawIcon(g, this.icon, s / 2, 92, 104, '#fff');
      g.font = '800 30px "Trebuchet MS", "Segoe UI", sans-serif';
      const words = this.label.split(' ');
      const l1 = words.slice(0, Math.ceil(words.length / 2)).join(' '), l2 = words.slice(Math.ceil(words.length / 2)).join(' ');
      g.fillText(l1, s / 2, 180); if (l2) g.fillText(l2, s / 2, 212);
    } else if (items.length) {
      drawIcon(g, this.icon, s / 2, 66, 76, '#fff');
      g.font = '700 40px "Trebuchet MS", "Segoe UI", sans-serif';
      if (remaining > 0) g.fillText(`$ ${Math.max(0, Math.ceil(remaining))}`, s / 2, 136);
      else g.fillText('✓', s / 2, 136);
      const w = 230 / items.length;
      items.forEach((it, i) => {
        const cx = 13 + w * (i + 0.5);
        g.globalAlpha = it.left > 0 ? 1 : 0.55;
        drawIcon(g, it.icon, cx - 22, 196, 34, it.left > 0 ? '#ffe08a' : '#9dff8a');
        g.font = '800 30px "Trebuchet MS", sans-serif';
        g.fillText(it.left > 0 ? String(it.left) : '✓', cx + 16, 198);
        g.globalAlpha = 1;
      });
    } else {
      drawIcon(g, this.icon, s / 2, 98, 104, '#fff');
      g.font = '700 52px "Trebuchet MS", "Segoe UI", sans-serif';
      g.fillText(`$ ${Math.max(0, Math.ceil(remaining))}`, s / 2, 200);
    }
    this.tex.needsUpdate = true;
  }
}

// Customer speech bubble: white disc with icon and quantity.
export function bubbleTexture(icon, qty, { bg = '#ffffff', fg = '#c0392b' } = {}) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.arc(64, 68, 54, 0, Math.PI * 2); g.fill();
  g.fillStyle = bg;
  g.beginPath(); g.arc(64, 62, 54, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(50, 108); g.lineTo(64, 126); g.lineTo(78, 108); g.fill();
  drawIcon(g, icon, qty ? 54 : 64, 62, qty ? 58 : 64, fg);
  if (qty) {
    g.fillStyle = '#2b2b2b';
    g.font = '800 36px "Trebuchet MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(qty), 96, 82);
  }
  return canvasTexture(c);
}

// ---------------------------------------------------------------------------
// Ground materials
// ---------------------------------------------------------------------------
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function snowTexture() {
  const s = 512, c = makeCanvas(s, s), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
  const r = rng(7);
  for (let i = 0; i < 260; i++) {
    const x = r() * s, y = r() * s, rad = 20 + r() * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    const shade = r() < 0.5 ? 'rgba(206,222,240,0.16)' : 'rgba(255,255,255,0.3)';
    grad.addColorStop(0, shade); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { g.save(); g.translate(dx, dy); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
  }
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(190,210,232,0.22)' : 'rgba(255,255,255,0.7)';
    g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
  }
  const t = canvasTexture(c, { repeat: true, aniso: 8 });
  return t;
}

export function packedSnowTexture() {
  const s = 256, c = makeCanvas(s, s), g = c.getContext('2d');
  g.fillStyle = '#c5d2df'; g.fillRect(0, 0, s, s);
  const r = rng(21);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(160,178,200,0.35)' : 'rgba(235,242,250,0.45)';
    const w = 2 + r() * 10;
    g.fillRect(r() * s, r() * s, w, 1 + r() * 2);
  }
  return canvasTexture(c, { repeat: true, aniso: 8 });
}

// Dirt floor of the camp with frosty borders, sized for a world rect.
export function campGroundTexture(wUnits, hUnits) {
  const ppu = 24;
  const w = Math.min(2048, Math.round(wUnits * ppu)), h = Math.min(2048, Math.round(hUnits * ppu));
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#b67852'; g.fillRect(0, 0, w, h);
  const r = rng(99);
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = r() * w, y = r() * h, rad = 6 + r() * 34;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    const col = r() < 0.5 ? 'rgba(140,72,34,0.28)' : 'rgba(226,150,96,0.22)';
    grad.addColorStop(0, col); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < (w * h) / 60; i++) {
    g.fillStyle = r() < 0.6 ? 'rgba(120,72,44,0.25)' : 'rgba(240,200,160,0.25)';
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  // Frost creeping from the fences.
  const edge = ppu * 1.6;
  for (let i = 0; i < (w + h) * 0.6; i++) {
    const side = Math.floor(r() * 4);
    let x, y;
    const d = Math.pow(r(), 2.2) * edge;
    if (side === 0) { x = r() * w; y = d; } else if (side === 1) { x = r() * w; y = h - d; } else if (side === 2) { x = d; y = r() * h; } else { x = w - d; y = r() * h; }
    const rad = 3 + r() * 12 * (1 - d / edge);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, 'rgba(250,252,255,0.6)'); grad.addColorStop(1, 'rgba(250,252,255,0)');
    g.fillStyle = grad; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const lg = [
    [0, 0, 0, edge * 0.45], [0, h, 0, h - edge * 0.45], [0, 0, edge * 0.45, 0], [w, 0, w - edge * 0.45, 0],
  ];
  for (const [x0, y0, x1, y1] of lg) {
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, 'rgba(248,251,255,0.95)'); grad.addColorStop(1, 'rgba(248,251,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }
  return canvasTexture(c, { aniso: 8 });
}

export function radialGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const s = 128, c = makeCanvas(s, s), g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, inner); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  return canvasTexture(c);
}

export function ringTexture() {
  const s = 256, c = makeCanvas(s, s), g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.lineWidth = 14;
  g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 12, 0, Math.PI * 2); g.stroke();
  const grad = g.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(255,255,255,0.35)');
  g.fillStyle = grad; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 12, 0, Math.PI * 2); g.fill();
  return canvasTexture(c);
}

// Green corner brackets like the selection marker in the reference.
export function bracketTexture() {
  const s = 256, c = makeCanvas(s, s), g = c.getContext('2d');
  g.strokeStyle = '#4dff5a'; g.lineWidth = 16; g.lineCap = 'round';
  const m = 20, l = 60;
  const corners = [[m, m, 1, 1], [s - m, m, -1, 1], [m, s - m, 1, -1], [s - m, s - m, -1, -1]];
  for (const [x, y, dx, dy] of corners) {
    g.beginPath(); g.moveTo(x + dx * l, y); g.lineTo(x, y); g.lineTo(x, y + dy * l); g.stroke();
  }
  return canvasTexture(c);
}
