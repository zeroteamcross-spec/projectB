import { Card } from "../../../ui/composites/card.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AffiliateOwnerPanel({ affiliate = null } = {}) {
  const card = Card([], { variant: "raised" });
  card.classList.add("grid", "min-w-0", "gap-4", "overflow-hidden");

  const title = document.createElement("h2");
  title.className = `${tw.text.sectionTitle} min-w-0 break-words`;
  title.textContent = "Showroom owner";

  const inset = document.createElement("div");
  inset.className = `grid min-w-0 gap-3 ${tw.surface.inset}`;

  inset.append(
    infoBlock("Seller", affiliate?.seller?.name || "-", affiliate?.seller?.email || affiliate?.seller?.phone_number || ""),
    infoBlock(
      "Showroom",
      affiliate?.showroom?.name || "Belum ada showroom",
      affiliate?.showroom?.address || affiliate?.showroom?.phone_number || "Data showroom belum lengkap."
    ),
  );

  card.append(title, inset);
  return card;
}

function infoBlock(label, title, body) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[10px] font-semibold uppercase tracking-wide text-gray-500";
  eyebrow.textContent = label;

  const heading = document.createElement("p");
  heading.className = "break-words font-semibold text-gray-950";
  heading.textContent = title;

  const copy = document.createElement("p");
  copy.className = "break-words text-xs leading-6 text-gray-600";
  copy.textContent = body || "-";

  wrap.append(eyebrow, heading, copy);
  return wrap;
}
