import { affiliatesResource } from "../../../resources/affiliatesResource.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

const STATUS_META = {
  active: { label: "Aktif", variant: "success" },
  inactive: { label: "Nonaktif", variant: "warning" },
};

export const sellerCommissionRuleService = {
  list(params = {}, options = {}) {
    return affiliatesResource.sellerCommissionRules(params, options);
  },

  saveGlobal(payload = {}, options = {}) {
    return affiliatesResource.sellerUpsertGlobalCommissionRule(this.normalizePayload(payload), options);
  },

  createOverride(payload = {}, options = {}) {
    return affiliatesResource.sellerCreateCommissionOverride(this.normalizePayload(payload), options);
  },

  updateOverride(ruleId, payload = {}, options = {}) {
    return affiliatesResource.sellerUpdateCommissionOverride(ruleId, this.normalizePayload(payload), options);
  },

  normalizePayload(payload = {}) {
    return {
      car_id: payload.car_id ? Number(payload.car_id) : null,
      commission_type: payload.commission_type === "percent" ? "percent" : "flat",
      commission_value: Number(payload.commission_value ?? 0),
      status: payload.status === "inactive" ? "inactive" : "active",
    };
  },

  emptyGlobalRule() {
    return {
      commission_type: "percent",
      commission_value: 5,
      status: "active",
    };
  },

  emptyOverride() {
    return {
      car_id: "",
      commission_type: "percent",
      commission_value: 5,
      status: "active",
    };
  },

  statusMeta(status = "") {
    return STATUS_META[status] ?? { label: status || "-", variant: "default" };
  },

  counts(payload = null) {
    const overrides = payload?.overrides ?? [];
    const globalRule = payload?.global_rule ?? null;

    return {
      hasGlobal: Boolean(globalRule),
      activeGlobal: Boolean(globalRule && globalRule.status === "active"),
      overrideCount: overrides.length,
      activeOverrides: overrides.filter((rule) => rule.status === "active").length,
    };
  },

  resolveSelectedOverride({ overrides = [], ruleId = "" } = {}) {
    const targetId = Number(ruleId);
    if (!targetId) {
      return null;
    }

    return overrides.find((rule) => Number(rule.id) === targetId) ?? null;
  },

  ruleLabel(rule = null) {
    if (!rule) {
      return "-";
    }

    if (rule.commission_type === "percent") {
      return `${Number(rule.commission_value ?? 0)}%`;
    }

    return formatCurrency(rule.commission_value ?? 0);
  },

  priorityCopy() {
    return "Override per mobil menang atas global rule saat rule efektif dihitung.";
  },

  carLabel(car = null) {
    if (!car) {
      return "Mobil belum dipilih";
    }

    return [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ");
  },
};
