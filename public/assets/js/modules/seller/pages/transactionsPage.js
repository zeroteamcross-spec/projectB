import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { syncBusinessTransaction } from "../../../state/sync/businessStatusSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { sellerState } from "../state/sellerState.js";
import { sellerTransactionService } from "../services/sellerTransactionService.js";
import { SellerTransactionSummaryCards } from "../components/sellerTransactionSummaryCards.js";
import { SellerTransactionsList } from "../components/sellerTransactionsList.js";
import { SellerTransactionDetailPanel } from "../components/sellerTransactionDetailPanel.js";

const DEFAULT_QUERY = {
  keyword: "",
  status: "",
  paymentType: "",
  period: "",
  transactionId: "",
  page: 1,
  pageSize: 10,
};

export function SellerTransactionsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    query: { ...DEFAULT_QUERY },
    checklistDraft: {},
    checklistSavingId: null,
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    refresh() {
      rerender();
    },
    applyFilters(nextFilters) {
      state.query = {
        ...state.query,
        ...nextFilters,
        page: 1,
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
    changePage(nextPage) {
      state.query = {
        ...state.query,
        page: nextPage,
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
    changePerPage(nextPageSize) {
      state.query = {
        ...state.query,
        page: 1,
        pageSize: nextPageSize,
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
    openDetail(transaction) {
      state.query = {
        ...state.query,
        transactionId: transaction?.id ?? "",
      };
      state.checklistDraft = checklistToDraft(transaction?.fulfillment_checklist ?? []);
      syncTransactionsUrl(state.query);
      rerender();
    },
    closeDetail() {
      state.query = {
        ...state.query,
        transactionId: "",
      };
      syncTransactionsUrl(state.query);
      rerender();
    },
    patchChecklist(key, patch, shouldRender = true) {
      state.checklistDraft = {
        ...state.checklistDraft,
        [key]: {
          ...(state.checklistDraft[key] ?? { key }),
          ...patch,
        },
      };
      if (shouldRender) {
        rerender();
      }
    },
    saveChecklist(transaction) {
      saveFulfillmentChecklist(transaction, state, actions);
    },
    getChecklistDraft() {
      return state.checklistDraft;
    },
    isChecklistSaving(transaction) {
      return Number(state.checklistSavingId) === Number(transaction?.id);
    },
    goDashboard() {
      currentContext?.router?.navigate("/seller");
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
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
      unsubscribe = appStore.subscribe((state, action) => {
        if (String(action ?? "").startsWith("ui:")) {
          return;
        }
        rerender();
      });
      return () => unsubscribe?.();
    },
    dispose() {
      closeTransactionModal();
      unsubscribe = null;
    },
  });
}

function render(root, context, state, actions) {
  if (!root) {
    return;
  }

  const snapshotTransactions = sellerState.snapshot("transactions", { transactions: [] });
  const workingTransactions = sellerState.working("sellerTransactions", "transactions", snapshotTransactions);
  const transactions = workingTransactions?.transactions ?? snapshotTransactions?.transactions ?? [];
  const listHydratedAt = appStore.get("working.sellerTransactions.transactions.hydratedAt", 0) ?? 0;
  const hasSource = Boolean(workingTransactions || snapshotTransactions?.transactions?.length);
  const query = state.query ?? DEFAULT_QUERY;
  const filteredTransactions = filterTransactions(transactions, query);
  const pageSize = Math.max(1, Number(query.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(Math.max(1, Number(query.page || 1)), totalPages);
  const pagedTransactions = filteredTransactions.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedTransaction = resolveTransaction(transactions, query.transactionId);
  const loading = !listHydratedAt && !hasSource;

  const layout = document.createElement("section");
  layout.id = "slrtx_page";
  layout.className = "grid min-w-0 gap-5";
  layout.dataset.ds = "seller.transactions.page";
  layout.append(
    transactionsHero({ transactions, filteredTransactions, onDashboard: actions.goDashboard }),
    applyDesignHook(SellerTransactionSummaryCards({ transactions }), "seller.transactions.summary"),
    transactionsFilterBar({
      query,
      transactions,
      onChange: (nextFilters) => actions.applyFilters(nextFilters),
    }),
    applyDesignHook(SellerTransactionsList({
      transactions: pagedTransactions,
      totalItems: filteredTransactions.length,
      loading,
      page: safePage,
      perPage: pageSize,
      selectedTransactionId: query.transactionId,
      onOpen: (transaction) => actions.openDetail(transaction),
      onPageChange: (nextPage) => actions.changePage(nextPage),
      onPerPageChange: (nextPageSize) => actions.changePerPage(nextPageSize),
    }), "seller.transactions.list"),
  );

  root.replaceChildren(layout);

  if (query.transactionId) {
    openTransactionModal({ transaction: selectedTransaction, actions });
  } else {
    closeTransactionModal();
  }
}

async function saveFulfillmentChecklist(transaction, state, actions) {
  if (!transaction?.id || state.checklistSavingId) {
    return;
  }

  state.checklistSavingId = transaction.id;
  actions.refresh();

  try {
    const updated = await sellerTransactionService.updateFulfillmentChecklist(transaction.id, {
      items: buildChecklistPayload(transaction, state.checklistDraft),
    });
    syncBusinessTransaction(updated ?? transaction, {
      primaryRole: "seller",
      source: "seller:fulfillment-checklist",
    });
    state.checklistDraft = checklistToDraft(updated?.fulfillment_checklist ?? transaction.fulfillment_checklist ?? []);
    showToast("Checklist transaksi disimpan.", { type: "success" });
  } catch (error) {
    showToast(error.message || "Gagal menyimpan checklist transaksi.", { type: "error" });
  } finally {
    state.checklistSavingId = null;
    actions.refresh();
  }
}

function checklistToDraft(items = []) {
  return items.reduce((carry, item) => ({
    ...carry,
    [item.key]: {
      key: item.key,
      is_completed: Boolean(item.is_completed),
      notes: stripHandoverDate(item.notes ?? ""),
      handover_date: item.key === "handover_schedule" ? extractHandoverDate(item.notes ?? "") : "",
    },
  }), {});
}

function buildChecklistPayload(transaction, draft = {}) {
  const sourceItems = (transaction?.fulfillment_checklist ?? []).length
    ? transaction.fulfillment_checklist
    : Object.values(draft ?? {});

  return sourceItems
    .map((item) => {
      const key = item.key ?? item.checklist_key ?? "";
      if (!key) {
        return null;
      }

      const current = draft[key] ?? {};
      const notes = key === "handover_schedule"
        ? composeHandoverNotes(current.notes ?? item.notes ?? "", current.handover_date ?? extractHandoverDate(item.notes ?? ""))
        : (current.notes ?? item.notes ?? "");

      return {
        key,
        is_completed: Boolean(current.is_completed ?? item.is_completed),
        notes,
      };
    })
    .filter(Boolean);
}

function extractHandoverDate(notes = "") {
  const match = String(notes).match(/Tanggal serah terima:\s*(\d{4}-\d{2}-\d{2})/i);
  return match?.[1] ?? "";
}

function stripHandoverDate(notes = "") {
  return String(notes)
    .replace(/Tanggal serah terima:\s*\d{4}-\d{2}-\d{2}\s*/i, "")
    .trim();
}

function composeHandoverNotes(notes = "", handoverDate = "") {
  const cleanNotes = stripHandoverDate(notes);
  return [
    handoverDate ? `Tanggal serah terima: ${handoverDate}` : "",
    cleanNotes,
  ].filter(Boolean).join("\n");
}

function openTransactionModal({ transaction, actions }) {
  const content = document.createElement("section");
  content.id = "slrtx_detail_modal_content_section";
  content.className = "grid min-w-0 gap-4 pb-24 sm:pb-4";
  content.append(applyDesignHook(SellerTransactionDetailPanel({
    transaction,
    checklistDraft: actions.getChecklistDraft?.() ?? {},
    checklistSaving: actions.isChecklistSaving?.(transaction) ?? false,
    onChecklistToggle: (key, isCompleted) => actions.patchChecklist?.(key, { is_completed: isCompleted }),
    onChecklistNote: (key, notes) => actions.patchChecklist?.(key, { notes }, false),
    onChecklistDate: (key, handoverDate) => actions.patchChecklist?.(key, { handover_date: handoverDate }, false),
    onChecklistSave: () => actions.saveChecklist?.(transaction),
  }), "seller.transactions.detail"));

  openModal(content, {
    key: "slrtx-detail-modal",
    title: "Detail transaksi",
    description: "Ringkasan buyer, mobil, pembayaran, dan riwayat dari working set halaman.",
    size: "xl",
    footer: null,
    panelId: "slrtx_detail_modal",
    headerId: "slrtx_detail_modal_header",
    bodyId: "slrtx_detail_modal_body",
    closeButtonId: "slrtx_detail_modal_close_button",
    panelClassName: "max-h-[calc(100dvh-6.5rem)] mb-16 sm:mb-0 sm:max-h-[min(92vh,820px)]",
    onClose: () => actions.closeDetail(),
  });
}

function closeTransactionModal() {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === "slrtx-detail-modal") {
    closeModal({ notify: false });
  }
}

function transactionsHero({ transactions, filteredTransactions, onDashboard }) {
  const summary = transactionSummary(transactions);
  const section = document.createElement("section");
  section.id = "slrtx_header";
  section.className = "relative overflow-hidden rounded-[2rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.84),rgba(240,253,250,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7";
  section.dataset.ds = "seller.transactions.hero";

  const layout = document.createElement("section");
  layout.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-3";
  const icon = document.createElement("span");
  icon.className = "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white leading-none shadow-[0_16px_40px_rgba(249,115,22,0.22)]";
  icon.append(createIcon("transaction", { className: "block h-5 w-5 leading-none" }));
  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-orange-700", "Seller transaction desk"),
    textNode("h1", "max-w-3xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", "Transaksi"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", "Pantau transaksi mobil, status pembayaran, dan progres penjualan."),
  );

  const side = document.createElement("section");
  side.className = "grid gap-3 lg:min-w-[420px]";
  const stats = document.createElement("section");
  stats.className = "grid gap-2 sm:grid-cols-3";
  [
    ["Total", transactions.length],
    ["Tampil", filteredTransactions.length],
    ["Nilai", formatCurrency(summary.totalValue)],
  ].forEach(([label, value]) => {
    const card = document.createElement("section");
    card.className = "rounded-[1.25rem] border border-white/80 bg-white/78 p-3 shadow-sm";
    card.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "break-words text-2xl font-black text-gray-950", String(value)),
    );
    stats.append(card);
  });

  const dashboard = Button({
    label: "Dashboard",
    variant: "secondary",
    onClick: onDashboard,
    designHook: "shared.button.secondary",
  });
  dashboard.id = "slrtx_dashboard_button";
  dashboard.classList.add("max-w-[160px]", "justify-self-start", "truncate", "lg:justify-self-end");
  dashboard.prepend(createIcon("dashboard", { className: "block h-4 w-4 leading-none" }));
  side.append(stats, dashboard);

  layout.append(copy, side);
  section.append(layout);
  return section;
}

function transactionsFilterBar({ query, transactions, onChange }) {
  const statuses = uniqueValues(transactions.map((transaction) => transaction.transaction_status));
  const paymentTypes = uniqueValues(transactions.map((transaction) => transaction.payment_type));
  const section = document.createElement("section");
  section.id = "slrtx_filter_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_190px_170px_170px] md:items-end";
  section.dataset.ds = "seller.transactions.filters";

  const searchWrap = controlWrap("Cari transaksi");
  const search = document.createElement("input");
  search.id = "slrtx_search_input";
  search.value = query.keyword ?? "";
  search.placeholder = "Buyer, invoice, mobil";
  search.className = controlClassName();
  search.addEventListener("change", () => onChange?.({ keyword: search.value }));
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      onChange?.({ keyword: search.value });
    }
  });
  searchWrap.append(search);

  const statusWrap = controlWrap("Status");
  const status = document.createElement("select");
  status.id = "slrtx_status_filter";
  status.className = controlClassName();
  status.append(optionNode("", "Semua status", !query.status));
  statuses.forEach((value) => status.append(optionNode(value, sellerTransactionService.statusMeta(value).label, value === query.status)));
  status.addEventListener("change", () => onChange?.({ status: status.value }));
  statusWrap.append(status);

  const paymentWrap = controlWrap("Pembayaran");
  const payment = document.createElement("select");
  payment.id = "slrtx_payment_filter";
  payment.className = controlClassName();
  payment.append(optionNode("", "Semua tipe", !query.paymentType));
  paymentTypes.forEach((value) => payment.append(optionNode(value, sellerTransactionService.paymentTypeLabel(value), value === query.paymentType)));
  payment.addEventListener("change", () => onChange?.({ paymentType: payment.value }));
  paymentWrap.append(payment);

  const periodWrap = controlWrap("Periode");
  const period = document.createElement("select");
  period.id = "slrtx_period_filter";
  period.className = controlClassName();
  [
    ["", "Semua periode"],
    ["today", "Hari ini"],
    ["7d", "7 hari"],
    ["30d", "30 hari"],
  ].forEach(([value, label]) => period.append(optionNode(value, label, value === query.period)));
  period.addEventListener("change", () => onChange?.({ period: period.value }));
  periodWrap.append(period);

  section.append(searchWrap, statusWrap, paymentWrap, periodWrap);
  return section;
}

