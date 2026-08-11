import { Button } from "../../../ui/primitives/button.js";
import { DataTable } from "../../../ui/composites/dataTable.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { SellerCommissionRuleStatusBadge } from "./sellerCommissionRuleStatusBadge.js";
import { sellerAffiliateCommissionService } from "../services/sellerAffiliateCommissionService.js";

export function SellerCommissionOverridesList({
  overrides = [],
  totalItems = 0,
  loading = false,
  onDetail = null,
  onEdit = null,
  pagination = null,
} = {}) {
  const shell = document.createElement("section");
  shell.id = "slrafc_list_section";
  shell.className = "grid min-w-0 gap-4";
  shell.dataset.ds = "seller.commissions.overrides";

  shell.append(DataTable({
    shellId: "slrafc_commissions_table",
    title: "Aturan komisi per mobil",
    subtitle: `${totalItems} aturan khusus cocok dengan filter aktif`,
    icon: tableIcon(),
    columns: commissionColumns({ onDetail, onEdit }),
    rows: overrides,
    loading,
    emptyTitle: "Belum ada komisi marketing",
    emptyDescription: "Komisi akan muncul setelah aturan umum atau aturan khusus per mobil diatur.",
    tableMinWidth: "min-w-[1040px]",
    mobileMode: "stack",
    getRowKey: (rule) => rule.id,
    mobileCardId: (rule) => `slrafc_commission_row_${rule.id}_section`,
    mobileCardTitle: (rule) => sellerAffiliateCommissionService.carLabel(rule.car),
    mobileCardSubtitle: (rule) => rule.car?.listing_status ? `Listing ${rule.car.listing_status}` : "Aturan khusus per mobil",
    mobileCardBadges: (rule) => [SellerCommissionRuleStatusBadge(rule.status)],
    mobileCardFields: (rule) => [
      { label: "Nilai transaksi", value: rule.car?.price_cash ? formatCurrency(rule.car.price_cash) : "-" },
      { label: "Komisi", value: sellerAffiliateCommissionService.formatValue(rule) },
      { label: "Tanggal", value: formatDate(rule.updated_at || rule.created_at) },
    ],
    mobileCardActions: (rule) => actionButtons(rule, { onDetail, onEdit }),
    pagination,
  }));

  return shell;
}

function commissionColumns({ onDetail, onEdit }) {
  return [
    {
      label: "Marketing",
      key: "affiliate",
      render: () => {
        const wrap = document.createElement("section");
        wrap.className = "grid min-w-0 gap-1";
        wrap.append(
          textNode("p", "break-words text-xs font-black text-gray-950", "Semua marketing seller"),
          textNode("p", "break-words text-[10px] font-semibold leading-5 text-gray-500", "Aturan berlaku untuk referral marketing seller ini"),
        );
        return wrap;
      },
    },
    {
      label: "Transaksi / Mobil",
      key: "car",
      render: (rule) => {
        const wrap = document.createElement("section");
        wrap.id = `slrafc_rule_car_${rule.id}_section`;
        wrap.className = "grid min-w-0 gap-1";
        wrap.append(
          textNode("p", "break-words text-xs font-black text-gray-950", sellerAffiliateCommissionService.carLabel(rule.car)),
          textNode("p", "break-words text-[10px] font-semibold leading-5 text-gray-500", rule.car?.listing_status ? `Listing ${rule.car.listing_status}` : "Mobil seller"),
        );
        return wrap;
      },
    },
    {
      label: "Nilai Transaksi",
      key: "transaction_value",
      render: (rule) => textNode("span", "text-xs font-semibold text-gray-700", rule.car?.price_cash ? formatCurrency(rule.car.price_cash) : "-"),
    },
    {
      label: "Komisi",
      key: "commission",
      render: (rule) => {
        const wrap = document.createElement("section");
        wrap.className = "grid gap-1";
        wrap.append(
          textNode("p", "text-xs font-black text-gray-950", sellerAffiliateCommissionService.formatValue(rule)),
          textNode("p", "text-[10px] font-semibold text-gray-500", labelize(rule.commission_type)),
        );
        return wrap;
      },
    },
    {
      label: "Status",
      key: "status",
      render: (rule) => SellerCommissionRuleStatusBadge(rule.status),
    },
    {
      label: "Tanggal",
      key: "updated_at",
      render: (rule) => textNode("span", "text-xs font-semibold text-gray-700", formatDate(rule.updated_at || rule.created_at)),
    },
    {
      label: "Aksi",
      key: "actions",
      cellClassName: "px-4 py-4 align-top",
      render: (rule) => actionButtons(rule, { onDetail, onEdit }),
    },
  ];
}

function actionButtons(rule, { onDetail, onEdit }) {
  const ruleId = rule?.id ?? "unknown";
  const actions = document.createElement("section");
  actions.id = `slrafc_rule_actions_${ruleId}_section`;
  actions.className = "flex flex-wrap gap-2";

  const detail = Button({ label: "Detail", variant: "secondary", onClick: () => onDetail?.(rule) });
  detail.id = `slrafc_detail_button_${ruleId}`;
  detail.prepend(createIcon("eye", { className: "h-4 w-4" }));

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(rule) });
  edit.id = `slrafc_edit_button_${ruleId}`;
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));

  actions.append(detail, edit);
  return actions;
}

function tableIcon() {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] text-[var(--pb-brand-secondary)]";
  icon.append(createIcon("commission", { className: "h-4 w-4" }));
  return icon;
}

function labelize(value) {
  return String(value ?? "-").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
