import { createIcon } from "../../../theme/iconRegistry.js";

const SUMMARY_ITEMS = [
  {
    key: "published_cars",
    label: "Mobil aktif",
    icon: "car",
    value: (summary) => String(summary.publishedCars ?? 0),
    note: (summary) => `${summary.totalCars ?? 0} unit seller sudah masuk snapshot dashboard.`,
  },
  {
    key: "draft_cars",
    label: "Draft listing",
    icon: "sort",
    value: (summary) => String(summary.draftCars ?? 0),
    note: () => "Listing draft masih menunggu foto, harga, atau finalisasi copy.",
  },
  {
    key: "completed_inspection",
    label: "Inspeksi lengkap",
    icon: "sparkles",
    value: (summary) => String(summary.completedInspection ?? 0),
    note: () => "Unit dengan inspeksi lengkap lebih siap dipublikasikan.",
  },
  {
    key: "pending_transactions",
    label: "Perlu tindak lanjut",
    icon: "transaction",
    value: (summary) => String(summary.pendingTransactions ?? 0),
    note: (summary) => `${summary.totalTransactions ?? 0} transaksi seller tersedia untuk monitoring awal.`,
  },
];

export function SellerSummaryCards({ summary = {} } = {}) {
  const grid = document.createElement("section");
  grid.id = "slr_summary_section";
  grid.className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

  SUMMARY_ITEMS.forEach((item, index) => {
    const card = document.createElement("section");
    card.id = `slr_summary_${item.key}_section`;
    card.className = [
      "relative grid min-w-0 gap-3 overflow-hidden rounded-[1.5rem] border p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_56px_rgba(15,23,42,0.09)]",
      summaryTone(index),
    ].join(" ");

    const top = document.createElement("div");
    top.className = "flex min-w-0 items-center justify-between gap-3";

    const label = textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", item.label);
    const icon = document.createElement("span");
    icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/78 text-[var(--pb-brand-secondary)] ring-1 ring-white/80";
    icon.append(createIcon(item.icon, { className: "h-4 w-4" }));
    top.append(label, icon);

    card.append(
      top,
      textNode("p", "text-3xl font-black tracking-normal text-gray-950", item.value(summary)),
      textNode("p", "text-sm leading-6 text-gray-600", item.note(summary)),
    );
    grid.append(card);
  });

  return grid;
}

function summaryTone(index) {
  return [
    "border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(250,244,237,0.94),rgba(255,255,255,0.88))]",
    "border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] bg-[linear-gradient(135deg,rgba(214,236,246,0.76),rgba(255,255,255,0.88))]",
    "border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] bg-[linear-gradient(135deg,rgba(224,239,247,0.78),rgba(255,255,255,0.88))]",
    "border-[color-mix(in_srgb,var(--pb-warning)_14%,white)] bg-[linear-gradient(135deg,rgba(245,236,225,0.78),rgba(255,255,255,0.88))]",
  ][index % 4];
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
