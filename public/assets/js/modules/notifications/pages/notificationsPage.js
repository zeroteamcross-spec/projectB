import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { authStore } from "../../../state/authStore.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { notificationService } from "../services/notificationService.js";
import { NotificationFilterTabs } from "../components/notificationFilterTabs.js";
import { NotificationsPageList } from "../components/notificationsPageList.js";
import { NotificationBell } from "../components/notificationBell.js";
import { BUYER_MOBILE_FOOTER_ITEMS, BuyerMobileFooterNav } from "../../buyer/components/buyerMobileFooterNav.js";
import { AffiliateAccountLayout, affiliateAccountActions } from "../../affiliate/components/affiliateAccountShell.js";
import { renderBuyerBrandIcon } from "../../../utils/buyerShowroomIcon.js";

const PAGE_SIZE = 20;

export function NotificationsPage() {
  let root = null;
  let contextRef = null;
  let unsubscribe = null;

  const state = {
    filter: "all",
    loadingMore: false,
  };

  const actions = {
    async load(filter = state.filter, { append = false, cursor = null } = {}) {
      try {
        await notificationService.loadList({
          status: filter,
          limit: PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        });
      } catch (error) {
        showToast(error.message || "Notifikasi belum bisa dimuat.", { type: "error" });
      } finally {
        state.loadingMore = false;
        render(root, contextRef, state, actions);
      }
    },
    async changeFilter(filter) {
      if (state.filter === filter && notificationService.working().workingItems.length) {
        return;
      }
      state.filter = filter;
      render(root, contextRef, state, actions);
      await actions.load(filter);
    },
    async markAllRead() {
      try {
        await notificationService.markAllRead();
        showToast("Semua notifikasi ditandai dibaca.", { type: "success" });
      } catch (error) {
        showToast(error.message || "Gagal menandai semua notifikasi.", { type: "error" });
      } finally {
        render(root, contextRef, state, actions);
      }
    },
    async loadMore() {
      const working = notificationService.working();
      if (!working.nextCursor || state.loadingMore) {
        return;
      }
      state.loadingMore = true;
      render(root, contextRef, state, actions);
      await actions.load(state.filter, { append: true, cursor: working.nextCursor });
    },
    retry() {
      actions.load(state.filter);
    },
    navigate(link) {
      const value = String(link ?? "").trim();
      if (!value) {
        return;
      }
      contextRef?.router?.navigate(value);
    },
    rerender() {
      render(root, contextRef, state, actions);
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      contextRef = context;
      state.filter = "all";
      state.loadingMore = false;
    },
    mount(context) {
      contextRef = context;
      root = document.createElement("section");
      root.id = "ntf_page";
      root.className = "mx-auto grid min-w-0 w-full max-w-[1180px] gap-5 text-[var(--pb-text)]";
      render(root, contextRef, state, actions);
      return root;
    },
    hydrate(context) {
      contextRef = context;
      const working = notificationService.working();
      if (!working.workingItems.length || working.activeFilter !== state.filter) {
        actions.load(state.filter);
      }
    },
    bindEvents(context) {
      contextRef = context;
      unsubscribe = notificationService.subscribe(() => render(root, contextRef, state, actions));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe?.();
      unsubscribe = null;
      root = null;
    },
  });
}

function render(root, context, state, actions) {
  if (!root) {
    return;
  }

  const working = notificationService.working();
  const items = working.workingItems ?? [];
  const isLoadingInitial = Boolean(working.isLoading && !items.length);
  const unreadCount = Number(working.unreadCount ?? 0);
  const isBuyer = authStore.role() === "buyer" || authStore.user()?.role === "buyer";
  const isAffiliate = authStore.role() === "affiliate_admin" || authStore.user()?.role === "affiliate_admin";

  if (isBuyer) {
    updateBuyerNotifications(root, context, state, actions, {
      working,
      items,
      isLoadingInitial,
      unreadCount,
    });
    return;
  }

  if (isAffiliate) {
    updateAffiliateNotifications(root, context, state, actions, {
      working,
      items,
      isLoadingInitial,
      unreadCount,
    });
    return;
  }

  updateDefaultNotifications(root, state, actions, {
    working,
    items,
    isLoadingInitial,
    unreadCount,
  });
}

