# 🐻‍❄️ Polar Camp

Un remake du mini-jeu « chasse aux ours polaires » des pubs *Whiteout Survival* : tu chasses, tu cuisines, tu vends et tu agrandis ton camp.

- **Moteur de jeu en Rust**, compilé en WebAssembly (`core/`)
- **Rendu 3D en three.js** (`web/`)
- Jouable sur **téléphone** (joystick tactile) et **PC** (ZQSD / WASD / flèches)
- Publié automatiquement sur **GitHub Pages**

👉 **Jouer :** https://okidoki9903.github.io/WithSurvival/ (une fois GitHub Pages activé, voir plus bas)

## Comment jouer

1. 🪓 Sors du camp par le portail nord et approche-toi des ours : ton personnage frappe tout seul.
2. 🍖 Les ours vaincus lâchent de la viande, que tu empiles sur ton dos (jusqu'à la limite de ton sac, « MAX »).
3. ⚙️ Dépose la viande sur la zone du **hachoir** : 1 viande donne 2 tranches crues.
4. 🔥 Récupère les tranches et pose-les sur la zone du **grill**.
5. 🥩 Apporte les steaks cuits au **comptoir** : les clients en file les achètent.
6. 💵 Ramasse l'argent à côté du comptoir.
7. ⬆️ Marche sur les **dalles d'amélioration** pour les acheter :
   | Dalle | Effet |
   |---|---|
   | ⚙️ Tapis roulant | Le hachoir envoie tout seul la viande au grill |
   | 🎒 Grand sac (3 niveaux) | Tu portes plus d'objets |
   | 🚚 Tapis vers comptoir | Le grill livre tout seul le comptoir |
   | 👟 Bottes (2 niveaux) | Tu cours plus vite |
   | ⚔️ Héros | Armure, attaque tournoyante en zone, plus de PV et de place |
   | 🔥 Grill turbo | Le grill cuit 2 fois plus vite |

Une flèche verte t'indique toujours quoi faire ensuite. Attention : un ours que tu frappes riposte ! Si tu tombes KO, tu perds ce que tu portais. Ta progression (argent et améliorations) est sauvegardée dans le navigateur.

## Architecture

```
core/            Crate Rust « polar-camp-core » (aucune dépendance)
  src/lib.rs     Toutes les règles : déplacements, combat, ours, chaîne de production,
                 clients, économie, améliorations, sauvegarde + tests unitaires
web/             Site statique servi par GitHub Pages
  index.html     Page, HUD et écran titre
  main.js        Rendu three.js : décor, modèles low-poly procéduraux, effets,
                 joystick, sons. Lit l'état exporté par le module wasm à chaque frame.
  game.wasm      Moteur Rust compilé (reconstruit par la CI)
.github/workflows/pages.yml   Tests, compilation wasm et déploiement Pages
```

Le module wasm expose une petite ABI C (`pc_init`, `pc_tick(dt, x, z)`, `pc_state_ptr/len`, …) sans `wasm-bindgen`. À chaque frame, Rust sérialise l'état visible dans un tampon `f32` que `main.js` relit directement depuis la mémoire du module.

## Lancer en local

```bash
rustup target add wasm32-unknown-unknown
cd core
cargo test --release
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/polar_camp_core.wasm ../web/game.wasm
cd ../web && python3 -m http.server 8000
# puis ouvre http://localhost:8000
```

## Publier sur GitHub Pages (une seule fois)

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
2. Pousse sur `main` (ou relance le workflow « Build & deploy to GitHub Pages » depuis l'onglet **Actions**).
3. Le jeu est en ligne sur `https://okidoki9903.github.io/WithSurvival/` : il ne te reste plus qu'à envoyer le lien à tes amis.

---
Projet de fan, sans lien avec Century Games ni *Whiteout Survival*. Tous les modèles 3D sont générés par le code.
