import { Button } from "../../../ui/primitives/button.js";
import { Input } from "../../../ui/primitives/input.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { appStore } from "../../../state/store.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";

const FILTER_MODAL_KEY = "pub-local-filter-modal";

export function PublicFilterBottomSheet({
  open = false,
  filters = {},
  options = {},
  onApply = null,
  onClose = null,
  onReset = null,
} = {}) {
  const host = document.createElement("span");
  host.hidden = true;

  if (!open) {
    closePublicFilterModal();
    return host;
  }

  const content = document.createElement("section");
  content.id = "pub_filter_modal_content";
  content.className = "grid min-w-0 gap-5";
  const draft = {
    brands: selectedBrands(filters),
  };

  content.append(
    filterGroup("Merek", withEmptyOption(options.brands ?? [], "Semua merek").map((item) => ({
      label: item.label,
      value: item.value,
      icon: "car",
      active: item.value === "" ? draft.brands.length === 0 : draft.brands.includes(item.value),
      onClick: (button, siblings) => {
        if (item.value === "") {
          draft.brands = [];
        } else {
          draft.brands = toggleValue(draft.brands, item.value);
        }
        syncMultiOptionButtons(siblings, draft.brands);
      },
    }))),
    filterGroup("Transmisi", withEmptyOption(options.transmissions ?? [], "Semua transmisi").map((item) => ({
      label: item.label,
      value: item.value,
      icon: "sort",
      active: String(filters.transmission ?? "") === item.value,
      onClick: (button, siblings) => syncSingleOptionButtons(button, siblings),
    })), "transmission"),
    filterGroup("Lokasi", withEmptyOption(options.locations ?? [], "Semua lokasi").map((item) => ({
      label: item.label,
      value: item.value,
      icon: "location",
      active: String(filters.location_name ?? "") === item.value,
      onClick: (button, siblings) => syncSingleOptionButtons(button, siblings),
    })), "location_name"),
    numericFields(filters),
  );

  const actions = document.createElement("section");
  actions.className = "grid grid-cols-2 gap-3";

  const resetButton = Button({
    label: "Reset",
    variant: "secondary",
    onClick: () => {
      closeModal({ notify: false });
      onReset?.();
    },
    designHook: "shared.button.secondary",
  });
  resetButton.id = "pub_filter_reset_button";
  resetButton.classList.add("w-full", "min-h-11", "px-4", "py-2", "text-sm");

  const applyButton = Button({
    label: "Selesai",
    onClick: () => {
      closeModal({ notify: false });
      const values = collectFilterValues(content);
      onApply?.({
        ...values,
        brand_name: "",
        brand_names: [...draft.brands],
      });
    },
    designHook: "shared.button.primary",
  });
  applyButton.id = "pub_filter_apply_button";
  applyButton.classList.add("w-full", "min-h-11", "px-4", "py-2", "text-sm");

  actions.append(resetButton, applyButton);
  content.append(actions);

  openModal(content, {
    key: FILTER_MODAL_KEY,
    title: "Filter Mobil",
    description: "Filter lokal dari data mobil yang sudah tersedia di halaman.",
    size: "lg",
    footer: null,
    panelId: "pub_filter_modal",
    headerId: "pub_filter_modal_header",
    bodyId: "pub_filter_modal_body",
    closeButtonId: "pub_filter_modal_close_button",
    onClose,
  });

  return host;
}

function closePublicFilterModal() {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === FILTER_MODAL_KEY) {
    closeModal({ notify: false });
  }
}

function numericFields(filters) {
  const section = document.createElement("section");
  section.className = "grid gap-4";
  section.append(
    Input({
      name: "min_price_cash",
      type: "number",
      label: "Harga minimum",
      value: filters.min_price_cash ?? "",
      placeholder: "Contoh 100000000",
    }),
    Input({
      name: "max_price_cash",
      type: "number",
      label: "Harga maksimum",
      value: filters.max_price_cash ?? "",
      placeholder: "Contoh 300000000",
    }),
  );
  return section;
}

function collectFilterValues(content) {
  const values = {
    transmission: "",
    location_name: "",
    min_price_cash: "",
    max_price_cash: "",
  };

  content.querySelectorAll("[data-filter-name]").forEach((button) => {
    if (button.dataset.active === "true") {
      values[button.dataset.filterName] = button.dataset.value ?? "";
    }
  });

  content.querySelectorAll("input").forEach((input) => {
    values[input.name] = input.value ?? "";
  });

  return values;
}

function filterGroup(title, options, filterName = "") {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-3";
  const heading = document.createElement("h3");
  heading.className = "text-sm font-black text-[var(--pb-text)]";
  heading.textContent = title;

  const grid = document.createElement("section");
  grid.className = "grid grid-cols-2 gap-2 sm:grid-cols-3";
  const buttons = [];
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = optionButtonClassName(option.active);
    button.dataset.active = option.active ? "true" : "false";
    button.dataset.value = option.value ?? "";
    if (filterName) {
      button.dataset.filterName = filterName;
    }
    button.append(
      iconBox({ icon: option.icon }),
      textNode("span", "min-w-0 truncate text-left", option.label),
    );
    button.addEventListener("click", () => option.onClick(button, buttons));
    buttons.push(button);
    grid.append(button);
  });

  section.append(heading, grid);
  return section;
}

function optionButtonClassName(active) {
  return active
    ? "inline-flex min-w-0 items-center gap-2 rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_30%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-2 text-sm font-black text-[var(--pb-brand-secondary)]"
    : "inline-flex min-w-0 items-center gap-2 rounded-[1rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-3 py-2 text-sm font-bold text-[var(--pb-text-strong)] transition hover:bg-[var(--pb-surface-muted)]";
}

function syncMultiOptionButtons(siblings, activeValues) {
  const activeSet = new Set(activeValues.map(String));
  siblings.forEach((button) => {
    const value = String(button.dataset.value ?? "");
    const active = value === "" ? activeSet.size === 0 : activeSet.has(value);
    button.dataset.active = active ? "true" : "false";
    button.className = optionButtonClassName(active);
  });
}

function syncSingleOptionButtons(activeButton, siblings) {
  siblings.forEach((button) => {
    const active = button === activeButton;
    button.dataset.active = active ? "true" : "false";
    button.className = optionButtonClassName(active);
  });
}

function selectedBrands(filters) {
  if (Array.isArray(filters?.brand_names)) {
    return [...new Set(filters.brand_names.map(String).filter(Boolean))];
  }
  const legacyBrand = String(filters?.brand_name ?? "");
  return legacyBrand ? [legacyBrand] : [];
}

function toggleValue(values, value) {
  const current = new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean));
  if (current.has(value)) {
    current.delete(value);
  } else {
    current.add(value);
  }
  return [...current];
}

function iconBox({ icon = "info" } = {}) {
  const wrap = document.createElement("span");
  wrap.className = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--pb-brand-secondary)]";
  wrap.append(createIcon(icon, { className: "h-4 w-4" }));
  return wrap;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}

function withEmptyOption(values, label) {
  return [
    { value: "", label },
    ...values.filter(Boolean).map((value) => ({ value, label: value })),
  ];
}
