import { showroomsResource } from "../resources/showroomsResource.js";
import { createIcon } from "../theme/iconRegistry.js";

export const BUYER_SHOWROOM_ICON_STORAGE_KEY = "projectB:buyer:showroom-icon-url";
const BUYER_SHOWROOM_ICON_SLUG_KEY = "projectB:buyer:showroom-icon-slug";

/**
 * Diambil sekali per login/autologin (lihat authStore.setContext()) dan
 * disimpan di localStorage, meniru pola persistBuyerShowroomUrl() di
 * buyerShowroomUrl.js -- bedanya nilai ini butuh satu round-trip API (slug
 * saja tidak cukup untuk tahu icon_url-nya), jadi fire-and-forget, bukan
 * langsung tersedia di render pertama setelah login. Halaman yang membaca
 * nilai ini (top nav buyer di home/portfolio/notifikasi/profil) cukup jatuh
 * kembali ke ikon generik sampai nilai ini terisi di kunjungan berikutnya.
 */
export async function persistBuyerShowroomIcon(user) {
  const homeSlug = String(user?.home_showroom_slug ?? "").trim();

  if (user?.role !== "buyer" || !homeSlug) {
    clearBuyerShowroomIcon();
    return "";
  }

  // patchUser() calls setContext() (and this along with it) for any partial
  // field update, not just login -- skip the round-trip when we already
  // fetched this exact showroom's icon this session.
  try {
    if (window.localStorage?.getItem(BUYER_SHOWROOM_ICON_SLUG_KEY) === homeSlug) {
      return getBuyerShowroomIconUrl();
    }
  } catch (error) {
    // Storage can be unavailable in private browsing or restricted contexts.
  }

  try {
    const result = await showroomsResource.validateSlug(homeSlug);
    const iconUrl = String(result?.showroom?.icon_url ?? "").trim();

    if (!iconUrl) {
      clearBuyerShowroomIcon();
      return "";
    }

    window.localStorage?.setItem(BUYER_SHOWROOM_ICON_STORAGE_KEY, iconUrl);
    window.localStorage?.setItem(BUYER_SHOWROOM_ICON_SLUG_KEY, homeSlug);
    return iconUrl;
  } catch (error) {
    return getBuyerShowroomIconUrl();
  }
}

function clearBuyerShowroomIcon() {
  try {
    window.localStorage?.removeItem(BUYER_SHOWROOM_ICON_STORAGE_KEY);
    window.localStorage?.removeItem(BUYER_SHOWROOM_ICON_SLUG_KEY);
  } catch (error) {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export function getBuyerShowroomIconUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return String(window.localStorage?.getItem(BUYER_SHOWROOM_ICON_STORAGE_KEY) ?? "").trim();
  } catch (error) {
    return "";
  }
}

/**
 * Kotak ikon brand di top nav desktop buyer -- logo showroom tempat buyer
 * ini jadi pelanggan kalau sudah ada, jatuh kembali ke ikon generik yang
 * sama seperti sebelumnya kalau belum (showroom tidak diketahui, atau
 * gambarnya gagal dimuat).
 */
export function renderBuyerBrandIcon({ size = "h-11 w-11", wrapperClassName = "", icon = "car", iconSize = "h-5 w-5" } = {}) {
  const box = document.createElement("span");
  box.className = ["inline-flex shrink-0 items-center justify-center overflow-hidden leading-none", size, wrapperClassName].filter(Boolean).join(" ");

  const iconUrl = getBuyerShowroomIconUrl();
  if (iconUrl) {
    const img = document.createElement("img");
    img.src = normalizeImageUrl(iconUrl);
    img.alt = "Logo showroom";
    img.loading = "lazy";
    img.className = "block h-full w-full object-cover";
    img.addEventListener("error", () => {
      box.replaceChildren(createIcon(icon, { className: `block ${iconSize} leading-none` }));
    }, { once: true });
    box.append(img);
    return box;
  }

  box.append(createIcon(icon, { className: `block ${iconSize} leading-none` }));
  return box;
}

function normalizeImageUrl(value) {
  const url = String(value ?? "").trim();
  if (!url || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("/")) {
    return url;
  }
  return `/${url.replace(/^\/+/, "")}`;
}
