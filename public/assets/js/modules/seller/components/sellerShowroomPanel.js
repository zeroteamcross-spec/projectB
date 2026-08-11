import { Badge } from "../../../ui/primitives/badge.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function SellerShowroomPanel({ summary = {} } = {}) {
  const section = document.createElement("section");
  section.id = "slr_showroom_panel_section";
  section.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(234,244,249,0.76),rgba(250,244,237,0.70))] p-4 shadow-[0_18px_52px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-shadow duration-150 sm:p-5";

  const header = document.createElement("div");
  header.className = "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const left = document.createElement("div");
  left.className = "flex min-w-0 items-start gap-3";

  const icon = document.createElement("span");
  icon.className = "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.18)]";
  icon.append(createIcon("showroom", { className: "h-5 w-5" }));

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textNode("p", "text-[11px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Showroom readiness"),
    textNode("h2", "break-words text-xl font-black tracking-normal text-gray-950", summary.showroomName ?? "Showroom"),
  );

  left.append(icon, copy);

  const badge = Badge({
    label: summary.showroomReady ? "Siap dipakai" : "Perlu dilengkapi",
    variant: summary.showroomReady ? "success" : "warning",
  });

  header.append(left, badge);

  const text = textNode(
    "p",
    "max-w-3xl text-sm leading-6 text-gray-600",
    summary.showroomReady
      ? "Profil showroom sudah cukup untuk memulai pengelolaan listing dan transaksi seller."
      : "Lengkapi showroom sebelum UAT seller agar listing dan transaksi lebih mudah diverifikasi.",
  );

  const facts = document.createElement("section");
  facts.id = "slr_showroom_facts_section";
  facts.className = "grid gap-2 sm:grid-cols-3";
  [
    ["Listing", `${summary.totalCars ?? 0} unit`],
    ["Published", `${summary.publishedCars ?? 0} aktif`],
    ["Follow up", `${summary.pendingTransactions ?? 0} transaksi`],
  ].forEach(([label, value]) => {
    const item = document.createElement("section");
    item.id = `slr_showroom_fact_${label.toLowerCase().replace(/\s+/g, "_")}_section`;
    item.className = "rounded-[1.25rem] border border-white/80 bg-white/74 p-3 shadow-sm";
    item.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "text-sm font-black text-gray-950", value),
    );
    facts.append(item);
  });

  section.append(header, text, facts);
  return section;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
