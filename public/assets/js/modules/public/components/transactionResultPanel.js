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
  const isPaid = ["paid", "dp_paid", "completed"].includes(String(transaction?.transaction_status ?? "").toLowerCase());
  details.append(
    row("ID transaksi", transaction?.id ? `#${transaction.id}` : "-", "pubtrx_result_transaction_id_value"),
    row("Kode transaksi", transaction?.transaction_code ?? "-"),
    row("Booking Fee", formatCurrency(primaryAmount(transaction))),
    row("Status awal", normalize(transaction?.transaction_status)),
    row("Order provider", paymentDetails.providerOrderId),
    row("Metode", paymentMethodLabel(paymentDetails.method))
  );

  if (!isPaid && paymentDetails.expiresAt) {
    details.append(row("Kadaluarsa", formatExpiry(paymentDetails.expiresAt), null, "pubtrx_result_expires_at_row"));
  }

  const paymentData = paymentDetails.paymentData ?? {};
  if (paymentData.va_number) {
    details.append(copyableRow("VA", `${String(paymentData.bank ?? "").toUpperCase()} ${paymentData.va_number}`, paymentData.va_number));
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

function row(label, value, valueId, rowId) {
  const item = document.createElement("div");
  if (rowId) {
    item.id = rowId;
  }
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

function copyableRow(label, displayValue, copyValue) {
  const item = document.createElement("div");
  item.id = "pubtrx_result_va_row";
  item.className = "flex items-center justify-between gap-3 rounded-2xl bg-white/90 px-3 py-3 shadow-sm";
  const caption = document.createElement("span");
  caption.className = "text-gray-500";
  caption.textContent = label;
  const valueGroup = document.createElement("span");
  valueGroup.className = "flex items-center gap-2";
  const content = document.createElement("span");
  content.className = "text-right font-semibold text-gray-900";
  content.textContent = displayValue;
  const copyButton = document.createElement("button");
  copyButton.id = "pubtrx_result_va_copy_button";
  copyButton.type = "button";
  copyButton.className = "rounded-lg border border-[var(--pb-card-border)] bg-white px-2 py-1 text-[10px] font-bold text-[var(--pb-brand-secondary)] transition hover:brightness-95";
  copyButton.textContent = "Copy";
  copyButton.addEventListener("click", () => copyToClipboard(copyValue, copyButton));
  valueGroup.append(content, copyButton);
  item.append(caption, valueGroup);
  return item;
}

function copyToClipboard(value, button) {
  const restoreLabel = button.textContent;
  const onDone = (ok) => {
    button.textContent = ok ? "Tersalin" : "Gagal";
    window.setTimeout(() => {
      button.textContent = restoreLabel;
    }, 1500);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(String(value ?? "")).then(() => onDone(true)).catch(() => onDone(false));
    return;
  }

  try {
    const helper = document.createElement("textarea");
    helper.value = String(value ?? "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    onDone(true);
  } catch {
    onDone(false);
  }
}

function formatExpiry(value) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return "-";
  }

  return new Date(time).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
