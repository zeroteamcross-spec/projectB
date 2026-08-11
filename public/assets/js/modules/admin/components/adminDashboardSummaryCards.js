import { Card } from "../../../ui/composites/card.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AdminDashboardSummaryCards({ summary } = {}) {
  const grid = document.createElement("section");
  grid.id = "adm_dashboard_summary_section";
  grid.className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";

  const items = [
    {
      id: "users",
      icon: "user",
      label: "User aktif tersaji",
      value: String(summary?.totalUsers ?? 0),
      note: `${summary?.recentUsers ?? 0} user baru dalam 7 hari terakhir.`,
      tone: "from-[var(--pb-brand-primary)] to-[var(--pb-brand-primary)]",
      surface: "bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(224,242,254,0.82))] border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)]",
    },
    {
      id: "approvals",
      icon: "bell",
      label: "Pending approvals",
      value: String(summary?.pendingApprovals ?? 0),
      note: "Seller yang masih menunggu keputusan approval admin.",
      tone: "from-[var(--pb-brand-primary)] to-[var(--pb-warning)]",
      surface: "bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(245,236,225,0.86))] border-[var(--pb-border)]",
    },
    {
      id: "transactions",
      icon: "transaction",
      label: "Transaksi perlu perhatian",
      value: String(summary?.attentionTransactions ?? 0),
      note: `${summary?.totalTransactions ?? 0} transaksi terbaru tersedia untuk monitoring awal.`,
      tone: "from-[var(--pb-danger)] to-[var(--pb-brand-primary)]",
      surface: "bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,228,230,0.82))] border-[color-mix(in_srgb,var(--pb-danger)_14%,white)]",
    },
    {
      id: "cars",
      icon: "car",
      label: "Mobil tersaji",
      value: String(summary?.totalCars ?? 0),
      note: `${summary?.publishedCars ?? 0} mobil sudah tayang.`,
      tone: "from-[var(--pb-success)] to-[var(--pb-brand-primary)]",
      surface: "bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(209,250,229,0.76))] border-[color-mix(in_srgb,var(--pb-success)_14%,white)]",
    },
  ];

  items.forEach((item) => grid.append(summaryCard(item)));
  return grid;
}

function summaryCard({ id, icon, label, value, note, tone, surface }) {
  const card = Card([], { variant: "raised" });
  card.id = `adm_dashboard_summary_${id}_card`;
  card.className = `group relative overflow-hidden rounded-[1.6rem] border ${surface} p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(15,23,42,0.12)]`;

  const glow = document.createElement("div");
  glow.className = `pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-2xl transition duration-200 group-hover:opacity-25`;

  const top = document.createElement("div");
  top.className = "relative flex items-start justify-between gap-3";

  const copy = document.createElement("div");
  copy.className = "grid gap-2";
  copy.append(
    textBlock("text-[11px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", label),
    textBlock("text-3xl font-black tracking-[-0.04em] text-gray-950", value),
  );

  const iconWrap = document.createElement("div");
  iconWrap.className = `grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-[0_14px_30px_rgba(15,23,42,0.12)]`;
  iconWrap.append(createIcon(icon, { className: "h-5 w-5" }));

  top.append(copy, iconWrap);
  card.append(
    glow,
    top,
    textBlock(`relative mt-3 text-sm leading-6 ${tw.text.muted}`, note),
  );
  return card;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}
