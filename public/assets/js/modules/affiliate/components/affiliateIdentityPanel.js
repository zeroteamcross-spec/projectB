import { Card } from "../../../ui/composites/card.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AffiliateIdentityPanel({
  affiliate = null,
  statusMeta = { label: "-", variant: "default" },
  landingUrl = "",
} = {}) {
  const card = Card([], { variant: "raised" });
  card.classList.add("grid", "min-w-0", "gap-4", "overflow-hidden");

  const header = document.createElement("div");
  header.className = "grid min-w-0 gap-2";

  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Identitas affiliate";

  const title = document.createElement("h2");
  title.className = "break-words text-xl font-bold text-gray-950";
  title.textContent = affiliate?.user?.name || affiliate?.name || "Affiliate";

  const subtitle = document.createElement("p");
  subtitle.className = `break-words text-sm ${tw.text.muted}`;
  subtitle.textContent = `${affiliate?.user?.email || affiliate?.email || "-"} | ${affiliate?.phone_number || affiliate?.user?.phone_number || "-"}`;

  const badges = document.createElement("div");
  badges.className = "flex flex-wrap gap-2";
  badges.append(Badge(statusMeta));

  header.append(eyebrow, title, subtitle, badges);

  const facts = document.createElement("div");
  facts.className = `grid min-w-0 gap-2 ${tw.surface.insetGrid}`;
  [
    ["Slug affiliate", affiliate?.referral_code || "-"],
    ["Link landing", landingUrl || "-"],
    ["Seller owner", affiliate?.seller?.name || "-"],
    ["Showroom", affiliate?.showroom?.name || "-"],
    ["Dibuat", formatDate(affiliate?.created_at)],
    ["Diupdate", formatDate(affiliate?.updated_at)],
  ].forEach(([label, value]) => facts.append(infoRow(label, value)));

  card.append(header, facts);
  return card;
}

function infoRow(label, value) {
  const row = document.createElement("div");
  row.className = "grid min-w-0 gap-1 rounded-2xl bg-white/90 px-3 py-3 shadow-sm sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] sm:items-start";

  const left = document.createElement("span");
  left.className = "break-words text-gray-500";
  left.textContent = label;

  const right = document.createElement("span");
  right.className = "min-w-0 break-all font-semibold text-gray-900 sm:text-right";
  right.textContent = value;

  row.append(left, right);
  return row;
}
