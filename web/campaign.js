// Story and interface are derived exclusively from the live simulation state.
const tiers = ['Refuge de l’Aurore', 'Hameau des lanternes', 'Village de l’Aurore', 'Cité des quatre routes', 'Citadelle de l’Aurore'];
const routes = [
 {name:'La forêt de givre',icon:'❄',species:'Ours polaires · le premier ravitaillement',lore:'Les anciens bûcherons y balisaient la route du refuge. Sécurisez la forêt pour que les premiers voyageurs puissent rentrer.',tier:0},
 {name:'Le canyon des braises',icon:'♨',species:'Loups des braises · une meute rapide',lore:'La route des caravanes traverse les roches chaudes du canyon. Les meutes ont repris le passage pendant la tempête.',tier:1},
 {name:'Les marais de cristal',icon:'◇',species:'Colosses de cristal · une résistance redoutable',lore:'Les colosses veillent entre les cristaux. Rouvrez ce passage oublié pour relier le village aux terres orientales.',tier:2},
 {name:'La faille de l’éclipse',icon:'☾',species:'Créatures de la faille · le dernier territoire',lore:'Au bout de la dernière route, une fracture assombrit le Nord. Affrontez ses créatures pour achever la citadelle.',tier:3},
];
const stories = [
 'Nora : « Les voyageurs arrivent épuisés. Rallume la cuisine et ramène de quoi les nourrir. Trois créatures vaincues et 180 pièces permettront de fonder notre hameau. »',
 'Nora : « Nos lanternes se voient enfin depuis le canyon. Les meutes gardent ce passage : avance avec prudence et agrandis le refuge. »',
 'Nora : « Un village ne vit pas seulement de courage. Automatise la cuisine, agrandis l’enclos et ouvre la route des cristaux. »',
 'Nora : « Les quatre routes rejoignent maintenant notre cité. Au-delà des marais, l’éclipse laisse une dernière blessure dans le Nord. »',
 'Nora : « La citadelle tient. Les terres de l’Aurore ont retrouvé leurs routes. Fais prospérer ce que nous avons construit et défends chaque territoire. »',
];
const milestones=[3,10,22,40];
let lastPaint=-Infinity, lastRouteKey='', live=null, handlers={};
let knownContracts=null, knownTier=null;
const $=id=>document.getElementById(id);
function status(message){const node=$('journal-feedback');if(node)node.textContent=message;}
export function initCampaign(actions={}) { handlers=actions; }
export function updateCampaign(s,actions) {
 live=s; if(actions) handlers=actions;
 if(performance.now()-lastPaint<200)return;
 lastPaint=performance.now();
 const c=s.campaign||s.progression||s.world||s;
 const tier=Math.max(0,Math.min(4,c.tier||0));
 if(knownTier!==null&&tier>knownTier)handlers.toast?.(`${tiers[tier]} fondé · une nouvelle route vous attend`);
 if(knownContracts!==null&&(s.contractsDone||0)>knownContracts)handlers.toast?.('Contrat accompli · la caravane reprend la route');
 knownTier=tier;knownContracts=s.contractsDone||0;
 const kills=Math.floor(c.kills||0), served=Math.floor(c.served||0);
 const cost=c.nextTownCost||[180,450,900,1600,0][tier];
 const needed=milestones[tier]||40;
 const frontierKills=Math.floor((s.regionKills||[])[Math.min(tier,3)]||0);
 const objective=nextObjective(s,c,tier,served,frontierKills);
 $('campaign-title').textContent=`CHAPITRE ${['I','II','III','IV','V'][tier]} · ${['LE DERNIER FEU','LES LANTERNES','LE CŒUR DU VILLAGE','LES QUATRE ROUTES','L’AURORE RETROUVÉE'][tier]}`;
 $('campaign-objective').textContent=objective;
 $('village-name').textContent=tiers[tier];
 $('campaign-count').textContent=tier<4?`${Math.min(kills,needed)} / ${needed} · ${cost} ✦`:`${served} voyageurs nourris`;
 const completion=tier===4?1:(Math.min(kills/needed,1)+Math.min(s.money/cost,1)+Math.min(frontierKills/3,1))/3;
 $('campaign-progress').style.width=`${Math.round(completion*100)}%`;
 const contract=$('contract-line');contract.hidden=!s.tradeLevel;
 if(s.tradeLevel)contract.textContent=`CARAVANE · ${contractDescription(s)} · ${Math.floor(s.contractProgress||0)}/${s.contractTarget||0} · ${s.contractReward||0} ✦ · menace ${s.threatLevel||0}`;
 $('inventory-val').textContent=`Sac ${s.player.stackN} / ${s.player.cap}`;
 const dash=$('btn-dash');dash.disabled=(c.dashCooldown||0)>0||s.player.dead>0;dash.querySelector('small').textContent=c.dashCooldown>0?`${c.dashCooldown.toFixed(1)} s`:'ESQUIVE';
 $('health-bar').style.width=`${Math.max(0,Math.min(100,s.player.hp * 100))}%`;
 $('journal-story').textContent=`${stories[tier]} ${routes[c.region||0].lore}`;
 $('journal-objective').textContent=`${objective} ${kills} créatures vaincues · ${served} voyageurs nourris · ${Math.floor(c.essence||0)} essences.${tier<4?` Fondation : ${needed} victoires au total, ${cost} pièces et 3 victoires dans ${routes[tier].name.toLowerCase()} (${Math.min(3,frontierKills)} / 3).`:''}`;
 updateBuild(s,c,tier);
 updateRoadmap(s);
 const key=`${tier}/${c.region||0}`;
 if(key!==lastRouteKey){
 lastRouteKey=key;
 $('route-list').replaceChildren(...routes.map((r,i)=>{
 const row=document.createElement('div');row.className=`route ${tier<r.tier?'locked':''}`;
 const icon=document.createElement('span');icon.className='route-icon';icon.textContent=r.icon;
 const content=document.createElement('div');const name=document.createElement('strong');name.textContent=r.name;const detail=document.createElement('small');detail.textContent=tier<r.tier?`À ouvrir : ${tiers[r.tier]}`:r.species;content.append(name,detail);
 const button=document.createElement('button');button.className='route-action';button.textContent=(c.region||0)===i?'Ici':tier<r.tier?'Verrouillé':'Voyager';button.disabled=tier<r.tier||(c.region||0)===i;
 button.addEventListener('click',()=>{const ok=handlers.travel?.(i);status(ok?'Route ouverte. Fermez le journal pour explorer.':'Revenez au refuge et terminez les préparatifs.');lastRouteKey='';});row.append(icon,content,button);return row;
 }));
 }
}
const journal=$('journal');
$('btn-journal').addEventListener('click',()=>journal.showModal());
$('journal-close').addEventListener('click',()=>journal.close());
$('btn-dash').addEventListener('click',()=>handlers.dash?.());
journal.addEventListener('click',e=>{if(e.target===journal){const r=journal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)journal.close();}});

