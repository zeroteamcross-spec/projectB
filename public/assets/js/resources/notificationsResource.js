import { apiClient } from "../core/apiClient.js";
import { toQueryString } from "../utils/queryString.js";

export const notificationsResource = {
  async snapshot(params = {}, options = {}) {
    const response = await apiClient.get(`/notifications/snapshot${toQueryString(params)}`, options);
    return {
      unread_count: response.data?.unread_count ?? 0,
      items: response.data?.items ?? [],
    };
  },

  async list(params = {}, options = {}) {
    const response = await apiClient.get(`/notifications${toQueryString(params)}`, options);
    return {
      items: response.data?.items ?? [],
      next_cursor: response.data?.next_cursor ?? null,
      unread_count: response.data?.unread_count ?? 0,
    };
  },

  async markRead(id, options = {}) {
    const response = await apiClient.post(`/notifications/${encodeURIComponent(id)}/read`, {}, options);
    return {
      id: response.data?.id ?? id,
      is_read: Boolean(response.data?.is_read),
      read_at: response.data?.read_at ?? null,
      unread_count: response.data?.unread_count ?? 0,
    };
  },

  async markAllRead(options = {}) {
    const response = await apiClient.post("/notifications/read-all", {}, options);
    return {
      updated_count: response.data?.updated_count ?? 0,
      unread_count: response.data?.unread_count ?? 0,
    };
  },
};
