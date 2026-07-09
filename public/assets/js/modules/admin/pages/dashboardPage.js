import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { AdminDashboardSummaryCards } from "../components/adminDashboardSummaryCards.js";
import { AdminDashboardQuickActions } from "../components/adminDashboardQuickActions.js";
import { AdminDashboardTransactionsPanel } from "../components/adminDashboardTransactionsPanel.js";
import { AdminDashboardQueuesPanel } from "../components/adminDashboardQueuesPanel.js";
import { adminDashboardService } from "../services/adminDashboardService.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

export function AdminDashboardPage({ notFound = false } = {}) {
  let root = null;
  let unsubscribe = null;
  let hasAnimated = false;

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("div");
      render(root, context, notFound, {
        shouldAnimate: !hasAnimated,
        markAnimated: () => {
          hasAnimated = true;
        },
      });
      return root;
    },
    hydrate(context) {
      render(root, context, notFound, { shouldAnimate: false });
    },
    bindEvents(context) {
      unsubscribe = appStore.subscribe(() => render(root, context, notFound, { shouldAnimate: false }));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, context, notFound, animation = {}) {
  if (!root) {
    return;
  }

  const usersPayload = workingOrSnapshot("adminDashboard", "users", "admin.users");
  const pendingPayload = workingOrSnapshot("adminDashboard", "pendingUsers", "admin.pendingUsers");
  const transactionsPayload = workingOrSnapshot("adminDashboard", "transactions", "admin.transactions");
  const carsPayload = workingOrSnapshot("adminDashboard", "cars", "admin.cars");

  const users = usersPayload?.users ?? [];
  const usersMeta = usersPayload?.meta ?? {};
  const pendingUsers = pendingPayload?.users ?? [];
  const transactions = transactionsPayload?.transactions ?? [];
  const transactionsMeta = transactionsPayload?.meta ?? {};
  const cars = carsPayload?.cars ?? [];
  const carsMeta = carsPayload?.meta ?? {};

  const summary = adminDashboardService.summarize({
    users,
    usersMeta,
    pendingUsers,
    transactions,
    transactionsMeta,
    cars,
    carsMeta,
  });

  root.className = "grid gap-7";

  const approvalButton = Button({
    label: "Approval queue",
    onClick: () => context.router?.navigate("/admin/approvals"),
    designHook: "shared.button.primary",
  });
  approvalButton.id = "adm_dashboard_approval_queue_button";
  approvalButton.classList.add("shadow-[0_16px_40px_rgba(234,88,12,0.22)]", "transition", "duration-200", "hover:-translate-y-0.5");

  const content = [
    adminHero({
      title: notFound ? "Halaman admin tidak ditemukan" : "Dashboard Admin",
      description: "",
      action: approvalButton,
    }),
  ];

  if (notFound) {
    content.push(EmptyState({
      title: "Route admin tidak ditemukan",
      description: "Kembali ke dashboard admin untuk melanjutkan monitoring dan act-as user.",
    }));
    root.replaceChildren(...content);
    return;
  }

  content.push(
    applyDesignHook(AdminDashboardSummaryCards({ summary }), "admin.dashboard.summary"),
    applyDesignHook(AdminDashboardQuickActions({
      actions: adminDashboardService.quickActions({
        onUsers: () => context.router?.navigate("/admin/users"),
        onPending: () => context.router?.navigate("/admin/approvals"),
        onTransactions: () => context.router?.navigate("/admin/transactions"),
        onSettlements: () => context.router?.navigate("/admin/settlements"),
        onActAs: () => context.router?.navigate("/admin/users"),
      }),
    }), "admin.dashboard.quick_actions"),
    adminChartPanel({ summary, transactions, pendingUsers, cars }),
    applyDesignHook(AdminDashboardTransactionsPanel({
      transactions,
      onOpenTransactions: () => context.router?.navigate("/admin/transactions"),
    }), "admin.dashboard.transactions"),
    applyDesignHook(AdminDashboardQueuesPanel({
      pendingUsers,
      cars,
      onOpenUsers: () => context.router?.navigate("/admin/users"),
      onOpenPending: () => context.router?.navigate("/admin/approvals"),
    }), "admin.dashboard.queues"),
  );

  root.replaceChildren(...content);
  if (animation.shouldAnimate) {
    runEntranceAnimation(root);
    animation.markAnimated?.();
  }
}

