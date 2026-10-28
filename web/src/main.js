// WithSurvival — bootstrap, renderer, camera and main loop.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { World, generateTrees } from './world.js';
import { Forest } from './forest.js';
import { ItemRenderer } from './items.js';
import { FX } from './fx.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { Story } from './story.js';
import { Game } from './game.js';

const SAVE_KEY = 'withsurvival-fortaube-v1';
const params = new URLSearchParams(location.search);
const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const quality = params.get('q') || (mobile ? 'medium' : 'high');

// ---------------------------------------------------------------------------
// Renderer & scene
// ---------------------------------------------------------------------------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'medium' ? 1.6 : 1));
renderer.shadowMap.enabled = quality !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const SKY = new THREE.Color(0xdfe9f3);
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 80, 190);

const camera = new THREE.PerspectiveCamera(30, 1, 1, 500);
const CAM = { yaw: THREE.MathUtils.degToRad(38), pitch: THREE.MathUtils.degToRad(52), dist: 60 };

const hemi = new THREE.HemisphereLight(0xdde9ff, 0xc4cfdc, 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe8cc, 2.6);
sun.castShadow = renderer.shadowMap.enabled;
const SH = quality === 'high' ? 2048 : 1024;
sun.shadow.mapSize.set(SH, SH);
const sc = sun.shadow.camera;
sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 120;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);
const SUN_OFFSET = new THREE.Vector3(-20, 34, 8);

// Optional bloom (?bloom); glows are otherwise faked with additive halos.
let composer = null;
if (params.has('bloom')) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 1.15));
  composer.addPass(new OutputPass());
}

// Falling snow
const flakes = 1600;
const flakeGeo = new THREE.BufferGeometry();
const flakePos = new Float32Array(flakes * 3);
for (let i = 0; i < flakes; i++) { flakePos[i * 3] = (Math.random() - 0.5) * 60; flakePos[i * 3 + 1] = Math.random() * 26; flakePos[i * 3 + 2] = (Math.random() - 0.5) * 60; }
flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
const snow = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.85, depthWrite: false }));
snow.frustumCulled = false;
scene.add(snow);

// ---------------------------------------------------------------------------
// World & game
// ---------------------------------------------------------------------------
const world = new World(scene);
const forest = new Forest(scene, generateTrees(), { castShadow: renderer.shadowMap.enabled });
const items = new ItemRenderer(scene);
const fx = new FX(scene, camera, document.getElementById('fx-layer'));
const audio = new Audio();
const hud = new HUD();

let save = null;
if (params.has('fresh')) { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
try { save = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { save = null; }
const story = new Story(hud, save);
const game = new Game({ scene, camera, world, forest, items, fx, audio, hud, story, camYaw: CAM.yaw }, save);
game.save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.serialize())); } catch { /* storage full or blocked */ } };
setInterval(() => started && game.save(), 4000);
document.addEventListener('visibilitychange', () => { if (document.hidden && started) game.save(); });

const input = new Input(document.getElementById('touch'), document.getElementById('joy'), document.getElementById('joy-knob'));

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------
let started = false;
const startEl = document.getElementById('start');
function start() {
  if (started) return;
  started = true;
  audio.unlock();
  startEl.classList.add('gone');
  document.body.classList.add('playing');
  if (!save) setTimeout(() => story.beat('intro'), 600);
}
startEl.addEventListener('pointerdown', start);
window.addEventListener('keydown', (e) => { if (!started && (e.code === 'Space' || e.code === 'Enter')) start(); });
input.onFirst = () => { if (!started) start(); else audio.unlock(); };

const soundBtn = document.getElementById('btn-sound');
const syncSound = () => { soundBtn.classList.toggle('off', !audio.enabled); };
syncSound();
soundBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.unlock(); audio.toggle(); syncSound(); });
const menu = document.getElementById('menu');
document.getElementById('btn-menu').addEventListener('pointerdown', (e) => { e.stopPropagation(); paused = true; menu.classList.add('on'); });
document.getElementById('menu-resume').addEventListener('click', () => { paused = false; menu.classList.remove('on'); });
const resetBtn = document.getElementById('menu-reset');
resetBtn.addEventListener('click', () => {
  // two taps instead of a confirm() dialog (blocked in embedded viewers)
  if (!resetBtn.dataset.armed) {
    resetBtn.dataset.armed = '1';
    resetBtn.textContent = 'Touchez encore : tout effacer';
    setTimeout(() => { delete resetBtn.dataset.armed; resetBtn.textContent = 'Recommencer l’aventure'; }, 3000);
    return;
  }
  started = false;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  location.reload();
});
let paused = false;
document.getElementById('credits-continue').addEventListener('click', () => document.getElementById('credits').classList.remove('on'));

// ---------------------------------------------------------------------------
// Resize & camera
// ---------------------------------------------------------------------------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer?.setSize(w, h);
  camera.aspect = w / h;
  // Keep a similar amount of world visible in portrait and landscape.
  const portrait = h > w;
  // keep roughly 20 world units visible across the narrow side
  const aspect = w / h;
  camera.fov = 30;
  const halfT = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  CAM.dist = portrait ? 16 / (2 * halfT * aspect) : 21 / (2 * halfT);
  camera.updateProjectionMatrix();
  const bufH = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
  fx.setScale(bufH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)));
}
window.addEventListener('resize', resize);
resize();

