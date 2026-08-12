import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { mergeActiveUserIdentity } from "../../../state/sync/authUserSync.js";
import { syncBusinessTransaction } from "../../../state/sync/businessStatusSync.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { NotificationBell } from "../../notifications/components/notificationBell.js";
import { buyerState } from "../state/buyerState.js";
import { buyerTransactionService } from "../services/buyerTransactionService.js";
import { buyerTransactionDetailPreloadService } from "../services/buyerTransactionDetailPreloadService.js";
import { BUYER_MOBILE_FOOTER_ITEMS, BuyerMobileFooterNav } from "../components/buyerMobileFooterNav.js";
import { getTransactionStatusMeta, titleizeStatus } from "../../../utils/transactionStatus.js";
import { getBuyerShowroomCatalogUrl } from "../../../utils/buyerShowroomUrl.js";

const STATUS_FILTERS = [
  { id: "all", label: "Semua", icon: "transaction" },
  { id: "waiting", label: "Menunggu Pembayaran", icon: "clock" },
  { id: "process", label: "Diproses", icon: "settings" },
  { id: "done", label: "Selesai", icon: "circleCheck" },
];

export function BuyerTransactionsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const uiState = {
    search: "",
    status: "all",
  };

  const actions = {
    navigate(path) {
      currentContext?.router?.navigate(path);
    },
    openCatalog() {
      const showroomUrl = getBuyerShowroomCatalogUrl();
      if (showroomUrl) {
        currentContext?.router?.navigate(showroomUrl);
      }
    },
    openTransaction(transaction) {
      if (transaction?.id) {
        currentContext?.router?.navigate(`/buyer/transactions/${transaction.id}`);
        return;
      }
      currentContext?.router?.navigate("/buyer/transactions");
    },
    async cancelTransaction(transaction) {
      await cancelBuyerTransaction(transaction);
    },
    setSearch(value) {
      uiState.search = value;
      render(root, currentContext, actions, uiState);
      focusSearchInput();
    },
    setStatus(value) {
      uiState.status = value;
      render(root, currentContext, actions, uiState);
    },
  };

  return createPageLifecycle({
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      render(root, context, actions, uiState);
      return root;
    },
    hydrate(context) {
      currentContext = context;
      render(root, context, actions, uiState);
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe((state, action) => {
        if (String(action ?? "").startsWith("ui:")) {
          return;
        }
        render(root, currentContext, actions, uiState);
      });
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, context, actions, uiState) {
  if (!root) {
    return;
  }

  const snapshotTransactions = buyerState.snapshot("transactions", { transactions: [] });
  const workingTransactions = buyerState.working("buyerTransactions", "transactions", snapshotTransactions);
  const transactions = normalizeTransactions(workingTransactions ?? snapshotTransactions);
  const filteredTransactions = filterTransactions(transactions, uiState);
  const activePath = context?.path ?? appStore.get("app.currentRoute.path", "/buyer/transactions");
  const summary = summarizeTransactions(transactions);

  const page = document.createElement("section");
  page.id = "byrtx_page";
  page.className = "mx-auto grid min-w-0 w-full max-w-[430px] gap-5 pb-28 text-[var(--pb-text)] md:max-w-[1180px] md:gap-6 md:pb-8";
  page.dataset.ds = "buyer.transactions.page";

  page.append(
    buyerTopNavigation({ activePath, actions }),
    buyerMobileHeader({ actions }),
    transactionsHeader({ summary, actions }),
    summaryCards({ summary, activeStatus: uiState.status, actions }),
    filterBar({ uiState, actions }),
    transactionList({ transactions: filteredTransactions, actions }),
    BuyerMobileFooterNav({
      activePath,
      items: BUYER_MOBILE_FOOTER_ITEMS,
      onNavigate: (path) => actions.navigate(path),
    }),
  );

  disposeChildren(root);
  root.replaceChildren(page);
  buyerTransactionDetailPreloadService.enqueueTransactions(transactions);
}

function disposeChildren(root) {
  root?.querySelectorAll?.("*").forEach((node) => node.dispose?.());
}

function buyerMobileHeader({ actions }) {
  const header = document.createElement("header");
  header.id = "byrtx_mobile_header";
  header.className = "relative flex min-w-0 items-center justify-between gap-3 px-1 py-1 md:hidden";
  header.dataset.ds = "buyer.transactions.mobile_header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 flex-1 gap-0.5";
  copy.append(
    textNode("p", "text-xs font-bold text-[var(--pb-text-muted)]", "Buyer Center"),
    textNode("h1", "truncate text-xl font-black leading-tight tracking-normal text-[var(--pb-text)]", "Transaksi Saya"),
  );

  const actionGroup = document.createElement("section");
  actionGroup.className = "relative z-20 inline-flex shrink-0 items-center justify-end gap-2";
  actionGroup.append(
    NotificationBell({
      idPrefix: "byr_mobile",
      compact: true,
      onNavigate: actions.navigate,
      withBackdrop: true,
    }),
    buyerProfileAction({ actions, compact: true }),
  );

  header.append(copy, actionGroup);
  return header;
}

function buyerTopNavigation({ activePath, actions }) {
  const nav = document.createElement("nav");
  nav.id = "byrtx_desktop_top_nav";
  nav.className = "sticky top-0 z-40 hidden min-w-0 items-center justify-between gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 shadow-[var(--pb-shadow-card)] backdrop-blur-xl md:flex";
  nav.setAttribute("aria-label", "Navigasi buyer desktop");

  const brand = document.createElement("section");
  brand.className = "flex min-w-0 items-center gap-3 px-1";
  brand.append(
    iconBox({ size: "h-11 w-11", className: "bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)]", icon: "transaction", iconSize: "h-5 w-5" }),
    textNode("strong", "truncate text-sm font-black text-[var(--pb-text)]", "Buyer"),
  );

  const list = document.createElement("section");
  list.className = "flex min-w-0 items-center justify-end gap-2";
  BUYER_MOBILE_FOOTER_ITEMS.forEach((item) => list.append(desktopNavLink(item, activePath, actions)));

  const actionGroup = document.createElement("section");
  actionGroup.className = "inline-flex shrink-0 items-center justify-end gap-2";
  actionGroup.append(
    NotificationBell({
      idPrefix: "byr_desktop",
      onNavigate: actions.navigate,
      withBackdrop: true,
    }),
    buyerProfileAction({ actions }),
  );

  const right = document.createElement("section");
  right.className = "flex min-w-0 items-center justify-end gap-2";
  right.append(list, actionGroup);

  nav.append(brand, right);
  return nav;
}

function transactionsHeader({ summary, actions }) {
  const header = document.createElement("header");
  header.id = "byrtx_header";
  header.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_12%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-surface-card)_94%,white)] p-5 shadow-[var(--pb-shadow-card)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:rounded-[2rem] md:p-6";
  header.dataset.ds = "buyer.transactions.header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    textNode("p", "text-[10px] font-black uppercase tracking-normal text-[var(--pb-brand-secondary)]", "Buyer Center"),
    textNode("h1", "break-words text-2xl font-black leading-tight tracking-normal text-[var(--pb-text)] md:text-3xl", "Transaksi Saya"),
    textNode("p", "max-w-2xl text-xs font-semibold leading-6 text-[var(--pb-text-muted)]", "Pantau proses pembelian dan pembayaran mobil Anda."),
  );

  const meta = document.createElement("section");
  meta.className = "flex min-w-0 flex-wrap gap-2 md:justify-end";
  meta.append(
    headerPill("transaction", `${summary.total} transaksi`),
    headerPill("clock", `${summary.active} aktif`),
  );

  const back = Button({ label: "Kembali ke Portofolio", variant: "secondary", onClick: () => actions.navigate("/buyer/portfolio"), designHook: "shared.button.secondary" });
  back.id = "byrtx_header_portfolio_button";
  back.prepend(createIcon("arrowLeft", { className: "block h-4 w-4 leading-none" }));
  meta.append(back);

  const cta = Button({ label: "Cari Mobil", onClick: actions.openCatalog, designHook: "shared.button.primary" });
  cta.id = "byrtx_header_catalog_button";
  cta.prepend(createIcon("car", { className: "block h-4 w-4 leading-none" }));
  meta.append(cta);

  header.append(copy, meta);
  return header;
}

