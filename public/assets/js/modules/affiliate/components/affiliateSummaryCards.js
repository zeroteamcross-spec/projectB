import { Card } from "../../../ui/composites/card.js";

export function AffiliateSummaryCards({ items = [] } = {}) {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-3 sm:grid-cols-3";

  items.forEach((item) => {
    const card = Card([], { variant: "raised" });
    card.classList.add("grid", "min-w-0", "gap-2", "overflow-hidden", "p-5");

    const label = document.createElement("p");
    label.className = "break-words text-[11px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]";
    label.textContent = item.label;

    const value = document.createElement("p");
    value.className = "break-words text-2xl font-bold leading-tight text-gray-950 sm:text-3xl";
    value.textContent = item.value;

    const helper = document.createElement("p");
    helper.className = "break-words text-sm leading-6 text-gray-600";
    helper.textContent = item.helper;

    card.append(label, value, helper);
    section.append(card);
  });

  return section;
}
