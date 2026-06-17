import { createPageLifecycle } from "../../../core/lifecycle.js";
import { Button } from "../../../ui/primitives/button.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { authUxConfig, defaultLoginPath } from "../../../config/authUxConfig.js";
import { googleLoginService } from "../services/googleLoginService.js";

const PAGE_BG = "bg-[radial-gradient(circle_at_10%_0%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_90%_8%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#f7fbf9,#fff7ed_52%,#eef7f3)]";

export function GoogleLoginPage({ roleSlug } = {}) {
  let root = null;
  const config = googleLoginService.configForSlug(roleSlug);
  const state = {
    loading: true,
    submitting: false,
    status: null,
    error: "",
  };

  return createPageLifecycle({
    bootstrap() {
      state.loading = true;
      state.submitting = false;
      state.status = null;
      state.error = "";
    },
    mount(context) {
      root = document.createElement("main");
      root.className = `min-h-screen ${PAGE_BG} px-4 py-8 sm:px-6 lg:px-10`;
      render(root, context, config, state);
      return root;
    },
    async hydrate(context) {
  if (!config) {
    context.router.navigate(defaultLoginPath("buyer"));
    return;
  }

      try {
        state.status = await googleLoginService.status();
      } catch (error) {
        state.error = error.message || "Status Google Login gagal diambil.";
      } finally {
        state.loading = false;
        render(root, context, config, state);
      }
    },
  });
}

function render(root, context, config, state) {
  if (!root || !config) {
    return;
  }

  const wrap = document.createElement("section");
  wrap.className = "mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center";

  const panel = document.createElement("div");
  panel.id = `google_login_${config.slug}_panel`;
  panel.className = "grid gap-6 overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[0_34px_100px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-8 lg:grid-cols-[1.1fr_0.9fr]";

  const hero = document.createElement("div");
  hero.className = "grid content-center gap-5";
  hero.append(header(config), rolePolicyCard(config));

  const action = document.createElement("div");
  action.className = "grid content-center gap-4 rounded-[1.5rem] bg-white/72 p-4 ring-1 ring-gray-100 sm:p-5";
  action.append(actionContent(root, context, config, state));

  panel.append(hero, action);
  wrap.append(panel);
  root.replaceChildren(wrap);
}

function header(config) {
  const headerEl = document.createElement("header");
  headerEl.className = "grid gap-3";

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-xs font-black uppercase tracking-[0.18em] text-orange-700";
  eyebrow.textContent = "Google OAuth";

  const title = document.createElement("h1");
  title.id = `google_login_${config.slug}_title`;
  title.className = "text-3xl font-black tracking-[-0.04em] text-gray-950 sm:text-4xl";
  title.textContent = config.title;

  const subtitle = document.createElement("p");
  subtitle.className = "max-w-xl text-sm leading-7 text-gray-600 sm:text-base";
  subtitle.textContent = config.subtitle;

  headerEl.append(eyebrow, title, subtitle);
  return headerEl;
}

function rolePolicyCard(config) {
  const card = document.createElement("div");
  card.className = "rounded-3xl border border-orange-100 bg-orange-50/80 p-4 text-sm leading-6 text-gray-700";
  card.textContent = config.warning;
  return card;
}

function actionContent(root, context, config, state) {
  const fragment = document.createDocumentFragment();

  if (state.loading) {
    const loading = document.createElement("p");
    loading.className = "text-sm text-gray-600";
    loading.textContent = "Memeriksa konfigurasi Google Login...";
    fragment.append(loading);
    return fragment;
  }

  if (state.error) {
    fragment.append(messageBox(state.error, "error"));
  }

  if (!config.googleEnabled) {
    fragment.append(messageBox("Marketing tetap menggunakan login user/password.", "info"));
    if (authUxConfig.showLegacyLoginLinks) {
      fragment.append(navButton("Buka Login Marketing", () => context.router.navigate("/login/affiliate")));
    }
    return fragment;
  }

  if (!state.status?.enabled) {
    fragment.append(messageBox("Google Login belum dikonfigurasi.", "info"));
    if (authUxConfig.showLegacyLoginLinks) {
      fragment.append(navButton("Kembali ke login existing", () => context.router.navigate("/auth")));
    }
    return fragment;
  }

  const button = Button({
    label: state.submitting ? "Membuka Google..." : "Login",
    variant: "primary",
    disabled: state.submitting,
    onClick: () => beginGoogleLogin(root, context, config, state),
  });
  button.id = `google_login_${config.slug}_button`;
  button.classList.add("w-full", "justify-center", "shadow-[0_16px_34px_rgba(234,88,12,0.24)]");

  const note = document.createElement("p");
  note.className = "text-xs leading-5 text-gray-500";
  note.textContent = "Credential Google diproses backend. Client secret tidak pernah dikirim ke frontend.";

  fragment.append(button, note);
  if (authUxConfig.showLegacyLoginLinks) {
    fragment.append(navButton("Kembali ke login existing", () => context.router.navigate(`/login/${config.slug}`), "secondary"));
  }
  return fragment;
}

async function beginGoogleLogin(root, context, config, state) {
  state.submitting = true;
  render(root, context, config, state);

  try {
    const authUrl = await googleLoginService.begin(config);
    window.location.assign(authUrl);
  } catch (error) {
    state.error = error.message || "Google Login gagal dimulai.";
    state.submitting = false;
    showToast(state.error, { type: "error", key: `google-login-${config.slug}-error`, dedupeMs: 3000 });
    render(root, context, config, state);
  }
}

function messageBox(message, type) {
  const box = document.createElement("p");
  box.className = type === "error"
    ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
    : "rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800";
  box.textContent = message;
  return box;
}

function navButton(label, onClick, variant = "primary") {
  const button = Button({ label, variant, onClick });
  button.classList.add("w-full", "justify-center");
  return button;
}
