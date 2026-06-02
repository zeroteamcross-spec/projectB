import { apiClient } from "../core/apiClient.js";

export const masterDataResource = {
  async get(masterKey, options = {}) {
    const response = await apiClient.get(`/master-data/${encodeURIComponent(masterKey)}`, options);
    return response.data?.master ?? null;
  },

  async save(masterKey, data, { displayName = "", bumpVersion = true, ...options } = {}) {
    const response = await apiClient.put(`/master-data/${encodeURIComponent(masterKey)}`, {
      data,
      display_name: displayName,
      bump_version: bumpVersion,
    }, options);
    return response.data?.master ?? null;
  },

  async uploadBankIcon(file, options = {}) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post("/master-data/assets/bank-icons", formData, options);
    return response.data?.asset ?? null;
  },
};
