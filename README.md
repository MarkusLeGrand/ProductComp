# ProductComp — BoucherCompare

> Extension Chrome (Manifest V3) qui affiche, directement sur les boucheries en ligne, si le prix au kilo d'un produit est **pas cher**, **médian** ou **cher**, en le comparant au reste du catalogue et à des prix de référence du marché.

## À propos

En boucherie en ligne, comparer des prix est difficile : les produits sont vendus au poids, à la pièce, par barquette, et les races ou labels varient d'un produit à l'autre. BoucherCompare lit les fiches produits des sites supportés, en déduit le **prix au kilo**, identifie la **pièce de viande** (entrecôte, magret, gigot…) et la **race / le label** (Wagyu, Aubrac, Label Rouge…), puis injecte un badge coloré sur chaque carte produit.

Le verdict combine deux signaux :

1. **Le catalogue** : la moyenne des prix au kilo des produits de la même pièce (et, si possible, de la même race) vus sur le site — utilisée dès qu'il y a au moins 3 produits comparables ;
2. **Le marché** : des prix de référence « stade détail » par pièce, inspirés du RNM (Réseau des Nouvelles des Marchés, FranceAgriMer), fournis dans `data/reference_prices.json`.

> ⚠️ Les prix de référence sont pour l'instant des **valeurs saisies en dur** (ordres de grandeur des moyennes nationales, mis à jour le 2026-04-20), et non un import automatique des données RNM — voir le champ `_meta` du fichier.

Sites supportés :
- **maison-lascours.fr** (boutique Shopify) — analyse de la page courante ;
- **pourdebon.com** (marketplace multi-vendeurs) — mode « accumulateur » : chaque page visitée enrichit un catalogue persistant, ce qui permet de classer les vendeurs entre eux.

## Fonctionnalités

- **Badges sur les cartes produits** : « Pas cher » (ratio ≤ 0,95), « Prix médian » (≤ 1,20) ou « Cher », avec contour coloré de la carte et écarts détaillés (`cat +12 %`, `marché −5 %`). Une info-bulle donne la moyenne catalogue et la moyenne marché en €/kg.
- **Calcul du prix au kilo** : lecture d'une mention explicite « X €/kg », sinon inférence à partir du prix et du poids indiqué dans le titre (g / kg).
- **Reconnaissance des produits** : dictionnaire de ~165 expressions régulières couvrant 11 familles (bœuf, veau, porc, agneau, volaille, canard, charcuterie, lapin, gibier, abats, légumes) et 35 races, origines et labels (Wagyu, Aubrac, Limousine, Ibérique, Bresse, Label Rouge, Bio, AOP, IGP…).
- **Comparaison à race égale** quand c'est possible (Wagyu vs Wagyu), sinon par pièce générique.
- **Popup** : résumé par niveau de prix (filtrable en un clic), liste triée du moins cher au plus cher, recherche (pièce, titre, vendeur), interrupteur pour masquer/afficher les badges sur la page, et bouton pour vider le catalogue accumulé (pourdebon).
- **Récapitulatif panier** : sur les pages panier, un panneau flottant indique le nombre d'articles, le poids total, le prix moyen au kilo et le total.
- **Re-scan automatique** des pages chargées dynamiquement (filtres, pagination) via un `MutationObserver` avec anti-rebond de 600 ms.
- **Désactivation sur les pages de paiement** (checkout, commande, confirmation…) : aucune lecture ni modification de la page.

## Stack technique

- **JavaScript** vanilla (aucune dépendance, aucun build)
- **Chrome Extension Manifest V3** : content scripts, popup d'action, `chrome.storage.local`, messagerie `chrome.runtime` / `chrome.tabs`
- **HTML / CSS** pour la popup et les badges injectés
- Données de référence en **JSON** (`web_accessible_resources`)

Permissions demandées : `storage`, `activeTab`, et un accès limité aux domaines `maison-lascours.fr` et `pourdebon.com`.

## Installation & lancement