function updateDefaultNotifications(root, state, actions, viewState) {
  const { working, items, isLoadingInitial, unreadCount } = viewState;

  const shell = ensureNotificationsShell(root, "default", () => {
    const page = document.createElement("section");
    page.className = "grid min-w-0 gap-5";
    const headerHost = hostSection("ntf_header_host");
    const filterHost = hostSection("ntf_filter_host", "grid min-w-0 gap-3 rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-3 shadow-[var(--pb-shadow-card)] sm:flex sm:items-center sm:justify-between sm:p-4");
    const listHost = hostSection("ntf_list_region", "relative grid min-h-[360px] min-w-0 content-start gap-3");
    const moreHost = hostSection("ntf_load_more_region", "flex min-h-12 justify-center");
    page.append(headerHost, filterHost, listHost, moreHost);
    return { page, headerHost, filterHost, listHost, moreHost };
  });

  replaceHost(shell.headerHost, pageHeader(unreadCount, working, actions));
  replaceHost(shell.filterHost, NotificationFilterTabs({ active: state.filter, onChange: actions.changeFilter }));
  updateListHost(shell.listHost, listContent({
    working,
    items,
    isLoadingInitial,
    emptyNode: emptyStateForFilter(state.filter),
    errorNode: errorState(actions),
    listNode: () => NotificationsPageList({
      items,
      markingIds: working.markingIds,
      onNavigate: actions.navigate,
      onChange: actions.rerender,
    }),
  }));
  replaceHost(shell.moreHost, loadMoreButton({ working, items, state, actions }));
}

function updateAffiliateNotifications(root, context, state, actions, viewState) {
  const { working, items, isLoadingInitial, unreadCount } = viewState;
  const shell = ensureNotificationsShell(root, "affiliate", () => {
    const headerHost = hostSection("af_notifications_header_host");
    const filterHost = hostSection("af_notifications_filter_host");
    const listHost = hostSection("af_notifications_list_region", "relative grid min-h-[360px] min-w-0 content-start gap-3");
    const moreHost = hostSection("af_notifications_load_more_region", "flex min-h-12 justify-center");

    const page = AffiliateAccountLayout({
      activePath: context?.path ?? "/notifications",
      title: "Notifikasi",
      subtitle: "Pusat notifikasi",
      icon: "bell",
      maxWidth: "max-w-[1180px]",
      actions: {
        ...affiliateAccountActions(context),
        navigate: actions.navigate,
      },
      children: [headerHost, filterHost, listHost, moreHost],
    });
    return { page, headerHost, filterHost, listHost, moreHost };
  });

  replaceHost(shell.headerHost, pageHeader(unreadCount, working, actions));
  replaceHost(shell.filterHost, affiliateFilterSection(state, actions));
  updateListHost(shell.listHost, listContent({
    working,
    items,
    isLoadingInitial,
    emptyNode: emptyStateForFilter(state.filter),
    errorNode: errorState(actions),
    listNode: () => NotificationsPageList({
      items,
      markingIds: working.markingIds,
      onNavigate: actions.navigate,
      onChange: actions.rerender,
    }),
  }));
  replaceHost(shell.moreHost, loadMoreButton({ working, items, state, actions }));
}