function summaryCards({ summary, activeStatus, actions }) {
  const section = document.createElement("section");
  section.id = "byrtx_summary_cards";
  section.className = "grid grid-cols-2 gap-3 md:grid-cols-4";
  section.dataset.ds = "buyer.transactions.summary";

  STATUS_FILTERS.forEach((filter) => {
    const active = activeStatus === filter.id;
    const card = document.createElement("button");
    card.id = `byrtx_summary_${filter.id}_button`;
    card.type = "button";
    card.className = active
      ? "grid min-w-0 gap-3 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_30%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] p-4 text-left shadow-[var(--pb-shadow-card)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
      : "grid min-w-0 gap-3 rounded-[1.35rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 text-left shadow-[var(--pb-shadow-soft)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
    card.addEventListener("click", () => actions.setStatus(filter.id));
    card.append(
      iconBox({
        size: "h-10 w-10",
        className: active ? "rounded-full bg-[var(--pb-brand-primary)] text-white" : "rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]",
        icon: filter.icon,
        iconSize: "h-4 w-4",
      }),
      textNode("span", "text-[10px] font-black text-[var(--pb-text-muted)]", filter.label),
      textNode("strong", "text-xl font-black text-[var(--pb-text)]", String(summary[filter.id] ?? 0)),
    );
    section.append(card);
  });

  return section;
}

