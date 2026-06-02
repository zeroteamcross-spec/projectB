import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function SellerShowroomForm({ showroom = null, saving = false, error = "", bankOptions = [], onSubmit = null, onCancel = null } = {}) {
  const form = document.createElement("form");
  form.id = "slrsr_form_section";
  form.className = "grid gap-5 rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm transition duration-150 sm:p-5";
  form.dataset.ds = "seller.showroom.form";

  const header = document.createElement("section");
  header.id = "slrsr_form_header_section";
  header.className = "grid gap-2 border-b border-gray-100 pb-5";
  const eyebrow = document.createElement("p");
  eyebrow.className = "text-xs font-black uppercase tracking-[0.18em] text-orange-700";
  eyebrow.textContent = showroom ? "Edit showroom" : "Setup showroom";
  const title = document.createElement("h2");
  title.className = tw.text.sectionTitle;
  title.textContent = showroom ? "Edit showroom" : "Buat showroom";

  const helper = document.createElement("p");
  helper.className = `max-w-2xl text-sm leading-6 ${tw.text.muted}`;
  helper.textContent = "Isi data utama showroom dan rekening seller untuk kebutuhan transaksi.";
  header.append(eyebrow, title, helper);

  const errorNode = document.createElement("p");
  errorNode.id = "slrsr_error_section";
  errorNode.className = "rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
  errorNode.textContent = error;
  errorNode.hidden = !error;

  const profileSection = fieldGroup("slrsr_profile_fields_section", "Profil showroom", "showroom");
  profileSection.body.append(
    inputField({ id: "slrsr_name_input", name: "name", label: "Nama showroom", value: showroom?.name ?? "", placeholder: "Contoh: ProjectB Auto" }),
    textareaField({ id: "slrsr_address_input", name: "address", label: "Alamat", value: showroom?.address ?? "", placeholder: "Alamat lengkap showroom" })
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

  const actions = document.createElement("section");
  actions.id = "slrsr_form_actions_section";
  actions.className = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";
  const submitButton = Button({ label: saving ? "Menyimpan..." : "Simpan showroom", disabled: saving });
  submitButton.id = "slrsr_save_showroom_button";
  submitButton.type = "submit";
  submitButton.prepend(createIcon("circleCheck", { className: "h-4 w-4" }));
  const cancelButton = Button({ label: "Batal", variant: "secondary", disabled: saving, onClick: onCancel });
  cancelButton.id = "slrsr_cancel_showroom_button";
  cancelButton.type = "button";
  actions.append(
    cancelButton,
    submitButton
  );

  form.append(header, errorNode, profileSection.section, contactSection.section, bankSection.section, actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    onSubmit?.({
      name: String(formData.get("name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      phone_number: String(formData.get("phone_number") ?? "").trim(),
      bank_account_number: String(formData.get("bank_account_number") ?? "").trim(),
      bank_type: String(formData.get("bank_type") ?? "").trim(),
      bank_account_name: String(formData.get("bank_account_name") ?? "").trim(),
    });
  });

  return form;
}

function fieldGroup(id, title, iconName) {
  const section = document.createElement("section");
  section.id = id;
  section.className = "grid min-w-0 gap-4 rounded-[1.25rem] border border-gray-100 bg-[linear-gradient(135deg,rgba(249,250,251,0.95),rgba(255,255,255,0.9))] p-4 shadow-sm transition duration-150 hover:border-orange-100";

  const header = document.createElement("section");
  header.id = `${id}_header`;
  header.className = "flex items-center gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600";
  icon.append(createIcon(iconName, { className: "h-4 w-4" }));
  const label = document.createElement("h3");
  label.className = "text-sm font-black text-gray-950";
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
  wrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  wrap.textContent = label;
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-gray-400 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  wrap.append(input);
  return wrap;
}

function bankSelectField({ id, name, label, value = "", banks = [] }) {
  const normalizedBanks = banks.filter((bank) => bank?.status !== "inactive");
  let selectedBank = findSelectedBank(normalizedBanks, value);

  const wrap = document.createElement("section");
  wrap.id = "slrsr_bank_type_field_section";
  wrap.className = "relative grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";

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
  button.className = "flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-left text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";

  const menu = document.createElement("section");
  menu.id = "slrsr_bank_type_menu_section";
  menu.className = "absolute left-0 right-0 top-full z-20 mt-2 hidden max-h-72 overflow-y-auto rounded-[1rem] border border-gray-100 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.16)]";

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
    empty.className = "rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-500";
    empty.textContent = "Master Bank belum tersedia.";
    menu.append(empty);
  }

  normalizedBanks.forEach((bank) => {
    const option = document.createElement("button");
    option.id = `slrsr_bank_type_option_${slugify(bank.slug || bank.id || bank.bank_code)}_button`;
    option.type = "button";
    option.className = bank.slug === selectedBank?.slug
      ? "flex w-full min-w-0 items-center gap-3 rounded-xl bg-orange-50 px-3 py-2 text-left text-sm font-black text-orange-800"
      : "flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-50";
    option.append(bankChoiceContent(bank));
    option.addEventListener("click", () => {
      selectedBank = bank;
      input.value = bank.slug;
      [...menu.querySelectorAll("button")].forEach((node) => {
        node.className = "flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-50";
      });
      option.className = "flex w-full min-w-0 items-center gap-3 rounded-xl bg-orange-50 px-3 py-2 text-left text-sm font-black text-orange-800";
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
  icon.className = "grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl border border-orange-100 bg-white text-orange-600";
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
  code.className = "text-xs font-semibold text-gray-500";
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
  wrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  wrap.textContent = label;
  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.name = name;
  textarea.value = value ?? "";
  textarea.placeholder = placeholder;
  textarea.rows = 4;
  textarea.className = "min-h-28 min-w-0 resize-y rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-gray-400 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  wrap.append(textarea);
  return wrap;
}

function slugify(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
