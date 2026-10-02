const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');fs.mkdirSync('test-artifacts',{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765');await page.click('#play');await page.waitForFunction(()=>window.__withsurvival?.state);
 for(const id of ['bottom-nav','context-cluster','mission','resource-strip','player-status','logo'])assert.equal(await page.locator('#'+id).isVisible(),false,`${id} does not obstruct the world`);
 assert.equal(await page.locator('#joy').isVisible(),false,'joystick is not permanently painted');
 const money=await page.locator('#money').boundingBox();assert.ok(money.x>width/2&&money.x+money.width<=width&&money.y>=0,'money sits at the upper right');
 const color=await page.locator('#money').evaluate(n=>getComputedStyle(n).backgroundImage);assert.ok(color.includes('96, 205, 101')||color.includes('60cd65'),'money badge is green');
 for(const selector of ['#btn-menu','#btn-pause']){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.y>=0&&box.x+box.width<=width,'discreet controls retain usable touch targets');}
 await page.waitForTimeout(6000);assert.equal(await page.locator('#micro-instruction').evaluate(n=>getComputedStyle(n).opacity),'0','initial hint disappears instead of becoming a permanent quest panel');
 await page.screenshot({path:`test-artifacts/reference-hud-${width}x${height}.png`});
 await page.click('#btn-menu');assert.equal(await page.locator('#menu-panel').evaluate(n=>n.open),true);assert.equal(await page.locator('#menu-expeditions').isVisible(),false,'production catalogs are not a normal gameplay route');
 await page.click('#menu-inventory');assert.equal(await page.locator('#inventory-panel').evaluate(n=>n.open),true);
 assert.equal(await page.locator('#inventory-stocks .inventory-row').filter({hasText:'Pièces'}).locator('b').textContent(),'0','optional inventory reports real stocks');await page.click('#inventory-close');
 await page.click('#btn-pause');await page.waitForTimeout(150);const t=await page.evaluate(()=>window.__withsurvival.state.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__withsurvival.state.time),t);await page.click('#pause-continue');
 assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: reference HUD320/390/430/landscape, clear full-world view, green upper-right money, no CTA/nav/catalog/quest overlay, transient hint, optional real inventory and pause.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
