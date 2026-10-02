let T,scene,camera,root,state=null,selected=null,layout=null;
const pads=new Map(),resources=new Map();
const kindSymbols=['⌂','◆','⚙','♨','⇄','♟','▣','⚔','●'];
const resourceSymbols=['🐟','🌾','🍎','🪵','🥩','🪨','🥩','🔩'];
const baseSymbols={0:'▤',1:'▤',2:'⚔',3:'▣',4:'↟',5:'♨',6:'⌂',7:'↔',8:'⚔',9:'⚙',10:'♨',11:'♟',12:'♟',13:'⚔',14:'🌾',15:'●',16:'▣'};
export function initWorldAffordances({THREE,scene:target,camera:cam,layout:map=null}){T=THREE;scene=target;camera=cam;layout=map;root=new T.Group();root.name='world-affordances';scene.add(root);return root;}
const keyOf=r=>r.type==='resource'?`resource:${r.category}:${r.district??-1}:${r.index??0}`:`pad:${r.scope}:${r.district}:${r.kind}`;
export function setSelectedWorldAffordance(record){selected=record?keyOf(record):null;}
export function isWorldPadRevealed(pad,s,selectionKey=null){
  if(selectionKey===keyOf(pad)||(pad.paid||0)>0||(pad.level||0)>0)return true;
  if(pad.scope===0&&[6,13,14,15,16].includes(pad.kind))return false;
  const late=(s.served||0)>=10||(s.enclosure||0)>0||(s.tier||0)>0;
  if(pad.scope===0){
    if(Math.abs(pad.x)>(s.campRadius||9))return false;
    if(late)return true;
    if((s.served||0)<=0)return pad.kind===0&&(s.kills||0)>0;
    if(pad.kind===0||pad.kind===12)return true;
    if((s.collectorLevel||0)>0&&(pad.kind===9||pad.kind===10))return true;
    if(s.conv1On&&(pad.kind===1||pad.kind===3))return true;
    return false;
  }
  const district=s.districts?.find(d=>d.id===pad.district);
  if(pad.kind===0)return pad.district===0?late:!!s.districts?.find(d=>d.id===pad.district-1)?.unlocked;
  return !!district?.unlocked;
}
function createTile(record,isResource=false){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide});
  const floor=new T.Mesh(new T.PlaneGeometry(isResource?1.25:2.05,isResource?1.25:2.05),material);floor.rotation.x=-Math.PI/2;floor.position.set(record.x,.085,record.z);floor.renderOrder=5;root.add(floor);
  const spriteCanvas=document.createElement('canvas');spriteCanvas.width=384;spriteCanvas.height=112;
  const spriteTex=new T.CanvasTexture(spriteCanvas);spriteTex.colorSpace=T.SRGBColorSpace;
  const badge=new T.Sprite(new T.SpriteMaterial({map:spriteTex,transparent:true,depthWrite:false}));badge.scale.set(2.1,.61,1);badge.position.set(record.x,1.45,record.z);badge.renderOrder=8;root.add(badge);
  return{canvas,ctx:canvas.getContext('2d'),texture,floor,badge,spriteCanvas,spriteTex,record,signature:''};
}
function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function redraw(tile,isResource){
  const r=tile.record,active=selected===keyOf(r),ctx=tile.ctx,w=256;
  const remaining=Math.max(0,Math.ceil(r.remaining??r.totalCost??0)),fraction=r.totalCost>0?Math.min(1,(r.paid||0)/r.totalCost):0;
  const unlocked=!!r.available,done=r.max>0&&r.level>=r.max;
  const signature=[remaining,Math.floor(fraction*100),unlocked,done,active,r.n,r.level,r.scope,r.kind].join(':');if(signature===tile.signature)return;tile.signature=signature;
  ctx.clearRect(0,0,w,w);ctx.fillStyle=isResource?'rgba(86,76,74,.42)':'rgba(84,75,76,.66)';roundedRect(ctx,14,14,228,228,20);
  if(!isResource&&fraction>0){ctx.fillStyle='rgba(107,220,139,.4)';roundedRect(ctx,20,234-208*fraction,216,208*fraction,9);}
  ctx.strokeStyle=active?'#84ff74':'#ffffff';ctx.lineWidth=7;ctx.lineCap='round';
  ctx.setLineDash([20,15]);ctx.strokeRect(22,22,212,212);ctx.setLineDash([]);
  for(const[x,y,sx,sy]of[[22,22,1,1],[234,22,-1,1],[22,234,1,-1],[234,234,-1,-1]]){ctx.beginPath();ctx.moveTo(x+sx*40,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*40);ctx.stroke();}
  const symbol=isResource?(r.symbol||'◆'):r.scope===0?(baseSymbols[r.kind]||'↑'):r.kind===1?(resourceSymbols[r.district]||'◆'):(kindSymbols[r.kind]||'↑');
  ctx.fillStyle=done?'#b0d8bf':unlocked||isResource?'#ffffff':'#aebdbb';ctx.font='bold 82px "Segoe UI Emoji",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(done?'✓':symbol,128,96);
  ctx.font='bold 37px system-ui';ctx.fillStyle=unlocked||isResource?'#f7ebbe':'#a8b5b4';ctx.fillText(isResource?`× ${r.n}`:done?'MAX':`${remaining.toLocaleString('fr-FR')}`,128,180,190);
  if(!isResource&&!done){ctx.fillStyle='#61db66';ctx.fillRect(28,169,40,23);ctx.strokeStyle='#a5f898';ctx.lineWidth=3;ctx.strokeRect(31,172,34,17);ctx.fillStyle='#ffffff';ctx.font='bold 16px system-ui';ctx.fillText('$',48,181);}
  tile.texture.needsUpdate=true;
  const badgeSignature=[unlocked,done,r.level,r.kind,r.n].join(':');
  if(tile.badgeSignature===badgeSignature)return;tile.badgeSignature=badgeSignature;
  const bctx=tile.spriteCanvas.getContext('2d');bctx.clearRect(0,0,384,112);bctx.fillStyle='rgba(31,54,57,.86)';roundedRect(bctx,2,5,380,102,25);bctx.fillStyle='#eff5e9';bctx.textAlign='center';bctx.textBaseline='middle';bctx.font='bold 34px system-ui';
  bctx.fillText(isResource?`${symbol}  ${r.n}`:done?'Terminé':unlocked?`${r.kind===0?'Construire':'Améliorer'}  ${r.level||0} → ${(r.level||0)+1}`:'À débloquer',192,56,355);tile.spriteTex.needsUpdate=true;
}
function removeTile(tile){root.remove(tile.floor,tile.badge);tile.floor.geometry.dispose();tile.floor.material.dispose();tile.badge.material.dispose();tile.texture.dispose();tile.spriteTex.dispose();}
function resourceRecords(s){
  const list=[];
  if(layout){
    for(const[category,n,point,symbol]of[['raw',s.grinderOut,layout.grinderOut,'🥩'],['finished',s.grillOut,layout.grillOut,'🍖']])if(n>0&&point)list.push({type:'resource',category,district:-1,index:0,x:point.x,z:point.z,n,symbol});
    const player=s.player||{},holding=(player.stackN||0)>0,stack=player.stack;
    if(holding){
      const point=stack===1?layout.grinderIn:stack===2?layout.grillIn:stack===3?layout.counterIn:null;
      if(point)list.push({type:'resource',category:'input',district:-1,index:stack,x:point.x,z:point.z,n:player.stackN,symbol:'↓',inputKind:stack});
    }
  }
  for(const d of s.districts||[]){if(!d.unlocked)continue;for(const[category,n,x,z]of[['raw',d.rawOut,d.sourceX,d.sourceZ],['mid',d.midOut,d.processorX,d.processorZ+2.5],['finished',d.finishedOut,d.finisherX,d.finisherZ+2.5]])if(n>0)list.push({type:'resource',category,district:d.id,index:0,x,z,n,symbol:resourceSymbols[d.id]});}
  for(const bank of s.marketCash||[])if(bank.cash>0)list.push({type:'resource',category:'market-cash',district:bank.id??bank.district,index:0,x:bank.x,z:bank.z,n:bank.cash,symbol:'💵'});
  for(let k=0;k<(s.districtLoot||[]).length;k++){const l=s.districtLoot[k];list.push({type:'resource',category:'loot',district:l.district,index:k,x:l.x,z:l.z,n:l.n,symbol:l.district===4?'🥩':'🏺'});}
  if(s.cashPile>0)list.push({type:'resource',category:'cash',district:-1,index:0,x:layout?.cash?.x??3.8,z:layout?.cash?.z??5,n:s.cashPile,symbol:'💰'});
  for(let k=0;k<(s.meats||[]).length;k++){const m=s.meats[k];list.push({type:'resource',category:'meat',district:-1,index:k,x:m.x,z:m.z,n:1,symbol:'🥩'});}
  return list;
}
export function updateWorldAffordances(s){
  if(!root||!s.player)return;state=s;const p=s.player,near=[];
  const sync=(records,cache,isResource)=>{
    const live=new Set();for(const original of records){const r=isResource?original:{...original,type:'world-pad'},key=keyOf(r),distance=Math.hypot(r.x-p.x,r.z-p.z);live.add(key);
      let tile=cache.get(key);if(!tile&&(distance<=10||selected===key)){tile=createTile(r,isResource);cache.set(key,tile);}if(!tile)continue;tile.record=r;tile.floor.userData.affordance=r;tile.badge.userData.affordance=r;tile.floor.position.set(r.x,.085,r.z);tile.badge.position.set(r.x,isResource?1.05:1.45,r.z);tile.floor.visible=distance<=10||selected===key;tile.badge.visible=false;
      if(tile.floor.visible){redraw(tile,isResource);if(distance<=4)near.push({tile,distance,isResource});}
    }for(const[key,tile]of cache)if(!live.has(key)){removeTile(tile);cache.delete(key);}
  };
  const resourceList=resourceRecords(s).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,8);
  const padList=(s.worldPads||[]).filter(r=>(r.level<r.max||(r.paid||0)>0||selected===keyOf(r))&&isWorldPadRevealed(r,s,selected)).sort((a,b)=>{
    const aSelected=selected===keyOf(a),bSelected=selected===keyOf(b);
    return Number(bSelected)-Number(aSelected)||Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z);
  }).slice(0,4);
  sync(padList,pads,false);sync(resourceList,resources,true);
  near.sort((a,b)=>Number(selected===keyOf(b.tile.record))-Number(selected===keyOf(a.tile.record))||a.distance-b.distance);for(const item of near.slice(0,2))item.tile.badge.visible=selected===keyOf(item.tile.record)||item.distance<2.5;
}
export function pickWorldAffordance(raycaster){
  const targets=[...pads.values(),...resources.values()].flatMap(t=>[t.floor,t.badge]).filter(o=>o.visible);
  const hit=raycaster.intersectObjects(targets,false)[0];return hit?hit.object.userData.affordance:null;
}
