import { defaultLoginPath, googleLoginPathForRole } from "../config/authUxConfig.js";
import { roleForCurrentHost } from "./roleHosts.js";
import { roleLabel } from "./roleLabels.js";

const PUBLIC_ROLE = "public";
const SUPER_VIEWER_ROLE = "admin";
const SUPER_ADMIN_ROLE = "super_admin";
const DEFAULT_HOME_BY_ROLE = {
  public: "/",
  buyer: "/buyer",
  seller: "/seller",
  admin: "/admin",
  super_admin: "/super-admin",
  affiliate_admin: "/affiliate",
  seller_staff: "/seller",
};

export function createRoleGuard({ auth } = {}) {
  return function resolveRoleGuard({ route, location }) {
    if (!route) {
      return allow(route);
    }

    const isAuthenticated = auth?.isAuthenticated?.() ?? false;
    const user = auth?.user?.() ?? {};
    const currentRole = auth?.role?.() ?? PUBLIC_ROLE;

    if (isAuthenticated && !user.is_approved && currentRole === "seller") {
      // "/daftar-showroom" dikecualikan supaya seller yang akunnya sudah
      // dibuat tapi belum bayar paket (mis. sesi terputus sebelum sempat
      // unggah bukti transfer) tetap bisa kembali ke langkah pembayaran --
      // tanpa ini mereka terjebak permanen di panel "Menunggu Persetujuan
      // Admin" tanpa cara membayar sama sekali.
      if (location.path !== "/google-login/complete" && location.path !== "/daftar-showroom") {
        return {
          type: "redirect",
          path: "/google-login/complete?status=pending_approval&role=seller",
          meta: {
            reason: "unapproved-seller-redirect",
          },
        };
      }
    }

    if (location.path === "/google-login") {
      if (currentRole === SUPER_ADMIN_ROLE) {
        return allow(route);
      }

      return {
        type: "redirect",
        path: loginPathForCurrentHost(),
        meta: {
          currentRole,
          blockedRouteName: route.name,
          blockedPath: location.path,
          reason: "google-login-chooser-restricted",
        },
      };
    }

    if (route.authRequired) {


      if (!isAuthenticated || currentRole === PUBLIC_ROLE) {
        return unauthenticatedRedirect({
          route,
          location,
          requiredRole: route.role ?? currentRole ?? PUBLIC_ROLE,
        });
      }

      return allow(route);
    }

    const requiredRole = route.role ?? PUBLIC_ROLE;

    if (requiredRole === PUBLIC_ROLE) {
      return allow(route);
    }



    if (!isAuthenticated || currentRole === PUBLIC_ROLE) {
      return unauthenticatedRedirect({
        route,
        location,
        requiredRole,
      });
    }

    if (route.ownerOnly && currentRole !== "seller") {
      return redirect({
        route,
        currentRole,
        requiredRole: "seller",
        fromPath: location.path,
      });
    }

    if (!matchesRequiredRole(currentRole, requiredRole) && !canViewRole(currentRole, requiredRole)) {
      return redirect({
        route,
        currentRole,
        requiredRole,
        fromPath: location.path,
      });
    }

    return allow(route);
  };
}

/**
 * route.role sekarang bisa berupa array (mis. ["seller","seller_staff"])
 * untuk rute yang boleh diakses lebih dari satu peran tanpa memberi peran
 * baru itu izin admin/super_admin -- canViewRole() di bawah tetap terpisah
 * untuk itu.
 */
function matchesRequiredRole(currentRole, requiredRole) {
  return Array.isArray(requiredRole) ? requiredRole.includes(currentRole) : currentRole === requiredRole;
}

function canViewRole(currentRole, requiredRole) {
  if (currentRole === SUPER_ADMIN_ROLE) {
    return true;
  }

  if (currentRole === SUPER_VIEWER_ROLE && requiredRole !== PUBLIC_ROLE) {
    return true;
  }

  return false;
}

function allow(route) {
  return {
    type: "allow",
    route,
  };
}

function unauthenticatedRedirect({ route, location, requiredRole }) {
  return {
    type: "redirect",
    path: authLandingPath(requiredRole, location.path),
    meta: {
      requiredRole,
      blockedRouteName: route.name,
      blockedPath: location.path,
      reason: "unauthenticated",
    },
  };
}

function redirect({ route, currentRole, requiredRole, fromPath }) {
  return {
    type: "redirect",
    path: homeForRole(currentRole),
    meta: {
      currentRole,
      requiredRole,
      blockedRouteName: route.name,
      blockedPath: fromPath,
      reason: "role-mismatch",
      message: mismatchMessage(currentRole, requiredRole),
    },
  };
}

function mismatchMessage(currentRole, requiredRole) {
  const role = Array.isArray(requiredRole) ? requiredRole[0] : requiredRole;
  return `Akun ${roleLabel(currentRole)} tidak dapat membuka area ${roleLabel(role)}.`;
}

function homeForRole(role) {
  return DEFAULT_HOME_BY_ROLE[role] ?? DEFAULT_HOME_BY_ROLE.public;
}

function authLandingPath(requiredRole, fromPath) {
  // Rute yang boleh diakses lebih dari satu peran (mis. seller & staf) tetap
  // punya SATU halaman login -- ambil elemen pertama untuk menentukannya.
  const role = Array.isArray(requiredRole) ? requiredRole[0] : requiredRole;
  const path = role === PUBLIC_ROLE ? defaultLoginPath("buyer") : loginPathForRole(role);
  const query = new URLSearchParams();
  query.set("from", fromPath);
  return `${path}?${query.toString()}`;
}

/**
 * Host khusus peran memakai form email dan password langsung, bukan pemilih
 * Google. Alamat seperti admin.carlynk.id sudah menyatakan siapa yang dituju,
 * jadi menampilkan pemilih peran di sana hanya menambah satu langkah.
 *
 * Di host umum perilakunya tidak berubah.
 */
function loginPathForRole(requiredRole) {
  return roleForCurrentHost() === roleSlug(requiredRole)
    ? `/login/${roleSlug(requiredRole)}`
    : googleLoginPathForRole(requiredRole);
}

/**
 * Peran di peta host memakai nama pendek; affiliate_admin adalah "affiliate",
 * dan super_admin ikut host admin.
 */
function roleSlug(role) {
  if (role === "affiliate_admin") {
    return "affiliate";
  }

  if (role === SUPER_ADMIN_ROLE) {
    return "admin";
  }

  return role;
}

/**
 * Peran yang punya host sendiri dan punya halaman /login/<slug>. Dipakai untuk
 * menjaga agar peta host yang salah tulis tidak menghasilkan rute mati.
 */
const HOST_LOGIN_SLUGS = ["admin", "seller", "affiliate"];

/**
 * Halaman login yang benar untuk host yang sedang dibuka.
 *
 * Host khusus peran memakai form email dan password, sejalan dengan
 * loginPathForRole. Host umum tidak menyatakan peran apa pun, jadi di sana
 * pengunjung yang belum login diperlakukan sebagai calon pembeli.
 *
 * Sebelumnya peta host yang sama ditulis ulang di publicShell.js dengan
 * garasi-mobil.com dipatok keras. Akibatnya tombol Login di admin.carlynk.id
 * tidak mengenali host-nya sendiri dan jatuh ke pemilih peran.
 */
export function loginPathForCurrentHost() {
  const peran = roleForCurrentHost();

  return HOST_LOGIN_SLUGS.includes(peran) ? `/login/${peran}` : defaultLoginPath("buyer");
}
