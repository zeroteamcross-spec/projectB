import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminTransactionMonitoringService } from "../services/adminTransactionMonitoringService.js";
import { AdminTransactionStatusBadge } from "./adminTransactionStatusBadge.js";

export function AdminTransactionsList({
  loading = false,
  transactions = [],
  page = 1,
  perPage = 10,
  totalItems = 0,
  selectedTransactionId = "",
  onSelect = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c53030,#1e81b0)] text-white shadow-[0_14px_34px_rgba(185,28,28,0.22)]";
  icon.append(createIcon("transaction", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "transaksi",
    onChange: onPageChange,
    onPerPageChange: onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "adtr_pagination_previous_button",
      next: "adtr_pagination_next_button",
      jump: "adtr_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `adtr_pagination_page_current_${targetPage}`
        : `adtr_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "adtr_rows_per_page_input",
      jump: "adtr_jump_page_input",
    },
  });

  return DataTable({
    shellId: "adtr_transactions_table_section",
    title: "Transaction ledger",
    subtitle: `${totalItems} transaksi cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Transaksi", render: (transaction) => transactionIdentity(transaction) },
      { label: "Buyer / Seller", render: (transaction) => partyBlock(transaction) },
      { label: "Payment", render: (transaction) => paymentBlock(transaction) },
      { label: "Status", render: (transaction) => statusBlock(transaction) },
      { label: "Timeline", render: (transaction) => timelineBlock(transaction) },
      { label: "Aksi", render: (transaction) => actionGroup({ transaction, selected: Number(selectedTransactionId) === Number(transaction.id), onSelect, idScope: "desktop" }) },
    ],
    loading,
    rows: transactions,
    mobileMode: "disclosure",
    emptyTitle: "Transaksi belum tersedia",
    emptyDescription: "Daftar transaksi admin akan muncul setelah ada aktivitas buyer dan seller atau saat filter cocok.",
    mobileCardTitle: (transaction) => transaction.transaction_code || `TRX #${transaction.id}`,
    mobileCardSubtitle: (transaction) => `${transaction.buyer?.name || "-"} -> ${transaction.seller?.name || "-"}`,
    mobileCardBadges: (transaction) => [
      AdminTransactionStatusBadge({ status: transaction.transaction_status }),
      Badge({ label: adminTransactionMonitoringService.paymentTypeLabel(transaction.payment_type), variant: "default" }),
    ],
    mobilePrimaryFields: (transaction) => {
      const financials = adminTransactionMonitoringService.financials(transaction);
      return [
        { label: "Mobil", value: carLabel(transaction) },
        { label: "Total", value: formatCurrency(financials.total) },
        { label: "Due now", value: formatCurrency(financials.dueNow) },
      ];
    },
    mobileDisclosureFields: (transaction) => {
      const financials = adminTransactionMonitoringService.financials(transaction);
      return [
        { label: "Status", value: adminTransactionMonitoringService.statusMeta(transaction.transaction_status).label },
        { label: "Sisa", value: formatCurrency(financials.remaining) },
        { label: "Sudah dibayar", value: formatCurrency(financials.paid) },
        { label: "Dibuat", value: formatDate(transaction.created_at) },
        { label: "Buyer email", value: transaction.buyer?.email || "-" },
      ];
    },
    mobileCardActions: (transaction) => actionGroup({ transaction, selected: Number(selectedTransactionId) === Number(transaction.id), onSelect, idScope: "mobile" }),
    mobileCardId: (transaction) => `adtr_mobile_row_section_${transaction.id}`,
    mobileDisclosureButtonLabel: "Lihat kolom lainnya",
    mobileDisclosureCloseLabel: "Tutup detail kolom",
    tableMinWidth: "min-w-[1120px]",
    rowClassName: (transaction) => Number(selectedTransactionId) === Number(transaction.id)
      ? "bg-[var(--pb-surface-muted)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]"
      : "bg-white/55",
    getRowKey: (transaction) => transaction.id,
    pagination,
  });
}

function transactionIdentity(transaction) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  const avatar = document.createElement("span");
  avatar.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#faf4ed,#f5ece1)] text-[color-mix(in_srgb,var(--pb-danger)_84%,black)] ring-1 ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]";
  avatar.append(createIcon("transaction", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("break-words font-black text-gray-950", transaction.transaction_code || `TRX #${transaction.id ?? "-"}`),
    textBlock("break-words text-sm text-gray-500", carLabel(transaction)),
  );
  wrap.append(avatar, copy);
  return wrap;
}

function partyBlock(transaction) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    iconLine("user", transaction.buyer?.name || "Buyer terdaftar"),
    iconLine("showroom", transaction.seller?.name || "Seller terdaftar"),
    textBlock("break-words text-sm text-gray-500", transaction.showroom?.name || "-"),
  );
  return wrap;
}

function paymentBlock(transaction) {
  const financials = adminTransactionMonitoringService.financials(transaction);
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textBlock("font-black text-gray-950", formatCurrency(financials.total)),
    textBlock("text-sm font-semibold text-gray-700", `${financials.dueNowLabel}: ${formatCurrency(financials.dueNow)}`),
    textBlock("text-sm text-gray-500", `Sisa ${formatCurrency(financials.remaining)}`),
  );
  return wrap;
}

function statusBlock(transaction) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-2";
  wrap.append(
    AdminTransactionStatusBadge({ status: transaction.transaction_status }),
    Badge({ label: adminTransactionMonitoringService.paymentTypeLabel(transaction.payment_type), variant: "default" }),
  );
  return wrap;
}

function timelineBlock(transaction) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    iconLine("calendar", formatDate(transaction.created_at)),
    textBlock("text-sm text-gray-500", transaction.paid_at ? `Paid ${formatDate(transaction.paid_at)}` : `Expires ${formatDate(transaction.expires_at)}`),
  );
  return wrap;
}

function actionGroup({ transaction, selected, onSelect, idScope = "desktop" }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const detailButton = Button({
    label: selected ? "Detail aktif" : "Detail",
    variant: selected ? "primary" : "secondary",
    onClick: () => onSelect?.(transaction),
  });
  detailButton.id = `adtr_detail_button_${idScope}_${transaction.id}`;
  detailButton.prepend(createIcon("search", { className: "h-4 w-4" }));
  actions.append(detailButton);

  return actions;
}

function iconLine(iconName, text) {
  const node = document.createElement("p");
  node.className = "flex min-w-0 items-center gap-2 break-words text-sm font-semibold text-gray-800";
  node.append(createIcon(iconName, { className: "h-3.5 w-3.5 shrink-0 text-[var(--pb-brand-secondary)]" }), document.createTextNode(text));
  return node;
}

function carLabel(transaction) {
  return [transaction?.car?.brand_name, transaction?.car?.model_name].filter(Boolean).join(" ") || `Mobil #${transaction?.car_id ?? "-"}`;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
