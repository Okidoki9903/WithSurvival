const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');fs.mkdirSync('test-artifacts',{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765/?version=reference-v6');await page.click('#play');
  await page.waitForFunction(()=>window.__withsurvival?.state?.contextAction);
  const tapTarget=async()=>{
   const position=await page.evaluate(()=>window.__withsurvival.worldToScreen({...window.__withsurvival.state.contextAction,y:.1}));
   assert.ok(position.x>0&&position.x<390&&position.y>0&&position.y<844,'next interaction is visible in the world');
   await page.mouse.click(position.x,position.y);
  };
  await tapTarget();
  await page.waitForFunction(()=>window.__withsurvival.state.player.stackN>0,null,{timeout:45000});
  assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal(await page.locator('#context-action').isVisible(),false,'no action button gates gameplay');
  const px=await page.evaluate(()=>window.__withsurvival.state.player.x);
  if(Math.abs(px)>.6){const key=px<0?'ArrowRight':'ArrowLeft';await page.keyboard.down(key);await page.waitForFunction(()=>Math.abs(window.__withsurvival.state.player.x)<.6,null,{timeout:15000});await page.keyboard.up(key);}
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>window.__withsurvival.state.player.z>-10,null,{timeout:15000});await page.keyboard.up('ArrowDown');
  await tapTarget();
  await page.waitForFunction(()=>window.__withsurvival.state.grinderIn>0||window.__withsurvival.state.grinderOut>0,null,{timeout:30000});
  assert.ok(await page.evaluate(()=>window.__withsurvival.state.time)<30,'first hunt and real deposit fit the first thirty simulation seconds');
  await page.screenshot({path:'test-artifacts/reference-first-delivery.png'});assert.deepEqual(errors,[]);
  console.log('PASS fresh world-only hunt, actual stacked pickup, automatic machine deposit, no CTA or menu and first thirty simulation seconds.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
