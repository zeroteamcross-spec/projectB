import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { sellerDashboardService } from "../services/sellerDashboardService.js";
import { sellerState } from "../state/sellerState.js";
import { SellerShowroomPanel } from "../components/sellerShowroomPanel.js";
import { SellerSummaryCards } from "../components/sellerSummaryCards.js";
import { SellerTaskLauncher } from "../components/sellerTaskLauncher.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

export function SellerDashboardPage({ notFound = false } = {}) {
  let root = null;
  let unsubscribe = null;

  return createPageLifecycle({
    mount({ router }) {
      root = document.createElement("div");
      render(root, router, notFound);
      return root;
    },
    hydrate({ router }) {
      render(root, router, notFound);
    },
    bindEvents({ router }) {
      unsubscribe = appStore.subscribe(() => render(root, router, notFound));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, router, notFound) {
  if (!root) {
    return;
  }

  const snapshotShowroom = sellerState.snapshot("showroom", null);
  const snapshotCars = sellerState.snapshot("cars", { cars: [] });
  const snapshotTransactions = sellerState.snapshot("transactions", { transactions: [] });
  const showroom = sellerState.working("sellerDashboard", "showroom", snapshotShowroom);
  const workingCars = sellerState.working("sellerDashboard", "cars", snapshotCars);
  const workingTransactions = sellerState.working("sellerDashboard", "transactions", snapshotTransactions);
  const cars = workingCars?.cars ?? snapshotCars?.cars ?? [];
  const transactions = workingTransactions?.transactions ?? snapshotTransactions?.transactions ?? [];
  const summary = sellerDashboardService.summarize({ showroom, cars, transactions });

  const layout = document.createElement("section");
  layout.id = "slr_page_section";
  layout.className = "grid min-w-0 gap-6";

  layout.append(
    sellerHero({ router, summary, notFound }),
    applyDesignHook(SellerShowroomPanel({ summary }), "seller.dashboard.showroom"),
    applyDesignHook(SellerSummaryCards({ summary }), "seller.dashboard.summary"),
    applyDesignHook(SellerTaskLauncher({ router }), "seller.dashboard.tasks")
  );

  root.replaceChildren(layout);
}

function sellerHero({ router, summary = {}, notFound = false }) {
  const section = document.createElement("section");
  section.id = "slr_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.86),rgba(240,253,250,0.74))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-shadow duration-150 sm:p-6 lg:p-7";

  const layout = document.createElement("div");
  layout.className = "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-3";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f97316,#14b8a6)] text-white shadow-[0_16px_40px_rgba(249,115,22,0.22)]";
  icon.append(createIcon("showroom", { className: "h-5 w-5" }));

  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-orange-700", ""),
    textNode("h1", "max-w-2xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", notFound ? "Halaman seller tidak ditemukan" : "Dashboard Seller"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", ""),
  );

  const stats = document.createElement("section");
  stats.id = "slr_hero_stats_section";
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[360px]";
  [
    ["Unit", summary.totalCars ?? 0],
    ["Published", summary.publishedCars ?? 0],
    ["Follow up", summary.pendingTransactions ?? 0],
  ].forEach(([label, value]) => {
    const stat = document.createElement("section");
    stat.id = `slr_hero_stat_${String(label).toLowerCase().replace(/\s+/g, "_")}_section`;
    stat.className = "rounded-[1.25rem] border border-white/80 bg-white/78 p-3 shadow-sm";
    stat.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "text-2xl font-black text-gray-950", String(value)),
    );
    stats.append(stat);
  });

  const carsButton = Button({
    label: "Kelola mobil",
    onClick: () => router?.navigate("/seller/cars"),
    designHook: "shared.button.primary",
  });
  carsButton.id = "slr_manage_cars_button";
  carsButton.prepend(createIcon("car", { className: "h-4 w-4" }));

  const showroomButton = Button({
    label: "Showroom",
    variant: "secondary",
    onClick: () => router?.navigate("/seller/showroom"),
    designHook: "shared.button.secondary",
  });
  showroomButton.id = "slr_manage_showroom_button";
  showroomButton.prepend(createIcon("showroom", { className: "h-4 w-4" }));

  const side = document.createElement("section");
  side.id = "slr_hero_actions_section";
  side.className = "grid gap-3";
  const actions = document.createElement("div");
  actions.className = "grid gap-2 sm:grid-cols-2";
  actions.append(carsButton, showroomButton);
  side.append(stats, actions);

  layout.append(copy, side);
  section.append(layout);
  return section;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
