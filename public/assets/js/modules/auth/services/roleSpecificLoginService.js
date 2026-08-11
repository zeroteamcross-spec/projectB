import { apiClient } from "../../../core/apiClient.js";
import { authService } from "../../../core/auth.js";
import { authStore } from "../../../state/authStore.js";

const ROLE_CONFIG = Object.freeze({
  buyer: {
    role: "buyer",
    slug: "buyer",
    label: "Buyer",
    title: "Login Buyer",
    subtitle: "Masuk sebagai Buyer",
    home: "/buyer",
    icon: "transaction",
    emailPlaceholder: "buyer@projectb.local",
  },
  admin: {
    role: "admin",
    acceptedRoles: ["admin", "super_admin"],
    slug: "admin",
    label: "Admin",
    title: "Login Admin",
    subtitle: "Masuk sebagai Admin",
    home: "/admin",
    icon: "dashboard",
    emailPlaceholder: "admin@projectb.local",
  },
  seller: {
    role: "seller",
    // Marketing boleh masuk lewat pintu ini juga. Akun marketing dibuat oleh
    // showroom-nya di #/seller/affiliates, jadi keduanya datang dari satu
    // tempat dan wajar berbagi satu halaman login.
    //
    // Ini hanya soal pintu masuk, bukan hak akses: peran tetap datang dari
    // server, dan roleGuard yang menentukan halaman mana yang boleh dibuka.
    // Marketing yang masuk di sini tetap marketing.
    acceptedRoles: ["seller", "affiliate_admin"],
    slug: "seller",
    label: "Showroom",
    title: "Login Showroom",
    subtitle: "Masuk sebagai Showroom",
    home: "/seller",
    icon: "showroom",
    emailPlaceholder: "seller@projectb.local",
  },
  affiliate: {
    role: "affiliate_admin",
    slug: "affiliate",
    label: "Marketing",
    title: "Login Marketing",
    subtitle: "Masuk sebagai Marketing",
    home: "/affiliate",
    icon: "affiliate",
    emailPlaceholder: "affiliate@projectb.local",
  },
});

const ROLE_TO_SLUG = Object.freeze(Object.values(ROLE_CONFIG).reduce((carry, item) => {
  carry[item.role] = item.slug;
  return carry;
}, {
  // super_admin has no ROLE_CONFIG entry of its own — it shares admin's.
  // Without this, configForRole("super_admin") falls through to its "buyer"
  // default, which mislabels a super admin as "Buyer" anywhere role names
  // are displayed (e.g. the "sesi aktif" guard panel below).
  super_admin: "admin",
}));

export const roleSpecificLoginService = {
  configForSlug(slug) {
    return ROLE_CONFIG[slug] ?? null;
  },

  configForRole(role) {
    return this.configForSlug(ROLE_TO_SLUG[role] ?? "buyer") ?? ROLE_CONFIG.buyer;
  },

  loginPathForRole(role) {
    return `/login/${this.configForRole(role).slug}`;
  },

  async login(config, credentials) {
    if (!config?.role) {
      throw new Error("Level User login tidak valid.");
    }

    await authService.login(credentials);

    if (!acceptedRoles(config).includes(authStore.role())) {
      await this.cleanupMismatchSession();
      throw this.roleMismatchError(config);
    }

    return {
      user: authStore.user(),
      target: homeForAuthenticatedRole(authStore.role(), config),
    };
  },

  roleMismatchError(config) {
    const error = new Error(`Maaf, Silakan login dengan akun yang sesuai.`);
    error.code = "ROLE_MISMATCH";
    return error;
  },

  async cleanupMismatchSession() {
    try {
      await authService.logout();
      return;
    } catch (error) {
      await apiClient.post("/auth/logout", {}).catch(() => null);
      authStore.setContext({ user: null, actor: null, impersonation: null });
    }
  },

  routes() {
    return Object.values(ROLE_CONFIG);
  },
};

function acceptedRoles(config) {
  return Array.isArray(config.acceptedRoles) && config.acceptedRoles.length
    ? config.acceptedRoles
    : [config.role];
}

/**
 * Tujuan setelah login ditentukan peran akun yang benar-benar masuk, bukan
 * peran yang dijanjikan judul halamannya.
 *
 * Satu halaman login bisa menerima lebih dari satu peran -- lihat
 * acceptedRoles. Kalau tujuannya diambil dari config.home begitu saja,
 * marketing yang masuk lewat /login/seller akan dikirim ke /seller, ditolak
 * roleGuard, lalu dipantulkan lagi ke halaman login. Terlihat seperti login
 * yang gagal, padahal sesinya sudah jadi.
 */
function homeForAuthenticatedRole(role, config) {
  if (role === "super_admin") {
    return "/super-admin";
  }

  if (role && role !== config.role) {
    return roleSpecificLoginService.configForRole(role).home;
  }

  return config.home;
}
