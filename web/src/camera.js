// Camera rig: follows the hero with a little look-ahead, zooms out as the
// stack on the back grows or the world opens up, accepts pinch / wheel zoom,
// glides over to show newly unlocked things, and drives the cutaway.
import * as THREE from 'three';
import { CUT } from './cutaway.js';

const YAW = THREE.MathUtils.degToRad(38);
const _v = new THREE.Vector3();
// Same direction as the sun disc drawn by the sky: looking up means looking there.
const SUN_DIR = new THREE.Vector3(-0.62, 0.42, -0.79).normalize();

export class CameraRig {
  constructor(camera, sun, sunOffset, shadowCam, shadowSize, snow) {
    this.camera = camera;
    this.sun = sun; this.sunOffset = sunOffset; this.shadowCam = shadowCam; this.shadowSize = shadowSize;
    this.snow = snow;
    this.yaw = YAW;
    this.pitch = THREE.MathUtils.degToRad(52);
    this.baseDist = 60;
    this.zoom = 1;
    this.target = new THREE.Vector3();
    this.focusBlend = 0;
    this.sky = 0;
    this.ty = 0;
    this.lead = new THREE.Vector3();
  }

  resize(w, h) {
    const aspect = w / h;
    const halfT = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    // about 16 world units across a portrait screen, 21 down a landscape one
    this.baseDist = h > w ? 16 / (2 * halfT * aspect) : 21 / (2 * halfT);
  }

  snapTo(x, z) { this.target.set(x, 0, z); this.lead.set(0, 0, 0); }

  wantedZoom(game, userZoom) {
    const p = game.player;
    let z = game.stage === 0 ? 0.86 : 1;
    // keep a tall stack in frame
    let tall = 0;
    for (const t in p.carry) tall = Math.max(tall, (p.carry[t] || 0) * 0.13);
    z += THREE.MathUtils.clamp((tall - 2.2) * 0.05, 0, 0.28);
    if (game.region && game.region(p) !== 'camp' && game.stage >= 1) z += 0.08;
    if (game.boss && !game.boss.dead) z = Math.max(z, 1.25);
    if (game.camZoom) z = game.camZoom;
    if (game.zoomPulse > 0) z = 1.6;
    return z * userZoom;
  }

  update(dt, game, userZoom = 1) {
    const p = game.player;
    if (game.zoomPulse > 0) game.zoomPulse -= dt;
    // look-ahead in the walking direction
    const lk = 1 - Math.exp(-dt * 3);
    this.lead.x += (THREE.MathUtils.clamp(p.vx * 0.32, -2.4, 2.4) - this.lead.x) * lk;
    this.lead.z += (THREE.MathUtils.clamp(p.vz * 0.32, -2.4, 2.4) - this.lead.z) * lk;
    let tx = p.x + this.lead.x, tz = p.z + this.lead.z;
    // cinematic focus: glide to a point of interest, hold, come back
    const f = game.camFocus;
    if (f) {
      f.t += dt;
      const inT = 0.7, out = f.hold + inT;
      const want = f.t < out ? Math.min(1, f.t / inT) : Math.max(0, 1 - (f.t - out) / 0.8);
      this.focusBlend = want * want * (3 - 2 * want);
      if (f.t > out + 0.8) { game.camFocus = null; this.focusBlend = 0; }
      tx += (f.x - tx) * this.focusBlend; tz += (f.z - tz) * this.focusBlend;
    }
    const k = 1 - Math.exp(-dt * 5.5);
    this.target.x += (tx - this.target.x) * k;
    this.target.z += (tz - this.target.z) * k;
    let wz = this.wantedZoom(game, userZoom);
    if (f && f.zoom) wz += (f.zoom - wz) * this.focusBlend;
    if (game.zoomOverride) { wz = game.zoomOverride; this.zoom = wz; }
    this.zoom += (wz - this.zoom) * (1 - Math.exp(-dt * 1.8));
    // looking up at the sky for launches and the swarm
    this.sky += ((game.skyView ? 1 : 0) - this.sky) * (1 - Math.exp(-dt * 1.2));
    game.skyBlend = this.sky;
    const wantY = (p.elev || 0) + (f && f.y ? (f.y - (p.elev || 0)) * this.focusBlend : 0) + this.sky * 12;
    this.ty += (wantY - this.ty) * (1 - Math.exp(-dt * 3));
    const d = this.baseDist * this.zoom * (1 + this.sky * 0.5);
    // tilt a little more from above when zoomed out
    const pitch = THREE.MathUtils.lerp(this.pitch + THREE.MathUtils.clamp((this.zoom - 1) * 0.18, -0.05, 0.12), 0.16, this.sky);
    const cp = Math.cos(pitch);
    const cam = this.camera;
    const top = window.__ws && window.__ws.topView;
    if (top) {
      cam.position.set(top.cx, top.size * 1.87, top.cz);
      cam.up.set(0, 0, -1);
      cam.lookAt(top.cx, 0, top.cz);
      cam.up.set(0, 1, 0);
    } else {
      cam.position.set(this.target.x + Math.sin(this.yaw) * cp * d, Math.sin(pitch) * d + this.ty, this.target.z + Math.cos(this.yaw) * cp * d);
      const s = game.shake;
      if (s > 0) cam.position.add(_v.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
      // in sky mode look at what flies (a rocket) or else towards the sun
      const up = this.sky * 90, L = game.skyLook;
      if (L) _v.set(this.target.x + (L.x - this.target.x) * this.sky, 0.8 + this.ty + (L.y - 0.8 - this.ty) * this.sky, this.target.z + (L.z - this.target.z) * this.sky);
      else _v.set(this.target.x + SUN_DIR.x * up, 0.8 + this.ty + SUN_DIR.y * up, this.target.z + SUN_DIR.z * up);
      cam.lookAt(_v);
    }
    // shadows follow the view, snapped to texels to avoid shimmering
    const sc = this.shadowCam;
    const texel = (sc.right - sc.left) / this.shadowSize;
    const sx = Math.round(this.target.x / texel) * texel, sz = Math.round(this.target.z / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunOffset.x, this.sunOffset.y, sz + this.sunOffset.z);
    this.snow.position.set(this.target.x, 0, this.target.z);
    // see-through tube towards the hero (or the focused point)
    CUT.uCutOn.value = top ? 0 : 1;
    CUT.uCutA.value.copy(cam.position);
    if (f && this.focusBlend > 0.5) CUT.uCutB.value.set(f.x, 1.2, f.z);
    else CUT.uCutB.value.set(p.x, 1.15 + (p.elev || 0), p.z);
    CUT.uCutOn.value = top || this.sky > 0.3 ? 0 : 1;
    CUT.uCutR.value = 1.7 + (this.zoom - 1) * 0.6;
  }
}
