/**
 * Jaring pengaman migrasi dari hash routing (#/seller/cars) ke URL bersih
 * (/seller/cars). Semua link lama yang sudah beredar -- referral marketing,
 * showroom, notifikasi tersimpan, bookmark -- masih berbentuk
 * `https://carlynk.id/#/...`. Tanpa ini, link itu akan mendarat di halaman
 * root polos begitu router berhenti membaca hash.
 *
 * Dipanggil paling awal di app.js, sebelum domainRouteGuard atau apa pun
 * lain sempat membaca URL, supaya keduanya melihat path yang sudah bersih.
 * Pakai replaceState (bukan navigasi) supaya tombol back tidak
 * meninggalkan jejak entri riwayat basi berbentuk hash.
 */
export function upgradeLegacyHashUrl({ locationRef = window.location, historyRef = window.history } = {}) {
  const pathname = locationRef.pathname || "/";
  const hash = locationRef.hash || "";

  if (pathname !== "/" || !hash.startsWith("#/")) {
    return false;
  }

  const [hashPath, hashQuery = ""] = hash.slice(1).split("?");
  const target = `${hashPath}${hashQuery ? `?${hashQuery}` : ""}`;

  if (!target || target === "/") {
    return false;
  }

  historyRef.replaceState(null, "", target);
  return true;
}
