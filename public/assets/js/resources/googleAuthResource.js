import { apiClient } from "../core/apiClient.js";

export const googleAuthResource = {
  async status(options = {}) {
    const response = await apiClient.get("/auth/google/status", options);
    return response.data ?? {};
  },

  async redirect(role, options = {}) {
    const response = await apiClient.get(`/auth/google/redirect?role=${encodeURIComponent(role)}`, options);
    return response.data ?? {};
  },

  async completeProfile(payload = {}, options = {}) {
    const response = await apiClient.post("/auth/google/complete-profile", payload, options);
    return response.data ?? {};
  },
};
