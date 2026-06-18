import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { authStore } from "../../../state/authStore.js";
import { mergeActiveUserIdentity } from "../../../state/sync/authUserSync.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { getTransactionStatusMeta } from "../../../utils/transactionStatus.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { NotificationBell } from "../../notifications/components/notificationBell.js";
import { BUYER_MOBILE_FOOTER_ITEMS, BuyerMobileFooterNav } from "../components/buyerMobileFooterNav.js";
import { BuyerDesktopTopNav } from "../components/buyerDesktopTopNav.js";
import { buyerState } from "../state/buyerState.js";
import { buyerTransactionDetailPreloadService } from "../services/buyerTransactionDetailPreloadService.js";

export function BuyerPortfolioPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;

  const actions = {
    navigate(path) {
      currentContext?.router?.navigate(path);
    },
    openTransactions() {
      currentContext?.router?.navigate("/buyer/transactions");
    },
    openTransaction(transaction) {
      if (transaction?.id) {
        currentContext?.router?.navigate(`/buyer/transactions/${transaction.id}`);
        return;
      }
      currentContext?.router?.navigate("/buyer/transactions");
    },
    openCatalog() {
      currentContext?.router?.navigate("/");
    },
    showDevelopmentToast() {
      showToast("Fitur masih dalam Pengembangan", { type: "info" });
    },
  };

  return createPageLifecycle({
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      render(root, currentContext, actions);
      return root;
    },
    hydrate(context) {
      currentContext = context;
      render(root, currentContext, actions);
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe((state, action) => {
        if (String(action ?? "").startsWith("ui:")) {
          return;
        }
        render(root, currentContext, actions);
      });
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, context, actions) {
  if (!root) {
    return;
  }

  const snapshotTransactions = buyerState.snapshot("transactions", { transactions: [] });
  const dashboardTransactions = buyerState.working("buyerDashboard", "transactions", snapshotTransactions);
  const portfolioTransactions = buyerState.working("buyerPortfolio", "transactions", dashboardTransactions ?? snapshotTransactions);
  const transactions = normalizeTransactions(portfolioTransactions ?? dashboardTransactions ?? snapshotTransactions);
  const summary = summarizeTransactions(transactions);
  const user = resolveBuyerUser();
  const activePath = context?.path ?? appStore.get("app.currentRoute.path", "/buyer/portfolio");

  const page = document.createElement("section");
  page.id = "byrpf_page";
  page.className = "mx-auto grid min-w-0 w-full max-w-[430px] gap-5 pb-28 text-[var(--pb-text)] md:max-w-[1180px] md:gap-6 md:pb-8";
  page.dataset.ds = "buyer.portfolio.page";

  page.append(
    BuyerDesktopTopNav({
      activePath,
      onNavigate: (path) => actions.navigate(path),
      brandLabel: "Portofolio",
      brandIcon: "dashboard",
      user,
    }),
    buyerMobileHeader({ actions }),
    portfolioHeader({ summary, actions }),
    summaryCards({ summary }),
    transactionPreview({ transactions, actions }),
    affiliatorPanel({ user, actions }),
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
  header.id = "byrpf_mobile_header";
  header.className = "relative flex min-w-0 items-center justify-between gap-3 px-1 py-1 md:hidden";
  header.dataset.ds = "buyer.portfolio.mobile_header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 flex-1 gap-0.5";
  copy.append(
    textNode("p", "text-sm font-bold text-[var(--pb-text-muted)]", "Buyer Center"),
    textNode("h1", "truncate text-2xl font-black leading-tight tracking-normal text-[var(--pb-text)]", "Portofolio"),
  );

  const actionGroup = document.createElement("section");
  actionGroup.className = "relative z-20 inline-flex shrink-0 items-center justify-end gap-2";
  actionGroup.append(
    NotificationBell({
      idPrefix: "byrpf_mobile",
      compact: true,
      onNavigate: actions.navigate,
      withBackdrop: true,
    }),
    buyerProfileAction({ actions, compact: true }),
  );

  header.append(copy, actionGroup);
  return header;
}

function portfolioHeader({ summary, actions }) {
  const header = document.createElement("header");
  header.id = "byrpf_header";
  header.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_12%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-surface-card)_94%,white)] p-5 shadow-[var(--pb-shadow-card)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:rounded-[2rem] md:p-6";
  header.dataset.ds = "buyer.portfolio.header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    textNode("p", "text-xs font-black uppercase tracking-normal text-[var(--pb-brand-secondary)]", "Portofolio Buyer"),
    textNode("h1", "break-words text-xl font-black leading-tight tracking-normal text-[var(--pb-text)] md:text-4xl", "Transaksi & Affiliator"),
    textNode("p", "max-w-2xl text-sm font-semibold leading-6 text-[var(--pb-text-muted)]", "Ringkasan transaksi buyer dan area awal untuk sistem affiliator buyer."),
  );

  const meta = document.createElement("section");
  meta.className = "flex min-w-0 flex-wrap gap-2 md:justify-end";
  meta.append(
    headerPill("transaction", `${summary.total} transaksi`),
    headerPill("clock", `${summary.active} aktif`),
  );

  const cta = Button({ label: "Lihat Transaksi", onClick: actions.openTransactions, designHook: "shared.button.primary" });
  cta.id = "byrpf_header_transactions_button";
  cta.prepend(createIcon("transaction", { className: "block h-4 w-4 leading-none" }));
  meta.append(cta);

  header.append(copy, meta);
  return header;
}

