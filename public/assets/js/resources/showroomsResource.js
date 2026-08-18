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

  async uploadBrandingIcon(file, options = {}) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post("/showrooms/me/branding-icon", formData, options);
    return response.data?.asset ?? null;
  },

  async uploadBrandingLogo(file, options = {}) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post("/showrooms/me/branding-logo", formData, options);
    return response.data?.asset ?? null;
  },
};
