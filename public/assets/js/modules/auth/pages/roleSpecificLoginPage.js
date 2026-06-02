import { createPageLifecycle } from "../../../core/lifecycle.js";
import { authStore } from "../../../state/authStore.js";
import { Button } from "../../../ui/primitives/button.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { roleSpecificLoginService } from "../services/roleSpecificLoginService.js";

const AUTH_FALLBACK = "bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#fffaf4,#f8fafc_44%,#eef7f3)]";

export function RoleSpecificLoginPage({ roleSlug } = {}) {
  let root = null;
  let backgroundVideoLayer = null;
  const config = roleSpecificLoginService.configForSlug(roleSlug);
  const state = {
    isSubmitting: false,
    error: "",
  };

  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: `auth_${roleSlug}_background_video_layer`,
      fallbackClassName: AUTH_FALLBACK,
      overlayClassName: "bg-white/42",
    });
    return backgroundVideoLayer;
  };

  return createPageLifecycle({
    bootstrap() {
      state.isSubmitting = false;
      state.error = "";
    },
    mount(context) {
      root = document.createElement("div");
      root.className = "relative isolate min-h-screen overflow-hidden bg-transparent";
      render(root, context, config, state, getBackgroundVideoLayer);
      return root;
    },
    hydrate(context) {
      render(root, context, config, state, getBackgroundVideoLayer);
    },
    dispose() {
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
    },
  });
}

function render(root, context, config, state, getBackgroundVideoLayer) {
  if (!root) {
    return;
  }

  if (!config) {
    context.router.navigate("/auth");
    return;
  }

  const frame = document.createElement("main");
  frame.id = `role_login_${config.slug}_frame`;
  frame.className = "relative z-10 mx-auto grid min-h-screen w-full items-center justify-items-center px-4 py-6 sm:px-6 sm:py-10 lg:justify-items-end lg:px-10";

  const panelWrap = document.createElement("aside");
  panelWrap.className = "grid w-full max-w-[460px] gap-4";
  panelWrap.append(backToLandingButton(context.router));

  if (authStore.isAuthenticated()) {
    panelWrap.append(activeSessionPanel({ config, router: context.router }));
  } else {
    panelWrap.append(loginPanel({
      config,
      isSubmitting: state.isSubmitting,
      error: state.error,
      onSubmit: (payload) => submitRoleLogin(payload, context, config, state, root, getBackgroundVideoLayer),
    }));
  }

  frame.append(panelWrap);
  root.replaceChildren(getBackgroundVideoLayer(), frame);
  runEntranceAnimation(frame);
}

function backToLandingButton(router) {
  const button = Button({
    label: "Kembali ke landing page",
    variant: "secondary",
    onClick: () => router.navigate("/"),
  });
  button.id = "role_login_back_landing_button";
  button.classList.add("justify-self-start", "rounded-full", "bg-green/75", "px-4", "shadow-sm", "backdrop-blur", "transition", "duration-200", "hover:-translate-y-0.5");
  return button;
}

function loginPanel({ config, isSubmitting, error, onSubmit }) {
  const section = document.createElement("section");
  section.id = `role_login_${config.slug}_panel`;
  section.className = "relative grid gap-5 overflow-hidden rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl transition duration-300 sm:p-6";

  const iconWrap = document.createElement("div");
  iconWrap.className = "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent))] text-white shadow-[0_16px_40px_rgba(234,88,12,0.28)]";
  iconWrap.append(createIcon(config.icon, { className: "h-6 w-6" }));

  const header = document.createElement("header");
  header.className = "grid gap-1.5 text-center";
  const title = document.createElement("h1");
  title.className = "text-2xl font-black tracking-[-0.03em] text-gray-950";
  title.textContent = config.title;
  const subtitle = document.createElement("p");
  subtitle.className = "text-sm leading-6 text-gray-600";
  subtitle.textContent = config.subtitle;
  header.append(title, subtitle);

  const lockNote = document.createElement("p");
  lockNote.className = "rounded-2xl bg-orange-50/80 px-3 py-2 text-center text-sm leading-6 text-gray-600";
  lockNote.textContent = `Halaman ini hanya menerima akun ${config.label}.`;

  section.append(iconWrap, header, lockNote, loginForm({ config, isSubmitting, error, onSubmit }));
  return section;
}

