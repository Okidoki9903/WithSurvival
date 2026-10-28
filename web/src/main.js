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
import { CameraRig } from './camera.js';
import { installCutaway } from './cutaway.js';
import { Sky } from './sky.js';

installCutaway();

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
world.forest = forest;
const rig = new CameraRig(camera, sun, SUN_OFFSET, sc, SH, snow);
const items = new ItemRenderer(scene);
const fx = new FX(scene, camera, document.getElementById('fx-layer'));
const audio = new Audio();
const hud = new HUD();

let save = null;
if (params.has('fresh')) { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
try { save = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { save = null; }
const story = new Story(hud, save);
story.onJournal = () => hud.journalNew();
const game = new Game({ scene, camera, world, forest, items, fx, audio, hud, story, camYaw: rig.yaw, rig }, save);
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
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem('ws-journal-seen'); } catch { /* ignore */ }
  location.reload();
});
let paused = false;
hud.setupJournal(story, () => { paused = true; }, () => { paused = false; });
document.getElementById('credits-continue').addEventListener('click', () => { document.getElementById('credits').classList.remove('on'); game.onCreditsClosed?.(); });

// ---------------------------------------------------------------------------
// Resize & camera
// ---------------------------------------------------------------------------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer?.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = 30;
  camera.updateProjectionMatrix();
  rig.resize(w, h);
  const bufH = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
  fx.setScale(bufH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)));
}
window.addEventListener('resize', resize);
resize();

rig.snapTo(game.player.x, game.player.z);
function updateCamera(dt) {
  rig.update(dt, game, input.zoom);
  hud.pointer(game, camera);
}

// Sky and weather (blizzard, thaw, day and night, the swarm and the stars).
const sky = new Sky({ scene, renderer, sun, hemi, snow, flakeGeo, world, forest, audio, camera, stormEl: document.getElementById('storm') });
function updateWeather(dt) { sky.update(dt, game); }

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
  updateWeather(dt);
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
window.__ws = { game, world, forest, camera, renderer, input, start, rig, get started() { return started; } };
