import { navigateTo } from "../../../core/router.js";

/**
 * Satu tempat untuk "buka link notifikasi", dipakai bell/item/popover/list --
 * dulu masing-masing punya salinan fungsi ini sendiri-sendiri.
 *
 * link_url notifikasi lama tersimpan permanen di database berformat `#/x`
 * (dibuat sebelum migrasi ke clean URL). Tidak ada migrasi data untuk itu --
 * cukup dibaca toleran di sini selamanya, sama seperti notifikasi baru yang
 * sudah berformat `/x`.
 */
export function navigateToLink(link, onNavigate) {
  const value = String(link ?? "").trim();
  if (!value) {
    return;
  }

  const path = value.startsWith("#") ? value.slice(1) : value;
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (typeof onNavigate === "function") {
    onNavigate(normalized);
    return;
  }

  navigateTo(normalized);
}
