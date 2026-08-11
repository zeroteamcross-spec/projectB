(function bootstrapThemeRuntime(global) {
  var DEFAULT_THEME = {
    brand: {
      appName: "BeliMobil",
      shortMark: "BM",
      tagline: "Jual beli mobil terpercaya",
      logoIcon: "brandMark",
      logoMarkAsset: "brand.logoMark",
    },
    contact: {
      whatsapp: "",
    },
    // Palet tiga rona: biru #1e81b0 (primary), peach #eab676 (accent), krem
    // #faf4ed (kanvas). `secondary` sengaja diisi shade biru yang lebih gelap,
    // bukan peach: slot itu dipakai sebagai warna TEKS brand di seratusan
    // tempat, dan peach di atas putih tidak terbaca. Jadi tetap tiga rona,
    // hanya birunya punya versi gelap untuk teks.
    colors: {
      primary: "#1e81b0",
      secondary: "#17698f",
      accent: "#eab676",
      pageBg: "#faf4ed",
      surface: "#ffffff",
      surfaceMuted: "#faf4ed",
      inset: "#f5ece1",
      text: "#1c1917",
      textStrong: "#2f2a26",
      textMuted: "#6f665e",
      border: "#e7dccd",
      borderStrong: "#d8c9b4",
      overlay: "rgba(28, 25, 23, 0.55)",
      success: "#15803d",
      warning: "#b45309",
      danger: "#b91c1c",
      info: "#1e81b0",
      publicCanvasStart: "#ffffff",
      publicCanvasMid: "#faf4ed",
      publicCanvasEnd: "#f5ece1",
    },
    shell: {
      publicHeaderBg: "rgba(255, 255, 255, 0.92)",
      appHeaderBg: "rgba(255, 255, 255, 0.95)",
      sidebarStart: "#1e81b0",
      sidebarEnd: "#17698f",
      navActiveBg: "rgba(255, 255, 255, 0.18)",
      navText: "#ffffff",
    },
    // Tombol primary adalah tombol "Ya" (aksi maju), jadi hijau. Merah untuk
    // "Tidak" diambil dari colors.danger lewat varian tombol.
    button: {
      primaryFrom: "#15803d",
      primaryTo: "#1a9a49",
      secondaryBg: "#ffffff",
      secondaryText: "#17698f",
      ghostText: "#17698f",
    },
    surface: {
      cardBg: "#ffffff",
      cardBorder: "#e7dccd",
      panelBg: "#ffffff",
      insetBg: "#faf4ed",
    },
    form: {
      searchBg: "#ffffff",
      inputBg: "#ffffff",
      controlBorder: "#d8c9b4",
      focus: "#1e81b0",
      chipBg: "#ffffff",
      chipText: "#4a423b",
      chipActiveFrom: "#1e81b0",
      chipActiveTo: "#17698f",
    },
    state: {
      emptyBg: "#ffffff",
      errorBg: "#ffffff",
      errorBorder: "#f0c9c9",
      badgeNeutralBg: "#f3ece3",
    },
    layout: {
      spacingScale: 1,
      radiusScale: 1,
      shadowDepth: 1,
    },
  };

  var currentTheme = deepMerge(DEFAULT_THEME, global.__PROJECTB_THEME__ || {});

  function deepMerge(base, override) {
    var source = isObject(base) ? clone(base) : {};
    var patch = isObject(override) ? override : {};

    Object.keys(patch).forEach(function mergeKey(key) {
      if (isObject(source[key]) && isObject(patch[key])) {
        source[key] = deepMerge(source[key], patch[key]);
        return;
      }

      source[key] = patch[key];
    });

    return source;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function normalize(theme) {
    var merged = deepMerge(DEFAULT_THEME, theme || {});
    merged.brand.appName = stringOr(merged.brand.appName, DEFAULT_THEME.brand.appName);
    merged.brand.shortMark = stringOr(merged.brand.shortMark, DEFAULT_THEME.brand.shortMark);
    merged.brand.tagline = stringOr(merged.brand.tagline, DEFAULT_THEME.brand.tagline);
    merged.brand.logoIcon = stringOr(merged.brand.logoIcon, DEFAULT_THEME.brand.logoIcon);
    merged.brand.logoMarkAsset = stringOr(merged.brand.logoMarkAsset, DEFAULT_THEME.brand.logoMarkAsset);
    merged.contact.whatsapp = stringOr(merged.contact.whatsapp, DEFAULT_THEME.contact.whatsapp);

    normalizeColorGroup(merged.colors, DEFAULT_THEME.colors, [
      "primary",
      "secondary",
      "accent",
      "pageBg",
      "surface",
      "surfaceMuted",
      "inset",
      "text",
      "textStrong",
      "textMuted",
      "border",
      "borderStrong",
      "success",
      "warning",
      "danger",
      "info",
      "publicCanvasStart",
      "publicCanvasMid",
      "publicCanvasEnd",
    ]);
    merged.colors.overlay = paintOr(merged.colors.overlay, DEFAULT_THEME.colors.overlay);

    normalizeColorGroup(merged.shell, DEFAULT_THEME.shell, [
      "sidebarStart",
      "sidebarEnd",
      "navText",
    ]);
    merged.shell.publicHeaderBg = paintOr(merged.shell.publicHeaderBg, DEFAULT_THEME.shell.publicHeaderBg);
    merged.shell.appHeaderBg = paintOr(merged.shell.appHeaderBg, DEFAULT_THEME.shell.appHeaderBg);
    merged.shell.navActiveBg = paintOr(merged.shell.navActiveBg, DEFAULT_THEME.shell.navActiveBg);

    normalizeColorGroup(merged.button, DEFAULT_THEME.button, [
      "primaryFrom",
      "primaryTo",
      "secondaryBg",
      "secondaryText",
      "ghostText",
    ]);
    normalizeColorGroup(merged.surface, DEFAULT_THEME.surface, [
      "cardBg",
      "cardBorder",
      "panelBg",
      "insetBg",
    ]);
    normalizeColorGroup(merged.form, DEFAULT_THEME.form, [
      "searchBg",
      "inputBg",
      "controlBorder",
      "focus",
      "chipBg",
      "chipText",
      "chipActiveFrom",
      "chipActiveTo",
    ]);
    normalizeColorGroup(merged.state, DEFAULT_THEME.state, [
      "emptyBg",
      "errorBg",
      "errorBorder",
      "badgeNeutralBg",
    ]);
    merged.layout.spacingScale = numberOr(merged.layout.spacingScale, 1);
    merged.layout.radiusScale = numberOr(merged.layout.radiusScale, 1);
    merged.layout.shadowDepth = numberOr(merged.layout.shadowDepth, 1);
    return merged;
  }

  function numberOr(value, fallback) {
    var next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function stringOr(value, fallback) {
    var next = String(value || "").trim();
    return next ? next : fallback;
  }

  function normalizeColorGroup(group, defaults, keys) {
    keys.forEach(function normalizeColorKey(key) {
      group[key] = colorOr(group[key], defaults[key]);
    });
  }

  function colorOr(value, fallback) {
    var next = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(next)) {
      return next;
    }
    return fallback;
  }

  function paintOr(value, fallback) {
    var next = String(value || "").trim();
    if (!next) {
      return fallback;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(next)) {
      return next;
    }
    if (/^rgba?\([^)]+\)$/i.test(next)) {
      return next;
    }
    if (/^linear-gradient\([^)]+\)$/i.test(next)) {
      return next;
    }
    return fallback;
  }

  function mix(hex, ratio, base) {
    var a = toRgb(hex);
    var b = toRgb(base);

    if (!a || !b) {
      return hex;
    }

    return toHex({
      r: Math.round(a.r * ratio + b.r * (1 - ratio)),
      g: Math.round(a.g * ratio + b.g * (1 - ratio)),
      b: Math.round(a.b * ratio + b.b * (1 - ratio)),
    });
  }

  function darken(hex, amount) {
    var rgb = toRgb(hex);

    if (!rgb) {
      return hex;
    }

    return toHex({
      r: Math.max(0, Math.round(rgb.r * (1 - amount))),
      g: Math.max(0, Math.round(rgb.g * (1 - amount))),
      b: Math.max(0, Math.round(rgb.b * (1 - amount))),
    });
  }

  function toRgb(hex) {
    var value = String(hex || "").trim().replace("#", "");

    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
      return null;
    }

    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function toHex(rgb) {
    return "#" + [rgb.r, rgb.g, rgb.b].map(function mapChannel(channel) {
      return String(channel.toString(16)).padStart(2, "0");
    }).join("");
  }

  function spacing(scale, base) {
    return Math.max(8, Math.round(base * scale)) + "px";
  }

  function radius(scale, base) {
    return Math.max(6, Math.round(base * scale)) + "px";
  }

  function shadow(theme) {
    var depth = numberOr(theme.layout.shadowDepth, 1);
    return {
      soft: "0 8px 20px rgba(15, 23, 42, " + (0.06 * depth) + ")",
      card: "0 18px 45px rgba(15, 23, 42, " + (0.14 * depth) + "), 0 8px 18px rgba(15, 23, 42, " + (0.08 * depth) + ")",
      elevated: "0 24px 55px rgba(15, 23, 42, " + (0.18 * depth) + "), 0 12px 24px rgba(15, 23, 42, " + (0.12 * depth) + ")",
    };
  }

  function themeVariables(theme) {
    var scale = numberOr(theme.layout.radiusScale, 1);
    var depth = shadow(theme);

    return {
      "--pb-brand-primary": theme.colors.primary,
      "--pb-brand-secondary": theme.colors.secondary,
      "--pb-brand-accent": theme.colors.accent,
      "--pb-page-bg": theme.colors.pageBg,
      "--pb-surface": theme.colors.surface,
      "--pb-surface-muted": theme.colors.surfaceMuted,
      "--pb-surface-panel": theme.surface.panelBg,
      "--pb-surface-card": theme.surface.cardBg,
      "--pb-surface-inset": theme.surface.insetBg,
      "--pb-text": theme.colors.text,
      "--pb-text-strong": theme.colors.textStrong,
      "--pb-text-muted": theme.colors.textMuted,
      "--pb-border": theme.colors.border,
      "--pb-border-strong": theme.colors.borderStrong,
      "--pb-overlay": theme.colors.overlay,
      "--pb-success": theme.colors.success,
      "--pb-warning": theme.colors.warning,
      "--pb-danger": theme.colors.danger,
      "--pb-info": theme.colors.info,
      "--pb-public-canvas-start": theme.colors.publicCanvasStart,
      "--pb-public-canvas-mid": theme.colors.publicCanvasMid,
      "--pb-public-canvas-end": theme.colors.publicCanvasEnd,
      "--pb-shell-public-header": theme.shell.publicHeaderBg,
      "--pb-shell-app-header": theme.shell.appHeaderBg,
      "--pb-shell-sidebar-start": theme.shell.sidebarStart,
      "--pb-shell-sidebar-end": theme.shell.sidebarEnd,
      "--pb-shell-nav-active": theme.shell.navActiveBg,
      "--pb-shell-nav-text": theme.shell.navText,
      "--pb-btn-primary-from": theme.button.primaryFrom,
      "--pb-btn-primary-to": theme.button.primaryTo,
      "--pb-btn-secondary-bg": theme.button.secondaryBg,
      "--pb-btn-secondary-text": theme.button.secondaryText,
      "--pb-btn-ghost-text": theme.button.ghostText,
      "--pb-form-search-bg": theme.form.searchBg,
      "--pb-form-input-bg": theme.form.inputBg,
      "--pb-form-border": theme.form.controlBorder,
      "--pb-form-focus": theme.form.focus,
      "--pb-chip-bg": theme.form.chipBg,
      "--pb-chip-text": theme.form.chipText,
      "--pb-chip-active-from": theme.form.chipActiveFrom,
      "--pb-chip-active-to": theme.form.chipActiveTo,
      "--pb-empty-bg": theme.state.emptyBg,
      "--pb-error-bg": theme.state.errorBg,
      "--pb-error-border": theme.state.errorBorder,
      "--pb-badge-neutral-bg": theme.state.badgeNeutralBg,
      "--pb-radius-sm": radius(scale, 8),
      "--pb-radius-md": radius(scale, 12),
      "--pb-radius-lg": radius(scale, 16),
      "--pb-radius-xl": radius(scale, 20),
      "--pb-radius-2xl": radius(scale, 28),
      "--pb-space-sm": spacing(theme.layout.spacingScale, 8),
      "--pb-space-md": spacing(theme.layout.spacingScale, 12),
      "--pb-space-lg": spacing(theme.layout.spacingScale, 16),
      "--pb-space-xl": spacing(theme.layout.spacingScale, 24),
      "--pb-page-x": spacing(theme.layout.spacingScale, 16),
      "--pb-page-y": spacing(theme.layout.spacingScale, 24),
      "--pb-shadow-soft": depth.soft,
      "--pb-shadow-card": depth.card,
      "--pb-shadow-elevated": depth.elevated,
    };
  }

  function applyVariables(theme, target) {
    var host = target || global.document && global.document.documentElement;
    if (!host || !host.style) {
      return;
    }

    var vars = themeVariables(theme);
    Object.keys(vars).forEach(function setVar(key) {
      host.style.setProperty(key, vars[key]);
    });
  }

  function syncTailwindConfig(theme) {
    global.tailwind = global.tailwind || {};
    global.tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              50: mix(theme.colors.primary, 0.1, "#ffffff"),
              100: mix(theme.colors.primary, 0.18, "#ffffff"),
              600: theme.colors.primary,
              700: theme.colors.secondary,
              800: darken(theme.colors.secondary, 0.18),
            },
          },
          boxShadow: {
            card: shadow(theme).card,
          },
        },
      },
    };
  }

  function applyTheme(overrides) {
    currentTheme = normalize(deepMerge(currentTheme, overrides || {}));
    global.__PROJECTB_THEME__ = currentTheme;
    applyVariables(currentTheme);
    syncTailwindConfig(currentTheme);
    syncDocumentMetadata(currentTheme);
    return clone(currentTheme);
  }

  function syncDocumentMetadata(theme) {
    var doc = global.document;
    if (!doc || !doc.head) {
      return;
    }

    var appName = stringOr(theme.brand && theme.brand.appName, DEFAULT_THEME.brand.appName);
    var tagline = stringOr(theme.brand && theme.brand.tagline, DEFAULT_THEME.brand.tagline);
    var iconUrl = resolveDocumentAssetUrl(
      theme.brand && (theme.brand.iconUrl || theme.brand.logoMarkAsset)
    );

    doc.title = appName;
    upsertMeta("name", "application-name", appName);
    upsertMeta("name", "apple-mobile-web-app-title", appName);
    upsertMeta("name", "description", tagline);
    upsertMeta("property", "og:site_name", appName);
    upsertMeta("property", "og:title", appName);
    upsertMeta("property", "og:description", tagline);
    upsertMeta("name", "twitter:title", appName);
    upsertMeta("name", "twitter:description", tagline);

    if (iconUrl) {
      upsertLink("icon", iconUrl);
      upsertLink("shortcut icon", iconUrl);
      upsertLink("apple-touch-icon", iconUrl);
      upsertMeta("property", "og:image", iconUrl);
      upsertMeta("name", "twitter:image", iconUrl);
    }
  }

  function resolveDocumentAssetUrl(value) {
    var next = String(value || "").trim();
    if (!next || next.indexOf("brand.") === 0) {
      return "";
    }

    if (/^(https?:|data:|blob:)/i.test(next)) {
      return next;
    }

    if (next.charAt(0) === "/") {
      return next;
    }

    return "";
  }

  function upsertMeta(attribute, key, content) {
    var doc = global.document;
    var selector = 'meta[' + attribute + '="' + cssEscape(key) + '"]';
    var node = doc.head.querySelector(selector);
    if (!node) {
      node = doc.createElement("meta");
      node.setAttribute(attribute, key);
      doc.head.appendChild(node);
    }
    node.setAttribute("content", String(content || ""));
  }

  function upsertLink(rel, href) {
    var doc = global.document;
    var selector = 'link[rel="' + cssEscape(rel) + '"]';
    var node = doc.head.querySelector(selector);
    if (!node) {
      node = doc.createElement("link");
      node.setAttribute("rel", rel);
      doc.head.appendChild(node);
    }
    node.setAttribute("href", href);
    if (/\\.svg(?:[?#].*)?$/i.test(href)) {
      node.setAttribute("type", "image/svg+xml");
    } else if (/\\.png(?:[?#].*)?$/i.test(href)) {
      node.setAttribute("type", "image/png");
    } else if (/\\.webp(?:[?#].*)?$/i.test(href)) {
      node.setAttribute("type", "image/webp");
    } else {
      node.removeAttribute("type");
    }
  }

  function cssEscape(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  global.__PROJECTB_THEME_DEFAULTS__ = clone(DEFAULT_THEME);
  global.__PROJECTB_NORMALIZE_THEME__ = function normalizeThemeInput(input) {
    return normalize(input);
  };
  global.__PROJECTB_THEME_TO_VARS__ = function themeToVars(input) {
    return themeVariables(normalize(input));
  };
  global.__PROJECTB_GET_THEME__ = function getTheme() {
    return clone(currentTheme);
  };
  global.__PROJECTB_APPLY_THEME__ = applyTheme;

  applyTheme(currentTheme);
}(window));
