import { Button } from "../../../ui/primitives/button.js";
import { Input } from "../../../ui/primitives/input.js";
import { NumericInput } from "../../../ui/primitives/numericInput.js";
import { Select } from "../../../ui/primitives/select.js";
import { Textarea } from "../../../ui/primitives/textarea.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";

const TOTAL_STEPS = 3;

const STEP_META = [
  { step: 1, title: "Data Dasar", icon: "car", helper: "Identitas kendaraan dan warna utama." },
  { step: 2, title: "Spesifikasi Teknis", icon: "settings", helper: "Dokumen, mesin, kilometer, dan lokasi." },
  { step: 3, title: "Harga dan Deskripsi", icon: "transaction", helper: "Harga, stok, deskripsi, dan status listing." },
];

const REQUIRED_FIELDS = {
  1: ["license_plate_number", "brand_name", "model_name"],
  2: ["registration_date", "engine_number", "chassis_number"],
  3: ["price_cash"],
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

const TRANSMISSION_OPTIONS = [
  { value: "", label: "Pilih transmisi" },
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Otomatis" },
  { value: "cvt", label: "CVT" },
];

const SEAT_OPTIONS = [
  { value: "", label: "Pilih jumlah kursi" },
  { value: "2", label: "2 Kursi" },
  { value: "4", label: "4 Kursi" },
  { value: "5", label: "5 Kursi" },
  { value: "7", label: "7 Kursi" },
  { value: "8", label: "8 Kursi" },
];

const SERVICE_BOOK_OPTIONS = [
  { value: "", label: "Pilih status" },
  { value: "1", label: "Ada" },
  { value: "0", label: "Tidak ada / hilang" },
];

const INSPECTION_STATUS_OPTIONS = [
  { value: "not_checked", label: "Belum inspeksi" },
  { value: "partial", label: "Inspeksi sebagian" },
  { value: "completed", label: "Inspeksi selesai" },
];

function setElementVisibility(element, visible) {
  if (!element) return;
  element.hidden = !visible;
  element.style.display = visible ? "" : "none";
  element.setAttribute("aria-hidden", visible ? "false" : "true");
}

export function SellerCarForm({
  car = null,
  draft = null,
  saving = false,
  error = "",
  brandOptions = [],
  step = 1,
  onStepChange = null,
  onSubmit = null,
  onCancel = null,
  onChange = null,
} = {}) {
  const values = draft ?? car ?? {};
  const currentStep = clampStep(step);
  const brands = normalizeBrandOptions(brandOptions);
  const brandField = createBrandSelect({ brands, value: values.brand_name ?? "" });
  const modelField = createModelSelect({ brand: brandField.selectedBrand, value: values.model_name ?? "" });
  const documentToggle = createDocumentTypeToggle(values.document_type ?? "new");
  const form = document.createElement("form");
  form.id = "slrc_car_form_section";
  form.className = "grid min-w-0 gap-5 rounded-[2rem] border border-white/80 bg-white/88 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.09)] backdrop-blur-xl transition duration-150 sm:p-5";
  form.dataset.ds = "seller.cars.form";

  const header = formHeader(car);
  const stepper = createStepper(currentStep);

  const errorNode = document.createElement("p");
  errorNode.id = "slrc_car_form_error_section";
  errorNode.className = "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700";
  errorNode.textContent = error;
  errorNode.hidden = !error;

  const validationNode = document.createElement("p");
  validationNode.id = "slrc_car_form_validation_section";
  validationNode.className = "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800";
  validationNode.hidden = true;

  const step1 = createStepPanel(1, currentStep);
  const identity = fieldGroup("slrc_car_step_1_identity_fields_section", "Data Dasar Mobil", "car");
  identity.body.append(
    documentToggle.section,
    Input({ id: "slrc_license_plate_number_input", name: "license_plate_number", label: "Nomor Polisi", value: values.license_plate_number ?? "", placeholder: "B 1234 ABC" }),
    brandField.field,
    modelField.field,
    Input({ id: "slrc_sub_model_name_input", name: "sub_model_name", label: "Sub model", value: values.sub_model_name ?? "", placeholder: "1.5 G MT" }),
    Input({ id: "slrc_primary_color_input", name: "primary_color", label: "Warna", value: values.primary_color ?? "", placeholder: "Putih" }),
    Select({ id: "slrc_secondary_color_input", name: "secondary_color", label: "Warna dasar", value: values.secondary_color ?? "", options: colorOptions() }),
    Input({ id: "slrc_color_variation_input", name: "color_variation", label: "Variasi warna", value: values.color_variation ?? "", placeholder: "Metalik" })
  );
  step1.append(identity.section);

  const step2 = createStepPanel(2, currentStep);
  const technical = fieldGroup("slrc_car_step_2_technical_fields_section", "Spesifikasi Teknis", "settings");
  technical.body.append(
    Input({ id: "slrc_registration_date_input", name: "registration_date", label: "Tanggal registrasi", type: "date", value: values.registration_date ?? "" }),
    Input({ id: "slrc_engine_number_input", name: "engine_number", label: "Nomor mesin", value: values.engine_number ?? "", placeholder: "Nomor mesin" }),
    Input({ id: "slrc_chassis_number_input", name: "chassis_number", label: "Nomor rangka", value: values.chassis_number ?? "", placeholder: "Nomor rangka" }),
    NumericInput({ id: "slrc_engine_capacity_cc_input", name: "engine_capacity_cc", label: "Kapasitas mesin (cc)", value: values.engine_capacity_cc ?? "", placeholder: "1500" }),
    NumericInput({ id: "slrc_mileage_km_input", name: "mileage_km", label: "Jarak tempuh (km)", value: values.mileage_km ?? "", placeholder: "15000" }),
    Select({ id: "slrc_seat_count_input", name: "seat_count", label: "Jumlah kursi", value: values.seat_count ?? "", options: SEAT_OPTIONS }),
    NumericInput({ id: "slrc_previous_owner_count_input", name: "previous_owner_count", label: "Jumlah pemilik sebelum", value: values.previous_owner_count ?? "", placeholder: "1" }),
    Select({ id: "slrc_has_service_book_input", name: "has_service_book", label: "Buku servis", value: serviceBookValue(values.has_service_book), options: SERVICE_BOOK_OPTIONS }),
    NumericInput({ id: "slrc_key_count_input", name: "key_count", label: "Jumlah kunci", value: values.key_count ?? "", placeholder: "2" }),
    Select({ id: "slrc_transmission_input", name: "transmission", label: "Transmisi", value: values.transmission ?? "", options: TRANSMISSION_OPTIONS }),
    Input({ id: "slrc_location_name_input", name: "location_name", label: "Lokasi", value: values.location_name ?? "", placeholder: "Jakarta Selatan" })
  );
  step2.append(technical.section);

  const step3 = createStepPanel(3, currentStep);
  const commercial = fieldGroup("slrc_car_step_3_commercial_fields_section", "Harga dan Deskripsi", "transaction");
  const descriptionField = Textarea({ id: "slrc_description_input", name: "description", label: "Deskripsi", value: values.description ?? "", placeholder: "Deskripsikan kondisi dan fitur mobil" });
  descriptionField.className = `${descriptionField.className} lg:col-span-2`;
  commercial.body.append(
    NumericInput({ id: "slrc_price_cash_input", name: "price_cash", label: "Harga cash", value: values.price_cash ?? "", placeholder: "250000000" }),
    NumericInput({ id: "slrc_price_discount_input", name: "price_discount", label: "Harga diskon", value: values.price_discount ?? "", placeholder: "240000000" }),
    NumericInput({ id: "slrc_price_credit_input", name: "price_credit", label: "Harga kredit", value: values.price_credit ?? "", placeholder: "260000000" }),
    NumericInput({ id: "slrc_stock_input", name: "stock", label: "Stok", value: values.stock ?? 1, placeholder: "1" }),
    Select({ id: "slrc_listing_status_input", name: "listing_status", label: "Status listing", value: values.listing_status ?? "draft", options: STATUS_OPTIONS }),
    Select({ id: "slrc_inspection_summary_status_input", name: "inspection_summary_status", label: "Status inspeksi", value: values.inspection_summary_status ?? "not_checked", options: INSPECTION_STATUS_OPTIONS }),
    Input({ id: "slrc_youtube_url_input", name: "youtube_url", label: "URL YouTube", value: values.youtube_url ?? "", type: "url", placeholder: "https://www.youtube.com/watch?v=..." }),
    descriptionField
  );
  step3.append(commercial.section);

  const navigation = createNavigation({
    currentStep,
    saving,
    onCancel,
    onPrevious: () => moveStep(form, currentStep - 1, onStepChange, onChange, validationNode),
    onNext: () => moveStep(form, currentStep + 1, onStepChange, onChange, validationNode),
  });

  form.append(header, stepper, errorNode, validationNode, step1, step2, step3, navigation);

  brandField.select.addEventListener("change", () => {
    const selectedBrand = findBrandByValue(brands, brandField.select.value);
    syncModelSelect(modelField.select, selectedBrand, "");
  });
  form.addEventListener("input", () => onChange?.(normalizeCarPayload(new FormData(form))));
  form.addEventListener("change", () => onChange?.(normalizeCarPayload(new FormData(form))));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalidStep = firstInvalidStep(form);
    if (invalidStep) {
      showValidation(validationNode, invalidStep.message);
      onStepChange?.(invalidStep.step);
      return;
    }
    onSubmit?.(normalizeCarPayload(new FormData(form)));
  });

  return form;
}

