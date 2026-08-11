import { Button } from "../../../ui/primitives/button.js";
import { PAYMENT_METHOD_OPTIONS, paymentMethodLabel, resolvePaymentArtifacts } from "../../transactions/paymentMethodSupport.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

export function CompletionPaymentPanel({
  transaction,
  form = {},
  result = null,
  isSubmitting = false,
  error = "",
  onChange = null,
  onSubmit = null,
  onCancel = null,
} = {}) {
  const section = document.createElement("section");
  section.className = `grid gap-5 ${tw.surface.accentPanel} p-5 sm:p-6`;

  const header = document.createElement("div");
  header.className = "grid gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Pelunasan";
  const title = document.createElement("h2");
  title.className = "text-lg font-bold tracking-normal text-gray-950";
  title.textContent = "Bayar sisa transaksi";
  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = "Pilih metode pembayaran untuk membuat sesi pelunasan.";
  header.append(eyebrow, title, body);

  section.append(header, amountBox(transaction));

  if (result) {
    section.append(resultBox(result));
    return section;
  }

  const formNode = document.createElement("form");
  formNode.className = "grid gap-3";
  formNode.append(paymentMethodField(form.payment_method ?? "bca_va", onChange));

  if (error) {
    const message = document.createElement("p");
    message.className = tw.alert.error;
    message.textContent = error;
    formNode.append(message);
  }

  const actions = document.createElement("div");
  actions.className = "grid grid-cols-1 gap-2 sm:grid-cols-2";

  const submit = Button({
    label: isSubmitting ? "Membuat sesi..." : "Buat sesi pelunasan",
    variant: "primary",
    disabled: isSubmitting,
  });
  submit.type = "submit";
  submit.classList.add("w-full");

  const cancel = Button({
    label: "Batal",
    variant: "secondary",
    disabled: isSubmitting,
    onClick: onCancel,
  });
  cancel.classList.add("w-full");

  actions.append(submit, cancel);
  formNode.append(actions);
  formNode.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(formNode));
    onSubmit?.({ payment_method: data.payment_method || "bca_va" });
  });

  section.append(formNode);
  return section;
}

function amountBox(transaction) {
  const box = document.createElement("div");
  box.className = `grid gap-2 ${tw.surface.insetGrid}`;
  box.append(
    row("Kode transaksi", transaction?.transaction_code ?? "-"),
    row("Sisa pelunasan", formatCurrency(transaction?.remaining_amount ?? 0)),
    row("Status saat ini", normalize(transaction?.transaction_status))
  );
  return box;
}

function paymentMethodField(value, onChange) {
  const wrap = document.createElement("fieldset");
  wrap.className = "grid gap-2";

  const label = document.createElement("legend");
  label.className = "text-sm font-bold text-gray-800";
  label.textContent = "Metode pembayaran";

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-1 gap-2";

  PAYMENT_METHOD_OPTIONS.forEach((option) => {
    const card = document.createElement("label");
    card.className = option.value === value
      ? `grid cursor-pointer gap-1 ${tw.form.choiceActive}`
      : `grid cursor-pointer gap-1 ${tw.form.choiceIdle}`;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "payment_method";
    input.value = option.value;
    input.checked = option.value === value;
    input.className = "sr-only";
    input.addEventListener("change", () => onChange?.({ payment_method: option.value }));

    const title = document.createElement("strong");
    title.className = "text-base text-gray-950";
    title.textContent = option.label;

    const body = document.createElement("span");
    body.className = "text-xs text-gray-500";
    body.textContent = option.description;

    card.append(input, title, body);
    grid.append(card);
  });
  wrap.append(label, grid);
  return wrap;
}