L'extension n'est pas publiée sur le Chrome Web Store ; elle se charge en mode développeur :

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/MarkusLeGrand/ProductComp.git
   ```
2. Ouvrir `chrome://extensions` dans Chrome (ou tout navigateur Chromium : Edge, Brave…).
3. Activer le **Mode développeur** (en haut à droite).
4. Cliquer sur **« Charger l'extension non empaquetée »** et sélectionner le dossier du dépôt (celui qui contient `manifest.json`).
5. Ouvrir une page de collection sur `maison-lascours.fr` ou une page de recherche sur `pourdebon.com` : les badges apparaissent sur les cartes produits. Cliquer sur l'icône de l'extension pour ouvrir la popup.

Après une modification du code, cliquer sur le bouton de rechargement de l'extension dans `chrome://extensions` puis recharger la page du site.

**Débogage** : le content script journalise ses résultats dans la console (`[BoucherCompare] …`, tableau `console.table`) et expose `window.__BoucherCompareDebug`. Le fichier `debug-snippet.js` est un script à coller manuellement dans la console DevTools pour inspecter les sélecteurs d'une page ; il n'est pas chargé par l'extension.

## Architecture

```
ProductComp/
├── manifest.json              # Manifest V3 : permissions, content scripts, popup
├── content.js                 # Orchestrateur : scan, classement, badges, panier, stockage
├── content.css                # Styles des badges et du panneau panier
├── lib/
│   ├── matcher.js             # Titre → { catégorie, pièce, race } (regex)
│   ├── classify.js            # Stats catalogue + ratio marché → verdict
│   └── badge.js               # Injection du badge dans une carte produit
├── sites/
│   ├── lascours.js            # Adaptateur Maison Lascours (sélecteurs Shopify)
│   └── pourdebon.js           # Adaptateur pourdebon (heuristique depuis « € / kg »)
├── data/
│   └── reference_prices.json  # Prix de référence €/kg (avg / min / max par pièce)
├── popup.html / popup.js / popup.css   # Interface de la popup
└── debug-snippet.js           # Outil de debug manuel (hors extension)
```

**Pipeline d'analyse** (`content.js`) :

1. Chaque adaptateur de site ne s'active que sur son domaine et expose `window.BoucherCompareSite` avec `findProducts()` et `extractProduct()` (titre, URL, prix au kilo, vendeur).
2. `BoucherCompareMatcher.match()` identifie catégorie, pièce et race à partir du titre.
3. `BoucherCompareClassify.computeCutStats()` calcule min / max / moyenne par pièce (et par pièce + race) sur les produits de la page — plus le catalogue accumulé pour pourdebon.
4. `classify()` fait la moyenne du ratio catalogue et du ratio marché, puis applique les seuils.
5. `BoucherCompareBadge.inject()` dessine le badge ; les résultats sont enregistrés dans `chrome.storage.local` (`lastScan`, `catalog`) pour être relus par la popup.

Ajouter un site revient à écrire un nouvel adaptateur dans `sites/` et à déclarer son domaine dans `manifest.json` (content scripts, `host_permissions`, `web_accessible_resources`) ainsi que dans `siteIdFromUrl()` de `popup.js`.

## Pistes d'amélioration

- Remplacer les prix de référence codés en dur par un import automatique du jeu de données RNM (data.gouv.fr), comme prévu dans `_meta.note`.
- Éviter de relancer un scan à chaque injection de badge (le `MutationObserver` observe aussi les modifications faites par l'extension elle-même).
- Harmoniser la détection de domaine Maison Lascours : l'adaptateur accepte `maisonlascours.fr`, mais le manifest ne déclare que `maison-lascours.fr`.
- Ajouter des icônes d'extension et un fichier de licence.
- Ajouter des tests unitaires sur `matcher.js` et `classify.js` (fonctions pures, faciles à tester).
- Rendre les seuils « Pas cher / Cher » configurables depuis la popup, et gérer d'autres sites via des adaptateurs supplémentaires.