function summaryCards({ summary }) {
  const section = document.createElement("section");
  section.id = "byrpf_summary_cards";
  section.className = "grid grid-cols-2 gap-3 md:grid-cols-4";
  section.dataset.ds = "buyer.portfolio.summary";

  [
    ["all", "Semua Transaksi", "transaction"],
    ["waiting", "Menunggu", "clock"],
    ["process", "Diproses", "settings"],
    ["done", "Selesai", "circleCheck"],
  ].forEach(([key, label, icon]) => {
    const card = document.createElement("section");
    card.className = "grid min-w-0 gap-3 rounded-[1.35rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 shadow-[var(--pb-shadow-soft)]";
    card.append(
      iconBox({
        size: "h-10 w-10",
        className: "rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]",
        icon,
        iconSize: "h-4 w-4",
      }),
      textNode("span", "text-xs font-black text-[var(--pb-text-muted)]", label),
      textNode("strong", "text-2xl font-black text-[var(--pb-text)]", String(summary[key] ?? 0)),
    );
    section.append(card);
  });

  return section;
}

function transactionPreview({ transactions, actions }) {
  const section = document.createElement("section");
  section.id = "byrpf_transaction_preview";
  section.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)] md:p-6";
  section.dataset.ds = "buyer.portfolio.transactions";

  const header = sectionHeader("Transaksi Buyer", "Akses cepat ke transaksi pembelian Anda.", "transaction");
  const action = Button({ label: "Buka Semua", variant: "secondary", onClick: actions.openTransactions, designHook: "shared.button.secondary" });
  action.id = "byrpf_transactions_open_button";
  action.prepend(createIcon("arrowRight", { className: "block h-4 w-4 leading-none" }));
  header.append(action);
  section.append(header);

  const rows = transactions.slice(0, 4);
  if (!rows.length) {
    const emptyAction = Button({ label: "Cari Mobil", onClick: actions.openCatalog, designHook: "shared.button.primary" });
    emptyAction.id = "byrpf_empty_catalog_button";
    emptyAction.prepend(createIcon("car", { className: "block h-4 w-4 leading-none" }));
    section.append(EmptyState({
      title: "Belum ada transaksi",
      description: "Transaksi pembelian mobil Anda akan muncul di sini.",
      action: emptyAction,
    }));
    return section;
  }

  const list = document.createElement("section");
  list.className = "grid min-w-0 gap-3";
  rows.forEach((transaction) => list.append(transactionRow({ transaction, actions })));
  section.append(list);
  return section;
}

function transactionRow({ transaction, actions }) {
  const row = document.createElement("article");
  row.id = `byrpf_transaction_${transaction.id ?? transaction.transaction_code ?? "unknown"}_row`;
  row.className = "grid min-w-0 gap-3 rounded-[1.35rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    textNode("h3", "line-clamp-2 break-words text-base font-black text-[var(--pb-text)]", transactionCarLabel(transaction)),
    textNode("p", "break-words text-sm font-semibold text-[var(--pb-text-muted)]", transaction.transaction_code || `Transaksi #${transaction.id ?? "-"}`),
  );

  const meta = document.createElement("section");
  meta.className = "flex flex-wrap gap-2";
  meta.append(
    Badge({ label: getTransactionStatusMeta(transaction.transaction_status).label, variant: getTransactionStatusMeta(transaction.transaction_status).variant }),
    textNode("span", "inline-flex min-h-8 items-center rounded-full bg-[var(--pb-surface-card)] px-3 text-xs font-black text-[var(--pb-brand-secondary)]", formatCurrency(transaction.car_price ?? transaction.dp_amount ?? 0)),
    textNode("span", "inline-flex min-h-8 items-center rounded-full bg-[var(--pb-surface-card)] px-3 text-xs font-bold text-[var(--pb-text-muted)]", formatDate(transaction.created_at)),
  );
  copy.append(meta);

  const detail = Button({
    label: "Detail",
    variant: "secondary",
    onClick: () => actions.openTransaction(transaction),
    designHook: "shared.button.secondary",
  });
  detail.id = `byrpf_transaction_${transaction.id ?? "unknown"}_detail_button`;
  detail.prepend(createIcon("eye", { className: "block h-4 w-4 leading-none" }));

  row.append(copy, detail);
  return row;
}

