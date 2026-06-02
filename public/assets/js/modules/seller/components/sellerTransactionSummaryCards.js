import { formatCurrency } from "../../../utils/formatCurrency.js";
import { sellerTransactionService } from "../services/sellerTransactionService.js";

const ITEMS = [
  { key: "total", label: "Total transaksi", id: "slrtx_summary_total" },
  { key: "pending", label: "Transaksi pending", id: "slrtx_summary_pending" },
  { key: "paid", label: "Pembayaran lunas", id: "slrtx_summary_paid" },
  { key: "totalValue", label: "Total nilai transaksi", id: "slrtx_summary_value" },
];

export function SellerTransactionSummaryCards({ transactions = [] } = {}) {
  const summary = {
    ...sellerTransactionService.summarize(transactions),
    totalValue: transactions.reduce((total, transaction) => total + sellerTransactionService.financials(transaction).total, 0),
  };
  const section = document.createElement("section");
  section.id = "slrtx_summary_section";
  section.className = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

  ITEMS.forEach((item, index) => {
    const eyebrow = document.createElement("p");
    eyebrow.className = "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500";
    eyebrow.textContent = item.label;

    const value = document.createElement("strong");
    value.className = "text-2xl font-black tracking-normal text-gray-950";
    value.textContent = item.key === "totalValue"
      ? formatCurrency(summary[item.key] ?? 0)
      : String(summary[item.key] ?? 0);

    const helper = document.createElement("p");
    helper.className = "text-sm font-semibold text-gray-500";
    helper.textContent = summaryHelper(item.key, summary);

    const card = document.createElement("section");
    card.id = item.id;
    card.className = [
      "grid gap-2 rounded-[1.5rem] border p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl transition duration-150 hover:-translate-y-0.5 hover:shadow-md",
      summaryCardClass(index),
    ].join(" ");
    card.append(eyebrow, value, helper);
    section.append(card);
  });

  return section;
}

function summaryHelper(key, summary) {
  if (key === "paid") {
    return `${summary.dpPaid ?? 0} transaksi DP sudah mengunci mobil`;
  }
  if (key === "pending") {
    return `${summary.attention ?? 0} transaksi perlu perhatian`;
  }
  if (key === "totalValue") {
    return "Dihitung dari data lokal";
  }
  return "Monitoring transaksi seller";
}

function summaryCardClass(index) {
  return [
    "border-orange-100/90 bg-[linear-gradient(135deg,rgba(255,237,213,0.98),rgba(255,247,237,0.92),rgba(255,255,255,0.84))]",
    "border-amber-100/90 bg-[linear-gradient(135deg,rgba(254,243,199,0.98),rgba(255,251,235,0.92),rgba(255,255,255,0.84))]",
    "border-emerald-100/90 bg-[linear-gradient(135deg,rgba(209,250,229,0.98),rgba(236,253,245,0.92),rgba(255,255,255,0.84))]",
    "border-sky-100/90 bg-[linear-gradient(135deg,rgba(186,230,253,0.90),rgba(240,249,255,0.94),rgba(255,255,255,0.84))]",
  ][index % 4];
}
