import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
let T,world,root,mats,groups=[];
let biomeSources=[];
const floorTextureCache=new Map();
const districtSignatures=[];
const unlockObjects=[];
let selectedContext=null;
export function setSelectedDistrictContext(record){selectedContext=record;}
let workerBatch,beastBatch,giantBatch,attackBatch,lootBatch,cargoBatch;
let monsterHPBack,monsterHPFill,marketMoneyBatch;
const playerResourceStacks=[];
const definitions=[
  {name:'Port des brumes',short:'PORT',chain:['Pêche','Filetage','Fumoir','Marché marin'],color:'#72cbd5',kind:'fish'},
  {name:'Champs dorés',short:'MOISSONS',chain:['Blé','Moulin','Boulangerie','Étal du pain'],color:'#e4bf69',kind:'grain'},
  {name:'Verger des sources',short:'VERGER',chain:['Pommes','Pressoir','Confiturerie','Épicerie'],color:'#d89372',kind:'fruit'},
  {name:'Scierie',short:'BOIS',chain:['Bûches','Scierie','Menuiserie','Meubles'],color:'#edc399',kind:'wood'},
  {name:'Terres du ranch',short:'RANCH',chain:['Chasse aux bêtes','Découpe','Tannerie','Sellerie'],color:'#bfa378',kind:'ranch'},
  {name:'Mine',short:'MINE',chain:['Minerai','Fonderie','Forge','Outils'],color:'#b9d9e6',kind:'ore'},
  {name:'Grandes bêtes',short:'CHASSE',chain:['Chasse','Découpe','Cuisine','Repas'],color:'#edc299',kind:'ranch'},
  {name:'Atelier métal',short:'ATELIER',chain:['Fer','Fonderie','Assemblage','Équipements'],color:'#b9d9e6',kind:'ore'},
];
export function initDistrictWorld({THREE,scene,materials={}}){
  T=THREE;world=scene;root=new T.Group();root.name='district-world';world.add(root);
  biomeSources=materials.biomes||[];
  mats={path:materials.path||new T.MeshStandardMaterial({color:'#939c89',roughness:1}),grass:materials.grass||new T.MeshStandardMaterial({color:'#658c62',roughness:1}),wood:materials.wood||new T.MeshStandardMaterial({color:'#9c754c',roughness:.9}),roof:materials.roof||new T.MeshStandardMaterial({color:'#456d78',roughness:.85}),vertex:new T.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.06}),water:new T.MeshStandardMaterial({color:'#57aeb9',roughness:.2,metalness:.2}),belt:new T.MeshStandardMaterial({color:'#374d53',roughness:.6}),locked:new T.MeshStandardMaterial({color:'#7e979b',transparent:true,opacity:.24,roughness:1})};
  const batch=geo=>{const b=new T.InstancedMesh(geo,mats.vertex,128);b.count=0;b.castShadow=true;b.frustumCulled=false;world.add(b);return b;};
  workerBatch=batch(mergeGeometries([part(box(.36,.5,.26),'#80adab',0,.68,0),part(sphere(.17),'#e2b38d',0,1.08,0),part(cone(.25,.18,8),'#d4b978',0,1.24,0),part(box(.14,.38,.17),'#4a646e',-.11,.23,0),part(box(.14,.38,.17),'#4a646e',.11,.23,0),part(box(.3,.32,.17),'#b08b60',0,.72,-.25)],false));
  beastBatch=batch(mergeGeometries([part(sphere(.66),'#a5a195',0,1.08,0,0,0,0,1.1,.9,1.4),part(sphere(.44),'#cec7ac',0,1.35,.95),part(cone(.13,.65,6),'#e7d9ad',-.27,1.85,.92,0,0,-.5),part(cone(.13,.65,6),'#e7d9ad',.27,1.85,.92,0,0,.5),...[[-.42,.55],[.42,.55],[-.42,-.55],[.42,-.55]].map(([x,z])=>part(box(.26,.8,.28),'#777b70',x,.4,z))],false));
  giantBatch=batch(mergeGeometries([part(new T.DodecahedronGeometry(.95,0),'#9188a5',0,1.85,0,0,0,0,1,1.2,.7),part(new T.IcosahedronGeometry(.49,0),'#c7b799',0,3.2,0),part(box(.55,1.4,.58),'#6e7686',-.52,.7,0),part(box(.55,1.4,.58),'#6e7686',.52,.7,0),part(new T.DodecahedronGeometry(.43,0),'#8a839c',-1.15,1.6,0,0,0,.2,1,1.8,1),part(new T.DodecahedronGeometry(.43,0),'#8a839c',1.15,1.6,0,0,0,-.2,1,1.8,1),part(box(.55,.09,.06),'#dfb979',0,3.22,.44)],false));
  giantBatch.geometry.dispose();giantBatch.geometry=beastBatch.geometry.clone().scale(1.6,1.6,1.6);
  attackBatch=new T.InstancedMesh(new T.RingGeometry(.9,1.1,24),new T.MeshBasicMaterial({color:'#ffa26b',side:T.DoubleSide,transparent:true,opacity:.8,depthWrite:false}),128);attackBatch.count=0;attackBatch.frustumCulled=false;world.add(attackBatch);
  lootBatch=batch(part(sphere(.17),'#e2c799',0,0,0,0,0,0,1.3,.8,1));
  cargoBatch=batch(part(box(.3,.22,.3),'#dac6a1'));
  monsterHPBack=new T.InstancedMesh(new T.PlaneGeometry(1.08,.15),new T.MeshBasicMaterial({color:'#263d42',depthTest:false}),8);
  monsterHPFill=new T.InstancedMesh(new T.PlaneGeometry(1,.09),new T.MeshBasicMaterial({color:'#f49970',depthTest:false}),8);
  for(const bar of[monsterHPBack,monsterHPFill]){bar.count=0;bar.frustumCulled=false;bar.renderOrder=11;world.add(bar);}
  for(const def of definitions){const variants=[];for(let stage=0;stage<3;stage++){const stack=new T.InstancedMesh(resourceGeometry(def.kind,stage),mats.vertex,64);stack.count=0;stack.frustumCulled=false;stack.castShadow=true;world.add(stack);variants.push(stack);}playerResourceStacks.push(variants);}
  marketMoneyBatch=new T.InstancedMesh(mergeGeometries([part(box(.6,.09,.32),'#40de44'),part(box(.13,.095,.33),'#b9f3ac')],false),mats.vertex,512);marketMoneyBatch.count=0;marketMoneyBatch.frustumCulled=false;marketMoneyBatch.castShadow=true;world.add(marketMoneyBatch);
  return root;
}
const box=(w,h,d)=>new T.BoxGeometry(w,h,d),cyl=(r,h,s=10)=>new T.CylinderGeometry(r,r,h,s),sphere=(r,s=8)=>new T.SphereGeometry(r,s,6),cone=(r,h,s=8)=>new T.ConeGeometry(r,h,s);
function part(geo,color,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1){
  const q=new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz));geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),q,new T.Vector3(sx,sy,sz)));
  const c=new T.Color(color),a=new Float32Array(geo.attributes.position.count*3);for(let k=0;k<a.length;k+=3){a[k]=c.r;a[k+1]=c.g;a[k+2]=c.b;}geo.setAttribute('color',new T.BufferAttribute(a,3));geo.deleteAttribute('uv');return geo.index?geo.toNonIndexed():geo;
}
function mesh(geo,mat=mats.vertex,shadow=true){const m=new T.Mesh(geo,mat);m.castShadow=shadow;m.receiveShadow=true;return m;}
function combine(parts,g){if(!parts.length)return;const m=mesh(mergeGeometries(parts,false));g.add(m);return m;}
function block(g,w,h,d,x,y,z,mat){
  const geo=box(w,h,d);
  if(mat===mats.path||mat===mats.grass||mat.userData.districtTerrain||(mat===mats.wood&&h<.3)){
    const unit=mat===mats.path?2:mat===mats.wood?2.5:4;
    const uv=geo.attributes.uv,positions=geo.attributes.position,normals=geo.attributes.normal;
    for(let k=0;k<uv.count;k++)if(Math.abs(normals.getY(k))>.9)uv.setXY(k,(positions.getX(k)+w/2)/unit,(positions.getZ(k)+d/2)/unit);
    uv.needsUpdate=true;
  }
  const m=mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;
}
function textPlane(g,text,x,y,z,color='#ecf6ed',width=3.3){
  const c=document.createElement('canvas');c.width=768;c.height=144;const ctx=c.getContext('2d');ctx.fillStyle='#223a42';ctx.fillRect(0,0,768,144);ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(4,4,760,136);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 46px system-ui';ctx.fillText(text,384,72,730);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=mesh(new T.PlaneGeometry(width,width*144/768),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,transparent:false}),false);m.position.set(x,y,z);m.rotation.x=-.18;m.userData.contextLabel={text,canvas:c,ctx,color,width,mode:null};g.add(m);return m;
}
function updateContextLabel(m,distance,showText,icon){
  m.visible=distance<=8;if(!m.visible)return;
  const data=m.userData.contextLabel,mode=showText?'text':'icon';if(data.mode===mode)return;data.mode=mode;
  const ctx=data.ctx;ctx.clearRect(0,0,768,144);ctx.fillStyle='#223a42';ctx.fillRect(0,0,768,144);ctx.fillStyle=data.color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=showText?'bold 46px system-ui':'bold 85px "Segoe UI Emoji",system-ui';ctx.fillText(showText?data.text:icon,384,72,730);m.material.map.needsUpdate=true;
  m.scale.set(showText?1:.33,showText?1:1.8,1);
}
function roof(g,x,y,z,w,d){for(const side of[-1,1]){const m=block(g,w*.64,.12,d,x+side*w*.23,y,z,mats.roof);m.rotation.z=-side*.55;}}
function resourceGeometry(kind,stage=0){
  if(stage>0){
    if(kind==='fish'||kind==='ranch')return mergeGeometries([part(cyl(.31,.09,12),'#dceaf0'),part(cyl(.25,.11,12),stage===1?'#ee8064':'#d69458',0,.03,0),part(box(.37,.02,.04),'#f6d4ad',0,.1,-.08,0,.4),part(box(.37,.02,.04),'#f6d4ad',0,.1,.07,0,.4)],false);
    if(kind==='grain')return stage===1?part(box(.35,.36,.26),'#e7dec4'):part(sphere(.21),'#daa06a',0,0,0,0,0,0,1.4,.65,1);
    if(kind==='fruit')return mergeGeometries([part(cyl(.14,.3,8),stage===1?'#f0ba74':'#d57d70'),part(cyl(.15,.055,8),'#d6c8a5',0,.18,0)],false);
    if(kind==='wood')return stage===1?part(box(.52,.12,.28),'#d7a774'):mergeGeometries([part(box(.42,.28,.35),'#c59160'),part(box(.45,.07,.37),'#e2b581',0,.17,0)],false);
    if(kind==='ore')return stage===1?part(box(.42,.15,.25),'#b6c4ca'):mergeGeometries([part(cyl(.035,.4,6),'#b69872',0,-.07,0),part(box(.33,.13,.15),'#8aa4b5',0,.15,0)],false);
  }
  if(kind==='fish')return mergeGeometries([part(sphere(.16),'#85dbe1',0,0,0,0,0,0,1.8,.7,.8),part(cone(.17,.25,3),'#7bc3d3',-.3,0,0,0,0,Math.PI/2),part(sphere(.025),'#1f3940',.2,.03,.1)],false);
  if(kind==='grain')return mergeGeometries([part(cyl(.035,.45,5),'#ad8b48',0,.15,0),part(sphere(.1),'#edd185',0,.35,0,0,0,0,.8,1.5,.6)],false);
  if(kind==='fruit')return mergeGeometries([part(sphere(.17),'#dc8267'),part(cone(.055,.14,4),'#70926b',.02,.2,0)],false);
  if(kind==='ore')return part(stage?box(.3,.12,.17):new T.DodecahedronGeometry(.2,0),stage?'#e4c2a5':'#8b9b9c');
  if(kind==='crystal')return part(cone(.13,.45,5),stage?'#c2abef':'#9be8d5',0,.05,0);
  if(kind==='relic')return part(new T.TorusGeometry(.15,.065,5,10),'#d4b475',0,0,0,Math.PI/2);
  if(kind==='wood')return part(cyl(.12,.45,7),'#bb936c',0,0,0,0,0,Math.PI/2);
  return part(box(.35,.08,.27),'#c39578',0,0,0,0,0,.1);
}
function station(g,def,stage,x,z,level){
  if(stage>0&&level===0){
    const points=[[-1.3,-1.1],[1.3,-1.1],[1.3,1.1],[-1.3,1.1],[-1.3,-1.1]].map(([dx,dz])=>new T.Vector3(x+dx,.065,z+dz));
    const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:'#ffffff',dashSize:.19,gapSize:.12}));line.computeLineDistances();g.add(line);g.userData.ownedMaterials.push(line.material);return;
  }
  const h=1.1+Math.min(level,4)*.15,parts=[],kind=def.kind;
  // Workstations retain distinct silhouettes, even from the mobile camera.
  if(stage===0){
    if(kind==='fish'){
      block(g,3.4,.12,1.3,x-1.1,.16,z,mats.wood);
      for(const side of[-1,1]){parts.push(part(cyl(.055,1.9,6),'#bb9671',x-.6,1.08,z+side*.48,0,0,-.35));parts.push(part(box(.6,.07,.2),'#759db0',x-.9,1.5,z+side*.48));}
      parts.push(part(cyl(.43,.8,10),'#6d5745',x+.8,.5,z+.65));
      if(level>=1){
        for(let k=0;k<7;k++){parts.push(part(box(2,.025,.025),'#d6d8c7',x,.22,z+.15+k*.25));parts.push(part(box(.025,.025,1.5),'#d6d8c7',x-1+k*.33,.22,z+.9));}
        parts.push(part(sphere(.08),'#f0b987',x-.95,.25,z+.2));parts.push(part(sphere(.08),'#f0b987',x+.95,.25,z+1.6));
      }
      if(level>=2){parts.push(part(cyl(.32,.8,12),'#80a6ae',x+.9,.75,z-.75,0,0,Math.PI/2));parts.push(part(box(.65,.14,.7),'#536e78',x+.9,.35,z-.75));parts.push(part(new T.TorusGeometry(.29,.045,5,16),'#dac791',x+1.34,.75,z-.75,0,Math.PI/2));}
    }else if(kind==='grain'){
      block(g,3,.13,3,x,.08,z,mats.wood);
      for(let i=0;i<36;i++)parts.push(part(cone(.1,.55+(i%3)*.1,5),'#dcc172',x-1.2+(i%6)*.48,.42,z-1.2+Math.floor(i/6)*.48));
    }else if(kind==='wood'){
      // The reserved grove is rendered separately, behind the harvesting point.
    }else if(kind==='fruit'){
      for(const side of[-1,1]){parts.push(part(cyl(.16,1.8,7),'#806347',x+side*.85,.9,z));parts.push(part(sphere(.75),'#8ead70',x+side*.85,2,z,0,0,0,1,1.1,1));for(let i=0;i<5;i++)parts.push(part(sphere(.11),'#d48661',x+side*.85+Math.sin(i)*.5,1.85+(i%2)*.25,z+Math.cos(i)*.5));}
    }else if(kind==='ranch'){
      for(const dx of[-1.4,1.4])for(const dz of[-1.2,1.2])parts.push(part(cyl(.07,.9,6),'#a18b67',x+dx,.45,z+dz));
      parts.push(part(box(3,.09,.09),'#c5ab7a',x,.65,z-1.2));parts.push(part(box(3,.09,.09),'#c5ab7a',x,.65,z+1.2));
      parts.push(part(box(1.1,.08,.75),'#aa8b68',x,.7,z));
      parts.push(part(sphere(.24),'#e0d0af',x,1.2,z-.8,0,0,0,.8,1,.5));parts.push(part(cone(.08,.4,5),'#d7c7a1',x-.15,1.48,z-.8,0,0,-.5));parts.push(part(cone(.08,.4,5),'#d7c7a1',x+.15,1.48,z-.8,0,0,.5));
      parts.push(part(cyl(.05,1.4,6),'#856b4c',x+.65,.75,z,0,0,.3));
    }else if(kind==='relic'){
      parts.push(part(cyl(1.1,.2,10),'#9d9aad',x,.12,z));
      parts.push(part(box(.75,def.short==='CITADELLE'?3.4:2.5,.7),'#a19bb0',x,def.short==='CITADELLE'?1.8:1.4,z));
      parts.push(part(cone(.65,.8,4),'#d9c28b',x,def.short==='CITADELLE'?3.9:3,z,0,Math.PI/4));
      for(const side of[-1,1])parts.push(part(box(.35,1.4,.35),'#82869b',x+side*.95,.7,z+.1));
      parts.push(part(new T.TorusGeometry(.33,.07,5,18),'#dfc585',x,1.8,z+.4));
    }else{
      for(let i=0;i<7;i++)parts.push(part(kind==='crystal'?cone(.22,.9+(i%3)*.2,5):new T.DodecahedronGeometry(.4+(i%2)*.15,0),kind==='crystal'?'#7cdbd1':kind==='ore'?'#7b8d97':'#aba0c0',x+Math.sin(i*4)*.9,.4,z+Math.cos(i*4)*.9,0,i,.15));
    }
  }else if(kind==='grain'&&stage===1){
    parts.push(part(cyl(.62,2.8,10),'#ccba93',x,1.4,z));parts.push(part(cone(.86,.9,8),'#6d8c89',x,3.13,z));
    const rotor=new T.Group();rotor.position.set(x,2.45,z+.75);combine([part(box(2.4,.13,.1),'#c4b793'),part(box(.13,2.4,.1),'#c4b793'),part(cyl(.2,.13,8),'#697e81',0,0,.1,Math.PI/2)],rotor);rotor.userData.rotate=true;g.add(rotor);
  }else if((kind==='ore'||kind==='fish'||kind==='grain')&&stage===2 || kind==='ore'&&stage===1){
    parts.push(part(cyl(.65,h+1.2,10),'#8b7b69',x,(h+1.2)/2,z));parts.push(part(cyl(.25,1,8),'#586f73',x,h+1.65,z));parts.push(part(box(.8,.5,.08),'#f4a367',x,.72,z+.65));parts.push(part(box(.9,.12,.12),'#574c44',x,1,z+.75));
    if(kind==='ore')parts.push(part(box(.85,.16,.45),'#899d9f',x+.7,.8,z+.55));
  }else if(kind==='crystal'&&stage===2){
    block(g,2.3,.2,1.7,x,.7,z,mats.wood);
    for(const dx of[-.65,0,.65]){parts.push(part(sphere(.27),'#ade6d3',x+dx,1.1,z,0,0,0,.8,1.2,.8));parts.push(part(cyl(.065,.35,6),'#a3e1c4',x+dx,1.5,z));parts.push(part(cyl(.1,.08,6),'#816d99',x+dx,1.7,z));}
    parts.push(part(cone(.48,.9,5),'#bdb0da',x,2.05,z-.55));
  }else if(stage===3){
    block(g,2.5,h,1.9,x,h/2,z,mats.wood);roof(g,x,h+.3,z,3,2.6);block(g,2.7,.1,.8,x,.8,z+1.05,mats.wood);
    parts.push(part(box(.6,.7,.05),'#9cb2a6',x,h*.63,z+.98));
  }else{
    block(g,2.2,.18,1.8,x,.76,z,mats.wood);
    for(const dx of[-.88,.88])for(const dz of[-.65,.65])parts.push(part(box(.13,.75,.13),'#877253',x+dx,.37,z+dz));
    if(kind==='fruit')parts.push(part(cyl(.44,1.1,10),'#a0754d',x,1.3,z));
    else if(kind==='wood')parts.push(part(new T.TorusGeometry(.45,.06,5,16),'#b7c3c5',x,1.2,z,Math.PI/2));
    else if(kind==='relic')parts.push(part(cone(.45,.8,4),'#cabb94',x,1.25,z));
    else if(kind==='ranch')parts.push(part(box(.8,.65,.06),'#d4b391',x,1.2,z-.4));
    else parts.push(part(cyl(.35,.45,8),'#78969b',x,1.08,z));
  }
  combine(parts,g);
  // Level bulbs and auxiliary copper tanks show machinery upgrades physically.
  if(level>0&&!(kind==='fish'&&stage===0))combine([part(cyl(.18,.9,8),'#c6a277',x+1.1,.65,z-.5),part(cyl(.1,.8,6),'#93a8a3',x+1.1,1.38,z-.5),part(sphere(.09),'#ade1c7',x+1.1,1.85,z-.5)],g);
  const label=textPlane(g,def.chain[stage]+' · '+level,x,stage===0?1.9:2.3,z-.65,def.color,2.3);label.userData.stationStage=stage;
}
function dispose(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material?.map&&(o.material.type==='MeshBasicMaterial'||o.material.type==='SpriteMaterial')){o.material.map.dispose();o.material.dispose();}});for(const mat of group.userData.ownedMaterials||[])mat.dispose();root.remove(group);}
function districtLayout(d,index){const z0=d.z0??20+22*index,z1=d.z1??z0+20;return {x:((d.x0??-18)+(d.x1??18))/2,z:(z0+z1)/2,tileX:d.tileX??0,tileZ:d.tileZ??(index?z0-4:4.3)};}
function districtFloorTexture(index){
  const biome={3:1,5:2,6:3}[index];
  const source=index===7?mats.path.map:biome!==undefined?biomeSources[biome]:mats.grass.map;
  if(!source)return null;
  if(!floorTextureCache.has(source.uuid)){
    const texture=source.clone();texture.repeat.set(1,1);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.needsUpdate=true;floorTextureCache.set(source.uuid,texture);
  }
  return floorTextureCache.get(source.uuid);
}
function createDistrict(d,index){
  const def=definitions[index]||definitions[0],p=districtLayout(d,index),g=new T.Group();g.position.set(p.x,0,p.z);g.userData.districtIndex=index;root.add(g);
  const unlocked=!!(d.unlocked??d.open??d.level>0),w=d.width||(d.x1-d.x0)||36,h=d.depth||(d.z1-d.z0)||20;
  const terrain=unlocked?(index===7?mats.path:mats.grass).clone():mats.locked;
  if(unlocked)terrain.userData.districtTerrain=true;
  g.userData.terrain=unlocked?terrain:null;
  g.userData.ownedMaterials=unlocked?[terrain]:[];
  if(unlocked){terrain.map=null;terrain.color.set('#dda88e');}
  block(g,w,.025,h,0,.006,0,terrain);
  const frame=[];for(const side of[-1,1]){frame.push(part(box(w,.07,.07),unlocked?def.color:'#879b9c',0,.09,side*h/2));frame.push(part(box(.07,.07,h),unlocked?def.color:'#879b9c',side*w/2,.09,0));}
  combine(frame,g);
  const logs=[];
  for(const side of[-1,1]){
    for(let z=-h/2;z<=h/2;z+=.42){logs.push(part(cyl(.17,.94,8),'#d89562',side*w/2,.47,z));logs.push(part(cyl(.17,.06,8),'#edf2fa',side*w/2,.97,z));}
    for(let x=-w/2;x<=w/2;x+=.42){if(Math.abs(x)<2)continue;logs.push(part(cyl(.17,.94,8),'#d89562',x,.47,side*h/2));logs.push(part(cyl(.17,.06,8),'#edf2fa',x,.97,side*h/2));}
  }
  combine(logs,g);
  const titleY=2.5;
  const title=textPlane(g,def.short,0,titleY,-h/2+.2,def.color,4.2);title.userData.districtTitle=true;
  combine([part(box(.15,titleY,.15),'#8e7859',-2.3,titleY/2,-h/2+.2),part(box(.15,titleY,.15),'#8e7859',2.3,titleY/2,-h/2+.2),part(box(4.8,.12,.16),'#b1a17d',0,titleY+.43,-h/2+.2)],g);
  const tile=block(g,2.5,.12,2.5,p.tileX-p.x,.07,p.tileZ-p.z,unlocked?mats.path:mats.belt);tile.userData.districtIndex=index;unlockObjects.push(tile);
  // Payment and prerequisite feedback belongs to authoritative floor pads.
  const stations=d.stationLevels||d.levels||[d.sourceLevel||0,d.processorLevel||0,d.finisherLevel||0,d.marketLevel||0];
  const locations=[[d.sourceX??-10,d.sourceZ??p.z-5],[d.processorX??-3,d.processorZ??p.z-5],[d.finisherX??4,d.finisherZ??p.z-5],[d.marketX??11,d.marketZ??p.z-5]].map(([x,z])=>[x-p.x,z-p.z]);
  if(unlocked){
    if(def.kind==='wood'){
      const treeGeo=mergeGeometries([part(cyl(.13,1.15,8),'#9b7658',0,.575,0),part(cone(.65,1.05,8),'#748f7b',0,1.13,0),part(cone(.63,.72,8),'#edf2f8',0,1.35,0),part(cone(.45,.7,8),'#edf2f8',0,1.83,0)],false);
      const grove=new T.InstancedMesh(treeGeo,mats.vertex,12);grove.count=0;grove.frustumCulled=false;grove.castShadow=true;grove.receiveShadow=true;g.add(grove);g.userData.sourceGrove=grove;
    }
    for(let k=0;k<Math.min(5,d.storageLevel||0);k++)block(g,.7,.5,.7,-w/2+1.2+k*.85,.28,h/2-1.2,mats.wood);
    if(index===0){
      const[sourceX,sourceZ]=locations[0];
      block(g,6,.018,8,sourceX-4,.04,sourceZ,mats.water);
      const fish=new T.InstancedMesh(resourceGeometry('fish'),mats.vertex,32);fish.count=0;fish.frustumCulled=false;g.add(fish);g.userData.sourceFish=fish;
    }
    block(g,w-1,.01,1.5,0,.025,-1.5,mats.path);block(g,2,.01,h-1,0,.025,0,mats.path);
    for(let i=0;i<4;i++)station(g,def,i,...locations[i],stations[i]||0);
    if(d.marketLevel>0){
      const customer=new T.Group();const[marketX,marketZ]=locations[3];customer.position.set(marketX,.02,marketZ+2.8);customer.rotation.y=Math.PI;
      combine([part(box(.32,.46,.24),'#44a2cb',0,.64,0),part(sphere(.18),'#edc8a4',0,1.02,.03),part(sphere(.22),'#e7edf2',0,1.14,-.02,0,0,0,1,.65,1),part(box(.14,.37,.17),'#354e69',-.1,.23,0),part(box(.14,.37,.17),'#354e69',.1,.23,0)],customer);g.add(customer);g.userData.consumer=customer;g.userData.lastSales=d.sales;g.userData.salePulse=0;
      const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(64,64,60,0,Math.PI*2);ctx.fill();ctx.fillStyle='#32536a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='52px "Segoe UI Emoji",system-ui';ctx.fillText(['🍖','🍞','🍯','🪑','🍖','🛠','🍖','⚙'][index],64,43);ctx.font='bold 32px system-ui';ctx.fillText('× 1',64,94);
      const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const bubble=new T.Sprite(new T.SpriteMaterial({map:tex,depthWrite:false}));bubble.position.set(marketX,1.8,marketZ+2.8);bubble.scale.set(.65,.65,1);g.add(bubble);g.userData.demandBubble=bubble;
    }
    const conveyorSegments=[];if(d.transportLevel>=1)conveyorSegments.push([locations[1],locations[2]]);if(d.transportLevel>=2)conveyorSegments.push([locations[2],locations[3]]);
    for(const [a,b] of conveyorSegments){
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]),belt=block(g,.35,.09,length,(a[0]+b[0])/2,.14,(a[1]+b[1])/2,mats.belt);belt.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);
    }
  }else{
    const ghosts=[];for(const[x,z]of locations)ghosts.push(part(box(2.2,1.2,1.8),'#899e9d',x,.6,z));const ghost=mesh(mergeGeometries(ghosts,false),mats.locked,false);g.add(ghost);
  }
  const goods=[];for(let stage=0;stage<3;stage++){const batch=new T.InstancedMesh(resourceGeometry(def.kind,stage),mats.vertex,64);batch.count=0;batch.userData.unlocked=unlocked;batch.castShadow=true;batch.frustumCulled=false;g.add(batch);goods.push(batch);}g.userData.goods=goods;g.userData.locations=locations;g.userData.data=d;return g;
}
export function updateDistrictWorld(s,dt){
  if(!root)return;
  const districts=s.districts||[];
  const highest=Math.max(-1,...districts.filter(d=>d.unlocked).map(d=>d.id));
  for(let i=0;i<districts.length;i++){
    const d=districts[i],next=[d.id,d.x,d.z,d.unlocked,d.open,d.level,d.cost,d.sourceLevel,d.processorLevel,d.finisherLevel,d.marketLevel,d.transportLevel,d.crewLevel,d.storageLevel,...(d.stationLevels||d.levels||[])].join(':');
    if(next!==districtSignatures[i]){
      if(groups[i])dispose(groups[i]);
      for(let k=unlockObjects.length-1;k>=0;k--)if(unlockObjects[k].userData.districtIndex===i)unlockObjects.splice(k,1);
      groups[i]=createDistrict(d,i);districtSignatures[i]=next;
    }
    groups[i].visible=i<=highest+1;
    const terrain=groups[i].userData.terrain;
    const floorTexture=null;
    if(terrain&&floorTexture&&terrain.map!==floorTexture){terrain.map=floorTexture;if([3,5,6,7].includes(i))terrain.color.set('#ffffff');terrain.needsUpdate=true;}
  }
  const time=s.worldTime||s.time||0,matrix=new T.Matrix4(),q=new T.Quaternion();
  for(const variants of playerResourceStacks)for(const stack of variants)stack.count=0;
  if(s.carryN>0&&s.player){
    const stack=playerResourceStacks[Math.max(0,Math.min(7,s.carryDistrict||0))][Math.max(0,Math.min(2,(s.carryKind||1)-1))],p=s.player,angle=p.angle||0;stack.count=Math.min(64,s.carryN);q.setFromAxisAngle(new T.Vector3(0,1,0),angle);
    for(let k=0;k<stack.count;k++){matrix.compose(new T.Vector3(p.x-Math.sin(angle)*.43,.65+k*.13+(p.moving?Math.sin(time*9)*.03:0),p.z-Math.cos(angle)*.43),q,new T.Vector3(1,1,1));stack.setMatrixAt(k,matrix);}stack.instanceMatrix.needsUpdate=true;
  }
  let moneyCount=0;q.identity();for(const bank of s.marketCash||[]){for(let k=0;k<Math.min(64,Math.floor(bank.cash||0));k++){matrix.compose(new T.Vector3(bank.x,.12+k*.095,bank.z),q,new T.Vector3(1,1,1));marketMoneyBatch.setMatrixAt(moneyCount++,matrix);}}marketMoneyBatch.count=moneyCount;marketMoneyBatch.instanceMatrix.needsUpdate=true;
  const workers=s.districtWorkers||[];workerBatch.count=Math.min(128,workers.length);
  let cargo=0;
  for(let k=0;k<workerBatch.count;k++){const w=workers[k];q.setFromAxisAngle(new T.Vector3(0,1,0),w.angle||0);matrix.compose(new T.Vector3(w.x,Math.abs(Math.sin(time*9+k))*.05,w.z),q,new T.Vector3(1,1,1));workerBatch.setMatrixAt(k,matrix);if(w.carryN>0){matrix.compose(new T.Vector3(w.x,.84,w.z+.28),q,new T.Vector3(1,1,1));cargoBatch.setMatrixAt(cargo++,matrix);}}workerBatch.instanceMatrix.needsUpdate=true;cargoBatch.count=cargo;cargoBatch.instanceMatrix.needsUpdate=true;
  let beasts=0,giants=0,attacks=0;const col=new T.Color();
  for(const b of s.districtMonsters||[]){if(!b.alive)continue;const giant=b.district===6||b.kind>=2,batch=giant?giantBatch:beastBatch,k=giant?giants++:beasts++;if(k>=128)continue;q.setFromAxisAngle(new T.Vector3(0,1,0),b.angle||0);matrix.compose(new T.Vector3(b.x,Math.sin(time*5+k)*.035,b.z),q,new T.Vector3(1,1,1));batch.setMatrixAt(k,matrix);col.set(b.flash>0?'#ff8673':'#ffffff');batch.setColorAt(k,col);if(b.windup>0&&attacks<128){q.setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);const scale=giant?2:1.3;matrix.compose(new T.Vector3(b.x,.035,b.z),q,new T.Vector3(scale,scale,scale));attackBatch.setMatrixAt(attacks++,matrix);}}
  beastBatch.count=Math.min(128,beasts);giantBatch.count=Math.min(128,giants);attackBatch.count=attacks;
  let bars=0;
  for(const b of s.districtMonsters||[]){if(!b.alive||b.hpFraction>=.999||bars>=8)continue;const giant=b.district===6||b.kind>=2,y=giant?4.1:2.3,hp=Math.max(.01,Math.min(1,b.hpFraction)),width=giant?1.5:1;q.setFromEuler(new T.Euler(-1,0,0));matrix.compose(new T.Vector3(b.x,y,b.z),q,new T.Vector3(width,1,1));monsterHPBack.setMatrixAt(bars,matrix);matrix.compose(new T.Vector3(b.x-width*(1-hp)*.5,y+.01,b.z+.01),q,new T.Vector3(width*hp,1,1));monsterHPFill.setMatrixAt(bars++,matrix);}
  monsterHPBack.count=monsterHPFill.count=bars;monsterHPBack.instanceMatrix.needsUpdate=true;monsterHPFill.instanceMatrix.needsUpdate=true;
  for(const batch of[beastBatch,giantBatch,attackBatch]){batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
  const loot=s.districtLoot||[];lootBatch.count=Math.min(128,loot.length);q.identity();for(let k=0;k<lootBatch.count;k++){const l=loot[k];matrix.compose(new T.Vector3(l.x,.2+Math.sin(time*2+k)*.04,l.z),q,new T.Vector3(1,1,1));lootBatch.setMatrixAt(k,matrix);}lootBatch.instanceMatrix.needsUpdate=true;
  for(let i=0;i<groups.length;i++){
    const g=groups[i],d=districts[i],goods=g.userData.goods,locations=g.userData.locations;if(!g.visible)continue;g.traverse(o=>{
      if(o.userData.rotate)o.rotation.z=time*(.7+(d.processorLevel||0)*.1);
      if(o.userData.contextLabel){
        const distance=Math.hypot(g.position.x+o.position.x-s.player.x,g.position.z+o.position.z-s.player.z),stage=o.userData.stationStage;
        const selected=selectedContext?.district===i&&(selectedContext.kind===[1,2,3,8][stage]||selectedContext.category===['raw','mid','finished','market'][stage]);
        const icon=o.userData.districtTitle?'⌂':stage===0?['🐟','🌾','🍎','🪵','🥩','🪨','🥩','🔩'][i]:['','⚙','♨','●'][stage];
        updateContextLabel(o,distance,o.userData.districtTitle||selected&&distance<=4,icon);
      }
    });
    if(g.userData.consumer){if(g.userData.lastSales!==d.sales){g.userData.lastSales=d.sales;g.userData.salePulse=.6;}g.userData.salePulse=Math.max(0,g.userData.salePulse-dt);g.userData.consumer.position.y=.02+Math.sin(g.userData.salePulse*9)*g.userData.salePulse*.15;const c=g.userData.consumer.position;g.userData.demandBubble.visible=Math.hypot(g.position.x+c.x-s.player.x,g.position.z+c.z-s.player.z)<8;}
    if(g.userData.sourceFish){
      const fish=g.userData.sourceFish,[sourceX,sourceZ]=locations[0];fish.count=Math.min(32,Math.max(0,Math.floor(d.sourceReserve||0)));
      for(let k=0;k<fish.count;k++){const phase=time*.38+k*2.399,x=sourceX-4+Math.sin(phase)*2.2,z=sourceZ+Math.cos(phase*.73+k)*3.35,angle=-Math.atan2(Math.sin(phase*.73+k)*.73*3.35,Math.cos(phase)*2.2);q.setFromAxisAngle(new T.Vector3(0,1,0),angle);matrix.compose(new T.Vector3(x,.073,z),q,new T.Vector3(1.25,1.25,1.25));fish.setMatrixAt(k,matrix);}fish.instanceMatrix.needsUpdate=true;q.identity();
    }
    if(g.userData.sourceGrove){
      const grove=g.userData.sourceGrove,[sourceX,sourceZ]=locations[0];grove.count=Math.min(12,Math.max(0,Math.floor(d.sourceReserve||0)));q.identity();
      for(let k=0;k<grove.count;k++){const row=Math.floor(k/4),scale=.83+(k%3)*.06;matrix.compose(new T.Vector3(sourceX+(k%4-1.5)*1.25,0,sourceZ-2.3-row*.9),q,new T.Vector3(scale,scale,scale));grove.setMatrixAt(k,matrix);}grove.instanceMatrix.needsUpdate=true;
    }
    if(!goods[0].userData.unlocked)continue;for(const batch of goods)batch.count=0;
    const stocks=[d.rawOut||0,d.midOut||0,d.finishedOut||0,d.marketIn||0];
    for(let segment=0;segment<4;segment++)for(let k=0;k<Math.min(16,stocks[segment]);k++){
      const a=locations[segment],b=locations[Math.min(3,segment+1)],automated=segment===1?d.transportLevel>=1:segment===2?d.transportLevel>=2:false;
      let x=a[0]+(k%4-.5)*.23,z=a[1]+(segment===0?1.6:2.5)+Math.floor(k%8/4)*.22,y=.3+Math.floor(k/8)*.27;
      if(automated&&k<2){const t=(time*.16+k*.5)%1;x=T.MathUtils.lerp(a[0],b[0],t);z=T.MathUtils.lerp(a[1],b[1],t);y=.43;}
      matrix.compose(new T.Vector3(x,y,z),q,new T.Vector3(1.35,1.35,1.35));const batch=goods[Math.min(2,segment)];batch.setMatrixAt(batch.count++,matrix);
    }
    for(const batch of goods)batch.instanceMatrix.needsUpdate=true;
  }
}
export function pickDistrictUnlock(raycaster){const hit=raycaster.intersectObjects(unlockObjects.filter(o=>o.parent.visible),false)[0];return hit?hit.object.userData.districtIndex:null;}
export const DISTRICT_VISUALS=definitions;
