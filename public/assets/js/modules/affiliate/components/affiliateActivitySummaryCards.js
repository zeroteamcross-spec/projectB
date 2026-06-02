import { Card } from "../../../ui/composites/card.js";

export function AffiliateActivitySummaryCards({ items = [] } = {}) {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-3 sm:grid-cols-3";

  items.forEach((item) => {
    const card = Card();
    card.classList.add("grid", "min-w-0", "gap-1", "overflow-hidden");

    const label = document.createElement("p");
    label.className = "break-words text-sm font-medium text-gray-500";
    label.textContent = item.label;

    const value = document.createElement("p");
    value.className = "break-words text-xl font-bold leading-tight text-gray-950";
    value.textContent = item.value;

    const helper = document.createElement("p");
    helper.className = "break-words text-sm leading-6 text-gray-600";
    helper.textContent = item.helper;

    card.append(label, value, helper);
    section.append(card);
  });

  return section;
}
