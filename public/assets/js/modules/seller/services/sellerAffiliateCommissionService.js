import { affiliatesResource } from "../../../resources/affiliatesResource.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

const STATUS_META = {
  active: { label: "Aktif", variant: "success" },
  inactive: { label: "Nonaktif", variant: "warning" },
};

const TYPE_META = {
  percent: { label: "Persentase", variant: "info" },
  flat: { label: "Nominal", variant: "default" },
};

export const sellerAffiliateCommissionService = {
  list(params = {}, options = {}) {
    return affiliatesResource.sellerCommissionRules(params, options);
  },

  saveGlobalRule(payload = {}, options = {}) {
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
      commission_value: 0,
      status: "active",
    };
  },

  emptyOverride() {
    return {
      car_id: "",
      commission_type: "percent",
      commission_value: 0,
      status: "active",
    };
  },

  statusMeta(status) {
    return STATUS_META[status] ?? { label: status || "-", variant: "default" };
  },

  typeMeta(type) {
    return TYPE_META[type] ?? { label: type || "-", variant: "default" };
  },

  formatValue(rule = null) {
    if (!rule) {
      return "-";
    }

    return rule.commission_type === "percent"
      ? `${Number(rule.commission_value ?? 0)}%`
      : formatCurrency(rule.commission_value ?? 0);
  },

  summary({ globalRule = null, overrides = [] } = {}) {
    return {
      totalOverrides: overrides.length,
      activeOverrides: overrides.filter((rule) => rule.status === "active").length,
      inactiveOverrides: overrides.filter((rule) => rule.status === "inactive").length,
      hasGlobalRule: Boolean(globalRule),
      activeGlobalRule: globalRule?.status === "active",
    };
  },

  resolveSelectedOverride({ overrides = [], ruleId = "" } = {}) {
    const targetId = Number(ruleId);

    if (!targetId) {
      return null;
    }

    return overrides.find((rule) => Number(rule.id) === targetId) ?? null;
  },

  eligibleCars(cars = [], overrides = [], selectedRuleId = "") {
    const selectedId = Number(selectedRuleId);
    const usedCarIds = new Set(
      overrides
        .filter((rule) => Number(rule.id) !== selectedId)
        .map((rule) => Number(rule.car_id))
        .filter(Boolean),
    );

    return cars.filter((car) => !usedCarIds.has(Number(car.id)));
  },

  carLabel(car = null) {
    if (!car) {
      return "Mobil showroom";
    }

    return [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ");
  },

  priorityCopy() {
    return "Aturan khusus per mobil diprioritaskan di atas aturan umum. Jika aturan khusus nonaktif, aturan umum tetap dipakai bila aktif.";
  },
};
