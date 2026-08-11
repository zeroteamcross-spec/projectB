import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

export function PublicAffiliateContextBanner({ affiliate = null, onClear = null } = {}) {
  if (!affiliate) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "hidden relative grid gap-3 overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-white/96 p-4 shadow-card";
  applyDesignHook(section, "public.affiliate.banner");

  const glow = document.createElement("div");
  glow.className = "hidden absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_35%),linear-gradient(135deg,rgba(250,244,237,0.92),rgba(255,255,255,0.98))]";

  const top = document.createElement("div");
  top.className = "relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";

  const eyebrow = document.createElement("p");
  eyebrow.className = "inline-flex w-fit rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] px-3 py-1 text-[10px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Context marketing aktif";

  const title = document.createElement("h2");
  title.className = "break-words text-sm font-bold tracking-normal text-gray-950 sm:text-base";
  title.textContent = affiliate.showroom?.name
    ? `Katalog ${affiliate.showroom.name}`
    : affiliate.seller?.name
      ? `Katalog seller ${affiliate.seller.name}`
      : "Katalog marketing";

  const body = document.createElement("p");
  body.className = `break-words text-xs leading-6 ${tw.text.muted}`;
  body.textContent = affiliate.profile?.name
    ? `Anda sedang masuk lewat marketing ${affiliate.profile.name}. CTA konsultasi dan transaksi tetap membawa context ini selama sesi aktif.`
    : "Anda sedang melihat katalog dengan context marketing aktif.";

  copy.append(eyebrow, title, body);
  top.append(copy);

  if (onClear) {
    const button = Button({
      label: "Lepas context",
      variant: "secondary",
      onClick: onClear,
      designHook: "shared.button.secondary",
    });
    button.classList.add("w-full", "sm:w-auto");
    top.append(button);
  }

  section.append(glow, top);
  return section;
}