function filterBar({ uiState, actions }) {
  const section = document.createElement("section");
  section.id = "byrtx_filter_bar";
  section.className = "grid min-w-0 gap-3 rounded-[1.5rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-3 shadow-[var(--pb-shadow-card)] md:grid-cols-[minmax(0,1fr)_240px] md:items-center";
  section.dataset.ds = "buyer.transactions.filters";

  const searchWrap = document.createElement("section");
  searchWrap.className = "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-[1.15rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_16%,var(--pb-border))] bg-[var(--pb-form-search-bg)] px-3 py-2";
  searchWrap.append(iconBox({ size: "h-8 w-8", className: "text-[var(--pb-text-muted)]", icon: "search", iconSize: "h-4 w-4" }));

  const input = document.createElement("input");
  input.id = "byrtx_search_input";
  input.type = "search";
  input.value = uiState.search;
  input.placeholder = "Cari transaksi, mobil, atau showroom...";
  input.autocomplete = "off";
  input.className = "min-h-10 min-w-0 border-0 bg-transparent text-xs font-semibold text-[var(--pb-text)] outline-none placeholder:text-[var(--pb-text-muted)]";
  input.addEventListener("input", () => actions.setSearch(input.value));
  searchWrap.append(input);

  const selectWrap = document.createElement("label");
  selectWrap.className = "grid min-w-0 gap-1";
  const select = document.createElement("select");
  select.id = "byrtx_status_select";
  select.className = "min-h-11 w-full rounded-[1.15rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 text-xs font-bold text-[var(--pb-text)] outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  STATUS_FILTERS.forEach((filter) => {
    const option = document.createElement("option");
    option.value = filter.id;
    option.textContent = filter.label;
    option.selected = uiState.status === filter.id;
    select.append(option);
  });
  select.addEventListener("change", () => actions.setStatus(select.value));
  selectWrap.append(select);

  section.append(searchWrap, selectWrap);
  return section;
}

function transactionList({ transactions, actions }) {
  const section = document.createElement("section");
  section.id = "byrtx_transaction_list";
  section.className = "grid min-w-0 gap-4";
  section.dataset.ds = "buyer.transactions.list";

  if (!transactions.length) {
    const action = Button({ label: "Cari Mobil", onClick: actions.openCatalog, designHook: "shared.button.primary" });
    action.id = "byrtx_empty_catalog_button";
    action.prepend(createIcon("car", { className: "block h-4 w-4 leading-none" }));
    section.append(EmptyState({
      title: "Belum ada transaksi",
      description: "Transaksi pembelian mobil Anda akan muncul di sini.",
      action,
    }));
    return section;
  }

  transactions.forEach((transaction) => {
    section.append(transactionCard({ transaction, actions }));
  });
  return section;
}

