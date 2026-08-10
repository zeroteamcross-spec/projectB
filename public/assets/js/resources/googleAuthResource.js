import { apiClient } from "../core/apiClient.js";

export const googleAuthResource = {
  async status(options = {}) {
    const response = await apiClient.get("/auth/google/status", options);
    return response.data ?? {};
  },

  async redirect(role, next = "", showroomSlug = "", options = {}) {
    const query = new URLSearchParams();
    query.set("role", role);
    if (next) {
      query.set("next", next);
    }
    if (showroomSlug) {
      query.set("showroom_slug", showroomSlug);
    }
    const response = await apiClient.get(`/auth/google/redirect?${query.toString()}`, options);
    return response.data ?? {};
  },

  async completeProfile(payload = {}, options = {}) {
    const response = await apiClient.post("/auth/google/complete-profile", payload, options);
    return response.data ?? {};
  },
};
