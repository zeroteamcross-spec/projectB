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
  colors: {
    primary: "#ea580c",
    secondary: "#c2410c",
    accent: "#f97316",
    pageBg: "#f8fafc",
    surface: "#ffffff",
    surfaceMuted: "#f8fafc",
    inset: "#f1f5f9",
    text: "#030712",
    textStrong: "#1f2937",
    textMuted: "#6b7280",
    border: "#e5e7eb",
    borderStrong: "#cbd5e1",
    overlay: "rgba(3, 7, 18, 0.55)",
    success: "#15803d",
    warning: "#b45309",
    danger: "#b91c1c",
    info: "#1d4ed8",
    publicCanvasStart: "#020617",
    publicCanvasMid: "#1e293b",
    publicCanvasEnd: "#475569",
  },
  shell: {
    publicHeaderBg: "rgba(255, 255, 255, 0.92)",
    appHeaderBg: "rgba(255, 255, 255, 0.95)",
    sidebarStart: "#b91c1c",
    sidebarEnd: "#f59e0b",
    navActiveBg: "rgba(255, 255, 255, 0.16)",
    navText: "#ffffff",
  },
  button: {
    primaryFrom: "#ea580c",
    primaryTo: "#f97316",
    secondaryBg: "#ffffff",
    secondaryText: "#111827",
    ghostText: "#c2410c",
  },
  surface: {
    cardBg: "#ffffff",
    cardBorder: "#e5e7eb",
    panelBg: "#ffffff",
    insetBg: "#f8fafc",
  },
  form: {
    searchBg: "#ffffff",
    inputBg: "#ffffff",
    controlBorder: "#cbd5e1",
    focus: "#ea580c",
    chipBg: "#ffffff",
    chipText: "#334155",
    chipActiveFrom: "#ea580c",
    chipActiveTo: "#f97316",
  },
  state: {
    emptyBg: "#ffffff",
    errorBg: "#ffffff",
    errorBorder: "#fecaca",
    badgeNeutralBg: "#f3f4f6",
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
