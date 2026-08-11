import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Card } from "../../../ui/composites/card.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";

const STATUS_OPTIONS = [
  { value: "good", label: "Baik", icon: "circleCheck", active: "border-[color-mix(in_srgb,var(--pb-success)_42%,white)] bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] text-[color-mix(in_srgb,var(--pb-success)_84%,black)] shadow-sm" },
  { value: "fair", label: "Kurang baik", icon: "triangleWarning", active: "border-[color-mix(in_srgb,var(--pb-warning)_42%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] text-[color-mix(in_srgb,var(--pb-warning)_84%,black)] shadow-sm" },
  { value: "bad", label: "Tidak baik", icon: "circleXmark", active: "border-[color-mix(in_srgb,var(--pb-danger)_42%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] text-[color-mix(in_srgb,var(--pb-danger)_84%,black)] shadow-sm" },
  { value: "not_available", label: "Tidak tersedia", icon: "eyeSlash", active: "border-slate-300 bg-slate-100 text-slate-700 shadow-sm" },
];

export function SellerInspectionItemsList({
  items = [],
  busyItemId = null,
  onStatusChange = null,
  onNotesChange = null,
} = {}) {
  if (!items.length) {
    return EmptyState({
      title: "Item inspeksi belum ada",
      description: "Master inspection belum tersedia untuk mobil ini.",
    });
  }

  const list = document.createElement("section");
  list.id = "slrinsp_items_section";
  list.className = "grid gap-4";
  list.setAttribute("data-ds", "seller.inspection.items");
  groupItems(items).forEach(([category, group]) => {
    list.append(sectionCard(category, group, { busyItemId, onStatusChange, onNotesChange }));
  });

  return list;
}

function sectionCard(category, items, handlers) {
  const completed = items.filter((item) => ["good", "fair", "bad", "not_available"].includes(item.result_status)).length;
  const section = document.createElement("section");
  section.id = `slrinsp_section_${safeId(category)}`;
  section.className = "overflow-hidden rounded-[var(--pb-radius-2xl)] border border-[color-mix(in_srgb,var(--pb-brand-secondary)_18%,white)] bg-[var(--pb-surface-card)] shadow-[var(--pb-shadow-card)]";

  const header = document.createElement("section");
  header.id = `slrinsp_section_header_${safeId(category)}`;
  header.className = "flex min-w-0 flex-col gap-3 border-b border-[var(--pb-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-secondary)_14%,white),white)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between";

  const copy = document.createElement("div");
  copy.className = "min-w-0";
  const title = document.createElement("h2");
  title.className = "text-base font-black text-[var(--pb-text)]";
  title.textContent = sectionLabel(category);
  const helper = document.createElement("p");
  helper.className = "mt-1 text-sm text-[var(--pb-text-muted)]";
  helper.textContent = `${completed}/${items.length} item selesai`;
  copy.append(title, helper);

  const pill = document.createElement("span");
  pill.className = "inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white px-3 py-1 text-xs font-bold text-[var(--pb-text-strong)] shadow-[var(--pb-shadow-soft)]";
  pill.append(createIcon("clipboard", { className: "h-4 w-4 text-[var(--pb-brand-secondary)]" }), document.createTextNode(`${items.length} item`));

  header.append(copy, pill);

  const body = document.createElement("section");
  body.id = `slrinsp_section_items_${safeId(category)}`;
  body.className = "grid gap-3 p-3 md:p-4";
  items.forEach((item) => body.append(itemCard(item, handlers)));

  section.append(header, body);
  return section;
}

function itemCard(item, { busyItemId, onStatusChange, onNotesChange }) {
  const name = document.createElement("h3");
  name.className = "font-bold tracking-normal text-[var(--pb-text)]";
  name.textContent = item.item_name_snapshot || item.template?.item_name || "Item inspeksi";

  const description = document.createElement("p");
  description.className = `mt-1 text-sm leading-6 ${tw.text.muted}`;
  description.textContent = item.description || "Tidak ada deskripsi tambahan.";

  const header = document.createElement("div");
  header.className = "grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]";
  const copy = document.createElement("div");
  copy.append(name, description);
  header.append(copy, statusButtons(item, { busyItemId, onStatusChange }));

  const notesSection = notesPanel(item, onNotesChange);

  const card = Card([header, notesSection], { className: "p-4" });
  card.id = `slrinsp_item_${safeId(item.template_id)}_section`;
  return card;
}

function groupItems(items) {
  const groups = new Map();
  items.forEach((item) => {
    const category = item.template?.category_name || "general";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category).push(item);
  });
  return Array.from(groups.entries());
}

function statusButtons(item, { busyItemId, onStatusChange }) {
  const group = document.createElement("section");
  group.id = `slrinsp_condition_group_${safeId(item.template_id)}_section`;
  group.className = "grid gap-1.5 rounded-[var(--pb-radius-xl)] bg-gray-50/80 p-1.5 sm:grid-cols-4 lg:min-w-[30rem]";

  STATUS_OPTIONS.forEach((option) => {
    const active = item.result_status === option.value;
    const isBusy = busyItemId !== null && busyItemId !== undefined && String(busyItemId) === String(item.id);
    const button = document.createElement("button");
    button.id = `slrinsp_condition_${safeId(item.template_id)}_${option.value}_button`;
    button.type = "button";
    button.disabled = isBusy;
    button.className = [
      "inline-flex min-h-7 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black transition",
      active ? option.active : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-800",
      button.disabled ? "cursor-not-allowed opacity-60" : "",
    ].join(" ");
    button.append(createIcon(option.icon, { className: "h-3.5 w-3.5" }), document.createTextNode(option.label));
    button.addEventListener("click", () => onStatusChange?.(item, option.value));
    group.append(button);
  });

  return group;
}

function notesPanel(item, onNotesChange) {
  const section = document.createElement("section");
  section.id = `slrinsp_notes_panel_${safeId(item.template_id)}_section`;
  section.className = "grid gap-2";

  const hasNotes = Boolean(String(item.notes ?? "").trim());
  const toggle = document.createElement("button");
  toggle.id = `slrinsp_notes_toggle_${safeId(item.template_id)}_button`;
  toggle.type = "button";
  toggle.className = "inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:border-gray-300 hover:bg-white hover:text-gray-800";
  toggle.append(
    createIcon(hasNotes ? "edit" : "plus", { className: "h-3.5 w-3.5" }),
    document.createTextNode(hasNotes ? "Ubah catatan" : "Tambahkan catatan")
  );

  const textarea = document.createElement("textarea");
  textarea.id = `slrinsp_notes_${safeId(item.template_id)}_input`;
  textarea.className = "hidden min-h-[76px] w-full resize-y rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-white px-3 py-2 text-sm text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pb-form-focus)_22%,transparent)]";
  textarea.placeholder = "Tulis catatan singkat";
  textarea.value = item.notes ?? "";
  textarea.addEventListener("input", (event) => onNotesChange?.(item, event.target.value));

  toggle.addEventListener("click", () => {
    textarea.classList.toggle("hidden");
    if (!textarea.classList.contains("hidden")) {
      textarea.focus();
    }
  });

  section.append(toggle, textarea);
  return section;
}

function sectionLabel(value) {
  return String(value || "general")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeId(value) {
  return String(value ?? "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
}