function filterTransactions(transactions = [], query = {}) {
  const keyword = String(query.keyword ?? "").trim().toLowerCase();
  const status = String(query.status ?? "").trim();
  const paymentType = String(query.paymentType ?? "").trim();
  const period = String(query.period ?? "").trim();

  return transactions.filter((transaction) => {
    if (status && transaction.transaction_status !== status) {
      return false;
    }

    if (paymentType && transaction.payment_type !== paymentType) {
      return false;
    }

    if (period && !isInPeriod(transaction.created_at, period)) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [
      transaction.transaction_code,
      transaction.id,
      transaction.buyer?.name,
      transaction.buyer?.email,
      transaction.buyer?.phone_number,
      transaction.car?.brand_name,
      transaction.car?.model_name,
      transaction.car_id,
      transaction.payment_type,
      transaction.transaction_status,
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });
}

function resolveTransaction(transactions = [], transactionId = "") {
  if (!transactionId) {
    return null;
  }
  return transactions.find((transaction) => Number(transaction.id) === Number(transactionId)) ?? null;
}

function transactionSummary(transactions = []) {
  return transactions.reduce((carry, transaction) => {
    const financials = sellerTransactionService.financials(transaction);
    return {
      ...carry,
      totalValue: carry.totalValue + Number(financials.total || 0),
    };
  }, { totalValue: 0 });
}

function buildTransactionsPath(query = {}) {
  const params = new URLSearchParams();
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.status) params.set("status", query.status);
  if (query.paymentType) params.set("payment_type", query.paymentType);
  if (query.period) params.set("period", query.period);
  if (query.transactionId) params.set("transaction_id", String(query.transactionId));
  if (Number(query.page) > 1) params.set("page", String(query.page));
  if (Number(query.pageSize) > 0 && Number(query.pageSize) !== DEFAULT_QUERY.pageSize) params.set("page_size", String(query.pageSize));
  const qs = params.toString();
  return qs ? `/seller/transactions?${qs}` : "/seller/transactions";
}