function formHeader(car) {
  const header = document.createElement("section");
  header.id = "slrc_car_form_header_section";
  header.className = "grid gap-3 border-b border-gray-100 pb-4 sm:flex sm:items-start sm:justify-between";

  const copyWrap = document.createElement("section");
  copyWrap.id = "slrc_car_form_header_copy_section";
  copyWrap.className = "flex min-w-0 items-start gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f97316,#14b8a6)] text-white shadow-[0_14px_34px_rgba(249,115,22,0.18)]";
  icon.append(createIcon("car", { className: "h-5 w-5" }));

  const copy = document.createElement("section");
  copy.id = "slrc_car_form_header_text_section";
  copy.className = "grid min-w-0 gap-1";
  const title = document.createElement("h2");
  title.className = tw.text.sectionTitle;
  title.textContent = car?.id ? "Edit mobil" : "Tambah mobil";
  const helper = document.createElement("p");
  helper.className = `text-sm leading-6 ${tw.text.muted}`;
  helper.textContent = "Flow bertahap: data dasar, spesifikasi, lalu harga dan publikasi.";
  copy.append(title, helper);
  copyWrap.append(icon, copy);

  const badge = document.createElement("section");
  badge.id = "slrc_car_form_progress_summary_section";
  badge.className = "rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-orange-700";
  badge.textContent = "3 step";
  header.append(copyWrap, badge);
  return header;
}