function affiliateFilterSection(state, actions) {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-3 rounded-[1.55rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 text-[var(--pb-text)] shadow-[var(--pb-shadow-soft)] backdrop-blur-xl";
  section.append(NotificationFilterTabs({ active: state.filter, onChange: actions.changeFilter }));
  return section;
}

function updateBuyerNotifications(root, context, state, actions, viewState) {
  const { working, items, isLoadingInitial, unreadCount } = viewState;
  const activePath = context?.path ?? appStore.get("app.currentRoute.path", "/notifications");
  const user = authStore.user() ?? {};

  const shell = ensureNotificationsShell(root, "buyer", () => {
    const page = document.createElement("section");
    page.id = "byr_notifications_page";
    page.className = "mx-auto grid min-w-0 w-full max-w-[430px] gap-5 pb-28 text-[var(--pb-text)] md:max-w-[1180px] md:gap-6 md:pb-8";
    page.dataset.ds = "buyer.notifications.page";

    const headerHost = hostSection("byr_notifications_header_host");
    const filterHost = buyerFilterSectionShell();
    const listHost = hostSection("byr_notifications_list_region", "relative grid min-h-[380px] min-w-0 content-start gap-3");
    const moreHost = hostSection("byr_notifications_load_more_region", "flex min-h-12 justify-center");
    page.append(
      buyerTopNavigation({ activePath, user, actions }),
      buyerMobileHeader({ user, actions }),
      headerHost,
      filterHost,
      listHost,
      moreHost,
      BuyerMobileFooterNav({
        activePath,
        items: BUYER_MOBILE_FOOTER_ITEMS,
        onNavigate: (path) => actions.navigate(path),
      }),
    );

    return { page, headerHost, filterHost, listHost, moreHost };
  });

  replaceHost(shell.headerHost, buyerNotificationsHeader({ unreadCount, working, actions }));
  replaceHost(shell.filterHost, NotificationFilterTabs({ active: state.filter, onChange: actions.changeFilter }));
  updateListHost(shell.listHost, listContent({
    working,
    items,
    isLoadingInitial,
    emptyNode: buyerEmptyStateForFilter(state.filter, actions),
    errorNode: buyerErrorState(actions),
    listNode: () => NotificationsPageList({
      items,
      markingIds: working.markingIds,
      onNavigate: actions.navigate,
      onChange: actions.rerender,
      variant: "buyer",
    }),
  }));
  replaceHost(shell.moreHost, loadMoreButton({ working, items, state, actions, buyer: true }));
}

function disposeChildren(root) {
  root?.querySelectorAll?.("*").forEach((node) => node.dispose?.());
}

function ensureNotificationsShell(root, key, factory) {
  if (root.__notificationsShell?.key === key) {
    return root.__notificationsShell;
  }

  disposeChildren(root);
  const shell = factory();
  root.replaceChildren(shell.page);
  root.__notificationsShell = { key, ...shell };
  return root.__notificationsShell;
}

function hostSection(id, className = "grid min-w-0 gap-3") {
  const section = document.createElement("section");
  section.id = id;
  section.className = className;
  return section;
}

function replaceHost(host, node) {
  if (!host) {
    return;
  }
  host.querySelectorAll?.("*").forEach((child) => child.dispose?.());
  host.replaceChildren(...(node ? [node] : []));
}

function updateListHost(host, nodes = []) {
  if (!host) {
    return;
  }
  host.querySelectorAll?.("*").forEach((child) => child.dispose?.());
  host.replaceChildren(...nodes.filter(Boolean));
}

function listContent({ working, items, isLoadingInitial, emptyNode, errorNode, listNode }) {
  if (working.error && !items.length) {
    return [errorNode];
  }

  if (isLoadingInitial) {
    return [loadingState()];
  }

  if (!items.length) {
    return [emptyNode, working.isLoading ? inlineLoadingState() : null];
  }

  return [
    listNode(),
    working.isLoading ? inlineLoadingState() : null,
  ];
}

function loadMoreButton({ working, items, state, actions, buyer = false }) {
  if (!working.nextCursor || !items.length) {
    return null;
  }

  const more = Button({
    label: state.loadingMore || working.isLoading ? "Memuat..." : "Muat lagi",
    variant: "secondary",
    disabled: Boolean(state.loadingMore || working.isLoading),
    onClick: actions.loadMore,
    designHook: "shared.button.secondary",
  });
  if (buyer) {
    more.id = "byr_notifications_load_more_button";
    more.classList.add("w-full", "sm:w-auto");
  }
  return more;
}

function buyerMobileHeader({ user, actions }) {
  const header = document.createElement("header");
  header.id = "byr_notifications_mobile_header";
  header.className = "relative flex min-w-0 items-center justify-between gap-3 px-1 py-1 md:hidden";
  header.dataset.ds = "buyer.notifications.mobile_header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 flex-1 gap-0.5";
  copy.append(
    textNode("p", "text-xs font-bold text-[var(--pb-text-muted)]", "Pusat Notifikasi"),
    textNode("h1", "truncate text-xl font-black leading-tight tracking-normal text-[var(--pb-text)]", "Notifikasi"),
  );

  const actionsWrap = document.createElement("section");
  actionsWrap.className = "relative z-20 inline-flex shrink-0 items-center justify-end gap-2";
  actionsWrap.append(
    NotificationBell({ idPrefix: "byr_notifications_mobile", compact: true, onNavigate: actions.navigate, withBackdrop: true }),
    buyerProfileAvatarButton(user, actions, true),
  );

  header.append(copy, actionsWrap);
  return header;
}

function buyerTopNavigation({ activePath, user, actions }) {
  const nav = document.createElement("nav");
  nav.id = "byrtx_desktop_top_nav";
  nav.className = "sticky top-0 z-40 hidden min-w-0 items-center justify-between gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 shadow-[var(--pb-shadow-card)] backdrop-blur-xl md:flex";
  nav.setAttribute("aria-label", "Navigasi buyer desktop");

  const brand = document.createElement("section");
  brand.className = "flex min-w-0 items-center gap-3 px-1";
  brand.append(
    renderBuyerBrandIcon({ size: "h-11 w-11", wrapperClassName: "rounded-full bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-soft)]", icon: "bell", iconSize: "h-5 w-5" }),
    textNode("strong", "truncate text-sm font-black text-[var(--pb-text)]", "Notifikasi"),
  );

  const links = document.createElement("section");
  links.className = "flex min-w-0 items-center justify-end gap-2";
  BUYER_MOBILE_FOOTER_ITEMS.forEach((item) => {
    links.append(buyerDesktopNavLink(item, activePath, actions));
  });

  const actionsWrap = document.createElement("section");
  actionsWrap.className = "inline-flex shrink-0 items-center justify-end gap-2";
  actionsWrap.append(
    NotificationBell({ idPrefix: "byr_notifications_desktop", onNavigate: actions.navigate, withBackdrop: true }),
    buyerProfileAvatarButton(user, actions),
  );

  const right = document.createElement("section");
  right.className = "flex min-w-0 items-center justify-end gap-2";
  right.append(links, actionsWrap);
  nav.append(brand, right);
  return nav;
}

function buyerNotificationsHeader({ unreadCount, working, actions }) {
  const header = document.createElement("header");
  header.id = "byr_notifications_header";
  header.className = "grid min-w-0 gap-4 rounded-[1.9rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,var(--pb-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_8%,white),var(--pb-surface-card)_54%,color-mix(in_srgb,var(--pb-brand-accent)_7%,white))] p-5 shadow-[var(--pb-shadow-card)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6";
  header.dataset.ds = "buyer.notifications.header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    textNode("p", "text-[10px] font-black uppercase tracking-normal text-[var(--pb-brand-secondary)]", unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"),
    textNode("h2", "break-words text-2xl font-black leading-tight tracking-normal text-[var(--pb-text)] md:text-3xl", "Notifikasi"),
    textNode("p", "max-w-2xl text-xs font-semibold leading-6 text-[var(--pb-text-muted)]", "Pantau update transaksi, pembayaran, dan aktivitas akun Anda."),
  );

  const actionWrap = document.createElement("section");
  actionWrap.className = "grid min-w-0 gap-2 sm:flex sm:justify-start md:justify-end";
  const markAll = Button({
    label: working.isMarkingAllRead ? "Memproses..." : "Tandai semua dibaca",
    variant: "secondary",
    disabled: Boolean(working.isMarkingAllRead || unreadCount === 0),
    onClick: actions.markAllRead,
    designHook: "shared.button.secondary",
  });
  markAll.id = "byr_notifications_mark_all_button";
  markAll.classList.add("w-full", "sm:w-auto");
  markAll.prepend(createIcon("circleCheck", { className: "block h-4 w-4 leading-none" }));
  actionWrap.append(markAll);

  header.append(copy, actionWrap);
  return header;
}

