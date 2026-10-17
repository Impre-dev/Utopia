# Discovery — Utopia

> Registre des découvertes en attente de décision (cf. règle registre).
> La reco est à l'agent, la décision est à l'opérateur.

| ID | Date | Découverte | Constat / preuve | Reco | Statut | Décision |
|---|---|---|---|---|---|---|
| U-D1 | 10/10 | **Toggle de teinte du voile** : option Utopia pour changer la teinte globale de l'UI (`--utopia-browser-veil`, aujourd'hui blanc cassé `rgba(251,251,251,0.1)` en dark) selon humeur/setup — ex. blanc ↔ noir. | Demandée par Impre en discussion BG-Zen (splash adaptatif) ; la valeur du voile est aujourd'hui en dur dans userChrome.css. | Pref MCM (ex. `utopia.veil.mode`) pilotant `--utopia-browser-veil`, valeurs blanche/noire au minimum (slider opacité possible ensuite). Ne concerne QUE l'UI au repos — le loading screen aura sa teinte propre côté BG-Zen (`--bgzen-loading-tint`), indépendante. | 🆕 captée | |
| U-D2 | 17/10 | **Régression post-maj Zen 1.23.3b** : `[Utopia] Module "UtopiaTitlebarBackgroundModule" failed to init: TypeError: gZenCompactModeManager.addEventListener is not a function` (utopia.uc.js:32) — le module titlebar-background est mort | Console au démarrage, constaté pendant le diag U-D2 (icônes noires) | Adapter le module à la nouvelle API Zen 1.23.3b (gZenCompactModeManager a changé) — investiguer l'API dans browser/omni.ja | 🆕 captée | |
