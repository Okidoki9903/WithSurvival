// District production interface. All stocks, unlocks and purchases come from WASM.
const CATALOG=[
 {
  "name": "La pêche",
  "symbol": "≈",
  "activity": "PÊCHE",
  "source": "Pêcher au quai",
  "raw": "Poissons",
  "mid": "Filets",
  "finished": "Poissons fumés",
  "processor": "Découpeuse",
  "finisher": "Fumoir",
  "story": "Le quai ouvre une nouvelle chaîne de repas."
 },
 {
  "name": "Les cultures",
  "symbol": "♧",
  "activity": "AGRICULTURE",
  "source": "Récolter le blé",
  "raw": "Blé",
  "mid": "Farine",
  "finished": "Pains",
  "processor": "Moulin",
  "finisher": "Four à pain",
  "story": "Les champs alimentent le village."
 },
 {
  "name": "Le verger",
  "symbol": "❧",
  "activity": "FRUITS",
  "source": "Cueillir les fruits",
  "raw": "Fruits",
  "mid": "Jus",
  "finished": "Confitures",
  "processor": "Pressoir",
  "finisher": "Cuiseur",
  "story": "Le verger fournit une autre récolte."
 },
 {
  "name": "La scierie",
  "symbol": "♧",
  "activity": "BOIS",
  "source": "Couper les arbres",
  "raw": "Bûches",
  "mid": "Planches",
  "finished": "Meubles",
  "processor": "Scie mécanique",
  "finisher": "Établi",
  "story": "Coupez, transportez et transformez le bois."
 },
 {
  "name": "Le grand enclos",
  "symbol": "♞",
  "activity": "ANIMAUX",
  "source": "Chasser les grandes bêtes",
  "raw": "Prises",
  "mid": "Découpes",
  "finished": "Repas",
  "processor": "Broyeur",
  "finisher": "Grill",
  "story": "Une nouvelle clôture donne accès à de plus grandes bêtes."
 },
 {
  "name": "La carrière",
  "symbol": "◇",
  "activity": "MINERAIS",
  "source": "Extraire le minerai",
  "raw": "Minerai",
  "mid": "Lingots",
  "finished": "Outils",
  "processor": "Fonderie",
  "finisher": "Forge",
  "story": "Les outils viennent des matériaux récoltés."
 },
 {
  "name": "L’enclos supérieur",
  "symbol": "☷",
  "activity": "GRANDS ANIMAUX",
  "source": "Chasser les géants",
  "raw": "Viande",
  "mid": "Vivres",
  "finished": "Repas",
  "processor": "Broyeur renforcé",
  "finisher": "Cuisine collective",
  "story": "Les animaux plus résistants demandent une meilleure équipe."
 },
 {
  "name": "L’atelier",
  "symbol": "⚒",
  "activity": "ARTISANAT",
  "source": "Récolter le fer",
  "raw": "Fer",
  "mid": "Pièces",
  "finished": "Équipements",
  "processor": "Presse",
  "finisher": "Assemblage",
  "story": "L’atelier transforme les matières en équipements."
 }
];
export const districtCatalog=CATALOG;
let actions={},live=null,lastPaint=-Infinity,initialized=false,knownUnlocked=null;
let nextNodes=null;
const cards=new Map();
const $=id=>document.getElementById(id);
const panel=()=>$('district-panel');
function feedback(message){$('district-feedback').textContent=message;}
function actionButton(label,fn,primary=false){const b=document.createElement('button');b.textContent=label;if(primary)b.className='primary';b.addEventListener('click',fn);return b;}
function guide(d,station,label){
 const carrying=(live.carryDistrict===d.id?live.carryKind:0)||0;
 if(station==='processor')label=carrying===1?`Déposez ${CATALOG[d.id].raw.toLowerCase()} à l’entrée de ${CATALOG[d.id].processor.toLowerCase()}`:`Prenez ${CATALOG[d.id].mid.toLowerCase()} à la sortie de ${CATALOG[d.id].processor.toLowerCase()}`;
 if(station==='finisher')label=carrying===2?`Déposez ${CATALOG[d.id].mid.toLowerCase()} à l’entrée de ${CATALOG[d.id].finisher.toLowerCase()}`:`Prenez ${CATALOG[d.id].finished.toLowerCase()} à la sortie de ${CATALOG[d.id].finisher.toLowerCase()}`;
 const coords={source:[d.sourceX,d.sourceZ],processor:[d.processorX,d.processorZ+(carrying===1?-2.5:2.5)],finisher:[d.finisherX,d.finisherZ+(carrying===2?-2.5:2.5)],market:[d.marketX,d.marketZ-2.5],unlock:[d.tileX,d.tileZ]}[station];
 panel().close();actions.focus?.({x:coords[0],z:coords[1],label,district:d.id,station});
}
function buy(d,kind){const result=actions.upgrade?.(d.id,kind);feedback(result?'Travaux terminés. Votre chaîne de production a évolué.':'Conditions insuffisantes. Consultez les prérequis indiqués.');lastPaint=-Infinity;}
export function initDistrictUI(callbacks={}){
 actions=callbacks;if(initialized)return;initialized=true;
 $('btn-expand').addEventListener('click',()=>{for(const id of ['journal','build-panel'])if($(id)?.open)$(id).close();panel().showModal();lastPaint=-Infinity;if(live)updateDistrictUI(live);});
 $('district-close').addEventListener('click',()=>panel().close());
 const grid=document.createElement('div');grid.className='district-grid';$('district-roadmap').append(grid);
 const title=document.createElement('h3'),text=document.createElement('p'),controls=document.createElement('div');controls.className='district-controls';
 const open=actionButton('',()=>{const d=live?.districts?.find(d=>!d.unlocked);if(d)buy(d,0);},true);
 const focus=actionButton('Voir la dalle d’expansion',()=>{const d=live?.districts?.find(d=>!d.unlocked);if(d)guide(d,'unlock',`Route vers ${CATALOG[d.id].name.toLowerCase()}`);});
 controls.append(open,focus);$('district-next').append(title,text,controls);nextNodes={title,text,controls,open,focus};
}
function missingText(u,d,previous){
 if(!u)return 'Informations de construction en cours de chargement.';
 if(u.level>=u.max)return 'Amélioration achevée.';
 const reason={1:'Installez les deux convoyeurs et nourrissez cinq voyageurs.',2:'Quartier précédent : récolte, transformation et finition au niveau 2, convoyeur au niveau 1.',3:`Vendez ${u.needSales} produits dans le quartier précédent.`,4:'Déverrouillez d’abord ce quartier.'}[u.missingPrereqCode]||'';
 const details=[];if(reason)details.push(reason);
 if(u.kind===0&&previous){if(previous.sales<d.unlockNeedSales)details.push(`${previous.sales}/${d.unlockNeedSales} ventes dans ${CATALOG[previous.id].name.toLowerCase()}.`);if(previous.sourceLevel<2||previous.processorLevel<2||previous.finisherLevel<2||previous.transportLevel<1)details.push(`Niveaux précédents : récolte ${previous.sourceLevel}/2, transformation ${previous.processorLevel}/2, finition ${previous.finisherLevel}/2, convoyeur ${previous.transportLevel}/1.`);}
 if(live.money<u.cost)details.push(`${Math.ceil(u.cost-live.money)} pièces manquantes.`);
 return details.join(' ')||'Prérequis remplis.';
}
function upgradeLabel(kind,entry){return ['Ouvrir ce quartier','Récolte',entry.processor,entry.finisher,'Convoyeurs','Équipe','Entrepôt','Butin direct','Marché'][kind]||'Amélioration';}
function upgradeEffect(u,d){
 const n=Math.min(u.max,u.level+1);
 switch(u.kind){
 case 0:return 'Ajoute un nouveau terrain, une ressource et une chaîne complète : récolte → transformation → finition → vente.';
 case 1:return `Vitesse de récolte ×${(1+.35*u.level).toFixed(2)} → ×${(1+.35*n).toFixed(2)}. Pour les sources de combat : puissance ×${(1+.8*u.level).toFixed(1)} → ×${(1+.8*n).toFixed(1)}.`;
 case 2:return `Vitesse ×${(1+.4*u.level).toFixed(1)} → ×${(1+.4*n).toFixed(1)}. Recette : ${d.rawNeed} ${CATALOG[d.id].raw.toLowerCase()} → ${d.midYield} ${CATALOG[d.id].mid.toLowerCase()}.`;
 case 3:return `Vitesse ×${(1+.4*u.level).toFixed(1)} → ×${(1+.4*n).toFixed(1)}. Recette : ${d.midNeed} ${CATALOG[d.id].mid.toLowerCase()} → ${d.finishedYield} ${CATALOG[d.id].finished.toLowerCase()}.`;
 case 4:return u.level===0?'Transport manuel → convoyeur de la transformation à la finition.':u.level===1?'Ajoute le convoyeur de la finition vers le marché : les produits terminés sont livrés automatiquement.':u.max>=3?'Ajoute le convoyeur de la source vers la première machine : la récolte rejoint automatiquement la production.':'Les deux liaisons transportent les produits entre les machines et le marché.';
 case 5:return ['Aucun ouvrier → collecteur : transporte la ressource jusqu’à la première machine.','Collecteur → récolteur ou chasseur : travaille réellement à la source.','Équipe → porteur supplémentaire : transporte les produits entre la finition et le marché.'][Math.min(2,u.level)];
 case 6:return `Capacité par poste : ${24+24*u.level} → ${24+24*n}. Stockez davantage entre les étapes de production.`;
 case 7:return 'Ramassage et transport manuels → livraison directe des récoltes et butins à l’entrée de la première machine. La ressource reste transformée par les vraies machines.';
 case 8:return `Valeur des ventes : ×${(1+.2*u.level).toFixed(1)} → ×${(1+.2*n).toFixed(1)}. Valeur actuelle : ${d.price} pièces par produit, maîtrise comprise.`;
 default:return '';
 }
}
function createCard(d){
 const entry=CATALOG[d.id],card=document.createElement('article');card.className='district-card';
 const head=document.createElement('div');head.className='district-heading';const symbol=document.createElement('span');symbol.className='symbol';symbol.textContent=entry.symbol;
 const heading=document.createElement('div');const title=document.createElement('h3');title.textContent=entry.name;const state=document.createElement('small');heading.append(title,state);head.append(symbol,heading);
 const flow=document.createElement('div');flow.className='district-flow';flow.textContent=`${entry.raw} → ${entry.mid} → ${entry.finished}`;
 const stocks=document.createElement('div');stocks.className='district-stocks';const stockNodes=[],stockDetails=[];
 for(const label of [entry.raw,entry.mid,entry.finished]){const cell=document.createElement('span');cell.append(document.createTextNode(label));const val=document.createElement('b');const detail=document.createElement('small');cell.append(val,detail);stocks.append(cell);stockNodes.push(val);stockDetails.push(detail);}
 const instructions=document.createElement('p');instructions.className='district-instruction';const mastery=document.createElement('div');mastery.className='district-mastery';
 const controls=document.createElement('div');controls.className='district-controls';
 const source=actionButton(entry.source,()=>guide(live.districts.find(x=>x.id===d.id),'source',entry.source));
 const processor=actionButton(entry.processor,()=>guide(live.districts.find(x=>x.id===d.id),'processor',`Apportez ${entry.raw.toLowerCase()} à ${entry.processor.toLowerCase()}`));
 const finisher=actionButton(entry.finisher,()=>guide(live.districts.find(x=>x.id===d.id),'finisher',`Apportez ${entry.mid.toLowerCase()} à ${entry.finisher.toLowerCase()}`));
 const market=actionButton('Vendre',()=>guide(live.districts.find(x=>x.id===d.id),'market',`Livrez ${entry.finished.toLowerCase()} au marché`));
 controls.append(source,processor,finisher,market);
 const upgrades=document.createElement('div');const machineNodes=new Map();
 card.append(head,flow,stocks,instructions,mastery,controls,upgrades);$('district-roadmap').firstElementChild.append(card);
 const nodes={card,state,stocks,stockNodes,stockDetails,instructions,mastery,controls,source,processor,finisher,market,upgrades,machineNodes};cards.set(d.id,nodes);return nodes;
}
function paintUpgrade(d,u,nodes,previous){
 let row=nodes.machineNodes.get(u.kind);
 if(!row){const box=document.createElement('div');box.className='district-machine';const title=document.createElement('strong');const effect=document.createElement('p');const needs=document.createElement('p');const controls=document.createElement('div');controls.className='district-controls';const purchase=actionButton('',()=>buy(live.districts.find(x=>x.id===d.id),u.kind),true);controls.append(purchase);box.append(title,effect,needs,controls);nodes.upgrades.append(box);row={box,title,effect,needs,purchase};nodes.machineNodes.set(u.kind,row);}
 const max=u.level>=u.max;row.box.hidden=u.kind===0&&d.unlocked||u.kind>0&&!d.unlocked;
 row.title.textContent=`${upgradeLabel(u.kind,CATALOG[d.id])} · ${u.level}/${u.max}`;row.effect.textContent=upgradeEffect(u,d);row.needs.textContent=missingText(u,d,previous);row.purchase.disabled=max||!u.canBuy;row.purchase.textContent=max?'Niveau maximal':`${u.kind===0?'Déverrouiller':'Améliorer'} · ${u.cost} ✦`;
}
export function updateDistrictUI(s){
 live=s;if(!initialized)return;if(performance.now()-lastPaint<250)return;lastPaint=performance.now();
 const districts=s.districts||[],upgrades=s.districtUpgrades||[];
 if(!districts.length){nextNodes.text.textContent='Les routes de production sont en cours de chargement.';nextNodes.controls.hidden=true;return;}
 const count=districts.filter(d=>d.unlocked).length;
 if(knownUnlocked!==null&&count>knownUnlocked)actions.toast?.('Un nouveau quartier est ouvert · une nouvelle activité vous attend');knownUnlocked=count;
 $('district-resources').textContent=`${Math.floor(s.money)} pièces ✦ · ${count}/${districts.length} quartiers ouverts · maîtrise ${s.prestige||0}`;
 const next=districts.find(d=>!d.unlocked);
 if(next){const previous=districts.find(d=>d.id===next.id-1),u=upgrades.find(u=>u.district===next.id&&u.kind===0);nextNodes.title.textContent=`PROCHAINE ROUTE · ${CATALOG[next.id].name}`;nextNodes.text.textContent=`${CATALOG[next.id].story} ${missingText(u,next,previous)}`;nextNodes.open.textContent=`Ouvrir · ${u?.cost??next.unlockCost} ✦`;nextNodes.open.disabled=!u?.canBuy;nextNodes.controls.hidden=false;}
 else {const prestige=s.prestige||0,target=100+80*Math.min(prestige,1000),ready=districts.filter(d=>d.mastered&&d.sales>=target).length;nextNodes.title.textContent=`PROCHAIN PALIER · MAÎTRISE ${prestige+1}`;nextNodes.text.textContent=`Chaque quartier doit atteindre ${target} ventes et maîtriser récolte, transformation et finition au niveau 2, convoyeur au niveau 1. ${ready}/8 quartiers remplissent ces conditions. Le palier se valide automatiquement et conserve vos stocks.${prestige<20?' Il ajoute 10 % du prix de base à toutes les ventes.':''}${prestige<12?' Les bêtes suivantes deviennent aussi plus résistantes.':' Les expéditions affrontent les créatures renforcées.'}`;nextNodes.controls.hidden=true;}
 for(const d of districts){const nodes=cards.get(d.id)||createCard(d);const entry=CATALOG[d.id],previous=districts.find(x=>x.id===d.id-1);
 nodes.card.classList.toggle('locked',!d.unlocked);nodes.state.textContent=d.unlocked?`${entry.activity} · ${d.mastered?'MAÎTRISÉ':'EN ACTIVITÉ'}`:`QUARTIER ${d.id+1} · ROUTE À OUVRIR`;
 nodes.stocks.hidden=!d.unlocked;nodes.controls.hidden=!d.unlocked;nodes.mastery.hidden=!d.unlocked;
 nodes.stockNodes[0].textContent=Math.floor((d.rawOut||0)+(d.processorIn||0));nodes.stockNodes[0].title=`À la source : ${d.rawOut} · en transformation : ${d.processorIn}`;
 nodes.stockNodes[1].textContent=Math.floor((d.midOut||0)+(d.finisherIn||0));nodes.stockNodes[1].title=`Sortie de transformation : ${d.midOut} · en finition : ${d.finisherIn}`;
 nodes.stockNodes[2].textContent=Math.floor((d.finishedOut||0)+(d.marketIn||0));nodes.stockNodes[2].title=`Prêts à emporter : ${d.finishedOut} · au marché : ${d.marketIn}`;
 nodes.stockDetails[0].textContent=`Source ${d.rawOut} · entrée ${d.processorIn}`;nodes.stockDetails[1].textContent=`Sortie ${d.midOut} · entrée ${d.finisherIn}`;nodes.stockDetails[2].textContent=`Prêts ${d.finishedOut} · marché ${d.marketIn}`;
 const held=s.carryDistrict===d.id?s.carryKind:0;
 nodes.processor.textContent=held===1?'Déposer la récolte':`Prendre ${entry.mid.toLowerCase()}`;
 nodes.finisher.textContent=held===2?'Déposer pour finir':`Prendre ${entry.finished.toLowerCase()}`;
 nodes.mastery.textContent=`${d.sales} produits vendus · capacité ${d.cap} par poste · ${d.price} ✦ par vente`;
 nodes.instructions.textContent=d.unlocked?`${d.id===4||d.id===6?'Combattez les créatures du quartier, esquivez leurs attaques annoncées et ramassez leur butin.':`${entry.source} en restant près de la source.`} Recettes : ${d.rawNeed} ${entry.raw.toLowerCase()} → ${d.midYield} ${entry.mid.toLowerCase()} ; ${d.midNeed} ${entry.mid.toLowerCase()} → ${d.finishedYield} ${entry.finished.toLowerCase()}. Portez les ressources aux entrées puis récupérez les produits aux sorties. Les boutons indiquent les trajets.`:entry.story;
 for(const u of upgrades.filter(x=>x.district===d.id))paintUpgrade(d,u,nodes,previous);
 }
 const carry=s.districtCarry||{district:s.carryDistrict,kind:s.carryKind,n:s.carryN};
 if(carry.n>0&&CATALOG[carry.district])$('inventory-val').textContent=`${carry.n} ${[null,CATALOG[carry.district].raw,CATALOG[carry.district].mid,CATALOG[carry.district].finished][carry.kind]||'ressources'}`;
}