function createStepper(currentStep) {
  const section = document.createElement("section");
  section.id = "slrc_car_form_stepper_section";
  section.className = "grid gap-3";

  const top = document.createElement("section");
  top.id = "slrc_car_form_stepper_summary_section";
  top.className = "flex items-center justify-between gap-3";
  top.append(
    textNode("span", "text-sm font-black text-orange-700", `Step ${currentStep} dari ${TOTAL_STEPS}`),
    textNode("span", "text-sm font-semibold text-gray-500", STEP_META[currentStep - 1]?.title ?? "")
  );

  const progressTrack = document.createElement("section");
  progressTrack.id = "slrc_car_form_stepper_progress_section";
  progressTrack.className = "h-2 overflow-hidden rounded-full bg-gray-100";
  const progress = document.createElement("section");
  progress.id = "slrc_car_form_stepper_progress_fill_section";
  progress.className = "h-full rounded-full bg-[linear-gradient(90deg,#f97316,#14b8a6)] transition-all duration-200";
  progress.style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;
  progressTrack.append(progress);

  const items = document.createElement("section");
  items.id = "slrc_car_form_stepper_items_section";
  items.className = "grid gap-2 sm:grid-cols-3";
  STEP_META.forEach((item) => {
    const active = item.step === currentStep;
    const done = item.step < currentStep;
    const card = document.createElement("section");
    card.id = `slrc_car_form_stepper_item_${item.step}_section`;
    card.className = [
      "grid gap-1 rounded-2xl border p-3 transition duration-150",
      active ? "border-orange-200 bg-orange-50 text-orange-800 shadow-sm" : "border-gray-100 bg-white text-gray-600",
      done ? "border-teal-200 bg-teal-50 text-teal-700" : "",
    ].join(" ");
    const line = document.createElement("section");
    line.id = `slrc_car_form_stepper_item_${item.step}_line_section`;
    line.className = "flex items-center gap-2";
    const dot = document.createElement("span");
    dot.className = "grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-black shadow-sm";
    dot.textContent = done ? "OK" : String(item.step);
    line.append(dot, textNode("span", "text-sm font-black", item.title));
    card.append(line, textNode("p", "text-xs font-semibold opacity-75", item.helper));
    items.append(card);
  });

  section.append(top, progressTrack, items);
  return section;
}