function affiliatorPanel({ user, actions }) {
  const payoutComplete = isPayoutComplete(user);
  const section = document.createElement("section");
  section.id = "byrpf_affiliator_panel";
  section.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)] md:p-6";
  section.dataset.ds = "buyer.portfolio.affiliator";

  const header = sectionHeader("Affiliator Buyer", "Fitur share link dan komisi buyer akan tersedia di sini.", "affiliate");
  const cta = Button({
    label: payoutComplete ? "Fitur affiliator sedang disiapkan" : "Update rekening payout",
    variant: payoutComplete ? "secondary" : "primary",
    onClick: actions.showDevelopmentToast,
    designHook: payoutComplete ? "shared.button.secondary" : "shared.button.primary",
  });
  cta.id = "byrpf_affiliator_cta_button";
  cta.prepend(createIcon(payoutComplete ? "link" : "bank", { className: "block h-4 w-4 leading-none" }));
  header.append(cta);
  section.append(header);

  const grid = document.createElement("section");
  grid.className = "grid grid-cols-2 gap-3 md:grid-cols-4";
  [
    ["Unique Clicks", "0", "chart"],
    ["Leads", "0", "users"],
    ["Komisi", formatCurrency(0), "commission"],
    ["Settlement", "Belum tersedia", "wallet"],
  ].forEach(([label, value, icon]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "grid min-w-0 gap-3 rounded-[1.35rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-4 text-left shadow-[var(--pb-shadow-soft)] transition hover:bg-[var(--pb-surface-card)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
    card.addEventListener("click", actions.showDevelopmentToast);
    card.append(
      iconBox({ size: "h-10 w-10", className: "rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]", icon, iconSize: "h-4 w-4" }),
      textNode("span", "text-xs font-black text-[var(--pb-text-muted)]", label),
      textNode("strong", "break-words text-lg font-black text-[var(--pb-text)]", value),
    );
    grid.append(card);
  });

  section.append(
    grid,
    EmptyState({
      title: "Fitur affiliator sedang disiapkan",
      description: "Endpoint buyer-affiliator belum tersedia. Dashboard ini disiapkan sebagai area awal tanpa mengubah modul affiliate lama.",
    }),
  );
  return section;
}

function sectionHeader(title, description, icon) {
  const header = document.createElement("section");
  header.className = "grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center";
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3";
  copy.append(
    iconBox({ size: "h-11 w-11", className: "rounded-full bg-[var(--pb-brand-primary)] text-white", icon, iconSize: "h-5 w-5" }),
    textWrap(title, description),
  );
  header.append(copy);
  return header;
}

function buyerProfileAction({ actions, compact = false } = {}) {
  const user = resolveBuyerUser();
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
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

function summarizeTransactions(transactions) {
  const summary = { all: transactions.length, total: transactions.length, waiting: 0, process: 0, done: 0, active: 0 };
  transactions.forEach((transaction) => {
    const bucket = getTransactionStatusMeta(transaction.transaction_status).bucket;
    if (bucket in summary) {
      summary[bucket] += 1;
    }
    if (bucket !== "done") {
      summary.active += 1;
    }
  });
  return summary;
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
  const workingProfile = appStore.get("working.buyerPortfolio.profile.data", null)
    ?? appStore.get("working.buyerAccount.profile.data", null);
  return mergeActiveUserIdentity(workingProfile ?? profile, authStore.user());
}

function isPayoutComplete(user = {}) {
  return Boolean(
    String(user.bank_name ?? "").trim()
    && String(user.account_number ?? "").trim()
    && String(user.account_holder_name ?? "").trim(),
  );
}

function transactionCarLabel(transaction) {
  return [transaction.car?.brand_name, transaction.car?.model_name, transaction.car?.sub_model_name].filter(Boolean).join(" ") || `Mobil #${transaction.car_id ?? "-"}`;
}

function headerPill(icon, label) {
  const pill = document.createElement("span");
  pill.className = "inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-3 text-sm font-black text-[var(--pb-text-strong)] shadow-[var(--pb-shadow-soft)]";
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
    textNode("span", "break-words text-sm font-black text-[var(--pb-text)]", title),
    textNode("span", "break-words text-sm font-semibold text-[var(--pb-text-muted)]", description),
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

function initials(user) {
  const source = String(user?.name ?? user?.full_name ?? user?.username ?? user?.email ?? "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "U";
}

function normalizeImageUrl(value) {
  const url = String(value ?? "").trim();
  if (!url || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("/")) {
    return url;
  }
  return `/${url.replace(/^\/+/, "")}`;
}
