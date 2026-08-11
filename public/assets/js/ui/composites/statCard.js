import { Card } from "./card.js";
import { tw } from "../theme/tailwindClasses.js";

export function StatCard({ label, value, note = "" }) {
  const card = Card([], { variant: "raised" });
  card.classList.add("relative", "overflow-hidden", "grid", "gap-3", "p-5");

  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute right-0 top-0 h-20 w-24 rounded-full bg-gradient-to-br from-[color-mix(in_srgb,var(--pb-brand-accent)_45%,white)] via-transparent to-transparent blur-2xl";

  const title = document.createElement("p");
  title.className = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]";
  title.textContent = label;

  const number = document.createElement("strong");
  number.className = "block text-2xl font-bold tracking-normal text-gray-950";
  number.textContent = value;

  card.append(glow, title, number);

  if (note) {
    const helper = document.createElement("p");
    helper.className = `text-sm leading-6 ${tw.text.muted}`;
    helper.textContent = note;
    card.append(helper);
  }

  return card;
}