function resultBox(transaction) {
  const box = document.createElement("div");
  box.className = `grid gap-4 ${tw.surface.successInset} shadow-sm`;

  const title = document.createElement("strong");
  title.className = "text-base text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  title.textContent = "Sesi pelunasan dibuat";

  const detailsState = resolvePaymentArtifacts(transaction);
  const paymentSession = transaction?.payment_session ?? {};
  const paymentData = detailsState.paymentData ?? {};
  const virtualAccount = virtualAccountInfo(paymentSession, paymentData);
  const details = document.createElement("div");
  details.className = "grid gap-2";
  details.append(
    row("Kode transaksi", transaction?.transaction_code ?? "-"),
    row("Status terbaru", normalize(transaction?.transaction_status)),
    row("Nominal pelunasan", formatCurrency(paymentSession.gross_amount ?? transaction?.remaining_amount ?? 0)),
    row("Provider order", paymentSession.provider_order_id ?? transaction?.midtrans_order_id ?? "-"),
    row("Metode", paymentMethodLabel(detailsState.method))
  );

  box.append(title, details);

  if (detailsState.method === "bca_va") {
    box.append(virtualAccountBox(virtualAccount));
  } else {
    const note = document.createElement("p");
    note.className = "rounded-2xl border border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-white px-4 py-3 text-sm leading-6 text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
    note.textContent = detailsState.method === "gopay"
      ? "Gunakan halaman status pembayaran buyer untuk membuka aplikasi GoPay, melihat QR, dan cek status."
      : "Gunakan halaman status pembayaran buyer untuk melihat QRIS, mengunduh QR, dan cek status.";
    box.append(note);
  }

  const redirectUrl = paymentSession.redirect_url ?? transaction?.midtrans_redirect_url ?? "";
  if (redirectUrl) {
    const link = document.createElement("a");
    link.href = redirectUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = `${tw.interactive.primaryLink} w-full break-words text-center`;
    link.textContent = "Buka pembayaran pelunasan";
    box.append(link);
  }

  const note = document.createElement("p");
  note.className = "text-sm leading-6 text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  note.textContent = "Setelah membayar, kembali ke halaman ini. Status akan dicek otomatis; Refresh status tetap tersedia sebagai fallback.";
  box.append(note);

  return box;
}

function virtualAccountBox(info) {
  const box = document.createElement("div");
  box.className = "grid gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-white px-4 py-4 shadow-sm";

  const label = document.createElement("span");
  label.className = "text-xs font-semibold uppercase tracking-normal text-gray-500";
  label.textContent = info.type === "mandiri_bill"
    ? "Kode bayar Mandiri"
    : "Nomor virtual account";

  const value = document.createElement("strong");
  value.className = "break-all text-2xl font-black tracking-normal text-[var(--pb-brand-secondary)]";
  value.textContent = info.value || "Belum tersedia";

  const bank = document.createElement("span");
  bank.className = "text-sm font-semibold text-gray-700";
  bank.textContent = info.bank ? `Bank ${String(info.bank).toUpperCase()}` : "Provider Midtrans";

  if (info.type === "mandiri_bill" && info.billerCode) {
    const biller = document.createElement("span");
    biller.className = "text-xs font-medium text-gray-500";
    biller.textContent = `Biller code: ${info.billerCode}`;
    box.append(label, value, bank, biller);
    return box;
  }

  box.append(label, value, bank);
  return box;
}

function virtualAccountInfo(paymentSession, paymentData) {
  const response = normalizePaymentData(paymentSession?.payload_response ?? {});
  const firstVa = Array.isArray(response.va_numbers) ? response.va_numbers[0] : null;

  if (paymentData.va_number) {
    return {
      value: String(paymentData.va_number),
      bank: paymentData.bank ?? paymentSession.payment_method,
      type: "va",
    };
  }

  if (firstVa?.va_number) {
    return {
      value: String(firstVa.va_number),
      bank: firstVa.bank ?? paymentSession.payment_method,
      type: "va",
    };
  }

  if (response.permata_va_number) {
    return {
      value: String(response.permata_va_number),
      bank: "permata",
      type: "va",
    };
  }

  if (paymentData.bill_key || response.bill_key) {
    return {
      value: String(paymentData.bill_key ?? response.bill_key),
      bank: "mandiri",
      billerCode: paymentData.biller_code ?? response.biller_code ?? "",
      type: "mandiri_bill",
    };
  }

  return {
    value: "",
    bank: paymentSession.payment_method ?? "",
    type: "va",
  };
}

function row(label, value) {
  const item = document.createElement("div");
  item.className = "flex flex-col gap-1 rounded-2xl bg-white/90 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3";
  const caption = document.createElement("span");
  caption.className = "break-words text-gray-600";
  caption.textContent = label;
  const content = document.createElement("span");
  content.className = "break-words text-left font-semibold text-gray-950 sm:text-right";
  content.textContent = value;
  item.append(caption, content);
  return item;
}

function normalize(value) {
  if (!value) {
    return "-";
  }

  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
