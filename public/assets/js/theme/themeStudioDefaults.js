const FALLBACK_DEFAULTS = {
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
  // Harus persis sama dengan DEFAULT_THEME di tailwindRuntimeConfig.js.
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
    border: "#e5e7eb",
    borderStrong: "#d1d5db",
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
  button: {
    primaryFrom: "#15803d",
    primaryTo: "#1a9a49",
    secondaryBg: "#ffffff",
    secondaryText: "#17698f",
    ghostText: "#17698f",
  },
  surface: {
    cardBg: "#ffffff",
    cardBorder: "#d1d5db",
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

export const themeStudioDefaults = globalThis.__PROJECTB_THEME_DEFAULTS__
  ? (typeof structuredClone === "function"
    ? structuredClone(globalThis.__PROJECTB_THEME_DEFAULTS__)
    : JSON.parse(JSON.stringify(globalThis.__PROJECTB_THEME_DEFAULTS__)))
  : FALLBACK_DEFAULTS;
