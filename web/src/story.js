// The story of WithSurvival: Fort-Aube, a refuge raised in the Great Frost.
//
// Thirty-one years ago the world was burning. Project Dawn (the rising sun on
// every old banknote) raised the Veil Towers to spray dust into the sky and
// cool it. Something locked them on: the Great Frost. Véra Solenne, the
// engineer who built them, stayed at Station Aube to stop them and sent her
// two daughters away with the station's guard, Brann. The girls grew up in
// the caravans and forgot. Brann never went back. This is how they learn it.
export const CAST = {
  brann: { name: 'Brann', role: 'vieux trappeur', color: '#e08a3c', initial: 'B' },
  lina: { name: 'Lina', role: 'caissière', color: '#d2475a', initial: 'L' },
  tomas: { name: 'Tomas', role: 'porteur', color: '#3f9b5a', initial: 'T' },
  yuki: { name: 'Yuki', role: 'chasseuse', color: '#7b5bd6', initial: 'Y' },
  oleg: { name: 'Oleg', role: 'bûcheron', color: '#a8692f', initial: 'O' },
  sasha: { name: 'Sasha', role: 'toi', color: '#2f6db0', initial: 'S' },
  voice: { name: '???', role: 'dans la tempête', color: '#6aa9d8', initial: '?' },
  mira: { name: 'Mira', role: 'ta sœur · caravanière', color: '#4fa3d9', initial: 'M' },
  piotr: { name: 'Piotr', role: 'convoyeur · mécanicien', color: '#d08a2a', initial: 'P' },
  anouk: { name: 'Anouk', role: 'pêcheuse du lac', color: '#2f8f8a', initial: 'A' },
  ivan: { name: 'Ivan', role: 'apprenti porteur', color: '#7d8f3a', initial: 'I' },
  gustav: { name: 'Gustav', role: 'mineur', color: '#8a7a6a', initial: 'G' },
  vera: { name: 'Véra Solenne', role: 'enregistrement · Station Aube', color: '#9fd8ff', initial: 'V' },
};

export const CHAPTERS = [
  null,
  { num: 'Chapitre I', title: 'Le Premier Feu', sub: 'Une palissade, un chaudron, et l’espoir de tenir jusqu’à demain.' },
  { num: 'Chapitre II', title: 'Les Fourrures Blanches', sub: 'Les hordes descendent du nord. Fort-Aube doit apprendre à se défendre.' },
  { num: 'Chapitre III', title: 'Le Froid Mordant', sub: 'Les rescapés affluent. Il faut du bois pour chaque foyer.' },
  { num: 'Chapitre IV', title: 'Grand-Blanc', sub: 'La légende des glaces sort de la forêt.' },
  { num: 'Chapitre V', title: 'La Caravane de l’Aube', sub: 'La lumière a guidé les perdus jusqu’à toi. Maintenant, il faut tous les nourrir.' },
  { num: 'Chapitre VI', title: 'Le Lac Gelé', sub: 'Sous la glace, de quoi nourrir une ville. Et une ville entière, endormie.' },
  { num: 'Chapitre VII', title: 'Le Grand Blizzard', sub: 'Le ciel se ferme. Seul un feu immense peut tenir l’hiver à distance.' },
  { num: 'Fin de l’acte II', title: 'Le Dégel', sub: 'Pour la première fois depuis le Grand Gel, le soleil réchauffe Fort-Aube. Pour combien de temps ?' },
  { num: 'Chapitre VIII', title: 'Ce que la glace garde', sub: 'Une voix enregistrée il y a trente ans. Une vérité que Brann a portée seul.' },
  { num: 'Chapitre IX', title: 'La Falaise de Fer', sub: 'Pour aller au nord, il faut de l’acier. Pour l’acier, il faut creuser.' },
  { num: 'Chapitre X', title: 'Le Brise-Glace', sub: 'Tout Fort-Aube construit le navire qui traversera le glacier.' },
  { num: 'Chapitre XI', title: 'Le Cœur de l’Hiver', sub: 'Au bout du monde blanc, la machine qui a éteint le ciel bat toujours.' },
  { num: 'Épilogue', title: 'Le Ciel Rendu', sub: 'Le Voile tombe. Le printemps reviendra partout. Brann est resté au cœur de l’hiver.' },
  { num: 'Épilogue', title: 'La Ville-Lumière', sub: 'Le Cœur bat pour Fort-Aube. Le seul endroit chaud d’un monde de glace.' },
];

