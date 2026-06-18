import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { PublicQuickFilterRow } from "./publicQuickFilterRow.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "promo", label: "Promo" },
  { value: "price-low", label: "Termurah" },
  { value: "mileage-low", label: "KM rendah" },
];

export function PublicSearchFilterBar({
  filters = {},
  quickFilter = "newest",
  activeFilterCount = 0,
  options = {},
  onSearch = null,
  onQuickFilter = null,
  onOpenFilter = null,
} = {}) {
  const section = document.createElement("section");
  section.className = "relative z-30 grid gap-1 rounded-[24px] border border-white/70 bg-white/95 p-2.5 text-xs shadow-card backdrop-blur sm:p-4 sm:text-sm xl:grid-cols-[minmax(0,1fr)_280px] sm:items-start";
  applyDesignHook(section, "catalog.search.bar");

  const form = document.createElement("form");
  form.className = "grid gap-3 xl:col-span-2";

  const searchWrap = document.createElement("div");
  searchWrap.className = "flex min-w-0 items-center gap-1 overflow-visible rounded-[var(--pb-radius-lg)] border border-[var(--pb-border)] bg-[var(--pb-form-search-bg)] p-1 shadow-[var(--pb-shadow-soft)]";

  const iconWrap = document.createElement("span");
  // iconWrap.className = "grid h-9 w-9 shrink-0 place-items-center rounded-[var(--pb-radius-xl)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-[var(--pb-brand-primary)] sm:h-10 sm:w-10";
  // iconWrap.append(createIcon("search", { className: "h-5 w-5" }));

  const input = document.createElement("input");
  input.name = "keyword";
  input.type = "search";
  input.value = filters.keyword ?? "";
  input.placeholder = "Cari mobil impian Anda...";
  input.className = "min-w-0 flex-1 bg-transparent pr-1 text-sm text-[var(--pb-text-strong)] outline-none placeholder:text-sm placeholder:text-[var(--pb-text-muted)]";
  applyDesignHook(input, "catalog.search.input");

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "grid h-7 w-7 shrink-0 place-items-center rounded-[var(--pb-radius-lg)] bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-soft)] transition hover:brightness-95 sm:h-8 sm:w-8";
  submit.setAttribute("aria-label", "Cari mobil");
  submit.append(createIcon("search", { className: "" }));

  searchWrap.append(iconWrap, input, submit, actionRow({ activeFilterCount, quickFilter, onQuickFilter, onOpenFilter }));
  form.append(searchWrap);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSearch?.({ keyword: new FormData(form).get("keyword") ?? "" });
  });

  section.append(form);
  const filterStack = document.createElement("div");
  filterStack.className = "grid min-w-0 gap-1";
  filterStack.append(PublicQuickFilterRow({ active: quickFilter, onChange: onQuickFilter }));
  section.append(filterStack);
  section.append(locationSelector({ filters, options, onSearch }));

  return section;
}

function actionRow({ activeFilterCount, quickFilter, onQuickFilter, onOpenFilter }) {
  const row = document.createElement("div");
  row.className = "relative z-40 flex shrink-0 items-center gap-1 overflow-visible text-xs";
  applyDesignHook(row, "catalog.filter.toolbar");
  row.style.fontSize = "12px";

  const filterButton = Button({
    label: "",
    variant: "secondary",
    onClick: () => onOpenFilter?.(),
    designHook: "shared.button.secondary",
  });
  filterButton.setAttribute("aria-label", activeFilterCount > 0 ? `Filter, ${activeFilterCount} aktif` : "Filter");
  filterButton.classList.add("h-7", "w-7", "min-h-0", "justify-center", "rounded-[var(--pb-radius-lg)]", "p-0", "text-xs", "sm:h-8", "sm:w-8");
  filterButton.prepend(createIcon("filter", { className: "h-4 w-4" }));

  const sortWrap = document.createElement("div");
  sortWrap.className = "relative z-50 shrink-0 overflow-visible";

  const sortButton = Button({
    label: "",
    variant: "secondary",
    designHook: "shared.button.secondary",
  });
  sortButton.setAttribute("aria-label", "Urutkan");
  sortButton.classList.add("h-7", "w-7", "min-h-0", "justify-center", "rounded-[var(--pb-radius-lg)]", "p-0", "sm:h-8", "sm:w-8");
  sortButton.prepend(createIcon("sort", { className: "h-4 w-4" }));

  const menu = document.createElement("div");
  menu.className = "absolute right-0 top-[calc(100%+0.35rem)] z-[65] hidden w-[180px] rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-2 shadow-[var(--pb-shadow-elevated)]";

  SORT_OPTIONS.forEach((option) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = option.value === quickFilter
      ? "flex w-full items-center justify-between rounded-[var(--pb-radius-xl)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-2 text-left text-xs font-semibold text-[var(--pb-brand-secondary)]"
      : "flex w-full items-center justify-between rounded-[var(--pb-radius-xl)] px-3 py-2 text-left text-xs font-medium text-[var(--pb-text-muted)] hover:bg-[var(--pb-surface-muted)]";
    item.textContent = option.label;
    item.addEventListener("click", () => {
      menu.classList.add("hidden");
      onQuickFilter?.(option.value);
    });
    if (option.value === quickFilter) {
      item.append(createIcon("sparkles", { className: "h-4 w-4 shrink-0" }));
    }
    menu.append(item);
  });

  sortButton.addEventListener("click", () => {
    menu.classList.toggle("hidden");
  });
  sortWrap.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!sortWrap.contains(document.activeElement)) {
        menu.classList.add("hidden");
      }
    });
  });

  sortWrap.append(sortButton, menu);
  row.append(filterButton, sortWrap);
  return row;
}

function locationSelector({ filters, options, onSearch }) {
  const wrap = "";
  // const wrap = document.createElement("label");
  // wrap.className = "grid gap-2 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-4 py-3 shadow-[var(--pb-shadow-soft)]";
  //
  // const label = document.createElement("span");
  // label.className = "text-[11px] font-semibold uppercase tracking-normal text-[var(--pb-text-muted)]";
  // label.textContent = "Lokasi";
  //
  // const row = document.createElement("div");
  // row.className = "flex min-w-0 items-center gap-2";
  //
  // const icon = document.createElement("span");
  // icon.className = "grid h-9 w-9 shrink-0 place-items-center rounded-[var(--pb-radius-xl)] bg-[color-mix(in_srgb,var(--pb-danger)_10%,white)] text-[var(--pb-danger)]";
  // icon.append(createIcon("location", { className: "h-4 w-4" }));
  //
  // const select = document.createElement("select");
  // select.name = "location_name";
  // select.className = "min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--pb-text-strong)] outline-none";
  // withEmptyOption(options.locations ?? [], "Pilih lokasi").forEach((option) => {
  //   const item = document.createElement("option");
  //   item.value = option.value;
  //   item.textContent = option.label;
  //   select.append(item);
  // });
  // select.value = filters.location_name ?? "";
  // select.addEventListener("change", () => onSearch?.({ location_name: select.value }));
  //
  // row.append(icon, select, createIcon("sort", { className: "h-4 w-4 shrink-0 rotate-90 text-[var(--pb-text-muted)]" }));
  // wrap.append(label, row);
  return wrap;
}
function withEmptyOption(values, label) {
  return [
    { value: "", label },
    ...values.filter(Boolean).map((value) => ({ value, label: value })),
  ];
}
