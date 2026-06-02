import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AdminDashboardQuickActions({ actions = [] } = {}) {
  const section = document.createElement("section");
  section.id = "adm_dashboard_quick_actions_section";
  section.className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5";

  actions.forEach((item, index) => {
    const key = actionKey(item.title, index);
    const tone = actionTone(item.title, index);
    const card = Card([], { variant: "raised" });
    card.id = `adm_dashboard_quick_${key}_card`;
    card.className = "group grid gap-4 rounded-[1.5rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,247,237,0.66))] p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]";
    const iconWrap = document.createElement("div");
    iconWrap.className = "grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent))] text-white shadow-[0_14px_30px_rgba(234,88,12,0.20)] transition duration-200 group-hover:scale-105";
    iconWrap.append(createIcon(resolveIcon(item.title), { className: "h-5 w-5" }));
    const button = Button({
      label: item.actionLabel,
      variant: "secondary",
      onClick: item.onClick,
    });
    button.id = `adm_dashboard_quick_${key}_button`;
    button.className = `inline-flex min-h-10 max-w-full w-full items-center justify-center gap-2 break-words rounded-[var(--pb-radius-xl)] border border-transparent px-4 py-2 text-sm font-bold text-white shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55 ${tone.button}`;
    button.prepend(createIcon(resolveIcon(item.title), { className: "h-4 w-4 shrink-0" }));
    card.append(
      iconWrap,
      textBlock("text-base font-black text-gray-950", item.title),
      textBlock(`text-sm ${tw.text.muted}`, item.description),
      button,
    );
    section.append(card);
  });

  return section;
}

function actionKey(title = "", index = 0) {
  const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return slug || `action_${index + 1}`;
}

function actionTone(title = "", index = 0) {
  const lower = String(title).toLowerCase();

  if (lower.includes("user")) {
    return { button: "bg-[linear-gradient(135deg,#2563eb,#06b6d4)]" };
  }

  if (lower.includes("approval")) {
    return { button: "bg-[linear-gradient(135deg,#f97316,#f59e0b)]" };
  }

  if (lower.includes("transaksi")) {
    return { button: "bg-[linear-gradient(135deg,#e11d48,#fb7185)]" };
  }

  if (lower.includes("settlement")) {
    return { button: "bg-[linear-gradient(135deg,#059669,#14b8a6)]" };
  }

  const fallback = [
    "bg-[linear-gradient(135deg,#7c3aed,#a855f7)]",
    "bg-[linear-gradient(135deg,#0f766e,#22c55e)]",
  ];

  return { button: fallback[index % fallback.length] };
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}

function resolveIcon(title = "") {
  const lower = String(title).toLowerCase();
  if (lower.includes("user")) {
    return "user";
  }
  if (lower.includes("approval")) {
    return "approval";
  }
  if (lower.includes("transaksi")) {
    return "transaction";
  }
  if (lower.includes("settlement")) {
    return "commission";
  }
  return "dashboard";
}