function transactionCard({ transaction, actions }) {
  const card = document.createElement("article");
  card.id = `byrtx_transaction_${transaction.id ?? transaction.transaction_code ?? "unknown"}_card`;
  card.className = "grid min-w-0 gap-4 overflow-hidden rounded-[1.6rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:grid-cols-[220px_minmax(0,1fr)] md:items-stretch md:p-4";

  const media = document.createElement("section");
  media.className = "relative aspect-[1.55/1] overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,var(--pb-surface-muted),var(--pb-surface-inset))] md:aspect-auto md:min-h-[172px]";
  const image = document.createElement("img");
  image.src = transactionImageUrl(transaction) || fallbackCarImageUrl();
  image.alt = transactionCarLabel(transaction);
  image.loading = "lazy";
  image.className = "block h-full w-full object-cover";
  image.addEventListener("error", () => {
    image.src = fallbackCarImageUrl();
  }, { once: true });
  media.append(image);

  const body = document.createElement("section");
  body.className = "grid min-w-0 gap-3 md:content-between";

  const top = document.createElement("section");
  top.className = "grid min-w-0 gap-2";
  const titleRow = document.createElement("section");
  titleRow.className = "flex min-w-0 items-start justify-between gap-3";
  titleRow.append(
    textWrap(transactionCarLabel(transaction), transaction.transaction_code || `Transaksi #${transaction.id ?? "-"}`),
    transactionStatusBadge(transaction.transaction_status),
  );
  top.append(
    titleRow,
    transactionMetaRow(transaction),
    paymentProgress(transaction),
  );

  const bottom = document.createElement("section");
  bottom.className = "grid min-w-0 gap-3 border-t border-[var(--pb-border)] pt-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end";
  bottom.append(
    valueBlock(transaction),
    transactionActions(transaction, actions),
  );

  body.append(top, bottom);
  card.append(media, body);
  return card;
}

function transactionMetaRow(transaction) {
  const row = document.createElement("section");
  row.className = "grid min-w-0 gap-2 text-xs font-semibold text-[var(--pb-text-muted)] sm:grid-cols-3";
  [
    ["calendar", formatDate(transaction.created_at)],
    ["showroom", sellerLabel(transaction)],
    ["creditCard", paymentTypeLabel(transaction.payment_type)],
  ].forEach(([icon, label]) => {
    const item = document.createElement("span");
    item.className = "inline-flex min-w-0 items-center gap-2";
    item.append(
      iconBox({ size: "h-7 w-7", className: "rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] text-[var(--pb-brand-secondary)]", icon, iconSize: "h-3.5 w-3.5" }),
      textNode("span", "min-w-0 truncate", label || "-"),
    );
    row.append(item);
  });
  return row;
}

function paymentProgress(transaction) {
  const status = statusBucket(transaction.transaction_status);
  const percent = status === "done" ? 100 : status === "process" ? 66 : status === "waiting" ? 34 : 18;
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-2";

  const copy = document.createElement("section");
  copy.className = "flex min-w-0 items-center justify-between gap-3 text-[10px] font-bold text-[var(--pb-text-muted)]";
  copy.append(
    textNode("span", "truncate", status === "done" ? "Pembayaran selesai" : status === "process" ? "Transaksi diproses" : "Menunggu pembayaran"),
    textNode("span", "shrink-0 text-[var(--pb-brand-secondary)]", `${percent}%`),
  );

  const track = document.createElement("span");
  track.className = "block h-2 overflow-hidden rounded-full bg-[var(--pb-surface-muted)]";
  const bar = document.createElement("span");
  bar.className = "block h-full rounded-full bg-[var(--pb-brand-primary)]";
  bar.style.width = `${percent}%`;
  track.append(bar);
  wrap.append(copy, track);
  return wrap;
}

function valueBlock(transaction) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("span", "text-[10px] font-black uppercase text-[var(--pb-text-muted)]", "Nilai transaksi"),
    textNode("strong", "break-words text-lg font-black text-[var(--pb-brand-secondary)]", formatCurrency(transaction.car_price ?? transaction.dp_amount ?? 0)),
  );
  return wrap;
}

