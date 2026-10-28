// Sky and weather: blizzard fog, the thaw, the day/night cycle of the
// electric age, a gradient sky dome with stars, the sun, the Dyson swarm,
// the orbital ring and the colonised stars of the last acts.
import * as THREE from 'three';
import { glow } from './models.js';

const C = (h) => new THREE.Color(h);
const SKY = C(0xdfe9f3), STORM = C(0x9cabbd), NIGHT = C(0x101b33), DUSK = C(0xf0b48a);
const WARM_SUN = C(0xffd29a), BASE_SUN = C(0xffe8cc), MOON = C(0x9fb4ff);
const SNOW_GROUND = C(0xf3f7fc), SPRING_GROUND = C(0xc9dcb0), WHITE = C(0xffffff), SPRING_FIR = C(0xcfe6b8);
const HEMI_SKY = C(0xdde9ff), HEMI_GROUND = C(0xc4cfdc), HEMI_NIGHT = C(0x324a7a);

export class Sky {
  constructor({ scene, renderer, sun, hemi, snow, flakeGeo, world, forest, audio, camera, stormEl }) {
    Object.assign(this, { scene, renderer, sun, hemi, snow, flakeGeo, world, forest, audio, camera, stormEl });
    this.fogCol = new THREE.Color();
    this.lastSpring = -1;
    // gradient dome
    const domeM = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(0x9fc3e8) }, horizon: { value: SKY.clone() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0); }',
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    domeM.userData.noCut = true;
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(440, 32, 16), domeM);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);
    // stars
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.acos(1 - Math.random() * 0.95);
      pos.set([Math.sin(v) * Math.cos(u) * 420, Math.cos(v) * 420, Math.sin(v) * Math.sin(u) * 420], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);
    // colonised stars: golden, brighter
    const cpos = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.acos(1 - Math.random() * 0.9);
      cpos.set([Math.sin(v) * Math.cos(u) * 415, Math.cos(v) * 415, Math.sin(v) * Math.sin(u) * 415], i * 3);
    }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cpos, 3)); cg.setDrawRange(0, 0);
    this.colonies = new THREE.Points(cg, new THREE.PointsMaterial({ color: 0xffd36b, size: 5, sizeAttenuation: false, transparent: true, opacity: 1, depthWrite: false, fog: false }));
    this.colonies.frustumCulled = false;
    scene.add(this.colonies);
    // the sun seen in the sky (in front of the camera when it looks up)
    this.sunDir = new THREE.Vector3(-0.62, 0.42, -0.79).normalize();
    this.sunDisc = new THREE.Group();
    const halo = glow(0xffe0a0, 90, 0.7); halo.material.fog = false; this.sunDisc.add(halo);
    const core = glow(0xffffff, 26, 1); core.material.fog = false; this.sunDisc.add(core);
    scene.add(this.sunDisc);
    // Dyson swarm: mirrors orbiting the sun disc
    const mirror = new THREE.PlaneGeometry(3.2, 2.2);
    const mm = new THREE.MeshBasicMaterial({ color: 0xffe9a8, side: THREE.DoubleSide, fog: false });
    this.swarm = new THREE.InstancedMesh(mirror, mm, 500);
    this.swarm.count = 0; this.swarm.frustumCulled = false;
    scene.add(this.swarm);
    this.swarmSeeds = Array.from({ length: 500 }, (_, i) => ({ ring: i % 5, a: Math.random() * Math.PI * 2, r: 30 + (i % 5) * 9 + Math.random() * 4, sp: 0.05 + Math.random() * 0.08 }));
    // orbital ring station
    const ring = new THREE.Group();
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(16, 1.1, 8, 48), new THREE.MeshBasicMaterial({ color: 0xc9d4de, fog: false })));
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 32, 0.5), new THREE.MeshBasicMaterial({ color: 0x9aa5b0, fog: false })); sp.rotation.z = i * Math.PI / 6; ring.add(sp); }
    const hub = glow(0x9fe0ff, 10, 0.9); hub.material.fog = false; ring.add(hub);
    ring.visible = false;
    scene.add(ring);
    this.ring = ring;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }

  update(dt, game) {
    const w = game.weather || 0, c = game.clearSky || 0, night = game.night || 0, sp = game.spring || 0;
    const cam = this.camera.position;
    this.dome.position.copy(cam); this.stars.position.copy(cam); this.colonies.position.copy(cam);
    // fog and sky colours
    this.fogCol.copy(SKY).lerp(STORM, w);
    const dusk = Math.max(0, 1 - Math.abs(night - 0.5) * 2) * (night > 0.02 && night < 0.98 ? 1 : 0);
    this.fogCol.lerp(DUSK, dusk * 0.35).lerp(NIGHT, night * 0.85);
    this.scene.background = this.fogCol;
    this.scene.fog.color.copy(this.fogCol);
    const sky = game.skyBlend || 0;
    this.scene.fog.near = THREE.MathUtils.lerp(80, 4, w) + sky * 30;
    this.scene.fog.far = THREE.MathUtils.lerp(190, 52, w) + sky * 60;
    this.dome.material.uniforms.horizon.value.copy(this.fogCol);
    this.dome.material.uniforms.top.value.setHex(0x8fb6e0).lerp(NIGHT, night).lerp(STORM, w * 0.8);
    this.stormEl.style.opacity = String(Math.min(1, w * 1.1));
    // lights
    this.sun.intensity = 2.6 * (1 - 0.55 * w) * (1 + 0.12 * c) * (1 - night * 0.82);
    this.sun.color.copy(BASE_SUN).lerp(WARM_SUN, Math.max(c * 0.7, dusk)).lerp(MOON, night);
    this.hemi.intensity = 1.35 * (1 - 0.25 * w) * (1 - night * 0.55);
    this.hemi.color.copy(HEMI_SKY).lerp(HEMI_NIGHT, night);
    this.renderer.toneMappingExposure = (1.08 * (1 - 0.12 * w) + 0.05 * c) * (1 - night * 0.18);
    // snow
    this.snow.material.size = 0.14 + w * 0.2;
    this.snow.material.opacity = 0.85 * (1 - 0.85 * c) + 0.1 * w;
    this.audio.setWind(w);
    if (sp !== this.lastSpring) {
      this.lastSpring = sp;
      this.world.ground.material.color.copy(SNOW_GROUND).lerp(SPRING_GROUND, sp);
      this.forest.material.color.copy(WHITE).lerp(SPRING_FIR, sp * 0.85);
      this.hemi.groundColor.copy(HEMI_GROUND).lerp(SPRING_GROUND, sp * 0.6);
    }
    this.flakeGeo.setDrawRange(0, Math.round((650 + 950 * w) * (1 - sp * 0.97) * (1 - (game.snowStop || 0))));
    // stars, sun, swarm, ring
    this.stars.material.opacity = Math.max(night, sky * 0.35) * (1 - w);
    const civ = game.civ || {};
    this.colonies.geometry.setDrawRange(0, Math.round((civ.colonies || 0) * 24));
    this.colonies.material.size = 4 + Math.sin(performance.now() * 0.003) * 1.2;
    this.sunDisc.position.copy(cam).addScaledVector(this.sunDir, 380);
    this.sunDisc.visible = sky > 0.05 || (civ.swarm || 0) > 0;
    const n = Math.round(Math.min(10, civ.swarm || 0) * 50);
    this.swarm.count = n;
    if (n) {
      const center = this.sunDisc.position;
      const t = performance.now() * 0.001;
      for (let i = 0; i < n; i++) {
        const s = this.swarmSeeds[i];
        const a = s.a + t * s.sp;
        const tilt = s.ring * 0.55;
        this._v.set(Math.cos(a) * s.r, Math.sin(a) * s.r * Math.cos(tilt), Math.sin(a) * s.r * Math.sin(tilt));
        this._v.applyAxisAngle(this.sunDir, s.ring);
        this._v.add(center);
        this._q.setFromRotationMatrix(this._m.lookAt(this._v, center, THREE.Object3D.DEFAULT_UP));
        this._m.compose(this._v, this._q, this._s);
        this.swarm.setMatrixAt(i, this._m);
      }
      this.swarm.instanceMatrix.needsUpdate = true;
    }
    this.ring.visible = !!civ.orbital;
    if (this.ring.visible) {
      this.ring.position.copy(cam).add(this._v.set(-0.2, 0.75, -0.62).normalize().multiplyScalar(300));
      this.ring.lookAt(cam);
      this.ring.rotateZ(performance.now() * 0.00005);
    }
  }
}
