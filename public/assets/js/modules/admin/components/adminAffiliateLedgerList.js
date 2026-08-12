import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function AdminAffiliateLedgerList({
  loading = false,
  ledgers = [],
  selectedIds = new Set(),
  page = 1,
  perPage = 10,
  totalItems = 0,
  onToggle = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#17698f,#1e81b0)] text-white";
  icon.append(createIcon("commission", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "ledger",
    onChange: onPageChange,
    onPerPageChange,
    onJump: onPageChange,
  });

  return DataTable({
    shellId: "adfc_ledgers_table_section",
    title: "Marketing commission ledgers",
    subtitle: `${totalItems} ledger cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Pilih", render: (ledger) => selectionCell(ledger, selectedIds, onToggle) },
      { label: "Transaksi", render: identityCell },
      { label: "Marketing", render: affiliateCell },
      { label: "Komisi", render: amountCell },
      { label: "Status", render: statusCell },
      { label: "Tanggal", render: (ledger) => textBlock("text-xs font-semibold text-gray-800", formatDate(ledger.created_at)) },
    ],
    loading,
    rows: ledgers,
    mobileMode: "disclosure",
    emptyTitle: "Ledger marketing belum tersedia",
    emptyDescription: "Komisi marketing akan muncul saat transaksi mencapai status pembayaran final dan eligible.",
    mobileCardTitle: (ledger) => ledger.transactionCodeLabel,
    mobileCardSubtitle: (ledger) => `${ledger.affiliateLabel} | ${ledger.amountLabel}`,
    mobileCardBadges: (ledger) => [Badge({ label: ledger.statusMeta?.label || ledger.ledger_status || "-", variant: ledger.statusMeta?.variant || "default" })],
    mobilePrimaryFields: (ledger) => [
      { label: "Mobil", value: ledger.carLabel },
      { label: "Komisi", value: ledger.amountLabel },
      { label: "Status", value: ledger.statusMeta?.label || ledger.ledger_status || "-" },
    ],
    mobileDisclosureFields: (ledger) => [
      { label: "Base", value: ledger.baseAmountLabel },
      { label: "Rule", value: ledger.rule_source || "-" },
      { label: "Finality", value: ledger.finality_event || "-" },
    ],
    mobileCardActions: (ledger) => selectionCell(ledger, selectedIds, onToggle),
    getRowKey: (ledger) => ledger.id,
    tableMinWidth: "min-w-[1120px]",
    pagination,
  });
}

function selectionCell(ledger, selectedIds, onToggle) {
  if (ledger.ledger_status !== "accrued") {
    return textBlock("text-xs font-semibold text-[var(--pb-text-muted)]", "-");
  }

  const button = Button({
    label: selectedIds.has(Number(ledger.id)) ? "Dipilih" : "Pilih",
    variant: selectedIds.has(Number(ledger.id)) ? "primary" : "secondary",
    onClick: () => onToggle?.(ledger),
  });
  button.id = `adfc_select_ledger_button_${ledger.id}`;
  button.dataset.transactionId = String(ledger.transaction_id ?? "");
  button.prepend(createIcon("check", { className: "h-4 w-4" }));
  return button;
}

function identityCell(ledger) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textBlock("font-black text-gray-950", ledger.transactionCodeLabel),
    textBlock("text-xs text-gray-500", ledger.carLabel),
  );
  return wrap;
}

function affiliateCell(ledger) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textBlock("font-semibold text-gray-900", ledger.affiliateLabel),
    textBlock("text-xs text-gray-500", `Marketing #${ledger.affiliate_id ?? "-"}`),
  );
  return wrap;
}

function amountCell(ledger) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textBlock("font-black text-gray-950", ledger.amountLabel),
    textBlock("text-xs text-gray-500", `Base ${ledger.baseAmountLabel}`),
  );
  return wrap;
}

function statusCell(ledger) {
  return Badge({
    label: ledger.statusMeta?.label || ledger.ledger_status || "-",
    variant: ledger.statusMeta?.variant || "default",
  });
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