// Lines triggered once by game events.
export const BEATS = {
  intro: [
    ['voice', 'Sasha… si tu m’entends… la corde a lâché. La tempête nous a séparées. Tiens bon, je t’en supplie…'],
    ['brann', 'Hé, toi ! Ne reste pas dans le vent. Brann, trappeur. Je t’achète ta viande d’ours, dix billets le morceau. Le bois aussi, si tu en coupes.'],
    ['brann', 'Avec 200 billets, tu pourras dresser une palissade dans cette clairière. Va, la nuit tombe vite ici.'],
  ],
  firstSale: [['brann', 'Marché conclu ! Continue comme ça, il t’en faut 200 pour la palissade.']],
  firstLogSale: [['brann', 'Du sapin. Ça brûle vite, mais ça chauffe. Je te le prends.']],
  campReady: [['brann', 'Tu as tes 200 billets. Va sur la dalle au centre de la clairière et bâtis ton camp !']],
  camp: [
    ['brann', 'Voilà Fort-Aube ! Les ours rôdent au nord, derrière la porte. Leur viande gardera les rescapés en vie.'],
    ['brann', 'Sasha, tu dis ? …Non, rien. Tu ressembles à quelqu’un que j’ai connu, il y a longtemps.'],
    ['brann', 'Je repars sur la piste chercher d’autres rescapés. Garde la radio allumée, je te guide d’ici.'],
  ],
  fuelHint: [['brann', 'Du bois ! Jette-le sur la dalle du foyer, près du chaudron : tant que le feu est nourri, la viande cuit bien plus vite.']],
  firstFuel: [['brann', 'Entends-moi ce feu ronfler. Un chaudron nourri, c’est un fort qui mange.']],
  grillUpTile: [['brann', 'Ton chaudron peine à suivre. Cercle-le de cuivre et nourris le feu : il cuira bien plus vite.']],
  grillUp: [['brann', 'Écoute-moi ce feu ! Les steaks vont sortir deux fois plus vite.']],
  counterTile: [['lina', 'Les gens attendent dans le vent. Un auvent, des lanternes, et je servirai bien plus vite.']],
  counter2: [['lina', 'Un vrai comptoir ! La file peut être plus longue, je m’occupe de tout.']],
  marketTile: [['lina', 'Et si on devenait un vrai marché ? Les voyageurs paieraient plus cher.']],
  counter3: [
    ['lina', 'L’Étal de Fort-Aube est ouvert ! Chaque client paie désormais plus.'],
    ['lina', 'Tu sais, ces billets ne valent rien. Du papier du vieux monde, avec un soleil levant dessus. Ils valent quelque chose parce qu’on y croit tous ensemble.'],
    ['lina', 'C’est ça, une ville, Sasha. Des gens qui décident de croire à la même chose.'],
  ],
  ballista: [['brann', 'Des balistes cerclées d’acier. Elles tirent plus vite et plus fort. Laisse les ours approcher.']],
  firstMeat: [['brann', 'Belle prise ! Jette la viande crue près du chaudron, il fera le reste.']],
  firstCooked: [['brann', 'Ça sent bon. Ramasse les steaks et apporte-les au comptoir : des survivants sortent déjà de la forêt.']],
  firstServed: [['brann', 'Ils paient en vieux billets d’avant le Gel. Ramasse-les : ici, ils valent encore quelque chose.']],
  firstLog: [['brann', 'Du bon bois. Passe-le à la scie, ou nourris le feu du chaudron avec.']],
  cashierTile: [['lina', 'Je m’appelle Lina. Avant, je tenais une épicerie. Je sais compter, et je n’ai plus de maison. Le comptoir, je peux le tenir pour toi.']],
  cashier: [['lina', 'Le comptoir est à moi. Toi, va chasser !']],
  axe2: [['brann', 'Une lame d’acier du vieux monde. Les ours vont la sentir passer.']],
  turret1: [['brann', 'Mes arbalètes de garde ! Elles tirent seules sur tout ce qui approche de la palissade.']],
  porter: [['tomas', 'Tomas, porteur. Je porte. C’est ce que je sais faire.']],
  whirl: [['brann', 'La Danse des Lames… les anciens chasseurs en parlaient. Approche-toi d’une horde, et tourne.']],
  expandTile: [['brann', 'Les rescapés dorment dans la neige. Il est temps d’agrandir Fort-Aube.']],
  expand1: [
    ['brann', 'Des cabanes ! Mais le froid mord : les nouveaux veulent du bois pour leurs foyers.'],
    ['brann', 'Coupe les sapins en lisière et porte les bûches à la nouvelle scierie. Les sapins repousseront.'],
  ],
  sawUpTile: [['oleg', 'Une scie à vapeur, voilà ce qu’il nous faut. Elle avalerait deux fois plus de bûches.']],
  sawUp: [['oleg', 'Écoute-la chanter ! La scierie tourne deux fois plus vite.']],
  hunter: [['yuki', 'Yuki. Je chasse depuis que j’ai six ans. Je remercie chaque bête que je prends. Laisse-moi la horde du nord.']],
  lumberjack: [
    ['oleg', 'Oleg. Une hache, une forêt, et je ne m’arrête jamais.'],
    ['oleg', 'Pour chaque arbre que j’abats, j’enfonce une graine sous la neige. Parce que l’hiver finira. Un jour.'],
  ],
  grill2: [['brann', 'Deux chaudrons ! Fort-Aube devient une vraie cantine.']],
  expand2: [
    ['brann', 'Fort-Aube est devenu une ville… et le bruit attire quelque chose.'],
    ['voice', 'La terre tremble. Les arbres du nord se couchent les uns après les autres.'],
  ],
  boss: [['brann', 'GRAND-BLANC ! Le colosse des glaces ! Utilise les lames, tiens-le loin de la palissade !']],
  bossDown: [
    ['brann', 'Il est tombé… Je n’y croyais pas. Tu es devenue une légende, Sasha.'],
    ['yuki', 'Attendez. Là, derrière les rochers… un ourson. Elle ne venait pas détruire le fort. Elle cherchait de quoi nourrir son petit.'],
    ['yuki', 'Il n’a plus personne. Il te suit, Sasha. Je crois qu’il a décidé que c’était toi, maintenant.'],
    ['brann', 'Construis le Phare de l’Aube, au milieu du pré. Sa lumière guidera toutes les caravanes perdues jusqu’ici.'],
  ],
  beacon: [
    ['voice', 'Sasha ? C’est la caravane ! On voit ta lumière ! Nous arrivons… et nous ne sommes pas seuls.'],
    ['brann', 'Ses fondations étaient déjà là, sous la neige. Du béton du vieux monde… avec ce soleil levant gravé dedans.'],
    ['brann', 'Il y avait des tours comme celle-là, autrefois. Des tours qui ont éteint le ciel. …Oublie ce que j’ai dit.'],
  ],
  full: [['brann', 'Ton dos est plein ! Va déposer ta charge.']],

  // ---- Industry -----------------------------------------------------------
  beltTile: [['tomas', 'Un tapis de cuir sur des rouleaux, et les steaks iraient seuls du chaudron jusqu’au comptoir.']],
  belt1: [
    ['tomas', 'Regarde-les rouler… J’ai passé ma vie à porter, tu sais.'],
    ['tomas', 'Depuis l’hiver où je n’ai pas réussi à porter mon petit frère jusqu’au refuge. Merci de soulager mon dos, Sasha.'],
  ],
  hoistTile: [['brann', 'Les arbalètes abattent plus d’ours qu’on ne peut en porter. Un treuil le long du rempart, et la viande filerait droit dans le chaudron.']],
  hoist: [['brann', 'Regarde-les filer ! Le rempart nourrit le chaudron tout seul.']],
  boots: [['lina', 'Des bottes fourrées pour toute l’équipe. Plus personne n’aura froid aux pieds… ni d’excuse pour traîner.']],
  steamTile: [['brann', 'J’ai vu des machines à vapeur, dans ma jeunesse. Une chaudière, des tuyaux, des louches qui travaillent seules. On peut la construire.']],
  steam: [
    ['brann', 'Elle siffle ! Les chaudrons travaillent seuls maintenant.'],
    ['brann', 'Le vieux monde savait faire tout ça… avant de faire pire.'],
  ],
  registerTile: [['lina', 'Je passe mes journées à courir après les billets. Une caisse automatique, et l’argent irait droit dans ta poche.']],
  register: [['lina', 'Ding ! Chaque client paie directement. Plus besoin de ramasser les billets.']],
  porter2: [['tomas', 'Voici Ivan. Il a l’âge qu’avait mon frère. Je lui apprends le métier… et à ne jamais lâcher une main dans la tempête.']],
  cableTile: [['anouk', 'Un téléphérique du lac jusqu’au comptoir… Le poisson voyagerait au-dessus de nos têtes !']],
  cable: [['anouk', 'Les nacelles partent ! Le fumoir est relié au fort.']],
  nets: [['anouk', 'Des filets sous chaque trou : le lac pêche pour nous, même la nuit.']],

  // ---- Act II ---------------------------------------------------------------
  caravanArrives: [
    ['mira', 'Sasha ! SASHA ! C’est moi, Mira !'],
    ['mira', 'C’était ma voix à la radio, dans la tempête. Je te croyais perdue… et toi, tu as bâti une ville ?'],
    ['brann', 'Ta lumière attire les vivants, petite. J’ai guidé leur caravane jusqu’ici.'],
    ['mira', 'Nos traîneaux repartent chercher les autres. Remplis-les et on te paiera en or du Sud. La dalle du relais est au sud du fort.'],
    ['mira', '(Elle détourne les yeux.) Il faudra qu’on parle, Sasha. De la nuit de la tempête.'],
  ],
  orderHint: [['mira', 'Nouvelle commande ! Dépose ce qu’on demande sur la dalle du relais.']],
  firstOrder: [
    ['mira', 'Les traîneaux sont pleins ! On revient vite avec une autre commande.'],
    ['brann', 'Avec des livraisons pareilles, il te faudrait un convoyeur.'],
  ],
  rope: [
    ['mira', 'La nuit de la tempête, ton traîneau glissait dans une crevasse. Il entraînait toute la caravane avec lui.'],
    ['mira', 'Le chef m’a tendu le couteau. C’est moi qui ai coupé la corde, Sasha. Moi.'],
    ['sasha', 'Tu as sauvé quarante personnes. J’aurais coupé aussi.'],
    ['mira', 'Je t’ai appelée trois jours à la radio. Je ne me suis jamais arrêtée. Jamais.'],
  ],
  orderNudge: [['mira', 'La route du lac, Sasha… nos gens attendent là-bas.']],
  courier: [['piotr', 'Piotr, convoyeur. Mécanicien, avant. Je remplis les traîneaux de la caravane, toi tu continues à faire tourner le fort.']],
  lakeTile: [
    ['mira', 'Sasha… une partie de notre caravane est coincée au Lac Gelé, au sud-est. Ils pêchent sous la glace pour survivre.'],
    ['brann', 'Ouvre une route jusqu’au lac. Leur poisson fumé vaudra de l’or au comptoir.'],
  ],
  lake: [
    ['anouk', 'Vous êtes venus ! Je suis Anouk. On croyait que plus personne ne viendrait nous chercher…'],
    ['anouk', 'Sous la glace, il y a une ville. Solenne. Quand le soleil est bas, on voit encore ses toits.'],
    ['brann', '(Il pâlit.) Solenne… Mets-toi au bord d’un trou et attends que ça morde. Le fumoir de la rive fera le reste.'],
  ],
  firstFish: [['anouk', 'Joli poisson ! Porte-le au fumoir, sur la rive.']],
  firstSmoked: [['lina', 'Du poisson fumé ! Les voyageurs vont se l’arracher au comptoir.']],
  fisher: [['anouk', 'Laisse-moi les trous du lac. Je pêche de l’aube jusqu’à la nuit.']],
  rod: [['anouk', 'Une canne en os de baleine. Le poisson n’a plus aucune chance.']],
  musicBox: [
    ['anouk', 'Regarde ce que j’ai remonté, accroché à un toit de Solenne : une boîte à musique.'],
    ['mira', '« Petit soleil sous la glace, dors, le printemps te cherche… » Maman nous la chantait. Tous les soirs.'],
    ['mira', 'Comment elle a pu finir au fond de ce lac, Sasha ? Comment ?'],
  ],
  fumoirTile: [['anouk', 'Avec une deuxième chambre de fumage, on doublerait la production.']],
  fumoirUp: [['anouk', 'Deux chambres de fumage ! On ne manquera plus jamais de rien.']],
  blizzard: [
    ['brann', 'Tu sens ce vent ? Le Grand Blizzard arrive. Celui qui a enterré le vieux monde.'],
    ['mira', 'Les rescapés racontent qu’il ne s’arrête jamais… sauf devant un feu assez grand.'],
    ['brann', 'Alors on va lui en montrer un. Le Grand Brasier, sur la rive est du lac. Il faudra tout ce que tu as.'],
  ],
  blizzardMid: [['lina', 'On ne voit plus la forêt… Dépêche-toi, Sasha ! Le Brasier !']],
  brasierTile: [['brann', 'La dalle du Grand Brasier est prête, sur la rive est. Du bois, de l’huile, et 6000 billets de courage.']],
  ending: [
    ['brann', 'Regarde… le blizzard recule. Il recule devant nous !'],
    ['mira', 'Le soleil, Sasha. Le vrai soleil.'],
    ['brann', 'Le Grand Gel n’a pas gagné. Pas ici.'],
  ],
  endingShadow: [['brann', '(Seul, face au nord, à voix basse.) Pas encore, Véra. Pas encore. Mais bientôt, je te le promets.']],
  postGame: [['mira', 'Les caravanes continueront de venir. Fort-Aube mérite de devenir la plus belle ville des Terres Blanches.']],
  lanterns: [['lina', 'Des lanternes tout le long de la palissade ! On voit Fort-Aube depuis l’autre bout de la forêt.']],
  statue: [['brann', 'Une statue… de moi ? Je ne la mérite pas. Tu ne sais pas tout, Sasha.']],
  sculpt: [['anouk', 'Des ours de glace au milieu du lac ! Les enfants ne veulent plus rentrer.']],
  festival: [
    ['mira', 'La Fête de l’Aube ! Des feux d’artifice, et les caravanes paient double !'],
    ['brann', 'Voilà ce qu’on a construit, Sasha. Une raison de vivre, pas seulement de survivre.'],
  ],

  // ---- Act III ------------------------------------------------------------
  relic: [['anouk', 'Sasha ! Viens au lac, vite ! Mes filets ont remonté quelque chose de Solenne… et ça clignote.']],
  relicOpen: [
    ['vera', '…ici Véra Solenne, Station Aube. Jour un du Protocole Hiver. Les Tours du Voile ne répondent plus. Elles continuent de répandre la poussière dans le ciel.'],
    ['vera', 'Si quelqu’un entend ce message : le Cœur de la station alimente les Tours. On peut l’arrêter à la main. Il faut descendre à la vanne, au fond du puits.'],
    ['vera', 'Sasha, Mira… si un jour vous entendez ça : maman vous aime. Brann vous protégera. Ne revenez pas me chercher.'],
    ['mira', 'C’est… c’est la voix de maman.'],
  ],
  confession: [
    ['brann', 'Je vous dois la vérité. J’étais garde à la Station Aube. Votre mère y était ingénieure. La meilleure.'],
    ['brann', 'Quand le ciel s’est éteint, elle m’a ordonné de vous emmener loin. Elle est restée pour arrêter les Tours.'],
    ['brann', 'Je vous ai confiées à une caravane… et je ne suis jamais retourné la chercher. Trente ans que je fuis cette porte.'],
    ['mira', 'Alors le Grand Gel… ce n’était pas la nature. C’était nous. C’était elle.'],
    ['brann', 'Elle voulait sauver le monde de la chaleur. Le Brasier ne tiendra pas éternellement : tant que le Cœur bat, le froid reviendra. Il faut aller au nord.'],
  ],
  westTile: [['piotr', 'Pour traverser le glacier, il faudra un brise-glace à vapeur. Et pour ça : de l’acier. La falaise à l’ouest est pleine de fer.']],
  west: [
    ['gustav', 'Gustav. J’ai creusé cette falaise avant le Gel, pour la Station. Le fer est là. Il attend.'],
    ['piotr', 'La forge est allumée. Apporte le minerai, j’en ferai de l’acier.'],
  ],
  firstOre: [['gustav', 'Du bon minerai, rouge comme une braise. Porte-le à la forge.']],
  firstSteel: [
    ['piotr', 'Notre premier lingot !'],
    ['piotr', 'Ta mère m’a appris à couler l’acier, à Solenne. J’étais son apprenti. Tu as ses mains, Sasha.'],
  ],
  miner: [['gustav', 'Je creuse pour toi, petite. Comme je creusais pour ta mère.']],
  rail: [['gustav', 'Un wagonnet sur des rails ! Mes vieux bras te remercient.']],
  drill: [['piotr', 'La foreuse à vapeur mord la roche jour et nuit.']],
  furnace2: [['piotr', 'Le haut-fourneau rugit ! L’acier coule deux fois plus vite.']],
  cuisine: [['lina', 'La Cuisine de l’Aube ! Trois fois plus de steaks, et pas une goutte de sueur.']],
  cannery: [
    ['piotr', 'La conserverie est reliée à la cuisine. Les steaks arrivent par câble et repartent en boîtes.'],
    ['brann', 'Des vivres pour un voyage dont on ne reviendra peut-être pas.'],
  ],
  cannons: [['brann', 'Des canons à vapeur sur le rempart. Plus aucun ours ne passera.']],
  sawmill3: [['oleg', 'La scierie industrielle… Alors je planterai deux graines par arbre.']],
  market2: [['lina', 'Deux guichets ! Fort-Aube est devenue une vraie ville marchande.']],
  shipTile: [['piotr', 'Le chantier est prêt. Il me faudra du bois, de l’acier, des vivres… Chaque pièce que tu apportes, je la boulonne.']],
  ship1: [['piotr', 'La coque tient ! Elle a des épaules de bœuf musqué.']],
  ship2: [['piotr', 'La chaudière est en place. Écoute-la ronronner.']],
  ship3: [['piotr', 'L’étrave d’acier et les chenilles. Elle fendra le glacier comme du pain.']],
  ship4: [
    ['piotr', 'Les vivres sont chargés. Le Brise-Glace est prêt.'],
    ['brann', 'Je viens avec toi. Cette fois, je ne fuirai pas.'],
    ['mira', 'Moi aussi. On va la chercher. Ou on va lui dire adieu.'],
    ['lina', 'On garde le fort. Revenez, d’accord ? Revenez.'],
  ],
  departure: [['piotr', 'Chaudière sous pression… En avant toute, vers le nord !']],
  station: [
    ['mira', 'Les Tours… elles soufflent encore. Trente ans sans s’arrêter.'],
    ['brann', 'La porte de la station. Je la reconnais. Je l’ai fermée derrière moi.'],
  ],
  veraLast: [
    ['vera', 'Dernier enregistrement. Je n’arrive pas à fermer la vanne seule. Le froid du puits tue en quelques minutes.'],
    ['vera', 'Il existe une autre voie : rediriger le Cœur vers une seule ville. Une ville chaude, pour toujours… mais le Voile continuerait, partout ailleurs.'],
    ['vera', 'Je n’ai pas su choisir. Je vous laisse ce choix, mes filles. Pardonnez-moi.'],
    ['mira', 'Elle nous attendait… Il y a sa bague, Sasha. Prends-la.'],
  ],
  choice: [
    ['brann', 'Fermer la vanne rendra le ciel au monde entier. Mais quelqu’un doit descendre dans le puits. Ce sera moi.'],
    ['mira', 'Ou on garde le Cœur pour Fort-Aube… et le reste du monde reste gelé.'],
    ['brann', 'C’est ton choix, Sasha. Ça l’a toujours été. Marche sur la dalle de ton choix.'],
  ],
  endingA: [
    ['brann', 'Il y a trente ans, j’ai fui cette porte. Pas cette fois.'],
    ['brann', 'Dis à Lina de garder mes billets. Ils valent quelque chose… parce qu’on y a cru ensemble.'],
    ['mira', 'Il l’a fait. Les Tours s’éteignent… Regarde le ciel, Sasha. Regarde le ciel.'],
  ],
  endingB: [
    ['mira', 'Le Cœur bat pour Fort-Aube, maintenant.'],
    ['brann', 'Une ville chaude au milieu de l’hiver. Ta mère aurait compris. Ou pas. On ne le saura jamais.'],
    ['brann', 'Rentrons. Il y a des gens qui ont froid, et une seule lumière au monde.'],
  ],
  afterA: [
    ['oleg', 'Sasha ! Mes graines… elles sortent de la neige ! Toutes !'],
    ['yuki', 'Flocon regarde vers le nord. Les ours remontent vers les glaces qui restent. Un jour, il faudra le laisser partir.'],
    ['lina', 'J’ai gardé les billets de Brann. Je ne les dépenserai jamais.'],
  ],
  afterB: [
    ['lina', 'Des serres ! Des tomates, Sasha. Des TOMATES.'],
    ['mira', 'Je repars sur les routes. Il reste tant de monde à ramener vers la lumière.'],
    ['brann', 'Je vais m’asseoir près du phare et regarder les caravanes arriver. J’ai fini de fuir.'],
  ],
};

