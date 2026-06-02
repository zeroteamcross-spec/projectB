function runtimeTheme() {
  return globalThis.__PROJECTB_GET_THEME__?.() ?? globalThis.__PROJECTB_THEME__ ?? {};
}

export const brandConfig = {
  get appName() {
    return runtimeTheme().brand?.appName ?? "BeliMobil";
  },
  get appTagline() {
    return runtimeTheme().brand?.tagline ?? "Jual beli mobil terpercaya";
  },
  get shellTitle() {
    return runtimeTheme().brand?.appName ?? "BeliMobil";
  },
  get shortMark() {
    return runtimeTheme().brand?.shortMark ?? "BM";
  },
  get logoIcon() {
    return runtimeTheme().brand?.logoIcon ?? "brandMark";
  },
  get logoMarkAsset() {
    return runtimeTheme().brand?.logoMarkAsset ?? "brand.logoMark";
  },
  colors: {
    get primary() {
      return "brand-700";
    },
    get header() {
      return "white";
    },
    get footer() {
      return "gray-950";
    },
    get sidebar() {
      return "gray-950";
    },
    get background() {
      return "slate-50";
    },
    get surface() {
      return "white";
    },
  },
  cta: {
    primary: "primary",
    secondary: "secondary",
  },
  contact: {
    get whatsapp() {
      return runtimeTheme().contact?.whatsapp ?? "";
    },
  },
  shell: {
    get publicHeaderBg() {
      return "bg-[var(--pb-shell-public-header)]";
    },
    get appHeaderBg() {
      return "bg-[var(--pb-shell-app-header)]";
    },
    get sidebarBg() {
      return "bg-[linear-gradient(180deg,var(--pb-shell-sidebar-start),var(--pb-shell-sidebar-end))]";
    },
    get footerBg() {
      return "bg-[var(--pb-public-canvas-start)]";
    },
    get pageBg() {
      return "bg-[var(--pb-page-bg)]";
    },
  },
};
