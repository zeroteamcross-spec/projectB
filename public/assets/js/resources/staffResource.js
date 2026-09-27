import { apiClient } from "../core/apiClient.js";

export const staffResource = {
  async listMine(showroomId, options = {}) {
    const response = await apiClient.get(`/showrooms/${encodeURIComponent(showroomId)}/staff`, options);
    return response.data?.staff ?? [];
  },

  async create(showroomId, payload = {}, options = {}) {
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/staff`, payload, options);
    return response.data?.staff ?? null;
  },

  async update(showroomId, staffId, payload = {}, options = {}) {
    const response = await apiClient.patch(
      `/showrooms/${encodeURIComponent(showroomId)}/staff/${encodeURIComponent(staffId)}`,
      payload,
      options
    );
    return response.data?.staff ?? null;
  },
};