// Sasha's journal: entries unlocked by story beats.
export const JOURNAL = [
  { beat: 'intro', title: 'Jour un', text: 'Je me suis réveillée sous la neige, sans traîneau, sans caravane. Une voix grésillait dans ma radio, puis plus rien. Un vieil homme m’a trouvée. Il s’appelle Brann. Il me regarde comme s’il avait vu un fantôme.' },
  { beat: 'camp', title: 'Fort-Aube', text: 'Une palissade, un chaudron, et des gens qui sortent de la forêt dès qu’ils sentent la fumée. Brann dit que la lumière attire les vivants. Il dit ça comme quelqu’un qui le sait.' },
  { beat: 'cashier', title: 'Lina', text: 'Elle tenait une épicerie, avant. Elle compte tout, tout le temps. Je crois que compter l’empêche de penser à ceux qu’elle a perdus.' },
  { beat: 'counter3', title: 'Les billets', text: 'Lina dit que nos billets du vieux monde ne valent rien, sauf parce qu’on y croit ensemble. Il y a un soleil levant imprimé dessus. Le même que sur les vieilles caisses de Brann.' },
  { beat: 'belt1', title: 'Tomas', text: 'Il porte tout ce qu’on lui donne. Aujourd’hui, il m’a parlé de son petit frère, de l’hiver où il n’a pas réussi à le porter jusqu’au refuge. Le tapis roulant, je crois que je l’ai construit pour lui.' },
  { beat: 'lumberjack', title: 'Oleg', text: 'Pour chaque arbre abattu, il enfonce une graine dans la neige. Je lui ai demandé pourquoi. « Parce que l’hiver finira. » Il est le seul à le dire sans rire.' },
  { beat: 'hunter', title: 'Yuki', text: 'Elle chasse depuis ses six ans. Elle remercie chaque ours qu’elle abat, à voix basse, avant de le dépecer.' },
  { beat: 'boss', title: 'Grand-Blanc', text: 'Les anciens racontaient qu’un ours géant gardait le nord. Il est sorti de la forêt en couchant les sapins comme de l’herbe.' },
  { beat: 'bossDown', title: 'Flocon', text: 'Grand-Blanc n’attaquait pas le fort. Elle cherchait de quoi nourrir son petit. On l’a tuée, et maintenant son ourson me suit partout. Je ne me le pardonne pas, alors je le nourris.' },
  { beat: 'beacon', title: 'Le Phare', text: 'Ses fondations étaient déjà là, sous la neige : du béton du vieux monde, avec ce soleil levant gravé dedans. Brann a passé la nuit à le fixer sans dire un mot.' },
  { beat: 'steam', title: 'Vapeur', text: 'Les chaudrons sifflent et travaillent seuls. Brann dit que le vieux monde savait faire ça, « avant de faire pire ». Il refuse de dire quoi.' },
  { beat: 'caravanArrives', title: 'Mira', text: 'La voix dans la tempête, c’était ma sœur. Elle m’a serrée si fort que j’en ai eu mal aux côtes. Mais elle ne me regarde pas dans les yeux.' },
  { beat: 'rope', title: 'La corde', text: 'Mira a coupé la corde de mon traîneau pour sauver la caravane. Elle croit que je lui en veux. Je ne lui en veux pas. Ce soir, on a dormi dos à dos, comme quand on était petites.' },
  { beat: 'lake', title: 'Solenne', text: 'Anouk dit qu’une ville dort sous la glace du lac. Solenne. Quand le soleil est bas, on voit les toits. Brann a blêmi en entendant ce nom.' },
  { beat: 'musicBox', title: 'Petit soleil sous la glace', text: '« Petit soleil sous la glace, dors, le printemps te cherche… » Mira l’a chantée en entier. Moi, je ne me souvenais pas des paroles. Mais mes mains, si.' },
  { beat: 'blizzard', title: 'Le Grand Blizzard', text: 'Celui qui a enterré le vieux monde. On ne voit plus rien à dix pas. On construit un feu plus grand que tout ce qu’on a jamais construit.' },
  { beat: 'ending', title: 'Le Dégel', text: 'Le soleil. Le vrai. Tout le monde pleurait. Brann, lui, regardait vers le nord. Je l’ai entendu murmurer un nom : Véra.' },
  { beat: 'relicOpen', title: 'La boîte noire', text: 'La voix de maman. Trente ans dans la glace, et elle parle encore. Elle s’appelait Véra Solenne. Elle a construit les Tours qui ont éteint le ciel.' },
  { beat: 'confession', title: 'Brann', text: 'Il était garde à la Station Aube. C’est lui qui nous a emmenées, Mira et moi, quand le ciel s’est éteint. Il n’est jamais revenu chercher maman. Il a passé trente ans à nous chercher, nous. Je ne sais pas si je dois le haïr ou le remercier.' },
  { beat: 'west', title: 'La Falaise de Fer', text: 'Gustav creusait ici pour la Station. Il dit que le fer est « rouge comme une braise ». Piotr a allumé la forge. Fort-Aube sent la suie et l’avenir.' },
  { beat: 'firstSteel', title: 'Piotr', text: 'Il était l’apprenti de maman, à Solenne. Il a gardé ses gestes. Quand il coule l’acier, je la vois presque.' },
  { beat: 'cannery', title: 'Conserves', text: 'Les steaks traversent la ville par câble et ressortent en boîtes. Des vivres pour un voyage dont on ne reviendra peut-être pas.' },
  { beat: 'ship4', title: 'Le Brise-Glace', text: 'Une coque de bois, une chaudière, une étrave d’acier. Fort-Aube tout entier l’a construit. Demain, on part vers le nord.' },
  { beat: 'station', title: 'Station Aube', text: 'Les Tours du Voile soufflent toujours leur poussière dans le ciel. Trente ans sans que personne ne les arrête.' },
  { beat: 'veraLast', title: 'Le dernier message', text: 'Maman n’a pas pu fermer la vanne seule. Elle nous a laissé le choix. Je porte sa bague maintenant. Elle est trop grande pour mon doigt.' },
  { beat: 'endingA', title: 'Le Ciel Rendu', text: 'Brann est descendu dans le puits. Il a dit : « Cette fois, je reste. » Le Voile tombe. Partout, la neige va fondre. Maman, il est revenu te chercher, finalement.' },
  { beat: 'endingB', title: 'La Ville-Lumière', text: 'Le Cœur bat sous Fort-Aube. Il fera chaud ici pour toujours. Ailleurs, l’hiver continue. Chaque nuit, je me demande si maman aurait choisi pareil.' },
];

export class Story {
  constructor(hud, save) {
    this.hud = hud;
    this.done = new Set(save?.beats || []);
    this.onJournal = null;
  }
  beat(id, delay = 0) {
    if (this.done.has(id) || !BEATS[id]) return false;
    this.done.add(id);
    const lines = BEATS[id];
    setTimeout(() => {
      lines.forEach(([who, text]) => this.hud.say(CAST[who], text));
      if (JOURNAL.some((j) => j.beat === id)) this.onJournal?.(id);
    }, delay * 1000);
    return true;
  }
  journal() { return JOURNAL.filter((j) => this.done.has(j.beat)); }
  chapter(n) {
    const c = CHAPTERS[n];
    if (c) this.hud.banner(c.num, c.title, c.sub);
  }
  serialize() { return [...this.done]; }
}