function buyerFilterSection(state, actions) {
  const section = document.createElement("section");
  section.id = "byr_notifications_filter";
  section.className = "grid min-w-0 gap-3 rounded-[1.55rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-3 shadow-[var(--pb-shadow-soft)]";
  section.dataset.ds = "buyer.notifications.filter";
  section.append(NotificationFilterTabs({ active: state.filter, onChange: actions.changeFilter }));
  return section;
}

function buyerFilterSectionShell() {
  const section = document.createElement("section");
  section.id = "byr_notifications_filter";
  section.className = "grid min-h-[4.15rem] min-w-0 gap-3 rounded-[1.55rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-3 shadow-[var(--pb-shadow-soft)]";
  section.dataset.ds = "buyer.notifications.filter";
  return section;
}

function buyerEmptyStateForFilter(filter, actions) {
  const map = {
    unread: {
      title: "Tidak ada notifikasi belum dibaca",
      description: "Semua notifikasi Anda sudah dibaca.",
    },
    read: {
      title: "Belum ada notifikasi yang sudah dibaca",
      description: "Notifikasi yang sudah dibaca akan muncul di sini.",
    },
    all: {
      title: "Belum ada notifikasi",
      description: "Aktivitas penting dari akun Anda akan muncul di sini.",
    },
  };
  const copy = map[filter] ?? map.all;
  const card = document.createElement("section");
  card.id = "byr_notifications_empty";
  card.className = "grid min-h-[320px] min-w-0 place-items-center gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-6 text-center shadow-[var(--pb-shadow-card)]";
  card.append(
    iconBox("bell", "h-14 w-14 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]"),
    textNode("h2", "text-lg font-black text-[var(--pb-text)]", copy.title),
    textNode("p", "max-w-md text-xs font-semibold leading-6 text-[var(--pb-text-muted)]", copy.description),
  );
  if (filter === "all") {
    const home = Button({
      label: "Kembali ke Beranda",
      variant: "secondary",
      onClick: () => actions.navigate("/buyer"),
      designHook: "shared.button.secondary",
    });
    home.id = "byr_notifications_empty_home_button";
    home.prepend(createIcon("home", { className: "block h-4 w-4 leading-none" }));
    card.append(home);
  }
  return card;
}

