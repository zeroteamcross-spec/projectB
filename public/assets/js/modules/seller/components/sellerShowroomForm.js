import { Button } from "../../../ui/primitives/button.js";
import { SearchableSelect } from "../../../ui/primitives/searchableSelect.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function SellerShowroomForm({ showroom = null, saving = false, error = "", bankOptions = [], cityOptions = [], uploading = false, onUploadIcon = null, onSubmit = null } = {}) {
  const form = document.createElement("form");
  form.id = "slrsr_form_section";
  form.className = "grid gap-5 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white p-4 shadow-sm transition duration-150 sm:p-5";
  form.dataset.ds = "seller.showroom.form";

  const header = document.createElement("section");
  header.id = "slrsr_form_header_section";
  header.className = "grid gap-2 border-b border-[var(--pb-card-border)] pb-5";
  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = showroom ? "Edit showroom" : "Setup showroom";
  const title = document.createElement("h2");
  title.className = tw.text.sectionTitle;
  title.textContent = showroom ? "Edit showroom" : "Buat showroom";

  const helper = document.createElement("p");
  helper.className = `max-w-2xl text-xs leading-6 ${tw.text.muted}`;
  helper.textContent = "Isi data utama showroom dan rekening showroom untuk kebutuhan transaksi.";
  header.append(eyebrow, title, helper);

  const errorNode = document.createElement("p");
  errorNode.id = "slrsr_error_section";
  errorNode.className = "rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  errorNode.textContent = error;
  errorNode.hidden = !error;

  const profileSection = fieldGroup("slrsr_profile_fields_section", "Profil showroom", "showroom");
  profileSection.body.append(
    inputField({ id: "slrsr_name_input", name: "name", label: "Nama showroom", value: showroom?.name ?? "", placeholder: "Contoh: ProjectB Auto" }),
    SearchableSelect({
      id: "slrsr_city_name_input",
      name: "city_name",
      label: "Kota",
      value: showroom?.city_name ?? "",
      options: cityOptionsList(cityOptions, showroom?.city_name),
      helper: cityOptions.length ? "Ketik untuk mencari kota." : "Master Lokasi belum tersedia.",
      emptyLabel: "Kota tidak ditemukan",
      labelClass: "grid min-w-0 gap-1.5 text-xs font-bold text-gray-700",
      controlClass: "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-[var(--pb-text-muted)] focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]",
    }),
    textareaField({ id: "slrsr_address_input", name: "address", label: "Alamat", value: showroom?.address ?? "", placeholder: "Alamat lengkap showroom" })
  );

  const brandingSection = fieldGroup("slrsr_branding_fields_section", "Branding showroom", "brandMark");
  const iconUrlInput = document.createElement("input");
  iconUrlInput.type = "hidden";
  iconUrlInput.id = "slrsr_icon_url_input";
  iconUrlInput.name = "icon_url";
  iconUrlInput.value = showroom?.icon_url ?? "";
  const iconPreview = document.createElement("section");
  iconPreview.id = "slrsr_icon_preview_section";
  iconPreview.className = "grid h-20 w-20 place-items-center overflow-hidden rounded-[1.25rem] border border-[var(--pb-card-border)] bg-white shadow-[var(--pb-shadow-soft)]";
  renderIconPreview(iconPreview, iconUrlInput.value);
  const iconFile = document.createElement("input");
  iconFile.type = "file";
  iconFile.id = "slrsr_icon_file_input";
  iconFile.accept = "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg";
  iconFile.className = "sr-only";
  iconFile.addEventListener("change", () => {
    const nextFile = iconFile.files?.[0] ?? null;
    if (nextFile) onUploadIcon?.(nextFile, iconUrlInput, iconPreview);
  });
  brandingSection.body.append(
    uploadDropzone({ input: iconFile, preview: iconPreview, uploading, onFile: (nextFile) => onUploadIcon?.(nextFile, iconUrlInput, iconPreview) }),
    iconUrlInput,
    inputField({ id: "slrsr_tab_title_input", name: "tab_title", label: "Judul tab browser", value: showroom?.tab_title ?? "", placeholder: "Contoh: Metro Auto Jakarta - Jual Beli Mobil" })
  );

  const contactSection = fieldGroup("slrsr_contact_fields_section", "Kontak operasional", "phone");
  contactSection.body.append(
    inputField({ id: "slrsr_phone_number_input", name: "phone_number", label: "Nomor telepon", value: showroom?.phone_number ?? "", placeholder: "Contoh: 081234567890" })
  );

  const bankSection = fieldGroup("slrsr_bank_fields_section", "Rekening pembayaran", "bank");
  bankSection.body.className = "grid min-w-0 gap-4";
  bankSection.body.append(
    bankSelectField({ id: "slrsr_bank_type_input", name: "bank_type", label: "Bank type", value: showroom?.bank_type ?? "", banks: bankOptions }),
    inputField({ id: "slrsr_bank_account_number_input", name: "bank_account_number", label: "Bank account number", value: showroom?.bank_account_number ?? "", placeholder: "Nomor rekening" }),
    inputField({ id: "slrsr_bank_account_name_input", name: "bank_account_name", label: "Bank account name", value: showroom?.bank_account_name ?? "", placeholder: "Nama pemilik rekening" })
  );

  // Batal/Simpan showroom live in the modal header (see showroomPage.js),
  // not here, so they stay visible without scrolling this form's length.
  form.append(header, errorNode, profileSection.section, brandingSection.section, contactSection.section, bankSection.section);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    onSubmit?.({
      name: String(formData.get("name") ?? "").trim(),
      city_name: String(formData.get("city_name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      phone_number: String(formData.get("phone_number") ?? "").trim(),
      bank_account_number: String(formData.get("bank_account_number") ?? "").trim(),
      bank_type: String(formData.get("bank_type") ?? "").trim(),
      bank_account_name: String(formData.get("bank_account_name") ?? "").trim(),
      icon_url: String(formData.get("icon_url") ?? "").trim(),
      tab_title: String(formData.get("tab_title") ?? "").trim(),
    });
  });

  return form;
}

