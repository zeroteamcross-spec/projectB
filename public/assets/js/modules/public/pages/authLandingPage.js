import { createPageLifecycle } from "../../../core/lifecycle.js";
import { authStore } from "../../../state/authStore.js";
import { Button } from "../../../ui/primitives/button.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { cx, tw } from "../../../theme/tailwindClasses.js";
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
const AUTH_FALLBACK = "bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#fffaf4,#f8fafc_44%,#eef7f3)]";

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
      return root;
    },
    hydrate(context) {
      render(root, context, state, getBackgroundVideoLayer);
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

  const currentUser = authStore.user();
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
    right.append(authenticatedPanel({
      currentUser,
      currentRole,
      selectedRole: state.selectedRole,
      requestedPath,
      router: context.router,
      onLogout: async () => {
        state.isSubmitting = true;
        state.error = "";
        render(root, context, state);

        try {
          await publicAuthLandingService.logout();
          showToast("Logout berhasil.", { type: "success" });
        } catch (error) {
          state.error = error.message || "Logout gagal.";
          showToast(state.error, { type: "error" });
        } finally {
          state.isSubmitting = false;
          render(root, context, state);
        }
      },
    }));
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
    }));
  }

  frame.append(left, right);
  const backgroundLayer = getBackgroundVideoLayer?.() ?? state.getBackgroundVideoLayer?.();
  root.replaceChildren(...[backgroundLayer, frame].filter(Boolean));
  runEntranceAnimation(frame);
}

function backToLandingButton(router) {
  const button = Button({
    label: "Kembali ke landing page",
    variant: "secondary",
    onClick: () => router.navigate("/"),
  });
  button.id = "hr_auth_back_landing_button";
  button.classList.add("justify-self-start", "rounded-full", "bg-green/75", "px-4", "shadow-sm", "backdrop-blur", "transition", "duration-200", "hover:-translate-y-0.5");
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
  mark.className = "grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent))] text-lg font-black text-white shadow-[0_16px_40px_rgba(234,88,12,0.28)] transition duration-200 hover:scale-[1.02]";
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
      ? "group grid gap-3 rounded-[1.35rem] border border-orange-200 bg-white/90 p-4 text-left shadow-[0_18px_45px_rgba(234,88,12,0.16)] ring-2 ring-orange-100 transition duration-200 hover:-translate-y-0.5"
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
      ? "w-fit rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700"
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
  section.append(header, authModeTabs({ activeMode, canRegister, onModeChange }));

  if (!canRegister) {
    const note = document.createElement("p");
    note.className = "rounded-2xl bg-orange-50/80 px-3 py-2 text-sm leading-6 text-gray-600";
    note.textContent = "Role ini memakai akun dari admin.";
    section.append(note);
  }

  section.append(activeMode === "register"
    ? registerForm({ selectedRole, isSubmitting, error, onSubmit: onRegister })
    : loginForm({ selectedRole, isSubmitting, error, onSubmit: onLogin }));

  return section;
}

function authModeTabs({ activeMode, canRegister, onModeChange }) {
  const tabs = document.createElement("div");
  tabs.className = "grid grid-cols-2 gap-1 rounded-2xl border border-gray-100 bg-gray-100/80 p-1";
  tabs.append(
    authModeButton("login", "Masuk", activeMode, false, onModeChange),
    authModeButton("register", "Daftar", activeMode, !canRegister, onModeChange),
  );
  return tabs;
}

function authModeButton(value, label, activeMode, disabled, onModeChange) {
  const button = document.createElement("button");
  button.id = `hr_auth_tab_${value}_button`;
  button.type = "button";
  button.disabled = disabled;
  button.className = value === activeMode
    ? "rounded-xl bg-white px-3 py-2.5 text-sm font-black text-gray-950 shadow-sm transition duration-200"
    : cx("rounded-xl px-3 py-2.5 text-sm font-bold text-gray-500 transition duration-200 hover:bg-white/70 hover:text-gray-800", disabled ? "cursor-not-allowed opacity-45 hover:bg-transparent" : "");
  button.textContent = label;
  button.addEventListener("click", () => {
    if (!disabled) {
      onModeChange?.(value);
    }
  });
  return button;
}