function createTransactionsQuery(query = {}) {
  return {
    ...DEFAULT_QUERY,
    keyword: query.keyword ?? "",
    status: query.status ?? "",
    paymentType: query.payment_type ?? query.paymentType ?? "",
    period: query.period ?? "",
    transactionId: query.transaction_id ?? query.transactionId ?? "",
    page: Math.max(1, Number(query.page || DEFAULT_QUERY.page)),
    pageSize: Math.max(1, Number(query.page_size || query.pageSize || DEFAULT_QUERY.pageSize)),
  };
}

function syncTransactionsUrl(query) {
  const url = new URL(window.location.href);
  url.hash = `#${buildTransactionsPath(query)}`;
  window.history.replaceState(window.history.state, "", url);
}

function isInPeriod(value, period) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }
  const now = new Date();
  const start = new Date(now);
  if (period === "today") {
    return date.toDateString() === now.toDateString();
  }
  if (period === "7d") {
    start.setDate(now.getDate() - 7);
    return date >= start;
  }
  if (period === "30d") {
    start.setDate(now.getDate() - 30);
    return date >= start;
  }
  return true;
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function controlWrap(label) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  wrap.textContent = label;
  return wrap;
}

function optionNode(value, label, selected = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  return option;
}

function controlClassName() {
  return "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-gray-400 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
