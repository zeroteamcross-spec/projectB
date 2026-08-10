import { Button } from "../../../ui/primitives/button.js";
import { PAYMENT_METHOD_OPTIONS } from "../../transactions/paymentMethodSupport.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

export function TransactionEntryForm({
  car,
  form = {},
  isSubmitting = false,
  error = "",
  onChange = null,
  onSubmit = null,
} = {}) {
  const section = document.createElement("section");
  section.className = `grid gap-5 ${tw.surface.raisedCard} p-5 sm:p-6`;

  const header = document.createElement("div");
  header.className = "grid gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Payment setup";
  const title = document.createElement("h2");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = "Booking Sekarang";
  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = "Bayar Booking Fee untuk mengunci unit ini. Sesi pembayaran dibuat setelah form dikirim.";
  header.append(eyebrow, title, body);

  const node = document.createElement("form");
  node.className = "grid gap-4";

  // Nominalnya ditentukan showroom dan tidak bisa ditawar buyer, jadi tidak
  // ada lagi pilihan tipe pembayaran maupun input nominal.
  node.append(
    bookingFeeBlock(car),
    paymentMethodBlock(form.payment_method ?? "bca_va", onChange)
  );

  if (error) {
    const message = document.createElement("p");
    message.className = tw.alert.error;
    message.textContent = error;
    node.append(message);
  }

  const submit = Button({
    label: isSubmitting ? "Membuat transaksi..." : "Buat transaksi",
    variant: "primary",
    disabled: isSubmitting,
  });
  submit.type = "submit";
  submit.classList.add("w-full");
  node.append(submit);

  node.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(node));
    // Server mengambil nominalnya dari cars.dp_amount; nilai apa pun dari sini
    // diabaikan. Dikirim hanya agar kontrak request lama tetap terpenuhi.
    onSubmit?.({
      payment_type: "dp",
      dp_amount: String(bookingFee(car) || 0),
      payment_method: data.payment_method,
    });
  });

  section.append(header, carPriceHint(car), instructionStrip(), node);
  return section;
}

/**
 * Booking Fee tampil sebagai angka mati. Showroom yang menentukan, buyer
 * hanya melihat.
 */
function bookingFeeBlock(car) {
  const nominal = bookingFee(car);

  const wrap = document.createElement("section");
  wrap.id = "pubtrx_booking_fee_block";
  wrap.className = "grid gap-1 rounded-2xl border border-[color-mix(in_srgb,var(--pb-brand-primary)_24%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] px-4 py-3";

  const label = document.createElement("span");
  label.className = "text-xs font-bold uppercase tracking-wide text-[var(--pb-brand-secondary)]";
  label.textContent = "Booking Fee";

  const value = document.createElement("strong");
  value.id = "pubtrx_booking_fee_value";
  value.className = "text-2xl font-black leading-tight text-[var(--pb-text)]";
  value.textContent = nominal > 0 ? formatCurrency(nominal) : "Belum ditentukan showroom";

  const hint = document.createElement("span");
  hint.className = "text-xs font-medium text-gray-600";
  hint.textContent = nominal > 0
    ? "Nominal ditentukan showroom dan tidak dapat diubah. Sisa pembayaran diselesaikan langsung dengan showroom."
    : "Showroom belum menetapkan Booking Fee untuk unit ini, sehingga transaksi belum bisa dibuat.";

  wrap.append(label, value, hint);
  return wrap;
}

function paymentMethodBlock(value, onChange) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-3";

  const label = document.createElement("span");
  label.className = "text-sm font-bold text-gray-800";
  label.textContent = "Metode pembayaran";

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-1 gap-2";
  PAYMENT_METHOD_OPTIONS.forEach((option) => {
    const card = radioCard("payment_method", option.value, option.label, option.description, value, onChange);
    grid.append(card);
  });

  wrap.append(label, grid);
  return wrap;
}

function radioCard(name, value, title, body, currentValue, onChange) {
  const label = document.createElement("label");
  label.className = value === currentValue
    ? `grid cursor-pointer gap-1 ${tw.form.choiceActive}`
    : `grid cursor-pointer gap-1 ${tw.form.choiceIdle}`;

  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.checked = value === currentValue;
  input.className = "sr-only";
  input.addEventListener("change", () => onChange?.({ [name]: value }));

  const strong = document.createElement("strong");
  strong.className = "text-base text-gray-950";
  strong.textContent = title;

  const text = document.createElement("span");
  text.className = "text-xs text-gray-500";
  text.textContent = body;

  label.append(input, strong, text);
  return label;
}

function carPriceHint(car) {
  const box = document.createElement("div");
  box.className = `${tw.surface.inset} grid gap-2 shadow-sm`;
  const label = document.createElement("p");
  label.className = "text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700";
  label.textContent = "Harga transaksi";
  const value = document.createElement("p");
  value.className = "text-2xl font-bold text-gray-950";
  value.textContent = formatCurrency(effectivePrice(car));
  box.append(label, value);
  return box;
}

function instructionStrip() {
  const strip = document.createElement("div");
  strip.className = "grid gap-2 border-t border-white/60 pt-4 text-sm text-gray-600";
  [
    "Pilih DP bila ingin membuat sesi pembayaran uang muka terlebih dahulu.",
    "Setelah submit, buyer langsung mendapat transaction record dan payment session awal.",
  ].forEach((copy) => {
    const item = document.createElement("p");
    item.className = "rounded-2xl bg-orange-50/70 px-3 py-2";
    item.textContent = copy;
    strip.append(item);
  });
  return strip;
}

function bookingFee(car) {
  return Number(car?.dp_amount ?? 0);
}

function effectivePrice(car) {
  const discount = Number(car?.price_discount ?? 0);
  const cash = Number(car?.price_cash ?? 0);
  return discount > 0 && discount < cash ? discount : cash || Number(car?.price_credit ?? 0);
}
