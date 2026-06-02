import { apiClient } from "../../../core/apiClient.js";
import { authStore } from "../../../state/authStore.js";
import { appStore } from "../../../state/store.js";
import { snapshotStore } from "../../../state/snapshotStore.js";

export const adminSessionService = {
  async listUsers(filters = {}, options = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/admin/users${suffix}`, options);
    return {
      users: response.data?.users ?? [],
      meta: response.meta ?? {},
    };
  },

  async pendingUsers(filters = {}, options = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/auth/pending-users${suffix}`, options);
    return {
      users: response.data?.users ?? [],
      meta: response.meta ?? {},
    };
  },

  async userDetail(userId, options = {}) {
    const response = await apiClient.get(`/users/${encodeURIComponent(userId)}`, options);
    return response.data?.user ?? null;
  },

  async approveUsers(userIds = [], options = {}) {
    const response = await apiClient.post("/auth/approve-users", {
      user_ids: userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
    }, options);
    return {
      approvedCount: response.data?.approved_count ?? 0,
      userIds: response.data?.user_ids ?? [],
    };
  },

  async listSettlements(filters = {}, options = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/admin/affiliate-settlements${suffix}`, options);
    return {
      settlements: response.data?.settlements ?? [],
      meta: response.meta ?? {},
    };
  },

  async settlementDetail(settlementBatchId, options = {}) {
    const response = await apiClient.get(`/admin/affiliate-settlements/${encodeURIComponent(settlementBatchId)}`, options);
    return response.data?.settlement ?? null;
  },

  async listAffiliateLedgers(filters = {}, options = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/admin/affiliate-ledgers${suffix}`, options);
    return {
      ledgers: response.data?.ledgers ?? [],
      meta: response.meta ?? {},
    };
  },

  async createSettlement(payload = {}, options = {}) {
    const response = await apiClient.post("/admin/affiliate-settlements", payload, options);
    return response.data?.settlement ?? null;
  },

  async updateSettlementStatus(settlementBatchId, payload = {}, options = {}) {
    const response = await apiClient.patch(`/admin/affiliate-settlements/${encodeURIComponent(settlementBatchId)}/status`, payload, options);
    return response.data?.settlement ?? null;
  },

  async settleSettlement(settlementBatchId, payload = {}, options = {}) {
    const response = await apiClient.post(`/admin/affiliate-settlements/${encodeURIComponent(settlementBatchId)}/settle`, payload, options);
    return response.data?.settlement ?? null;
  },

  async cancelSettlement(settlementBatchId, payload = {}, options = {}) {
    const response = await apiClient.post(`/admin/affiliate-settlements/${encodeURIComponent(settlementBatchId)}/cancel`, payload, options);
    return response.data?.settlement ?? null;
  },

  async startAffiliateImpersonation(targetUserId, payload = {}) {
    const response = await apiClient.post(`/admin/affiliates/${encodeURIComponent(targetUserId)}/impersonate`, {
      reason: typeof payload?.reason === "string" ? payload.reason.trim() : "",
    });

    this.applyImpersonationContext(response.data);
    return response;
  },

  async startSellerImpersonation(targetUserId, payload = {}) {
    const response = await apiClient.post(`/admin/sellers/${encodeURIComponent(targetUserId)}/impersonate`, {
      reason: typeof payload?.reason === "string" ? payload.reason.trim() : "",
    });

    this.applyImpersonationContext(response.data);
    return response;
  },

  async startImpersonation(targetUserId, payload = {}) {
    const role = String(payload?.targetRole ?? "").trim();

    if (role === "seller") {
      return this.startSellerImpersonation(targetUserId, payload);
    }

    if (role === "affiliate_admin") {
      return this.startAffiliateImpersonation(targetUserId, payload);
    }

    const response = await apiClient.post("/admin/impersonations", {
      target_user_id: Number(targetUserId),
      reason: typeof payload?.reason === "string" ? payload.reason.trim() : "",
    });

    this.applyImpersonationContext(response.data);
    return response;
  },

  async stopImpersonation() {
    const response = await apiClient.post("/admin/impersonations/stop", {});
    this.applyImpersonationContext(response.data);
    return response;
  },

  applyImpersonationContext(payload = {}) {
    appStore.destroyWorkingState();
    snapshotStore.clearRole("admin");
    snapshotStore.clearRole("seller");
    snapshotStore.clearRole("affiliate_admin");
    appStore.patchState("app.routeHydrateError", null, "impersonation:clear-hydrate-error");
    appStore.patchState("ui.sidebarOpen", false, "impersonation:close-sidebar");
    appStore.patchState("ui.sidebarCompactExpanded", false, "impersonation:close-compact-sidebar");
    authStore.setContext({
      user: payload?.user ?? null,
      actor: payload?.actor ?? null,
      impersonation: payload?.impersonation ?? null,
    });
  },
};
