import { tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../../theme/designStudioHooks.js";

export function EmptyState({ title = "Data belum tersedia", description = "", action = null, designHook = "shared.state.empty" } = {}) {
  const node = document.createElement("div");
  node.className = `${tw.emptyState} relative overflow-hidden`;
  applyDesignHook(node, designHook);

  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute left-1/2 top-0 h-24 w-36 -translate-x-1/2 rounded-full bg-gradient-to-br from-[color-mix(in_srgb,var(--pb-brand-accent)_45%,white)] via-transparent to-transparent blur-2xl";

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Status";

  const heading = document.createElement("strong");
  heading.className = "mt-2 block text-base text-gray-800";
  heading.textContent = title;
  node.append(glow, eyebrow, heading);

  if (description) {
    const text = document.createElement("p");
    text.className = "mt-2 text-sm leading-6";
    text.textContent = description;
    node.append(text);
  }

  if (action) {
    const actions = document.createElement("div");
    actions.className = "mt-4 flex justify-center";
    actions.append(action);
    node.append(actions);
  }

  return node;
}
