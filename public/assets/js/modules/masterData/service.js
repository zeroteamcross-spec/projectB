import { apiClient } from "../../core/apiClient.js";

export const masterDataService = {
  async getByKey(masterKey) {
    const response = await apiClient.get(`/master-data/${encodeURIComponent(masterKey)}`);

    return response.data.master;
  },

  async upsert(masterKey, payload) {
    const response = await apiClient.put(`/master-data/${encodeURIComponent(masterKey)}`, payload);

    return response.data.master;
  },
};
