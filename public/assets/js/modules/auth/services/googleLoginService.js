import { googleAuthResource } from "../../../resources/googleAuthResource.js";
import { authStore } from "../../../state/authStore.js";

const ROLE_CONFIG = Object.freeze({
  buyer: {
    role: "buyer",
    slug: "buyer",
    label: "Buyer",
    title: "Google Login Buyer",
    subtitle: "Masuk atau daftar sebagai Buyer dengan Google.",
    warning: "Halaman ini hanya untuk akun Buyer.",
    home: "/buyer",
    googleEnabled: true,
  },
  admin: {
    role: "admin",
    slug: "admin",
    label: "Admin",
    title: "Google Login Admin",
    subtitle: "Masuk sebagai Admin yang sudah terdaftar.",
    warning: "Admin tidak bisa auto-register dari Google.",
    home: "/admin",
    googleEnabled: true,
  },
  seller: {
    role: "seller",
    slug: "seller",
    label: "Seller",
    title: "Google Login Seller",
    subtitle: "Masuk atau daftar sebagai Seller dengan Google.",
    warning: "Seller baru wajib melengkapi WhatsApp format 62 dan data showroom.",
    home: "/seller",
    googleEnabled: true,
  },
  affiliate: {
    role: "affiliate_admin",
    slug: "affiliate",
    label: "Marketing",
    title: "Google Login Marketing",
    subtitle: "Marketing tetap memakai login user/password.",
    warning: "Google Login Marketing dinonaktifkan sesuai policy onboarding affiliate.",
    home: "/affiliate",
    googleEnabled: false,
  },
});

const ROLE_TO_SLUG = Object.freeze(Object.values(ROLE_CONFIG).reduce((carry, item) => {
  carry[item.role] = item.slug;
  return carry;
}, {}));

export const googleLoginService = {
  routes() {
    return Object.values(ROLE_CONFIG);
  },

  configForSlug(slug) {
    return ROLE_CONFIG[slug] ?? null;
  },

  configForRole(role) {
    return this.configForSlug(ROLE_TO_SLUG[role] ?? role);
  },

  async status() {
    return googleAuthResource.status();
  },

  async begin(config, next = "", showroomSlug = "") {
    if (!config?.role || !config.googleEnabled) {
      throw new Error(config?.warning || "Google Login tidak tersedia untuk role ini.");
    }

    const status = await this.status();

    if (!status.enabled) {
      throw new Error("Google Login belum dikonfigurasi.");
    }

    const roleStatus = status.roles?.[config.slug] ?? status.roles?.[config.role] ?? null;

    if (roleStatus && roleStatus.enabled === false) {
      throw new Error(roleStatus.message || "Google Login tidak tersedia untuk role ini.");
    }

    const result = await googleAuthResource.redirect(config.role, next, showroomSlug);

    if (!result.auth_url) {
      throw new Error("URL Google Login tidak tersedia.");
    }

    return result.auth_url;
  },

  async completeProfile(payload) {
    const result = await googleAuthResource.completeProfile(payload);

    if (result.user) {
      authStore.setContext({
        user: result.user,
        actor: null,
        impersonation: null,
      });
    }

    return result;
  },
};
