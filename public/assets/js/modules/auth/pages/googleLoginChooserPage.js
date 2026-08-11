import { createPageLifecycle } from "../../../core/lifecycle.js";
import { Button } from "../../../ui/primitives/button.js";
import { googleLoginService } from "../services/googleLoginService.js";

const PAGE_BG = "bg-[radial-gradient(circle_at_8%_6%,color-mix(in_srgb,var(--pb-brand-primary)_16%,transparent),transparent_32%),radial-gradient(circle_at_88%_14%,color-mix(in_srgb,var(--pb-brand-accent)_14%,transparent),transparent_30%),linear-gradient(135deg,#f8fafc,#faf4ed_52%,#eaf4f9)]";

export function GoogleLoginChooserPage() {
  let root = null;

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("main");
      root.className = `min-h-screen ${PAGE_BG} px-4 py-8 sm:px-6 lg:px-10`;
      render(root, context);
      return root;
    },
  });
}

function render(root, context) {
  const wrap = document.createElement("section");
  wrap.className = "mx-auto grid min-h-[calc(100vh-4rem)] max-w-4xl content-center gap-6";

  const header = document.createElement("header");
  header.className = "grid gap-3 text-center";

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Login utama";

  const title = document.createElement("h1");
  title.className = "text-2xl font-black tracking-[-0.04em] text-gray-950 sm:text-3xl";
  title.textContent = "Pilih Google Login";

  const body = document.createElement("p");
  body.className = "mx-auto max-w-2xl text-xs leading-7 text-gray-600 sm:text-sm";
  body.textContent = "Gunakan halaman Google Login sesuai role akun. Login lama tetap tersedia hanya lewat URL manual untuk kebutuhan darurat.";

  header.append(eyebrow, title, body);

  const grid = document.createElement("div");
  grid.className = "grid gap-4 sm:grid-cols-2";

  googleLoginService.routes().forEach((config) => {
    grid.append(roleCard(context, config));
  });

  wrap.append(header, grid);
  root.replaceChildren(wrap);
}

function roleCard(context, config) {
  const card = document.createElement("article");
  card.id = `google_login_chooser_${config.slug}_card`;
  card.className = "grid gap-4 rounded-[1.75rem] border border-white/80 bg-white/84 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl";

  const title = document.createElement("h2");
  title.className = "text-lg font-black tracking-[-0.03em] text-gray-950";
  title.textContent = config.label;

  const body = document.createElement("p");
  body.className = "min-h-[3rem] text-xs leading-6 text-gray-600";
  body.textContent = config.googleEnabled ? config.subtitle : "Marketing tetap menggunakan login user/password.";

  const button = Button({
    label: config.googleEnabled ? `Google Login ${config.label}` : "Buka Policy Marketing",
    variant: config.googleEnabled ? "primary" : "secondary",
    onClick: () => context.router.navigate(`/google-login/${config.slug}`),
  });
  button.id = `google_login_chooser_${config.slug}_button`;
  button.classList.add("w-full", "justify-center");

  card.append(title, body, button);
  return card;
}
