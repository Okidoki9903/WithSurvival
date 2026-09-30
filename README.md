# WithSurvival — Les Terres oubliées

Une aventure 3D mobile : chassez, nourrissez les voyageurs, développez une colonie et rouvrez quatre territoires. Cette version étend le prototype original ; elle ne constitue pas une production AAA achevée.

## Progression jouable

- Refuge → hameau → village → cité → citadelle. Les constructions demandent des pièces, des victoires et trois victoires dans le dernier territoire ouvert.
- Forêt de givre, canyon des braises, marais de cristal, faille de l’éclipse : ambiances et silhouettes distinctes ; vitesse, résistance, attaque et récompenses différentes.
- Enclos extensible sur trois niveaux : clôture et surface réellement accessible grandissent.
- Atelier et cuisine sur quatre niveaux ; convoyeurs et grill turbo sur trois niveaux. Les améliorations changent réellement la cadence.
- Assistants : porteur, caissier, chasseur. Transport des stocks, encaissement puis ravitaillement automatique.
- Armes sur trois niveaux, sac, bottes et armure. Les armes avancées consomment les essences du combat.
- Les monstres anticipent leur frappe : quittez le cercle rouge ou esquivez. Les régions avancées attaquent à vue.
- Journal de Nora : cinq chapitres, objectifs, achats, voyages. La simulation se met en pause dans le journal.
- Sauvegarde locale : progression, améliorations et financement partiel des dalles ; anciennes sauvegardes migrées. Les stocks et la position ne sont pas persistés. Aucun gain hors ligne.

## Commandes

Mobile : glissez sur le monde pour marcher ; utilisez le bouton Esquive et le journal en haut à droite. Clavier : ZQSD, WASD ou flèches ; Espace pour esquiver. Approchez les créatures pour attaquer automatiquement et les zones des machines pour transférer les ressources. Restez sur les dalles pour les financer.

Chaîne de production : chasse → atelier → cuisine → comptoir → pièces. La flèche indique l’action suivante. Le journal affiche les conditions de développement et les routes disponibles.

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

core/src/lib.rs : simulation Rust sans dépendances. web/main.js : rendu Three.js, entrée et effets. web/campaign.js : interface narrative dérivée de l’état réel. web/boot.js : reprise du chargement. L’ABI historique reste compatible ; un trailer version 2 ajoute progression et anticipations d’attaque. Sauvegarde : tampon de 32 mots, format actuel de 28 mots.

Le workflow GitHub Pages teste et compile le moteur. Les branches main, master et claude/** déclenchent la publication ; codex/** permet une revue sans changer le site public.

Voir [DESIGN.md](DESIGN.md) pour les limites et prochains jalons.

Projet indépendant, sans affiliation à Century Games ou Whiteout Survival. Modèles procéduraux.

## Test navigateur reproductible

Démarrez le serveur sur le port 8765, puis lancez `npm install`, `npx playwright install chromium` et `npm run test:browser`. `GAME_URL` permet une autre adresse. Le test crée une sauvegarde de scénario dans un navigateur isolé ; aucun outil de triche n’est ajouté au jeu. Captures dans `test-artifacts/`.
