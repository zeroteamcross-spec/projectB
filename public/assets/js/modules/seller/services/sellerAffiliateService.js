import { affiliatesResource } from "../../../resources/affiliatesResource.js";

const STATUS_META = {
  active: { label: "Aktif", variant: "success" },
  inactive: { label: "Nonaktif", variant: "warning" },
};

export const sellerAffiliateService = {
  list(params = {}, options = {}) {
    return affiliatesResource.sellerList(params, options);
  },

  detail(affiliateId, options = {}) {
    return affiliatesResource.sellerDetail(affiliateId, options);
  },

  create(payload = {}, options = {}) {
    return affiliatesResource.sellerCreate(this.normalizePayload(payload), options);
  },

  update(affiliateId, payload = {}, options = {}) {
    return affiliatesResource.sellerUpdate(affiliateId, this.normalizePayload(payload), options);
  },

  checkSlugAvailability(slug, { ignoreAffiliateId = null, ...options } = {}) {
    const normalized = this.normalizeSlug(slug);

    if (!normalized) {
      return Promise.resolve({ referral_code: "", is_available: false });
    }

    return affiliatesResource.sellerCheckSlugAvailability(normalized, { ignoreAffiliateId, ...options });
  },

  normalizeSlug(slug = "") {
    return String(slug ?? "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();
  },

  normalizePayload(payload = {}) {
    const normalized = {
      name: String(payload.name ?? "").trim(),
      email: String(payload.email ?? "").trim(),
      phone_number: String(payload.phone_number ?? "").trim(),
      referral_code: this.normalizeSlug(payload.referral_code),
      status: payload.status === "inactive" ? "inactive" : "active",
    };

    const password = String(payload.password ?? "");
    const confirmation = String(payload.password_confirmation ?? "");
    if (password || confirmation) {
      normalized.password = password;
      normalized.password_confirmation = confirmation;
    }

    return normalized;
  },

  emptyDraft() {
    return {
      name: "",
      email: "",
      phone_number: "",
      referral_code: "",
      status: "active",
    };
  },

  statusMeta(status) {
    return STATUS_META[status] ?? { label: status || "-", variant: "default" };
  },

  counts(affiliates = []) {
    return {
      total: affiliates.length,
      active: affiliates.filter((affiliate) => affiliate.status === "active").length,
      inactive: affiliates.filter((affiliate) => affiliate.status === "inactive").length,
    };
  },

  resolveSelectedAffiliate({ detail = null, affiliates = [], affiliateId = "" } = {}) {
    const targetId = Number(affiliateId);

    if (!targetId) {
      return null;
    }

    if (detail && Number(detail.id) === targetId) {
      return detail;
    }

    return affiliates.find((affiliate) => Number(affiliate.id) === targetId) ?? null;
  },

  landingPath(slug = "") {
    const normalized = this.normalizeSlug(slug);
    return normalized ? `/af/${encodeURIComponent(normalized)}` : "";
  },

  landingUrl(slug = "") {
    const path = this.landingPath(slug);

    if (!path) {
      return "";
    }

    const hostname = window.location.hostname.replace(/^(showroom|marketing|admin)\./i, "");
    const origin = `${window.location.protocol}//${hostname}${window.location.port ? ":" + window.location.port : ""}`;

    return `${origin}${window.location.pathname}#${path}`;
  },

};
