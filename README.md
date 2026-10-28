# WithSurvival — Fort-Aube

Jeu 3D mobile/navigateur dans les Terres Blanches : chasse les ours polaires, fais tourner le chaudron, nourris les rescapés et transforme une clairière enneigée en ville.

Tout se joue en marchant, sans menu ni bouton d'action : glisse n'importe où sur l'écran (joystick flottant) ou utilise ZQSD / WASD / flèches.

## Boucle de jeu

- **Départ** : Sasha n'a rien sur le dos. Brann, vieux trappeur garé dans la clairière avec son traîneau, achète la viande d'ours (10 billets le morceau). Il faut 200 billets pour bâtir le camp ; ensuite Brann repart sur la piste et continue de guider par radio.
- **Chasse** : approche-toi d'un ours, la hache frappe toute seule. L'ours explose en morceaux de viande qui s'empilent sur ton dos (la pile ondule quand tu cours).
- **Chaudron** : passe sur la dalle « viande » pour déposer la viande crue. Le chaudron la cuit et sort les steaks sur la zone pointillée.
- **Comptoir** : ramasse les steaks, puis tiens-toi dans la zone du comptoir. Les rescapés font la queue dehors, une bulle indique ce qu'ils veulent.
- **Billets** : chaque client paie en billets qui s'empilent près du comptoir. Ramasse-les.
- **Construire** : reste sur une dalle `$` pour la financer billet par billet (les paiements partiels sont gardés).

## Machines du camp et leurs évolutions

Chaque amélioration se finance sur une dalle posée juste à côté de la machine, et change son modèle 3D en plus de son effet.

| Machine | Niveau 1 | Évolutions |
|---|---|---|
| Chaudron | Marmite sur un foyer de pierres | **Chaudron renforcé** (cerclé de cuivre, grand foyer, bois de chauffe, cuisson ×1,5) → **Second chaudron** (deux marmites en parallèle) |
| Comptoir | Table sur un plancher | **Comptoir couvert** (auvent rayé, lanternes, service plus rapide, file plus longue) → **Étal du marché** (enseigne Fort-Aube, fanions, caisses de fruits, clients qui paient +30 %) |
| Arbalètes | Tour de caisses et arbalète sur la palissade | **Balistes** (blindage d'acier, double arc doré, fanion, tir plus rapide et plus fort) |
| Scierie (chapitre III) | Établi et scie circulaire sous abri | **Scie à vapeur** (chaudière en cuivre qui fume, courroie, seconde lame dorée, coupe ×2) |
| Fumoir (chapitre VI) | Cabane de fumage, cheminée de pierre, claies de poissons | **Fumoir double** (seconde chambre, grande cheminée, fumage ×2) |
| Grand Brasier (chapitre VII) | — | Anneau de pierres, bûcher géant, quatre torches : il brise le blizzard |
| Réserve de bois | — | La pile de bûches grandit avec ce que la scierie a coupé |

## Progression et histoire

| Chapitre | Ce qui change |
|---|---|
| Prologue | Sasha, perdue après la tempête, chasse ses premiers ours et vend la viande à Brann pour réunir 200 billets, puis plante Fort-Aube. |
| I · Le Premier Feu | Palissade, chaudron, comptoir. Lina (caissière) tient le comptoir, hache d'acier. |
| II · Les Fourrures Blanches | Arbalètes automatiques sur la palissade, Tomas le porteur, grand sac, la Danse des Lames (anneau de haches tournoyantes). |
| III · Le Froid Mordant | Agrandissement à l'est : cabanes, feux de camp, rescapés qui vivent dans le fort. Les clients veulent aussi du bois de chauffe : coupe les sapins en lisière, passe les bûches à la scierie, porte le bois fendu au comptoir. Oleg (bûcheron), Yuki (chasseuse), second chaudron, lames tempête. |
| IV · Grand-Blanc | Agrandissement à l'ouest… et le colosse des glaces sort de la forêt. Évite ses coups au sol (cercle rouge). |
| *Fin de l'acte I* | Le Phare de l'Aube s'allume et guide les caravanes perdues. |
| V · La Caravane de l'Aube | La voix de la tempête était Mira, la sœur de Sasha : elle arrive avec Brann et une caravane tirée par des bœufs musqués. Les traîneaux passent de grosses commandes (steaks, bois fendu, puis poisson fumé) à livrer sur la dalle du relais, au sud. Piotr, convoyeur, peut les charger à ta place. |
| VI · Le Lac Gelé | Une route et une porte sud mènent au lac où survit le reste de la caravane. Pêche sur la glace (reste immobile au bord d'un trou), nouveau **fumoir** sur la rive, Anouk la pêcheuse, canne en os, fumoir double. Les clients demandent aussi du poisson fumé. |
| VII · Le Grand Blizzard | Le ciel se ferme : neige épaisse, brouillard, vent. Il faut financer le **Grand Brasier** sur la rive est du lac (6000 billets). |
| Épilogue · Le Dégel | Le Brasier s'embrase, le blizzard recule, le soleil revient : générique de fin. |
| Après la fin | Les caravanes continuent (commandes de plus en plus grosses) et la ville s'embellit : lanternes du fort, statue de Brann, ours de glace sur le lac, puis la Fête de l'Aube (feux d'artifice, commandes payées double). |

La partie est sauvegardée automatiquement sur l'appareil (menu ‖ → « Recommencer l'aventure » pour repartir de zéro).

## Technique

- Three.js (r170, embarqué dans `web/vendor`), aucun build : `web/` est servi tel quel.
- Forêt de ~3 000 sapins enneigés en `InstancedMesh` découpés en blocs (culling), ombres douces qui suivent la caméra, halos additifs à la place d'un bloom.
- Toutes les piles, billets et morceaux de viande passent par un seul rendu instancié par type d'objet.
- Modèles, icônes, textures et sons sont procéduraux (aucun asset externe).
- Qualité adaptative : si le téléphone peine, la résolution baisse automatiquement. Paramètres d'URL : `?q=low|medium|high`, `?bloom`, `?fresh` (nouvelle partie).

```
web/
  index.html, style.css
  src/main.js      rendu, caméra, boucle
  src/game.js      gameplay (chasse, piles, chaudron, clients, dalles, ouvriers, boss)
  src/world.js     carte, sol, palissades, zones marchables
  src/forest.js    sapins instanciés
  src/models.js    personnages, ours, chaudron, tourelles, cabanes, phare
  src/act2.js      acte II : caravane, lac gelé, fumoir, blizzard, Grand Brasier, embellissements
  src/story.js     chapitres et dialogues
```

## Lancer et tester

```sh
npm run serve          # http://localhost:8765
npm ci && npx playwright install chromium
npm test               # un pilote automatique joue la boucle et vérifie qu'elle progresse
```

Le workflow GitHub teste puis publie `web/` sur GitHub Pages (branches `main`, `master`, `claude/**`).
