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

  const onHashChange = () => enforceDomainRoute({ locationRef });
  windowRef.addEventListener("hashchange", onHashChange);

  return () => windowRef.removeEventListener("hashchange", onHashChange);
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

  const path = hashPath(locationRef.hash);
  const defaultPath = defaultPathForHost(peta, currentHost);

  if (path === "/" && defaultPath !== null) {
    pindah(locationRef, currentHost, defaultPath);
    return true;
  }

  if (peta.admin && currentHost === peta.admin) {
    if (enforceAdminLoginRoute({ locationRef, path, hostAdmin: peta.admin })) {
      return true;
    }

    // Host admin hanya melayani rute admin. Apa pun selain itu -- dashboard
    // seller, katalog publik, halaman mobil -- dikembalikan ke host utama,
    // bukan dibiarkan tampil di alamat admin. Tanpa aturan ini seorang seller
    // yang mengetik admin.carlynk.id akan berkeliling seluruh aplikasi dari
    // alamat yang bukan haknya.
    if (!isAdminPath(path) && !isAdminLoginPath(path)) {
      locationRef.replace(`${locationRef.protocol}//${peta.default}${locationRef.pathname}${locationRef.search}${locationRef.hash}`);
      return true;
    }

    return false;
  }

  const targetRole = roleForHashPath(path);
  const targetHost = targetRole ? hostUntukPeran(peta, targetRole) : null;

  if (!targetHost || targetHost === currentHost) {
    return false;
  }

  locationRef.replace(`${locationRef.protocol}//${targetHost}${locationRef.pathname}${locationRef.search}${locationRef.hash}`);
  return true;
}

function pindah(locationRef, host, path) {
  locationRef.replace(`${locationRef.protocol}//${host}${locationRef.pathname}${locationRef.search}#${path}`);
}

/**
 * Host admin hanya melayani rute admin dan login admin.
 *
 * Peran lain yang mendarat di sini dilempar ke host-nya sendiri, bukan
 * ditahan dengan halaman kosong. Setelah mendarat, jalurnya cocok dengan host
 * tujuan sehingga tidak ada pantulan balik.
 */
function enforceAdminLoginRoute({ locationRef, path, hostAdmin }) {
  if (path.startsWith("/google-login/")) {
    if (path !== "/google-login/admin") {
      pindah(locationRef, hostAdmin, "/google-login/admin");
      return true;
    }

    return false;
  }

  if (path.startsWith("/login/") && path !== "/login/admin") {
    pindah(locationRef, hostAdmin, "/login/admin");
    return true;
  }

  return false;
}

function isAdminPath(path) {
  return path === "/admin"
    || path.startsWith("/admin/")
    || path === "/super-admin"
    || path.startsWith("/super-admin/");
}

function isAdminLoginPath(path) {
  return path === "/login/admin" || path === "/google-login/admin";
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

  if (path.startsWith("/af/") || path.startsWith("/a/")) {
    return null;
  }

  if (
    path.startsWith("/cars/") ||
    path.startsWith("/transactions/") ||
    path.startsWith("/auth/") ||
    path === "/auth" ||
    path === "/public" ||
    path.startsWith("/public/")
  ) {
    return "buyer";
  }

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

function hashPath(hash) {
  const cleanHash = String(hash || "").replace(/^#/, "") || "/";
  const [path] = cleanHash.split("?");
  const normalized = `/${String(path || "/").replace(/^\/?/, "")}`;

  return normalized === "/" ? "/" : normalized.replace(/\/$/, "");
}

