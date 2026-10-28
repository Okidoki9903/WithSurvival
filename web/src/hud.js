// Minimal DOM HUD: cash counter, objective chip, radio dialog, chapter banner.
import { iconDataURL } from './textures.js';

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
}
