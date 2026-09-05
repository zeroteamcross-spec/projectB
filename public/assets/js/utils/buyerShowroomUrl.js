import { publicReservedRoutePrefixes } from "../core/publicReservedRouteWords.js";

export const BUYER_SHOWROOM_URL_STORAGE_KEY = "projectB:buyer:showroom-url";

// Bentuk baru "/{slug}" diterima asal bukan kata cadangan (lihat
// publicReservedRoutePrefixes); "/s/{slug}" tetap diterima supaya nilai lama
// yang sudah terlanjur tersimpan di localStorage pengguna (sebelum URL
// showroom pindah ke root) tidak mendadak dianggap tidak valid -- akan
// tertimpa sendiri dengan bentuk baru begitu persistBuyerShowroomUrl()
// jalan lagi di login berikutnya.
const RESERVED_ROOT_WORD_PATTERN = new RegExp(`^(?:${publicReservedRoutePrefixes.join("|")})$`);

function isValidShowroomUrl(value) {
  const legacyMatch = value.match(/^#?\/s\/([^/?#]+)$/);
  if (legacyMatch) {
    return Boolean(legacyMatch[1]);
  }

  const bareMatch = value.match(/^#?\/([^/?#]+)$/);
  return Boolean(bareMatch) && !RESERVED_ROOT_WORD_PATTERN.test(bareMatch[1]);
}

export function buyerShowroomCatalogUrlFromSlug(slug) {
  const value = String(slug ?? "").trim();
  return value ? `/${encodeURIComponent(value)}` : "";
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
    return isValidShowroomUrl(value) ? value : "";
  } catch (error) {
    return "";
  }
}
