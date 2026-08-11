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
    const card = Card([], { variant: "raised" });
    card.id = `adm_dashboard_quick_${key}_card`;
    card.className = "group grid gap-4 rounded-[1.5rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(250,244,237,0.66))] p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]";
    const iconWrap = document.createElement("div");
    iconWrap.className = "grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent))] text-white shadow-[0_14px_30px_rgba(30,129,176,0.20)] transition duration-200 group-hover:scale-105";
    iconWrap.append(createIcon(resolveIcon(item.title), { className: "h-5 w-5" }));
    const button = Button({
      label: item.actionLabel,
      variant: "secondary",
      onClick: item.onClick,
    });
    button.id = `adm_dashboard_quick_${key}_button`;
    // Semuanya tombol navigasi -- bukan menyetujui, bukan membatalkan -- jadi
    // ikut peran netral: biru primary, sama seperti tombol Detail di halaman
    // lain. Dulu tiap kartu punya gradien sendiri (biru, oranye, rose, hijau)
    // yang membuat satu baris kartu tampak seperti pelangi.
    button.className = `inline-flex min-h-10 max-w-full w-full items-center justify-center gap-2 break-words rounded-[var(--pb-radius-xl)] border px-4 py-2 text-sm font-bold shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55 ${tw.button.netral}`;
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
