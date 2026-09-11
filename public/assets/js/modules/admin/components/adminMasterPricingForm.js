import { Button } from "../../../ui/primitives/button.js";
import { titipkanAksiModal } from "../../../ui/composites/modalHeaderFormActions.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminMasterService } from "../services/adminMasterService.js";

export function AdminMasterPricingForm({
  plan = null,
  mode = "create",
  saving = false,
  onSubmit = null,
  onDelete = null,
  onCancel = null,
} = {}) {
  const draft = plan ? { ...plan } : adminMasterService.createEmptyPlan();
  const form = document.createElement("form");
  form.id = "admstpr_plan_form_section";
  form.className = "grid gap-5";
  form.dataset.ds = "admin.master.pricing.form";

  const intro = document.createElement("section");
  intro.id = "admstpr_form_intro_section";
  intro.className = "rounded-[1.5rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(250,244,237,0.94),rgba(234,244,249,0.82))] p-4";
  intro.append(
    textNode("p", "text-[10px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", mode === "edit" ? "Edit paket harga" : "Buat paket harga"),
    textNode("p", "mt-1 text-xs font-semibold leading-6 text-gray-600", "Paket ini tampil sebagai kartu pilihan harga saat showroom mendaftar."),
  );

  const fields = document.createElement("section");
  fields.id = "admstpr_form_fields_section";
  fields.className = "grid gap-4 md:grid-cols-2";

  const name = inputField("admstpr_plan_name_input", "name", "Nama paket", draft.name, "Contoh: Pro");
  const price = inputField("admstpr_plan_price_input", "price", "Harga (Rp)", draft.price || "", "Contoh: 1500000", "number");
  const billingPeriod = inputField("admstpr_plan_billing_period_input", "billing_period", "Periode tagihan", draft.billing_period, "Contoh: /bulan, /tahun, sekali bayar");
  const status = selectField("admstpr_plan_status_input", "status", "Status", draft.status, [
    ["active", "Aktif"],
    ["inactive", "Nonaktif"],
  ]);
  fields.append(name.wrap, price.wrap, billingPeriod.wrap, status.wrap);

  const recommendedWrap = document.createElement("label");
  recommendedWrap.className = "flex items-center gap-2 text-xs font-semibold text-gray-700";
  const recommended = document.createElement("input");
  recommended.id = "admstpr_plan_recommended_input";
  recommended.name = "is_recommended";
  recommended.type = "checkbox";
  recommended.checked = Boolean(draft.is_recommended);
  recommended.className = "h-4 w-4 rounded border-[var(--pb-form-border)]";
  recommendedWrap.append(recommended, document.createTextNode("Tandai sebagai \"Rekomendasi\""));

  const featuresWrap = document.createElement("label");
  featuresWrap.className = "grid gap-1 text-xs font-semibold text-gray-700";
  featuresWrap.textContent = "Daftar fitur (satu per baris)";
  const features = document.createElement("textarea");
  features.id = "admstpr_plan_features_input";
  features.name = "features";
  features.rows = 5;
  features.placeholder = "Contoh:\nListing mobil tanpa batas\nFitur Marketing/Affiliate\nDukungan prioritas";
  features.value = (draft.features ?? []).join("\n");
  features.className = "min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  featuresWrap.append(features);

  const actions = document.createElement("section");
  actions.id = "admstpr_form_actions_section";
  actions.className = "flex shrink-0 flex-wrap items-center justify-end gap-2";
  const left = document.createElement("section");
  left.id = "admstpr_form_destructive_actions_section";
  const right = document.createElement("section");
  right.id = "admstpr_form_primary_actions_section";
  right.className = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";

  if (mode === "edit") {
    const remove = Button({ label: "Hapus", variant: "secondary", disabled: saving, onClick: () => onDelete?.(draft) });
    remove.id = "admstpr_delete_plan_form_button";
    remove.type = "button";
    remove.prepend(createIcon("trash", { className: "h-4 w-4" }));
    left.append(remove);
  }
  const cancel = Button({ label: "Batal", variant: "secondary", disabled: saving, onClick: onCancel });
  cancel.id = "admstpr_cancel_plan_button";
  cancel.type = "button";
  const submit = Button({ label: saving ? "Menyimpan..." : "Simpan Paket", disabled: saving });
  submit.id = "admstpr_save_plan_button";
  submit.type = "submit";
  // Tayang di header modal, jadi di luar <form>.
  submit.setAttribute("form", form.id);
  submit.prepend(createIcon("circleCheck", { className: "h-4 w-4" }));
  right.append(cancel, submit);
  actions.append(left, right);

  form.append(intro, fields, recommendedWrap, featuresWrap);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const nameValue = String(formData.get("name") ?? "").trim();
    onSubmit?.({
      ...draft,
      name: nameValue,
      slug: slugify(nameValue),
      price: Math.max(0, Number(formData.get("price")) || 0),
      billing_period: String(formData.get("billing_period") ?? "").trim(),
      features: String(formData.get("features") ?? "").split("\n").map((line) => line.trim()).filter(Boolean),
      is_recommended: formData.get("is_recommended") === "on",
      status: String(formData.get("status") ?? "active"),
    });
  });

  return titipkanAksiModal(form, actions);
}

function inputField(id, name, label, value, placeholder, type = "text") {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1 text-xs font-semibold text-gray-700";
  wrap.textContent = label;
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = type;
  if (type === "number") {
    input.min = "0";
  }
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
