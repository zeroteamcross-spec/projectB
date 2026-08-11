import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { Input } from "../../../ui/primitives/input.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { SellerCommissionRuleStatusBadge } from "./sellerCommissionRuleStatusBadge.js";
import { sellerAffiliateCommissionService } from "../services/sellerAffiliateCommissionService.js";

export function SellerCommissionOverrideForm({
  rule = null,
  cars = [],
  mode = "create",
  saving = false,
  error = "",
  onSubmit = null,
  onCreateNew = null,
} = {}) {
  const card = Card();
  card.classList.add("grid", "min-w-0", "gap-4", "xl:sticky", "xl:top-6");

  if (mode === "edit" && !rule) {
    card.append(EmptyState({
      title: "Pilih aturan khusus",
      description: "Pilih salah satu aturan dari daftar untuk melihat detail dan memperbarui komisinya.",
    }));
    return card;
  }

  const draft = rule ?? sellerAffiliateCommissionService.emptyOverride();
  const header = document.createElement("div");
  header.className = "grid gap-2";
  header.append(
    textBlock("text-xs font-semibold text-gray-500", mode === "edit" ? "Detail aturan khusus" : "Aturan komisi per mobil"),
    textBlock("text-lg font-bold text-gray-950", mode === "edit"
      ? sellerAffiliateCommissionService.carLabel(rule?.car)
      : "Buat aturan untuk mobil tertentu"),
    textBlock(`text-xs ${tw.text.muted}`, "Gunakan aturan khusus jika mobil tertentu butuh komisi berbeda dari aturan umum showroom."),
  );

  if (mode === "edit" && rule) {
    const badges = document.createElement("div");
    badges.className = "flex flex-wrap items-center gap-2";
    badges.append(
      SellerCommissionRuleStatusBadge(rule.status),
      Badge(sellerAffiliateCommissionService.typeMeta(rule.commission_type)),
      textBlock("text-[10px] font-medium text-gray-500", `Diupdate ${formatDate(rule.updated_at || rule.created_at)}`),
    );
    header.append(badges);
  }

  card.append(header);

  if (error) {
    const errorNode = document.createElement("div");
    errorNode.className = tw.alert.error;
    errorNode.textContent = error;
    card.append(errorNode);
  }

  const form = document.createElement("form");
  form.className = "grid gap-4";

  const carField = document.createElement("label");
  carField.className = tw.form.label;
  carField.append(document.createTextNode("Mobil"));
  const carSelect = document.createElement("select");
  carSelect.name = "car_id";
  carSelect.className = tw.form.control;
  if (!cars.length) {
    const node = document.createElement("option");
    node.value = "";
    node.textContent = "Tidak ada mobil yang bisa dipilih";
    node.selected = true;
    carSelect.append(node);
  } else {
    cars.forEach((car) => {
      const node = document.createElement("option");
      node.value = String(car.id);
      node.textContent = sellerAffiliateCommissionService.carLabel(car);
      node.selected = Number(draft.car_id ?? draft.car?.id) === Number(car.id);
      carSelect.append(node);
    });
  }
  carField.append(carSelect);

  const typeField = document.createElement("label");
  typeField.className = tw.form.label;
  typeField.append(document.createTextNode("Tipe komisi"));
  const typeSelect = document.createElement("select");
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
    name: "commission_value",
    label: "Nilai komisi",
    type: "text",
    value: formatCommissionInput(draft.commission_value ?? 0),
    placeholder: "Contoh: 7.5 atau 750000",
  });
  const valueInput = valueField.querySelector("input");
  valueInput?.setAttribute("inputmode", "decimal");
  valueInput?.addEventListener("blur", () => {
    valueInput.value = formatCommissionInput(parseCommissionValue(valueInput.value));
  });

  const statusField = document.createElement("label");
  statusField.className = tw.form.label;
  statusField.append(document.createTextNode("Status aturan khusus"));
  const statusSelect = document.createElement("select");
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

  const hint = document.createElement("div");
  hint.className = tw.surface.inset;
  hint.append(textBlock(`text-xs ${tw.text.muted}`, "Jika aturan khusus nonaktif, perhitungan komisi akan kembali memakai aturan umum showroom bila aktif."));

  form.append(carField, typeField, valueField, statusField, hint);

  const actions = document.createElement("div");
  actions.className = "flex flex-col gap-2 sm:flex-row sm:flex-wrap";
  actions.append(Button({
    label: saving ? "Menyimpan..." : mode === "edit" ? "Simpan aturan" : "Buat aturan",
    disabled: saving || !cars.length,
    designHook: "shared.button.primary",
    onClick: () => form.requestSubmit(),
  }));

  if (mode === "edit") {
    actions.append(Button({
      label: "Aturan baru",
      variant: "secondary",
      disabled: saving,
      onClick: () => onCreateNew?.(),
    }));
  }

  form.append(actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    onSubmit?.({
      car_id: Number(formData.get("car_id") ?? 0),
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
