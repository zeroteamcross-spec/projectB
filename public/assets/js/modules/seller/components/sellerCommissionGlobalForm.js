import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { Input } from "../../../ui/primitives/input.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { SellerCommissionRuleStatusBadge } from "./sellerCommissionRuleStatusBadge.js";
import { sellerAffiliateCommissionService } from "../services/sellerAffiliateCommissionService.js";

export function SellerCommissionGlobalForm({
  rule = null,
  saving = false,
  error = "",
  onSubmit = null,
} = {}) {
  const draft = rule ?? sellerAffiliateCommissionService.emptyGlobalRule();
  const card = Card();
  card.classList.add("grid", "gap-4");

  const header = document.createElement("div");
  header.className = "grid gap-2";
  header.append(
    textBlock("text-sm font-semibold text-gray-500", "Aturan komisi umum"),
    textBlock("text-xl font-bold text-gray-950", "Atur komisi dasar seluruh mobil seller"),
    textBlock(`text-sm ${tw.text.muted}`, sellerAffiliateCommissionService.priorityCopy()),
  );

  const meta = document.createElement("div");
  meta.className = "flex flex-wrap items-center gap-2";
  meta.append(
    SellerCommissionRuleStatusBadge(draft.status ?? "inactive"),
    Badge(sellerAffiliateCommissionService.typeMeta(draft.commission_type)),
  );
  if (draft.created_at) {
    meta.append(textBlock("text-xs font-medium text-gray-500", `Dibuat ${formatDate(draft.created_at)}`));
  }
  header.append(meta);
  card.append(header);

  if (error) {
    const errorNode = document.createElement("div");
    errorNode.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-sm font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    errorNode.textContent = error;
    card.append(errorNode);
  }

  const form = document.createElement("form");
  form.className = "grid gap-4";

  const typeField = document.createElement("label");
  typeField.className = tw.form.label;
  typeField.append(document.createTextNode("Tipe komisi"));
  const typeSelect = document.createElement("select");
  typeSelect.id = "slrafc_global_commission_type_input";
  typeSelect.name = "commission_type";
  typeSelect.className = tw.form.control;
  [
    { value: "percent", label: "Persentase" },
    { value: "flat", label: "Nominal tetap" },
  ].forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    node.selected = (draft.commission_type ?? "percent") === option.value;
    typeSelect.append(node);
  });
  typeField.append(typeSelect);

  const valueField = Input({
    id: "slrafc_global_commission_value_input",
    name: "commission_value",
    label: "Nilai komisi",
    type: "text",
    value: formatCommissionInput(draft.commission_value ?? 0),
    placeholder: "Contoh: 5 atau 500000",
  });
  const valueInput = valueField.querySelector("input");
  valueInput?.setAttribute("inputmode", "decimal");
  valueInput?.addEventListener("blur", () => {
    valueInput.value = formatCommissionInput(parseCommissionValue(valueInput.value));
  });

  const valueHint = textBlock(`text-sm ${tw.text.muted}`, draft.commission_type === "percent"
    ? "Gunakan angka 0 sampai 100 untuk persen komisi."
    : "Gunakan nominal rupiah tetap yang berlaku untuk seluruh mobil seller.");

  typeSelect.addEventListener("change", () => {
    valueHint.textContent = typeSelect.value === "percent"
      ? "Gunakan angka 0 sampai 100 untuk persen komisi."
      : "Gunakan nominal rupiah tetap yang berlaku untuk seluruh mobil seller.";
  });

  const statusField = document.createElement("label");
  statusField.className = tw.form.label;
  statusField.append(document.createTextNode("Status aturan umum"));
  const statusSelect = document.createElement("select");
  statusSelect.id = "slrafc_global_status_input";
  statusSelect.name = "status";
  statusSelect.className = tw.form.control;
  [
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ].forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    node.selected = (draft.status ?? "active") === option.value;
    statusSelect.append(node);
  });
  statusField.append(statusSelect);

  form.append(typeField, valueField, valueHint, statusField);

  const actions = document.createElement("div");
  actions.className = "flex flex-col gap-2 sm:flex-row";
  const submitButton = Button({
    label: saving ? "Menyimpan..." : "Simpan aturan umum",
    disabled: saving,
    designHook: "shared.button.primary",
    onClick: () => form.requestSubmit(),
  });
  submitButton.id = "slrafc_global_submit_button";
  actions.append(submitButton);
  form.append(actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    onSubmit?.({
      commission_type: String(formData.get("commission_type") ?? "percent"),
      commission_value: parseCommissionValue(formData.get("commission_value")),
      status: String(formData.get("status") ?? "active"),
    });
  });

  card.append(form);
  return card;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}

function formatCommissionInput(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(number);
}

function parseCommissionValue(value) {
  const raw = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
  if (!raw) {
    return 0;
  }

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(raw)
      ? raw.replace(/\./g, "")
      : raw;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}
