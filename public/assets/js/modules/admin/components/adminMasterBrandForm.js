import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminMasterService } from "../services/adminMasterService.js";
import { ModalHeaderActions } from "../../../ui/composites/modalHeaderFormActions.js";

export function AdminMasterBrandForm({
  brand = null,
  mode = "create",
  onSubmit = null,
  onDelete = null,
  onCancel = null,
  actionsInBody = true,
} = {}) {
  const draft = cloneBrand(brand);
  const section = document.createElement("section");
  section.id = "admst_brand_form_section";
  section.className = "grid min-w-0 gap-5";
  section.dataset.ds = "admin.master.brand.form";

  const form = document.createElement("form");
  form.id = "admst_brand_form_input_section";
  form.className = "grid min-w-0 gap-5";

  const fields = document.createElement("section");
  fields.id = "admst_brand_fields_section";
  fields.className = "grid gap-4 sm:grid-cols-2";

  const name = inputField({
    id: "admst_brand_name_input",
    label: "Nama Brand",
    value: draft.name,
    placeholder: "Contoh: Toyota",
  });
  const status = selectField({
    id: "admst_brand_status_input",
    label: "Status",
    value: draft.status,
    options: [
      ["active", "Aktif"],
      ["inactive", "Nonaktif"],
    ],
  });
  const description = inputField({
    id: "admst_brand_description_input",
    label: "Deskripsi",
    value: draft.description,
    placeholder: "Catatan singkat brand",
  });
  fields.append(name.wrap, status.wrap, description.wrap);

  const modelsSection = document.createElement("section");
  modelsSection.id = "admst_models_section";
  modelsSection.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/78 p-4 shadow-sm";

  const modelsHeader = document.createElement("div");
  modelsHeader.className = "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  copy.append(
    textNode("p", "text-[10px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Child models"),
    textNode("p", "text-xs text-gray-600", "Model disimpan sebagai array di JSON payload brand."),
  );

  const addModel = Button({ label: "Tambah model", variant: "secondary" });
  addModel.id = "admst_add_model_button";
  addModel.type = "button";
  addModel.prepend(createIcon("sparkles", { className: "h-4 w-4" }));
  modelsHeader.append(copy);
  if (actionsInBody) {
    modelsHeader.append(addModel);
  }

  const modelRows = document.createElement("section");
  modelRows.id = "admst_model_rows_section";
  modelRows.className = "grid gap-3";

  const renderModels = () => {
    modelRows.replaceChildren();
    if (!draft.models.length) {
      const empty = document.createElement("section");
      empty.id = "admst_models_empty_section";
      empty.className = "rounded-[1.25rem] border border-dashed border-[var(--pb-border)] bg-white/70 px-4 py-5 text-xs font-semibold text-gray-500";
      empty.textContent = "Belum ada model. Tambahkan model agar brand siap dipakai di katalog.";
      modelRows.append(empty);
      return;
    }

    draft.models.forEach((model, index) => {
      modelRows.append(modelRow({ model, index, onRemove: () => {
        draft.models.splice(index, 1);
        renderModels();
      } }));
    });
  };

  addModel.addEventListener("click", () => {
    draft.models.push(adminMasterService.createEmptyModel());
    renderModels();
  });

  modelsSection.append(modelsHeader, modelRows);
  renderModels();

  const actions = document.createElement("section");
  actions.id = "admst_brand_form_actions_section";
  actions.className = "flex flex-wrap justify-end gap-2 border-t border-[var(--pb-border)] pt-4";

  const cancel = Button({ label: "Batal", variant: "secondary", onClick: () => onCancel?.() });
  cancel.id = "admst_cancel_brand_form_button";
  cancel.type = "button";

  if (mode === "edit") {
    const remove = Button({ label: "Hapus brand", variant: "secondary", onClick: () => onDelete?.(draft) });
    remove.id = "admst_delete_brand_form_button";
    remove.type = "button";
    actions.append(remove);
  }

  const submit = Button({ label: mode === "edit" ? "Simpan perubahan" : "Simpan brand", variant: "primary" });
  submit.id = "admst_save_brand_button";
  submit.type = "submit";
  submit.prepend(createIcon("sparkles", { className: "h-4 w-4" }));
  actions.append(cancel, submit);

  if (actionsInBody) {
    form.append(fields, modelsSection, actions);
  } else {
    submit.setAttribute("form", form.id);
    form.append(fields, modelsSection);
    section.modalHeaderActions = () => ModalHeaderActions({ children: [addModel, ...(mode === "edit" ? [actions.firstElementChild] : []), submit, cancel] });
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({
      ...draft,
      name: name.input.value.trim(),
      slug: slugify(name.input.value),
      status: status.input.value,
      description: description.input.value.trim(),
      models: readModelRows(modelRows),
    });
  });

  section.append(form);
  return section;
}

function modelRow({ model, index, onRemove }) {
  const row = document.createElement("section");
  row.id = `admst_model_row_${index}_section`;
  row.className = "grid gap-3 rounded-[1.25rem] border border-[var(--pb-border)] bg-white/82 p-4";

  const name = inputField({
    id: `admst_model_name_input_${index}`,
    label: "Nama model",
    value: model.name,
    placeholder: "Avanza",
  });
  const status = selectField({
    id: `admst_model_status_input_${index}`,
    label: "Status",
    value: model.status,
    options: [
      ["active", "Aktif"],
      ["inactive", "Nonaktif"],
    ],
  });
  const remove = Button({ label: "Hapus", variant: "secondary", onClick: onRemove });
  remove.id = `admst_remove_model_button_${index}`;
  remove.type = "button";
  remove.classList.add("w-full", "sm:w-auto", "sm:justify-self-start");

  row.dataset.modelId = model.id;
  row.append(name.wrap, status.wrap, remove);
  return row;
}

function readModelRows(modelRows) {
  return Array.from(modelRows.querySelectorAll("[data-model-id]")).map((row) => {
    const name = row.querySelector('[id^="admst_model_name_input_"]')?.value ?? "";
    const status = row.querySelector('[id^="admst_model_status_input_"]')?.value ?? "active";
    return {
      id: row.dataset.modelId,
      name: name.trim(),
      slug: slugify(name),
      status,
    };
  }).filter((model) => model.name);
}

function inputField({ id, label, value = "", placeholder = "" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1 text-xs font-semibold text-gray-700";
  wrap.textContent = label;
  const input = document.createElement("input");
  input.id = id;
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
  options.forEach(([optionValue, labelText]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = labelText;
    option.selected = optionValue === value;
    input.append(option);
  });
  wrap.append(input);
  return { wrap, input };
}

function cloneBrand(brand) {
  return {
    ...adminMasterService.createEmptyBrand(),
    ...(brand ? JSON.parse(JSON.stringify(brand)) : {}),
    models: brand?.models ? JSON.parse(JSON.stringify(brand.models)) : [],
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
  node.textContent = text;
  return node;
}
