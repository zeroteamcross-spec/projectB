import { apiClient } from "../core/apiClient.js";

export const adminAccountsResource = {
  async create(payload = {}, options = {}) {
    const response = await apiClient.post("/admin/accounts", payload, options);

    return {
      user: response.data?.user ?? null,
      message: response.message ?? "Akun berhasil dibuat.",
    };
  },
};
