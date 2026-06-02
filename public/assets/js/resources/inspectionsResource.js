import { apiClient } from "../core/apiClient.js";
import { toQueryString } from "../utils/queryString.js";

export const inspectionsResource = {
  async sellerOverview(filters = {}, options = {}) {
    const response = await apiClient.get(`/seller/inspection/overview${toQueryString(filters)}`, options);
    return response.data?.overview ?? emptyOverview();
  },

  async templates(options = {}) {
    const response = await apiClient.get("/inspection-templates", options);
    return response.data?.templates ?? [];
  },

  async adminTemplates(options = {}) {
    const response = await apiClient.get("/admin/inspection-templates", options);
    return response.data?.templates ?? [];
  },

  async createTemplate(payload = {}, options = {}) {
    const response = await apiClient.post("/admin/inspection-templates", payload, options);
    return response.data?.template ?? null;
  },

  async byCar(carId, options = {}) {
    const response = await apiClient.get(`/cars/${encodeURIComponent(carId)}/inspection-report`, options);
    return response.data?.report ?? null;
  },

  async sellerByCar(carId, options = {}) {
    const response = await apiClient.get(`/seller/cars/${encodeURIComponent(carId)}/inspection-report`, options);
    return response.data?.report ?? null;
  },

  async createReport(carId, payload = {}, options = {}) {
    const response = await apiClient.post(`/cars/${encodeURIComponent(carId)}/inspection-reports`, payload, options);
    return response.data?.report ?? null;
  },

  async updateReport(reportId, payload = {}, options = {}) {
    const response = await apiClient.patch(`/inspection-reports/${encodeURIComponent(reportId)}`, payload, options);
    return response.data?.report ?? null;
  },

  async createItem(reportId, payload = {}, options = {}) {
    const response = await apiClient.post(`/inspection-reports/${encodeURIComponent(reportId)}/items`, payload, options);
    return response.data?.report ?? null;
  },

  async updateItem(reportId, itemId, payload = {}, options = {}) {
    const response = await apiClient.patch(`/inspection-reports/${encodeURIComponent(reportId)}/items/${encodeURIComponent(itemId)}`, payload, options);
    return response.data?.report ?? null;
  },

  async updateTemplate(templateId, payload = {}, options = {}) {
    const response = await apiClient.patch(`/admin/inspection-templates/${encodeURIComponent(templateId)}`, payload, options);
    return response.data?.template ?? null;
  },
};

function emptyOverview() {
  return {
    cars: [],
    reports_by_car_id: {},
    templates: [],
    summary: {
      total_cars: 0,
      completed: 0,
      partial: 0,
      not_checked: 0,
      published_reports: 0,
    },
  };
}
