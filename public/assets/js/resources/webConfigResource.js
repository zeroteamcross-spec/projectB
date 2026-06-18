import { apiClient } from "../core/apiClient.js";

export const webConfigResource = {
  async get(options = {}) {
    const response = await apiClient.get("/admin/web-config", options);
    return response.data?.config ?? null;
  },

  async update(payload = {}, options = {}) {
    const response = await apiClient.put("/admin/web-config", payload, options);
    return {
      config: response.data?.config ?? null,
      theme: response.data?.theme ?? null,
      message: response.message ?? "Konfigurasi WEB berhasil disimpan.",
    };
  },

  async uploadIcon(file, options = {}) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post("/master-data/assets/app-icons", formData, options);
    return response.data?.asset ?? null;
  },
};
