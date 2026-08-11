import { formatCurrency } from "../../../utils/formatCurrency.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function PublicPriceBlock({ car } = {}) {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[24px] border border-white/75 bg-white/95 p-5 shadow-card backdrop-blur";

  const label = document.createElement("p");
  label.className = "text-[11px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  label.textContent = hasPromo(car) ? "Harga promo" : "Harga cash";

  const primary = document.createElement("strong");
  primary.className = "break-words text-2xl font-bold tracking-normal text-gray-950";
  primary.textContent = formatCurrency(effectivePrice(car));

  const assist = document.createElement("p");
  assist.className = "text-sm leading-6 text-gray-600";
  assist.textContent = "Harga ditampilkan sebagai acuan utama sebelum Anda lanjut ke transaksi atau konsultasi.";

  const rows = document.createElement("div");
  rows.className = "grid gap-2 rounded-[22px] bg-gray-50 p-4 text-sm";

  if (hasPromo(car)) {
    rows.append(priceRow("Harga cash", formatCurrency(car.price_cash), true));
  }

  rows.append(priceRow("Kredit mulai", car?.price_credit ? formatCurrency(car.price_credit) : "Konsultasikan"));

  section.append(label, primary, assist, rows);
  return section;
}

function priceRow(label, value, muted = false) {
  const row = document.createElement("div");
  row.className = "flex flex-col gap-1 rounded-2xl bg-white/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3";

  const caption = document.createElement("span");
  caption.className = "break-words text-gray-500";
  caption.textContent = label;

  const content = document.createElement("span");
  content.className = muted ? "break-words text-left font-semibold text-[var(--pb-text-muted)] line-through sm:text-right" : "break-words text-left font-semibold text-gray-800 sm:text-right";
  content.textContent = value;

  row.append(caption, content);
  return row;
}

function hasPromo(car) {
  return Number(car?.price_discount ?? 0) > 0 && Number(car.price_discount) < Number(car?.price_cash ?? 0);
}

function effectivePrice(car) {
  return hasPromo(car) ? car.price_discount : car?.price_cash ?? car?.price_credit ?? 0;
}
