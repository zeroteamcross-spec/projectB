import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AffiliateQuickActions({
  affiliate = null,
  copying = false,
  onOpenLanding = null,
  onCopyLanding = null,
  onOpenActivity = null,
  onOpenLedger = null,
  onOpenSettlements = null,
} = {}) {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5";

  [
    {
      title: "Buka landing marketing",
      description: "Cek halaman publik yang membawa slug marketing Anda.",
      icon: "affiliate",
      action: idButton("aff_open_landing_button", Button({ label: "Buka landing", variant: "secondary", onClick: () => onOpenLanding?.(affiliate) })),
    },
    {
      title: "Copy link landing",
      description: "Bagikan link publik marketing langsung dari dashboard ini.",
      icon: "transaction",
      action: idButton("aff_copy_link_button", Button({
        label: copying ? "Menyalin..." : "Copy link",
        variant: "secondary",
        disabled: copying,
        onClick: () => onCopyLanding?.(affiliate),
      })),
    },
    {
      title: "Buka activity clicks",
      description: "Lihat click terbaru dan route marketing yang paling sering dibuka.",
      icon: "dashboard",
      action: idButton("aff_open_activity_button", Button({ label: "Buka activity", variant: "secondary", onClick: () => onOpenActivity?.() })),
    },
    {
      title: "Buka ledger komisi",
      description: "Lihat komisi dari penjualan dan referensi transaksi yang sudah tercatat.",
      icon: "commission",
      action: idButton("aff_open_ledger_button", Button({ label: "Buka ledger", variant: "secondary", onClick: () => onOpenLedger?.() })),
    },
    {
      title: "Buka settlement",
      description: "Pantau komisi yang masih unsettled dan batch payout baseline yang sudah dicatat.",
      icon: "commission",
      action: idButton("aff_open_settlements_button", Button({ label: "Buka settlement", variant: "secondary", onClick: () => onOpenSettlements?.() })),
    },
  ].forEach((item) => {
    const card = Card([], { variant: "raised" });
    card.classList.add("grid", "min-w-0", "gap-3", "overflow-hidden", "p-5");

    const iconWrap = document.createElement("div");
    iconWrap.className = tw.layout.featureIcon;
    iconWrap.append(createIcon(item.icon, { className: "h-5 w-5" }));

    const title = document.createElement("h2");
    title.className = `${tw.text.sectionTitle} min-w-0 break-words`;
    title.textContent = item.title;

    const body = document.createElement("p");
    body.className = `break-words text-sm leading-6 ${tw.text.muted}`;
    body.textContent = item.description;

    const actionWrap = document.createElement("div");
    actionWrap.className = "mt-2 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-4";
    item.action.classList?.add?.("w-full", "sm:w-auto");
    actionWrap.append(
      textBlock("text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Action"),
      item.action,
    );

    card.append(iconWrap, title, body, actionWrap);
    section.append(card);
  });

  return section;
}

function idButton(id, button) {
  button.id = id;
  return button;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
