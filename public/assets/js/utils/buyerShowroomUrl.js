export const BUYER_SHOWROOM_URL_STORAGE_KEY = "projectB:buyer:showroom-url";

const SHOWROOM_URL_PATTERN = /^#?\/s\/[^/?#]+$/;

export function buyerShowroomCatalogUrlFromSlug(slug) {
  const value = String(slug ?? "").trim();
  return value ? `/s/${encodeURIComponent(value)}` : "";
}

export function persistBuyerShowroomUrl(user) {
  if (user?.role !== "buyer") {
    return "";
  }

  const url = buyerShowroomCatalogUrlFromSlug(user.home_showroom_slug);
  if (!url || typeof window === "undefined") {
    return url;
  }

  try {
    window.localStorage?.setItem(BUYER_SHOWROOM_URL_STORAGE_KEY, url);
  } catch (error) {
    // Storage can be unavailable in private browsing or restricted contexts.
  }

  return url;
}

export function getBuyerShowroomCatalogUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const value = String(window.localStorage?.getItem(BUYER_SHOWROOM_URL_STORAGE_KEY) ?? "").trim();
    return SHOWROOM_URL_PATTERN.test(value) ? value : "";
  } catch (error) {
    return "";
  }
}