const camTarget = new THREE.Vector3(game.player.x, 0, game.player.z);
let zoom = 1;
function updateCamera(dt) {
  const p = game.player;
  const lead = 0.18;
  const tx = p.x + p.vx * lead, tz = p.z + p.vz * lead;
  const k = 1 - Math.exp(-dt * 6);
  camTarget.x += (tx - camTarget.x) * k;
  camTarget.z += (tz - camTarget.z) * k;
  let wantZoom = game.stage === 0 ? 0.86 : game.boss && !game.boss.dead ? 1.25 : 1;
  if (game.zoomPulse > 0) { game.zoomPulse -= dt; wantZoom = 1.6; }
  if (game.zoomOverride) { wantZoom = game.zoomOverride; zoom = wantZoom; }
  zoom += (wantZoom - zoom) * (1 - Math.exp(-dt * 1.5));
  const d = CAM.dist * zoom;
  const cp = Math.cos(CAM.pitch);
  camera.position.set(camTarget.x + Math.sin(CAM.yaw) * cp * d, Math.sin(CAM.pitch) * d, camTarget.z + Math.cos(CAM.yaw) * cp * d);
  const s = game.shake;
  if (s > 0) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
  camera.lookAt(camTarget.x, 0.8, camTarget.z);
  // shadows follow the view, snapped to texels to avoid shimmering
  const texel = (sc.right - sc.left) / SH;
  const sx = Math.round(camTarget.x / texel) * texel, sz = Math.round(camTarget.z / texel) * texel;
  sun.target.position.set(sx, 0, sz);
  sun.position.set(sx + SUN_OFFSET.x, SUN_OFFSET.y, sz + SUN_OFFSET.z);
  // snow volume follows camera
  snow.position.set(camTarget.x, 0, camTarget.z);
}

// Weather: the Great Blizzard thickens fog and snow; the ending clears the sky.
const STORM = new THREE.Color(0x9cabbd), WARM_SUN = new THREE.Color(0xffd29a), BASE_SUN = new THREE.Color(0xffe8cc);
const fogCol = new THREE.Color();
const stormEl = document.getElementById('storm');
function updateWeather() {
  const w = game.weather || 0, c = game.clearSky || 0;
  fogCol.copy(SKY).lerp(STORM, w);
  scene.background = fogCol; scene.fog.color.copy(fogCol);
  scene.fog.near = THREE.MathUtils.lerp(80, 4, w);
  scene.fog.far = THREE.MathUtils.lerp(190, 52, w);
  flakeGeo.setDrawRange(0, Math.round(650 + 950 * w));
  stormEl.style.opacity = String(Math.min(1, w * 1.1));
  sun.intensity = 2.6 * (1 - 0.55 * w) * (1 + 0.12 * c);
  sun.color.copy(BASE_SUN).lerp(WARM_SUN, c * 0.7);
  hemi.intensity = 1.35 * (1 - 0.25 * w);
  renderer.toneMappingExposure = 1.08 * (1 - 0.12 * w) + 0.05 * c;
  snow.material.size = 0.14 + w * 0.2;
  snow.material.opacity = 0.85 * (1 - 0.85 * c) + 0.1 * w;
  audio.setWind(w);
}

function updateSnow(dt) {
  const a = flakeGeo.attributes.position.array;
  const t = performance.now() * 0.001;
  const w = game.weather || 0;
  for (let i = 0; i < flakes; i++) {
    a[i * 3 + 1] -= dt * (1.2 + (i % 7) * 0.12) * (1 + w * 2.5);
    a[i * 3] += (Math.sin(t + i) * 0.4 + w * 9) * dt;
    if (a[i * 3] > 30) a[i * 3] -= 60;
    if (a[i * 3 + 1] < 0) { a[i * 3 + 1] = 26; a[i * 3] = (Math.random() - 0.5) * 60; a[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  }
  flakeGeo.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let frames = 0, fpsT = 0, lowFps = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (started && !paused) game.update(dt, input.read());
  else if (!started) { game.drawItems(); game.player.model.pose(dt, 0); }
  world.update(dt);
  forest.update(dt);
  fx.update(dt, window.innerHeight, window.innerWidth);
  updateCamera(dt);
  updateSnow(dt);
  updateWeather();
  if (composer) composer.render(dt); else renderer.render(scene, camera);
  // adaptive quality: drop bloom and resolution if the device struggles
  frames++; fpsT += dt;
  if (fpsT > 2) {
    const fps = frames / fpsT;
    frames = 0; fpsT = 0;
    if (started && fps < 40 && !params.has('q')) {
      lowFps++;
      if (lowFps === 2 && composer) { composer = null; }
      else if (lowFps === 4) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() * 0.75)); resize(); }
    } else lowFps = 0;
  }
}
frame();
document.getElementById('loading')?.remove();
startEl.classList.add('ready');

// Hooks for automated browser tests.
window.__ws = { game, world, forest, camera, renderer, input, start, get started() { return started; } };
