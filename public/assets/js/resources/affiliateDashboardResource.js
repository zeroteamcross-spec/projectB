import { apiClient } from "../core/apiClient.js";

export const affiliateDashboardResource = {
  async me(options = {}) {
    const response = await apiClient.get("/affiliate/me", options);
    return response.data?.affiliate ?? null;
  },

  async clicks(params = {}, options = {}) {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get(`/affiliate/me/clicks${suffix}`, options);
    return {
      clicks: response.data?.clicks ?? [],
      summary: response.data?.summary ?? {},
      meta: response.meta ?? {},
    };
  },

  async ledgers(params = {}, options = {}) {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get(`/affiliate/me/ledgers${suffix}`, options);
    return {
      ledgers: response.data?.ledgers ?? [],
      summary: response.data?.summary ?? {},
      meta: response.meta ?? {},
    };
  },

  async settlements(params = {}, options = {}) {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get(`/affiliate/me/settlements${suffix}`, options);
    return {
      summary: response.data?.summary ?? {},
      eligible_ledgers: response.data?.eligible_ledgers ?? [],
      settlements: response.data?.settlements ?? [],
      meta: response.meta ?? {},
    };
  },
};