function createStepPanel(step, currentStep) {
  const section = document.createElement("section");
  section.id = `slrc_car_form_step_${step}_section`;
  section.dataset.carStepPanel = String(step);
  section.className = "grid min-w-0 gap-4 transition duration-150";
  setElementVisibility(section, step === currentStep);
  return section;
}

function createNavigation({ currentStep, saving, onCancel, onPrevious, onNext }) {
  const section = document.createElement("section");
  section.id = "slrc_car_form_navigation_section";
  section.className = "flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between";

  const cancel = Button({ label: "Batal", variant: "secondary", disabled: saving, onClick: onCancel });
  cancel.id = "slrc_cancel_car_button";
  cancel.type = "button";

  const actions = document.createElement("section");
  actions.id = "slrc_car_form_navigation_actions_section";
  actions.className = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";

  const back = Button({ label: "Kembali", variant: "secondary", disabled: saving || currentStep === 1, onClick: onPrevious });
  back.id = "slrc_car_form_back_button";
  back.type = "button";
  setElementVisibility(back, currentStep !== 1);
  back.prepend(createIcon("arrowLeft", { className: "h-4 w-4" }));

  const next = Button({ label: "Lanjut", disabled: saving, onClick: onNext });
  next.id = "slrc_car_form_next_button";
  next.type = "button";
  setElementVisibility(next, currentStep !== TOTAL_STEPS);
  next.append(createIcon("arrowRight", { className: "h-4 w-4" }));

  const submit = Button({ label: saving ? "Menyimpan..." : "Simpan mobil", disabled: saving });
  submit.id = "slrc_car_form_submit_button";
  submit.type = "submit";
  setElementVisibility(submit, currentStep === TOTAL_STEPS);
  submit.prepend(createIcon("circleCheck", { className: "h-4 w-4" }));

  actions.append(back, next, submit);
  section.append(cancel, actions);
  return section;
}

function moveStep(form, nextStep, onStepChange, onChange, validationNode) {
  const currentStep = Number(form.querySelector("[data-car-step-panel]:not([hidden])")?.dataset?.carStepPanel ?? 1);
  if (nextStep > currentStep) {
    const result = validateStep(form, currentStep);
    if (!result.valid) {
      showValidation(validationNode, result.message);
      return;
    }
  }
  validationNode.hidden = true;
  onChange?.(normalizeCarPayload(new FormData(form)));
  onStepChange?.(clampStep(nextStep));
}

function firstInvalidStep(form) {
  for (let step = 1; step <= TOTAL_STEPS; step += 1) {
    const result = validateStep(form, step);
    if (!result.valid) {
      return { step, message: result.message };
    }
  }
  return null;
}

function validateStep(form, step) {
  const data = new FormData(form);
  const missing = (REQUIRED_FIELDS[step] ?? []).find((name) => !String(data.get(name) ?? "").trim());
  if (!missing) {
    return { valid: true, message: "" };
  }
  const field = form.elements.namedItem(missing);
  const focusTarget = field?.dataset?.numericVisibleId
    ? form.querySelector(`[id="${field.dataset.numericVisibleId}"]`)
    : field;
  const label = fieldLabel(focusTarget, missing);
  focusTarget?.focus?.();
  return { valid: false, message: `Lengkapi ${label} sebelum lanjut.` };
}

function fieldLabel(field, fallback) {
  const label = field?.closest("label");
  const spanText = label?.querySelector("span")?.textContent?.trim();
  if (spanText) {
    return spanText;
  }

  const text = Array.from(label?.childNodes ?? [])
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim())
    .find(Boolean);

  return text || fallback;
}

function showValidation(node, message) {
  node.textContent = message;
  node.hidden = false;
}

