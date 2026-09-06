# Roadmap Utopia

> Document de pilotage — statut au 06/09. La SPEC reste la référence
> architecture ; ce fichier est la file de travail priorisée.

## 🎯 Cible produit

Utopia = méta-thème Zen qui **regroupe tout le CSS custom dispersé** (MyCss/,
Nebula-Fork, thèmes marketplace) en un mod Sine unique, **scopé au combo de
prefs** : `zen.view.use-single-toolbar=false` (multi-toolbars) +
`zen.view.compact.hide-toolbar=true` (compact masquer-toolbar). Changer de
layout désactive le thème proprement, sans rien casser.

**Contrainte** (06/09) : Utopia ne cible que le **thème dark** de Zen. Les
valeurs dark des `light-dark()` sont celles qui comptent ; les valeurs light
sont du ballast hérité du fork (à nettoyer au fil de l'eau, pas une priorité).

## ✅ Livré & poussé

| Version | Contenu | Commit |
|---|---|---|
| 0.1.0 | Fork initial : copie renommée de Nebula-Fork (`NebulaFork`→`Utopia`, `nebula-*`→`utopia-*` : attributs, vars CSS, ids overlays, log prefix). Cohabite avec Nebula-Fork (namespaces disjoints) pour A/B. Push squelette (code = copie du fork validé en runtime, renommage vérifié statiquement) ; validation visuelle = point 1 de la file. | `fab0167` |
| 0.1.1 | Premier install validé (Sine UI + restart + rendu OK, cohabitation avec le fork). Réglages cœurs dark d'Impre : `--utopia-ui-tint` dark → `rgba(0,0,0,0)` (tint neutralisé) et `--utopia-browser-veil` dark → `rgba(251,251,251,0.1)` (voile blanc cassé au lieu du noir 40%). Validé visuellement en live. Contrainte actée : Utopia = dark-only. | `f231445` |
| 0.2.0 | Quête annexe : §3b (sidebar glass hover) scopé `@media (-moz-pref('zen.view.compact.hide-tabbar'))` — actif uniquement dans les modes compact à sidebar masquée (« masquer barre latérale », « masquer les 2 »), désactivé dans le combo cible où la sidebar est permanente. Validé visuellement les 2 états (mode courant + masquer-sidebar). | `a767258` |
| 0.3.0 | États des tabs (spéc 06/09) : §6 rewrite (classique/pinned : idle transparent / hover 3% / actif 10%) + §6b (essentials : idle 3% / hover 5% / actif 10%) + favicons essentials 32px + `--min-essentials-width-wrap` à +0px et `column-gap: 0` (réglages Impre). Audit vars : 5 mortes purgées (`--utopia-glass`, `-color-min`, `-color-hover`, `-color-selected`, `-gradient-opacity`), 5 vars d'état créées. Bug actifs corrigé : Zen pose `selected`/`visuallyselected` en **attributs booléens vides** → sélecteurs sur la présence (`:is([selected], [visuallyselected])`), chemin complet `.tab-stack .tab-background` + `:not([zen-essential])`. Diagnostic console prouvé (attr vide, bg rendu transparent, aucun calque externe). Validé visuellement les 6 états × 2 types. | `7fa1e9c` |
| 0.4.0 | Tab folders (§6c) : anim `folder-sweep` (gradient 12s, Custom.css) retirée, remplacée par états statiques sur le `::before` du `.tab-group-label-container` — fermé idle 3% / hover fermé 5% / **ouvert 10%** via `zen-folder:not([collapsed])` (attribut `collapsed` booléen vide = fermé, prouvé console via MutationObservers). Border folder → transparent (réglage Impre). Ajust Impre : tabs/essentials actifs 10% → **15%**. Règles chirurgicales Custom.css 152-194 (géométrie ::before) préservées. Validé visuellement fermé/hover/ouvert. | `4208886` |

## 🎯 File priorisée

### 1. Scoping au combo de prefs cible ⭐
**Demande** : « le thème ne s'applique que quand le combo est actif »
**Mécanisme** : template déjà en bas de `MyCss/test.css` — `@media not (-moz-pref("zen.view.use-single-toolbar"))` + `@media (-moz-pref("zen.view.compact.hide-toolbar"))` + `:root[utopia-compact-mode="true"]` (l'attribut est déjà posé par le polyfill JS).
**Question ouverte** : scoper TOUT le CSS (§1-§8) ou seulement les sections layout-dépendantes ? Le glass/blur global est indépendant du layout.

### 2. Bordure du conteneur web (bloc A de test.css) en option
**Demande** : bordure/ombre autour de la page web à retirer — coupable identifié : ombre native Zen sur `hbox.browserSidebarContainer` / `#zen-tabbox-wrapper` (bloc A de test.css, validé 06/09). Pour l'instant on la garde.
**Implémentation** : en faire une pref Utopia (`utopia-no-content-border`) avec `@media -moz-pref`, déprécier le bloc A de test.css une fois migré.

### 3. Migration MyCss/ → Utopia
**Demande** : regrouper le CSS custom dans le thème.
**Périmètre** : `MyCss/Custom.css` (304 l, tweaks UI), `MyCss/urlbar.css`. `Loading.css` appartient à BG-Zen (boot splash) → ne pas absorber.
**Réfs croisées à patcher à la bascule** : `Custom.css:212` utilise `var(--nebula-color-min)` → passer à `--utopia-color-min` ; `userChrome.css` se videra de ses imports au fil de l'absorption.

### 4. Bascule finale : désactiver Nebula-Fork
**Mécanisme** : patcher les dépendances réelles AVANT désactivation :
- `BG-Zen/chrome.css` : `html[nebula-compact-mode]` (4 sélecteurs) → `utopia-compact-mode` ; `var(--nebula-browser-veil)`/`var(--nebula-ui-tint)` → `utopia-*` (fallbacks déjà présents sur certains usages)
- `MyCss/Custom.css:212` : cf. point 4
- Dupliquer les valeurs des prefs `nebula-*` de prefs.js en `utopia-*` si des prefs Nebula finissent par exister dans Utopia (aucune aujourd'hui — le fork n'en a pas, seules celles du Nebula original existent : `nebula-urlbar-animation` etc., non lues par Utopia)
**navbtn** : réfs nebula uniquement en commentaires → rien à faire.

### 5. Enquête : règle morte `[utopia-zen-gradient-contrast-zero]`
**Mécanisme** : ce sélecteur (hérité de Nebula via le fork) n'est posé par AUCUN module du fork — le JS pose `--utopia-gradient-opacity` mais aucune règle CSS ne la consomme, et l'attribut n'est jamais setté. Soit le pipeline transparent-du-gradient est cassé depuis le fork, soit c'est du mort hérité. À éclaircir quand on touchera au gradient slider.

## 🧠 Leçons de plateforme

1. **La bordure du conteneur web est une ombre native** (`box-shadow` sur `hbox.browserSidebarContainer` / `#zen-tabbox-wrapper`), pas un `border` de `#browser` — un `border:none` sur `#browser` ne fait rien (tentative Custom.css:33). Preuve : bloc A de test.css validé 06/09.
2. **Zen expose ses prefs au CSS par 2 mécanismes** : attributs dynamiques sur `:root` (`zen-single-toolbar`, `zen-compact-mode`, `zen-sidebar-expanded`, `zen-right-side`) et media queries `@media (-moz-pref("..."))` (statiques, à l'install). Le combo des deux = scoping fiable.
3. **`zen-compact-mode="true"` (attribut) ≠ `zen.view.compact.*` (prefs)** : l'attribut reflète l'état compact réellement actif (toggle dynamique), les prefs la configuration choisie. Scoper sur l'attribut pour réagir au toggle en live.
4. **Nebula-Fork et Utopia cohabitent sans conflit** : attributs/vars/ids préfixés différemment (`nebula-*`/`utopia-*`), valeurs identiques → dernière définition chargée gagne sans casse. Validé par analyse 06/09 (validation runtime au point 1 de la file).
5. **Discrimination des 3 modes compact par une seule pref** : « masquer la barre latérale » et « masquer les 2 » ont `zen.view.compact.hide-tabbar=true` ; seul « masquer la barre d'outils » l'a à `false` → un `@media (-moz-pref(...hide-tabbar))` suffit pour cibler « sidebar masquée/révélée au hover » vs « sidebar permanente ». Prouvé par validation 0.2.0 (06/09). Conséquence : BG-Zen (qui dépend du §3b via sa copie wallpaper hover) devra recevoir le même scoping à sa bascule vers utopia.
6. **`selected`/`visuallyselected` (tabs) et `collapsed` (zen-folder) sont des attributs booléens VIDES** (`selected=""`, pas `selected="true"` — prouvé en console 06/09 via getComputedStyle + dump attributs, puis MutationObservers pour `collapsed`). Conséquence : `[attr='true']` ne matche jamais → les états ne s'appliquent pas silencieusement. Contournement : matcher la présence (`:is([selected], [visuallyselected])`) ou l'absence (`zen-folder:not([collapsed])` = ouvert). Caspiège `collapsed` : il marque l'état FERMÉ (inverse de l'intuition « attribut = ouvert »). Leçon générale : quand une règle d'état ne s'applique pas, dumper `[...el.attributes]` en console (avec MutationObserver pour les toggles) avant d'incriminer la spécificité.
