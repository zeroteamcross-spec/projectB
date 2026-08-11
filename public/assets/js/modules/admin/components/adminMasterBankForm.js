import { Button } from "../../../ui/primitives/button.js";
import { titipkanAksiModal } from "../../../ui/composites/modalHeaderFormActions.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminMasterService } from "../services/adminMasterService.js";

export function AdminMasterBankForm({
  bank = null,
  mode = "create",
  saving = false,
  uploading = false,
  uploadError = "",
  onUploadIcon = null,
  onSubmit = null,
  onDelete = null,
  onCancel = null,
} = {}) {
  const draft = bank ? { ...bank } : adminMasterService.createEmptyBank();
  const form = document.createElement("form");
  form.id = "admstbk_bank_form_section";
  form.className = "grid gap-5";
  form.dataset.ds = "admin.master.bank.form";

  const intro = document.createElement("section");
  intro.id = "admstbk_form_intro_section";
  intro.className = "rounded-[1.5rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(250,244,237,0.94),rgba(234,244,249,0.82))] p-4";
  intro.append(
    textNode("p", "text-[10px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", mode === "edit" ? "Edit bank" : "Create bank"),
    textNode("p", "mt-1 text-xs font-semibold leading-6 text-gray-600", "Icon raster diproses menjadi PNG 96x96 px. SVG disimpan sebagai SVG fixed 96x96 yang tervalidasi."),
  );

  const fields = document.createElement("section");
  fields.id = "admstbk_form_fields_section";
  fields.className = "grid gap-4 md:grid-cols-2";

  const bankName = inputField("admstbk_bank_name_input", "bank_name", "Nama bank", draft.bank_name, "Contoh: BCA");
  const bankCode = inputField("admstbk_bank_code_input", "bank_code", "Kode bank", draft.bank_code, "Contoh: 014");
  const status = selectField("admstbk_bank_status_input", "status", "Status", draft.status, [
    ["active", "Aktif"],
    ["inactive", "Nonaktif"],
  ]);
  fields.append(bankName.wrap, bankCode.wrap, status.wrap);

  const iconSection = document.createElement("section");
  iconSection.id = "admstbk_icon_upload_section";
  iconSection.className = "grid gap-4 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-gray-50/80 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center";
  const preview = document.createElement("section");
  preview.id = "admstbk_icon_preview_section";
  preview.className = "grid h-24 w-24 place-items-center overflow-hidden rounded-[1.5rem] border border-[var(--pb-border)] bg-white text-[var(--pb-brand-secondary)] shadow-sm";
  renderPreview(preview, draft);
  const uploadCopy = document.createElement("section");
  uploadCopy.id = "admstbk_icon_upload_copy_section";
  uploadCopy.className = "grid min-w-0 gap-3";
  uploadCopy.append(
    textNode("p", "text-xs font-black text-gray-950", "Icon bank"),
    textNode("p", "text-xs leading-6 text-gray-500", "Upload JPG, PNG, WebP, atau SVG. Raster minimal 64x64 px, maksimal 2 MB."),
  );
  const fileInput = document.createElement("input");
  fileInput.id = "admstbk_icon_file_input";
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg,image/webp,image/svg+xml,.svg";
  fileInput.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-white px-3 py-2 text-xs font-semibold text-gray-700";
  const iconPathInput = hiddenField("admstbk_icon_path_input", "icon_path", draft.icon_path);
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0] ?? null;
    if (!file) {
      return;
    }
    const asset = await onUploadIcon?.(file);
    if (asset?.path) {
      draft.icon_path = asset.path;
      draft.icon_asset = asset;
      iconPathInput.value = asset.path;
      renderPreview(preview, draft);
    }
  });
  if (uploading) {
    uploadCopy.append(textNode("p", "text-xs font-semibold text-[var(--pb-brand-secondary)]", "Mengupload icon..."));
  }
  if (uploadError) {
    uploadCopy.append(textNode("p", "rounded-xl border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]", uploadError));
  }
  uploadCopy.append(fileInput);
  iconSection.append(preview, uploadCopy);

  const actions = document.createElement("section");
  actions.id = "admstbk_form_actions_section";
  actions.className = "flex shrink-0 flex-wrap items-center justify-end gap-2";
  const left = document.createElement("section");
  left.id = "admstbk_form_destructive_actions_section";
  const right = document.createElement("section");
  right.id = "admstbk_form_primary_actions_section";
  right.className = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";

  if (mode === "edit") {
    const remove = Button({ label: "Hapus", variant: "secondary", disabled: saving || uploading, onClick: () => onDelete?.(draft) });
    remove.id = "admstbk_delete_bank_form_button";
    remove.type = "button";
    remove.prepend(createIcon("trash", { className: "h-4 w-4" }));
    left.append(remove);
  }
  const cancel = Button({ label: "Batal", variant: "secondary", disabled: saving || uploading, onClick: onCancel });
  cancel.id = "admstbk_cancel_bank_button";
  cancel.type = "button";
  const submit = Button({ label: saving ? "Menyimpan..." : "Simpan Bank", disabled: saving || uploading });
  submit.id = "admstbk_save_bank_button";
  submit.type = "submit";
  // Tayang di header modal, jadi di luar <form>.
  submit.setAttribute("form", form.id);
  submit.prepend(createIcon("circleCheck", { className: "h-4 w-4" }));
  right.append(cancel, submit);
  actions.append(left, right);

  form.append(intro, fields, iconSection, iconPathInput);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const bankNameValue = String(formData.get("bank_name") ?? "").trim();
    onSubmit?.({
      ...draft,
      bank_name: bankNameValue,
      slug: slugify(bankNameValue),
      bank_code: String(formData.get("bank_code") ?? "").trim().toUpperCase(),
      icon_path: draft.icon_path || String(formData.get("icon_path") ?? "").trim(),
      icon_asset: draft.icon_asset ?? {},
      status: String(formData.get("status") ?? "active"),
    });
  });

  return titipkanAksiModal(form, actions);
}

function renderPreview(preview, bank) {
  preview.replaceChildren();
  if (bank.icon_path) {
    const image = document.createElement("img");
    image.id = "admstbk_icon_preview_image";
    image.src = bank.icon_path;
    image.alt = `${bank.bank_name || "Bank"} icon`;
    image.className = "h-full w-full object-contain p-2";
    preview.append(image);
    return;
  }
  preview.append(createIcon("bank", { className: "h-7 w-7" }));
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

function hiddenField(id, name, value) {
  const input = document.createElement("input");
  input.id = id;
  input.type = "hidden";
  input.name = name;
  input.value = value ?? "";
  return input;
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
