# WithSurvival

Une boucle de collecte et de production construite autour du petit enclos initial. Le joueur chasse, transporte une pile de viande, la dépose dans le broyeur, récupère les découpes, les fait cuire puis nourrit les clients. Les ventes laissent des billets à ramasser.

## Construction et progression

Les achats se font dans le monde : restez sur une dalle pointillée pour financer une construction avec vos billets. Le montant restant diminue réellement. Les paiements partiels sont sauvegardés ; une construction terminée ne paie pas automatiquement le niveau suivant avant que le joueur quitte puis revienne sur la dalle.

Le petit enclos reste le point de départ. Les convoyeurs et les collecteurs automatisent progressivement le travail. Au niveau 2 des collecteurs, avec le premier convoyeur, les prises peuvent rejoindre directement l'entrée du broyeur, dans la limite du stockage ; le surplus reste un butin réel à ramasser.

Deux convoyeurs et cinq clients nourris permettent d'acheter la première extension. Les nouvelles parcelles sont attenantes : pêche, cultures, verger, scierie, grands animaux, carrière et atelier. Ouvrir le terrain donne accès à la récolte manuelle ; les machines de transformation, finition et vente doivent être construites sur leurs propres dalles. Le niveau 2 des trois étapes et un premier transport, puis dix ventes, permettent de poursuivre la route.

La production consomme les stocks réellement déposés. Les marchés laissent leur argent sur place ; ils ne créditent pas le portefeuille à distance. Les produits alimentaires peuvent rejoindre le comptoir du refuge. Les convoyeurs, les ouvriers, le stockage et les machines s'améliorent séparément.

## Interface et commandes

L'écran conserve le monde : argent vert en haut à droite, menu et pause discrets. Il n'y a ni catalogue obligatoire, ni barre de trois onglets, ni grand bouton contextuel, ni panneau de quête permanent. Une consigne transitoire et une flèche donnent les premières indications.

Glissez sur le terrain pour déplacer le personnage au joystick ; toucher une ressource ou une dalle permet aussi de s'en approcher. Chasse, ramassage, dépôt et financement se déclenchent à proximité. Clavier : ZQSD, WASD ou flèches ; Espace pour esquiver. Le menu donne accès à l'inventaire réel et à la pause. Les menus suspendent la simulation.

Neige et sable unis, palissades enneigées, broyeur métallique, grill orange, piles portées et dalles blanches reprennent les éléments observés dans les références. Les vidéos privées et les graphismes propriétaires de ces références ne sont pas copiés dans le dépôt.

## Développement

```sh
cd core
cargo test --release
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/polar_camp_core.wasm ../web/game.wasm
cd ../web
python -m http.server 8765
```

Sans éditeur de liens natif, les tests peuvent fonctionner sur wasm32-wasip1 avec Wasmtime comme CARGO_TARGET_WASM32_WASIP1_RUNNER.

Tests navigateur : `npm install`, `npx playwright install chromium`, puis `npm run test:hud`, `npm run test:onboarding`, `npm run test:world`, `npm run test:districts`, `npm run test:wood` et `npm run test:context`. `GAME_URL` permet de tester une autre adresse. Les sauvegardes de scénario sont isolées ; aucun test ne remplace la sauvegarde personnelle du joueur. Captures dans `test-artifacts/`.

Le workflow GitHub Pages teste et compile le moteur. Les branches main, master et claude/** publient le jeu ; codex/** permet une revue préalable. Les anciennes sauvegardes de base et de monde sont migrées, avec leurs ressources, ouvriers et paiements partiels.

Un test de quatre heures simulées vérifie la stabilité. Il ne démontre pas quatre heures de plaisir en session utilisateur ni une qualité AAA. L'équilibrage et la ressemblance doivent aussi être jugés en jouant.
