import { Button } from "../../../ui/primitives/button.js";
import { titipkanAksiModal } from "../../../ui/composites/modalHeaderFormActions.js";
import { createIcon, iconRegistry } from "../../../theme/iconRegistry.js";
import { adminMasterService } from "../services/adminMasterService.js";

export function AdminMasterSidebarForm({
  item = null,
  items = [],
  mode = "create",
  onSubmit = null,
  onDelete = null,
  onCancel = null,
} = {}) {
  const draft = cloneItem(item);
  const section = document.createElement("section");
  section.id = "admst_sidebar_form_section";
  section.className = "grid min-w-0 gap-5";
  section.dataset.ds = "admin.master.sidebar.form";

  const form = document.createElement("form");
  form.id = "admst_sidebar_form_input_section";
  form.className = "grid min-w-0 gap-5";

  const fields = document.createElement("section");
  fields.id = "admst_sidebar_fields_section";
  fields.className = "grid gap-4 sm:grid-cols-2";

  const role = selectField({
    id: "admst_sidebar_form_role_input",
    label: "Level User target",
    value: draft.role,
    options: [
      ["admin", "Admin"],
      ["seller", "Showroom"],
      ["affiliate", "Marketing"],
    ],
  });
  const label = inputField({
    id: "admst_sidebar_form_label_input",
    label: "Label menu",
    value: draft.label,
    placeholder: "Contoh: User Management",
  });
  const route = inputField({
    id: "admst_sidebar_form_route_input",
    label: "Route/hash",
    value: draft.route,
    placeholder: "#/admin/users",
  });
  const icon = iconSelectorField({
    id: "admst_sidebar_form_icon_input",
    label: "Icon",
    value: draft.icon,
  });
  const order = inputField({
    id: "admst_sidebar_form_order_input",
    label: "Urutan",
    value: String(draft.order ?? 10),
    placeholder: "10",
    type: "number",
  });
  const parent = selectField({
    id: "admst_sidebar_form_parent_input",
    label: "Parent menu",
    value: draft.parent_key,
    options: parentOptions(items, draft),
  });
  fields.append(role.wrap, label.wrap, route.wrap, icon.wrap, order.wrap, parent.wrap);
  role.input.addEventListener("change", () => {
    replaceSelectOptions(parent.input, parentOptions(items, { ...draft, role: role.input.value }), parent.input.value);
  });

  const flags = document.createElement("section");
  flags.id = "admst_sidebar_flags_section";
  flags.className = "grid gap-3 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/78 p-4 shadow-sm sm:grid-cols-3";
  const isParent = checkboxField({
    id: "admst_sidebar_is_parent_input",
    label: "Parent menu",
    checked: draft.is_parent,
  });
  const isVisible = checkboxField({
    id: "admst_sidebar_is_visible_input",
    label: "Tampil di sidebar",
    checked: draft.is_visible,
  });
  const isActive = checkboxField({
    id: "admst_sidebar_is_active_input",
    label: "Aktif",
    checked: draft.is_active,
  });
  flags.append(isParent.wrap, isVisible.wrap, isActive.wrap);

  const actions = document.createElement("section");
  actions.id = "admst_sidebar_form_actions_section";
  actions.className = "flex shrink-0 flex-wrap items-center justify-end gap-2";

  const cancel = Button({ label: "Batal", variant: "secondary", onClick: () => onCancel?.() });
  cancel.id = "admst_cancel_sidebar_form_button";
  cancel.type = "button";

  if (mode === "edit") {
    const remove = Button({ label: "Hapus menu", variant: "secondary", onClick: () => onDelete?.(draft) });
    remove.id = "admst_delete_sidebar_form_button";
    remove.type = "button";
    actions.append(remove);
  }

  const submit = Button({ label: mode === "edit" ? "Simpan perubahan" : "Simpan menu", variant: "primary" });
  submit.id = "admst_save_sidebar_button";
  submit.type = "submit";
  // Tayang di header modal, jadi di luar <form>. Formnya ditunjuk lewat
  // atribut form, bukan lewat hubungan induk-anak.
  submit.setAttribute("form", form.id);
  submit.prepend(createIcon("sparkles", { className: "h-4 w-4" }));
  actions.append(cancel, submit);

  form.append(fields, flags);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextLabel = label.input.value.trim();
    const nextRole = role.input.value;
    onSubmit?.({
      ...draft,
      role: nextRole,
      key: draft.key || `${nextRole}.${slugify(nextLabel || route.input.value || "menu")}`,
      label: nextLabel,
      route: route.input.value.trim(),
      icon: icon.input.value.trim() || "sort",
      order: Number(order.input.value || 0),
      parent_key: parent.input.value,
      is_parent: isParent.input.checked,
      is_visible: isVisible.input.checked,
      is_active: isActive.input.checked,
      updated_at: new Date().toISOString(),
    });
  });

  section.append(form);
  return titipkanAksiModal(section, actions);
}

function parentOptions(items, draft) {
  const options = [["", "Tanpa parent"]];
  items
    .filter((item) => item.role === draft.role && item.id !== draft.id && item.is_parent)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .forEach((item) => options.push([item.key, item.label]));
  return options;
}

function inputField({ id, label, value = "", placeholder = "", type = "text" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1 text-xs font-semibold text-gray-700";
  wrap.textContent = label;
  const input = document.createElement("input");
  input.id = id;
  input.type = type;
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.className = "min-h-10 w-full min-w-0 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  wrap.append(input);
  return { wrap, input };
}

function selectField({ id, label, value = "", options = [] }) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1 text-xs font-semibold text-gray-700";
  wrap.textContent = label;
  const input = document.createElement("select");
  input.id = id;
  input.className = "min-h-10 w-full min-w-0 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  replaceSelectOptions(input, options, value);
  wrap.append(input);
  return { wrap, input };
}

