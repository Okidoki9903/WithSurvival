const {chromium}=require('playwright');
const assert=require('assert/strict');
require('fs').mkdirSync('test-artifacts',{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8765');
 const fixture=[2,10000,1,1,1,1,1,1,3,0,0,0,40,10,100,0,0,0,0,0,0,0,0,0,3,3,3,3];
 await page.evaluate(v=>localStorage.setItem('withsurvival-save-v2',JSON.stringify(v)),fixture);
 await page.reload();await page.click('#play');await page.waitForFunction(()=>window.__withsurvival?.state?.tier===3);
 await page.click('#btn-journal');
 const t=await page.evaluate(()=>window.__withsurvival.state.time);await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>window.__withsurvival.state.time),t,'journal pauses combat');
 await page.click('#journal-close'); await page.click('#btn-build');
 assert.equal(await page.locator('#build-town').isDisabled(),true,'town requires space and real civic services');
 for(const id of ['build-enclosure','upgrade-12','upgrade-16','upgrade-13','upgrade-8','upgrade-9','upgrade-10','upgrade-11']){await page.click('#'+id);await page.waitForTimeout(220);}
 let s=await page.evaluate(()=>window.__withsurvival.state);
 assert.equal(s.collectorLevel,1);assert.equal(s.guildLevel,1);assert.equal(s.warehouseLevel,1);assert.equal(s.upgrades.length,17);assert.ok(s.workers.length>=2);assert.equal(s.enclosure,1);assert.equal(s.weapon,1);assert.equal(s.grinderLevel,1);assert.equal(s.kitchenLevel,1);assert.equal(s.helperLevel,1);assert.equal(s.campRadius,12);
 await page.screenshot({path:'test-artifacts/mobile-build.png'});
 await page.click('#build-enclosure');await page.waitForTimeout(220);await page.click('#upgrade-14');await page.waitForTimeout(220);await page.click('#build-enclosure');await page.waitForTimeout(220);await page.click('#upgrade-15');await page.waitForTimeout(220);await page.click('#upgrade-16');await page.waitForTimeout(220);
 await page.click('#build-close');await page.click('#btn-journal');
 for(let region=1;region<4;region++){
  await page.locator('#route-list .route').nth(region).locator('button').click();await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__withsurvival.state.region),region);
  await page.click('#journal-close');await page.waitForTimeout(250);
  await page.screenshot({path:`test-artifacts/region-${region}.png`});await page.click('#btn-journal');
 }
 await page.click('#journal-close');await page.click('#btn-build');await page.click('#build-town');await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__withsurvival.state.tier),4);
 await page.click('#build-close');await page.click('#btn-dash');await page.waitForTimeout(220);
 assert.ok((await page.evaluate(()=>window.__withsurvival.state.dashCooldown))>0);
 await page.reload();await page.waitForFunction(()=>window.__withsurvival?.state?.tier===4);
 s=await page.evaluate(()=>window.__withsurvival.state);assert.equal(s.region,3);assert.equal(s.grinderLevel,1);assert.equal(s.enclosure,3);assert.equal(s.farmLevel,1);assert.equal(s.tradeLevel,1);assert.equal(s.warehouseLevel,2);assert.ok(s.workers.length>=3);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS mobile build/journal pause, enclosure3, five civic buildings, four biomes, workers, contracts, dodge and saved progression; zero page errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
