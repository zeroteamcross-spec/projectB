import { apiClient } from "../core/apiClient.js";

export const profileResource = {
  async me(options = {}) {
    const response = await apiClient.get("/profile", options);
    return response.data?.profile ?? response.data?.user ?? null;
  },

  async updateMe(payload = {}, options = {}) {
    const response = await apiClient.patch("/profile", payload, options);
    return response.data?.profile ?? response.data?.user ?? null;
  },

  async changePassword(payload = {}, options = {}) {
    const response = await apiClient.patch("/profile/password", payload, options);
    return response.data ?? { changed: true };
  },

  async logout(payload = {}, options = {}) {
    return apiClient.post("/profile/logout", payload, options);
  },
};
