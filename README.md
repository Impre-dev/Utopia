# Utopia

Meta-theme for Zen Browser — glass, blur, transparent UI.
**Lineage**: [Nebula](https://github.com/JustADumbPrsn/Zen-Nebula) (JustADumbPrsn) → Nebula-Fork (Impre) → **Utopia** (Impre).

## Goal

Utopia is the consolidation project: absorb the custom CSS scattered across
`MyCss/`, Nebula-Fork and friends into one coherent theme, scoped to a target
pref combo:

- `zen.view.use-single-toolbar` = `false` (multi toolbars)
- `zen.view.compact.hide-toolbar` = `true` (compact: hide toolbar)

Changing layout prefs must never break the theme — it only applies when the
combo is active.

## What it keeps (from Nebula-Fork)

- Glass / blur effect (`backdrop-filter`)
- Transparent browser background (see wallpaper through UI)
- Semi-transparent tab backgrounds
- Transparent sidebar
- Glass URL bar when open
- Transparent `about:*` pages
- Pseudo-backgrounds behind titlebar / urlbar (JS overlays)
- Gradient slider patched to allow 0 opacity

## Install

In Zen Browser → Sine → **Add** → type `Impre-dev/Utopia`

> Coexists safely with Nebula-Fork (different attribute/var namespaces:
> `utopia-*` vs `nebula-*`), for A/B testing during migration.
