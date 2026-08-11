import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminMasterService } from "../services/adminMasterService.js";
import { ModalHeaderActions } from "../../../ui/composites/modalHeaderFormActions.js";

export function AdminMasterLocationForm({
  city = null,
  mode = "create",
  saving = false,
  onSubmit = null,
  onDelete = null,
  onCancel = null,
  actionsInBody = true,
} = {}) {
  const draft = city ? { ...city } : adminMasterService.createEmptyCity();
  const form = document.createElement("form");
  form.id = "admstloc_location_form_section";
  form.className = "grid gap-5";
  form.dataset.ds = "admin.master.location.form";

  const intro = document.createElement("section");
  intro.id = "admstloc_form_intro_section";
  intro.className = "rounded-[1.5rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(250,244,237,0.94),rgba(234,244,249,0.82))] p-4";
  intro.append(
    textNode("p", "text-[10px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", mode === "edit" ? "Edit lokasi" : "Create lokasi"),
    textNode("p", "mt-1 text-xs font-semibold leading-6 text-gray-600", "Field provinsi bersifat opsional agar master ini siap diperluas ke tingkat provinsi tanpa mengubah schema payload."),
  );

  const fields = document.createElement("section");
  fields.id = "admstloc_form_fields_section";
  fields.className = "grid gap-4 md:grid-cols-2";

  const cityName = inputField("admstloc_city_name_input", "name", "Nama kota", draft.name, "Contoh: Jakarta");
  const provinceName = inputField("admstloc_province_name_input", "province_name", "Nama provinsi", draft.province_name, "Contoh: DKI Jakarta");
  const status = selectField("admstloc_city_status_input", "status", "Status", draft.status, [
    ["active", "Aktif"],
    ["inactive", "Nonaktif"],
  ]);
  fields.append(cityName.wrap, provinceName.wrap, status.wrap);

  const actions = document.createElement("section");
  actions.id = "admstloc_form_actions_section";
  actions.className = "flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between";
  const left = document.createElement("section");
  left.id = "admstloc_form_destructive_actions_section";
  const right = document.createElement("section");
  right.id = "admstloc_form_primary_actions_section";
  right.className = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";

  if (mode === "edit") {
    const remove = Button({ label: "Hapus", variant: "secondary", disabled: saving, onClick: () => onDelete?.(draft) });
    remove.id = "admstloc_delete_city_form_button";
    remove.type = "button";
    remove.prepend(createIcon("trash", { className: "h-4 w-4" }));
    left.append(remove);
  }
  const cancel = Button({ label: "Batal", variant: "secondary", disabled: saving, onClick: onCancel });
  cancel.id = "admstloc_cancel_city_button";
  cancel.type = "button";
  const submit = Button({ label: saving ? "Menyimpan..." : "Simpan Lokasi", disabled: saving });
  submit.id = "admstloc_save_city_button";
  submit.type = "submit";
  submit.prepend(createIcon("circleCheck", { className: "h-4 w-4" }));
  right.append(cancel, submit);
  actions.append(left, right);

  if (actionsInBody) {
    form.append(intro, fields, actions);
  } else {
    submit.setAttribute("form", form.id);
    form.append(intro, fields);
    form.modalHeaderActions = () => ModalHeaderActions({ children: [left.firstElementChild, submit, cancel] });
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const cityNameValue = String(formData.get("name") ?? "").trim();
    const provinceNameValue = String(formData.get("province_name") ?? "").trim();
    onSubmit?.({
      ...draft,
      name: cityNameValue,
      slug: slugify(cityNameValue),
      province_name: provinceNameValue,
      province_slug: slugify(provinceNameValue),
      status: String(formData.get("status") ?? "active"),
    });
  });

  return form;
}

function inputField(id, name, label, value, placeholder) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1 text-xs font-semibold text-gray-700";
  wrap.textContent = label;
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  wrap.append(input);
  return { wrap, input };
}

function selectField(id, name, label, value, options) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1 text-xs font-semibold text-gray-700";
  wrap.textContent = label;
  const select = document.createElement("select");
  select.id = id;
  select.name = name;
  select.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  options.forEach(([optionValue, optionLabel]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    select.append(option);
  });
  wrap.append(select);
  return { wrap, select };
}

function slugify(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
