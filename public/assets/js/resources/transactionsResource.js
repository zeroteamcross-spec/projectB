import { apiClient } from "../core/apiClient.js";
import { toQueryString } from "../utils/queryString.js";

export const transactionsResource = {
  async create(payload = {}, options = {}) {
    const response = await apiClient.post("/transactions", payload, options);
    return response.data?.transaction ?? null;
  },

  async list(filters = {}, options = {}) {
    const response = await apiClient.get(`/transactions${toQueryString(filters)}`, options);
    return {
      transactions: response.data?.transactions ?? [],
      meta: response.meta ?? {},
    };
  },

  async detail(id, options = {}) {
    const response = await apiClient.get(`/transactions/${encodeURIComponent(id)}`, options);
    return response.data?.transaction ?? null;
  },

  async status(id, options = {}) {
    const response = await apiClient.get(`/transactions/${encodeURIComponent(id)}/status`, options);
    return response.data?.transaction ?? null;
  },

  async updateStatus(id, payload = {}, options = {}) {
    const response = await apiClient.patch(`/transactions/${encodeURIComponent(id)}/status`, payload, options);
    return response.data?.transaction ?? null;
  },

  async updateFulfillmentChecklist(id, payload = {}, options = {}) {
    const response = await apiClient.patch(`/transactions/${encodeURIComponent(id)}/fulfillment-checklist`, payload, options);
    return response.data?.transaction ?? null;
  },

  async completePayment(id, payload = {}, options = {}) {
    const response = await apiClient.post(`/transactions/${encodeURIComponent(id)}/complete-payment`, payload, options);
    return response.data?.transaction ?? null;
  },

  async cancel(id, payload = {}, options = {}) {
    const response = await apiClient.post(`/transactions/${encodeURIComponent(id)}/cancel`, payload, options);
    return response.data?.transaction ?? null;
  },

  async returnTransaction(id, payload = {}, options = {}) {
    const response = await apiClient.post(`/transactions/${encodeURIComponent(id)}/return`, payload, options);
    return response.data?.transaction ?? null;
  },

  async downloadPaymentQr(id, options = {}) {
    const response = await fetch(apiClient.url(`/transactions/${encodeURIComponent(id)}/payment-qr`), {
      method: "GET",
      credentials: apiClient.credentials,
      headers: {
        Accept: "image/png,image/jpeg,image/webp,image/*,application/json",
      },
      signal: options.signal ?? null,
    });

    if (!response.ok) {
      let message = "Gagal mengunduh QR pembayaran.";
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          const payload = await response.json();
          message = payload?.message || message;
        } catch {
          // ignore invalid error payload
        }
      }

      throw new Error(message);
    }

    return {
      blob: await response.blob(),
      contentType: response.headers.get("content-type") || "image/png",
    };
  },
};
