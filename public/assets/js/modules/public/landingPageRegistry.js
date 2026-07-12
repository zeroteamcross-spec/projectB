import { currentThemeConfig } from "../../theme/themeRuntime.js";
import { appStore } from "../../state/store.js";
import { AuthLandingPage } from "./pages/authLandingPage.js";
import { PublicCatalogPage } from "./pages/catalogPage.js";
import { SaasLandingPage } from "./pages/saasLandingPage.js";

export const DEFAULT_LANDING_PAGE = "public.saas-landing";

export const LANDING_PAGE_OPTIONS = Object.freeze([
  {
    name: "public.saas-landing",
    label: "Landing SaaS Jual Beli Mobil",
    path: "/saas-landing",
    description: "Halaman marketing SaaS untuk seller/showroom, marketing, dan buyer.",
    page: SaasLandingPage,
  },
  {
    name: "public.catalog-alias",
    label: "Katalog Mobil Publik",
    path: "/public",
    description: "Halaman katalog mobil lama yang tetap tersedia di #/public.",
    page: PublicCatalogPage,
  },
  {
    name: "public.auth-landing",
    label: "Login / Register",
    path: "/auth",
    description: "Halaman autentikasi publik untuk buyer, seller, admin, dan marketing.",
    page: AuthLandingPage,
  },
]);

export function landingPageOptions() {
  return LANDING_PAGE_OPTIONS.map(({ name, label, path, description }) => ({
    name,
    label,
    path,
    description,
  }));
}

export function resolveLandingPageOption(name = "") {
  return LANDING_PAGE_OPTIONS.find((option) => option.name === name)
    ?? LANDING_PAGE_OPTIONS.find((option) => option.name === DEFAULT_LANDING_PAGE);
}

export function currentLandingPageName() {
  const workingConfig = appStore.get("working.adminWebConfig.config.data", null);
  const snapshotConfig = appStore.get("snapshot.admin.webConfig.data", null);
  const theme = currentThemeConfig();
  const configured = workingConfig?.landing_page_route_name
    ?? snapshotConfig?.landing_page_route_name
    ?? theme?.landingPage?.routeName
    ?? theme?.landing_page_route_name
    ?? "";

  return resolveLandingPageOption(configured)?.name ?? DEFAULT_LANDING_PAGE;
}
