# WithSurvival — Fort-Aube

Jeu 3D mobile/navigateur dans les Terres Blanches : chasse les ours polaires, fais tourner le chaudron, nourris les rescapés et transforme une clairière enneigée en ville.

Tout se joue en marchant, sans menu ni bouton d'action : glisse n'importe où sur l'écran (joystick flottant) ou utilise ZQSD / WASD / flèches.

## Boucle de jeu

- **Chasse** : approche-toi d'un ours, la hache frappe toute seule. L'ours explose en morceaux de viande qui s'empilent sur ton dos (la pile ondule quand tu cours).
- **Chaudron** : passe sur la dalle « viande » pour déposer la viande crue. Le chaudron la cuit et sort les steaks sur la zone pointillée.
- **Comptoir** : ramasse les steaks, puis tiens-toi dans la zone du comptoir. Les rescapés font la queue dehors, une bulle indique ce qu'ils veulent.
- **Billets** : chaque client paie en billets qui s'empilent près du comptoir. Ramasse-les.
- **Construire** : reste sur une dalle `$` pour la financer billet par billet (les paiements partiels sont gardés).

## Progression et histoire

| Chapitre | Ce qui change |
|---|---|
| Prologue | Sasha, perdue après la tempête, plante Fort-Aube avec ses 200 derniers billets. Brann, vieux trappeur, la guide à la radio. |
| I · Le Premier Feu | Palissade, chaudron, comptoir. Lina (caissière) tient le comptoir, hache d'acier. |
| II · Les Fourrures Blanches | Arbalètes automatiques sur la palissade, Tomas le porteur, grand sac, la Danse des Lames (anneau de haches tournoyantes). |
| III · Le Froid Mordant | Agrandissement à l'est : cabanes, feux de camp, rescapés qui vivent dans le fort. Les clients veulent aussi du bois : coupe les sapins en lisière. Oleg (bûcheron), Yuki (chasseuse), second chaudron, lames tempête. |
| IV · Grand-Blanc | Agrandissement à l'ouest… et le colosse des glaces sort de la forêt. Évite ses coups au sol (cercle rouge). |
| Épilogue · L'Aube | Le Phare de l'Aube s'allume : les caravanes arrivent, la ville continue de tourner. |

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
  src/story.js     chapitres et dialogues
```

## Lancer et tester

```sh
npm run serve          # http://localhost:8765
npm ci && npx playwright install chromium
npm test               # un pilote automatique joue la boucle et vérifie qu'elle progresse
```

Le workflow GitHub teste puis publie `web/` sur GitHub Pages (branches `main`, `master`, `claude/**`).