function loginForm({ selectedRole, isSubmitting, error, onSubmit }) {
  const form = document.createElement("form");
  form.className = "grid gap-3";
  form.append(
    field({ id: `hr_auth_login_${selectedRole}_email_input`, name: "email", label: "Email", type: "email", placeholder: emailPlaceholder(selectedRole) }),
    field({ id: `hr_auth_login_${selectedRole}_password_input`, name: "password", label: "Password", type: "password", placeholder: "Password akun" }),
    rememberField(),
  );

  if (error) {
    const message = document.createElement("p");
    message.className = "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700";
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
  submit.classList.add("w-full", "shadow-[0_16px_34px_rgba(234,88,12,0.24)]", "transition", "duration-200", "hover:-translate-y-0.5", "active:translate-y-0");
  form.append(submit);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    onSubmit?.({
      email: data.email,
      password: data.password,
      remember: data.remember === "on",
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
    message.className = "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700";
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
  submit.classList.add("w-full", "shadow-[0_16px_34px_rgba(234,88,12,0.24)]", "transition", "duration-200", "hover:-translate-y-0.5", "active:translate-y-0");
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

function authenticatedPanel({ currentUser, currentRole, selectedRole, requestedPath, router, onLogout }) {
  const section = document.createElement("section");
  section.id = "hr_auth_session_section";
  section.className = "grid gap-4 rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const header = document.createElement("div");
  header.className = "grid gap-1";

  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Sesi aktif";

  const title = document.createElement("h2");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = currentUser?.name ?? currentUser?.email ?? "Akun aktif";

  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = requestedPath
    ? `Anda sudah masuk sebagai ${currentRole}. Gunakan dashboard yang sesuai atau logout untuk berganti akun.`
    : `Anda sudah masuk sebagai ${currentRole}.`;

  header.append(eyebrow, title, body);

  const facts = document.createElement("div");
  facts.className = `grid gap-2 ${tw.surface.insetGrid}`;
  facts.append(
    infoRow("Role aktif", currentRole),
    infoRow("Role dipilih", selectedRole),
    infoRow("Route asal", requestedPath || "-"),
  );

  const actions = document.createElement("div");
  actions.className = "grid gap-2 sm:grid-cols-2";

  const dashboard = Button({
    label: "Buka dashboard",
    variant: "primary",
    onClick: () => router.navigate(publicAuthLandingService.resolveAfterLogin({
      selectedRole,
      actualRole: currentRole,
      fromPath: requestedPath,
    })),
  });
  dashboard.id = "hr_auth_session_dashboard_button";
  dashboard.classList.add("w-full");

  const logout = Button({
    label: "Logout",
    variant: "secondary",
    onClick: onLogout,
  });
  logout.id = "hr_auth_session_logout_button";
  logout.classList.add("w-full");

  actions.append(dashboard, logout);
  section.append(header, facts, actions);
  return section;
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
  input.className = "min-h-11 min-w-0 w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100";

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
  input.className = "min-h-24 min-w-0 w-full resize-y rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100";

  wrap.append(input);
  return wrap;
}

function rememberField() {
  const label = document.createElement("label");
  label.className = "inline-flex items-center gap-2 text-sm font-medium text-gray-600";

  const input = document.createElement("input");
  input.id = "hr_auth_login_remember_input";
  input.type = "checkbox";
  input.name = "remember";
  input.checked = true;
  input.className = "h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-200";

  label.append(input, document.createTextNode("Ingat saya di perangkat ini"));
  return label;
}

function infoRow(label, value) {
  const row = document.createElement("div");
  row.className = "flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2";

  const caption = document.createElement("span");
  caption.className = "text-gray-500";
  caption.textContent = label;

  const content = document.createElement("span");
  content.className = "text-right font-semibold text-gray-900";
  content.textContent = value;

  row.append(caption, content);
  return row;
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
  } catch (error) {
    state.error = error.message || "Login gagal.";
    showToast(state.error, {
      type: "error",
      key: "auth-login-error",
      dedupeMs: 3000,
    });
  } finally {
    state.isSubmitting = false;
          render(root, context, state);
  }
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
