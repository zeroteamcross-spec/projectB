import { createPageLifecycle } from "../../../core/lifecycle.js";
import { authStore } from "../../../state/authStore.js";
import { Button } from "../../../ui/primitives/button.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { publicAuthLandingService } from "../services/publicAuthLandingService.js";

const ROLE_OPTIONS = [
  {
    role: "buyer",
    label: "Buyer",
    icon: "transaction",
    futureCopy: "Transaksi dan pembayaran.",
  },
  {
    role: "seller",
    label: "Seller",
    icon: "showroom",
    futureCopy: "Showroom dan listing.",
  },
  {
    role: "admin",
    label: "Admin",
    icon: "dashboard",
    futureCopy: "Operasi dan approval.",
  },
  {
    role: "affiliate_admin",
    label: "Marketing",
    icon: "affiliate",
    futureCopy: "Aktivitas dan komisi.",
  },
];

const SHOW_AUTH_DEBUG_SECTIONS = false;
const AUTH_FALLBACK = "bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#faf4ed,#f8fafc_44%,#eaf4f9)]";

export function AuthLandingPage() {
  let root = null;
  let backgroundVideoLayer = null;
  const state = {
    selectedRole: "buyer",
    authMode: "login",
    isSubmitting: false,
    error: "",
  };
  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: "auth_background_video_layer",
      fallbackClassName: AUTH_FALLBACK,
      overlayClassName: "bg-white/42",
    });
    return backgroundVideoLayer;
  };
  state.getBackgroundVideoLayer = getBackgroundVideoLayer;

  return createPageLifecycle({
    bootstrap(context) {
      state.selectedRole = publicAuthLandingService.normalizeRole(context.query.role);
      state.authMode = publicAuthLandingService.normalizeAuthMode(context.query.mode);
      state.error = "";
      state.isSubmitting = false;
    },
    mount(context) {
      root = document.createElement("div");
      root.className = "relative isolate min-h-screen overflow-hidden bg-transparent";
      render(root, context, state, getBackgroundVideoLayer);
      window.scrollTo(0, 0);
      return root;
    },
    hydrate(context) {
      render(root, context, state, getBackgroundVideoLayer);
      window.scrollTo(0, 0);
    },
    dispose() {
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
    },
  });
}

function render(root, context, state, getBackgroundVideoLayer = null) {
  if (!root) {
    return;
  }

  const currentRole = authStore.role();
  const requestedPath = normalizePath(context.query.from);

  const frame = document.createElement("main");
  frame.id = "hr_auth_frame";
  frame.className = SHOW_AUTH_DEBUG_SECTIONS
    ? "relative z-10 mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-center"
    : "relative z-10 mx-auto grid min-h-screen w-full items-center justify-items-center px-4 py-6 sm:px-6 sm:py-10 lg:justify-items-end lg:px-10";

  const left = document.createElement("div");
  left.className = SHOW_AUTH_DEBUG_SECTIONS ? "grid gap-5" : "hidden";
  if (!SHOW_AUTH_DEBUG_SECTIONS) {
    left.setAttribute("aria-hidden", "true");
  }
  left.append(
    brandAnchor({ requestedPath }),
    roleChooser({
      selectedRole: state.selectedRole,
      onChange: (role) => {
        state.selectedRole = role;
        if (!publicAuthLandingService.canRegisterRole(role)) {
          state.authMode = "login";
        }
        state.error = "";
        render(root, context, state);
      },
    }),
  );

  const right = document.createElement("aside");
  right.className = "grid w-full max-w-[460px] gap-4";
  right.append(backToLandingButton(context.router));

  if (authStore.isAuthenticated()) {
    // Sesi masih aktif: antar langsung ke dashboard rolenya, jangan tahan di
    // kartu "sesi aktif" yang menuntut satu klik lagi. Seller yang belum
    // disetujui tidak perlu dikecualikan di sini — roleGuard yang memutuskan,
    // dan memantulkannya ke halaman pending_approval begitu /seller dibuka.
    const tujuan = publicAuthLandingService.resolveAfterLogin({
      selectedRole: currentRole,
      actualRole: currentRole,
      fromPath: requestedPath,
    });

    right.append(redirectingNotice(publicAuthLandingService.roleLabel(currentRole)));
    // Ditunda satu tick supaya navigasi tidak terjadi di tengah render.
    window.setTimeout(() => {
      if (authStore.isAuthenticated()) {
        context.router.navigate(tujuan);
      }
    }, 0);
  } else {
    right.append(authPanel({
      selectedRole: state.selectedRole,
      authMode: state.authMode,
      requestedPath,
      isSubmitting: state.isSubmitting,
      error: state.error,
      onModeChange: (mode) => {
        state.authMode = mode;
        state.error = "";
        render(root, context, state);
      },
      onLogin: (payload) => loginSelectedRole(payload, context, state, root),
      onRegister: (payload) => registerSelectedRole(payload, context, state, root),
      onNavigate: (path) => context?.router?.navigate(path),
    }));
  }

  frame.append(left, right);
  const backgroundLayer = getBackgroundVideoLayer?.() ?? state.getBackgroundVideoLayer?.();
  root.replaceChildren(...[backgroundLayer, frame].filter(Boolean));
  runEntranceAnimation(frame);
}

