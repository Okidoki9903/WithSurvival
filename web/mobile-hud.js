// A compact HUD driven by live world state; no synthetic inventories or progress.
import { districtCatalog } from './district-ui.js';
let actions={},live=null,initialized=false,firstHarvest=false,lastInventory=-Infinity;
let knownCollectors=null;
const $=id=>document.getElementById(id);
function text(id,value){const node=$(id),next=String(value);if(node.textContent!==next)node.textContent=next;}
const number=value=>Math.floor(Math.max(0,Number(value)||0));
const formatter=new Intl.NumberFormat('fr-CA',{notation:'compact',maximumFractionDigits:1});
const compact=value=>formatter.format(number(value));
function closeMenus(){for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();}
function open(id){closeMenus();$(id).showModal();}
export function isMobileMenuOpen(){return Boolean(document.querySelector('dialog[open]'));}
export function initMobileHUD(callbacks={}){
 actions=callbacks;if(initialized)return;initialized=true;
 document.body.classList.add('hud-onboarding');
 $('play').addEventListener('click',()=>document.body.classList.add('game-active'));
 $('nav-build').addEventListener('click',()=>{closeMenus();actions.guideBuild?.();});
 $('nav-inventory').addEventListener('click',()=>{open('inventory-panel');lastInventory=-Infinity;if(live)paintInventory(live);});
 $('nav-expeditions').addEventListener('click',()=>{closeMenus();$('btn-journal').click();});
 $('btn-menu').addEventListener('click',()=>open('menu-panel'));
 $('btn-pause').addEventListener('click',()=>open('pause-panel'));
 for(const [button,dialog] of [['inventory-close','inventory-panel'],['menu-close','menu-panel'],['menu-continue','menu-panel'],['pause-continue','pause-panel']])$(button).addEventListener('click',()=>$(dialog).close());
 $('menu-expeditions').addEventListener('click',()=>{closeMenus();$('btn-journal').click();});
 $('context-action').addEventListener('click',()=>{const action=live?.contextAction;if(action&&action.enabled!==false){actions.interact?.(action);}});
}
function quest(s){
 const p=s.player,carry=s.districtCarry||{district:s.carryDistrict,kind:s.carryKind,n:s.carryN};
 if(s.contextAction?.id==='cross:food-serve')return {label:'Nourrissez les voyageurs',current:0,total:1};
 if(carry.n>0)return {label:['','Déposez votre récolte','Terminez la transformation','Livrez au marché'][carry.kind]||'Rapportez les ressources',current:0,total:1};
 if((s.served||0)===0){
 if(p.stack===3||s.grillOut>0)return {label:'Livrez le premier repas',current:0,total:1};
 if(s.counter>0)return {label:'Nourrissez un voyageur',current:0,total:1};
 if(p.stack===2||s.grinderOut>0||s.grillIn>0)return {label:'Faites cuire les vivres',current:0,total:1};
 if(p.stack===1||s.grinderIn>0)return {label:'Apportez la viande à l’atelier',current:0,total:1};
 if(s.meats?.length)return {label:'Ramassez la viande',current:0,total:1};
 return {label:'Chassez une créature',current:Math.min(1,s.kills||0),total:1};
 }
 if(s.cashPile>0&&s.money===0)return {label:'Ramassez vos premières pièces',current:0,total:1};
 if(!(s.collectorLevel||0))return {label:'Construisez les collecteurs',current:0,total:1};
 const districts=s.districts||[],next=districts.find(d=>!d.unlocked);
 if(next?.id===0){if(s.grinderLevel<4)return {label:'Améliorez l’atelier',current:s.grinderLevel||0,total:4};if(s.kitchenLevel<4)return {label:'Développez la cuisine',current:s.kitchenLevel||0,total:4};if((s.served||0)<20)return {label:'Nourrissez les voyageurs',current:s.served||0,total:20};return {label:'Ouvrez la route du port',current:0,total:1};}
 if(next){const previous=districts[next.id-1];if(!previous.mastered)return {label:'Développez ce métier',current:Math.min(3,previous.sourceLevel)+Math.min(3,previous.processorLevel)+Math.min(3,previous.finisherLevel)+Math.min(1,previous.transportLevel),total:10};return {label:`Vendez ${districtCatalog[previous.id].finished.toLowerCase()}`,current:Math.min(previous.sales,next.unlockNeedSales),total:next.unlockNeedSales};}
 if(districts.length){const target=100+80*Math.min(s.prestige||0,1000);return {label:`Maîtrise ${(s.prestige||0)+1} : les huit métiers`,current:districts.filter(d=>d.mastered&&d.sales>=target).length,total:districts.length};}
 return {label:'Développez votre refuge',current:Math.min(4,s.tier||0),total:4};
}
function baseStocks(s){
 const p=s.player;
 return {meat:number(s.meats?.length)+number(s.grinderIn)+(p.stack===1?number(p.stackN):0),raw:number(s.grinderOut)+number(s.grillIn)+number(s.conv1?.length)+(p.stack===2?number(p.stackN):0),food:number(s.grillOut)+number(s.counter)+number(s.conv2?.length)+(p.stack===3?number(p.stackN):0)};
}
function section(title,rows){const node=document.createElement('section');node.className='inventory-section';const heading=document.createElement('h3');heading.textContent=title;node.append(heading);for(const [label,count] of rows){const row=document.createElement('div');row.className='inventory-row';const text=document.createElement('span');text.textContent=label;const value=document.createElement('b');value.textContent=String(number(count));row.append(text,value);node.append(row);}return node;}
function paintInventory(s){
 if(performance.now()-lastInventory<250)return;lastInventory=performance.now();
 const p=s.player,carry=s.districtCarry||{district:s.carryDistrict,kind:s.carryKind,n:s.carryN},stock=baseStocks(s),entry=districtCatalog[carry.district];
 const carried=carry.n>0&&entry?`${carry.n} ${['',entry.raw,entry.mid,entry.finished][carry.kind]}`:`${p.stackN} / ${p.cap} objets dans votre sac`;
 $('inventory-carried').textContent=`${carried} · sac ${number(p.stackN)+number(carry.n)} / ${p.cap}`;
 const sections=[section('Au refuge',[['Viande',stock.meat],['Vivres préparés',stock.raw],['Repas prêts',stock.food],['Pièces',s.money],['Essences de combat',s.essence||0]])];
 for(const d of s.districts||[]){if(!d.unlocked)continue;const info=districtCatalog[d.id];sections.push(section(info.name,[[`${info.raw} · source`,d.rawOut],[`${info.raw} · à transformer`,d.processorIn],[`${info.mid} · prêts`,d.midOut],[`${info.mid} · en finition`,d.finisherIn],[`${info.finished} · prêts`,d.finishedOut],[`${info.finished} · au marché`,d.marketIn]]));}
 $('inventory-stocks').replaceChildren(...sections);
}
export function updateMobileHUD(s){
 live=s;if(!initialized)return;
 const p=s.player,stock=baseStocks(s);
 if(knownCollectors===0&&(s.collectorLevel||0)>0)actions.toast?.('Collecteurs recrutés · ils rapportent la viande');
 knownCollectors=s.collectorLevel||0;
 firstHarvest=firstHarvest||p.stackN>0||(s.kills||0)>0||(s.served||0)>0||(s.meats?.length||0)>0||s.grinderIn>0||s.grinderOut>0||s.grillIn>0||s.grillOut>0||(s.pads||[]).some(p=>p.level>0)||(s.districts||[]).some(d=>d.unlocked);
 document.body.classList.toggle('hud-onboarding',!firstHarvest);
 const active=s.districts?.find(d=>d.id===s.currentDistrict&&d.unlocked),holding=s.districtCarry||{district:s.carryDistrict,kind:s.carryKind,n:s.carryN};
 if(active){const entry=districtCatalog[active.id],held=holding.district===active.id?number(holding.n):0;const raw=number(active.rawOut)+number(active.processorIn)+(holding.kind===1?held:0),finished=number(active.finishedOut)+number(active.marketIn)+(holding.kind===3?held:0);text('hud-raw-count',compact(raw));text('hud-food-count',compact(finished));text('hud-raw-icon',['🐟','🌾','🍎','⛏','🐾','💎','🗿','◆'][active.id]);text('hud-food-icon',['🐟','🍞','🍯','⚒','🧵','⚗','✧','♛'][active.id]);$('hud-raw-count').parentElement.title=`${raw} ${entry.raw.toLowerCase()}`;$('hud-food-count').parentElement.title=`${finished} ${entry.finished.toLowerCase()}`;}
 else {text('hud-raw-count',compact(stock.meat));text('hud-food-count',compact(stock.food));text('hud-raw-icon','🍖');text('hud-food-icon','🍽');$('hud-raw-count').parentElement.title=`${stock.meat} viandes`;$('hud-food-count').parentElement.title=`${stock.food} repas prêts`;}
 text('money-val',compact(s.money));$('money').title=`${number(s.money)} pièces`;
 const q=quest(s);text('campaign-objective',q.label);text('quest-counter',`${number(q.current)}/${number(q.total)}`);
 $('health-bar').style.width=`${Math.max(0,Math.min(1,p.hp))*100}%`;
 const carry=s.districtCarry||{district:s.carryDistrict,kind:s.carryKind,n:s.carryN};
 text('inventory-val',`Sac ${number(p.stackN)+number(carry.n)} / ${p.cap}`);
 const a=s.contextAction;
 $('context-cluster').hidden=!a;
 if(a){const detail=a.enabled===false&&a.condition?`${a.detail||''} · ${a.condition}`:a.detail||'';text('context-label',a.label||'Continuer');text('context-icon',a.icon||'➜');text('context-detail',detail);$('context-detail').title=detail;$('context-action').disabled=a.enabled===false;$('context-progress').style.width=`${Math.max(0,Math.min(1,a.progress||0))*100}%`;}
 if($('inventory-panel').open)paintInventory(s);
}
