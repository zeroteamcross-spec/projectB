import { authService } from "../../../core/auth.js";

const ROLE_HOMES = {
  public: "/",
  buyer: "/buyer",
  seller: "/seller",
  admin: "/admin",
  affiliate_admin: "/affiliate",
};

export const publicAuthLandingService = {
  async loginForRole(selectedRole, credentials) {
    const response = await authService.login(credentials);
    const actualRole = authService.user()?.role ?? "public";

    if (actualRole !== selectedRole) {
      await authService.logout();
      const error = new Error(this.roleMismatchMessage(selectedRole, actualRole));
      error.code = "ROLE_MISMATCH";
      error.selectedRole = selectedRole;
      error.actualRole = actualRole;
      throw error;
    }

    return response;
  },

  login(credentials) {
    return authService.login(credentials);
  },

  async registerForRole(selectedRole, payload) {
    if (!this.canRegisterRole(selectedRole)) {
      throw new Error(`Registrasi ${this.roleLabel(selectedRole)} tidak tersedia dari halaman ini.`);
    }

    await authService.register({
      ...payload,
      role: selectedRole,
    });

    if (selectedRole !== "buyer") {
      return { authenticated: false };
    }

    await this.loginForRole(selectedRole, {
      email: payload.email,
      password: payload.password,
    });

    return { authenticated: true };
  },

  logout() {
    return authService.logout();
  },

  supportedRoles() {
    return ["buyer", "seller", "admin", "affiliate_admin"];
  },

  normalizeRole(role) {
    return this.supportedRoles().includes(role) ? role : "buyer";
  },

  normalizeAuthMode(mode) {
    return mode === "register" ? "register" : "login";
  },

  canRegisterRole(role) {
    return role === "buyer" || role === "seller";
  },

  homeForRole(role) {
    return ROLE_HOMES[role] ?? ROLE_HOMES.public;
  },

  canOpenPath(role, path) {
    if (!path || typeof path !== "string") {
      return false;
    }

    if (role === "admin") {
      return path === "/admin" || path.startsWith("/admin/");
    }

    if (role === "affiliate_admin") {
      return path === "/affiliate" || path.startsWith("/affiliate/");
    }

    if (role === "buyer") {
      return path === "/buyer" || path.startsWith("/buyer/");
    }

    if (role === "seller") {
      return path === "/seller" || path.startsWith("/seller/");
    }

    return path === "/" || path.startsWith("/cars/") || path.startsWith("/transactions/");
  },

  resolveAfterLogin({ selectedRole, actualRole, fromPath }) {
    if (actualRole === selectedRole && this.canOpenPath(actualRole, fromPath)) {
      return fromPath;
    }

    return this.homeForRole(actualRole);
  },

  roleMismatchMessage(selectedRole, actualRole) {
    return `Akun ${this.roleLabel(actualRole)} tidak bisa masuk lewat jalur ${this.roleLabel(selectedRole)}.`;
  },

  roleLabel(role) {
    const labels = {
      buyer: "buyer",
      seller: "seller",
      admin: "admin",
      affiliate_admin: "marketing admin",
      public: "publik",
    };

    return labels[role] ?? role;
  },

  roleCopy(role) {
    if (role === "seller") {
      return {
        title: "Masuk sebagai seller",
        description: "Kelola showroom, listing, dan transaksi.",
      };
    }

    if (role === "admin") {
      return {
        title: "Masuk sebagai admin",
        description: "Pantau user, approval, dan operasional.",
      };
    }

    if (role === "affiliate_admin") {
      return {
        title: "Masuk sebagai affiliate",
        description: "Pantau aktivitas, ledger, dan settlement.",
      };
    }

    return {
      title: "Masuk sebagai buyer",
      description: "Lanjutkan transaksi dan pembayaran.",
    };
  },
};
