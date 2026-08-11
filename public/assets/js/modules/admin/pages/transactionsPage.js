import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { openModal, closeModal } from "../../../ui/primitives/modal.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminTransactionMonitoringService } from "../services/adminTransactionMonitoringService.js";
import { AdminTransactionsFilterBar } from "../components/adminTransactionsFilterBar.js";
import { AdminTransactionsList } from "../components/adminTransactionsList.js";
import { AdminTransactionDetailPanel } from "../components/adminTransactionDetailPanel.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

export function AdminTransactionsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    error: "",
    query: createTransactionsQuery(),
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    applyFilters(nextFilters) {
      state.error = "";
      state.query = {
        ...state.query,
        ...nextFilters,
        page: 1,
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
    changePage(nextPage) {
      state.error = "";
      state.query = {
        ...state.query,
        page: nextPage,
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
    changePerPage(nextPerPage) {
      state.error = "";
      state.query = {
        ...state.query,
        page: 1,
        pageSize: nextPerPage,
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
    selectTransaction(transaction) {
      state.error = "";
      state.query = {
        ...state.query,
        transactionId: transaction.id,
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
    closeTransactionDetail() {
      state.error = "";
      state.query = {
        ...state.query,
        transactionId: "",
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.error = "";
      state.query = createTransactionsQuery(context?.query);
    },
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      state.query = createTransactionsQuery(context?.query);
      rerender();
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => rerender());
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      closeModal({ notify: false });
    },
  });
}

function render(root, context, state, actions) {
  if (!root || !context) {
    return;
  }

  const filters = { ...state.query };

  const workingTransactionsPayload = appStore.get("working.adminTransactions.transactions.data", null);
  const snapshotTransactionsPayload = appStore.get("snapshot.admin.transactions.data", null);
  const transactionsPayload = workingTransactionsPayload
    ?? snapshotTransactionsPayload
    ?? { transactions: [], meta: {} };
  const detail = appStore.get("working.adminTransactions.detail.data", null);
  const listHydratedAt = appStore.get("working.adminTransactions.transactions.hydratedAt", 0) ?? 0;
  const detailHydratedAt = appStore.get("working.adminTransactions.detail.hydratedAt", 0) ?? 0;
  const hasTransactionsSource = Boolean(workingTransactionsPayload || snapshotTransactionsPayload);

  const transactions = transactionsPayload.transactions ?? [];
  const filteredTransactions = adminTransactionMonitoringService.filterTransactions(transactions, filters);
  const currentPage = Math.max(1, Number(filters.page || 1));
  const currentPageSize = Math.max(1, Number(filters.pageSize || 10));
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * currentPageSize;
  const pagedTransactions = filteredTransactions.slice(pageStart, pageStart + currentPageSize);
  const selectedTransaction = adminTransactionMonitoringService.resolveSelectedTransaction({
    detail,
    transactions,
    transactionId: filters.transactionId,
  });
  const canRenderDetailModal = Boolean(filters.transactionId);
  const counts = adminTransactionMonitoringService.summarize(transactions);

  const layout = document.createElement("section");
  layout.id = "adtr_page_section";
  layout.className = "grid min-w-0 gap-6";

  const main = document.createElement("div");
  main.className = "grid min-w-0 gap-6";

  const dashboardButton = Button({
    label: "Dashboard admin",
    variant: "secondary",
    onClick: () => context.router?.navigate("/admin"),
    designHook: "shared.button.secondary",
  });
  dashboardButton.id = "adtr_dashboard_button";
  dashboardButton.prepend(createIcon("dashboard", { className: "h-4 w-4" }));

  main.append(
    transactionsHero({ action: dashboardButton, counts }),
    applyDesignHook(AdminTransactionsFilterBar({
      filters,
      counts,
      onSubmit: (nextFilters) => actions.applyFilters(nextFilters),
    }), "admin.transactions.filters"),
  );

  if (state.error) {
    const error = document.createElement("div");
    error.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    error.textContent = state.error;
    main.append(error);
  }

  main.append(applyDesignHook(AdminTransactionsList({
    loading: !listHydratedAt && !hasTransactionsSource,
    transactions: pagedTransactions,
    page: safePage,
    perPage: currentPageSize,
    totalItems,
    selectedTransactionId: filters.transactionId,
    onSelect: (transaction) => actions.selectTransaction(transaction),
    onPageChange: (nextPage) => actions.changePage(nextPage),
    onPerPageChange: (nextPerPage) => actions.changePerPage(nextPerPage),
  }), "admin.transactions.list"));

  layout.append(main);
  root.replaceChildren(layout);

  if (canRenderDetailModal) {
    openModal(applyDesignHook(AdminTransactionDetailPanel({
      transaction: selectedTransaction,
      isHydrating: Boolean(filters.transactionId && !detailHydratedAt && !selectedTransaction),
    }), "admin.transactions.detail"), {
      key: `adtr-detail-${filters.transactionId}`,
      title: "Review transaksi",
      description: "Periksa buyer, showroom, unit, payment summary, timeline, dan log pembayaran dari satu popup.",
      size: "lg",
      footer: null,
      panelId: "adtr_detail_modal_section",
      headerId: "adtr_detail_modal_header_section",
      bodyId: "adtr_detail_modal_body_section",
      closeButtonId: "adtr_detail_modal_close_button",
      onClose: () => actions.closeTransactionDetail(),
    });
  } else {
    closeModal({ notify: false });
  }
}

function transactionsHero({ action, counts = {} }) {
  const section = document.createElement("section");
  section.id = "adtr_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(250,244,237,0.86),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7";

  const layout = document.createElement("div");
  layout.className = "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-3";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c53030,#1e81b0)] text-white shadow-[0_16px_40px_rgba(185,28,28,0.22)]";
  icon.append(createIcon("transaction", { className: "h-5 w-5" }));

  copy.append(
    icon,
    textNode("p", "text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", ""),
    textNode("h1", "max-w-2xl text-2xl font-black leading-tight tracking-normal text-gray-950 sm:text-3xl", "Transaksi Admin"),
    textNode("p", "max-w-2xl text-xs leading-6 text-gray-600", ""),
  );

  const stats = document.createElement("section");
  stats.id = "adtr_hero_stats_section";
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[360px]";
  [
    ["Total", counts.total ?? 0],
    ["Pending", counts.pending ?? 0],
    ["Attention", counts.attention ?? 0],
  ].forEach(([label, value]) => {
    const card = document.createElement("section");
    card.id = `adtr_hero_stat_${String(label).toLowerCase()}_section`;
    card.className = "rounded-[1.25rem] border border-[var(--pb-card-border)] bg-white/78 p-3 shadow-sm";
    card.append(
      textNode("p", "text-[10px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "text-xl font-black text-gray-950", String(value)),
    );
    stats.append(card);
  });

  const side = document.createElement("div");
  side.className = "grid gap-3";
  side.append(stats, action);

  layout.append(copy, side);
  section.append(layout);
  return section;
}

function buildTransactionsPath({ keyword = "", status = "", paymentType = "", transactionId = "", page = "", pageSize = "" } = {}) {
  const params = new URLSearchParams();

  if (keyword) {
    params.set("keyword", keyword);
  }

  if (status) {
    params.set("status", status);
  }

  if (paymentType) {
    params.set("payment_type", paymentType);
  }

  if (transactionId) {
    params.set("transaction_id", String(transactionId));
  }

  if (page && Number(page) > 1) {
    params.set("page", String(page));
  }

  if (pageSize && Number(pageSize) > 0) {
    params.set("page_size", String(pageSize));
  }

  const query = params.toString();
  return query ? `/admin/transactions?${query}` : "/admin/transactions";
}

function createTransactionsQuery(query = {}) {
  return {
    keyword: query.keyword ?? "",
    status: query.status ?? "",
    paymentType: query.payment_type ?? query.paymentType ?? "",
    transactionId: query.transaction_id ?? query.transactionId ?? "",
    page: Math.max(1, Number(query.page || 1)),
    pageSize: Math.max(1, Number(query.page_size || query.pageSize || 10)),
  };
}

function syncTransactionsUrl(query) {
  const nextHash = `#${buildTransactionsPath(query)}`;
  const url = new URL(window.location.href);
  url.hash = nextHash;
  window.history.replaceState(window.history.state, "", url);
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
