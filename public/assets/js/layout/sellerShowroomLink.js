import { showroomsResource } from "../resources/showroomsResource.js";

/**
 * Slug showroom milik seller yang sedang login, dipakai supaya klik logo
 * header/sidebar bisa langsung membuka halaman showroom publiknya tanpa
 * memanggil ulang /showrooms/me setiap klik.
 */
let cachedSlug = null;
let cachedPromise = null;

export async function navigateToOwnShowroom() {
  if (cachedSlug) {
    window.location.hash = `#/showrooms/${encodeURIComponent(cachedSlug)}`;
    return;
  }

  cachedPromise ??= showroomsResource.mine().catch(() => null);
  const showroom = await cachedPromise;

  if (showroom?.slug) {
    cachedSlug = showroom.slug;
    window.location.hash = `#/showrooms/${encodeURIComponent(cachedSlug)}`;
  }
}