function adminHero({ title, description, action }) {
  const section = document.createElement("section");
  section.id = "adm_dashboard_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,247,237,0.86),rgba(240,253,250,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7";

  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-orange-300/25 blur-3xl";

  const layout = document.createElement("div");
  layout.className = "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-3";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-secondary),var(--pb-brand-accent))] text-white shadow-[0_16px_40px_rgba(234,88,12,0.24)]";
  icon.append(createIcon("dashboard", { className: "h-6 w-6" }));

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-xs font-black uppercase tracking-[0.18em] text-orange-700";
  eyebrow.textContent = "";

  const heading = document.createElement("h1");
  heading.className = "max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] text-gray-950 sm:text-4xl";
  heading.textContent = title;

  const body = document.createElement("p");
  body.className = "max-w-xl text-sm leading-6 text-gray-600";
  body.textContent = description;

  copy.append(icon, eyebrow, heading, body);
  layout.append(copy, action);
  section.append(glow, layout);
  return section;
}

function adminChartPanel({ summary, transactions = [], pendingUsers = [], cars = [] }) {
  const section = document.createElement("section");
  section.id = "adm_dashboard_chart_section";
  section.className = "grid gap-4 rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(239,246,255,0.78),rgba(255,247,237,0.72))] p-5 shadow-[0_22px_70px_rgba(15,23,42,0.09)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_320px]";

  const main = document.createElement("div");
  main.className = "grid gap-5";

  const header = document.createElement("div");
  header.className = "flex min-w-0 items-center gap-3";
  const icon = document.createElement("div");
  icon.className = "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white shadow-[0_14px_34px_rgba(37,99,235,0.22)]";
  icon.append(createIcon("sort", { className: "h-5 w-5" }));
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  copy.append(
    textNode("p", "text-xs font-black uppercase tracking-[0.16em] text-blue-700", "Grafik operasional"),
    textNode("h2", "text-xl font-black tracking-[-0.03em] text-gray-950", "Health snapshot dashboard"),
  );
  header.append(icon, copy);

  const bars = document.createElement("div");
  bars.className = "grid gap-3";
  [
    ["User", summary?.totalUsers ?? 0, "bg-sky-500"],
    ["Approval", summary?.pendingApprovals ?? pendingUsers.length, "bg-orange-500"],
    ["Transaksi", summary?.totalTransactions ?? transactions.length, "bg-rose-500"],
    ["Mobil", summary?.totalCars ?? cars.length, "bg-emerald-500"],
  ].forEach(([label, value, color], index, all) => {
    bars.append(chartBar({ label, value, color, max: Math.max(1, ...all.map((item) => Number(item[1] ?? 0))) }));
  });

  main.append(header, bars);

  const side = document.createElement("div");
  side.id = "adm_dashboard_chart_side_panel";
  side.className = "grid content-between gap-4 rounded-[1.5rem] border border-white/80 bg-white/76 p-4 shadow-sm";
  side.append(
    textNode("p", "text-sm leading-6 text-gray-600", "Grafik ini memakai snapshot cepat dashboard untuk membaca beban operasional tanpa membuka modul detail."),
    metricPills([
      ["Attention", summary?.attentionTransactions ?? 0, "text-rose-700 bg-rose-50"],
      ["Published", summary?.publishedCars ?? 0, "text-emerald-700 bg-emerald-50"],
    ]),
  );

  section.append(main, side);
  return section;
}

function chartBar({ label, value, color, max }) {
  const row = document.createElement("div");
  row.className = "grid gap-2";
  const top = document.createElement("div");
  top.className = "flex items-center justify-between gap-3 text-sm";
  top.append(
    textNode("span", "font-bold text-gray-700", label),
    textNode("span", "font-black text-gray-950", String(value)),
  );
  const track = document.createElement("div");
  track.className = "h-3 overflow-hidden rounded-full bg-white/80 shadow-inner";
  const fill = document.createElement("div");
  fill.className = `h-full rounded-full ${color} transition-all duration-300`;
  fill.style.width = `${Math.max(8, Math.round((Number(value || 0) / max) * 100))}%`;
  track.append(fill);
  row.append(top, track);
  return row;
}

function metricPills(items) {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-2 sm:grid-cols-2 lg:grid-cols-1";
  items.forEach(([label, value, className]) => {
    const pill = document.createElement("div");
    pill.className = `rounded-2xl px-4 py-3 ${className}`;
    pill.append(
      textNode("p", "text-xs font-bold uppercase tracking-[0.12em]", label),
      textNode("strong", "mt-1 block text-2xl font-black", String(value)),
    );
    wrap.append(pill);
  });
  return wrap;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}

function runEntranceAnimation(root) {
  if (!root || typeof root.animate !== "function") {
    return;
  }

  root.animate([
    { opacity: 0, transform: "translateY(10px)" },
    { opacity: 1, transform: "translateY(0)" },
  ], {
    duration: 260,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  });
}

function workingOrSnapshot(workingKey, workingItem, snapshotKey) {
  const working = appStore.get(`working.${workingKey}.${workingItem}.data`, null);

  if (working) {
    return working;
  }

  return appStore.get(`snapshot.${snapshotKey}.data`, null);
}