function redirectingNotice(roleLabel) {
  const section = document.createElement("section");
  section.id = "hr_auth_redirecting_section";
  section.className = "grid gap-2 rounded-[1.5rem] border border-white/70 bg-white/85 px-5 py-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl";

  const title = document.createElement("p");
  title.className = "text-sm font-black text-gray-900";
  title.textContent = "Sesi Anda masih aktif";

  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = `Mengarahkan ke dashboard ${roleLabel}...`;

  section.append(title, body);
  return section;
}

function backToLandingButton(router) {
  const button = Button({
    label: "Kembali ke landing page",
    variant: "secondary",
    onClick: () => router.navigate("/"),
  });
  button.id = "hr_auth_back_landing_button";
  button.classList.add("justify-self-start", "rounded-full", "px-4", "shadow-sm", "backdrop-blur", "transition", "duration-200", "hover:-translate-y-0.5");
  return button;
}

function brandAnchor({ requestedPath }) {
  const section = document.createElement("section");
  section.id = "hr_auth_brand_section";
  section.hidden = !SHOW_AUTH_DEBUG_SECTIONS;
  section.setAttribute("aria-hidden", String(!SHOW_AUTH_DEBUG_SECTIONS));
  section.className = SHOW_AUTH_DEBUG_SECTIONS
    ? "relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8"
    : "hidden";

  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_20%,transparent)] blur-3xl";

  const content = document.createElement("div");
  content.className = "relative grid max-w-xl gap-5";

  const mark = document.createElement("div");
  mark.className = "grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent))] text-lg font-black text-white shadow-[0_16px_40px_rgba(30,129,176,0.28)] transition duration-200 hover:scale-[1.02]";
  mark.textContent = "BM";

  const title = document.createElement("h1");
  title.className = "max-w-lg text-4xl font-black leading-[0.98] tracking-[-0.04em] text-gray-950 sm:text-5xl";
  title.textContent = "Masuk dengan akun yang tepat.";

  const body = document.createElement("p");
  body.className = "max-w-md text-sm leading-6 text-gray-600 sm:text-base";
  body.textContent = requestedPath
    ? "Pilih role, lalu lanjutkan ke halaman tujuan."
    : "Satu pintu untuk buyer, seller, admin, dan affiliate.";

  const rail = document.createElement("div");
  rail.className = "flex flex-wrap gap-2 text-xs font-semibold text-gray-600";
  ["Cepat", "Aman", "Ringkas"].forEach((item, index) => {
    const pill = document.createElement("span");
    pill.className = "rounded-full border border-white/80 bg-white/75 px-3 py-1 shadow-sm";
    pill.textContent = item;
    pill.id = `hr_auth_brand_pill_${index + 1}`;
    rail.append(pill);
  });

  content.append(mark, title, body, rail);
  section.append(glow, content);
  return section;
}

