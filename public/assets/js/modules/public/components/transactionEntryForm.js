import { Button } from "../../../ui/primitives/button.js";
import { PAYMENT_METHOD_OPTIONS } from "../../transactions/paymentMethodSupport.js";
import { NumericInput } from "../../../ui/primitives/numericInput.js";
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
  body.textContent = "Pilih skema pembayaran awal. Sesi pembayaran akan dibuat setelah form dikirim.";
  header.append(eyebrow, title, body);

  const node = document.createElement("form");
  node.className = "grid gap-4";

  const paymentType = form.payment_type ?? "dp";
  node.append(
    paymentTypeBlock(paymentType, onChange),
    dpAmountBlock({ car, paymentType, value: form.dp_amount ?? "", onChange }),
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
    onSubmit?.({
      payment_type: data.payment_type,
      dp_amount: data.payment_type === "dp" ? data.dp_amount : "0",
      payment_method: data.payment_method,
    });
  });

  section.append(header, carPriceHint(car), instructionStrip(), node);
  return section;
}

function paymentTypeBlock(value, onChange) {
  const wrap = document.createElement("fieldset");
  wrap.className = "grid gap-2";

  const legend = document.createElement("legend");
  legend.className = "text-sm font-bold text-gray-800";
  legend.textContent = "Tipe pembayaran";

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-1 gap-2 sm:grid-cols-2";
  grid.append(
    radioCard("payment_type", "dp", "DP", "Bayar uang muka dulu", value, onChange),
    radioCard("payment_type", "full", "Full", "Bayar penuh", value, onChange)
  );

  wrap.append(legend, grid);
  return wrap;
}

function dpAmountBlock({ car, paymentType, value, onChange }) {
  const wrap = NumericInput({
    id: "pubtrx_dp_amount_input",
    name: "dp_amount",
    label: "Nominal DP",
    value: value || suggestedDp(car),
    placeholder: suggestedDp(car),
    required: paymentType === "dp",
  });
  wrap.className = paymentType === "dp" ? tw.form.label : "hidden";
  wrap.addEventListener("change", () => {
    const rawInput = wrap.querySelector('input[name="dp_amount"]');
    onChange?.({ dp_amount: rawInput?.value ?? "" });
  });

  const hint = document.createElement("span");
  hint.className = "text-xs font-medium text-gray-500";
  hint.textContent = `Saran DP: ${formatCurrency(suggestedDp(car))}`;

  wrap.append(hint);
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

function suggestedDp(car) {
  return Math.max(1000000, Math.round(effectivePrice(car) * 0.2 / 100000) * 100000);
}

function effectivePrice(car) {
  const discount = Number(car?.price_discount ?? 0);
  const cash = Number(car?.price_cash ?? 0);
  return discount > 0 && discount < cash ? discount : cash || Number(car?.price_credit ?? 0);
}
