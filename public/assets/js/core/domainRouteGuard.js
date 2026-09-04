/**
 * Menjaga agar tiap peran dibuka dari host yang benar.
 *
 * Petanya datang dari konfigurasi server lewat window.__PROJECTB_ROLE_HOSTS__,
 * bukan dipatok di berkas ini. Sebelumnya dipatok ke garasi-mobil.com, sehingga
 * penjaga ini diam total di domain lain -- termasuk carlynk.id.
 *
 * Bentuk petanya: { default: "carlynk.id", admin: "admin.carlynk.id" }.
 * Peran tanpa host sendiri ikut `default`. Kalau `default` kosong, atau host
 * yang sedang dibuka bukan salah satu host yang terdaftar, penjaga ini tidak
 * melakukan apa pun -- itu yang membuat localhost dan preview tidak terganggu.
 */

import { normalizeHost, roleHosts as petaHost } from "./roleHosts.js";

function hostUntukPeran(peta, peran) {
  return peta[peran] || peta.default || null;
}

function hostTerdaftar(peta) {
  return new Set(Object.values(peta));
}

export function bindDomainRouteGuard({ locationRef = window.location, windowRef = window } = {}) {
  enforceDomainRoute({ locationRef });

  const onNavigate = () => enforceDomainRoute({ locationRef });
  windowRef.addEventListener("popstate", onNavigate);

  return () => windowRef.removeEventListener("popstate", onNavigate);
}

export function enforceDomainRoute({ locationRef = window.location } = {}) {
  const peta = petaHost();

  if (!peta.default) {
    return false;
  }

  const currentHost = normalizeHost(locationRef.hostname || locationRef.host);

  if (!hostTerdaftar(peta).has(currentHost)) {
    return false;
  }

  const path = currentPath(locationRef);
  const defaultPath = defaultPathForHost(peta, currentHost);

  if (path === "/" && defaultPath !== null) {
    pindah(locationRef, currentHost, defaultPath);
    return true;
  }

  const hostRole = roleForHost(peta, currentHost);

  if (hostRole) {
    if (enforceOwnLoginRoute({ locationRef, path, host: currentHost, role: hostRole })) {
      return true;
    }

    // Host peran (admin/seller/buyer/affiliate) hanya melayani rute
    // perannya sendiri. Apa pun selain itu -- dashboard peran lain, katalog
    // publik, halaman mobil -- dikembalikan ke host utama, bukan dibiarkan
    // tampil di alamat yang bukan haknya. Pola ini awalnya cuma berlaku untuk
    // admin.carlynk.id; sekarang berlaku sama untuk semua host peran yang
    // sudah dikonfigurasi lewat ROLE_HOST_*.
    if (!isOwnPath(hostRole, path) && !isOwnLoginPath(hostRole, path) && !isSharedAuthenticatedPath(path)) {
      locationRef.replace(`${locationRef.protocol}//${peta.default}${locationRef.pathname}${locationRef.search}`);
      return true;
    }

    return false;
  }

  const targetRole = roleForHashPath(path);
  const targetHost = targetRole ? hostUntukPeran(peta, targetRole) : null;

  if (!targetHost || targetHost === currentHost) {
    return false;
  }

  locationRef.replace(`${locationRef.protocol}//${targetHost}${locationRef.pathname}${locationRef.search}`);
  return true;
}

function pindah(locationRef, host, path) {
  locationRef.replace(`${locationRef.protocol}//${host}${path}`);
}

/**
 * Peran (key) yang host-nya adalah host yang sedang dibuka, atau null kalau
 * host ini bukan host khusus peran mana pun (mis. masih di host `default`).
 */
function roleForHost(peta, host) {
  return Object.keys(peta).find((peran) => peran !== "default" && peta[peran] === host) ?? null;
}

