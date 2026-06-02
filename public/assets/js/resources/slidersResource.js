import { apiClient } from "../core/apiClient.js";
import { toQueryString } from "../utils/queryString.js";

export const slidersResource = {
  async adminList(filters = {}, options = {}) {
    const response = await apiClient.get(`/admin/sliders${toQueryString(filters)}`, options);
    return {
      sliders: response.data?.sliders ?? [],
      meta: response.meta ?? {},
    };
  },

  async adminGet(id, options = {}) {
    const response = await apiClient.get(`/admin/sliders/${encodeURIComponent(id)}`, options);
    return response.data?.slider ?? null;
  },

  async adminCreate(payload = {}, options = {}) {
    return (await this.adminCreateResponse(payload, options)).slider;
  },

  async adminCreateResponse(payload = {}, options = {}) {
    const response = await apiClient.post("/admin/sliders", payload, options);
    return {
      slider: response.data?.slider ?? null,
      message: response.message ?? "Slider berhasil dibuat.",
      meta: response.meta ?? {},
    };
  },

  async adminUpdate(id, payload = {}, options = {}) {
    return (await this.adminUpdateResponse(id, payload, options)).slider;
  },

  async adminUpdateResponse(id, payload = {}, options = {}) {
    const response = await apiClient.put(`/admin/sliders/${encodeURIComponent(id)}`, payload, options);
    return {
      slider: response.data?.slider ?? null,
      message: response.message ?? "Slider berhasil diperbarui.",
      meta: response.meta ?? {},
    };
  },

  async adminDelete(id, options = {}) {
    const response = await apiClient.delete(`/admin/sliders/${encodeURIComponent(id)}`, options);
    return response.data?.slider ?? null;
  },

  async adminToggle(id, options = {}) {
    const response = await apiClient.post(`/admin/sliders/${encodeURIComponent(id)}/toggle`, {}, options);
    return response.data?.slider ?? null;
  },

  async adminReorder(items = [], options = {}) {
    const response = await apiClient.post("/admin/sliders/reorder", { items }, options);
    return {
      sliders: response.data?.sliders ?? [],
      meta: response.meta ?? {},
    };
  },

  async uploadImage(file, options = {}) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await apiClient.post("/admin/sliders/upload-image", formData, options);
    return response.data?.asset ?? { url: response.data?.url ?? "" };
  },

  async publicList(filters = {}, options = {}) {
    const response = await apiClient.get(`/sliders${toQueryString(filters)}`, options);
    return {
      sliders: response.data?.sliders ?? [],
      meta: response.meta ?? {},
    };
  },
};
