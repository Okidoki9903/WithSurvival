// Context is derived from simulation state. No resource, purchase or tutorial counter lives here.
const BASE_NAMES=['Convoyeur','Livraison','Héros','Sac','Bottes','Grill','Village','Enclos','Arme','Atelier','Cuisine','Assistants','Collecteurs','Chasseurs','Ferme','Caravanes','Entrepôt'];
const DISTRICT_NAMES=['Quartier','Récolte','Transformation','Finition','Convoyeurs','Équipe','Stockage','Collecte directe','Marché'];
const RAW=['poissons','blé','fruits','minerai','prises','cristaux','vestiges','minerai rare'];
const MID=['filets','farine','jus','lingots','peaux','essences','reliques','alliages'];
const FINAL=['poissons fumés','pains','confitures','outils','cuir','potions','artefacts','couronnes'];
const distance=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z);
const iconFor=d=>['🐟','🌾','🍎','⛏','🥩','💎','🗿','👑'][d]||'📦';
export const padKey=p=>`pad:${p.scope}:${p.district}:${p.kind}`;
export function padAction(s,p){
 const name=p.scope===0?BASE_NAMES[p.kind]:DISTRICT_NAMES[p.kind];
 const near=distance(s.player,p)<=2.2;
 let condition='';
 if(!p.available){
  if(p.scope===0)condition=({19:'Essences requises',18:'Victoires requises',100:'Premier convoyeur requis',101:'Second convoyeur requis',102:'Héros requis',6:'Développer le village',7:'Agrandir l’enclos',13:'Guilde des chasseurs requise',14:'Ferme requise',15:'Caravanes requises',16:'Entrepôt requis',99:'Niveau maximal'})[p.missingPrereq]||'Étape précédente requise';
  else if(p.missingPrereq===1)condition=(s.grinderLevel||0)<4?'Atelier niveau 4 requis':(s.kitchenLevel||0)<4?'Cuisine niveau 4 requise':!s.conv1On||!s.conv2On?'Deux convoyeurs requis':'Nourrir 20 voyageurs';
  else condition=p.missingPrereq===2?'Machines 3 et convoyeur requis':p.missingPrereq===3?`Vendre ${s.districts?.[p.district]?.unlockNeedSales||30} produits`:'Ouvrir ce quartier';
 }
 return {...p,id:padKey(p),type:'pad',label:p.scope===1&&p.kind===0?'OUVRIR':p.level===0?'CONSTRUIRE':'AMÉLIORER',icon:p.kind===0&&p.scope===1?'🏘':'🔨',detail:`${name} · ${Math.ceil(p.remaining)} 🪙`,condition,enabled:p.available&&(s.money>0||!near),progress:p.totalCost?p.paid/p.totalCost:0,distance:distance(s.player,p),near};
}
export function resourceTargets(s,L){
 const p=s.player,targets=[];
 const add=(id,q,label,icon,detail='',extra={})=>targets.push({id,type:'resource',...q,label,icon,detail,enabled:true,progress:0,...extra});
 if(p.stack===1&&p.stackN>0)add('base:deposit-meat',L.grinderIn,'DÉPOSER','🥩','Atelier');
 else if(p.stack===2&&p.stackN>0)add('base:deposit-raw',L.grillIn,'DÉPOSER','🔥','Cuisine');
 else if(p.stack===3&&p.stackN>0)add('base:serve',L.counterIn,'SERVIR','🍽','Voyageurs');
 if(s.carryN>0&&s.carryKind===3&&s.carryDistrict<3&&(s.currentDistrict??-1)<0&&p.z<20)add('cross:food-serve',L.counterIn,'SERVIR','🍽',FINAL[s.carryDistrict],{district:s.carryDistrict,stage:3});
 if(s.cashPile>0)add('base:cash',L.cash,'RAMASSER','🪙',`${s.cashPile} pièces`);
 if(!p.stackN){
  for(let i=0;i<(s.meats||[]).length;i++)add(`meat:${i}`,s.meats[i],'RAMASSER','🥩','Viande');
  if(s.grinderOut>0&&!s.conv1On)add('base:raw',L.grinderOut,'RAMASSER','🥩','Viande préparée');
  if(s.grillOut>0&&!s.conv2On)add('base:cooked',L.grillOut,'RAMASSER','🍽','Repas prêts');
 }
 for(let i=0;i<(s.districtLoot||[]).length;i++){const l=s.districtLoot[i];add(`loot:${i}`,l,'RAMASSER',l.district===4?'🥩':'🏺','Prises',{district:l.district,stage:1,category:'loot',index:i});}
 for(const d of s.districts||[]){
  if(!d.unlocked)continue;
  const held=s.carryN>0&&s.carryDistrict===d.id;
  if(held){
   const kind=s.carryKind;
   add(`district:${d.id}:deposit:${kind}`,{x:kind===1?d.processorX:kind===2?d.finisherX:d.marketX,z:(kind===1?d.processorZ:kind===2?d.finisherZ:d.marketZ)-2.5},kind===3?'VENDRE':'DÉPOSER',kind===3?'🪙':'📦',(kind===1?RAW:kind===2?MID:FINAL)[d.id],{district:d.id,stage:kind});
  }else if(!s.carryN&&!p.stackN){
   add(`district:${d.id}:source`,{x:d.sourceX,z:d.sourceZ},d.id===0?'PÊCHER':d.id===4||d.id===6?'CHASSER':d.id===3||d.id===5||d.id===7?'EXTRAIRE':'RÉCOLTER',iconFor(d.id),RAW[d.id],{district:d.id,stage:0,progress:d.harvestProgress||0});
   if(d.rawOut>0)add(`district:${d.id}:raw`,{x:d.sourceX,z:d.sourceZ},'RAMASSER',iconFor(d.id),RAW[d.id],{district:d.id,stage:1});
   if(d.midOut>0&&d.transportLevel<1)add(`district:${d.id}:mid`,{x:d.processorX,z:d.processorZ+2.5},'RAMASSER','📦',MID[d.id],{district:d.id,stage:2});
   if(d.finishedOut>0&&d.transportLevel<2)add(`district:${d.id}:final`,{x:d.finisherX,z:d.finisherZ+2.5},'RAMASSER','📦',FINAL[d.id],{district:d.id,stage:3});
  }
 }
 if(!p.stackN&&!s.carryN){
  for(let i=0;i<(s.bears||[]).length;i++)add(`bear:${i}`,s.bears[i],'CHASSER','⚔','Viande',{type:'animal',windup:s.bears[i].windup||0});
  for(let i=0;i<(s.districtMonsters||[]).length;i++){const b=s.districtMonsters[i];if(b.alive)add(`monster:${i}`,b,'CHASSER','⚔',b.district===6?'Géant':'Grande bête',{type:'animal',district:b.district,windup:b.windup||0});}
 }
 return targets.map(a=>({...a,category:a.category||(a.stage===2?'mid':a.stage===3||a.id==='base:cooked'?'finished':a.id.startsWith('meat:')?'meat':a.id==='base:cash'?'cash':'raw'),index:a.index??(a.id.startsWith('meat:')?Number(a.id.slice(5)):0),distance:distance(p,a),near:distance(p,a)<=1.7}));
}
export function preferredBuild(s){
 const pads=(s.worldPads||[]).filter(p=>p.level<p.max);
 const first=(kind)=>pads.find(p=>p.scope===0&&p.kind===kind&&p.available);
 if((s.served||0)>0&&!(s.collectorLevel||0)&&first(12))return padAction(s,first(12));
 const next=(s.districts||[]).find(d=>!d.unlocked);
 if(next){const opening=pads.find(p=>p.scope===1&&p.district===next.id&&p.kind===0&&p.available);if(opening)return padAction(s,opening);}
 const local=pads.filter(p=>p.available&&(p.scope===0?s.currentDistrict<0:p.district===s.currentDistrict));
 local.sort((a,b)=>distance(s.player,a)-distance(s.player,b));return local[0]?padAction(s,local[0]):null;
}
export function chooseContext(s,L,selected=null){
 if(s.player.dead>0)return null;
 const targets=resourceTargets(s,L),pads=(s.worldPads||[]).filter(p=>p.level<p.max).map(p=>padAction(s,p));
 if(selected?.type==='destination')return {...selected,distance:distance(s.player,selected),near:distance(s.player,selected)<=1.35};
 if(selected){const a=[...pads,...targets].find(q=>q.id===selected.id);if(a)return a;}
 const held=targets.find(a=>a.id.startsWith('base:deposit')||a.id==='base:serve'||a.id==='cross:food-serve'||a.id.includes(':deposit:'));
 if(held)return held;
 const nearby=targets.filter(t=>t.distance<=1.7&&t.type!=='animal').sort((a,b)=>a.distance-b.distance);
 const pad=pads.filter(p=>p.distance<=1.3).sort((a,b)=>a.distance-b.distance)[0];
 if(pad)return pad;
 if(nearby.length)return nearby[0];
 const threat=targets.filter(t=>t.type==='animal'&&t.distance<3.5).sort((a,b)=>a.distance-b.distance)[0];if(threat)return threat;
 if(s.currentDistrict>=0){const local=targets.filter(t=>t.district===s.currentDistrict).sort((a,b)=>a.distance-b.distance);if(local[0])return local[0];}
 const output=targets.find(t=>t.id==='base:cash')||targets.find(t=>t.id==='base:cooked')||targets.find(t=>t.id==='base:raw')||targets.find(t=>t.id.startsWith('meat:'));
 if(output)return output;
 if(!s.served){const hunt=targets.filter(t=>t.type==='animal').sort((a,b)=>a.distance-b.distance);if(hunt[0])return hunt[0];}
 return preferredBuild(s)||targets.sort((a,b)=>a.distance-b.distance)[0]||null;
}
export function selectAtWorldPoint(s,L,point){
 const targets=[...(s.worldPads||[]).map(p=>padAction(s,p)),...resourceTargets(s,L)].filter(t=>distance(t,point)<2.4);
 targets.sort((a,b)=>distance(a,point)-distance(b,point));return targets[0]||null;
}
