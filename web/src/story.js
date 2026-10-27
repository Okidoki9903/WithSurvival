// The story of WithSurvival: Fort-Aube, a refuge raised in the Great Frost.
export const CAST = {
  brann: { name: 'Brann', role: 'vieux trappeur', color: '#e08a3c', initial: 'B' },
  lina: { name: 'Lina', role: 'caissière', color: '#d2475a', initial: 'L' },
  tomas: { name: 'Tomas', role: 'porteur', color: '#3f9b5a', initial: 'T' },
  yuki: { name: 'Yuki', role: 'chasseuse', color: '#7b5bd6', initial: 'Y' },
  oleg: { name: 'Oleg', role: 'bûcheron', color: '#a8692f', initial: 'O' },
  sasha: { name: 'Sasha', role: 'toi', color: '#2f6db0', initial: 'S' },
  voice: { name: '???', role: 'dans la tempête', color: '#6aa9d8', initial: '?' },
};

export const CHAPTERS = [
  null,
  { num: 'Chapitre I', title: 'Le Premier Feu', sub: 'Une palissade, un chaudron, et l’espoir de tenir jusqu’à demain.' },
  { num: 'Chapitre II', title: 'Les Fourrures Blanches', sub: 'Les hordes descendent du nord. Fort-Aube doit apprendre à se défendre.' },
  { num: 'Chapitre III', title: 'Le Froid Mordant', sub: 'Les rescapés affluent. Il faut du bois pour chaque foyer.' },
  { num: 'Chapitre IV', title: 'Grand-Blanc', sub: 'La légende des glaces sort de la forêt.' },
  { num: 'Épilogue', title: 'L’Aube', sub: 'Une lumière dans la tempête, et des milliers de pas qui y répondent.' },
];

// Lines triggered once by game events.
export const BEATS = {
  intro: [
    ['voice', 'Sasha… si tu m’entends, la caravane a été engloutie par la tempête. Tu es seule dans les Terres Blanches.'],
    ['brann', 'Hé, toi ! Brann, vieux trappeur. Je t’achète ta viande d’ours : dix billets le morceau, à mon traîneau.'],
    ['brann', 'Avec 200 billets, tu pourras dresser une palissade dans cette clairière. Va chasser, la nuit tombe vite.'],
  ],
  firstSale: [['brann', 'Marché conclu ! Continue comme ça, il t’en faut 200 pour la palissade.']],
  campReady: [['brann', 'Tu as tes 200 billets. Va sur la dalle au centre de la clairière et bâtis ton camp !']],
  grillUpTile: [['brann', 'Ton chaudron peine à suivre. Cercle-le de cuivre et nourris le feu : il cuira bien plus vite.']],
  grillUp: [['brann', 'Écoute-moi ce feu ! Les steaks vont sortir deux fois plus vite.']],
  counterTile: [['lina', 'Les gens attendent dans le vent. Un auvent, des lanternes, et je servirai bien plus vite.']],
  counter2: [['lina', 'Un vrai comptoir ! La file peut être plus longue, je m’occupe de tout.']],
  marketTile: [['lina', 'Et si on devenait un vrai marché ? Les voyageurs paieraient plus cher.']],
  counter3: [['lina', 'L’Étal de Fort-Aube est ouvert ! Chaque client paie désormais plus.']],
  ballista: [['brann', 'Des balistes cerclées d’acier. Elles tirent plus vite et plus fort. Laisse les ours approcher.']],
  camp: [
    ['brann', 'Voilà Fort-Aube ! Les ours rôdent au nord, derrière la porte. Leur viande gardera les rescapés en vie.'],
    ['brann', 'Je repars sur la piste chercher d’autres rescapés. Garde la radio allumée, je te guide d’ici.'],
  ],
  firstMeat: [['brann', 'Belle prise ! Jette la viande crue près du chaudron, il fera le reste.']],
  firstCooked: [['brann', 'Ça sent bon. Ramasse les steaks et apporte-les au comptoir : des survivants sortent déjà de la forêt.']],
  firstServed: [['brann', 'Ils paient en vieux billets d’avant le Gel. Ramasse-les : ils bâtiront le fort.']],
  cashierTile: [['lina', 'Je m’appelle Lina. Je sais compter et je n’ai plus de maison. Le comptoir, je peux le tenir pour toi.']],
  cashier: [['lina', 'Le comptoir est à moi. Toi, va chasser !']],
  axe2: [['brann', 'Une lame d’acier du vieux monde. Les ours vont la sentir passer.']],
  turret1: [['brann', 'Mes arbalètes de garde ! Elles tirent seules sur tout ce qui approche de la palissade.']],
  porter: [['tomas', 'Tomas, porteur. Je transporte la viande du chaudron au comptoir, et ce que tes arbalètes abattent.']],
  whirl: [['brann', 'La Danse des Lames… les anciens chasseurs en parlaient. Approche-toi d’une horde, et tourne.']],
  expandTile: [['brann', 'Les rescapés dorment dans la neige. Il est temps d’agrandir Fort-Aube.']],
  expand1: [
    ['brann', 'Des cabanes ! Mais le froid mord : les nouveaux veulent du bois pour leurs foyers.'],
    ['brann', 'Coupe les sapins en lisière et porte les bûches à la nouvelle scierie. Les sapins repousseront.'],
  ],
  firstLog: [['brann', 'Du bon bois. Passe-le à la scie, puis porte le bois fendu au comptoir.']],
  sawUpTile: [['oleg', 'Une scie à vapeur, voilà ce qu’il nous faut. Elle avalerait deux fois plus de bûches.']],
  sawUp: [['oleg', 'Écoute-la chanter ! La scierie tourne deux fois plus vite.']],
  hunter: [['yuki', 'Yuki. Je chasse depuis que j’ai six ans. Laisse-moi la horde du nord.']],
  lumberjack: [['oleg', 'Oleg. Une hache, une forêt, et je ne m’arrête jamais.']],
  grill2: [['brann', 'Deux chaudrons ! Fort-Aube devient une vraie cantine.']],
  expand2: [
    ['brann', 'Fort-Aube est devenu une ville… et le bruit attire quelque chose.'],
    ['voice', 'La terre tremble. Les arbres du nord se couchent les uns après les autres.'],
  ],
  boss: [['brann', 'GRAND-BLANC ! Le colosse des glaces ! Utilise les lames, tiens-le loin de la palissade !']],
  bossDown: [
    ['brann', 'Il est tombé… Je n’y croyais pas. Tu es devenue une légende, Sasha.'],
    ['brann', 'Construis le Phare de l’Aube. Sa lumière guidera toutes les caravanes perdues jusqu’ici.'],
  ],
  beacon: [
    ['voice', 'Sasha ? C’est la caravane ! On voit ta lumière ! Nous arrivons… et nous ne sommes pas seuls.'],
    ['brann', 'Fort-Aube n’était pas un camp. C’était le début d’un monde.'],
  ],
  full: [['brann', 'Ton dos est plein ! Va déposer ta charge.']],
};

export class Story {
  constructor(hud, save) {
    this.hud = hud;
    this.done = new Set(save?.beats || []);
  }
  beat(id, delay = 0) {
    if (this.done.has(id) || !BEATS[id]) return false;
    this.done.add(id);
    const lines = BEATS[id];
    setTimeout(() => lines.forEach(([who, text]) => this.hud.say(CAST[who], text)), delay * 1000);
    return true;
  }
  chapter(n) {
    const c = CHAPTERS[n];
    if (c) this.hud.banner(c.num, c.title, c.sub);
  }
  serialize() { return [...this.done]; }
}
