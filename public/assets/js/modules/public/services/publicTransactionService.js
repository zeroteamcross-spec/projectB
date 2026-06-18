import { authService } from "../../../core/auth.js";
import { transactionsResource } from "../../../resources/transactionsResource.js";

export const publicTransactionService = {
  loginBuyer(credentials) {
    return authService.login(credentials);
  },

  async registerBuyer(payload) {
    await authService.register({
      ...payload,
      role: "buyer",
    });

    return authService.login({
      email: payload.email,
      password: payload.password,
    });
  },

  logout() {
    return authService.logout();
  },

  create(payload, options = {}) {
    return transactionsResource.create(payload, options);
  },
};