function createDocumentTypeToggle(value = "new") {
  const section = document.createElement("section");
  section.id = "slrc_document_type_toggle_section";
  section.className = "grid min-w-0 gap-2 rounded-[1rem] border border-gray-100 bg-white/80 p-3";

  const label = textNode("p", "text-sm font-bold text-gray-700", "Jenis mobil");
  const input = document.createElement("input");
  input.id = "slrc_document_type_input";
  input.name = "document_type";
  input.type = "hidden";
  input.value = value === "old" ? "old" : "new";

  const buttons = document.createElement("section");
  buttons.id = "slrc_document_type_actions_section";
  buttons.className = "grid grid-cols-2 gap-2";
  const newButton = documentTypeButton("slrc_document_type_new_button", "Mobil Baru", "new", input);
  const oldButton = documentTypeButton("slrc_document_type_old_button", "Mobil Lama", "old", input);
  buttons.append(newButton, oldButton);

  const sync = () => {
    [newButton, oldButton].forEach((button) => {
      const active = button.dataset.value === input.value;
      button.className = [
        "min-h-11 rounded-[1rem] border px-3 py-2 text-sm font-black transition duration-150",
        active ? "border-orange-200 bg-orange-50 text-orange-700 shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
      ].join(" ");
    });
  };
  newButton.addEventListener("click", () => {
    input.value = "new";
    sync();
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  oldButton.addEventListener("click", () => {
    input.value = "old";
    sync();
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  sync();

  section.append(label, input, buttons);
  return { section, input };
}

function documentTypeButton(id, label, value) {
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.dataset.value = value;
  button.textContent = label;
  return button;
}

function createBrandSelect({ brands = [], value = "" } = {}) {
  const selectedBrand = findBrandByValue(brands, value);
  const selectedValue = selectedBrand?.name ?? String(value ?? "").trim();
  const select = createNativeSelect({
    id: "slrc_brand_name_input",
    name: "brand_name",
    label: "Merek Mobil",
    helper: brands.length ? "Data diambil dari Master Brand." : "Master Brand belum tersedia.",
  });
  select.append(createOption("", brands.length ? "Pilih merek" : "Brand belum tersedia", !selectedValue));
  brands.forEach((brand) => {
    select.append(createOption(brand.name, brand.name, brand.name === selectedValue));
  });
  if (selectedValue && !brands.some((brand) => brand.name === selectedValue)) {
    select.append(createOption(selectedValue, `${selectedValue} (data lama)`, true));
  }
  return {
    field: select.closest("label"),
    select,
    selectedBrand,
  };
}

function createModelSelect({ brand = null, value = "" } = {}) {
  const selectedModel = findModelByValue(brand, value);
  const selectedValue = selectedModel?.name ?? String(value ?? "").trim();
  const select = createNativeSelect({
    id: "slrc_model_name_input",
    name: "model_name",
    label: "Model",
    helper: brand ? "Model mengikuti merek yang dipilih." : "Pilih merek terlebih dahulu.",
  });
  syncModelSelect(select, brand, selectedValue);
  return {
    field: select.closest("label"),
    select,
  };
}

function syncModelSelect(select, brand, selectedValue = "") {
  const models = activeModels(brand);
  const selectedModel = findModelByValue(brand, selectedValue);
  const nextValue = selectedModel?.name ?? String(selectedValue ?? "").trim();
  select.replaceChildren();
  select.append(createOption("", brand ? "Pilih model" : "Pilih merek dulu", !nextValue));
  models.forEach((model) => {
    select.append(createOption(model.name, model.name, model.name === nextValue));
  });
  if (nextValue && !models.some((model) => model.name === nextValue)) {
    select.append(createOption(nextValue, `${nextValue} (data lama)`, true));
  }
}

function createNativeSelect({ id, name, label, helper }) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const select = document.createElement("select");
  select.id = id;
  select.name = name;
  select.className = fieldClass();
  const helperNode = document.createElement("span");
  helperNode.className = "text-xs font-semibold text-gray-500";
  helperNode.textContent = helper;
  wrap.append(labelNode, select, helperNode);
  return select;
}

function fieldGroup(id, title, iconName) {
  const section = document.createElement("section");
  section.id = id;
  section.className = "grid gap-4 rounded-[1.5rem] border border-gray-100 bg-[linear-gradient(135deg,rgba(249,250,251,0.96),rgba(255,255,255,0.92))] p-4 shadow-sm transition duration-150 hover:border-orange-100";

  const header = document.createElement("section");
  header.id = `${id}_header`;
  header.className = "flex min-w-0 items-center gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600";
  icon.append(createIcon(iconName, { className: "h-4 w-4" }));
  const label = document.createElement("h3");
  label.className = "text-sm font-black text-gray-950";
  label.textContent = title;
  header.append(icon, label);

  const body = document.createElement("section");
  body.id = `${id}_body`;
  body.className = "grid min-w-0 gap-4 lg:grid-cols-2";
  section.append(header, body);
  return { section, body };
}

function normalizeCarPayload(formData) {
  return {
    brand_name: textValue(formData, "brand_name"),
    model_name: textValue(formData, "model_name"),
    license_plate_number: nullableText(formData, "license_plate_number"),
    sub_model_name: nullableText(formData, "sub_model_name"),
    primary_color: nullableText(formData, "primary_color"),
    secondary_color: nullableText(formData, "secondary_color"),
    color_variation: nullableText(formData, "color_variation"),
    document_type: textValue(formData, "document_type") || "new",
    registration_date: nullableText(formData, "registration_date"),
    engine_number: nullableText(formData, "engine_number"),
    chassis_number: nullableText(formData, "chassis_number"),
    engine_capacity_cc: numberValue(formData, "engine_capacity_cc"),
    mileage_km: numberValue(formData, "mileage_km"),
    seat_count: numberValue(formData, "seat_count"),
    previous_owner_count: numberValue(formData, "previous_owner_count"),
    has_service_book: booleanValue(formData, "has_service_book"),
    key_count: numberValue(formData, "key_count"),
    transmission: nullableText(formData, "transmission"),
    location_name: nullableText(formData, "location_name"),
    stock: numberValue(formData, "stock") ?? 1,
    price_cash: numberValue(formData, "price_cash"),
    price_discount: numberValue(formData, "price_discount"),
    price_credit: numberValue(formData, "price_credit"),
    listing_status: textValue(formData, "listing_status") || "draft",
    inspection_summary_status: textValue(formData, "inspection_summary_status") || "not_checked",
    youtube_url: nullableText(formData, "youtube_url"),
    description: nullableText(formData, "description"),
  };
}

function colorOptions() {
  return [
    { value: "", label: "Pilih warna dasar" },
    { value: "putih", label: "Putih" },
    { value: "hitam", label: "Hitam" },
    { value: "silver", label: "Silver" },
    { value: "abu-abu", label: "Abu-abu" },
    { value: "merah", label: "Merah" },
    { value: "biru", label: "Biru" },
    { value: "coklat", label: "Coklat" },
    { value: "hijau", label: "Hijau" },
    { value: "kuning", label: "Kuning" },
  ];
}

function serviceBookValue(value) {
  if (value === true || value === 1 || value === "1") {
    return "1";
  }
  if (value === false || value === 0 || value === "0") {
    return "0";
  }
  return "";
}

function createOption(value, label, selected = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  return option;
}

function normalizeBrandOptions(brands = []) {
  return (Array.isArray(brands) ? brands : [])
    .filter((brand) => brand?.status !== "inactive" && String(brand?.name ?? "").trim())
    .map((brand) => ({
      ...brand,
      name: String(brand.name ?? "").trim(),
      slug: String(brand.slug ?? "").trim(),
      id: String(brand.id ?? "").trim(),
      models: activeModels(brand),
    }));
}

function activeModels(brand) {
  return (Array.isArray(brand?.models) ? brand.models : [])
    .filter((model) => model?.status !== "inactive" && String(model?.name ?? "").trim())
    .map((model) => ({
      ...model,
      name: String(model.name ?? "").trim(),
      slug: String(model.slug ?? "").trim(),
      id: String(model.id ?? "").trim(),
    }));
}

function findBrandByValue(brands = [], value = "") {
  const needle = normalizeLookup(value);
  if (!needle) {
    return null;
  }
  return brands.find((brand) => [brand.name, brand.slug, brand.id].some((candidate) => normalizeLookup(candidate) === needle)) ?? null;
}

function findModelByValue(brand, value = "") {
  const needle = normalizeLookup(value);
  if (!needle) {
    return null;
  }
  return activeModels(brand).find((model) => [model.name, model.slug, model.id].some((candidate) => normalizeLookup(candidate) === needle)) ?? null;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}

function fieldClass() {
  return "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function clampStep(step) {
  const value = Number(step);
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.min(TOTAL_STEPS, value));
}

function normalizeLookup(value) {
  return String(value ?? "").trim().toLowerCase();
}

function textValue(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData, key) {
  const value = textValue(formData, key);
  return value === "" ? null : Number(value);
}

function booleanValue(formData, key) {
  const value = textValue(formData, key);
  if (value === "") {
    return null;
  }
  return value === "1" || value === "true";
}

function nullableText(formData, key) {
  const value = textValue(formData, key);
  return value === "" ? null : value;
}
