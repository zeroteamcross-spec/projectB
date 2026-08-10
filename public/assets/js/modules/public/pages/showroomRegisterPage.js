import { createPageLifecycle } from "../../../core/lifecycle.js";
import { authService } from "../../../core/auth.js";
import { Button } from "../../../ui/primitives/button.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";

const SHOWROOM_REGISTER_FALLBACK = "bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#fffaf4,#f8fafc_44%,#eef7f3)]";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 80;

/**
 * Registration-only entry point for showrooms. There is deliberately no login
 * form here — signing in happens from the landing page.
 */
export function ShowroomRegisterPage() {
  let root = null;
  let backgroundVideoLayer = null;
  const state = {
    isSubmitting: false,
    error: "",
    fieldErrors: {},
    registered: null,
    banks: [],
    cities: [],
    // Keeps the typed values across re-renders so a failed submit never wipes
    // a long form.
    draft: {},
  };

  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: "showroom_register_background_video_layer",
      fallbackClassName: SHOWROOM_REGISTER_FALLBACK,
      overlayClassName: "bg-white/42",
    });
    return backgroundVideoLayer;
  };

  const rerender = (context) => render(root, context, state, handlers);

  const handlers = {
    async submit(context, payload) {
      state.isSubmitting = true;
      state.error = "";
      state.fieldErrors = {};
      rerender(context);

      try {
        await authService.register({ ...payload, role: "seller" });
        state.registered = {
          showroomName: payload.showroom.name,
          slug: payload.showroom.slug,
          email: payload.email,
        };
      } catch (error) {
        state.fieldErrors = normalizeFieldErrors(error);
        // "Validation failed" is the transport-level message; when the server
        // pinpointed fields, point the reader at those instead.
        state.error = Object.keys(state.fieldErrors).length
          ? "Periksa kembali isian yang ditandai."
          : (error?.message || "Pendaftaran showroom gagal.");
      } finally {
        state.isSubmitting = false;
        rerender(context);
      }
    },
    updateDraft(patch) {
      Object.assign(state.draft, patch);
    },
    goToLogin(context) {
      context?.router?.navigate("/auth?role=seller");
    },
    goHome(context) {
      context?.router?.navigate("/");
    },
  };

  return createPageLifecycle({
    async bootstrap() {
      const [bankMaster, locationMaster] = await Promise.all([
        adminMasterService.getBankMaster().catch(() => null),
        adminMasterService.getLocationMaster().catch(() => null),
      ]);

      state.banks = (bankMaster?.data?.banks ?? bankMaster?.banks ?? [])
        .filter((bank) => (bank?.status ?? "active") === "active")
        .map((bank) => String(bank?.bank_name ?? "").trim())
        .filter(Boolean);

      state.cities = (locationMaster?.data?.cities ?? locationMaster?.cities ?? [])
        .filter((city) => (city?.status ?? "active") === "active")
        .map((city) => String(city?.name ?? "").trim())
        .filter(Boolean);
    },
    mount(context) {
      root = document.createElement("div");
      rerender(context);
      return root;
    },
    hydrate(context) {
      rerender(context);
    },
    dispose() {
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
      root = null;
    },
  });

  function render(target, context, pageState, actions) {
    if (!target) {
      return;
    }

    const shell = document.createElement("div");
    shell.className = "relative isolate min-h-screen overflow-x-clip";
    const background = getBackgroundVideoLayer();

    if (background) {
      shell.append(background);
    }

    const frame = document.createElement("div");
    frame.className = "relative z-10 mx-auto grid w-full max-w-[720px] gap-5 px-4 py-8 sm:px-6";
    frame.append(pageHeader(actions, context));
    frame.append(pageState.registered
      ? successPanel(pageState.registered, actions, context)
      : registerPanel(pageState, actions, context));

    shell.append(frame);
    target.replaceChildren(shell);
  }
}

function pageHeader(actions, context) {
  const header = document.createElement("header");
  header.id = "shr_register_header";
  header.className = "grid gap-2";

  const back = document.createElement("button");
  back.id = "shr_register_back_button";
  back.type = "button";
  back.className = "inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-white";
  back.append(createIcon("chevronRight", { className: "block h-3.5 w-3.5 rotate-180 leading-none" }), document.createTextNode("Kembali ke beranda"));
  back.addEventListener("click", () => actions.goHome(context));

  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Pendaftaran showroom";

  const title = document.createElement("h1");
  title.className = "text-2xl font-black tracking-normal text-white sm:text-3xl";
  title.textContent = "Daftarkan showroom Anda";

  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-white";
  body.textContent = "Isi data pemilik dan showroom.";

  header.append(back, eyebrow, title, body);
  return header;
}