function transactionActions(transaction, actions) {
  const wrap = document.createElement("section");
  wrap.className = "flex flex-wrap gap-2 md:justify-end";
  const bucket = statusBucket(transaction.transaction_status);

  const detail = Button({
    label: "Lihat Detail",
    variant: bucket === "process" ? "primary" : "secondary",
    onClick: () => actions.openTransaction(transaction),
    designHook: bucket === "process" ? "shared.button.primary" : "shared.button.secondary",
  });
  detail.id = `byrtx_transaction_${transaction.id ?? "unknown"}_detail_button`;
  detail.prepend(createIcon("eye", { className: "block h-4 w-4 leading-none" }));
  wrap.append(detail);

  if (bucket === "waiting" || isPaymentExpired(transaction)) {
    const expired = isPaymentExpired(transaction);
    const pay = Button({
      label: expired ? "Pembayaran Kadaluarsa" : "Lanjutkan Pembayaran",
      variant: expired ? "secondary" : "primary",
      disabled: expired,
      onClick: expired ? null : () => actions.openTransaction(transaction),
      designHook: expired ? "shared.button.secondary" : "shared.button.primary",
    });
    pay.id = `byrtx_transaction_${transaction.id ?? "unknown"}_pay_button`;
    pay.prepend(createIcon(expired ? "clock" : "creditCard", { className: "block h-4 w-4 leading-none" }));
    if (expired) {
      pay.setAttribute("aria-disabled", "true");
      pay.title = "Pembayaran sudah kadaluarsa";
      pay.classList.add("cursor-not-allowed", "opacity-65");
    }
    wrap.append(pay);
  }

  if (canBuyerCancel(transaction)) {
    const cancel = Button({
      label: "Batalkan",
      variant: "secondary",
      onClick: () => actions.cancelTransaction(transaction),
      designHook: "shared.button.secondary",
    });
    cancel.id = `byrtx_transaction_${transaction.id ?? "unknown"}_cancel_button`;
    cancel.prepend(createIcon("circleXmark", { className: "block h-4 w-4 leading-none" }));
    wrap.append(cancel);
  }

  return wrap;
}

async function cancelBuyerTransaction(transaction) {
  if (!transaction?.id || !canBuyerCancel(transaction)) {
    return;
  }

  const payload = collectBuyerCancelPayload(transaction);
  if (payload === null) {
    return;
  }

  try {
    const updated = await buyerTransactionService.cancel(transaction.id, payload);
    if (updated) {
      syncBusinessTransaction(updated, {
        primaryRole: "buyer",
        source: "buyer-transactions:cancel",
      });
    }
    showToast("Transaksi berhasil dibatalkan.", { type: "success" });
  } catch (error) {
    showToast(error.message || "Gagal membatalkan transaksi.", { type: "error" });
  }
}

function collectBuyerCancelPayload(transaction) {
  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  const isDpPaid = status === "dp_paid";
  const message = isDpPaid
    ? "Batalkan transaksi ini? Refund DP akan dipotong 10%."
    : "Batalkan transaksi ini?";

  if (!window.confirm(message)) {
    return null;
  }

  const payload = {
    cancel_reason: window.prompt("Alasan pembatalan", "") ?? "",
  };

  if (!isDpPaid) {
    return payload;
  }

  const refundBankName = window.prompt("Nama bank untuk refund DP", "");
  if (refundBankName === null) {
    return null;
  }
  const refundAccountNumber = window.prompt("Nomor rekening untuk refund DP", "");
  if (refundAccountNumber === null) {
    return null;
  }
  const refundAccountName = window.prompt("Nama pemilik rekening", "");
  if (refundAccountName === null) {
    return null;
  }

  return {
    ...payload,
    refund_bank_name: refundBankName.trim(),
    refund_account_number: refundAccountNumber.trim(),
    refund_account_name: refundAccountName.trim(),
  };
}

function canBuyerCancel(transaction) {
  return ["pending_payment", "dp_paid"].includes(String(transaction?.transaction_status ?? "").toLowerCase());
}

function isPaymentExpired(transaction) {
  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  return status === "expired" || isExpiredDate(transaction?.expires_at);
}

function isExpiredDate(value) {
  if (!value) {
    return false;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) && time < Date.now();
}

function desktopNavLink(item, activePath, actions) {
  const active = isActiveNav(item, activePath);
  const link = item.disabled ? document.createElement("button") : document.createElement("a");
  link.id = `byrtx_nav_desktop_${item.id}`;
  const target = item.id === "catalog" ? getBuyerShowroomCatalogUrl() : item.path;
  if (item.disabled) {
    link.type = "button";
    link.disabled = true;
    link.setAttribute("aria-disabled", "true");
  } else {
    if (target) {
      link.href = item.id === "catalog" ? target : `#${target}`;
    } else {
      link.setAttribute("aria-disabled", "true");
    }
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (target) {
        actions.navigate(target);
      }
    });
  }
  link.className = active
    ? "inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-4 py-2 text-xs font-black text-[var(--pb-brand-secondary)] no-underline shadow-[var(--pb-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-[var(--pb-text-muted)] no-underline transition hover:bg-[var(--pb-surface-muted)] hover:text-[var(--pb-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55";
  if (active) {
    link.setAttribute("aria-current", "page");
  }
  link.append(
    iconBox({ size: "h-7 w-7", className: active ? "text-[var(--pb-brand-secondary)]" : "text-[var(--pb-text-muted)]", icon: item.icon, iconSize: "h-4 w-4" }),
    textNode("span", "truncate", item.label),
  );
  return link;
}

