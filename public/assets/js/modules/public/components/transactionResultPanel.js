import { Button } from "../../../ui/primitives/button.js";
import { instructionSteps, paymentMethodLabel, resolvePaymentArtifacts } from "../../transactions/paymentMethodSupport.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

export function TransactionResultPanel({ transaction, onOpenDashboard = null, onOpenStatus = null } = {}) {
  const section = document.createElement("section");
  section.id = "pubtrx_result_panel";
  if (transaction?.id) {
    section.dataset.transactionId = String(transaction.id);
  }
  section.className = `grid gap-5 ${tw.surface.successPanel} p-5 sm:p-6`;

  const header = document.createElement("div");
  header.className = "grid gap-1";
  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  eyebrow.textContent = "Transaksi dibuat";
  const title = document.createElement("h2");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = transaction?.transaction_code ?? `Transaksi #${transaction?.id ?? "-"}`;
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = "Sesi pembayaran awal sudah dibuat. Simpan informasi ini untuk pengecekan status pembayaran berikutnya.";
  header.append(eyebrow, title, body);

  const details = document.createElement("div");
  details.className = `grid gap-2 ${tw.surface.insetGrid}`;
  const paymentDetails = resolvePaymentArtifacts(transaction);
  details.append(
    row("ID transaksi", transaction?.id ? `#${transaction.id}` : "-", "pubtrx_result_transaction_id_value"),
    row("Kode transaksi", transaction?.transaction_code ?? "-"),
    row("Tipe pembayaran", transaction?.payment_type === "dp" ? "DP" : "Full"),
    row("Nominal utama", formatCurrency(primaryAmount(transaction))),
    row("Status awal", normalize(transaction?.transaction_status)),
    row("Order provider", paymentDetails.providerOrderId),
    row("Metode", paymentMethodLabel(paymentDetails.method))
  );

  const paymentData = paymentDetails.paymentData ?? {};
  if (paymentData.va_number) {
    details.append(row("VA", `${String(paymentData.bank ?? "").toUpperCase()} ${paymentData.va_number}`));
  }

  const instructions = paymentInstructionSummary(paymentDetails);

  const actions = document.createElement("div");
  actions.className = "grid gap-2 border-t border-[color-mix(in_srgb,var(--pb-success)_26%,white)] pt-4";

  if (transaction?.payment_session?.redirect_url) {
    const link = document.createElement("a");
    link.href = transaction.payment_session.redirect_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = `${tw.interactive.primaryLink} w-full`;
    link.textContent = "Buka pembayaran";
    actions.append(link);
  }

  const button = Button({
    label: onOpenStatus ? "Lihat status pembayaran" : "Lihat dashboard buyer",
    variant: "secondary",
    onClick: onOpenStatus ?? onOpenDashboard,
  });
  button.id = "pubtrx_result_open_status_button";
  button.classList.add("w-full");
  actions.append(button);
  section.append(header, details, instructions, actions);
  return section;
}

function row(label, value, valueId) {
  const item = document.createElement("div");
  item.className = "flex items-center justify-between gap-3 rounded-2xl bg-white/90 px-3 py-3 shadow-sm";
  const caption = document.createElement("span");
  caption.className = "text-gray-500";
  caption.textContent = label;
  const content = document.createElement("span");
  if (valueId) {
    content.id = valueId;
  }
  content.className = "text-right font-semibold text-gray-900";
  content.textContent = value;
  item.append(caption, content);
  return item;
}

function primaryAmount(transaction) {
  if (!transaction) {
    return 0;
  }

  if (transaction.payment_type === "dp") {
    return transaction.dp_amount ?? transaction.payment_session?.gross_amount ?? 0;
  }

  return transaction.car_price ?? transaction.payment_session?.gross_amount ?? 0;
}

function normalize(value) {
  if (!value) {
    return "-";
  }

  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function paymentInstructionSummary(details) {
  const box = document.createElement("section");
  box.className = "grid gap-3 rounded-[1.5rem] border border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-white/80 px-4 py-4";

  const title = document.createElement("h3");
  title.className = "text-xs font-bold text-gray-950";
  title.textContent = details.method === "gopay"
    ? "Instruksi GoPay"
    : details.method === "qris"
      ? "Instruksi QRIS"
      : "Langkah pembayaran";
  box.append(title);

  if (details.qrCodeUrl && (details.method === "gopay" || details.method === "qris")) {
    const image = document.createElement("img");
    image.src = details.qrCodeUrl;
    image.alt = details.method === "gopay" ? "QR pembayaran GoPay" : "QR pembayaran QRIS";
    image.className = "mx-auto h-auto w-full max-w-[220px] rounded-2xl border border-[var(--pb-card-border)] bg-white object-contain";
    box.append(image);
  }

  if (details.method === "gopay" && details.deeplinkUrl) {
    const link = document.createElement("a");
    link.href = details.deeplinkUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = `${tw.interactive.primaryLink} w-full text-center`;
    link.textContent = "Buka Aplikasi GoPay";
    box.append(link);
  }

  const list = document.createElement("ol");
  list.className = "grid list-decimal gap-2 pl-5 text-xs leading-6 text-gray-700";
  instructionSteps(details.method, {
    hasQr: Boolean(details.qrCodeUrl),
    hasDeeplink: Boolean(details.deeplinkUrl),
  }).slice(0, 4).forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    list.append(item);
  });
  box.append(list);

  return box;
}
