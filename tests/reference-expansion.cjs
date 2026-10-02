const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
fs.mkdirSync('test-artifacts',{recursive:true});
const bits=n=>new Uint32Array(new Float32Array([n]).buffer)[0];
(async()=>{
 const W=(await WebAssembly.instantiate(fs.readFileSync('web/game.wasm'),{})).instance.exports;W.pc_init(43);
 const fixture=Array(28).fill(0);Object.assign(fixture,{0:2,1:3000,2:1,4:1,12:5,13:5,14:100});
 new Uint32Array(W.memory.buffer,W.pc_save_ptr(),W.pc_save_capacity()).set(fixture);W.pc_load(fixture.length);
 const len=W.pc_save(),save=Array.from(new Uint32Array(W.memory.buffer,W.pc_save_ptr(),len));save[len-2]=bits(-7);save[len-1]=bits(2);
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765');await page.evaluate(save=>localStorage.setItem('withsurvival-save-v2',JSON.stringify(save)),save);await page.reload();await page.click('#play');
  await page.waitForFunction(()=>window.__withsurvival?.state?.worldPads);
  const before=await page.evaluate(()=>window.__withsurvival.state);
  assert.ok(Math.abs(before.districts[0].z0-6.6)<.001,'first plot touches the original camp');
  assert.ok(Math.abs(before.districts[1].z0-before.districts[0].z1)<.001,'following plots are contiguous');
  const pos=await page.evaluate(()=>window.__withsurvival.worldToScreen({...window.__withsurvival.state.worldPads.find(p=>p.scope===1&&p.district===0&&p.kind===0),y:.085}));
  assert.ok(pos.x>0&&pos.x<390&&pos.y>0&&pos.y<844,'expansion floor tile is visible');await page.mouse.click(pos.x,pos.y);
  await page.waitForFunction(()=>window.__withsurvival.state.districts[0].unlocked,null,{timeout:30000});
  const s=await page.evaluate(()=>window.__withsurvival.state),d=s.districts[0];
  assert.equal(s.money,2820,'actual 180 bills paid');
  assert.equal(d.processorLevel,0);assert.equal(d.finisherLevel,0);assert.equal(d.marketLevel,0,'extension starts with unbuilt machines');
  assert.equal(d.sales,0);assert.equal(s.marketCash.length,8,'real market money is exported');
  assert.equal(s.marketCash[0].cash,0);assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('#context-action').isVisible(),false);
  await page.screenshot({path:'test-artifacts/reference-first-expansion.png'});
  // Walk through the actual shared gate, without a teleport or a catalogue.
  await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>Math.abs(window.__withsurvival.state.player.x)<.5,null,{timeout:10000});await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>window.__withsurvival.state.player.z>12,null,{timeout:10000});await page.keyboard.up('ArrowDown');
  await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>window.__withsurvival.state.player.x<-8,null,{timeout:10000});await page.keyboard.up('ArrowLeft');
  const tapPoint=async point=>{
   const p=await page.evaluate(point=>window.__withsurvival.worldToScreen({...point,y:.085}),point);
   assert.ok(p.x>0&&p.x<390&&p.y>0&&p.y<844,'production interaction visible');await page.mouse.click(p.x,p.y);
  };
  const source=await page.evaluate(()=>{const d=window.__withsurvival.state.districts[0];return{x:d.sourceX,z:d.sourceZ};});await tapPoint(source);
  await page.waitForFunction(()=>window.__withsurvival.state.carryN>0&&window.__withsurvival.state.carryKind===1,null,{timeout:15000});
  await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>window.__withsurvival.state.player.x>-6,null,{timeout:10000});await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>window.__withsurvival.state.player.z>14.5,null,{timeout:10000});await page.keyboard.up('ArrowDown');
  const foundation=await page.evaluate(()=>window.__withsurvival.state.worldPads.find(p=>p.scope===1&&p.district===0&&p.kind===2));await tapPoint(foundation);
  await page.waitForFunction(()=>window.__withsurvival.state.districts[0].processorLevel===1,null,{timeout:15000});
  const input=await page.evaluate(()=>{const d=window.__withsurvival.state.districts[0];return{x:d.processorX,z:d.processorZ-2.5};});await tapPoint(input);
  await page.waitForFunction(()=>window.__withsurvival.state.districts[0].midOut>0,null,{timeout:15000});
  assert.equal(await page.evaluate(()=>window.__withsurvival.state.money),2750,'processor foundation consumes real 70 bills');
  await page.screenshot({path:'test-artifacts/reference-fishing-production.png'});
  await page.click('#btn-pause');await page.reload();await page.waitForFunction(()=>window.__withsurvival?.state?.districts?.[0].unlocked);
  assert.equal(await page.evaluate(()=>window.__withsurvival.state.money),2750,'purchased terrain and machine persist');assert.deepEqual(errors,[]);
  console.log('PASS adjoining paid expansion, empty foundations, walk through the real gate, fish harvest, machine construction/deposit/production, physical money ABI and persistent terrain.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