function buyerErrorState(actions) {
  const wrap = document.createElement("section");
  wrap.id = "byr_notifications_error";
  wrap.className = "grid min-h-[320px] min-w-0 place-items-center gap-4 rounded-[1.75rem] border border-[var(--pb-error-border)] bg-[var(--pb-error-bg)] p-6 text-center shadow-[var(--pb-shadow-card)]";
  wrap.append(
    iconBox("triangleWarning", "h-14 w-14 rounded-full bg-white text-[var(--pb-danger)] shadow-[var(--pb-shadow-soft)]"),
    textNode("h2", "text-lg font-black text-[var(--pb-danger)]", "Notifikasi belum bisa dimuat"),
    textNode("p", "max-w-md text-xs font-semibold leading-6 text-[var(--pb-text-muted)]", "Coba lagi nanti."),
  );
  const retry = Button({
    label: "Coba Lagi",
    variant: "secondary",
    onClick: actions.retry,
    designHook: "shared.button.secondary",
  });
  retry.id = "byr_notifications_retry_button";
  retry.prepend(createIcon("history", { className: "block h-4 w-4 leading-none" }));
  wrap.append(retry);
  return wrap;
}

function buyerDesktopNavLink(item, activePath, actions) {
  const active = isActiveBuyerNav(item, activePath);
  const link = item.disabled ? document.createElement("button") : document.createElement("a");
  link.id = `byr_notifications_nav_desktop_${item.id}`;
  if (item.disabled) {
    link.type = "button";
    link.disabled = true;
    link.setAttribute("aria-disabled", "true");
  } else {
    link.href = item.path;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      actions.navigate(item.path);
    });
  }
  link.className = active
    ? "inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-4 py-2 text-xs font-black text-[var(--pb-brand-secondary)] no-underline shadow-[var(--pb-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-[var(--pb-text-muted)] no-underline transition hover:bg-[var(--pb-surface-muted)] hover:text-[var(--pb-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55";
  if (active) {
    link.setAttribute("aria-current", "page");
  }
  link.append(
    iconBox(item.icon, active ? "h-7 w-7 rounded-full text-[var(--pb-brand-secondary)]" : "h-7 w-7 rounded-full text-[var(--pb-text-muted)]"),
    textNode("span", "truncate", item.label),
  );
  return link;
}

