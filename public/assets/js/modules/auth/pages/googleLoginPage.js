import { createPageLifecycle } from "../../../core/lifecycle.js";
import { Button } from "../../../ui/primitives/button.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { authUxConfig, defaultLoginPath } from "../../../config/authUxConfig.js";
import { googleLoginService } from "../services/googleLoginService.js";

const PAGE_BG = "bg-[radial-gradient(circle_at_10%_0%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_90%_8%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#f7fbf9,#fff7ed_52%,#eef7f3)]";
const BUYER_FALLBACK_BG = "bg-[radial-gradient(circle_at_20%_4%,rgba(207,211,255,0.42),transparent_30%),radial-gradient(circle_at_92%_88%,rgba(210,216,255,0.72),transparent_34%),linear-gradient(180deg,#fbfbff_0%,#ffffff_42%,#f2f4ff_100%)]";

export function GoogleLoginPage({ roleSlug } = {}) {
  let root = null;
  let backgroundVideoLayer = null;
  let previousBodyOverflow = "";
  let previousHtmlOverflow = "";
  const config = googleLoginService.configForSlug(roleSlug);
  const state = {
    loading: true,
    submitting: false,
    status: null,
    error: "",
  };
  const isBuyer = config?.slug === "buyer";

  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: "google_login_buyer_background_video_layer",
      fallbackClassName: BUYER_FALLBACK_BG,
      overlayClassName: "bg-white/5",
    });
    return backgroundVideoLayer;
  };

  return createPageLifecycle({
    bootstrap() {
      state.loading = true;
      state.submitting = false;
      state.status = null;
      state.error = "";
    },
    mount(context) {
      if (isBuyer) {
        previousBodyOverflow = document.body.style.overflow;
        previousHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      }

      root = document.createElement("main");
      root.className = isBuyer
        ? "relative isolate min-h-screen overflow-hidden bg-transparent"
        : `min-h-screen ${PAGE_BG} px-4 py-8 sm:px-6 lg:px-10`;
      render(root, context, config, state, isBuyer ? getBackgroundVideoLayer : null);
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
        render(root, context, config, state, isBuyer ? getBackgroundVideoLayer : null);
      }
    },
    dispose() {
      if (isBuyer) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
    },
  });
}

