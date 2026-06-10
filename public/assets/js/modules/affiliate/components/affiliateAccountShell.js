import { authStore } from "../../../state/authStore.js";
import { NotificationBell } from "../../notifications/components/notificationBell.js";
import { BuyerMobileFooterNav } from "../../buyer/components/buyerMobileFooterNav.js";
import { createIcon } from "../../../theme/iconRegistry.js";

const STYLE_ID = "pb-affiliate-account-shell-style";

export const AFFILIATE_ACCOUNT_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", path: "/affiliate" },
  { id: "ledger", label: "Komisi", icon: "wallet", path: "/affiliate/ledger" },
  { id: "settlements", label: "Settlement", icon: "transaction", path: "/affiliate/settlements", featured: true },
  { id: "profile", label: "Profil", icon: "user", path: "/profile" },
  { id: "notifications", label: "Notifikasi", icon: "bell", path: "/notifications" },
];

export function AffiliateAccountLayout({
  activePath = "/affiliate",
  title = "Affiliate",
  subtitle = "",
  icon = "affiliate",
  maxWidth = "max-w-[1180px]",
  children = [],
  actions = {},
} = {}) {
  ensureAffiliateAccountStyles();

  const page = document.createElement("section");
  page.className = `af-account-page mx-auto grid min-w-0 w-full max-w-[430px] gap-5 overflow-x-clip pb-28 text-white md:${maxWidth} md:gap-6 md:pb-8`;
  page.dataset.ds = "affiliate.account.page";

  const content = document.createElement("section");
  content.className = "af-account-content grid min-w-0 gap-6";
  content.append(...children.filter(Boolean));

  page.append(
    affiliateTopNavigation({ activePath, title, icon, actions }),
    affiliateMobileHeader({ title, subtitle, actions }),
    content,
    affiliateMobileFooterNav({
      activePath,
      items: AFFILIATE_ACCOUNT_NAV_ITEMS,
      onNavigate: (path) => actions.navigate?.(path),
    }),
  );

  return page;
}

function ensureAffiliateAccountStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .af-account-page,
    .af-account-page > header,
    .af-account-page [data-ds="shared.section_header"],
    .af-account-page [data-ds="shared.section_header"] h1,
    .af-account-page [data-ds="shared.section_header"] p {
      color: #fff;
    }
    .af-account-page [data-ds="shared.section_header"] p {
      opacity: .82;
    }
    .af-account-page article,
    .af-account-page section,
    .af-account-page div {
      min-width: 0;
    }
    .af-account-page .account-mobile-footer {
      z-index: 58;
    }
    .af-account-page .account-mobile-footer__item {
      color: #334155;
    }
    .af-account-page .account-mobile-footer__item:hover,
    .af-account-page .account-mobile-footer__item--active {
      color: var(--pb-brand-primary);
    }
    .af-account-page .account-mobile-footer__icon,
    .af-account-page .account-mobile-footer__label,
    .af-account-page .account-mobile-footer__action-label {
      color: inherit;
      opacity: 1;
      visibility: visible;
    }
    .af-account-page .account-mobile-footer__action {
      color: #fff;
    }
  `;
  document.head.append(style);
}

export function affiliateAccountActions(context) {
  return {
    navigate(path) {
      context?.router?.navigate(path);
    },
  };
}

function affiliateMobileHeader({ title, subtitle, actions }) {
  const header = document.createElement("header");
  header.id = "afacc_mobile_header";
  header.className = "relative flex min-w-0 items-center justify-between gap-3 px-1 py-1 md:hidden";
  header.dataset.ds = "affiliate.account.mobile_header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-0.5";
  copy.append(
    textNode("p", "truncate text-sm font-bold text-white/75", subtitle || "Akun affiliate"),
    textNode("h1", "truncate text-xl font-black leading-tight tracking-normal text-white", title),
  );

  const actionGroup = document.createElement("section");
  actionGroup.className = "inline-flex shrink-0 items-center justify-end gap-2";
  actionGroup.append(
    NotificationBell({ idPrefix: "af_mobile", compact: true, onNavigate: actions.navigate, withBackdrop: true }),
    profileButton({ actions, compact: true }),
  );

  header.append(copy, actionGroup);
  return header;
}

function affiliateTopNavigation({ activePath, title, icon, actions }) {
  const nav = document.createElement("nav");
  nav.id = "afacc_desktop_top_nav";
  nav.className = "sticky top-0 z-40 hidden min-w-0 items-center justify-between gap-3 rounded-[1.75rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 text-[var(--pb-text)] shadow-[var(--pb-shadow-card)] backdrop-blur-xl md:flex";
  nav.setAttribute("aria-label", "Navigasi affiliate desktop");

  const brand = document.createElement("section");
  brand.className = "flex min-w-0 items-center gap-3 px-1";
  brand.append(
    iconBox(icon, "h-11 w-11 rounded-full bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-soft)]"),
    textNode("strong", "truncate text-base font-black text-[var(--pb-text)]", title),
  );

  const links = document.createElement("section");
  links.className = "flex min-w-0 flex-wrap items-center justify-end gap-1 lg:gap-2";
  AFFILIATE_ACCOUNT_NAV_ITEMS.forEach((item) => {
    links.append(desktopNavLink(item, activePath, actions));
  });

  const actionGroup = document.createElement("section");
  actionGroup.className = "inline-flex shrink-0 items-center justify-end gap-2";
  actionGroup.append(
    NotificationBell({ idPrefix: "af_desktop", onNavigate: actions.navigate, withBackdrop: true }),
    profileButton({ actions }),
  );

  const right = document.createElement("section");
  right.className = "flex min-w-0 items-center justify-end gap-2";
  right.append(links, actionGroup);

  nav.append(brand, right);
  return nav;
}

function desktopNavLink(item, activePath, actions) {
  const active = isActiveNav(item, activePath);
  const link = document.createElement("a");
  link.href = `#${item.path}`;
  link.id = `afacc_nav_desktop_${item.id}`;
  link.className = active
    ? "inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-2 text-sm font-black text-[var(--pb-brand-secondary)] no-underline shadow-[var(--pb-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] xl:px-4"
    : "inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[var(--pb-text-muted)] no-underline transition hover:bg-[var(--pb-surface-muted)] hover:text-[var(--pb-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] xl:px-4";
  if (active) {
    link.setAttribute("aria-current", "page");
  }
  link.addEventListener("click", (event) => {
    event.preventDefault();
    actions.navigate?.(item.path);
  });
  link.append(
    iconBox(item.icon, active ? "h-7 w-7 rounded-full text-[var(--pb-brand-secondary)]" : "h-7 w-7 rounded-full text-[var(--pb-text-muted)]"),
    textNode("span", "hidden truncate lg:inline", item.label),
  );
  return link;
}

