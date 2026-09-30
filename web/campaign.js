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
const $=id=>document.getElementById(id);
function status(message){const node=$('journal-feedback');if(node)node.textContent=message;}
export function initCampaign(actions={}) { handlers=actions; }
export function updateCampaign(s,actions) {
 live=s; if(actions) handlers=actions;
 if(performance.now()-lastPaint<200)return;
 lastPaint=performance.now();
 const c=s.campaign||s.progression||s.world||s;
 const tier=Math.max(0,Math.min(4,c.tier||0));
 const kills=Math.floor(c.kills||0), served=Math.floor(c.served||0);
 const cost=c.nextTownCost||[180,450,900,1600,0][tier];
 const needed=milestones[tier]||40;
 const frontierKills=Math.floor((s.regionKills||[])[Math.min(tier,3)]||0);
 const objective=tier===0&&served===0?'Chassez → atelier → cuisine → comptoir. Nourrissez le premier voyageur.':tier<4?`Sécurisez ${routes[tier].name.toLowerCase()} : ${Math.min(3,frontierKills)} / 3 victoires. Puis fondez ${['le hameau','le village','la cité','la citadelle'][tier]}.`:'Faites prospérer la citadelle et explorez les quatre territoires.';
 $('campaign-title').textContent=`CHAPITRE ${['I','II','III','IV','V'][tier]} · ${['LE DERNIER FEU','LES LANTERNES','LE CŒUR DU VILLAGE','LES QUATRE ROUTES','L’AURORE RETROUVÉE'][tier]}`;
 $('campaign-objective').textContent=objective;
 $('village-name').textContent=tiers[tier];
 $('campaign-count').textContent=tier<4?`${Math.min(kills,needed)} / ${needed} · ${cost} ✦`:`${served} voyageurs nourris`;
 const completion=tier===4?1:(Math.min(kills/needed,1)+Math.min(s.money/cost,1)+Math.min(frontierKills/3,1))/3;
 $('campaign-progress').style.width=`${Math.round(completion*100)}%`;
 $('inventory-val').textContent=`Sac ${s.player.stackN} / ${s.player.cap}`;
 const dash=$('btn-dash');dash.disabled=(c.dashCooldown||0)>0||s.player.dead>0;dash.querySelector('small').textContent=c.dashCooldown>0?`${c.dashCooldown.toFixed(1)} s`:'ESQUIVE';
 $('health-bar').style.width=`${Math.max(0,Math.min(100,s.player.hp * 100))}%`;
 $('journal-story').textContent=`${stories[tier]} ${routes[c.region||0].lore}`;
 $('journal-objective').textContent=`${objective} ${kills} créatures vaincues · ${served} voyageurs nourris · ${Math.floor(c.essence||0)} essences.${tier<4?` Fondation : ${needed} victoires au total, ${cost} pièces et 3 victoires dans ${routes[tier].name.toLowerCase()} (${Math.min(3,frontierKills)} / 3).`:''}`;
 const build=$('build-town');if(build){build.disabled=tier>=4||kills<needed||s.money<cost||frontierKills<3;build.textContent=tier>=4?'Citadelle achevée':`Construire · ${cost} ✦`;}
 const upgrades = [
 ['build-enclosure', c.enclosure || 0, [100,280,650], 'Enclos'],
 ['build-weapon', c.weapon || 0, [90,240,600], 'Arme'],
 ['build-grinder', c.grinderLevel || 0, [80,220,550,1000], 'Atelier'],
 ['build-kitchen', c.kitchenLevel || 0, [100,260,650,1200], 'Cuisine'],
 ['build-helper', c.helperLevel || 0, [200,500,1100], ['Porteur','Caissier','Chasseur','Équipe complète'][c.helperLevel || 0]],
 ];
 for(const [id,level,costs,label] of upgrades){const button=$(id);if(!button)continue;const price=costs[level];const essence=id==='build-weapon'?([0,8,20][level]||0):0;button.disabled=price===undefined||s.money<price||(c.essence||0)<essence;button.textContent=price===undefined?`${label} · MAX`:`${label} ${level+1} · ${price} ✦${essence?` + ${essence} ◇`:''}`;}
 $('machine-details').textContent=`Atelier : vitesse +35 % par niveau. Cuisine : vitesse +30 % par niveau. Enclos : largeur +6 m par niveau. Équipe : ${['aucun assistant','porteur : transfert des stocks','porteur + caissier : collecte des pièces','porteur + caissier + chasseur : ravitaillement'][Math.min(3,c.helperLevel||0)]}. Les armes avancées consomment les essences obtenues au combat.`;
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
const construction=document.createElement('div');construction.className='construction';
for(const [kind,label,id] of [[6,'Développer le refuge','build-town'],[7,'Agrandir l’enclos','build-enclosure'],[8,'Renforcer l’arme','build-weapon'],[9,'Atelier','build-grinder'],[10,'Cuisine','build-kitchen'],[11,'Recruter','build-helper']]){
 const button=document.createElement('button');button.id=id;button.className='build-action';button.textContent=label;
 button.addEventListener('click',()=>{const ok=handlers.upgrade?.(kind);status(ok?'Construction terminée. Le refuge grandit !':'Pièces ou victoires insuffisantes. Poursuivez votre aventure.');lastPaint=-Infinity;if(live)updateCampaign(live,handlers);});construction.append(button);
}
const feedback=document.createElement('p');feedback.id='journal-feedback';feedback.setAttribute('role','status');construction.append(feedback);
const machineDetails=document.createElement('p');machineDetails.id='machine-details';machineDetails.className='machine-details';construction.append(machineDetails);
$('journal-objective').after(construction);
