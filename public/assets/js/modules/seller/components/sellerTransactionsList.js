import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { sellerTransactionService } from "../services/sellerTransactionService.js";
import { SellerTransactionStatusBadge } from "./sellerTransactionStatusBadge.js";

export function SellerTransactionsList({
  transactions = [],
  totalItems = 0,
  loading = false,
  page = 1,
  perPage = 10,
  selectedTransactionId = "",
  onOpen = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white leading-none shadow-[0_14px_34px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("transaction", { className: "block h-4 w-4 leading-none" }));

  const pagination = totalItems > perPage
    ? DataTablePagination({
      page,
      totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
      totalItems,
      perPage,
      pageSizeOptions: [10, 20, 50, 100],
      itemLabel: "transaksi",
      onChange: onPageChange,
      onPerPageChange,
      onJump: onPageChange,
      buttonIds: {
        previous: "slrtx_pagination_previous_button",
        next: "slrtx_pagination_next_button",
        jump: "slrtx_pagination_jump_button",
        page: (targetPage, isCurrent) => isCurrent
          ? `slrtx_pagination_page_current_${targetPage}`
          : `slrtx_pagination_page_button_${targetPage}`,
      },
      inputIds: {
        perPage: "slrtx_rows_per_page_input",
        jump: "slrtx_jump_page_input",
      },
    })
    : null;

  return DataTable({
    shellId: "slrtx_transactions_table",
    title: "Daftar transaksi",
    subtitle: `${totalItems} transaksi cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Transaksi", render: (transaction) => transactionBlock(transaction) },
      { label: "Mobil", render: (transaction) => carBlock(transaction) },
      { label: "Buyer", render: (transaction) => buyerBlock(transaction) },
      { label: "Nilai", render: (transaction) => valueBlock(transaction) },
      { label: "Pembayaran", render: (transaction) => paymentBlock(transaction) },
      { label: "Status", render: (transaction) => statusBlock(transaction) },
      { label: "Aksi", render: (transaction) => actionGroup({ transaction, selectedTransactionId, onOpen, idScope: "desktop" }) },
    ],
    rows: transactions,
    loading,
    emptyTitle: "Belum ada transaksi",
    emptyDescription: "Transaksi akan muncul setelah buyer melakukan pembelian atau pembayaran tercatat.",
    mobileMode: "stack",
    tableMinWidth: "min-w-[1120px]",
    getRowKey: (transaction) => transaction.id,
    rowClassName: (transaction) => Number(selectedTransactionId) === Number(transaction.id)
      ? "bg-[var(--pb-surface-muted)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]"
      : "bg-white/55",
    mobileCardId: (transaction) => `slrtx_mobile_row_${transaction.id}_section`,
    mobileCardTitle: (transaction) => transaction.transaction_code || `Transaksi #${transaction.id ?? "-"}`,
    mobileCardSubtitle: (transaction) => carLabel(transaction),
    mobileCardBadges: (transaction) => [
      SellerTransactionStatusBadge({ status: transaction.transaction_status }),
      ...extraStatusBadges(transaction),
    ],
    mobileCardFields: (transaction) => {
      const financials = sellerTransactionService.financials(transaction);
      return [
        { label: "Buyer", value: buyerLabel(transaction) },
        { label: "Total", value: formatCurrency(financials.total) },
        { label: financials.dueNowLabel, value: formatCurrency(financials.dueNow) },
        { label: "Dibuat", value: formatDate(transaction.created_at) },
      ];
    },
    mobileCardActions: (transaction) => actionGroup({ transaction, selectedTransactionId, onOpen, idScope: "mobile" }),
    pagination,
  });
}

function transactionBlock(transaction) {
  const wrap = document.createElement("section");
  wrap.className = "flex min-w-0 items-start gap-3";
  const avatar = document.createElement("span");
  avatar.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--pb-border)] bg-[var(--pb-surface-inset)] text-[var(--pb-brand-secondary)] leading-none";
  avatar.append(createIcon("transaction", { className: "block h-4 w-4 leading-none" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textNode("p", "break-words text-sm font-black text-gray-950", transaction.transaction_code || `Transaksi #${transaction.id ?? "-"}`),
    textNode("p", "break-words text-xs font-semibold text-gray-500", formatDate(transaction.created_at)),
  );
  wrap.append(avatar, copy);
  return wrap;
}

function carBlock(transaction) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "break-words text-sm font-black text-gray-950", carLabel(transaction)),
    textNode("p", "break-words text-xs font-semibold text-gray-500", transaction?.car?.year ? `Tahun ${transaction.car.year}` : `Mobil #${transaction?.car_id ?? "-"}`),
  );
  return wrap;
}

function buyerBlock(transaction) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "break-words text-sm font-black text-gray-950", transaction?.buyer?.name || "Buyer terdaftar"),
    textNode("p", "break-words text-xs font-semibold text-gray-500", transaction?.buyer?.email || transaction?.buyer?.phone_number || "-"),
  );
  return wrap;
}

function valueBlock(transaction) {
  const financials = sellerTransactionService.financials(transaction);
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "text-sm font-black text-gray-950", formatCurrency(financials.total)),
    textNode("p", "text-xs font-semibold text-gray-500", `Sisa ${formatCurrency(financials.remaining)}`),
  );
  return wrap;
}

function paymentBlock(transaction) {
  const financials = sellerTransactionService.financials(transaction);
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "text-sm font-black text-gray-950", sellerTransactionService.paymentTypeLabel(transaction.payment_type)),
    textNode("p", "break-words text-xs font-semibold text-gray-500", `${financials.dueNowLabel}: ${formatCurrency(financials.dueNow)}`),
  );
  return wrap;
}

function statusBlock(transaction) {
  const wrap = document.createElement("section");
  wrap.className = "flex flex-wrap gap-2";
  wrap.append(SellerTransactionStatusBadge({ status: transaction.transaction_status }), ...extraStatusBadges(transaction));
  return wrap;
}

function actionGroup({ transaction, selectedTransactionId, onOpen, idScope = "desktop" }) {
  const actions = document.createElement("section");
  actions.className = "flex flex-wrap gap-2";
  const selected = Number(selectedTransactionId) === Number(transaction.id);
  const status = String(transaction.transaction_status ?? "").toLowerCase();
  const isFulfillment = status === "paid";
  const detail = Button({
    label: selected ? "Detail aktif" : isFulfillment ? "Proses Transaksi" : "Detail",
    variant: selected || isFulfillment ? "primary" : "secondary",
    onClick: () => onOpen?.(transaction),
    designHook: selected || isFulfillment ? "shared.button.primary" : "shared.button.secondary",
  });
  detail.id = `slrtx_detail_button_${idScope}_${transaction.id}`;
  detail.prepend(createIcon("eye", { className: "block h-4 w-4 leading-none" }));
  actions.append(detail);

  return actions;
}

function extraStatusBadges(transaction) {
  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  if (status === "paid") {
    return [Badge({ label: "Perlu Diproses", variant: "warning" })];
  }
  if (status === "dp_paid") {
    return [Badge({ label: "Mobil Terkunci", variant: "info" })];
  }
  return [];
}

function carLabel(transaction) {
  return [transaction?.car?.brand_name, transaction?.car?.model_name].filter(Boolean).join(" ") || `Mobil #${transaction?.car_id ?? "-"}`;
}

function buyerLabel(transaction) {
  return transaction?.buyer?.name || transaction?.buyer?.email || "Buyer terdaftar";
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
