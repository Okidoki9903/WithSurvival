const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');fs.mkdirSync('test-artifacts',{recursive:true});
const fixture=Array(28).fill(0);
Object.assign(fixture,{0:2,1:50000,2:1,4:1,8:4,9:0,10:3,11:3,12:500,13:20,14:100,15:4,16:4,17:0,24:3,25:3,26:3,27:3});
const rectanglesOverlap=(a,b)=>a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765');await page.click('#play');
 await page.waitForFunction(()=>window.__withsurvival?.state);
 assert.equal(await page.locator('#bottom-nav').isVisible(),false,'navigation starts hidden before a real first harvest');
 assert.equal(await page.locator('#money').isVisible(),true);
 assert.equal(await page.locator('#logo').isVisible(),false);
 assert.equal(await page.locator('#btn-pause').isVisible(),true,'pause remains accessible during the first hunt');
 assert.equal(await page.locator('#btn-menu').isVisible(),false);
 assert.equal(await page.locator('#btn-sound').isVisible(),false);
 await page.waitForFunction(()=>window.__withsurvival?.state?.contextAction);
 assert.equal(await page.locator('#context-action').isVisible(),true,'one world action is available before the first harvest');
 await page.addInitScript(v=>{localStorage.clear();localStorage.setItem('withsurvival-save-v2',JSON.stringify(v));},fixture);
 await page.reload();await page.click('#play');await page.waitForFunction(()=>window.__withsurvival?.state?.served===20);await page.waitForTimeout(250);
 assert.equal(await page.locator('#bottom-nav').isVisible(),true,'real saved progression reveals navigation');
 assert.deepEqual((await page.locator('#bottom-nav button').allTextContents()).map(x=>x.replace(/[⚒▤⌁]/g,'').trim()),['Construire','Inventaire','Expéditions']);
 assert.ok((await page.locator('#campaign-objective').textContent()).length<=48,'one compact quest');
 assert.equal(await page.locator('#campaign-objective').textContent(),'Construisez les collecteurs','collector construction follows the first food loop');
 const visible=['#money','#resource-strip','#buttons','#mission','#player-status','#bottom-nav','#btn-dash'];
 if(await page.locator('#context-cluster').isVisible())visible.push('#context-cluster');
 const boxes={};for(const selector of visible){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,`${selector} fits ${width}x${height}`);boxes[selector]=box;}
 for(let a=0;a<visible.length;a++)for(let b=a+1;b<visible.length;b++)assert.equal(rectanglesOverlap(boxes[visible[a]],boxes[visible[b]]),false,`${visible[a]} and ${visible[b]} do not overlap at ${width}x${height}`);
 for(const selector of ['#buttons button','#bottom-nav button','#btn-dash'])for(const button of await page.locator(selector).all()){const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44,'touch targets at least44px');}
 await page.locator('#nav-build').click();assert.equal(await page.locator('dialog[open]').count(),0,'Construire guides to the world without forcing a purchase menu');
 await page.locator('#nav-inventory').click();assert.equal(await page.locator('#inventory-panel').evaluate(n=>n.open),true);
 const moneyRow=page.locator('#inventory-stocks .inventory-row').filter({hasText:'Pièces'});assert.equal(await moneyRow.locator('b').textContent(),'50000','inventory exposes actual money');
 const s=await page.evaluate(()=>window.__withsurvival.state);assert.equal(await page.locator('#hud-raw-count').textContent(),'0');assert.equal(await page.locator('#hud-food-count').textContent(),'0');assert.equal(s.player.stackN,0);
 await page.locator('#inventory-close').click();await page.locator('#btn-pause').click();await page.waitForTimeout(100);const time=await page.evaluate(()=>window.__withsurvival.state.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__withsurvival.state.time),time,'pause menu freezes simulation');await page.locator('#pause-continue').click();
 await page.locator('#nav-expeditions').click();assert.equal(await page.locator('#journal').evaluate(n=>n.open),true);assert.equal(await page.locator('#btn-expand').isVisible(),true);await page.locator('#journal-close').click();
 await page.locator('#btn-menu').click();assert.equal(await page.locator('#btn-reset').isVisible(),true);page.once('dialog',d=>d.dismiss());await page.locator('#btn-reset').click();assert.equal(await page.evaluate(()=>window.__withsurvival.state.served),20,'cancelled human reset confirmation preserves save');await page.locator('#menu-close').click();
 await page.screenshot({path:`test-artifacts/mobile-hud-${width}x${height}.png`});assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: responsive320/390/430+landscape HUD, real progressive tutorial, exact three navigation targets, actual inventory, world-build guidance, pause and confirmed reset.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