function render(root, context, config, state, getBackgroundVideoLayer = null) {
  if (!root || !config) {
    return;
  }

  if (config.slug === "buyer") {
    renderBuyer(root, context, config, state, getBackgroundVideoLayer);
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

function renderBuyer(root, context, config, state, getBackgroundVideoLayer) {
  const frame = document.createElement("section");
  frame.id = "google_login_buyer_panel";
  frame.className = "relative z-10 mx-auto grid min-h-screen w-full max-w-[400px] content-center overflow-hidden px-5 py-5 text-center sm:px-6 lg:mx-0 lg:ml-auto lg:mr-[8vw] lg:max-w-[420px]";

  const topWave = document.createElement("span");
  topWave.className = "hidden pointer-events-none absolute -left-20 top-28 h-44 w-[calc(100%+10rem)] rounded-[50%] bg-white/70 blur-sm";

  const bottomWave = document.createElement("span");
  bottomWave.className = "hidden pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[150%] -translate-x-1/2 rounded-[50%] bg-[#dfe3ff]/70 blur-[1px]";

  const bottomWaveDeep = document.createElement("span");
  bottomWaveDeep.className = "hidden pointer-events-none absolute -bottom-36 left-0 h-52 w-[120%] rounded-[50%] bg-[#cdd3ff]/60";

  const content = document.createElement("div");
  content.className = "relative z-10 grid justify-items-center gap-4 rounded-[1.5rem] border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(214,220,235,0.42)_42%,rgba(244,247,252,0.62)_100%)] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_22px_60px_rgba(18,24,45,0.18)] backdrop-blur-xl sm:px-6 sm:py-7";
  content.append(appIcon(), buyerHeader(), buyerActionContent(root, context, config, state));

  frame.append(topWave, bottomWave, bottomWaveDeep, plantDecor("left"), plantDecor("right"), content, homeIndicator());
  const backgroundLayer = getBackgroundVideoLayer?.();
  root.replaceChildren(...[backgroundLayer, frame].filter(Boolean));
}

function appIcon() {
  const wrap = document.createElement("div");
  wrap.className = " hidden grid h-16 w-16 place-items-center rounded-[1.15rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(203,210,230,0.54))] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_34px_rgba(84,92,170,0.16)] backdrop-blur-xl";

  const mark = document.createElement("span");
  mark.className = "relative block h-8 w-8";

  const left = document.createElement("span");
  left.className = "absolute bottom-0.5 left-1 h-6 w-5 rounded-bl-full rounded-tr-full bg-[#6657ff] shadow-[0_12px_24px_rgba(102,87,255,0.26)]";

  const right = document.createElement("span");
  right.className = "absolute bottom-0.5 right-1 h-6 w-5 rounded-br-full rounded-tl-full bg-[#9aa1ff]/95 shadow-[0_12px_24px_rgba(154,161,255,0.24)]";

  const dot = document.createElement("span");
  dot.className = "absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-[#b8bdff]";

  mark.append(left, right, dot);
  wrap.append(mark);
  return wrap;
}

function buyerHeader() {
  const headerEl = document.createElement("header");
  headerEl.className = "grid max-w-[320px] gap-2.5";

  const title = document.createElement("h1");
  title.id = "google_login_buyer_title";
  title.className = "text-[1.95rem] font-black leading-[1.04] tracking-normal text-[#11142d] sm:text-[2.2rem]";
  title.textContent = "Selamat datang!";

  const subtitle = document.createElement("p");
  subtitle.className = "text-sm font-medium leading-6 tracking-normal text-black sm:text-base sm:leading-7";
  subtitle.textContent = "Masuk untuk melanjutkan dan nikmati pengalaman terbaik.";

  headerEl.append(title, subtitle);
  return headerEl;
}

function buyerActionContent(root, context, config, state) {
  const fragment = document.createDocumentFragment();
  const actionWrap = document.createElement("div");
  actionWrap.className = "grid w-full max-w-[310px] gap-4";

  if (state.loading) {
    const loading = document.createElement("p");
    loading.className = "rounded-[1.5rem] border border-white/75 bg-white/70 px-5 py-4 text-sm font-semibold text-[#717693] shadow-[0_18px_48px_rgba(84,92,170,0.10)] backdrop-blur";
    loading.textContent = "Memeriksa konfigurasi Google Login...";
    actionWrap.append(loading);
    fragment.append(actionWrap);
    return fragment;
  }

  if (state.error) {
    actionWrap.append(messageBox(state.error, "error"));
  }

  if (!state.status?.enabled) {
    actionWrap.append(messageBox("Google Login belum dikonfigurasi.", "info"));
    fragment.append(actionWrap);
    return fragment;
  }

  const button = document.createElement("button");
  button.id = "google_login_buyer_button";
  button.type = "button";
  button.disabled = state.submitting;
  button.className = "inline-flex min-h-12 w-full items-center justify-center gap-3.5 rounded-[1rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(216,222,236,0.58))] px-4 text-sm font-black tracking-normal text-[#171a35] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_14px_30px_rgba(84,92,170,0.13)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#dfe3ff] disabled:cursor-wait disabled:opacity-70";
  button.append(googleGlyph(), document.createTextNode(state.submitting ? "Membuka Google..." : "Login dengan Google"));
  button.addEventListener("click", () => beginGoogleLogin(root, context, config, state));

  actionWrap.append(button, divider());
  fragment.append(actionWrap);
  return fragment;
}

function googleGlyph() {
  const glyph = document.createElement("span");
  glyph.className = "grid h-8 w-8 shrink-0 place-items-center text-[1.7rem] font-black leading-none";
  glyph.textContent = "G";
  glyph.style.background = "conic-gradient(from -45deg,#4285f4 0 25%,#34a853 0 50%,#fbbc05 0 75%,#ea4335 0 100%)";
  glyph.style.setProperty("-webkit-background-clip", "text");
  glyph.style.setProperty("background-clip", "text");
  glyph.style.color = "transparent";
  return glyph;
}

function divider() {
  const wrap = document.createElement("div");
  wrap.className = "grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-sm font-medium text-[#b2b5cc]";

  const left = document.createElement("span");
  left.className = "h-px bg-[#dfe2ee]";
  const text = document.createElement("span");
  text.textContent = "";
  const right = document.createElement("span");
  right.className = "h-px bg-[#dfe2ee]";

  wrap.append(left, text, right);
  return wrap;
}

function plantDecor(side) {
  const root = document.createElement("span");
  root.className = side === "left"
    ? "hidden pointer-events-none absolute bottom-14 left-0 z-10 h-48 w-28 opacity-55"
    : "hidden pointer-events-none absolute bottom-10 right-0 z-10 h-40 w-24 opacity-55";

  const stem = document.createElement("span");
  stem.className = side === "left"
    ? "absolute bottom-0 left-5 h-44 w-px -rotate-[24deg] bg-[#aab0f6]"
    : "absolute bottom-0 right-5 h-36 w-px rotate-[24deg] bg-[#aab0f6]";
  root.append(stem);

  for (let index = 0; index < 5; index += 1) {
    const leaf = document.createElement("span");
    const isLeftSide = (index + (side === "left" ? 0 : 1)) % 2 === 0;
    leaf.className = "absolute h-10 w-5 rounded-[100%_0_100%_0] bg-[#b8bdff]";
    leaf.style.bottom = `${index * 28 + 6}px`;
    leaf.style[side === "left" ? "left" : "right"] = `${isLeftSide ? 10 : 46}px`;
    leaf.style.transform = `rotate(${isLeftSide ? -42 : 42}deg)`;
    root.append(leaf);
  }

  return root;
}

function homeIndicator() {
  const bar = document.createElement("span");
  bar.className = "absolute bottom-4 left-1/2 z-20 h-1.5 w-36 -translate-x-1/2 rounded-full bg-black/80 sm:hidden";
  bar.setAttribute("aria-hidden", "true");
  return bar;
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
    label: state.submitting ? "Membuka Google..." : `Login dengan Google sebagai ${config.label}`,
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
  render(root, context, config, state, config.slug === "buyer" ? () => document.getElementById("google_login_buyer_background_video_layer") : null);

  try {
    const authUrl = await googleLoginService.begin(config);
    window.location.assign(authUrl);
  } catch (error) {
    state.error = error.message || "Google Login gagal dimulai.";
    state.submitting = false;
    showToast(state.error, { type: "error", key: `google-login-${config.slug}-error`, dedupeMs: 3000 });
    render(root, context, config, state, config.slug === "buyer" ? () => document.getElementById("google_login_buyer_background_video_layer") : null);
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
