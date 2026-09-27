import { apiClient } from "../core/apiClient.js";

export const showroomsResource = {
  async validateSlug(slug, options = {}) {
    const response = await apiClient.get(`/showrooms/slugs/${encodeURIComponent(slug)}/validate`, options);
    return response.data?.showroom ?? null;
  },

  async mine(options = {}) {
    const response = await apiClient.get("/showrooms/me", options);
    return response.data?.showroom ?? null;
  },

  async updateMine(payload = {}, options = {}) {
    const response = await apiClient.patch("/showrooms/me", payload, options);
    return response.data?.showroom ?? null;
  },

  async uploadBrandingIcon(file, options = {}) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post("/showrooms/me/branding-icon", formData, options);
    return response.data?.asset ?? null;
  },

  async uploadBrandingLogo(file, options = {}) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post("/showrooms/me/branding-logo", formData, options);
    return response.data?.asset ?? null;
  },

  async submitSubscriptionProof(file, note = "", options = {}) {
    const formData = new FormData();
    formData.append("proof", file);
    if (note) {
      formData.append("note", note);
    }
    const response = await apiClient.post("/showrooms/me/subscription/proof", formData, options);
    return response.data?.showroom ?? null;
  },

  async deactivate(showroomId, reason, options = {}) {
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/deactivate`, { reason }, options);
    return response.data?.showroom ?? null;
  },

  async activate(showroomId, options = {}) {
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/activate`, {}, options);
    return response.data?.showroom ?? null;
  },

  async confirmSubscriptionPayment(showroomId, options = {}) {
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/subscription/confirm`, {}, options);
    return response.data?.showroom ?? null;
  },

  async rejectSubscriptionPayment(showroomId, reason, options = {}) {
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/subscription/reject`, { reason }, options);
    return response.data?.showroom ?? null;
  },

  async dueSubscriptions(options = {}) {
    const response = await apiClient.get("/showrooms/subscriptions/due", options);
    return response.data?.showrooms ?? [];
  },

  async createSubscriptionMidtransCharge(bank, options = {}) {
    const response = await apiClient.post("/showrooms/me/subscription/midtrans/charge", { bank }, options);
    return response.data?.showroom ?? null;
  },

  async subscriptionHistory(options = {}) {
    const response = await apiClient.get("/showrooms/me/subscription/history", options);
    return response.data?.history ?? [];
  },

  async subscriptionHistoryFor(showroomId, options = {}) {
    const response = await apiClient.get(`/showrooms/${encodeURIComponent(showroomId)}/subscription/history`, options);
    return response.data?.history ?? [];
  },

  // --- Fitur multi-cabang: satu akun bisa punya banyak showroom, method di
  // bawah ini semuanya menerima showroom_id eksplisit (bukan lagi menebak
  // "showroom milik akun ini" seperti method /me di atas). Method /me di
  // atas TETAP dipakai (jalur cabang pertama, kompatibilitas mundur) --
  // tidak dihapus, tidak diubah.

  async mineList(options = {}) {
    const response = await apiClient.get("/showrooms/mine", options);
    return response.data?.showrooms ?? [];
  },

  async createBranch(payload = {}, options = {}) {
    const response = await apiClient.post("/showrooms", payload, options);
    return response.data?.showroom ?? null;
  },

  async mineById(showroomId, options = {}) {
    const response = await apiClient.get(`/showrooms/${encodeURIComponent(showroomId)}/mine`, options);
    return response.data?.showroom ?? null;
  },

  async updateBranch(showroomId, payload = {}, options = {}) {
    const response = await apiClient.patch(`/showrooms/${encodeURIComponent(showroomId)}/mine`, payload, options);
    return response.data?.showroom ?? null;
  },

  async uploadBrandingIconFor(showroomId, file, options = {}) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/mine/branding-icon`, formData, options);
    return response.data?.asset ?? null;
  },

  async uploadBrandingLogoFor(showroomId, file, options = {}) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/mine/branding-logo`, formData, options);
    return response.data?.asset ?? null;
  },

  async submitSubscriptionProofFor(showroomId, file, note = "", options = {}) {
    const formData = new FormData();
    formData.append("proof", file);
    if (note) {
      formData.append("note", note);
    }
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/mine/subscription/proof`, formData, options);
    return response.data?.showroom ?? null;
  },

  async createSubscriptionMidtransChargeFor(showroomId, bank, options = {}) {
    const response = await apiClient.post(`/showrooms/${encodeURIComponent(showroomId)}/mine/subscription/midtrans/charge`, { bank }, options);
    return response.data?.showroom ?? null;
  },

  async subscriptionHistoryForOwned(showroomId, options = {}) {
    const response = await apiClient.get(`/showrooms/${encodeURIComponent(showroomId)}/mine/subscription/history`, options);
    return response.data?.history ?? [];
  },
};