function roleChooser({ selectedRole, onChange }) {
  const section = document.createElement("section");
  section.id = "hr_auth_role_section";
  section.hidden = !SHOW_AUTH_DEBUG_SECTIONS;
  section.setAttribute("aria-hidden", String(!SHOW_AUTH_DEBUG_SECTIONS));
  section.className = SHOW_AUTH_DEBUG_SECTIONS ? "grid gap-3 sm:grid-cols-2" : "hidden";

  ROLE_OPTIONS.forEach((option) => {
    const button = document.createElement("button");
    button.id = `hr_auth_role_${option.role}_button`;
    button.type = "button";
    button.className = option.role === selectedRole
      ? "group grid gap-3 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-white/90 p-4 text-left shadow-[0_18px_45px_rgba(30,129,176,0.16)] ring-2 ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)] transition duration-200 hover:-translate-y-0.5"
      : "group grid gap-3 rounded-[1.35rem] border border-white/70 bg-white/65 p-4 text-left shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]";
    button.addEventListener("click", () => onChange(option.role));

    const top = document.createElement("div");
    top.className = "flex items-center gap-3";

    const iconWrap = document.createElement("div");
    iconWrap.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_12%,white),color-mix(in_srgb,var(--pb-brand-accent)_16%,white))] text-[var(--pb-brand-secondary)] shadow-sm transition duration-200 group-hover:scale-105";
    iconWrap.append(createIcon(option.icon, { className: "h-5 w-5" }));

    const copy = document.createElement("div");
    copy.className = "grid gap-1";

    const title = document.createElement("strong");
    title.className = "text-sm font-black text-gray-950";
    title.textContent = option.label;

    const text = document.createElement("span");
    text.className = "text-xs leading-5 text-gray-500";
    text.textContent = option.futureCopy;

    copy.append(title, text);
    top.append(iconWrap, copy);

    const status = document.createElement("span");
    status.className = option.role === selectedRole
      ? "w-fit rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] px-2.5 py-1 text-[11px] font-bold text-[var(--pb-brand-secondary)]"
      : "w-fit rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-gray-500";
    status.textContent = option.role === selectedRole ? "Aktif" : "Pilih";

    button.append(top, status);
    section.append(button);
  });

  return section;
}

function authPanel({
  selectedRole,
  authMode,
  requestedPath,
  isSubmitting,
  error,
  onModeChange,
  onLogin,
  onRegister,
  onNavigate,
}) {
  const roleMeta = publicAuthLandingService.roleCopy(selectedRole);
  const canRegister = publicAuthLandingService.canRegisterRole(selectedRole);
  const activeMode = canRegister ? authMode : "login";

  const section = document.createElement("section");
  section.id = "hr_auth_panel_section";
  section.className = "relative grid gap-5 overflow-hidden rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl transition duration-300 sm:p-6";

  const header = document.createElement("div");
  header.className = "grid gap-1.5";

  const title = document.createElement("h2");
  title.className = "text-2xl font-black tracking-[-0.03em] text-gray-950";
  title.textContent = activeMode === "register" ? `Daftar ${publicAuthLandingService.roleLabel(selectedRole)}` : "Masuk ke akun";

  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = requestedPath
    ? "Masuk, lalu kembali ke halaman tujuan."
    : "Gunakan email dan password sesuai akun Anda.";

  header.append(title, body);
  section.append(header);

  // A single "Masuk" tab has nothing to switch to, so the bar only appears when
  // the role can actually choose between logging in and registering.
  if (canRegister) {
    section.append(authModeTabs({ activeMode, onModeChange }));
  }

  if (!canRegister) {
    const registerPath = publicAuthLandingService.registerPathForRole(selectedRole);
    const note = document.createElement("p");
    note.id = `hr_auth_${selectedRole}_no_register_note`;
    note.className = "rounded-2xl bg-[var(--pb-surface-muted)] px-3 py-2 text-sm leading-6 text-gray-600";

    if (registerPath) {
      note.append(document.createTextNode("Belum punya showroom? Pendaftaran ada di halaman terpisah."));

      const link = document.createElement("button");
      link.id = "hr_auth_seller_register_link";
      link.type = "button";
      link.className = "ml-1 font-bold text-[var(--pb-brand-secondary)] underline underline-offset-2";
      link.textContent = "Daftarkan showroom";
      link.addEventListener("click", () => onNavigate?.(registerPath));
      note.append(link);
    } else {
      note.textContent = "Role ini memakai akun dari admin.";
    }

    section.append(note);
  }

  section.append(activeMode === "register"
    ? registerForm({ selectedRole, isSubmitting, error, onSubmit: onRegister })
    : loginForm({ selectedRole, isSubmitting, error, onSubmit: onLogin }));

  return section;
}

