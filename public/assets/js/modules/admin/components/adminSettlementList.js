import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { AdminSettlementStatusBadge } from "./adminSettlementStatusBadge.js";

export function AdminSettlementList({
  loading = false,
  settlements = [],
  page = 1,
  perPage = 10,
  totalItems = 0,
  isUpdatingId = null,
  onView = null,
  onMarkSettled = null,
  onCancel = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#14b8a6,#f97316)] text-white shadow-[0_14px_34px_rgba(20,184,166,0.20)]";
  icon.append(createIcon("commission", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "settlement",
    onChange: onPageChange,
    onPerPageChange: onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "adst_pagination_previous_button",
      next: "adst_pagination_next_button",
      jump: "adst_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `adst_pagination_page_current_${targetPage}`
        : `adst_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "adst_rows_per_page_input",
      jump: "adst_jump_page_input",
    },
  });

  return DataTable({
    shellId: "adst_settlements_table_section",
    title: "Settlement batches",
    subtitle: `${totalItems} batch cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Batch", render: (settlement) => settlementIdentity(settlement) },
      { label: "Marketing", render: (settlement) => affiliateBlock(settlement) },
      { label: "Amount", render: (settlement) => amountBlock(settlement) },
      { label: "Status", render: (settlement) => statusBlock(settlement) },
      { label: "Timeline", render: (settlement) => timelineBlock(settlement) },
      { label: "Aksi", render: (settlement) => actionGroup({ settlement, isUpdatingId, onView, onMarkSettled, onCancel, idScope: "desktop" }) },
    ],
    loading,
    rows: settlements,
    mobileMode: "disclosure",
    emptyTitle: "Settlement batch belum tersedia",
    emptyDescription: "Batch settlement marketing akan muncul di sini setelah dicatat oleh admin atau saat filter cocok.",
    mobileCardTitle: (settlement) => `${settlement.affiliateLabel} | Batch #${settlement.id}`,
    mobileCardSubtitle: (settlement) => `${settlement.requestedAmountLabel} | ${formatDate(settlement.requested_at)}`,
    mobileCardBadges: (settlement) => [
      AdminSettlementStatusBadge({ status: settlement.status }),
      Badge({ label: `${settlement.ledger_count ?? 0} ledger`, variant: "default" }),
    ],
    mobilePrimaryFields: (settlement) => [
      { label: "Marketing", value: settlement.affiliate?.referral_code || settlement.affiliateLabel || "-" },
      { label: "Nominal", value: settlement.requestedAmountLabel },
      { label: "Status", value: settlement.statusMeta?.label || settlement.status || "-" },
    ],
    mobileDisclosureFields: (settlement) => [
      { label: "Batch", value: `#${settlement.id}` },
      { label: "Ledger", value: String(settlement.ledger_count ?? 0) },
      { label: "Diminta", value: formatDate(settlement.requested_at) },
      { label: "Settled", value: formatDate(settlement.settled_at) },
      { label: "Catatan", value: settlement.notes || "-" },
    ],
    mobileCardActions: (settlement) => actionGroup({ settlement, isUpdatingId, onView, onMarkSettled, onCancel, idScope: "mobile" }),
    mobileCardId: (settlement) => `adst_mobile_row_section_${settlement.id}`,
    mobileDisclosureButtonLabel: "Lihat detail batch",
    mobileDisclosureCloseLabel: "Tutup detail batch",
    tableMinWidth: "min-w-[1080px]",
    rowClassName: () => "bg-white/55",
    getRowKey: (settlement) => settlement.id,
    pagination,
  });
}

function settlementIdentity(settlement) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  const avatar = document.createElement("span");
  avatar.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#ecfeff,#fff7ed)] text-teal-700 ring-1 ring-teal-100";
  avatar.append(createIcon("commission", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("font-black text-gray-950", `Batch #${settlement.id}`),
    textBlock("text-sm text-gray-500", `Ledger ${settlement.ledger_count ?? 0}`),
  );
  wrap.append(avatar, copy);
  return wrap;
}

function affiliateBlock(settlement) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    iconLine("user", settlement.affiliateLabel || "-"),
    textBlock("text-sm text-gray-500", settlement.affiliate?.referral_code || "-"),
  );
  return wrap;
}

function amountBlock(settlement) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textBlock("font-black text-gray-950", settlement.requestedAmountLabel),
    textBlock("text-sm text-gray-500", settlement.notes || "Tidak ada catatan"),
  );
  return wrap;
}

function statusBlock(settlement) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-2";
  wrap.append(
    AdminSettlementStatusBadge({ status: settlement.status }),
    Badge({ label: settlement.statusMeta?.label || settlement.status || "-", variant: "default" }),
  );
  return wrap;
}

function timelineBlock(settlement) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    iconLine("calendar", formatDate(settlement.requested_at)),
    textBlock("text-sm text-gray-500", settlement.settled_at
      ? `Settled ${formatDate(settlement.settled_at)}`
      : settlement.cancelled_at
        ? `Cancelled ${formatDate(settlement.cancelled_at)}`
        : "Menunggu finalisasi"),
  );
  return wrap;
}

function actionGroup({ settlement, isUpdatingId, onView, onMarkSettled, onCancel, idScope = "desktop" }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const detail = Button({
    label: "Detail",
    variant: "secondary",
    onClick: () => onView?.(settlement),
  });
  detail.id = `adst_detail_button_${idScope}_${settlement.id}`;
  detail.prepend(createIcon("transaction", { className: "h-4 w-4" }));

  if (settlement.status !== "pending") {
    const done = document.createElement("span");
    done.className = "inline-flex min-h-10 items-center rounded-full border border-[var(--pb-border)] bg-white px-4 text-sm font-semibold text-gray-500 shadow-sm";
    done.textContent = settlement.statusMeta?.label || "Selesai";
    actions.append(detail, done);
    return actions;
  }

  const isBusy = Number(isUpdatingId) === Number(settlement.id);
  const settle = Button({
    label: isBusy ? "Memproses..." : "Tandai settled",
    variant: "primary",
    disabled: isBusy,
    onClick: () => onMarkSettled?.(settlement),
  });
  settle.id = `adst_mark_settled_button_${idScope}_${settlement.id}`;
  settle.prepend(createIcon("sparkles", { className: "h-4 w-4" }));

  const cancel = Button({
    label: isBusy ? "Memproses..." : "Batalkan",
    variant: "secondary",
    disabled: isBusy,
    onClick: () => onCancel?.(settlement),
  });
  cancel.id = `adst_cancel_button_${idScope}_${settlement.id}`;
  cancel.prepend(createIcon("filter", { className: "h-4 w-4" }));

  actions.append(detail, settle, cancel);
  return actions;
}

function iconLine(iconName, text) {
  const node = document.createElement("p");
  node.className = "flex min-w-0 items-center gap-2 break-words text-sm font-semibold text-gray-800";
  node.append(createIcon(iconName, { className: "h-3.5 w-3.5 shrink-0 text-orange-600" }), document.createTextNode(text));
  return node;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