function registerPanel(state, actions, context) {
  const section = document.createElement("section");
  section.id = "shr_register_section";
  section.className = "grid gap-4 rounded-[2rem] border border-white/75 bg-white/85 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const form = document.createElement("form");
  form.id = "shr_register_form";
  form.className = "grid gap-4";
  form.noValidate = true;

  const nameInput = field({
    id: "shr_register_name_input",
    name: "name",
    label: "Nama pemilik",
    placeholder: "Nama lengkap pemilik showroom",
    value: state.draft.name,
    error: state.fieldErrors.name,
  });

  const showroomNameInput = field({
    id: "shr_register_showroom_name_input",
    name: "showroom_name",
    label: "Nama showroom",
    placeholder: "Contoh: Toko Jaya Motor",
    value: state.draft.showroom_name,
    error: state.fieldErrors["showroom.name"],
  });

  const slugInput = field({
    id: "shr_register_showroom_slug_input",
    name: "showroom_slug",
    label: "Alamat halaman showroom",
    placeholder: "toko-jaya-motor",
    value: state.draft.showroom_slug,
    error: state.fieldErrors["showroom.slug"],
    hint: "Huruf kecil, angka, dan dash. Inilah alamat halaman publik Anda.",
  });

  const slugPreview = document.createElement("p");
  slugPreview.id = "shr_register_slug_preview";
  slugPreview.className = "-mt-1 break-all text-xs font-semibold text-[var(--pb-brand-secondary)]";
  const paintSlugPreview = (value) => {
    const normalized = normalizeSlug(value);
    slugPreview.textContent = normalized
      ? `Halaman Anda: ${window.location.origin}/#/s/${normalized}`
      : "Halaman Anda akan muncul di sini setelah slug diisi.";
  };
  paintSlugPreview(state.draft.showroom_slug ?? "");

  // Typing the showroom name fills the slug until the owner edits it directly.
  let slugTouched = Boolean(state.draft.showroom_slug);
  const slugField = slugInput.querySelector("input");
  const nameField = showroomNameInput.querySelector("input");

  nameField?.addEventListener("input", () => {
    if (slugTouched || !slugField) {
      return;
    }
    slugField.value = normalizeSlug(nameField.value);
    paintSlugPreview(slugField.value);
  });

  slugField?.addEventListener("input", () => {
    slugTouched = slugField.value.trim() !== "";
    paintSlugPreview(slugField.value);
  });

  form.append(
    fieldGroup("", [
      nameInput,
      field({
        id: "shr_register_email_input",
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "pemilik@showroom.com",
        value: state.draft.email,
        error: state.fieldErrors.email,
      }),
      field({
        id: "shr_register_password_input",
        name: "password",
        label: "Password",
        type: "password",
        placeholder: "Minimal 6 karakter",
        value: state.draft.password,
        error: state.fieldErrors.password,
      }),
      field({
        id: "shr_register_phone_input",
        name: "phone_number",
        label: "Nomor WhatsApp pemilik",
        placeholder: "081234567890",
        required: false,
        value: state.draft.phone_number,
        error: state.fieldErrors.phone_number,
      }),
      textareaField({
        id: "shr_register_address_input",
        name: "address",
        label: "Alamat pemilik",
        placeholder: "Alamat domisili pemilik",
        required: false,
        value: state.draft.address,
        error: state.fieldErrors.address,
      }),
    ]),
    fieldGroup("", [
      showroomNameInput,
      slugInput,
      slugPreview,
      selectField({
        id: "shr_register_city_input",
        name: "city_name",
        label: "Kota",
        placeholder: "Pilih kota",
        options: state.cities,
        value: state.draft.city_name,
        error: state.fieldErrors["showroom.city_name"],
      }),
      field({
        id: "shr_register_showroom_phone_input",
        name: "showroom_phone_number",
        label: "Telepon showroom",
        placeholder: "0217654321",
        required: false,
        value: state.draft.showroom_phone_number,
        error: state.fieldErrors["showroom.phone_number"],
      }),
    ]),
    fieldGroup("", [
      selectField({
        id: "shr_register_bank_type_input",
        name: "bank_type",
        label: "Bank",
        placeholder: "Pilih bank",
        options: state.banks,
        required: false,
        value: state.draft.bank_type,
        error: state.fieldErrors["showroom.bank_type"],
      }),
      field({
        id: "shr_register_bank_account_number_input",
        name: "bank_account_number",
        label: "Nomor rekening",
        placeholder: "1234567890",
        required: false,
        value: state.draft.bank_account_number,
        error: state.fieldErrors["showroom.bank_account_number"],
      }),
      field({
        id: "shr_register_bank_account_name_input",
        name: "bank_account_name",
        label: "Nama pemilik rekening",
        placeholder: "Sesuai buku tabungan",
        required: false,
        value: state.draft.bank_account_name,
        error: state.fieldErrors["showroom.bank_account_name"],
      }),
    ]),
  );

  if (state.error) {
    const message = document.createElement("p");
    message.id = "shr_register_error_message";
    message.className = "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700";
    message.textContent = state.error;
    form.append(message);
  }

  const submit = Button({
    label: state.isSubmitting ? "Mendaftarkan..." : "Daftarkan showroom",
    variant: "primary",
    disabled: state.isSubmitting,
  });
  submit.id = "shr_register_submit_button";
  submit.type = "submit";
  submit.classList.add("w-full", "shadow-[0_16px_34px_rgba(234,88,12,0.24)]", "transition", "duration-200");
  form.append(submit);

  const helper = document.createElement("p");
  helper.className = "text-sm leading-6 text-gray-600";
  helper.textContent = "Sudah punya akun showroom?";

  const loginLink = document.createElement("button");
  loginLink.id = "shr_register_login_link";
  loginLink.type = "button";
  loginLink.className = "ml-1 font-bold text-[var(--pb-brand-secondary)] underline underline-offset-2";
  loginLink.textContent = "Masuk di sini";
  loginLink.addEventListener("click", () => actions.goToLogin(context));
  helper.append(loginLink);
  form.append(helper);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (state.isSubmitting) {
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    actions.updateDraft(data);

    const localError = validateDraft(data);
    if (localError) {
      state.error = localError.message;
      state.fieldErrors = localError.fields;
      render();
      return;
    }

    actions.submit(context, {
      name: String(data.name ?? "").trim(),
      email: String(data.email ?? "").trim(),
      password: String(data.password ?? ""),
      phone_number: emptyToNull(data.phone_number),
      address: emptyToNull(data.address),
      showroom: {
        name: String(data.showroom_name ?? "").trim(),
        slug: normalizeSlug(data.showroom_slug),
        city_name: emptyToNull(data.city_name),
        phone_number: emptyToNull(data.showroom_phone_number),
        bank_type: emptyToNull(data.bank_type),
        bank_account_number: emptyToNull(data.bank_account_number),
        bank_account_name: emptyToNull(data.bank_account_name),
      },
    });
  });

  section.append(form);
  return section;

  function render() {
    section.replaceWith(registerPanel(state, actions, context));
  }
}