function authModeTabs({ activeMode, onModeChange }) {
  const tabs = document.createElement("div");
  tabs.className = "grid grid-cols-2 gap-1 rounded-2xl border border-gray-100 bg-gray-100/80 p-1";
  tabs.append(
    authModeButton("login", "Masuk", activeMode, onModeChange),
    authModeButton("register", "Daftar", activeMode, onModeChange),
  );
  return tabs;
}

function authModeButton(value, label, activeMode, onModeChange) {
  const button = document.createElement("button");
  button.id = `hr_auth_tab_${value}_button`;
  button.type = "button";
  button.className = value === activeMode
    ? "rounded-xl bg-white px-3 py-2.5 text-sm font-black text-gray-950 shadow-sm transition duration-200"
    : "rounded-xl px-3 py-2.5 text-sm font-bold text-gray-500 transition duration-200 hover:bg-white/70 hover:text-gray-800";
  button.textContent = label;
  button.addEventListener("click", () => onModeChange?.(value));
  return button;
}

function loginForm({ selectedRole, isSubmitting, error, onSubmit }) {
  const form = document.createElement("form");
  form.className = "grid gap-3";
  form.append(
    field({ id: `hr_auth_login_${selectedRole}_email_input`, name: "email", label: "Email", type: "email", placeholder: emailPlaceholder(selectedRole) }),
    field({ id: `hr_auth_login_${selectedRole}_password_input`, name: "password", label: "Password", type: "password", placeholder: "Password akun" }),
  );

  if (error) {
    const message = document.createElement("p");
    message.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    message.textContent = error;
    form.append(message);
  }

  const submit = Button({
    label: isSubmitting ? "Memproses..." : `Masuk ${selectedRole}`,
    variant: "primary",
    disabled: isSubmitting,
  });
  submit.id = `hr_auth_login_${selectedRole}_submit_button`;
  submit.type = "submit";
  submit.classList.add("w-full", "shadow-[0_16px_34px_rgba(30,129,176,0.24)]", "transition", "duration-200", "hover:-translate-y-0.5", "active:translate-y-0");
  form.append(submit);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    onSubmit?.({
      email: data.email,
      password: data.password,
    });
  });

  return form;
}

function registerForm({ selectedRole, isSubmitting, error, onSubmit }) {
  const form = document.createElement("form");
  form.className = "grid gap-3";
  form.append(
    field({ id: `hr_auth_register_${selectedRole}_name_input`, name: "name", label: "Nama", placeholder: selectedRole === "seller" ? "Nama pemilik showroom" : "Nama buyer" }),
    field({ id: `hr_auth_register_${selectedRole}_phone_input`, name: "phone_number", label: "Nomor WhatsApp", placeholder: "081234567890", required: false }),
    field({ id: `hr_auth_register_${selectedRole}_email_input`, name: "email", label: "Email", type: "email", placeholder: registerEmailPlaceholder(selectedRole) }),
    field({ id: `hr_auth_register_${selectedRole}_password_input`, name: "password", label: "Password", type: "password", placeholder: "Minimal 6 karakter" }),
    textareaField({ id: `hr_auth_register_${selectedRole}_address_input`, name: "address", label: "Alamat", placeholder: "Alamat domisili", required: false }),
  );

  if (selectedRole === "seller") {
    form.append(
      field({ id: "hr_auth_register_seller_showroom_name_input", name: "showroom_name", label: "Nama showroom", placeholder: "Nama showroom" }),
      textareaField({ id: "hr_auth_register_seller_showroom_address_input", name: "showroom_address", label: "Alamat showroom", placeholder: "Alamat showroom", required: false }),
    );
  }

  if (error) {
    const message = document.createElement("p");
    message.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    message.textContent = error;
    form.append(message);
  }

  const submit = Button({
    label: isSubmitting ? "Mendaftarkan..." : registerSubmitLabel(selectedRole),
    variant: "primary",
    disabled: isSubmitting,
  });
  submit.id = `hr_auth_register_${selectedRole}_submit_button`;
  submit.type = "submit";
  submit.classList.add("w-full", "shadow-[0_16px_34px_rgba(30,129,176,0.24)]", "transition", "duration-200", "hover:-translate-y-0.5", "active:translate-y-0");
  form.append(submit);

  const helper = document.createElement("p");
  helper.className = "text-sm leading-6 text-gray-600";
  helper.textContent = selectedRole === "seller"
    ? "Akun seller akan masuk antrean approval admin sebelum bisa login."
    : "Akun buyer aktif setelah registrasi dan akan langsung diarahkan ke area buyer.";
  form.append(helper);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const payload = {
      name: data.name,
      phone_number: data.phone_number,
      email: data.email,
      password: data.password,
      address: data.address,
    };

    if (selectedRole === "seller") {
      payload.showroom = {
        name: data.showroom_name,
        address: data.showroom_address,
        phone_number: data.phone_number,
      };
    }

    onSubmit?.(payload);
  });

  return form;
}

