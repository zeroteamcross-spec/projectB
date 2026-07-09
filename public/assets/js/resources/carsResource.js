import { apiClient } from "../core/apiClient.js";
import { toQueryString } from "../utils/queryString.js";

export const carsResource = {
  async list(filters = {}, options = {}) {
    const response = await apiClient.get(`/cars${toQueryString(filters)}`, options);
    return {
      cars: response.data?.cars ?? [],
      meta: response.meta ?? {},
    };
  },

  async detail(id, options = {}) {
    const response = await apiClient.get(`/cars/${encodeURIComponent(id)}`, options);
    return response.data?.car ?? null;
  },

  async sellerDetail(id, options = {}) {
    const response = await apiClient.get(`/seller/cars/${encodeURIComponent(id)}`, options);
    return response.data?.car ?? null;
  },

  async sellerList(filters = {}, options = {}) {
    const response = await apiClient.get(`/seller/cars${toQueryString(filters)}`, options);
    return {
      cars: response.data?.cars ?? [],
      meta: response.meta ?? {},
    };
  },

  async adminList(filters = {}, options = {}) {
    const response = await apiClient.get(`/admin/cars${toQueryString(filters)}`, options);
    return {
      cars: response.data?.cars ?? [],
      meta: response.meta ?? {},
    };
  },

  async adminDetail(id, options = {}) {
    const response = await apiClient.get(`/admin/cars/${encodeURIComponent(id)}`, options);
    return response.data?.car ?? null;
  },

  async sellerCreate(payload = {}, options = {}) {
    const response = await apiClient.post("/seller/cars", payload, options);
    return response.data?.car ?? null;
  },

  async sellerUpdate(id, payload = {}, options = {}) {
    const response = await apiClient.patch(`/seller/cars/${encodeURIComponent(id)}`, payload, options);
    return response.data?.car ?? null;
  },

  async sellerArchive(id, options = {}) {
    const response = await apiClient.delete(`/seller/cars/${encodeURIComponent(id)}`, options);
    return response.data?.car ?? null;
  },

  async adminCreate(payload = {}, options = {}) {
    const response = await apiClient.post("/admin/cars", payload, options);
    return response.data?.car ?? null;
  },

  async adminUpdate(id, payload = {}, options = {}) {
    const response = await apiClient.patch(`/admin/cars/${encodeURIComponent(id)}`, payload, options);
    return response.data?.car ?? null;
  },

  async adminArchive(id, options = {}) {
    const response = await apiClient.delete(`/admin/cars/${encodeURIComponent(id)}`, options);
    return response.data?.car ?? null;
  },
};
