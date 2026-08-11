import { createIcon } from "../../../theme/iconRegistry.js";

const QUICK_FILTERS = [
  { value: "newest", label: "Terbaru", icon: "star" },
  { value: "promo", label: "Promo", icon: "sparkles" },
  { value: "price-low", label: "Termurah", icon: "commission" },
  { value: "mileage-low", label: "KM Rendah", icon: "car" },
];

export function PublicQuickFilterRow({ active = "newest", onChange = null } = {}) {
  const row = document.createElement("div");
  row.className = "flex flex-wrap gap-2 xl:items-center";

  // QUICK_FILTERS.forEach((item) => {
  //   const button = document.createElement("button");
  //   button.type = "button";
  //   button.className = item.value === active
  //     ? "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--pb-chip-active-from),var(--pb-chip-active-to))] px-4 py-2 text-xs font-semibold text-white shadow-[var(--pb-shadow-card)]"
  //     : "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full bg-[var(--pb-chip-bg)] px-4 py-2 text-xs font-semibold text-[var(--pb-chip-text)] shadow-[var(--pb-shadow-soft)]";
  //   button.append(
  //     categoryDot(item.icon, item.value === active),
  //     document.createTextNode(item.label)
  //   );
  //   button.addEventListener("click", () => onChange?.(item.value));
  //   row.append(button);
  // });

  return row;
}

function categoryDot(icon, active) {
  const dot = document.createElement("span");
  dot.className = active
    ? "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-white"
    : "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--pb-chip-text)_10%,white)] text-[var(--pb-chip-text)]";
  dot.append(createIcon(icon, { className: "h-3 w-3" }));
  return dot;
}
