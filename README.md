# WithSurvival — Les Terres oubliées

Une aventure 3D mobile : chassez, nourrissez les voyageurs, développez une colonie, rouvrez quatre territoires de chasse et construisez huit quartiers de production. Cette version étend le prototype original ; elle ne constitue pas une production AAA achevée.

## Interface et interactions mobiles

Le joueur construit dans le monde : chaque amélioration possède sa dalle. Après un bref arrêt, les pièces financent progressivement les travaux ; le reste à payer et les paiements partiels sont sauvegardés. Toucher une dalle la sélectionne ; l’unique action contextuelle permet de s’y rendre puis de financer. Les catalogues restent disponibles comme outils facultatifs.

Le HUD comporte un état des ressources compact, un seul objectif court, une action contextuelle et trois entrées : Construire, Inventaire, Expéditions. Le premier lancement révèle progressivement les commandes après une véritable récolte. Le déplacement fonctionne au joystick ou en touchant le terrain, avec une caméra adaptée au portrait. Inventaire, menus, pause et expéditions suspendent la simulation.

## Progression jouable

- Refuge → hameau → village → cité → citadelle. Les constructions demandent des pièces, des victoires et trois victoires dans le dernier territoire ouvert.
- Forêt de givre, canyon des braises, marais de cristal, faille de l’éclipse : ambiances et silhouettes distinctes ; vitesse, résistance, attaque et récompenses différentes.
- Enclos extensible sur trois niveaux : clôture et surface réellement accessible grandissent. Les expansions productives se débloquent ensuite sur des dalles successives, en maîtrisant les machines et les ventes du quartier précédent.
- Huit chaînes : poissons → filets → poissons fumés ; blé → farine → pains ; fruits → jus → confitures ; minerai → lingots → outils ; bêtes → peaux → cuir ; cristaux → essences → potions ; vestiges → reliques → artefacts ; minerai rare → alliages → couronnes.
- Chaque quartier possède ses propres récoltes, transformation, finition, convoyeurs, équipes, stockage, collecte directe et marché. Les améliorations sont calculées dans le moteur Rust ; les stocks restent physiques et limités.
- Atelier et cuisine sur quatre niveaux ; convoyeurs et grill turbo sur trois niveaux. Les améliorations changent réellement la cadence.
- Collecteurs : ramassage de la viande réellement déposée au sol et retour par le portail. Guilde : chasseurs qui poursuivent, frappent et vainquent les créatures. Ferme : récoltes renouvelables transportées par un fermier. Entrepôt : capacité de stockage 30 → 150. Comptoir des caravanes : contrats variés, récompenses et menaces croissantes.
- Assistants industriels : transport des stocks, caisse puis chasseur supplémentaire. Le ravitaillement ne fait plus apparaître de viande artificiellement.
- Armes sur trois niveaux, sac, bottes et armure. Les armes avancées consomment les essences du combat.
- Les monstres anticipent leur frappe : quittez le cercle rouge ou esquivez. Les régions avancées attaquent à vue.
- Journal de Nora : cinq chapitres, objectifs, achats, voyages. La simulation se met en pause dans le journal, BÂTIR et EXPANSION.
- Sauvegarde locale : progression, améliorations et financement partiel des dalles ; anciennes sauvegardes migrées. Les ressources et travailleurs sont conservés dans la nouvelle sauvegarde. Aucun gain hors ligne. Les aliments finis du port, des champs et du verger peuvent aussi alimenter le comptoir du refuge.

## Commandes

Mobile : glissez sur le monde pour marcher ; utilisez le bouton Esquive et Expéditions dans la navigation basse. Clavier : ZQSD, WASD ou flèches ; Espace pour esquiver. Approchez les créatures pour attaquer automatiquement et les zones des machines pour transférer les ressources. Restez sur les dalles pour les financer. Après une construction, il faut quitter puis revenir sur la dalle pour commencer automatiquement le niveau suivant, ou le demander explicitement avec le bouton contextuel.

Chaîne de départ : chasse → atelier → cuisine → comptoir → pièces. EXPANSION affiche les nouvelles chaînes, leurs ressources, leurs conditions et leurs machines. Ses boutons indiquent le chemin vers une source, une entrée ou une sortie de machine, le marché ou la prochaine dalle. Le HUD affiche une seule action contextuelle ; Construire mène directement vers une dalle, sans imposer ce catalogue. La flèche indique l’action suivante. Le journal affiche les conditions de développement et les routes disponibles.

## Lancer et vérifier

```sh
rustup target add wasm32-unknown-unknown
cd core
cargo test --release
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/polar_camp_core.wasm ../web/game.wasm
cd ../web
python -m http.server 8000
```

Ouvrez http://localhost:8000. Le wasm compilé est inclus. Three.js est chargé depuis jsDelivr : une connexion est nécessaire. Le chargement propose une reprise si le moteur échoue.

Sans éditeur de liens natif, les tests fonctionnent sur wasm32-wasip1 avec Wasmtime comme CARGO_TARGET_WASM32_WASIP1_RUNNER.

## Architecture et publication

core/src/lib.rs : simulation Rust sans dépendances. web/main.js : rendu Three.js, entrée et effets. web/campaign.js : interface narrative dérivée de l’état réel. web/boot.js : reprise du chargement. L’ABI historique reste compatible ; un trailer version 2 ajoute progression et anticipations d’attaque. Sauvegarde : tampon de 32 mots, format v3 étendu ; sa capacité est fournie par le moteur.

Le workflow GitHub Pages teste et compile le moteur. Les branches main, master et claude/** déclenchent la publication ; codex/** permet une revue sans changer le site public.

Voir [DESIGN.md](DESIGN.md) pour les limites et prochains jalons.

Projet indépendant, sans affiliation à Century Games ou Whiteout Survival. Modèles procéduraux.

## Test navigateur reproductible

Démarrez le serveur sur le port 8765, puis lancez `npm install`, `npx playwright install chromium` et `npm run test:browser`. `GAME_URL` permet une autre adresse. Le test crée une sauvegarde de scénario dans un navigateur isolé ; aucun outil de triche n’est ajouté au jeu. Captures dans `test-artifacts/`.

## Nouvelle progression de colonie

Le bouton BÂTIR expose directement l’enclos, les 5 bâtiments spécialisés et les 17 catégories d’améliorations. Les cartes indiquent leurs effets actuels et suivants, coûts et dépendances. L’enclos possède aussi une pancarte cliquable dans le monde. La colonie nécessite des infrastructures concrètes avant de passer au stade suivant.

Les caravanes alternent repas, victoires régionales, collecte, récoltes et prime de champion. Les élites préparent une frappe plus dangereuse. Les textures de terrain, pavés, bois et toitures utilisent deux atlas ImageGen ; les bâtiments et personnages restent de vrais meshes 3D. Prompts et provenance dans web/assets/README.md.

Objectif de conception : soutenir des sessions de quatre heures ou davantage grâce aux métiers, aux choix de développement et aux contrats évolutifs. Un test de quatre heures simulées vérifie la stabilité du moteur ; il ne démontre pas encore quatre heures de plaisir en session utilisateur.

## Références de gameplay

La refonte mobile s’appuie sur les dix vidéos fournies : achats progressifs sur des dalles, collecte et transport visibles, machines implantées dans le monde et automatisation par étapes. Les fichiers vidéo restent privés sur le disque de l’utilisateur ; ils ne sont pas inclus dans le dépôt. Les créations graphiques et les règles de jeu restent celles de WithSurvival.
