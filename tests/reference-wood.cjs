const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
fs.mkdirSync('test-artifacts',{recursive:true});const bits=n=>new Uint32Array(new Float32Array([n]).buffer)[0];
(async()=>{
 const W=(await WebAssembly.instantiate(fs.readFileSync('web/game.wasm'),{})).instance.exports;W.pc_init(43);
 // Supported advanced save in an isolated context; real harvesting starts with zero stocks.
 const fixture=Array(28).fill(0);Object.assign(fixture,{0:2,1:1000,2:1,4:1,12:10,13:10,14:100});
 new Uint32Array(W.memory.buffer,W.pc_save_ptr(),W.pc_save_capacity()).set(fixture);W.pc_load(fixture.length);
 const length=W.pc_save(),save=Array.from(new Uint32Array(W.memory.buffer,W.pc_save_ptr(),length));save[length-2]=bits(-10);save[length-1]=bits(71.6);
 const worldLen=W.pc_world_save(),world=Array.from(new Uint32Array(W.memory.buffer,W.pc_world_save_ptr(),worldLen));
 for(let id=0;id<=3;id++){const at=6+21*id;world[at]=1;world[at+1]=2;world[at+2]=2;world[at+3]=2;world[at+8]=1;world[at+19]=10;}
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765');await page.evaluate(({save,world})=>{localStorage.setItem('withsurvival-save-v2',JSON.stringify(save));localStorage.setItem('withsurvival-world-v4',JSON.stringify(world));},{save,world});await page.reload();await page.click('#play');
  await page.waitForFunction(()=>window.__withsurvival?.state?.carryDistrict===3&&window.__withsurvival.state.carryN>=3,null,{timeout:20000});
  const state=await page.evaluate(()=>window.__withsurvival.state);assert.equal(state.currentDistrict,3);assert.equal(state.carryKind,1);assert.ok(state.districts[3].sourceReserve<8,'harvest consumes actual tree reserve');
  await page.screenshot({path:'test-artifacts/reference-wood-harvest.png'});
  await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>window.__withsurvival.state.player.x>-6,null,{timeout:10000});await page.keyboard.up('ArrowRight');
  const pos=await page.evaluate(()=>{const d=window.__withsurvival.state.districts[3];return window.__withsurvival.worldToScreen({x:d.processorX,z:d.processorZ-2.5,y:.085});});
  assert.ok(pos.x>0&&pos.x<390&&pos.y>0&&pos.y<844);await page.mouse.click(pos.x,pos.y);
  await page.waitForFunction(()=>window.__withsurvival.state.districts[3].midOut>0,null,{timeout:15000});
  await page.screenshot({path:'test-artifacts/reference-wood-production.png'});assert.equal(await page.locator('dialog[open]').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS actual wood reserve harvest, carried logs, world-only sawmill deposit and real plank production.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