function successPanel(registered, actions, context) {
  const section = document.createElement("section");
  section.id = "shr_register_success_section";
  section.className = "grid gap-4 rounded-[2rem] border border-white/75 bg-white/85 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const badge = document.createElement("span");
  badge.className = "inline-flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-success)_16%,white)] px-3 py-1.5 text-sm font-bold text-[var(--pb-success)]";
  badge.append(createIcon("shield", { className: "block h-4 w-4 leading-none" }), document.createTextNode("Pendaftaran diterima"));

  const title = document.createElement("h2");
  title.className = "text-xl font-black tracking-normal text-gray-950";
  title.textContent = `${registered.showroomName} berhasil didaftarkan`;

  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = "Akun Anda menunggu persetujuan admin. Anda sudah bisa masuk dan menyiapkan showroom, tetapi sebagian fitur baru terbuka penuh setelah disetujui.";

  const detail = document.createElement("div");
  detail.className = "grid gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm";
  detail.append(
    detailRow("Email masuk", registered.email),
    // Alias pendek, sama dengan yang dijanjikan landing page. Menuju halaman
    // yang sama dengan /#/showrooms/<slug>.
    detailRow("Halaman showroom", `${window.location.origin}/#/s/${registered.slug}`),
  );

  const login = Button({ label: "Masuk sekarang", variant: "primary" });
  login.id = "shr_register_success_login_button";
  login.classList.add("w-full");
  login.addEventListener("click", () => actions.goToLogin(context));

  section.append(badge, title, body, detail, login);
  return section;
}

