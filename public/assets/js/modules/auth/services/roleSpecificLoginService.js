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
    slug: "seller",
    label: "Seller",
    title: "Login Seller",
    subtitle: "Masuk sebagai Seller",
    home: "/seller",
    icon: "showroom",
    emailPlaceholder: "seller@projectb.local",
  },
  affiliate: {
    role: "affiliate_admin",
    slug: "affiliate",
    label: "Affiliate",
    title: "Login Affiliate",
    subtitle: "Masuk sebagai Affiliate",
    home: "/affiliate",
    icon: "affiliate",
    emailPlaceholder: "affiliate@projectb.local",
  },
});

const ROLE_TO_SLUG = Object.freeze(Object.values(ROLE_CONFIG).reduce((carry, item) => {
  carry[item.role] = item.slug;
  return carry;
}, {}));

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
      throw new Error("Role login tidak valid.");
    }

    await authService.login(credentials);

    if (authStore.role() !== config.role) {
      await this.cleanupMismatchSession();
      throw this.roleMismatchError(config);
    }

    return {
      user: authStore.user(),
      target: config.home,
    };
  },

  roleMismatchError(config) {
    const error = new Error(`Akun ini bukan akun ${config.label}. Silakan gunakan halaman login yang sesuai.`);
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