function loginForm({ config, isSubmitting, error, onSubmit }) {
  const form = document.createElement("form");
  form.className = "grid gap-3";
  form.append(
    field({ id: `role_login_${config.slug}_email_input`, name: "email", label: "Email", type: "email", placeholder: config.emailPlaceholder }),
    field({ id: `role_login_${config.slug}_password_input`, name: "password", label: "Password", type: "password", placeholder: "Password akun" }),
    rememberField(config.slug),
  );

  if (error) {
    const message = document.createElement("p");
    message.id = `role_login_${config.slug}_error`;
    message.className = "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700";
    message.textContent = error;
    form.append(message);
  }

  const submit = Button({
    label: isSubmitting ? "Memproses..." : config.subtitle,
    variant: "primary",
    disabled: isSubmitting,
  });
  submit.id = `role_login_${config.slug}_submit_button`;
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

function activeSessionPanel({ config, router }) {
  const currentUser = authStore.user();
  const currentRole = authStore.role();
  const section = document.createElement("section");
  section.id = `role_login_${config.slug}_active_session`;
  section.className = "grid gap-4 rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const header = document.createElement("header");
  header.className = "grid gap-1";
  const eyebrow = document.createElement("p");
  eyebrow.className = "text-xs font-black uppercase tracking-normal text-orange-700";
  eyebrow.textContent = "Sesi aktif";
  const title = document.createElement("h1");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = currentUser?.name ?? currentUser?.email ?? "Akun aktif";
  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = currentRole === config.role
    ? `Anda sudah masuk sebagai ${config.label}.`
    : `Anda sedang masuk sebagai ${roleLabel(currentRole)}. Logout dari profil sebelum masuk sebagai ${config.label}.`;
  header.append(eyebrow, title, body);

  const dashboard = Button({
    label: currentRole === config.role ? "Buka dashboard" : "Buka dashboard aktif",
    variant: "primary",
    onClick: () => router.navigate(currentRole === config.role ? config.home : roleSpecificLoginService.configForRole(currentRole).home),
  });
  dashboard.id = `role_login_${config.slug}_session_dashboard_button`;
  dashboard.classList.add("w-full");

  section.append(header, dashboard);
  return section;
}

function field({ id, name, label, type = "text", placeholder = "" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1.5 text-sm font-semibold text-gray-700";
  wrap.textContent = label;

  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = type;
  input.required = true;
  input.placeholder = placeholder;
  input.className = "min-h-11 min-w-0 w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100";

  wrap.append(input);
  return wrap;
}

function rememberField(slug) {
  const label = document.createElement("label");
  label.className = "inline-flex items-center gap-2 text-sm font-medium text-gray-600";

  const input = document.createElement("input");
  input.id = `role_login_${slug}_remember_input`;
  input.type = "checkbox";
  input.name = "remember";
  input.checked = true;
  input.className = "h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-200";

  label.append(input, document.createTextNode("Ingat saya di perangkat ini"));
  return label;
}

async function submitRoleLogin(payload, context, config, state, root, getBackgroundVideoLayer) {
  state.isSubmitting = true;
  state.error = "";
  render(root, context, config, state, getBackgroundVideoLayer);

  try {
    const result = await roleSpecificLoginService.login(config, payload);
    showToast(`Login ${config.label} berhasil.`, {
      type: "success",
      key: `role-login-${config.slug}-success`,
      dedupeMs: 3000,
    });
    context.router.navigate(result.target);
  } catch (error) {
    state.error = error.message || "Login gagal.";
    showToast(state.error, {
      type: "error",
      key: `role-login-${config.slug}-error`,
      dedupeMs: 3000,
    });
  } finally {
    state.isSubmitting = false;
    render(root, context, config, state, getBackgroundVideoLayer);
  }
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

function roleLabel(role) {
  return roleSpecificLoginService.configForRole(role)?.label ?? role ?? "publik";
}