function detailRow(label, value) {
  const row = document.createElement("div");
  row.className = "grid gap-0.5";

  const caption = document.createElement("span");
  caption.className = "text-xs font-semibold uppercase tracking-wide text-gray-500";
  caption.textContent = label;

  const content = document.createElement("span");
  content.className = "break-all font-semibold text-gray-900";
  content.textContent = value;

  row.append(caption, content);
  return row;
}

function fieldGroup(title, children) {
  const group = document.createElement("fieldset");
  group.className = "grid gap-3 rounded-2xl border border-gray-100 bg-white/70 p-4";

  const legend = document.createElement("legend");
  legend.className = "px-1 text-sm font-black text-gray-900";
  legend.textContent = title;

  group.append(legend, ...children);
  return group;
}

function field({ id, name, label, type = "text", placeholder = "", required = true, value = "", hint = "", error = "" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1.5 text-sm font-semibold text-gray-700";
  wrap.append(document.createTextNode(label));

  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = type;
  input.required = required;
  input.placeholder = placeholder;
  input.value = value ?? "";
  input.className = inputClassName(Boolean(error));
  wrap.append(input);

  if (hint) {
    wrap.append(hintNode(hint));
  }

  if (error) {
    wrap.append(errorNode(error));
  }

  return wrap;
}

/**
 * Combobox bergaya dropdown-dan-cari (seperti Select2 di jQuery), dibangun
 * sendiri tanpa menambah dependency baru — aplikasi ini murni vanilla JS di
 * semua tempat lain, jadi menarik jQuery+plugin hanya untuk dua field ini
 * akan jadi satu-satunya pengecualian. <input list>+<datalist> bawaan
 * browser yang dipakai sebelumnya punya masalah yang sama persis dengan
 * yang dikeluhkan: panel sarannya di-render browser sendiri (putih polos,
 * font sistem) dan sama sekali tidak bisa di-styling lewat CSS.
 *
 * Klik atau fokus pada input membuka panel; mengetik menyaring opsi secara
 * live; klik salah satu opsi mengisi input dan menutup panel. Nilai yang
 * dikirim ke form tetap teks polos dari input (sama seperti versi
 * datalist), jadi validasi backend dan frontend tidak berubah.
 */
function selectField({ id, name, label, placeholder = "", options = [], required = true, value = "", error = "" }) {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-1.5 text-sm font-semibold text-gray-700";

  const labelNode = document.createElement("label");
  labelNode.htmlFor = id;
  labelNode.textContent = label;
  wrap.append(labelNode);

  const comboWrap = document.createElement("div");
  comboWrap.id = `${id}_combobox`;
  comboWrap.className = "relative";

  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = "text";
  input.required = required;
  input.autocomplete = "off";
  input.placeholder = placeholder ? `${placeholder} — ketik untuk mencari` : "Ketik untuk mencari";
  input.value = value ?? "";
  input.className = `${inputClassName(Boolean(error))} pr-10`;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", `${id}_listbox`);

  const chevron = document.createElement("span");
  chevron.className = "pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 text-gray-400";
  chevron.append(createIcon("chevronRight", { className: "block h-3 w-3 rotate-90 leading-none" }));

  const panel = document.createElement("div");
  panel.id = `${id}_listbox`;
  panel.setAttribute("role", "listbox");
  panel.className = "modal-scrollbar absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)]";
  panel.hidden = true;

  let filtered = options.slice();
  let highlighted = -1;

  function filterOptions(query) {
    const q = String(query ?? "").trim().toLowerCase();
    return q ? options.filter((option) => option.toLowerCase().includes(q)) : options.slice();
  }

  function renderOptions() {
    panel.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "px-3 py-2 text-sm font-medium text-gray-400";
      empty.textContent = "Tidak ada hasil.";
      panel.append(empty);
      return;
    }

    filtered.forEach((option, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.dataset.comboboxOption = option;
      item.setAttribute("role", "option");
      item.className = [
        "block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition",
        index === highlighted ? "bg-orange-50 text-orange-700" : "text-gray-800 hover:bg-gray-50",
      ].join(" ");
      item.textContent = option;
      // mousedown (bukan click) supaya terjadi sebelum blur input menutup panel.
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        selectOption(option);
      });
      panel.append(item);
    });
  }

  function openPanel() {
    filtered = filterOptions(input.value);
    highlighted = -1;
    renderOptions();
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  function selectOption(option) {
    input.value = option;
    // Menutup panel HARUS terakhir: listener "input" di bawah membuka lagi
    // panelnya (dipakai saat mengetik manual), jadi kalau closePanel() lebih
    // dulu, dispatch "input" ini langsung membukanya kembali.
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    closePanel();
  }

  input.addEventListener("focus", openPanel);
  input.addEventListener("input", () => {
    filtered = filterOptions(input.value);
    highlighted = -1;
    renderOptions();
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  });
  input.addEventListener("blur", closePanel);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (panel.hidden) {
        openPanel();
        return;
      }
      highlighted = Math.min(highlighted + 1, filtered.length - 1);
      renderOptions();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
      renderOptions();
    } else if (event.key === "Enter") {
      if (!panel.hidden && filtered[highlighted]) {
        event.preventDefault();
        selectOption(filtered[highlighted]);
      }
    } else if (event.key === "Escape") {
      closePanel();
    }
  });

  comboWrap.append(input, chevron, panel);
  wrap.append(comboWrap);

  // Render sekali di awal (tetap hidden) supaya opsinya sudah ada di DOM
  // sebelum panel pernah dibuka — dibutuhkan alat uji otomatis yang mengecek
  // opsi lewat querySelector, dan menghindari kedipan kosong sesaat panel
  // pertama kali dibuka.
  renderOptions();

  if (error) {
    wrap.append(errorNode(error));
  }

  return wrap;
}