/**
 * Prefix path yang dianggap "milik" tiap peran di host khususnya.
 *
 * Affiliate sengaja tidak menyertakan "/login/affiliate" atau
 * "/google-login/affiliate" di sini -- keduanya sudah ditangani sebagai
 * "login path" sendiri lewat isOwnLoginPath(), bukan dashboard.
 */
const ROLE_OWN_PATH_PREFIXES = {
  admin: ["/admin", "/super-admin"],
  seller: ["/seller"],
  buyer: ["/buyer"],
  affiliate: ["/affiliate"],
};

function isOwnPath(role, path) {
  return (ROLE_OWN_PATH_PREFIXES[role] ?? []).some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function isOwnLoginPath(role, path) {
  return path === `/login/${role}` || path === `/google-login/${role}`;
}

/**
 * Host peran hanya melayani rute login peran itu sendiri.
 *
 * Peran lain yang mendarat di sini dilempar ke host-nya sendiri, bukan
 * ditahan dengan halaman kosong. Setelah mendarat, jalurnya cocok dengan host
 * tujuan sehingga tidak ada pantulan balik.
 */
function enforceOwnLoginRoute({ locationRef, path, host, role }) {
  if (path.startsWith("/google-login/")) {
    const target = `/google-login/${role}`;
    if (path !== target) {
      pindah(locationRef, host, target);
      return true;
    }

    return false;
  }

  if (path.startsWith("/login/") && path !== `/login/${role}`) {
    pindah(locationRef, host, `/login/${role}`);
    return true;
  }

  return false;
}

function isSharedAuthenticatedPath(path) {
  return path === "/profile"
    || path.startsWith("/profile/")
    || path === "/notifications"
    || path.startsWith("/notifications/");
}

function defaultPathForHost(peta, host) {
  if (peta.admin && host === peta.admin) {
    return "/admin";
  }

  if (peta.seller && host === peta.seller) {
    return "/seller";
  }

  if (peta.affiliate && host === peta.affiliate) {
    return "/login/affiliate";
  }

  if (peta.buyer && host === peta.buyer) {
    return "/buyer";
  }

  return null;
}

function roleForHashPath(path) {
  if (path === "/admin" || path.startsWith("/admin/") || path === "/super-admin" || path.startsWith("/super-admin/")) {
    return "admin";
  }

  if (path === "/seller" || path.startsWith("/seller/")) {
    return "seller";
  }

  if (path === "/affiliate" || path.startsWith("/affiliate/") || path === "/login/affiliate") {
    return "affiliate";
  }

  if (path === "/buyer" || path.startsWith("/buyer/")) {
    return "buyer";
  }

  if (path.startsWith("/google-login/") || path.startsWith("/login/")) {
    return loginRoleForPath(path);
  }

  // Halaman publik (katalog, detail mobil, checkout, auth) sengaja TIDAK
  // dipetakan ke peran mana pun -- semuanya harus tetap di host `default`,
  // dijelajahi tanpa perlu login sama sekali. Sebelum buyer punya host
  // sendiri (app.carlynk.id) memetakannya ke "buyer" di sini tidak berbahaya
  // karena host buyer selalu sama dengan `default`; begitu ROLE_HOST_BUYER
  // diisi, pemetaan itu akan salah mendorong pengunjung publik ke subdomain
  // buyer. Blok pembatas per-host (di atas) yang tetap menjaga
  // app.carlynk.id sendiri tidak menampilkan halaman ini kalau diakses
  // langsung di sana -- dilempar balik ke `default`.
  return null;
}

function loginRoleForPath(path) {
  const slug = path.split("/")[2] || "";

  if (slug === "admin") {
    return "admin";
  }

  if (slug === "seller") {
    return "seller";
  }

  if (slug === "affiliate") {
    return "affiliate";
  }

  if (slug === "buyer") {
    return "buyer";
  }

  return null;
}

function currentPath(locationRef) {
  const raw = String(locationRef.pathname || "/");
  const normalized = `/${raw.replace(/^\/?/, "")}`;

  return normalized === "/" ? "/" : normalized.replace(/\/$/, "");
}
