import { Card } from "../../../ui/composites/card.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminTransactionMonitoringService } from "../services/adminTransactionMonitoringService.js";
import { AdminTransactionStatusBadge } from "./adminTransactionStatusBadge.js";

export function AdminTransactionDetailPanel({ transaction = null, isHydrating = false } = {}) {
  const aside = document.createElement("section");
  aside.id = "adtr_detail_content_section";
  aside.className = "grid min-w-0 gap-4";

  if (isHydrating) {
    aside.append(Skeleton({ lines: 10 }));
    return aside;
  }

  if (!transaction) {
    aside.append(EmptyState({
      title: "Pilih transaksi",
      description: "Buka item dari daftar untuk melihat buyer, seller, nominal, dan status pembayaran secara lengkap.",
    }));
    return aside;
  }

  const financials = adminTransactionMonitoringService.financials(transaction);
  const statusMeta = adminTransactionMonitoringService.statusMeta(transaction.transaction_status);

  aside.append(
    statusCard(transaction, statusMeta),
    factsCard("Payment summary", [
      ["Total transaksi", formatCurrency(financials.total)],
      [financials.dueNowLabel, formatCurrency(financials.dueNow)],
      ["Sudah dibayar", formatCurrency(financials.paid)],
      ["Sisa", formatCurrency(financials.remaining)],
    ]),
    factsCard("Buyer", [
      ["Nama", transaction?.buyer?.name ?? "Buyer terdaftar"],
      ["Email", transaction?.buyer?.email ?? "-"],
    ]),
    factsCard("Seller", [
      ["Nama", transaction?.seller?.name ?? "Seller terdaftar"],
      ["Email", transaction?.seller?.email ?? "-"],
      ["Showroom", transaction?.showroom?.name ?? "-"],
    ]),
    factsCard("Mobil", [
      ["Unit", [transaction?.car?.brand_name, transaction?.car?.model_name].filter(Boolean).join(" ") || `Mobil #${transaction?.car_id ?? "-"}`],
      ["Listing", transaction?.car?.listing_status ?? "-"],
      ["Payment type", adminTransactionMonitoringService.paymentTypeLabel(transaction.payment_type)],
    ]),
    factsCard("Timeline", [
      ["Dibuat", formatDate(transaction.created_at)],
      ["Jatuh tempo", formatDate(transaction.expires_at)],
      ["Paid at", formatDate(transaction.paid_at)],
      ["Updated at", formatDate(transaction.updated_at)],
    ]),
    paymentLogsCard(transaction.payment_logs ?? []),
  );

  return aside;
}

function statusCard(transaction, statusMeta) {
  const card = detailSection("adtr_detail_status_section");

  const top = document.createElement("div");
  top.className = "flex flex-col gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c53030,#1e81b0)] text-white shadow-[0_14px_34px_rgba(185,28,28,0.20)]";
  icon.append(createIcon("transaction", { className: "h-4 w-4" }));
  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = transaction.transaction_code ?? `TRX #${transaction.id ?? "-"}`;
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = statusMeta.description;
  top.append(icon, title, body, AdminTransactionStatusBadge({ status: transaction.transaction_status }));

  card.append(top);
  return card;
}

function paymentLogsCard(logs = []) {
  if (!logs.length) {
    return factsCard("Riwayat pembayaran", [["Log pembayaran", "Belum ada log pembayaran"]]);
  }

  const wrap = document.createElement("section");
  wrap.id = "adtr_detail_payment_logs_section";
  wrap.className = "grid gap-3";

  const heading = document.createElement("h2");
  heading.className = "text-base font-bold tracking-normal text-gray-950";
  heading.textContent = "Riwayat pembayaran";
  wrap.append(heading);

  logs.forEach((log, index) => {
    wrap.append(factsCard(`Payment log ${index + 1}`, [
      ["Provider", log.provider_name ?? "-"],
      ["Method", log.payment_method ?? "-"],
      ["Provider status", log.transaction_status ?? "-"],
      ["Gross amount", formatCurrency(log.gross_amount ?? 0)],
      ["Waktu log", formatDate(log.logged_at)],
    ]));
  });

  return wrap;
}

function factsCard(title, rows = []) {
  const card = detailSection(`adtr_detail_${slugify(title || "payment_log")}_section`);

  if (title) {
    const heading = document.createElement("h2");
    heading.className = "text-base font-bold tracking-normal text-gray-950";
    heading.textContent = title;
    card.append(heading);
  }

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "flex flex-col gap-1 border-b border-[var(--pb-border)] pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3";

    const labelNode = document.createElement("span");
    labelNode.className = "break-words text-xs text-gray-500";
    labelNode.textContent = label;

    const valueNode = document.createElement("span");
    valueNode.className = "break-words text-left text-xs font-semibold text-gray-900 sm:max-w-[65%] sm:text-right";
    valueNode.textContent = value;

    row.append(labelNode, valueNode);
    card.append(row);
  });

  return card;
}

function detailSection(id) {
  const card = Card([], { variant: "raised" });
  card.id = id;
  card.classList.add("grid", "gap-3", "border-white/80", "bg-white/86", "shadow-[0_18px_50px_rgba(15,23,42,0.08)]");
  return card;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "panel";
}
