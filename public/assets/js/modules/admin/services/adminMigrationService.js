import { apiClient } from "../../../core/apiClient.js";

export const adminMigrationService = {
  async status(options = {}) {
    const response = await apiClient.get("/admin/migrations", options);
    return response.data?.migrations ?? [];
  },

  async runPending({ limit = null } = {}, options = {}) {
    const body = {};
    if (limit) {
      body.limit = limit;
    }

    const response = await apiClient.post("/admin/migrations/run", body, options);
    return {
      results: response.data?.results ?? [],
      migrations: response.data?.migrations ?? [],
    };
  },

  async markApplied(name, options = {}) {
    const response = await apiClient.post(`/admin/migrations/${encodeURIComponent(name)}/mark-applied`, {}, options);
    return {
      migration: response.data?.migration ?? null,
      migrations: response.data?.migrations ?? [],
    };
  },
};