const buildPanel=$('build-panel');
$('btn-build').addEventListener('click',()=>{if(journal.open)journal.close();buildPanel.showModal();buildPanel.scrollTop=0;});
$('build-close').addEventListener('click',()=>buildPanel.close());
const buildLink=document.createElement('button');buildLink.className='upgrade-buy';buildLink.textContent='⚒ Ouvrir les plans de construction';buildLink.addEventListener('click',()=>{journal.close();buildPanel.showModal();buildPanel.scrollTop=0;});$('journal-objective').after(buildLink);
const buildingNames={0:'Convoyeur de l’atelier',1:'Convoyeur du comptoir',2:'Formation du héros',3:'Sac de voyage',4:'Bottes d’exploration',5:'Grill turbo',6:'Fondation de la colonie',7:'Agrandissement de l’enclos',8:'Forge des armes',9:'Atelier de découpe',10:'Cuisine collective',11:'Équipe de service',12:'Cabane des collecteurs',13:'Guilde des chasseurs',14:'Ferme du refuge',15:'Comptoir des caravanes',16:'Entrepôt'};
const buildingIcons={6:'⌂',7:'▣',8:'⚔',9:'⚙',10:'♨',11:'♟',12:'♜',13:'➶',14:'♧',15:'⚑',16:'▤'};
const cardNodes=new Map();
const buildingOrder=[7,6,16,12,13,14,15,9,10,11,8,0,1,2,3,4,5];
function effect(kind,level,s){
 const n=level+1;
 switch(kind){
 case 0:return level===0?'Transport manuel → convoyeur automatique entre atelier et cuisine.':'Accélère le convoyeur de l’atelier de 0,25 unité par seconde.';
 case 1:return level===0?'Transport manuel → convoyeur automatique entre cuisine et comptoir.':'Accélère le convoyeur du comptoir de 0,25 unité par seconde.';
 case 2:return 'Formation héroïque : vitalité de base 100 → 180, sac +10 et mobilité améliorée.';
 case 3:return `Sac : ${14+10*level+(s.player.hero?10:0)} → ${14+10*n+(s.player.hero?10:0)} objets.`;
 case 4:return `Vitesse de marche : ${(5.2+level+(s.player.hero ? 0.4 : 0)).toFixed(1)} → ${(5.2+n+(s.player.hero ? 0.4 : 0)).toFixed(1)} m/s.`;
 case 5:return 'Cycle de base du grill : 0,45 s → 0,22 s. Se combine avec les niveaux de cuisine.';
 case 6:return `${tiers[Math.min(4,level)]} → ${tiers[Math.min(4,n)]}. Nouveaux quartiers et ouverture du prochain territoire.`;
 case 7:return `Largeur de la colonie : ${18+6*level} m → ${18+6*n} m. La profondeur gagne aussi 4 m. Les clôtures reculent et les quartiers du sud deviennent accessibles.`;
 case 8:return 'Renforce les dégâts des attaques. Les niveaux avancés utilisent les essences gagnées au combat.';
 case 9:return `Vitesse de découpe : ×${(1+.35*level).toFixed(2)} → ×${(1+.35*n).toFixed(2)}. Chaque viande est transformée plus rapidement.`;
 case 10:return `Vitesse de cuisson : ×${(1+.3*level).toFixed(1)} → ×${(1+.3*n).toFixed(1)}. Les voyageurs attendent moins longtemps.`;
 case 11:return ['Aucun service → porteur. Transfert des stocks entre les postes.','Porteur → porteur + caissier. Collecte automatique des pièces.','Service → équipe complète. Un ravitailleur complète la chaîne.'][Math.min(2,level)];
 case 12:return `${level} → ${n} collecteurs. Ils se déplacent jusqu’aux carcasses, récupèrent la viande au sol et la rapportent à l’atelier.`;
 case 13:return `${level} → ${n} chasseurs de guilde. Ils quittent le refuge, poursuivent les créatures et combattent. Leur chasse alimente les collecteurs.`;
 case 14:return `${level?`${2*level} vivres toutes les ${(8/level).toFixed(1)} s`:'Aucune récolte'} → ${2*n} vivres toutes les ${(8/n).toFixed(1)} s. Un fermier livre la récolte à l’atelier.`;
 case 15:return `Contrats : récompense de base ${120+80*level} → ${120+80*n} pièces. Alterne repas, chasse régionale, collecte réelle, récolte et primes de champions.`;
 case 16:return `Stockage par poste : ${30+40*level} → ${30+40*n}. Réduit les blocages lorsque les machines et travailleurs produisent ensemble.`;
 default:return 'Amélioration permanente de l’équipement ou de la chaîne de production.';
 }
}
function dependencyText(kind,tier){
 if(kind!==6)return 'Construction préalable requise.';
 return ['','', 'Enclos niveau 1 + entrepôt niveau 1.', 'Enclos niveau 2 + guilde niveau 1 + ferme niveau 1.', 'Enclos niveau 3 + comptoir niveau 1 + entrepôt niveau 2.'][Math.min(4,tier+1)];
}
function updateBuild(s,c,tier){
 $('build-summary').textContent=`${tiers[tier]} · Enclos niveau ${c.enclosure||0}. Commencez par agrandir le terrain, puis choisissez les métiers de votre colonie.`;
 $('build-resources').textContent=`${Math.floor(s.money)} pièces ✦   ·   ${Math.floor(c.essence||0)} essences ◇   ·   Stockage ${Math.floor(s.storageCap||0)}`;
 const records=s.upgrades||[];
 for(const kind of buildingOrder){
 const u=records.find(r=>r.kind===kind);if(!u)continue;
 let nodes=cardNodes.get(kind);
 if(!nodes){
 const card=document.createElement('article');card.className=`upgrade-card ${kind===7||kind===6?'featured':''}`;
 const title=document.createElement('h3');const icon=document.createElement('span');icon.textContent=buildingIcons[kind]||'✦';title.append(icon,document.createTextNode(buildingNames[kind]||`Construction ${kind}`));
 const level=document.createElement('div');level.className='upgrade-level';
 const description=document.createElement('p');description.className='upgrade-effect';
 const requirements=document.createElement('p');requirements.className='upgrade-needs';
 const button=document.createElement('button');button.className='upgrade-buy';button.id=kind===7?'build-enclosure':kind===6?'build-town':`upgrade-${kind}`;
 button.addEventListener('click',()=>{const ok=handlers.upgrade?.(kind);$('build-feedback').textContent=ok?`${buildingNames[kind]} : travaux terminés.`:'Conditions insuffisantes. Vérifiez les prérequis de cette construction.';lastPaint=-Infinity;handlers.save?.();});
 card.append(title,level,description,requirements,button);$('build-grid').append(card);nodes={card,level,description,requirements,button};cardNodes.set(kind,nodes);
 }
 const max=u.level>=u.max;nodes.level.textContent=`NIVEAU ${u.level} / ${u.max}`;nodes.description.textContent=(max?'Dernier effet acquis : ':'')+effect(kind,max?Math.max(0,u.level-1):u.level,s);
 const needs=[];
 if(tier<u.requiredTier)needs.push(`Débloquer : ${tiers[u.requiredTier]||'colonie supérieure'}.`);
 if((c.enclosure||0)<u.requiredEnclosure)needs.push(`Enclos niveau ${u.requiredEnclosure} requis.`);
 if(u.missingDependency)needs.push(dependencyText(kind,tier));
 if(kind===6&&tier<4){const mastery=(s.regionKills||[])[tier]||0;if(mastery<3)needs.push(`${routes[tier].name} : ${mastery}/3 victoires.`);if((c.kills||0)<milestones[tier])needs.push(`${c.kills||0}/${milestones[tier]} victoires au total.`);}
 if(!max&&s.money<u.cost)needs.push(`${Math.ceil(u.cost-s.money)} pièces manquantes.`);
 if(!max&&(c.essence||0)<u.essenceCost)needs.push(`${u.essenceCost-(c.essence||0)} essences manquantes.`);
 nodes.requirements.textContent=max?'Construction au niveau maximal.':needs.join(' ')||'Prérequis remplis. Construction disponible.';nodes.requirements.classList.toggle('ready',Boolean(u.canBuy));
 nodes.button.disabled=max||!u.canBuy;nodes.button.textContent=max?'Achevé':`${u.level===0?'Construire':'Améliorer'} · ${u.cost} ✦${u.essenceCost?` + ${u.essenceCost} ◇`:''}`;
 }
}
function nextObjective(s,c,tier,served,mastery){
 if(served===0)return 'Chassez → atelier → cuisine → comptoir. Nourrissez le premier voyageur.';
 const collector=s.upgrades?.find(u=>u.kind===12);
 if(!s.collectorLevel&&tier>=(collector?.requiredTier||0))return 'BÂTIR → cabane des collecteurs. Automatisez le ramassage de viande au sol.';
 if(tier>=1&&!c.enclosure)return 'BÂTIR → enclos niveau 1. Ouvrez du terrain pour les nouveaux bâtiments.';
 if(tier>=1&&!s.guildLevel)return 'BÂTIR → guilde. Vos chasseurs combattent pendant que les collecteurs rapportent le butin.';
 if(tier>=1&&!s.warehouseLevel)return 'BÂTIR → entrepôt. Stockez la production pour développer le village.';
 if(tier>=2&&(c.enclosure||0)<2)return 'Agrandissez l’enclos au niveau 2 pour installer la ferme.';
 if(tier>=2&&!s.farmLevel)return 'BÂTIR → ferme. Ajoutez une seconde source de nourriture au village.';
 if(tier>=3&&(c.enclosure||0)<3)return 'Enclos niveau 3 : préparez le quartier des caravanes.';
 if(tier>=3&&!s.tradeLevel)return 'BÂTIR → comptoir des caravanes. Débloquez les contrats variés.';
 if(tier>=3&&(s.warehouseLevel||0)<2)return 'Entrepôt niveau 2 : préparez les réserves de la citadelle.';
 if(tier<4&&mastery<3)return `Explorez ${routes[tier].name.toLowerCase()} : ${mastery}/3 victoires. Esquivez les attaques annoncées.`;
 if(tier<4)return `BÂTIR → ${['hameau','village','cité','citadelle'][tier]}. Consultez les ressources et bâtiments requis.`;
 if(s.tradeLevel)return `Contrat : ${contractDescription(s)}. Développez l’équipe et répondez à la menace croissante.`;
 return 'Explorez les quatre territoires et développez les métiers de la colonie.';
}
function contractDescription(s){
 const region=routes[Math.max(0,Math.min(3,s.contractRegion||0))].name;
 return ['servir des repas',`chasser dans ${region.toLowerCase()}`,'collecter réellement la viande au sol','récolter la ferme',`vaincre un champion dans ${region.toLowerCase()}`][s.contractKind||0]||'ravitailler la caravane';
}
const roadmap=document.createElement('div');roadmap.className='roadmap';roadmap.id='campaign-roadmap';
const roadmapTitle=document.createElement('h3');roadmapTitle.textContent='La route de votre colonie';$('journal-objective').after(roadmapTitle,roadmap);
function updateRoadmap(s){
 const steps=[
 ['Rallumer le refuge','Chasse, transformation, cuisson et premier voyageur.',(s.served||0)>0],
 ['Organiser le ramassage','Les collecteurs vont jusqu’aux carcasses et ramènent la viande.',(s.collectorLevel||0)>0],
 ['Installer les métiers','Enclos, guilde des chasseurs et entrepôt.',(s.guildLevel||0)>0&&(s.warehouseLevel||0)>0],
 ['Diversifier les vivres','Une ferme complète la chasse ; les machines suivent la production.',(s.farmLevel||0)>0],
 ['Relier les caravanes','Contrats de repas, chasse régionale, collecte, récolte et primes de champions.',(s.tradeLevel||0)>0],
 ['Défendre les quatre routes','Une citadelle, des contrats renouvelés et une menace qui monte.',(s.tier||0)>=4],
 ];
 const first=steps.findIndex(x=>!x[2]);
 roadmap.replaceChildren(...steps.map(([title,detail,done],i)=>{const row=document.createElement('div');row.className=`roadmap-step ${done?'done':i===first?'current':''}`;const heading=document.createElement('strong');heading.textContent=`${done?'✓':i===first?'→':'○'} ${title}`;const description=document.createElement('small');description.textContent=detail;row.append(heading,description);return row;}));
}
