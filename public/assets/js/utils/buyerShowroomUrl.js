import { publicReservedRoutePrefixes } from "../core/publicReservedRouteWords.js";
import { appStore } from "../state/store.js";
import { getLastViewedPublicContextPath, publicContextPathFromRedirect } from "./lastViewedPublicContext.js";

export const BUYER_SHOWROOM_URL_STORAGE_KEY = "projectB:buyer:showroom-url";

const RESERVED_ROOT_WORD_PATTERN = new RegExp(`^(?:${publicReservedRoutePrefixes.join("|")})$`);

function isValidShowroomUrl(value) {
  const match = String(value ?? "").match(/^\/?([^/?#]+)$/);
  return Boolean(match) && !RESERVED_ROOT_WORD_PATTERN.test(match[1]);
}

export function buyerShowroomCatalogUrlFromSlug(slug) {
  const value = String(slug ?? "").trim();
  return value ? `/${encodeURIComponent(value)}` : "";
}

export function persistBuyerShowroomUrl(user) {
  const url = user?.role === "buyer"
    ? buyerShowroomCatalogUrlFromSlug(user.home_showroom_slug)
    : "";

  // Hapus nilai lama dari versi yang pernah mempercayai localStorage. Slug
  // showroom hanya boleh berasal dari akun yang sedang terautentikasi.
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.removeItem(BUYER_SHOWROOM_URL_STORAGE_KEY);
    } catch (error) {
      // Storage can be unavailable in private browsing or restricted contexts.
    }
  }

  return url;
}

export function getBuyerShowroomCatalogUrl() {
  const user = appStore.get("auth.user", null);
  if (user?.role !== "buyer") {
    return "";
  }

  const customDomainSlug = typeof window === "undefined"
    ? ""
    : String(window.__PROJECTB_CUSTOM_DOMAIN_SHOWROOM_SLUG__ ?? "").trim();
  const homeShowroomPath = buyerShowroomCatalogUrlFromSlug(user.home_showroom_slug);

  if (isValidShowroomUrl(homeShowroomPath)) {
    return customDomainSlug && homeShowroomPath === buyerShowroomCatalogUrlFromSlug(customDomainSlug)
      ? "/"
      : homeShowroomPath;
  }

  // Buyer yang masuk dengan akun password atau belum pernah login lewat
  // tautan showroom tidak mempunyai home_showroom_slug. Pertahankan konteks
  // showroom yang memang terakhir dibuka dan divalidasi oleh publicContext,
  // agar menu Katalog dari Notifikasi tidak jatuh ke landing root.
  if (customDomainSlug) {
    return "/";
  }

  const lastViewedPath = publicContextPathFromRedirect(getLastViewedPublicContextPath());
  return lastViewedPath || "/public";
}
