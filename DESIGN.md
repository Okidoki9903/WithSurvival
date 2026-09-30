# Direction de jeu — WithSurvival

Reconstruire un réseau de territoires autour d’une colonie. Le premier repas donne une raison immédiate d’agir ; les machines libèrent ensuite du temps pour explorer des régions plus dangereuses.

## Systèmes implémentés

| Système | Effet jouable | Décision |
|---|---|---|
| Colonie, 5 stades | Routes, PV et bâtiments | Investir dans l’exploration ou l’industrie |
| Enclos, 3 niveaux | Largeur accessible +6 par niveau | Développer l’espace de la colonie |
| Atelier, 4 niveaux | Vitesse ×(1+0,35×niveau) | Réduire le premier goulot |
| Cuisine, 4 niveaux | Vitesse ×(1+0,30×niveau) | Équilibrer transformation et cuisson |
| Convoyeurs, 3 niveaux | Transport puis vitesse accrue | Infrastructure dédiée |
| Assistants, 3 niveaux | Transport, caisse, chasse | Réduire les trajets |
| Armes, 3 niveaux | Dégâts ; essence aux niveaux avancés | Combattre pour les matériaux rares |
| Combat | Anticipation, cercle d’impact, esquive avec recharge | Attaquer, fuir ou esquiver |

## Territoires et récit

La forêt de givre apprend le ravitaillement avec des ours qui ripostent. Le canyon introduit des loups rapides. Les marais abritent des golems résistants aux frappes larges. La faille contient des créatures du Néant rapides et dangereuses. Chaque stade exige la maîtrise du dernier territoire ouvert : répéter seulement les premiers combats ne suffit plus.

Nora dirige un refuge isolé. Nourrir les voyageurs rallume les lanternes et rouvrir les routes transforme le refuge en cité. Le journal suit cinq chapitres et explique chaque territoire.

Les destinations réutilisent la même empreinte de terrain avec décors et combats différents. La production reste active lors des voyages. Ce n’est pas encore un monde ouvert continu.

## Vérifications et limites

Les tests de simulation couvrent chasse, production, achats, automatisation, niveaux bornés, voyages verrouillés, esquive, anticipation, coûts en essence, maîtrise régionale et sauvegardes. Les essais navigateur vérifient achats, quatre régions, pause et persistance sur écran mobile.

Le rendu est procédural et stylisé. Il manque encore des assets détaillés, animation squelettique, topologies propres à chaque carte, boss scénarisés, missions secondaires, sons d’ambiance enregistrés et validation prolongée sur des téléphones physiques. Le classement S-tier et la qualité AAA ne sont pas acquis.

## Prochains jalons

1. Cartes différentes avec embranchements, obstacles, secrets et raccourcis ; objectifs régionaux.
2. Recettes par biome, ressources spécialisées, stockage borné et contrats ; sessions d’équilibrage.
3. Plusieurs espèces par région, élites, boss, attaques directionnelles et compétences actives.
4. Placement de bâtiments, habitants spécialisés, défense et événements de cité.
5. Direction artistique originale, modèles et animations dédiés, textures, musique et dialogues.
6. Mesures de performances, chauffe et mémoire sur mobiles modestes ; cache hors ligne et sauvegarde complète.

Chaque jalon doit produire des fonctionnalités jouables, tests de progression et essais utilisateurs. Un intitulé AAA ne remplace pas ces validations.

## Reprise de la progression

Les métiers sont maintenant distincts : collecteurs physiques, chasseurs de guilde, fermier, assistants de production, entrepôt et caravanes. Les bâtiments disposent de positions réelles et de fonctions différentes ; les stades de colonie exigent de l’espace et ces services. Une chaîne complète peut fonctionner avec chasse, récupération, transport, transformation, vente et collecte de pièces.

Les contrats tournent entre cinq objectifs, changent de région et font apparaître des élites ; la menace augmente sur plusieurs cycles. Le progrès continue après la citadelle. Les deux atlas ImageGen sont utilisés pour les sols et matériaux 3D, pas comme captures de gameplay.

La cible de quatre heures est une ambition de rythme et de variété. La simulation longue valide seulement les stocks bornés, les entités et le fonctionnement technique. Il reste nécessaire de mesurer en vraie session le temps des déblocages, les trajets, les choix et les moments répétitifs.
