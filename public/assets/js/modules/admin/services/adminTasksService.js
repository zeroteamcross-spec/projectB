import { apiClient } from "../../../core/apiClient.js";

export const adminTasksService = {
  async list(options = {}) {
    const response = await apiClient.get("/admin/tasks", options);
    return response.data?.tasks ?? [];
  },

  async updateStatus(taskId, status, options = {}) {
    const response = await apiClient.patch(`/admin/tasks/${encodeURIComponent(taskId)}`, { status }, options);
    return response.data?.task ?? null;
  },
};