function fieldGroup(id, title, iconName) {
  const section = document.createElement("section");
  section.id = id;
  section.className = "grid min-w-0 gap-4 rounded-[1.25rem] border border-[var(--pb-card-border)] bg-[linear-gradient(135deg,rgba(249,250,251,0.95),rgba(255,255,255,0.9))] p-4 shadow-sm transition duration-150 hover:border-[var(--pb-border)]";

  const header = document.createElement("section");
  header.id = `${id}_header`;
  header.className = "flex items-center gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[var(--pb-surface-muted)] text-[var(--pb-brand-secondary)]";
  icon.append(createIcon(iconName, { className: "h-4 w-4" }));
  const label = document.createElement("h3");
  label.className = "text-xs font-black text-gray-950";
  label.textContent = title;
  header.append(icon, label);

  const body = document.createElement("section");
  body.id = `${id}_body`;
  body.className = "grid min-w-0 gap-4";
  section.append(header, body);
  return { section, body };
}

function inputField({ id, name, label, value = "", placeholder = "" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1.5 text-xs font-bold text-gray-700";
  wrap.textContent = label;
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-[var(--pb-text-muted)] focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  wrap.append(input);
  return wrap;
}

function bankSelectField({ id, name, label, value = "", banks = [] }) {
  const normalizedBanks = banks.filter((bank) => bank?.status !== "inactive");
  let selectedBank = findSelectedBank(normalizedBanks, value);

  const wrap = document.createElement("section");
  wrap.id = "slrsr_bank_type_field_section";
  wrap.className = "relative grid min-w-0 gap-1.5 text-xs font-bold text-gray-700";

  const labelNode = document.createElement("label");
  labelNode.htmlFor = id;
  labelNode.textContent = label;

  const input = document.createElement("input");
  input.id = id;
  input.type = "hidden";
  input.name = name;
  input.value = selectedBank?.slug ?? "";

  const button = document.createElement("button");
  button.id = "slrsr_bank_type_button";
  button.type = "button";
  button.className = "flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-left text-xs font-semibold text-[var(--pb-text)] outline-none transition duration-150 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";

  const menu = document.createElement("section");
  menu.id = "slrsr_bank_type_menu_section";
  menu.className = "absolute left-0 right-0 top-full z-20 mt-2 hidden max-h-72 overflow-y-auto rounded-[1rem] border border-[var(--pb-card-border)] bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.16)]";

  const syncButton = () => {
    button.replaceChildren(bankChoiceContent(selectedBank, "Pilih bank dari master"));
    const arrow = document.createElement("span");
    arrow.className = "ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gray-50 text-gray-500";
    arrow.append(createIcon("chevron-down", { className: "h-4 w-4" }));
    button.append(arrow);
  };

  const closeMenu = () => {
    menu.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    menu.classList.remove("hidden");
    button.setAttribute("aria-expanded", "true");
  };

  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => {
    if (menu.classList.contains("hidden")) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  if (!normalizedBanks.length) {
    const empty = document.createElement("section");
    empty.id = "slrsr_bank_type_empty_section";
    empty.className = "rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500";
    empty.textContent = "Master Bank belum tersedia.";
    menu.append(empty);
  }

  normalizedBanks.forEach((bank) => {
    const option = document.createElement("button");
    option.id = `slrsr_bank_type_option_${slugify(bank.slug || bank.id || bank.bank_code)}_button`;
    option.type = "button";
    option.className = bank.slug === selectedBank?.slug
      ? "flex w-full min-w-0 items-center gap-3 rounded-xl bg-[var(--pb-surface-muted)] px-3 py-2 text-left text-xs font-black text-[var(--pb-brand-secondary)]"
      : "flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-50";
    option.append(bankChoiceContent(bank));
    option.addEventListener("click", () => {
      selectedBank = bank;
      input.value = bank.slug;
      [...menu.querySelectorAll("button")].forEach((node) => {
        node.className = "flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-50";
      });
      option.className = "flex w-full min-w-0 items-center gap-3 rounded-xl bg-[var(--pb-surface-muted)] px-3 py-2 text-left text-xs font-black text-[var(--pb-brand-secondary)]";
      syncButton();
      closeMenu();
    });
    menu.append(option);
  });

  syncButton();
  wrap.append(labelNode, input, button, menu);
  return wrap;
}

function bankChoiceContent(bank, fallbackLabel = "") {
  const content = document.createDocumentFragment();
  const icon = document.createElement("span");
  icon.className = "grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--pb-border)] bg-white text-[var(--pb-brand-secondary)]";
  if (bank?.icon_path) {
    const image = document.createElement("img");
    image.src = bank.icon_path;
    image.alt = `${bank.bank_name || "Bank"} icon`;
    image.className = "h-full w-full object-contain p-1";
    icon.append(image);
  } else {
    icon.append(createIcon("bank", { className: "h-4 w-4" }));
  }

  const copy = document.createElement("span");
  copy.className = "grid min-w-0";
  const name = document.createElement("span");
  name.className = "min-w-0 truncate";
  name.textContent = bank?.bank_name || fallbackLabel;
  const code = document.createElement("span");
  code.className = "text-[10px] font-semibold text-gray-500";
  code.textContent = bank?.bank_code ? `Kode ${bank.bank_code}` : "Pilih dari Master Bank";
  copy.append(name, code);
  content.append(icon, copy);
  return content;
}

function findSelectedBank(banks = [], value = "") {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  return banks.find((bank) => [
    bank.slug,
    bank.id,
    bank.bank_code,
    bank.bank_name,
  ].filter(Boolean).some((candidate) => String(candidate).trim().toLowerCase() === normalizedValue)) ?? null;
}

function textareaField({ id, name, label, value = "", placeholder = "" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1.5 text-xs font-bold text-gray-700";
  wrap.textContent = label;
  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.name = name;
  textarea.value = value ?? "";
  textarea.placeholder = placeholder;
  textarea.rows = 4;
  textarea.className = "min-h-28 min-w-0 resize-y rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-3 text-xs font-semibold leading-6 text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-[var(--pb-text-muted)] focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  wrap.append(textarea);
  return wrap;
}

function slugify(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function renderIconPreview(preview, url) {
  preview.replaceChildren();
  if (url) {
    const image = document.createElement("img");
    image.src = url;
    image.alt = "Icon showroom";
    image.className = "h-full w-full object-contain p-2";
    image.addEventListener("error", () => {
      preview.replaceChildren(createIcon("brandMark", { className: "h-8 w-8 text-[var(--pb-text-muted)]" }));
    }, { once: true });
    preview.append(image);
    return;
  }
  preview.append(createIcon("brandMark", { className: "h-8 w-8 text-[var(--pb-text-muted)]" }));
}

function uploadDropzone({ input, preview, uploading, onFile }) {
  const section = document.createElement("section");
  section.id = "slrsr_icon_dropzone_section";
  section.className = "grid gap-4 rounded-[1.25rem] border border-dashed border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-[linear-gradient(135deg,rgba(250,244,237,0.85),rgba(255,255,255,0.96),rgba(234,244,249,0.82))] p-4 shadow-sm md:grid-cols-[96px_minmax(0,1fr)] md:items-center";

  const body = document.createElement("section");
  body.className = "grid min-w-0 gap-3";
  const title = textNode("p", "text-xs font-black text-gray-950", uploading ? "Mengupload icon..." : "Upload Favicon / Icon Header");
  const desc = textNode("p", "text-[11px] leading-6 text-gray-600", "Berlaku hanya untuk halaman showroom Anda. SVG, PNG, JPG, atau WebP. Maksimal 2 MB.");
  const actionsRow = document.createElement("section");
  actionsRow.className = "flex flex-wrap items-center gap-2";
  const choose = document.createElement("button");
  choose.id = "slrsr_icon_choose_button";
  choose.type = "button";
  choose.className = "inline-flex min-h-10 items-center justify-center gap-2 rounded-[1rem] bg-[var(--pb-brand-primary)] px-4 py-2 text-xs font-bold text-white shadow-[var(--pb-shadow-soft)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-60";
  choose.disabled = Boolean(uploading);
  choose.append(createIcon("upload", { className: "block h-4 w-4 leading-none" }), document.createTextNode(uploading ? "Memproses..." : "Pilih File"));
  choose.addEventListener("click", () => input.click());
  actionsRow.append(choose, input);
  body.append(title, desc, actionsRow);
  section.append(preview, body);

  const setDrag = (active) => {
    section.classList.toggle("border-[color-mix(in_srgb,var(--pb-brand-primary)_45%,white)]", active);
    section.classList.toggle("bg-[var(--pb-surface-muted)]", active);
  };
  section.addEventListener("dragover", (event) => {
    event.preventDefault();
    setDrag(true);
  });
  section.addEventListener("dragleave", () => setDrag(false));
  section.addEventListener("drop", (event) => {
    event.preventDefault();
    setDrag(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) onFile?.(file);
  });

  return section;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}

function cityOptionsList(cities = [], selectedValue = "") {
  const active = (Array.isArray(cities) ? cities : [])
    .filter((city) => (city?.status ?? "active") === "active")
    .map((city) => String(city?.name ?? "").trim())
    .filter(Boolean);

  const current = String(selectedValue ?? "").trim();
  if (current && !active.includes(current)) {
    active.push(current);
  }

  return active;
}
