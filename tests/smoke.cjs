// Browser smoke test: boots the game, lets an autopilot follow the in-game
// objectives with a time warp, and checks the core loop progresses without
// page errors. Usage: node tests/smoke.cjs [url]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || process.env.GAME_URL || 'http://localhost:8765/';
const OUT = path.join(__dirname, '..', 'test-artifacts');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${URL}${URL.includes('?') ? '&' : '?'}fresh&q=low`);
  await page.waitForFunction(() => window.__ws && window.__ws.game, null, { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, 'smoke-start.png'), timeout: 120000 });

  await page.evaluate(() => {
    const ws = window.__ws; ws.start();
    const g = ws.game, inp = ws.input;
    const orig = g.update.bind(g);
    g.update = () => { for (let k = 0; k < 12; k++) orig(1 / 30, inp.read()); };
    inp.read = () => {
      const o = g.objective, p = g.player;
      const at = g.guideTarget || (o && o.at);
      if (!o || !at) return { x: 0, z: 0 };
      let dx = at.x - p.x, dz = at.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < (g.guideAt ? 0.2 : o.hunt ? 2.0 : 0.3)) return { x: 0, z: 0 };
      const yaw = g.camYaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      dx /= d; dz /= d;
      return { x: dx * rx + dz * rz, z: -(dx * fx + dz * fz) };
    };
  });

  const want = (s) => s.sold >= 20 && s.bought.includes('camp') && s.kills >= 3 && s.served >= 3 && s.bought.includes('cashier');
  let st = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 420000) {
    await page.waitForTimeout(3000);
    st = await page.evaluate(() => { const g = window.__ws.game; return { time: g.time, sold: g.stats.sold, bought: Object.keys(g.bought), kills: g.stats.kills, served: g.stats.served, cooked: g.stats.cooked, money: g.money }; });
    if (want(st)) break;
  }
  await page.screenshot({ path: path.join(OUT, 'smoke-end.png'), timeout: 120000 });
  await browser.close();
  console.log(JSON.stringify(st));
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }
  if (!st || !want(st)) { console.error('Core loop did not progress far enough'); process.exit(1); }
  console.log('OK');
})();