function textareaField({ id, name, label, placeholder = "", required = true, value = "", error = "" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1.5 text-sm font-semibold text-gray-700";
  wrap.append(document.createTextNode(label));

  const input = document.createElement("textarea");
  input.id = id;
  input.name = name;
  input.required = required;
  input.placeholder = placeholder;
  input.rows = 3;
  input.value = value ?? "";
  input.className = `${inputClassName(Boolean(error))} min-h-24 resize-y`;
  wrap.append(input);

  if (error) {
    wrap.append(errorNode(error));
  }

  return wrap;
}

function inputClassName(hasError) {
  const base = "min-h-11 min-w-0 w-full rounded-2xl border bg-white/90 px-4 py-2.5 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 focus:bg-white focus:ring-4";

  return hasError
    ? `${base} border-red-300 focus:border-red-400 focus:ring-red-100`
    : `${base} border-gray-200 focus:border-orange-300 focus:ring-orange-100`;
}

function hintNode(text) {
  const hint = document.createElement("span");
  hint.className = "text-xs font-medium text-gray-500";
  hint.textContent = text;
  return hint;
}

function errorNode(text) {
  const node = document.createElement("span");
  node.className = "text-xs font-semibold text-red-600";
  node.textContent = text;
  return node;
}

function validateDraft(data) {
  const fields = {};

  if (!String(data.name ?? "").trim()) {
    fields.name = "Nama pemilik wajib diisi.";
  }

  if (!String(data.email ?? "").trim()) {
    fields.email = "Email wajib diisi.";
  }

  if (String(data.password ?? "").length < 6) {
    fields.password = "Password minimal 6 karakter.";
  }

  if (!String(data.showroom_name ?? "").trim()) {
    fields["showroom.name"] = "Nama showroom wajib diisi.";
  }

  if (!String(data.city_name ?? "").trim()) {
    fields["showroom.city_name"] = "Kota wajib dipilih.";
  }

  const slug = normalizeSlug(data.showroom_slug);

  if (slug.length < SLUG_MIN_LENGTH) {
    fields["showroom.slug"] = `Alamat halaman minimal ${SLUG_MIN_LENGTH} karakter.`;
  } else if (slug.length > SLUG_MAX_LENGTH) {
    fields["showroom.slug"] = `Alamat halaman maksimal ${SLUG_MAX_LENGTH} karakter.`;
  }

  return Object.keys(fields).length
    ? { message: "Periksa kembali isian yang ditandai.", fields }
    : null;
}

/**
 * Mirrors the server-side normalizer so the preview shows exactly what will be
 * stored.
 */
function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFieldErrors(error) {
  const errors = error?.errors ?? error?.data?.errors ?? null;

  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return {};
  }

  return errors;
}

function emptyToNull(value) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}
