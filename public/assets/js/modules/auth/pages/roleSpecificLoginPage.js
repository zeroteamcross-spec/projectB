import { createPageLifecycle } from "../../../core/lifecycle.js";
import { authStore } from "../../../state/authStore.js";
import { Button } from "../../../ui/primitives/button.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { roleSpecificLoginService } from "../services/roleSpecificLoginService.js";

const AUTH_FALLBACK = "bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#faf4ed,#f8fafc_44%,#eaf4f9)]";

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
  section.className = "relative grid gap-5 overflow-hidden rounded-[2rem] border border-[var(--pb-card-border)] bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl transition duration-300 sm:p-6";

  const iconWrap = document.createElement("div");
  iconWrap.className = "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent))] text-white shadow-[0_16px_40px_rgba(30,129,176,0.28)]";
  iconWrap.append(createIcon(config.icon, { className: "h-6 w-6" }));

  const header = document.createElement("header");
  header.className = "grid gap-1.5 text-center";
  const title = document.createElement("h1");
  title.className = "text-xl font-black tracking-[-0.03em] text-gray-950";
  title.textContent = config.title;
  const subtitle = document.createElement("p");
  subtitle.className = "text-xs leading-6 text-gray-600";
  subtitle.textContent = config.subtitle;
  header.append(title, subtitle);

  const lockNote = document.createElement("p");
  lockNote.className = "rounded-2xl bg-[var(--pb-surface-muted)] px-3 py-2 text-center text-xs leading-6 text-gray-600";
  lockNote.textContent = ``;

  section.append(iconWrap, header, lockNote, loginForm({ config, isSubmitting, error, onSubmit }));
  return section;
}

function loginForm({ config, isSubmitting, error, onSubmit }) {
  const form = document.createElement("form");
  form.className = "grid gap-3";
  form.append(
    field({ id: `role_login_${config.slug}_email_input`, name: "email", label: "Email", type: "email", placeholder: config.emailPlaceholder }),
    field({ id: `role_login_${config.slug}_password_input`, name: "password", label: "Password", type: "password", placeholder: "Password akun" }),
  );

  if (error) {
    const message = document.createElement("p");
    message.id = `role_login_${config.slug}_error`;
    message.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
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

function activeSessionPanel({ config, router }) {
  const currentUser = authStore.user();
  const currentRole = authStore.role();
  const section = document.createElement("section");
  section.id = `role_login_${config.slug}_active_session`;
  section.className = "grid gap-4 rounded-[2rem] border border-[var(--pb-card-border)] bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const header = document.createElement("header");
  header.className = "grid gap-1";
  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[10px] font-black uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Sesi aktif";
  const title = document.createElement("h1");
  title.className = "text-lg font-bold tracking-normal text-gray-950";
  title.textContent = currentUser?.name ?? currentUser?.email ?? "Akun aktif";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
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
  wrap.className = "grid gap-1.5 text-xs font-semibold text-gray-700";
  wrap.textContent = label;

  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = type;
  input.required = true;
  input.placeholder = placeholder;
  input.className = "min-h-11 min-w-0 w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-xs text-gray-950 outline-none transition duration-200 placeholder:text-[var(--pb-text-muted)] focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]";

  wrap.append(input);
  return wrap;
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
    // Router.navigate() only sets location.hash; the actual page swap runs on
    // the next hashchange tick, and can take a while since it waits for the
    // destination role's dashboard data to preload first. Re-rendering this
    // page in the meantime — now authenticated — used to flash the "sesi
    // aktif, sudah login sebagai X" guard panel (mislabeling the role, since
    // this page's own config is stale) right before the real dashboard took
    // over. Leaving this page as-is (still showing "Memproses...") avoids
    // that misleading flash; it disappears the moment the route swap lands.
    return;
  } catch (error) {
    state.error = error.message || "Login gagal.";
    showToast(state.error, {
      type: "error",
      key: `role-login-${config.slug}-error`,
      dedupeMs: 3000,
    });
  }

  state.isSubmitting = false;
  render(root, context, config, state, getBackgroundVideoLayer);
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
