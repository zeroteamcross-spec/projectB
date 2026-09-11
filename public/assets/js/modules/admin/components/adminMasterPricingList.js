import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

export function AdminMasterPricingList({
  loading = false,
  plans = [],
  page = 1,
  perPage = 10,
  totalItems = 0,
  onEdit = null,
  onToggleStatus = null,
  onDelete = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.20)]";
  icon.append(createIcon("tag", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "paket",
    onChange: onPageChange,
    onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "admstpr_pagination_previous_button",
      next: "admstpr_pagination_next_button",
      jump: "admstpr_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `admstpr_pagination_page_current_${targetPage}`
        : `admstpr_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "admstpr_rows_per_page_input",
      jump: "admstpr_jump_page_input",
    },
  });

  return DataTable({
    shellId: "admstpr_pricing_table_section",
    title: "Master Harga",
    subtitle: `${totalItems} paket cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Paket", render: (plan) => planCell(plan) },
      { label: "Harga", render: (plan) => textBlock("text-xs font-black text-gray-900", `${formatCurrency(plan.price)}${plan.billing_period ? ` ${plan.billing_period}` : ""}`) },
      { label: "Fitur", render: (plan) => textBlock("text-xs text-gray-600", plan.features?.length ? plan.features.join(", ") : "-") },
      { label: "Status", render: (plan) => statusBadge(plan.status) },
      { label: "Aksi", render: (plan) => actionGroup({ plan, onEdit, onToggleStatus, onDelete, idScope: "desktop" }) },
    ],
    loading,
    rows: plans,
    mobileMode: "disclosure",
    emptyTitle: "Paket harga belum tersedia",
    emptyDescription: "Tambahkan paket pertama supaya showroom bisa memilihnya saat mendaftar.",
    mobileCardTitle: (plan) => plan.name,
    mobileCardSubtitle: (plan) => `${formatCurrency(plan.price)}${plan.billing_period ? ` ${plan.billing_period}` : ""}`,
    mobileCardBadges: (plan) => [statusBadge(plan.status), ...(plan.is_recommended ? [Badge({ label: "Rekomendasi", variant: "info" })] : [])],
    mobilePrimaryFields: (plan) => [
      { label: "Harga", value: `${formatCurrency(plan.price)}${plan.billing_period ? ` ${plan.billing_period}` : ""}` },
      { label: "Status", value: plan.status === "active" ? "Aktif" : "Nonaktif" },
    ],
    mobileDisclosureFields: (plan) => [
      { label: "Fitur", value: plan.features?.length ? plan.features.join(", ") : "-" },
      { label: "Slug", value: plan.slug || "-" },
    ],
    mobileCardActions: (plan) => actionGroup({ plan, onEdit, onToggleStatus, onDelete, idScope: "mobile" }),
    mobileCardId: (plan) => `admstpr_mobile_plan_row_section_${plan.id}`,
    mobileDisclosureButtonLabel: "Lihat detail paket",
    mobileDisclosureCloseLabel: "Tutup detail paket",
    tableMinWidth: "min-w-[960px]",
    getRowKey: (plan) => plan.id,
    pagination,
  });
}

function planCell(plan) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-wrap items-center gap-2";
  nameRow.append(textBlock("font-black text-gray-950", plan.name));
  if (plan.is_recommended) {
    nameRow.append(Badge({ label: "Rekomendasi", variant: "info" }));
  }
  copy.append(nameRow, textBlock("text-xs text-gray-500", plan.slug || "-"));
  wrap.append(copy);
  return wrap;
}

function actionGroup({ plan, onEdit, onToggleStatus, onDelete, idScope }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(plan) });
  edit.id = `admstpr_edit_plan_button_${idScope}_${plan.id}`;
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));

  const toggle = Button({
    label: plan.status === "active" ? "Nonaktifkan" : "Aktifkan",
    variant: plan.status === "active" ? "secondary" : "primary",
    onClick: () => onToggleStatus?.(plan),
  });
  toggle.id = `admstpr_toggle_plan_button_${idScope}_${plan.id}`;
  toggle.prepend(createIcon(plan.status === "active" ? "eyeSlash" : "eye", { className: "h-4 w-4" }));

  const remove = Button({ label: "Hapus", variant: "secondary", onClick: () => onDelete?.(plan) });
  remove.id = `admstpr_delete_plan_button_${idScope}_${plan.id}`;
  remove.prepend(createIcon("trash", { className: "h-4 w-4" }));

  actions.append(edit, toggle, remove);
  return actions;
}

function statusBadge(status) {
  return Badge({
    label: status === "active" ? "Aktif" : "Nonaktif",
    variant: status === "active" ? "success" : "default",
  });
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text ?? "";
  return node;
}
