import { Badge } from "../../../ui/primitives/badge.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable } from "../../../ui/composites/dataTable.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { adminDashboardService } from "../services/adminDashboardService.js";

export function AdminDashboardTransactionsPanel({ transactions = [], onOpenTransactions = null } = {}) {
  const section = document.createElement("section");
  section.id = "adm_dashboard_transactions_section";
  section.className = "grid gap-1";

  const header = document.createElement("div");
  header.className = "bg-white flex flex-col gap-4 rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur md:flex-row md:items-center md:justify-between";
  const titleWrap = document.createElement("div");
  titleWrap.className = "flex min-w-0 items-center gap-3";
  const iconWrap = document.createElement("div");
  iconWrap.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--pb-danger)_14%,white)] text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  iconWrap.append(createIcon("transaction", { className: "h-5 w-5" }));
  titleWrap.append(iconWrap, textBlock(tw.text.sectionTitle, "Transaksi terbaru"));
  const focusButton = Button({
    label: "Fokus transaksi",
    variant: "secondary",
    onClick: onOpenTransactions,
  });
  focusButton.id = "adm_dashboard_transactions_focus_button";
  header.append(
    titleWrap,
    focusButton,
  );
  section.append(header);

  if (!transactions.length) {
    section.append(EmptyState({
      title: "Belum ada transaksi terbaru",
      description: "Dashboard admin akan menampilkan transaksi yang paling baru dan status yang perlu perhatian.",
    }));
    return section;
  }

  section.append(transactionsTable(transactions.slice(0, 8)));
  return section;
}

function transactionsTable(transactions) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c53030,#1e81b0)] text-white shadow-[0_14px_34px_rgba(185,28,28,0.22)]";
  icon.append(createIcon("transaction", { className: "h-4 w-4" }));

  return DataTable({
    shellId: "adm_dashboard_transactions_table_card",
    title: "Ringkasan transaksi",
    subtitle: `${transactions.length} transaksi terbaru untuk screening cepat`,
    icon,
    columns: [
      { label: "Kode", render: (transaction) => textBlock("font-bold text-gray-950", transaction.transaction_code || `TRX #${transaction.id}`) },
      { label: "Buyer / Showroom", render: (transaction) => textBlock("text-gray-600", `${transaction.buyer?.name || "-"} -> ${transaction.seller?.name || "-"}`) },
      { label: "Mobil", render: (transaction) => textBlock("text-gray-600", `${transaction.car?.brand_name || "-"} ${transaction.car?.model_name || ""}`.trim() || "-") },
      { label: "Nilai", render: (transaction) => textBlock("font-semibold text-gray-950", paymentLabel(transaction)) },
      { label: "Status", render: (transaction) => badgeNode(transaction) },
      { label: "Tanggal", render: (transaction) => textBlock("text-gray-500 whitespace-nowrap", formatDate(transaction.created_at)) },
    ],
    rows: transactions,
    mobileMode: "disclosure",
    emptyTitle: "Belum ada transaksi terbaru",
    emptyDescription: "Dashboard admin akan menampilkan transaksi yang paling baru dan status yang perlu perhatian.",
    mobileCardTitle: (transaction) => transaction.transaction_code || `TRX #${transaction.id}`,
    mobileCardSubtitle: (transaction) => `${transaction.buyer?.name || "-"} -> ${transaction.seller?.name || "-"}`,
    mobileCardBadges: (transaction) => [badgeNode(transaction)],
    mobilePrimaryFields: (transaction) => [
      { label: "Mobil", value: `${transaction.car?.brand_name || "-"} ${transaction.car?.model_name || ""}`.trim() || "-" },
      { label: "Nilai", value: paymentLabel(transaction) },
      { label: "Tanggal", value: formatDate(transaction.created_at) },
    ],
    mobileDisclosureFields: (transaction) => [
      { label: "Status", value: adminDashboardService.transactionStatusMeta(transaction.transaction_status).label },
      { label: "Buyer", value: transaction.buyer?.name || "-" },
      { label: "Showroom", value: transaction.seller?.name || "-" },
    ],
    mobileCardId: (transaction, index) => `adm_dashboard_transaction_${transaction.id ?? index + 1}_row`,
    tableMinWidth: "min-w-[760px]",
    rowClassName: () => "bg-white/55",
    getRowKey: (transaction) => transaction.id,
  });
}

function badgeNode(transaction) {
  const meta = adminDashboardService.transactionStatusMeta(transaction.transaction_status);
  return Badge({ label: meta.label, variant: meta.variant });
}

function paymentLabel(transaction) {
  return transaction.payment_type === "dp"
    ? `DP ${formatCurrency(transaction.dp_amount)} / ${formatCurrency(transaction.remaining_amount)}`
    : formatCurrency(transaction.car_price);
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}
