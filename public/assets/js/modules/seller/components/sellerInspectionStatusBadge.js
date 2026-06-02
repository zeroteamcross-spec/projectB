import { cx, tw } from "../../../ui/theme/tailwindClasses.js";

const REPORT_VARIANTS = {
  draft: { label: "Draft", className: tw.badge.warning },
  completed: { label: "Completed", className: tw.badge.info },
  published: { label: "Published", className: tw.badge.success },
};

const ITEM_VARIANTS = {
  good: { label: "Baik", className: tw.badge.success },
  baik: { label: "Baik", className: tw.badge.success },
  fair: { label: "Kurang baik", className: tw.badge.warning },
  kurang_baik: { label: "Kurang baik", className: tw.badge.warning },
  bad: { label: "Tidak baik", className: tw.badge.danger },
  tidak_baik: { label: "Tidak baik", className: tw.badge.danger },
  not_available: { label: "Tidak tersedia", className: tw.badge.default },
  tidak_tersedia: { label: "Tidak tersedia", className: tw.badge.default },
};

const SUMMARY_VARIANTS = {
  not_checked: { label: "Belum dicek", className: tw.badge.default },
  partial: { label: "Sebagian", className: tw.badge.warning },
  completed: { label: "Selesai", className: tw.badge.success },
};

export function SellerInspectionStatusBadge({ status = "", type = "report" } = {}) {
  const variants = type === "item" ? ITEM_VARIANTS : type === "summary" ? SUMMARY_VARIANTS : REPORT_VARIANTS;
  const variant = variants[status] ?? { label: normalize(status || "unknown"), className: tw.badge.default };
  const badge = document.createElement("span");
  badge.className = cx(tw.badge.base, variant.className);
  badge.textContent = variant.label;
  return badge;
}

function normalize(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
