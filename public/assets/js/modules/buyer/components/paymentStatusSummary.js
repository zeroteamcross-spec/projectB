import { Badge } from "../../../ui/primitives/badge.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { getTransactionStatusMeta } from "../../../utils/transactionStatus.js";

export function PaymentStatusSummary({ transaction } = {}) {
  const section = document.createElement("section");
  section.id = "buyer_payment_detail_summary";
  section.className = `grid gap-5 rounded-3xl border bg-white/95 p-5 shadow-card backdrop-blur ${statusBorder(transaction?.transaction_status)}`;
  applyDesignHook(section, "buyer.payment.summary");

  const header = document.createElement("div");
  header.className = "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start";

  const copy = document.createElement("div");
  copy.className = "grid gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = `text-[11px] font-semibold uppercase tracking-[0.16em] ${statusText(transaction?.transaction_status)}`;
  eyebrow.textContent = nextStepTitle(transaction?.transaction_status);
  const title = document.createElement("h1");
  title.className = "break-words text-2xl font-bold tracking-normal text-gray-950 sm:text-3xl";
  title.textContent = transaction?.transaction_code ?? `Transaksi #${transaction?.id ?? "-"}`;
  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = statusCopy(transaction?.transaction_status);
  copy.append(eyebrow, title, body);

  const statusMeta = getTransactionStatusMeta(transaction?.transaction_status);
  const badge = Badge({ label: statusMeta.label, variant: statusMeta.variant });
  badge.classList.add("justify-self-start", "px-3", "py-2", "text-sm", "sm:justify-self-end");
  header.append(copy, badge);

  const grid = document.createElement("div");
  grid.className = `grid gap-2 ${tw.surface.insetGrid} sm:grid-cols-2`;
  grid.append(
    row("Tipe pembayaran", transaction?.payment_type === "dp" ? "DP" : "Full"),
    row("Harga mobil", formatCurrency(transaction?.car_price)),
    row("Nominal utama", formatCurrency(primaryAmount(transaction))),
    row("DP", transaction?.dp_amount ? formatCurrency(transaction.dp_amount) : "-"),
    row("Sisa pembayaran", transaction?.remaining_amount ? formatCurrency(transaction.remaining_amount) : "-"),
    row("Kadaluarsa", transaction?.expires_at ?? "-")
  );

  section.append(header, grid);
  return section;
}

function row(label, value) {
  const node = document.createElement("div");
  node.className = "flex flex-col gap-1 rounded-2xl bg-white/90 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3";
  const caption = document.createElement("span");
  caption.className = "break-words text-gray-500";
  caption.textContent = label;
  const content = document.createElement("span");
  content.className = "break-words text-left font-semibold text-gray-900 sm:text-right";
  content.textContent = value;
  node.append(caption, content);
  return node;
}

function primaryAmount(transaction) {
  if (!transaction) {
    return 0;
  }
  return transaction.payment_type === "dp" ? transaction.dp_amount ?? 0 : transaction.car_price ?? 0;
}

function statusCopy(status) {
  return {
    pending_payment: "Pembayaran belum selesai. Buka link pembayaran atau ikuti instruksi VA, lalu refresh status setelah membayar.",
    dp_paid: "Booking Fee sudah diterima. Mobil ini sudah menjadi milik Anda; sisa harga diselesaikan langsung dengan showroom di luar aplikasi.",
    paid: "Pembayaran Anda sudah diterima 100%. Transaksi sedang diproses oleh showroom/seller.",
    expired: "Sesi pembayaran sudah kedaluwarsa. Buat transaksi baru atau hubungi operasional.",
    cancelled: "Transaksi dibatalkan. Tidak ada pembayaran yang perlu dilanjutkan.",
  }[status] ?? "Status transaksi sedang diproses.";
}

function nextStepTitle(status) {
  return {
    pending_payment: "Menunggu pembayaran",
    dp_paid: "Booking Fee Lunas",
    paid: "Pembayaran berhasil",
    expired: "Sesi kedaluwarsa",
    cancelled: "Transaksi batal",
  }[status] ?? "Status pembayaran";
}

function statusBorder(status) {
  return {
    pending_payment: "border-[color-mix(in_srgb,var(--pb-warning)_26%,white)] bg-gradient-to-br from-white to-[color-mix(in_srgb,var(--pb-warning)_8%,white)]",
    dp_paid: "border-[color-mix(in_srgb,var(--pb-brand-primary)_26%,white)] bg-gradient-to-br from-white to-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)]",
    paid: "border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-gradient-to-br from-white to-[color-mix(in_srgb,var(--pb-success)_8%,white)]",
    expired: "border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-gradient-to-br from-white to-[color-mix(in_srgb,var(--pb-danger)_8%,white)]",
    cancelled: "border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-gradient-to-br from-white to-[color-mix(in_srgb,var(--pb-danger)_8%,white)]",
  }[status] ?? "border-gray-200";
}

function statusText(status) {
  return {
    pending_payment: "text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]",
    dp_paid: "text-[color-mix(in_srgb,var(--pb-brand-primary)_84%,black)]",
    paid: "text-[color-mix(in_srgb,var(--pb-success)_84%,black)]",
    expired: "text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]",
    cancelled: "text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]",
  }[status] ?? tw.brand.mark;
}
