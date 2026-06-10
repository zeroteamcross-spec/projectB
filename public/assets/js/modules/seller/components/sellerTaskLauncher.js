import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";

const TASKS = [
  {
    key: "showroom",
    title: "Lengkapi showroom",
    description: "Nama, kontak, alamat, dan rekening seller siap dipakai.",
    route: "/seller/showroom",
    icon: "showroom",
    accent: "from-orange-500 to-amber-500",
    buttonClass: "border-transparent bg-[linear-gradient(135deg,#f97316,#f59e0b)] text-white shadow-[0_14px_34px_rgba(249,115,22,0.20)] hover:brightness-95",
  },
  {
    key: "cars",
    title: "Kelola mobil",
    description: "Listing, harga, status publikasi, foto, dan inspeksi.",
    route: "/seller/cars",
    icon: "car",
    accent: "from-teal-500 to-cyan-500",
    buttonClass: "border-transparent bg-[linear-gradient(135deg,#14b8a6,#06b6d4)] text-white shadow-[0_14px_34px_rgba(20,184,166,0.20)] hover:brightness-95",
  },
  {
    key: "transactions",
    title: "Pantau transaksi",
    description: "Buyer yang perlu follow up dari showroom.",
    route: "/seller/transactions",
    icon: "transaction",
    accent: "from-rose-500 to-orange-500",
    buttonClass: "border-transparent bg-[linear-gradient(135deg,#f43f5e,#f97316)] text-white shadow-[0_14px_34px_rgba(244,63,94,0.18)] hover:brightness-95",
  },
  {
    key: "affiliates",
    title: "Kelola affiliate",
    description: "Slug marketing, nomor WhatsApp, dan landing seller.",
    route: "/seller/affiliates",
    icon: "affiliate",
    accent: "from-blue-500 to-cyan-500",
    buttonClass: "border-transparent bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white shadow-[0_14px_34px_rgba(37,99,235,0.18)] hover:brightness-95",
  },
  {
    key: "commissions",
    title: "Atur komisi",
    description: "Rule global dan override per mobil untuk affiliate.",
    route: "/seller/affiliate-commissions",
    icon: "commission",
    accent: "from-emerald-500 to-teal-500",
    buttonClass: "border-transparent bg-[linear-gradient(135deg,#10b981,#14b8a6)] text-white shadow-[0_14px_34px_rgba(16,185,129,0.18)] hover:brightness-95",
  },
];

export function SellerTaskLauncher({ router = null } = {}) {
  const section = document.createElement("section");
  section.id = "slr_tasks_section";
  section.className = "grid gap-4";

  const header = document.createElement("section");
  header.id = "slr_tasks_header_section";
  header.className = "flex min-w-0 flex-col gap-2 rounded-[1.5rem] border border-white/80 bg-white/78 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between";
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textNode("p", "text-[11px] font-black uppercase tracking-[0.16em] text-orange-700", "Quick actions"),
    textNode("h2", "text-xl font-black tracking-normal text-gray-950", "Task launcher"),
  );
  const hint = textNode("p", "text-sm leading-6 text-gray-500", "Aksi utama seller, dibuat mudah ditekan di desktop dan mobile.");
  header.append(copy, hint);

  const grid = document.createElement("section");
  grid.id = "slr_tasks_grid_section";
  grid.className = "grid gap-3 md:grid-cols-2 xl:grid-cols-5";

  TASKS.forEach((task) => {
    const card = document.createElement("section");
    card.id = `slr_task_${task.key}_section`;
    card.className = "grid min-w-0 gap-4 rounded-[1.5rem] border border-white/80 bg-white/86 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_56px_rgba(15,23,42,0.09)]";

    const iconWrap = document.createElement("div");
    iconWrap.className = `grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${task.accent} text-white shadow-[0_14px_34px_rgba(15,23,42,0.12)]`;
    iconWrap.append(createIcon(task.icon, { className: "h-5 w-5" }));

    const action = Button({
      label: "Buka",
      variant: "secondary",
      onClick: () => router?.navigate(task.route),
    });
    action.id = `slr_task_${task.key}_button`;
    action.className = `inline-flex min-h-10 max-w-full items-center justify-center gap-2 break-words rounded-[var(--pb-radius-xl)] border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55 ${task.buttonClass}`;
    action.prepend(createIcon(task.icon, { className: "h-4 w-4" }));

    card.append(
      iconWrap,
      textNode("h3", "text-base font-black tracking-normal text-gray-950", task.title),
      textNode("p", "min-h-[48px] text-sm leading-6 text-gray-600", task.description),
      action,
    );
    grid.append(card);
  });

  section.append(header, grid);
  return section;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
