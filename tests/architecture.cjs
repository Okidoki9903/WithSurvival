// Architecture test: buys every upgrade of the game in order (through both
// endings) and checks after each one that no building closes off a pocket of
// walkable ground and that every tile and drop pad stays reachable.
// Usage: node tests/architecture.cjs [url]
const { chromium } = require('playwright');

const URL = process.argv[2] || process.env.GAME_URL || 'http://localhost:8765/';

async function run(browser, ending) {
  const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${URL}${URL.includes('?') ? '&' : '?'}fresh&q=low`);
  await page.waitForFunction(() => window.__ws && window.__ws.game, null, { timeout: 30000 });
  const report = await page.evaluate((ending) => {
    const { game: g, forest, world } = window.__ws;
    window.__ws.start();
    const settle = () => { for (let i = 0; i < 90; i++) { world.update(1 / 60); forest.update(1 / 60); } };
    const bad = [];
    const check = (id) => {
      // pockets made of trees outside the palisade are harmless forest
      const pk = g.archReport().filter((x) => x.unreachable || world.insideCamp(x.x, x.z));
      if (pk.length) bad.push(`${id}: ${JSON.stringify(pk)}`);
    };
    for (let guard = 0; guard < 120; guard++) {
      // story flags that gate later tiles
      if (g.bought.expand2) g.bossDown = true;
      if (g.bought.beacon) g.act2.orders = Math.max(g.act2.orders, 3);
      if (g.bought.lakeRoad) { g.stats.smoked = 30; g.stats.fished = 10; if (!g.act2.blizzard) g.startBlizzard(false); }
      if (g.bought.brasier) { g.act2.ended = true; if (g.act3.phase === 'none') { g.act3.phase = 'heard'; g.act3.heard = true; } }
      if (g.stage >= 5) { g.stats.steel = 99; g.stats.mined = 99; }
      if (g.act3.phase === 'voyage') { g.arriveStation(false); g.act3.veraHeard = true; g.act3.chooseReady = true; }
      g.stats.cooked = 99; g.stats.kills = 99; g.stats.served = 99; g.stats.sawn = 99;
      g.refreshTiles();
      const tiles = g.tiles.filter((t) => t.def.id !== (ending === 'A' ? 'choiceB' : 'choiceA'));
      const t = tiles[0];
      if (!t) break;
      if (t.def.id.startsWith('choice')) check('station');
      g.completeTile(t);
      settle();
      if (g.act3.phase === 'ending') g.returnHome(false);
      check(t.def.id);
    }
    return { bad, bought: Object.keys(g.bought).length, phase: g.act3.phase };
  }, ending);
  await page.close();
  return { ...report, errors };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let ok = true;
  for (const ending of ['A', 'B']) {
    const r = await run(browser, ending);
    console.log(`ending ${ending}: ${r.bought} upgrades, phase ${r.phase}`);
    if (r.errors.length) { ok = false; console.error('Page errors:\n' + r.errors.join('\n')); }
    if (r.bad.length) { ok = false; console.error('Architecture problems:\n' + r.bad.join('\n')); }
    if (r.phase !== 'done') { ok = false; console.error('The story did not reach its end'); }
  }
  await browser.close();
  if (!ok) process.exit(1);
  console.log('OK');
})();
