import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { Input } from "../../../ui/primitives/input.js";
import { Select } from "../../../ui/primitives/select.js";
import { Textarea } from "../../../ui/primitives/textarea.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";

const RESULT_OPTIONS = [
  { value: "good", label: "Baik" },
  { value: "fair", label: "Kurang baik" },
  { value: "bad", label: "Tidak baik" },
  { value: "not_available", label: "Tidak tersedia" },
];

export function SellerInspectionItemForm({
  mode = "create",
  item = null,
  templates = [],
  draft = null,
  saving = false,
  error = "",
  onSubmit = null,
  onCancel = null,
  onChange = null,
} = {}) {
  const values = draft ?? itemToForm(item);
  const form = document.createElement("form");
  form.className = "grid gap-4";

  const title = document.createElement("h2");
  title.className = tw.text.sectionTitle;
  title.textContent = mode === "edit" ? "Update inspection item" : "Tambah inspection item";

  const errorNode = document.createElement("p");
  errorNode.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  errorNode.textContent = error;
  errorNode.hidden = !error;

  const fields = document.createElement("div");
  fields.className = "grid gap-4 md:grid-cols-2";

  if (mode === "create") {
    fields.append(
      Select({ name: "template_id", label: "Template", value: String(values.template_id ?? ""), options: templateOptions(templates) }),
      Input({ name: "item_name", label: "Item custom", value: values.item_name ?? "", placeholder: "Dipakai bila template tidak dipilih" }),
      Input({ name: "category_name", label: "Kategori custom", value: values.category_name ?? "", placeholder: "general" })
    );
  } else {
    const itemName = document.createElement("p");
    itemName.className = "rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900";
    itemName.textContent = item?.item_name_snapshot ?? item?.template?.item_name ?? "Item inspeksi";
    const wrap = document.createElement("div");
    wrap.className = tw.form.label;
    wrap.append(document.createTextNode("Item"), itemName);
    fields.append(wrap);
  }

  fields.append(
    Select({ name: "result_status", label: "Hasil", value: values.result_status ?? "good", options: RESULT_OPTIONS }),
    Textarea({ name: "description", label: "Deskripsi", value: values.description ?? "", placeholder: "Kondisi objektif item" }),
    Textarea({ name: "notes", label: "Catatan", value: values.notes ?? "", placeholder: "Catatan tindakan atau perhatian" })
  );

  const actions = document.createElement("div");
  actions.className = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";
  const submit = Button({ label: saving ? "Menyimpan..." : mode === "edit" ? "Simpan item" : "Tambah item", disabled: saving });
  submit.type = "submit";
  actions.append(
    Button({ label: "Batal", variant: "secondary", disabled: saving, onClick: onCancel }),
    submit
  );

  form.append(title, errorNode, fields, actions);
  form.addEventListener("input", () => onChange?.(normalizePayload(new FormData(form), mode)));
  form.addEventListener("change", () => onChange?.(normalizePayload(new FormData(form), mode)));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.(normalizePayload(new FormData(form), mode));
  });

  return Card(form);
}

function templateOptions(templates) {
  return [
    { value: "", label: "Pilih template atau buat custom" },
    ...templates.map((template) => ({
      value: String(template.id),
      label: `${template.category_name} - ${template.item_name}`,
    })),
  ];
}

function itemToForm(item) {
  return {
    template_id: item?.template_id ? String(item.template_id) : "",
    item_name: item?.item_name_snapshot ?? "",
    category_name: item?.template?.category_name ?? "",
    result_status: item?.result_status ?? "good",
    description: item?.description ?? "",
    notes: item?.notes ?? "",
  };
}

function normalizePayload(formData, mode) {
  const templateId = textValue(formData, "template_id");
  const payload = {
    result_status: textValue(formData, "result_status") || "good",
    description: nullableText(formData, "description"),
    notes: nullableText(formData, "notes"),
  };

  if (mode === "create") {
    if (templateId) {
      payload.template_id = Number(templateId);
    } else {
      payload.category_name = nullableText(formData, "category_name") ?? "general";
      payload.item_name = textValue(formData, "item_name");
    }
  }

  return payload;
}

function textValue(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData, key) {
  const value = textValue(formData, key);
  return value === "" ? null : value;
}
