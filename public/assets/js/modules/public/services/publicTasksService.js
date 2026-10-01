import { apiClient } from "../../../core/apiClient.js";

export const publicTasksService = {
  async list(options = {}) {
    const response = await apiClient.get("/tasks", options);
    return response.data?.tasks ?? [];
  },

  async updateStatus(taskId, status, options = {}) {
    const response = await apiClient.patch(`/tasks/${encodeURIComponent(taskId)}`, { status }, options);
    return response.data?.task ?? null;
  },
};
