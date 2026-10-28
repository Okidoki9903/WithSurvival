// Minimal DOM HUD: cash counter, objective chip, radio dialog, chapter banner.
import * as THREE from 'three';
import { iconDataURL } from './textures.js';

const _v = new THREE.Vector3();

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.moneyEl = $('money-val');
    this.moneyBox = $('money');
    this.objEl = $('objective');
    this.objText = $('objective-text');
    this.objIcon = $('objective-icon');
    this.dialog = $('dialog');
    this.bannerEl = $('banner');
    this.queue = [];
    this.showing = false;
    this.shown = 0;
    this.lastObj = '';
    this.dialog.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.next(); });
    this.edge = $('edge');
    this.edgeArrow = $('edge-arrow');
    this.edgeIcon = $('edge-icon');
    this.edgeKey = '';
  }

  // Off-screen objective: a bubble on the screen edge points towards it.
  pointer(game, camera) {
    const o = game.objective;
    const at = o && o.at;
    if (!at || !document.body.classList.contains('playing') || game.camFocus) { this.edge.classList.remove('on'); return; }
    _v.set(at.x, 1, at.z).project(camera);
    const W = window.innerWidth, H = window.innerHeight;
    const behind = _v.z > 1;
    let sx = (_v.x * 0.5 + 0.5) * W, sy = (-_v.y * 0.5 + 0.5) * H;
    if (behind) { sx = W - sx; sy = H - sy; }
    const mx = 40, top = 130, bottom = 120;
    if (!behind && sx > mx && sx < W - mx && sy > top && sy < H - bottom) { this.edge.classList.remove('on'); return; }
    const cx = W / 2, cy = H / 2;
    let dx = sx - cx, dy = sy - cy;
    const kx = dx > 0 ? (W - mx - cx) / dx : dx < 0 ? (mx - cx) / dx : Infinity;
    const ky = dy > 0 ? (H - bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity;
    const k = Math.min(kx, ky, 1);
    const ex = cx + dx * k, ey = cy + dy * k;
    this.edge.style.transform = `translate(${ex}px, ${ey}px)`;
    this.edgeArrow.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    if (o.icon !== this.edgeKey) { this.edgeKey = o.icon; this.edgeIcon.src = iconDataURL(o.icon || 'fort', 64, '#fff'); }
    this.edge.classList.add('on');
  }
  setMoney(v) {
    const n = Math.floor(v);
    if (n === this.shown && this.moneyEl.textContent !== '') return;
    this.moneyBox.classList.remove('bump'); void this.moneyBox.offsetWidth; this.moneyBox.classList.add('bump');
    this.shown = n;
    this.moneyEl.textContent = n.toLocaleString('fr-FR');
  }
  objective(text, icon) {
    const key = text + icon;
    if (key === this.lastObj) return;
    this.lastObj = key;
    if (!text) { this.objEl.classList.remove('on'); return; }
    this.objText.textContent = text;
    this.objIcon.src = iconDataURL(icon || 'fort', 64, '#fff');
    this.objEl.classList.remove('on'); void this.objEl.offsetWidth; this.objEl.classList.add('on');
  }
  say(who, text) {
    this.queue.push({ who, text });
    if (!this.showing) this.next();
  }
  next() {
    clearTimeout(this.timer);
    const item = this.queue.shift();
    if (!item) { this.dialog.classList.remove('on'); this.showing = false; return; }
    this.showing = true;
    $('dialog-avatar').textContent = item.who.initial;
    $('dialog-avatar').style.background = item.who.color;
    $('dialog-name').textContent = item.who.name;
    $('dialog-role').textContent = item.who.role;
    $('dialog-text').textContent = item.text;
    this.dialog.classList.remove('on'); void this.dialog.offsetWidth; this.dialog.classList.add('on');
    this.timer = setTimeout(() => this.next(), 2600 + item.text.length * 38);
  }
  banner(num, title, sub) {
    $('banner-num').textContent = num;
    $('banner-title').textContent = title;
    $('banner-sub').textContent = sub;
    this.bannerEl.classList.remove('on'); void this.bannerEl.offsetWidth; this.bannerEl.classList.add('on');
  }

  // Sasha's journal ---------------------------------------------------------
  setupJournal(story, onOpen, onClose) {
    this.story = story;
    this.journalEl = $('journal');
    $('journal-icon').src = iconDataURL('book', 64, '#fff');
    this.badge = $('journal-badge');
    try { this.seen = Number(localStorage.getItem('ws-journal-seen') || 0); } catch { this.seen = 0; }
    if (!story.done.size) this.seen = 0;
    this.updateBadge();
    $('btn-journal').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.openJournal(); onOpen && onOpen(); });
    $('journal-close').addEventListener('click', () => { this.journalEl.classList.remove('on'); onClose && onClose(); });
  }
  updateBadge() {
    const n = this.story.journal().length - this.seen;
    this.badge.textContent = n > 0 ? String(n) : '';
    this.badge.classList.toggle('on', n > 0);
  }
  journalNew() { this.updateBadge(); }
  openJournal() {
    const list = this.story.journal();
    const el = $('journal-list');
    el.innerHTML = '';
    list.slice().reverse().forEach((j, k) => {
      const i = list.length - k;
      const d = document.createElement('div');
      d.className = 'entry' + (i > this.seen ? ' new' : '');
      const h = document.createElement('h4'); const sm = document.createElement('small'); sm.textContent = `${i}.`; h.append(sm, j.title);
      const p = document.createElement('p'); p.textContent = j.text;
      d.append(h, p); el.appendChild(d);
    });
    if (!list.length) el.innerHTML = '<div class="entry"><p>Les pages sont encore blanches.</p></div>';
    this.seen = list.length;
    try { localStorage.setItem('ws-journal-seen', String(this.seen)); } catch { /* ignore */ }
    this.updateBadge();
    this.journalEl.classList.add('on');
  }
}
