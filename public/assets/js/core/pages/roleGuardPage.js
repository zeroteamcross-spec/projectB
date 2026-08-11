import { createPageLifecycle } from "../lifecycle.js";
import { Button } from "../../ui/primitives/button.js";
import { EmptyState } from "../../ui/primitives/emptyState.js";
import { createIcon } from "../../theme/iconRegistry.js";
import { cx, tw } from "../../theme/tailwindClasses.js";

export function RoleGuardPage(config = {}) {
  return createPageLifecycle({
    mount(context) {
      return renderRoleGuardPage(config, context);
    },
  });
}

function renderRoleGuardPage(config, context) {
  const root = document.createElement("div");
  root.className = tw.layout.pageFrame;

  const shell = document.createElement("section");
  shell.className = "grid gap-6 py-6 md:py-10";

  const hero = document.createElement("div");
  hero.className = "grid gap-3";

  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = config.eyebrow ?? "Akses dibatasi";

  const title = document.createElement("h1");
  title.className = tw.text.title;
  title.textContent = config.title ?? "Halaman ini membutuhkan level user yang berbeda.";

  const body = document.createElement("p");
  body.className = `max-w-2xl text-xs leading-6 md:text-sm ${tw.text.muted}`;
  body.textContent = config.description ?? "Buka area yang sesuai dengan akun Anda untuk melanjutkan.";

  hero.append(eyebrow, title, body);

  const panel = document.createElement("div");
  panel.className = cx(tw.surface.raisedCard, "grid gap-4 p-5 md:p-6");

  const state = EmptyState({
    title: config.stateTitle ?? "Level User tidak sesuai",
    description: config.stateDescription ?? "",
  });

  const stateIcon = document.createElement("div");
  stateIcon.className = cx(tw.layout.featureIcon, "mx-auto mb-3 h-12 w-12 rounded-full");
  stateIcon.append(createIcon("brandMark", { className: "h-6 w-6" }));
  state.prepend(stateIcon);

  const actions = document.createElement("div");
  actions.className = "grid gap-3 sm:flex sm:flex-wrap";

  (config.actions ?? []).forEach((action) => {
    const button = Button({
      label: action.label,
      variant: action.variant ?? "primary",
      onClick: () => context.router.navigate(action.path),
    });
    button.classList.add("w-full", "sm:w-auto");
    actions.append(button);
  });

  panel.append(state);

  if (actions.childElementCount) {
    panel.append(actions);
  }

  shell.append(hero, panel);
  root.append(shell);
  return root;
}
