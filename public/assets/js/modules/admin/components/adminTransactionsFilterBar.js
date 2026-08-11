import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function AdminTransactionsFilterBar({ filters = {}, counts = {}, onSubmit = null } = {}) {
  const card = document.createElement("section");
  card.id = "adtr_filter_section";
  card.className = `grid min-w-0 gap-4 ${tw.section.toolbar} border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(234,244,249,0.72),rgba(250,244,237,0.72))]`;

  const header = document.createElement("div");
  header.className = "flex min-w-0 items-start gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.20)]";
  icon.append(createIcon("filter", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("text-[10px] font-black uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--pb-brand-primary)_84%,black)]", "Transaction filter"),
    textBlock("text-xs leading-6 text-gray-600", "Saring status, payment type, dan keyword supaya review transaksi tetap cepat dibaca."),
  );
  header.append(
    icon,
    copy,
  );

  const form = document.createElement("form");
  form.id = "adtr_filter_form_section";
  form.className = "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,0.8fr))_auto]";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({
      keyword: keywordInput.value.trim(),
      status: statusSelect.value,
      paymentType: paymentTypeSelect.value,
      transactionId: filters.transactionId ?? "",
    });
  });

  const keywordLabel = fieldLabel("Cari transaksi");
  const keywordInput = document.createElement("input");
  keywordInput.id = "adtr_keyword_input";
  keywordInput.name = "keyword";
  keywordInput.className = `${tw.form.control} min-w-0 max-w-full`;
  keywordInput.placeholder = "Kode transaksi, buyer, seller, mobil";
  keywordInput.value = filters.keyword ?? "";
  keywordLabel.append(keywordInput);

  const statusLabel = fieldLabel("Status");
  const statusSelect = document.createElement("select");
  statusSelect.id = "adtr_status_input";
  statusSelect.name = "status";
  statusSelect.className = `${tw.form.control} min-w-0 max-w-full`;
  buildOptions(statusSelect, filters.status ?? "", [
    ["", "Semua status"],
    ["pending_payment", "Menunggu pembayaran"],
    ["dp_paid", "DP dibayar"],
    ["paid", "Lunas"],
    ["expired", "Kadaluarsa"],
    ["cancelled", "Dibatalkan"],
  ]);
  statusLabel.append(statusSelect);

  const paymentTypeLabel = fieldLabel("Payment type");
  const paymentTypeSelect = document.createElement("select");
  paymentTypeSelect.id = "adtr_payment_type_input";
  paymentTypeSelect.name = "payment_type";
  paymentTypeSelect.className = `${tw.form.control} min-w-0 max-w-full`;
  buildOptions(paymentTypeSelect, filters.paymentType ?? "", [
    ["", "Semua tipe"],
    ["dp", "DP"],
    ["full", "Full"],
  ]);
  paymentTypeLabel.append(paymentTypeSelect);

  const actions = document.createElement("div");
  actions.className = "grid gap-2 sm:grid-cols-2 lg:grid-cols-1";
  const submit = Button({ label: "Terapkan", variant: "primary" });
  submit.id = "adtr_apply_filter_button";
  submit.type = "submit";
  submit.prepend(createIcon("search", { className: "h-4 w-4" }));
  const reset = Button({
    label: "Reset",
    variant: "secondary",
    onClick: () => onSubmit?.({ keyword: "", status: "", paymentType: "", transactionId: filters.transactionId ?? "" }),
  });
  reset.id = "adtr_reset_filter_button";
  reset.type = "button";
  actions.append(submit, reset);

  form.append(keywordLabel, statusLabel, paymentTypeLabel, actions);
  card.append(header, form, countsRow(counts));
  return card;
}

function fieldLabel(text) {
  const label = document.createElement("label");
  label.className = tw.form.label;
  label.textContent = text;
  return label;
}

function buildOptions(select, selected, options) {
  options.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === selected;
    select.append(option);
  });
}

function countsRow(counts) {
  const wrap = document.createElement("section");
  wrap.id = "adtr_filter_counts_section";
  wrap.className = "flex flex-wrap gap-2 border-t border-white/60 pt-4";

  [
    ["Total", counts.total ?? 0],
    ["Pending", counts.pending ?? 0],
    ["DP paid", counts.dpPaid ?? 0],
    ["Paid", counts.paid ?? 0],
    ["Perlu perhatian", counts.attention ?? 0],
  ].forEach(([label, value]) => {
    const chip = document.createElement("span");
    chip.className = tw.interactive.pillIdle;
    chip.textContent = `${label}: ${value}`;
    wrap.append(chip);
  });

  return wrap;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}
