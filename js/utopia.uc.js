// ==UserScript==
// @name           utopia.uc.js
// @description    Transparency engine for Utopia — pseudo-backgrounds & gradient slider
// @author         Impre (lineage: Nebula by JustADumbPrsn → Nebula-Fork → Utopia)
// @version        0.2.0
// @include        main
// @grant          none
// ==/UserScript==

(function () {
  "use strict";

  if (window.Utopia) {
    try {
      window.Utopia.destroy();
    } catch {}
  }

  window.Utopia = {
    _modules: [],
    _initialized: false,

    logger: {
      _prefix: "[Utopia]",
      log(msg) {
        console.log(`${this._prefix} ${msg}`);
      },
      warn(msg) {
        console.warn(`${this._prefix} ${msg}`);
      },
      error(msg) {
        console.error(`${this._prefix} ${msg}`);
      },
    },

    runOnLoad(callback) {
      if (document.readyState === "complete") callback();
      else
        document.addEventListener("DOMContentLoaded", callback, { once: true });
    },

    register(ModuleClass) {
      const name = ModuleClass?.name || "UnnamedModule";
      if (!ModuleClass) {
        this.logger.warn(`Module "${name}" is not defined, skipping.`);
        return;
      }
      if (this._modules.find((m) => m._name === name)) {
        this.logger.warn(`Module "${name}" already registered.`);
        return;
      }

      let instance;
      try {
        instance = new ModuleClass();
      } catch (err) {
        this.logger.error(`Module "${name}" failed to construct:\n${err}`);
        return;
      }

      instance._name = name;
      this._modules.push(instance);

      if (this._initialized && typeof instance.init === "function") {
        try {
          instance.init();
        } catch (err) {
          this.logger.error(`Module "${name}" failed to init:\n${err}`);
        }
      }
    },

    observePresence(selector, attrName) {
      const update = () => {
        const found = !!document.querySelector(selector);
        document.documentElement.toggleAttribute(attrName, found);
      };
      const observer = new MutationObserver(update);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      update();
      return observer;
    },

    init() {
      this.logger.log("Initializing transparency engine...");
      this._initialized = true;
      this.runOnLoad(() => {
        this._modules.forEach((m) => {
          try {
            m.init?.();
          } catch (err) {
            this.logger.error(`Module "${m._name}" failed to init:\n${err}`);
          }
        });
      });
      window.addEventListener("unload", () => this.destroy(), { once: true });
    },

    destroy() {
      this._modules.forEach((m) => {
        try {
          m.destroy?.();
        } catch (err) {
          this.logger.error(`Module "${m._name}" failed to destroy:\n${err}`);
        }
      });
      this.logger.log("All modules destroyed.");
      delete window.Utopia;
    },
  };

  // ========== UtopiaPolyfillModule ==========
  // Detects compact mode and toolbar modes, sets attributes on <html>
  // Required by the CSS for correct transparency positioning.

  class UtopiaPolyfillModule {
    constructor() {
      this.root = document.documentElement;
      this.compactObserver = null;
      this.modeObserver = null;
    }

    async init() {
      if (!window.gBrowser) {
        await new Promise((resolve) => {
          const check = setInterval(() => {
            if (window.gBrowser?.tabContainer) {
              clearInterval(check);
              resolve();
            }
          }, 50);
        });
      }

      this.compactObserver = Utopia.observePresence(
        '[zen-compact-mode="true"]',
        "utopia-compact-mode",
      );

      this.modeObserver = new MutationObserver(() => this.updateToolbarModes());
      this.modeObserver.observe(this.root, { attributes: true });
      this.updateToolbarModes();

      Utopia.logger.log("[Polyfill] Detection active.");
    }

    updateToolbarModes() {
      const hasSidebar = this.root.hasAttribute("zen-sidebar-expanded");
      const isSingle = this.root.hasAttribute("zen-single-toolbar");

      this.root.toggleAttribute("utopia-single-toolbar", isSingle);
      this.root.toggleAttribute(
        "utopia-multi-toolbar",
        hasSidebar && !isSingle,
      );
      this.root.toggleAttribute(
        "utopia-collapsed-toolbar",
        !hasSidebar && !isSingle,
      );
    }

    destroy() {
      this.compactObserver?.disconnect();
      this.modeObserver?.disconnect();

      this.root.removeAttribute("utopia-compact-mode");
      this.root.removeAttribute("utopia-single-toolbar");
      this.root.removeAttribute("utopia-multi-toolbar");
      this.root.removeAttribute("utopia-collapsed-toolbar");

      Utopia.logger.log("[Polyfill] Destroyed.");
    }
  }

  // ========== UtopiaGradientSliderModule ==========
  // Patches the Zen gradient opacity slider to allow 0 (full transparent).

  class UtopiaGradientSliderModule {
    constructor() {
      this.root = document.documentElement;
      this.gradientSlider = null;
      this._patched = false;
      this._sliderHandler = this.sync.bind(this);
      this._origMethods = new WeakMap();
    }

    init() {
      this._waitFor(
        () => document.querySelector("#PanelUI-zen-gradient-generator-opacity"),
        (slider) => {
          this.gradientSlider = slider;
          slider.min = 0.0;
          slider.addEventListener("input", this._sliderHandler);
          this.sync();
          this._patchThemePicker();
        },
      );
    }

    _waitFor(fn, callback, maxRetries = 40) {
      let retries = maxRetries;
      const tryFind = () => {
        const el = fn();
        if (el) return callback(el);
        if (retries-- > 0) {
          requestAnimationFrame(tryFind);
        } else {
          Utopia.logger.error("[GradientSlider] Target not found.");
        }
      };
      tryFind();
    }

    sync() {
      if (!this.gradientSlider) return;
      const val = +this.gradientSlider.value;
      this.root.style.setProperty(
        "--utopia-gradient-opacity",
        val === 0 ? "0" : null,
      );
    }

    _patchThemePicker() {
      if (this._patched) return;

      this._waitFor(
        () =>
          window.nsZenThemePicker?.prototype ||
          window.browser?.gZenThemePicker?.constructor?.prototype,
        (proto) => {
          if (!proto?.blendWithWhiteOverlay) return;

          this._origMethods.set(proto, proto.blendWithWhiteOverlay);

          const moduleInstance = this;

          proto.blendWithWhiteOverlay = function (baseColor, opacity) {
            const val = +moduleInstance.gradientSlider?.value ?? opacity;
            if (val === 0) {
              if (Array.isArray(baseColor)) {
                return `rgba(${baseColor.join(",")},0)`;
              }
              if (
                typeof baseColor === "string" &&
                baseColor.startsWith("rgb")
              ) {
                return baseColor.replace(/rgb(a)?\(([^)]+)\)/, "rgba($2, 0)");
              }
              return "rgba(0,0,0,0)";
            }
            return moduleInstance._origMethods
              .get(proto)
              .call(this, baseColor, opacity);
          };

          this._patched = true;
          Utopia.logger.log("[GradientSlider] Patched blendWithWhiteOverlay");
        },
      );
    }

    destroy() {
      if (this.gradientSlider) {
        this.gradientSlider.removeEventListener("input", this._sliderHandler);
        this.gradientSlider = null;
      }

      if (this._patched) {
        const proto =
          window.nsZenThemePicker?.prototype ||
          window.browser?.gZenThemePicker?.constructor?.prototype;
        if (proto && this._origMethods.has(proto)) {
          proto.blendWithWhiteOverlay = this._origMethods.get(proto);
          this._origMethods.delete(proto);
        }
        this._patched = false;
      }

      this.root.style.removeProperty("--utopia-gradient-opacity");
      Utopia.logger.log("[GradientSlider] Destroyed");
    }
  }

  // ========== UtopiaTitlebarBackgroundModule ==========
  // Creates a pseudo-background div behind the titlebar in compact mode
  // so the glass blur has something to render against.

  class UtopiaTitlebarBackgroundModule {
    constructor() {
      this.root = document.documentElement;
      this.browser = document.getElementById("browser");
      this.titlebar = document.getElementById("titlebar");
      this.overlay = null;
      this.lastRect = {};
      this.lastVisible = false;
      this.animationFrameId = null;

      this.update = this.update.bind(this);
      this._compactCallback = this._compactCallback.bind(this);
    }

    init() {
      if (!this.browser || !this.titlebar) {
        Utopia.logger.warn("[TitlebarBackground] Required elements not found.");
        return;
      }

      this.overlay = document.createElement("div");
      this.overlay.id = "Utopia-titlebar-background";
      Object.assign(this.overlay.style, {
        position: "absolute",
        display: "none",
      });
      this.browser.appendChild(this.overlay);

      gZenCompactModeManager.addEventListener(this._compactCallback);

      if (this.root.hasAttribute("utopia-compact-mode")) {
        this.startLiveTracking();
      }

      Utopia.logger.log("[TitlebarBackground] Tracking initialized.");
    }

    _compactCallback() {
      const isCompact = this.root.hasAttribute("utopia-compact-mode");
      if (isCompact) {
        this.startLiveTracking();
      } else {
        this.stopLiveTracking();
        this.hideOverlay();
      }
    }

    update() {
      const isCompact = this.root.hasAttribute("utopia-compact-mode");

      if (!isCompact) {
        this.stopLiveTracking();
        this.hideOverlay();
        return;
      }

      const rect = this.titlebar.getBoundingClientRect();
      const style = getComputedStyle(this.titlebar);

      const isVisible =
        rect.width > 5 &&
        rect.height > 5 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight;

      const changed =
        rect.top !== this.lastRect.top ||
        rect.left !== this.lastRect.left ||
        rect.width !== this.lastRect.width ||
        rect.height !== this.lastRect.height;

      if (!changed && this.lastVisible === isVisible) {
        this.animationFrameId = requestAnimationFrame(this.update);
        return;
      }

      this.lastRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      if (isVisible) {
        Object.assign(this.overlay.style, {
          top: `${rect.top + window.scrollY}px`,
          left: `${rect.left + window.scrollX}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          display: "block",
        });

        if (!this.lastVisible) {
          this.overlay.classList.add("visible");
          this.lastVisible = true;
        }
      } else {
        this.hideOverlay();
      }

      this.animationFrameId = requestAnimationFrame(this.update);
    }

    hideOverlay() {
      if (this.lastVisible) {
        this.overlay.classList.remove("visible");
        this.overlay.style.display = "none";
        this.lastVisible = false;
      }
    }

    startLiveTracking() {
      this.stopLiveTracking();
      this.update();
    }

    stopLiveTracking() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    destroy() {
      gZenCompactModeManager.removeEventListener(this._compactCallback);
      this.stopLiveTracking();
      this.hideOverlay();
      this.overlay?.remove();
      this.overlay = null;
      Utopia.logger.log("[TitlebarBackground] Destroyed.");
    }
  }

  // ========== UtopiaURLBarBackgroundModule ==========
  // Creates a pseudo-background div behind the urlbar when it's open.

  class UtopiaURLBarBackgroundModule {
    constructor() {
      this.root = document.documentElement;
      this.browser = document.getElementById("browser");
      this.urlbar = document.getElementById("urlbar");
      this.overlay = null;
      this.lastRect = {};
      this.lastVisible = false;
      this.animationFrameId = null;

      this.update = this.update.bind(this);
      this.mutationObserver = null;
    }

    init() {
      if (!this.browser || !this.urlbar) {
        Utopia.logger.warn("[URLBarBackground] Required elements not found.");
        return;
      }

      this.overlay = document.createElement("div");
      this.overlay.id = "Utopia-urlbar-background";
      Object.assign(this.overlay.style, {
        position: "absolute",
        display: "none",
      });
      this.browser.appendChild(this.overlay);

      this.mutationObserver = new MutationObserver(() => this.onMutation());
      this.mutationObserver.observe(this.urlbar, {
        attributes: true,
        attributeFilter: ["open"],
      });

      if (this.urlbar.hasAttribute("open")) {
        this.startLiveTracking();
      }

      Utopia.logger.log("[URLBarBackground] Tracking initialized.");
    }

    onMutation() {
      const isOpen = this.urlbar.hasAttribute("open");
      if (isOpen) {
        this.startLiveTracking();
      } else {
        this.stopLiveTracking();
        this.hideOverlay();
      }
    }

    update() {
      const isOpen = this.urlbar.hasAttribute("open");
      if (!isOpen) {
        this.stopLiveTracking();
        this.hideOverlay();
        return;
      }

      const rect = this.urlbar.getBoundingClientRect();
      const style = getComputedStyle(this.urlbar);

      const isVisible =
        rect.width > 5 &&
        rect.height > 5 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight;

      const changed =
        rect.top !== this.lastRect.top ||
        rect.left !== this.lastRect.left ||
        rect.width !== this.lastRect.width ||
        rect.height !== this.lastRect.height;

      if (!changed && this.lastVisible === isVisible) {
        this.animationFrameId = requestAnimationFrame(this.update);
        return;
      }

      this.lastRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      if (isVisible) {
        Object.assign(this.overlay.style, {
          top: `${rect.top + window.scrollY}px`,
          left: `${rect.left + window.scrollX}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          display: "block",
        });

        if (!this.lastVisible) {
          this.overlay.classList.add("visible");
          this.lastVisible = true;
        }
      } else {
        this.hideOverlay();
      }

      this.animationFrameId = requestAnimationFrame(this.update);
    }

    hideOverlay() {
      if (this.lastVisible) {
        this.overlay.classList.remove("visible");
        this.overlay.style.display = "none";
        this.lastVisible = false;
      }
    }

    startLiveTracking() {
      this.stopLiveTracking();
      this.update();
    }

    stopLiveTracking() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    destroy() {
      this.mutationObserver?.disconnect();
      this.stopLiveTracking();
      this.hideOverlay();
      this.overlay?.remove();
      this.overlay = null;
      Utopia.logger.log("[URLBarBackground] Destroyed.");
    }
  }

  // ========== Register Modules ==========
  Utopia.register(UtopiaPolyfillModule);
  Utopia.register(UtopiaGradientSliderModule);
  Utopia.register(UtopiaTitlebarBackgroundModule);
  Utopia.register(UtopiaURLBarBackgroundModule);
  // (CtrlTabDualBackground : migré vers NavBtn — doctrine mods,
  // cf plans/doctrine-mods.md. Module supprimé.)

  // Start
  Utopia.init();
})();
