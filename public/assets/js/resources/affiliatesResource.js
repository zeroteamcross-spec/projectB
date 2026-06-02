import { apiClient } from "../core/apiClient.js";

export const affiliatesResource = {
  async validateReferralCode(code, options = {}) {
    const response = await apiClient.get(`/affiliate/referral-codes/${encodeURIComponent(code)}/validate`, options);
    return response.data?.referral_code ?? null;
  },

  async sellerList(params = {}, options = {}) {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get(`/seller/affiliates${suffix}`, options);
    return {
      affiliates: response.data?.affiliates ?? [],
      meta: response.meta ?? {},
    };
  },

  async sellerDetail(affiliateId, options = {}) {
    const response = await apiClient.get(`/seller/affiliates/${encodeURIComponent(affiliateId)}`, options);
    return response.data?.affiliate ?? null;
  },

  async sellerCreate(payload = {}, options = {}) {
    const response = await apiClient.post("/seller/affiliates", payload, options);
    return response.data?.affiliate ?? null;
  },

  async sellerUpdate(affiliateId, payload = {}, options = {}) {
    const response = await apiClient.patch(`/seller/affiliates/${encodeURIComponent(affiliateId)}`, payload, options);
    return response.data?.affiliate ?? null;
  },

  async sellerCheckSlugAvailability(slug, { ignoreAffiliateId = null, ...options } = {}) {
    const query = ignoreAffiliateId ? `?ignore_affiliate_id=${encodeURIComponent(ignoreAffiliateId)}` : "";
    const response = await apiClient.get(`/seller/affiliate-slugs/${encodeURIComponent(slug)}/availability${query}`, options);
    return response.data?.availability ?? null;
  },

  async sellerCommissionRules(params = {}, options = {}) {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get(`/seller/affiliate-commission-rules${suffix}`, options);
    return {
      global_rule: response.data?.global_rule ?? null,
      overrides: response.data?.overrides ?? [],
      meta: response.meta ?? {},
    };
  },

  async sellerUpsertGlobalCommissionRule(payload = {}, options = {}) {
    const response = await apiClient.patch("/seller/affiliate-commission-rules/global", payload, options);
    return response.data?.rule ?? null;
  },

  async sellerCreateCommissionOverride(payload = {}, options = {}) {
    const response = await apiClient.post("/seller/affiliate-commission-rules/overrides", payload, options);
    return response.data?.rule ?? null;
  },

  async sellerUpdateCommissionOverride(ruleId, payload = {}, options = {}) {
    const response = await apiClient.patch(`/seller/affiliate-commission-rules/overrides/${encodeURIComponent(ruleId)}`, payload, options);
    return response.data?.rule ?? null;
  },

  async recordClick(payload = {}, options = {}) {
    const response = await apiClient.post("/affiliate/clicks", payload, options);
    return response.data?.click ?? null;
  },
};
