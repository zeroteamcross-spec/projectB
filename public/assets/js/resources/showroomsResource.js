import { apiClient } from "../core/apiClient.js";

export const showroomsResource = {
  async validateSlug(slug, options = {}) {
    const response = await apiClient.get(`/showrooms/slugs/${encodeURIComponent(slug)}/validate`, options);
    return response.data?.showroom ?? null;
  },

  async mine(options = {}) {
    const response = await apiClient.get("/showrooms/me", options);
    return response.data?.showroom ?? null;
  },

  async updateMine(payload = {}, options = {}) {
    const response = await apiClient.patch("/showrooms/me", payload, options);
    return response.data?.showroom ?? null;
  },
};
