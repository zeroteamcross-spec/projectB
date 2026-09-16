import { createPageLifecycle } from "../lifecycle.js";
import { Button } from "../../ui/primitives/button.js";
import { EmptyState } from "../../ui/primitives/emptyState.js";
import { createIcon } from "../../theme/iconRegistry.js";
import { cx, tw } from "../../theme/tailwindClasses.js";

/**
 * Halaman 404 generik untuk dipakai di dalam shell area (admin, seller,
 * buyer, affiliate) saat path tidak cocok dengan rute mana pun milik area
 * tersebut. Dipakai supaya path yang salah tetap tampil dengan sidebar dan
 * header area, bukan diam-diam jatuh ke halaman publik.
 */
export function NotFoundPage(config = {}) {
  return createPageLifecycle({
    mount(context) {
      return renderNotFoundPage(config, context);
    },
  });
}

function renderNotFoundPage(config, context) {
  const root = document.createElement("div");
  root.className = tw.layout.pageFrame;

  const shell = document.createElement("section");
  shell.className = "grid gap-6 py-6 md:py-10";

  const hero = document.createElement("div");
  hero.className = "grid gap-3";

  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = config.eyebrow ?? "404";

  const title = document.createElement("h1");
  title.className = tw.text.title;
  title.textContent = config.title ?? "Halaman tidak ditemukan";

  const body = document.createElement("p");
  body.className = `max-w-2xl text-sm leading-6 md:text-base ${tw.text.muted}`;
  body.textContent = config.description
    ?? "Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.";

  hero.append(eyebrow, title, body);

  const panel = document.createElement("div");
  panel.className = cx(tw.surface.raisedCard, "grid gap-4 p-5 md:p-6");

  const state = EmptyState({
    title: config.stateTitle ?? "Halaman tidak ditemukan",
    description: config.stateDescription ?? "",
  });

  const stateIcon = document.createElement("div");
  stateIcon.className = cx(tw.layout.featureIcon, "mx-auto mb-3 h-12 w-12 rounded-full");
  stateIcon.append(createIcon("brandMark", { className: "h-6 w-6" }));
  state.prepend(stateIcon);

  const actions = document.createElement("div");
  actions.className = "grid gap-3 sm:flex sm:flex-wrap";

  const button = Button({
    label: config.backLabel ?? "Kembali ke dashboard",
    variant: "primary",
    onClick: () => context.router.navigate(config.backPath ?? "/"),
  });
  button.classList.add("w-full", "sm:w-auto");
  actions.append(button);

  panel.append(state, actions);
  shell.append(hero, panel);
  root.append(shell);
  return root;
}