function buyerProfileAction({ actions, compact = false } = {}) {
  const user = resolveBuyerUser();
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.setAttribute("aria-label", "Profil Saya");
  button.title = "Profil Saya";
  button.addEventListener("click", () => actions?.navigate?.("/profile"));

  const src = user?.avatar_url ?? user?.photo_url ?? user?.profile_photo_url ?? "";
  if (src) {
    const image = document.createElement("img");
    image.src = normalizeImageUrl(src);
    image.alt = "Foto profil";
    image.loading = "lazy";
    image.className = "block h-full w-full object-cover";
    image.addEventListener("error", () => {
      button.textContent = initials(user);
    }, { once: true });
    button.append(image);
    return button;
  }

  button.textContent = initials(user);
  return button;
}

function filterTransactions(transactions, uiState) {
  const search = String(uiState.search ?? "").trim().toLowerCase();
  return transactions.filter((transaction) => {
    if (uiState.status !== "all" && statusBucket(transaction.transaction_status) !== uiState.status) {
      return false;
    }
    if (!search) {
      return true;
    }
    const haystack = [
      transaction.transaction_code,
      transactionCarLabel(transaction),
      sellerLabel(transaction),
      transaction.transaction_status,
      transaction.payment_type,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search);
  });
}

function summarizeTransactions(transactions) {
  const summary = { all: transactions.length, total: transactions.length, waiting: 0, process: 0, done: 0, active: 0 };
  transactions.forEach((transaction) => {
    const bucket = statusBucket(transaction.transaction_status);
    if (bucket in summary) {
      summary[bucket] += 1;
    }
    if (bucket !== "done") {
      summary.active += 1;
    }
  });
  return summary;
}

function statusBucket(status) {
  return getTransactionStatusMeta(status).bucket;
}

function transactionStatusBadge(status) {
  const meta = transactionStatusMeta(status);
  return Badge({ label: meta.label, variant: meta.variant });
}

function transactionStatusMeta(status) {
  return getTransactionStatusMeta(status);
}

function normalizeTransactions(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean);
  }
  if (Array.isArray(payload?.transactions)) {
    return payload.transactions.filter(Boolean);
  }
  if (Array.isArray(payload?.data?.transactions)) {
    return payload.data.transactions.filter(Boolean);
  }
  return [];
}

function resolveBuyerUser() {
  const profile = buyerState.snapshot("profile", null);
  const authUser = appStore.get("auth.user", null);
  return mergeActiveUserIdentity(profile, authUser);
}

function initials(user) {
  const source = String(user?.name ?? user?.full_name ?? user?.username ?? user?.email ?? "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "U";
}

function transactionImageUrl(transaction) {
  return carImageUrl({
    ...(transaction ?? {}),
    ...(transaction?.car ?? {}),
  });
}

function carImageUrl(car) {
  const images = Array.isArray(car?.images) ? car.images : [];
  const media = Array.isArray(car?.media) ? car.media : [];
  const gallery = Array.isArray(car?.gallery) ? car.gallery : [];
  const photos = Array.isArray(car?.photos) ? car.photos : [];
  const cover = images.find((image) => image?.is_cover || image?.is_primary) ?? images[0] ?? null;
  const altCover = [...media, ...gallery, ...photos].find((image) => image?.is_cover || image?.is_primary) ?? media[0] ?? gallery[0] ?? photos[0] ?? null;
  const url = car?.cover_image
    ?? car?.cover_image_url
    ?? car?.car_cover_image
    ?? car?.image_url
    ?? car?.primary_image_url
    ?? car?.thumbnail_url
    ?? car?.photo_url
    ?? (typeof car?.image === "string" ? car.image : "")
    ?? (typeof cover === "string" ? cover : "")
    ?? (typeof altCover === "string" ? altCover : "")
    ?? cover?.url
    ?? cover?.public_url
    ?? cover?.file_url
    ?? cover?.file_path
    ?? altCover?.url
    ?? altCover?.public_url
    ?? altCover?.file_url
    ?? altCover?.file_path
    ?? "";
  return normalizeImageUrl(url);
}

function normalizeImageUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) {
    return "";
  }
  if (/^(https?:|data:|blob:)/.test(value) || value.startsWith("/")) {
    return value;
  }
  return `/${value}`;
}

function fallbackCarImageUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#faf4ed"/>
          <stop offset="0.55" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#efe3d5"/>
        </linearGradient>
        <linearGradient id="car" x1="0" x2="1">
          <stop offset="0" stop-color="#111827"/>
          <stop offset="1" stop-color="#374151"/>
        </linearGradient>
      </defs>
      <rect width="960" height="560" fill="url(#bg)"/>
      <path d="M0 424 C170 368 332 430 512 382 C692 335 798 360 960 310 L960 560 L0 560 Z" fill="#f5ece1"/>
      <g transform="translate(125 150)">
        <path d="M112 230 C144 148 208 102 318 96 L462 96 C564 99 630 150 678 230 L724 244 C754 252 774 278 774 309 L774 346 L694 346 C687 298 648 263 600 263 C552 263 512 298 505 346 L290 346 C283 298 243 263 195 263 C147 263 107 298 100 346 L40 346 L40 305 C40 268 70 237 105 234 Z" fill="url(#car)"/>
        <path d="M214 130 L322 130 L306 214 L132 214 C156 170 177 144 214 130 Z" fill="#e0eff7" opacity="0.86"/>
        <path d="M348 130 L456 130 C516 132 558 158 598 214 L334 214 Z" fill="#e0eff7" opacity="0.78"/>
        <path d="M82 255 L166 255" stroke="#eab676" stroke-width="16" stroke-linecap="round"/>
        <circle cx="195" cy="354" r="60" fill="#111827"/>
        <circle cx="195" cy="354" r="30" fill="#f8fafc"/>
        <circle cx="600" cy="354" r="60" fill="#111827"/>
        <circle cx="600" cy="354" r="30" fill="#f8fafc"/>
      </g>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function transactionCarLabel(transaction) {
  return [transaction.car?.brand_name, transaction.car?.model_name, transaction.car?.sub_model_name].filter(Boolean).join(" ") || `Mobil #${transaction.car_id ?? "-"}`;
}

function sellerLabel(transaction) {
  return transaction.seller?.name || transaction.showroom?.name || transaction.car?.seller?.name || transaction.car?.showroom?.name || "Showroom terdaftar";
}

function paymentTypeLabel(paymentType) {
  return paymentType === "dp" ? "DP" : paymentType === "full" ? "Full payment" : statusLabel(paymentType);
}

function statusLabel(status) {
  return titleizeStatus(status);
}

function isActiveNav(item, activePath) {
  const path = String(activePath ?? "");
  if (item.path === "/buyer") {
    return path === "/buyer";
  }
  if (item.path === "/buyer/portfolio") {
    return path === "/buyer/portfolio" || path.startsWith("/buyer/transactions");
  }
  if (item.path === "/") {
    return path === "/" || path === "/buyer/cars";
  }
  return path === item.path || path.startsWith(`${item.path}/`);
}

function headerPill(icon, label) {
  const pill = document.createElement("span");
  pill.className = "inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-3 text-xs font-black text-[var(--pb-text-strong)] shadow-[var(--pb-shadow-soft)]";
  pill.append(
    iconBox({ size: "h-7 w-7", className: "rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]", icon, iconSize: "h-3.5 w-3.5" }),
    document.createTextNode(label),
  );
  return pill;
}

function textWrap(title, description) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("h2", "line-clamp-2 break-words text-base font-black leading-6 text-[var(--pb-text)]", title),
    textNode("p", "break-words text-xs font-semibold text-[var(--pb-text-muted)]", description),
  );
  return wrap;
}

function iconBox({ size = "h-10 w-10", className = "", icon = "info", iconSize = "h-4 w-4" } = {}) {
  const box = document.createElement("span");
  box.className = ["inline-flex shrink-0 items-center justify-center leading-none", size, className].filter(Boolean).join(" ");
  box.append(createIcon(icon, { className: `block ${iconSize} leading-none` }));
  return box;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}

function focusSearchInput() {
  requestAnimationFrame(() => {
    const input = document.querySelector("#byrtx_search_input");
    if (input instanceof HTMLInputElement) {
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  });
}
