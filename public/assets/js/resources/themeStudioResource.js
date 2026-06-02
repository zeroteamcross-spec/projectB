import { apiClient } from "../core/apiClient.js";

const MASTER_KEY = "design_studio.theme_config";

export const themeStudioResource = {
  async get(options = {}) {
    const response = await apiClient.get(`/master-data/${encodeURIComponent(MASTER_KEY)}`, options);
    return response.data?.master ?? null;
  },

  async save(data, options = {}) {
    const response = await apiClient.put(`/master-data/${encodeURIComponent(MASTER_KEY)}`, {
      data,
      display_name: "Design Studio Theme",
      bump_version: false,
    }, options);
    return response.data?.master ?? null;
  },
};
