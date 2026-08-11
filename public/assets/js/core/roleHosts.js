/**
 * Peta host per peran, satu sumber untuk semua yang membutuhkannya.
 *
 * Diisi server lewat window.__PROJECTB_ROLE_HOSTS__ dari config/app.php.
 * Bentuknya { default: "carlynk.id", admin: "admin.carlynk.id" }; peran tanpa
 * host sendiri ikut `default`.
 *
 * Peta kosong berarti aplikasi berjalan di satu host saja, dan semua pemanggil
 * di bawah ini akan berperilaku seperti sebelum subdomain ada. Itu keadaan
 * bawaannya.
 *
 * Sebelumnya peta yang sama ditulis ulang di tiga berkas, semuanya dipatok ke
 * garasi-mobil.com, dan ketiganya diam begitu domainnya berganti.
 */

export function roleHosts() {
  const peta = (typeof window !== "undefined" && window.__PROJECTB_ROLE_HOSTS__) || {};
  const bersih = {};

  Object.keys(peta).forEach((peran) => {
    const host = normalizeHost(peta[peran]);
    if (host) {
      bersih[peran] = host;
    }
  });

  return bersih;
}

export function hostForRole(peran) {
  const peta = roleHosts();

  return peta[peran] || peta.default || null;
}

/**
 * Peran yang host-nya adalah host yang sedang dibuka, atau null kalau host ini
 * bukan host khusus peran mana pun.
 */
export function roleForCurrentHost(hostname = currentHost()) {
  const peta = roleHosts();
  const host = normalizeHost(hostname);

  const peran = Object.keys(peta).find((kunci) => kunci !== "default" && peta[kunci] === host);

  return peran ?? null;
}

export function currentHost() {
  return typeof window === "undefined" ? "" : normalizeHost(window.location.hostname || window.location.host);
}

export function normalizeHost(host) {
  return String(host || "").toLowerCase().split(":", 1)[0];
}
