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

  async updateWorkStatus(taskId, workStatus, options = {}) {
    const response = await apiClient.patch(`/admin/tasks/${encodeURIComponent(taskId)}/work-status`, { work_status: workStatus }, options);
    return response.data?.task ?? null;
  },
};
