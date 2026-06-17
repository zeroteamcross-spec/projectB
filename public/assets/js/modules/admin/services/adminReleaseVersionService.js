import { apiClient } from "../../../core/apiClient.js";

export const adminReleaseVersionService = {
  async manifest() {
    const response = await fetch(`/release-manifest.json?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Release manifest gagal dimuat.");
    }

    return response.json();
  },

  async versions(resources = [], options = {}) {
    const query = Array.isArray(resources) && resources.length
      ? `?resources=${encodeURIComponent(resources.join(","))}`
      : "";
    const response = await apiClient.get(`/versions${query}`, options);
    return response.data?.versions ?? [];
  },

  async bump(resourceName, { displayName = "" } = {}, options = {}) {
    const response = await apiClient.post(`/admin/versions/${encodeURIComponent(resourceName)}/bump`, {
      display_name: displayName,
    }, options);
    return response.data?.version ?? null;
  },
};