function field({ id, name, label, type = "text", placeholder = "", required = true }) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1.5 text-sm font-semibold text-gray-700";
  wrap.textContent = label;

  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = type;
  input.required = required;
  input.placeholder = placeholder;
  input.className = "min-h-11 min-w-0 w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-[var(--pb-text-muted)] focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]";

  wrap.append(input);
  return wrap;
}

function textareaField({ id, name, label, placeholder = "", required = true }) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1.5 text-sm font-semibold text-gray-700";
  wrap.textContent = label;

  const input = document.createElement("textarea");
  input.id = id;
  input.name = name;
  input.required = required;
  input.placeholder = placeholder;
  input.rows = 3;
  input.className = "min-h-24 min-w-0 w-full resize-y rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-[var(--pb-text-muted)] focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]";

  wrap.append(input);
  return wrap;
}

function runEntranceAnimation(frame) {
  if (!frame || typeof frame.animate !== "function") {
    return;
  }

  frame.animate([
    { opacity: 0, transform: "translateY(10px)" },
    { opacity: 1, transform: "translateY(0)" },
  ], {
    duration: 240,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  });
}

async function loginSelectedRole(payload, context, state, root) {
  state.isSubmitting = true;
  state.error = "";
        render(root, context, state);

  try {
    await publicAuthLandingService.login(payload);
    const actualRole = authStore.role();
    const fromPath = normalizePath(context.query.from);
    const target = publicAuthLandingService.resolveAfterLogin({
      selectedRole: actualRole,
      actualRole,
      fromPath,
    });
    showToast(`Login ${actualRole} berhasil.`, {
      type: "success",
      key: "auth-login-success",
      dedupeMs: 3000,
    });
    context.router.navigate(target);
    // Berhenti di sini. router.navigate() hanya mengganti hash; pergantian
    // halamannya jalan pada tick hashchange berikutnya. Merender ulang halaman
    // ini sekarang — dengan status sudah terautentikasi — cuma menampilkan
    // panel peralihan sekejap sebelum dashboard mengambil alih.
    return;
  } catch (error) {
    state.error = error.message || "Login gagal.";
    showToast(state.error, {
      type: "error",
      key: "auth-login-error",
      dedupeMs: 3000,
    });
  }

  state.isSubmitting = false;
  render(root, context, state);
}

async function registerSelectedRole(payload, context, state, root) {
  state.isSubmitting = true;
  state.error = "";
          render(root, context, state);

  try {
    const result = await publicAuthLandingService.registerForRole(state.selectedRole, payload);

    if (result?.authenticated) {
      const actualRole = authStore.role();
      const selectedRole = state.selectedRole;
      const fromPath = normalizePath(context.query.from);
      const target = publicAuthLandingService.resolveAfterLogin({
        selectedRole,
        actualRole,
        fromPath,
      });
      showToast(`Registrasi ${selectedRole} berhasil.`, { type: "success" });
      context.router.navigate(target);
      return;
    }

    state.authMode = "login";
    showToast("Registrasi seller berhasil. Tunggu approval admin sebelum login.", { type: "success" });
  } catch (error) {
    state.error = error.message || "Registrasi gagal.";
    showToast(state.error, { type: "error" });
  } finally {
    state.isSubmitting = false;
          render(root, context, state);
  }
}

function normalizePath(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  if (!value.startsWith("/")) {
    return "";
  }

  return value;
}

function emailPlaceholder(role) {
  if (role === "seller") {
    return "seller@projectb.local";
  }

  if (role === "admin") {
    return "admin@projectb.local";
  }

  if (role === "affiliate_admin") {
    return "affiliate@projectb.local";
  }

  return "buyer@projectb.local";
}

function registerEmailPlaceholder(role) {
  return role === "seller" ? "seller-baru@projectb.local" : "buyer-baru@projectb.local";
}

function registerSubmitLabel(role) {
  return role === "seller" ? "Daftar seller" : "Daftar buyer";
}