function replaceSelectOptions(input, options = [], value = "") {
  input.replaceChildren();
  options.forEach(([optionValue, labelText]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = labelText;
    option.selected = optionValue === value;
    input.append(option);
  });
}

function checkboxField({ id, label, checked = false }) {
  const wrap = document.createElement("label");
  wrap.className = "flex min-h-12 items-center gap-3 rounded-[1.1rem] border border-[var(--pb-border)] bg-white/80 px-3 py-2 text-xs font-bold text-gray-700";
  const input = document.createElement("input");
  input.id = id;
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.className = "h-4 w-4 rounded border-[var(--pb-border)] text-[var(--pb-brand-secondary)] focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_45%,white)]";
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(input, text);
  return { wrap, input };
}

function iconSelectorField({ id, label, value = "" }) {
  let selectedValue = iconRegistry.includes(value) ? value : "sort";
  const wrap = document.createElement("section");
  wrap.id = "admst_sidebar_icon_selector_section";
  wrap.className = "grid min-w-0 gap-2 text-xs font-semibold text-gray-700 sm:col-span-2";

  const title = document.createElement("p");
  title.textContent = label;

  const preview = document.createElement("section");
  preview.id = "admst_sidebar_icon_preview_section";
  preview.className = "flex flex-col gap-3 rounded-[1.25rem] border border-[var(--pb-border)] bg-white/82 p-3 sm:flex-row sm:items-center sm:justify-between";

  const selected = document.createElement("div");
  selected.className = "flex min-w-0 items-center gap-3";
  const selectedIcon = document.createElement("span");
  selectedIcon.className = "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--pb-surface-muted)] text-[var(--pb-brand-secondary)] ring-1 ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]";
  selectedIcon.append(createIcon(selectedValue, { className: "h-5 w-5" }));
  const selectedText = textNode("span", "truncate text-xs font-black text-gray-800", selectedValue);
  selected.append(selectedIcon, selectedText);

  const input = document.createElement("input");
  input.id = id;
  input.type = "hidden";
  input.value = selectedValue;

  const choose = Button({ label: "Pilih Icon", variant: "secondary" });
  choose.id = "admst_sidebar_choose_icon_button";
  choose.type = "button";
  choose.prepend(createIcon("sparkles", { className: "h-4 w-4" }));
  preview.append(selected, choose);

  const modal = iconPickerModal({
    currentValue: selectedValue,
    onSelect: (name) => {
      selectedValue = name;
      input.value = name;
      selectedIcon.replaceChildren(createIcon(name, { className: "h-5 w-5" }));
      selectedText.textContent = name;
    },
  });
  choose.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  wrap.append(title, input, preview, modal);
  return { wrap, input };
}

function iconPickerModal({ currentValue, onSelect }) {
  const overlay = document.createElement("section");
  overlay.id = "admst_sidebar_icon_picker_modal_section";
  overlay.className = "hidden fixed inset-0 z-[80] grid place-items-center bg-gray-950/45 p-4 backdrop-blur-sm";

  const panel = document.createElement("section");
  panel.id = "admst_sidebar_icon_picker_panel_section";
  panel.className = "grid max-h-[82vh] w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]";

  const head = document.createElement("section");
  head.id = "admst_sidebar_icon_picker_header_section";
  head.className = "flex items-center justify-between gap-3 border-b border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.90))] px-4 py-3";
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-0.5";
  copy.append(
    textNode("p", "text-sm font-black text-gray-950", "Pilih Icon"),
    textNode("p", "text-xs font-semibold text-gray-500", "Font Awesome gratis yang tersedia di aplikasi."),
  );
  const close = Button({ label: "Tutup", variant: "secondary" });
  close.id = "admst_sidebar_icon_picker_close_button";
  close.type = "button";
  close.addEventListener("click", () => overlay.classList.add("hidden"));
  head.append(copy, close);

  const body = document.createElement("section");
  body.id = "admst_sidebar_icon_picker_body_section";
  body.className = "grid max-h-[62vh] grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

  iconRegistry
    .filter((name) => name !== "brandMark")
    .forEach((name) => {
      const option = document.createElement("button");
      option.id = `admst_sidebar_icon_picker_option_${slugify(name)}_button`;
      option.type = "button";
      option.className = iconOptionClass(name === currentValue);
      option.append(
        createIcon(name, { className: "h-5 w-5" }),
        textNode("span", "max-w-full truncate text-[10px] font-bold", name),
      );
      option.addEventListener("click", () => {
        onSelect?.(name);
        body.querySelectorAll("button").forEach((button) => {
          button.className = iconOptionClass(button.dataset.iconName === name);
        });
        overlay.classList.add("hidden");
      });
      option.dataset.iconName = name;
      body.append(option);
    });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.classList.add("hidden");
    }
  });
  panel.append(head, body);
  overlay.append(panel);
  return overlay;
}

function iconOptionClass(active) {
  return [
    "grid min-h-20 min-w-0 place-items-center gap-1 rounded-[1rem] border px-2 py-2 text-center transition",
    active
      ? "border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-[var(--pb-surface-muted)] text-[var(--pb-brand-secondary)] shadow-sm"
      : "border-[var(--pb-border)] bg-white/82 text-gray-600 hover:-translate-y-0.5 hover:bg-white",
  ].join(" ");
}

function cloneItem(item) {
  return {
    ...adminMasterService.createEmptySidebarItem(),
    ...(item ? JSON.parse(JSON.stringify(item)) : {}),
  };
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