function profileButton({ actions, compact = false } = {}) {
  const user = authStore.user() ?? {};
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/92 text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-white/70 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.setAttribute("aria-label", "Profil affiliate");
  button.title = "Profil";
  button.addEventListener("click", () => actions?.navigate?.("/profile"));
  button.textContent = initials(user);
  return button;
}

function isActiveNav(item, activePath) {
  if (item.path === "/affiliate") {
    return activePath === "/affiliate";
  }
  return String(activePath ?? "").startsWith(item.path);
}

function affiliateMobileFooterNav({ items = AFFILIATE_ACCOUNT_NAV_ITEMS, activePath = "/affiliate", onNavigate = null } = {}) {
  const nav = BuyerMobileFooterNav({ items, activePath, onNavigate });
  nav.id = "afacc_mobile_footer_nav";
  nav.classList.remove("account-mobile-footer--buyer");
  nav.classList.add("account-mobile-footer--affiliate");
  nav.dataset.ds = "affiliate.mobile.footer";
  nav.setAttribute("aria-label", "Navigasi akun affiliate mobile");
  const container = nav.querySelector("#byr_mobile_footer_nav_container");
  if (container) {
    container.id = "afacc_mobile_footer_nav_container";
  }
  syncAffiliateFooterActiveState(nav, items, activePath);
  return nav;
}

function syncAffiliateFooterActiveState(nav, items, activePath) {
  items.forEach((item) => {
    const node = nav.querySelector(`#byr_nav_mobile_${item.id}`);
    if (!node) {
      return;
    }

    const active = isActiveNav(item, activePath);
    if (item.featured) {
      node.setAttribute("aria-current", active ? "page" : "false");
      return;
    }

    node.classList.toggle("account-mobile-footer__item--active", active);
    if (active) {
      node.setAttribute("aria-current", "page");
    } else {
      node.removeAttribute("aria-current");
    }
  });
}

function initials(user) {
  const source = String(user?.name ?? user?.full_name ?? user?.email ?? "A").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "A";
}

function iconBox(icon, className) {
  const wrap = document.createElement("span");
  wrap.className = `inline-flex shrink-0 items-center justify-center ${className}`;
  wrap.append(createIcon(icon, { className: "block h-5 w-5 leading-none" }));
  return wrap;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className ?? "";
  node.textContent = text ?? "";
  return node;
}
