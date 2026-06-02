import { apiClient } from "../core/apiClient.js";

export const showroomsResource = {
  async mine(options = {}) {
    const response = await apiClient.get("/showrooms/me", options);
    return response.data?.showroom ?? null;
  },

  async updateMine(payload = {}, options = {}) {
    const response = await apiClient.patch("/showrooms/me", payload, options);
    return response.data?.showroom ?? null;
  },
};