function buyerProfileAvatarButton(user, actions, compact = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.setAttribute("aria-label", "Profil Saya");
  button.title = "Profil Saya";
  button.addEventListener("click", () => actions.navigate("/profile"));
  const src = user?.avatar_url ?? user?.photo_url ?? user?.profile_photo_url ?? "";
  if (src) {
    const image = document.createElement("img");
    image.src = src;
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

function isActiveBuyerNav(item, activePath) {
  if (item.path === "/buyer") {
    return activePath === "/buyer";
  }
  return String(activePath ?? "").startsWith(item.path);
}

function iconBox(icon, className) {
  const wrap = document.createElement("span");
  wrap.className = `inline-flex shrink-0 items-center justify-center ${className}`;
  wrap.append(createIcon(icon, { className: "block h-5 w-5 leading-none" }));
  return wrap;
}

function initials(user) {
  const source = String(user?.name ?? user?.full_name ?? user?.username ?? user?.email ?? "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "U";
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className ?? "";
  node.textContent = text ?? "";
  return node;
}

function pageHeader(unreadCount, working, actions) {
  const header = document.createElement("section");
  header.className = "grid min-w-0 gap-4 rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[10px] font-black uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = `${unreadCount} belum dibaca`;
  const title = document.createElement("h1");
  title.className = "break-words text-xl font-black leading-tight tracking-normal text-[var(--pb-text)] sm:text-2xl";
  title.textContent = "Notifikasi";
  const subtitle = document.createElement("p");
  subtitle.className = "break-words text-xs font-semibold leading-6 text-[var(--pb-text-muted)]";
  subtitle.textContent = "Pantau aktivitas penting dari akun Anda.";
  copy.append(eyebrow, title, subtitle);

  const action = Button({
    label: working.isMarkingAllRead ? "Memproses..." : "Tandai semua dibaca",
    variant: "secondary",
    disabled: Boolean(working.isMarkingAllRead || unreadCount === 0),
    onClick: actions.markAllRead,
    designHook: "shared.button.secondary",
  });
  action.prepend(createIcon("circleCheck", { className: "block h-4 w-4 leading-none" }));

  header.append(copy, action);
  return header;
}

function loadingState() {
  const wrap = document.createElement("section");
  wrap.className = "grid min-h-[320px] content-start gap-3 rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 shadow-[var(--pb-shadow-card)]";
  for (let index = 0; index < 4; index += 1) {
    const row = document.createElement("section");
    row.className = "grid grid-cols-[54px_minmax(0,1fr)] gap-4 rounded-[var(--pb-radius-xl)] bg-[var(--pb-surface-muted)] p-4";
    row.append(skeleton("h-12 w-12 rounded-2xl"), skeleton("h-12 w-full rounded-xl"));
    wrap.append(row);
  }
  return wrap;
}

function inlineLoadingState() {
  const wrap = document.createElement("section");
  wrap.className = "pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center";
  const pill = document.createElement("span");
  pill.className = "inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_94%,transparent)] px-4 text-[10px] font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-soft)] backdrop-blur-md";
  pill.textContent = "Memuat filter...";
  wrap.append(pill);
  return wrap;
}

function skeleton(className) {
  const node = document.createElement("span");
  node.className = `block animate-pulse bg-[var(--pb-border)] ${className}`;
  return node;
}

function emptyStateForFilter(filter) {
  const map = {
    unread: {
      title: "Tidak ada notifikasi belum dibaca",
      description: "Semua notifikasi Anda sudah dibaca.",
    },
    read: {
      title: "Belum ada notifikasi yang sudah dibaca",
      description: "Notifikasi yang sudah dibaca akan muncul di sini.",
    },
    all: {
      title: "Belum ada notifikasi",
      description: "Aktivitas penting dari akun Anda akan muncul di sini.",
    },
  };
  const copy = map[filter] ?? map.all;
  const node = EmptyState({
    title: copy.title,
    description: copy.description,
    icon: createIcon("bell", { className: "mx-auto mb-3 block h-6 w-6 text-[var(--pb-brand-secondary)]" }),
  });
  node.classList.add("min-h-[320px]");
  return node;
}

function errorState(actions) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-h-[320px] min-w-0 place-items-center gap-3 rounded-[var(--pb-radius-2xl)] border border-[var(--pb-error-border)] bg-[var(--pb-error-bg)] p-6 text-center shadow-[var(--pb-shadow-card)]";
  const icon = document.createElement("span");
  icon.className = "inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--pb-danger)] shadow-[var(--pb-shadow-soft)]";
  icon.append(createIcon("triangleWarning", { className: "block h-5 w-5 leading-none" }));
  const title = document.createElement("h2");
  title.className = "text-base font-black text-[var(--pb-danger)]";
  title.textContent = "Notifikasi belum bisa dimuat";
  const text = document.createElement("p");
  text.className = "text-xs font-semibold text-[var(--pb-text-muted)]";
  text.textContent = "Coba lagi nanti.";
  wrap.append(icon, title, text, Button({
    label: "Coba Lagi",
    variant: "secondary",
    onClick: actions.retry,
    designHook: "shared.button.secondary",
  }));
  return wrap;
}
