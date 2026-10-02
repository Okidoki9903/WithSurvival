const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
fs.mkdirSync('test-artifacts',{recursive:true});
const bits=n=>new Uint32Array(new Float32Array([n]).buffer)[0];
(async()=>{
 const W=(await WebAssembly.instantiate(fs.readFileSync('web/game.wasm'),{})).instance.exports;W.pc_init(43);
 const fixture=Array(28).fill(0);Object.assign(fixture,{0:2,1:600,2:1,4:1,8:3,10:3,11:1,12:40,13:20,14:100,15:4,16:4,24:3,25:3,26:3,27:3});
 new Uint32Array(W.memory.buffer,W.pc_save_ptr(),W.pc_save_capacity()).set(fixture);W.pc_load(fixture.length);
 const length=W.pc_save(),save=Array.from(new Uint32Array(W.memory.buffer,W.pc_save_ptr(),length));save[save.length-2]=bits(7.5);save[save.length-1]=bits(-3);
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765/');await page.evaluate(save=>{localStorage.clear();localStorage.setItem('withsurvival-save-v2',JSON.stringify(save));},save);await page.reload();await page.click('#play');
  await page.waitForFunction(()=>window.__withsurvival?.state?.worldPads?.length===89);
  const pos=await page.evaluate(()=>{const s=window.__withsurvival.state,p=s.worldPads.find(p=>p.scope===0&&p.kind===12);return window.__withsurvival.worldToScreen({...p,y:.085});});
  assert.ok(pos.x>0&&pos.x<390&&pos.y>0&&pos.y<760,'collector tile visible in mobile world');
  await page.mouse.click(pos.x,pos.y);
  await page.waitForFunction(()=>window.__withsurvival.state.contextAction?.kind===12);
  assert.equal(await page.locator('dialog[open]').count(),0,'world tile does not open a catalogue');

  await page.waitForFunction(()=>window.__withsurvival.state.worldPads.find(p=>p.scope===0&&p.kind===12).paid>0,null,{timeout:15000});
  await page.click('#btn-pause');
  let s=await page.evaluate(()=>window.__withsurvival.state),pad=s.worldPads.find(p=>p.scope===0&&p.kind===12),paid=pad.paid,money=s.money;
  assert.ok(paid>0&&paid<60,'dalle receives a genuine partial payment');assert.equal(pad.remaining,60-paid);assert.equal(money,600-paid,'real coins fund the tile');
  await page.reload();await page.waitForFunction(()=>window.__withsurvival?.state?.worldPads?.length===89);
  s=await page.evaluate(()=>window.__withsurvival.state);pad=s.worldPads.find(p=>p.scope===0&&p.kind===12);
  assert.equal(pad.paid,paid,'partial world financing survives reload');assert.equal(s.money,money);
  await page.click('#play');await page.waitForFunction(()=>window.__withsurvival.state.collectorLevel===1,null,{timeout:15000});
  await page.waitForTimeout(1200);s=await page.evaluate(()=>window.__withsurvival.state);assert.equal(s.collectorLevel,1);assert.equal(s.money,540,'standing still after completion does not buy the next tier');assert.ok(s.workers.some(w=>w.kind===0),'actual collector spawns');assert.equal(await page.locator('dialog[open]').count(),0);
  await page.screenshot({path:'test-artifacts/mobile-world-construction.png'});assert.deepEqual(errors,[]);
  console.log('PASS physical mobile tile selection, automatic approach, walk/finance without catalogue, partial save/reload, actual collector, completion latch and conservation.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
