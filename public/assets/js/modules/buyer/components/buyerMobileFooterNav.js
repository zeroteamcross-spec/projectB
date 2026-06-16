import { createIcon } from "../../../theme/iconRegistry.js";

const STYLE_ID = "pb-account-mobile-footer-nav-style";

export const BUYER_MOBILE_FOOTER_ITEMS = [
  { id: "home", label: "Home", icon: "home", path: "/buyer" },
  { id: "portfolio", label: "Portofolio", icon: "dashboard", path: "/buyer/portfolio" },
  { id: "catalog", label: "Katalog", icon: "carb", path: "/", featured: true },
  { id: "notifications", label: "Notif", icon: "bell", path: "/notifications" },
  { id: "profile", label: "Profil", icon: "user", path: "/profile" },
];

export function BuyerMobileFooterNav({ items = BUYER_MOBILE_FOOTER_ITEMS, activePath = "/buyer", onNavigate = null } = {}) {
  ensureFooterStyles();

  const nav = document.createElement("nav");
  nav.id = "byr_mobile_footer_nav";
  nav.className = "account-mobile-footer account-mobile-footer--buyer";
  nav.dataset.ds = "buyer.mobile.footer";
  nav.setAttribute("aria-label", "Navigasi buyer mobile");

  const shell = document.createElement("section");
  shell.className = "account-mobile-footer__shell";

  const bar = document.createElement("section");
  bar.className = "account-mobile-footer__bar";

  const list = document.createElement("section");
  list.id = "byr_mobile_footer_nav_container";
  list.className = "account-mobile-footer__items";

  const centerDock = document.createElement("section");
  centerDock.className = "account-mobile-footer__center";

  items.forEach((item) => {
    if (item.featured) {
      centerDock.append(footerLink({ item, activePath, onNavigate }));
      const spacer = document.createElement("span");
      spacer.className = "account-mobile-footer__spacer";
      spacer.setAttribute("aria-hidden", "true");
      list.append(spacer);
      return;
    }
    list.append(footerLink({ item, activePath, onNavigate }));
  });

  shell.append(bar, list, centerDock);
  nav.append(shell);
  return nav;
}

function footerLink({ item, activePath, onNavigate }) {
  const active = isActiveNav(item, activePath);
  const link = item.disabled ? document.createElement("button") : document.createElement("a");
  link.id = `byr_nav_mobile_${item.id}`;
  link.className = item.featured
    ? "account-mobile-footer__action"
    : active
      ? "account-mobile-footer__item account-mobile-footer__item--active"
      : "account-mobile-footer__item";

  if (item.disabled) {
    link.type = "button";
    link.disabled = true;
    link.setAttribute("aria-disabled", "true");
    link.classList.add("account-mobile-footer__item--disabled");
  } else {
    link.href = `#${item.path}`;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      onNavigate?.(item.path);
    });
  }

  if (active) {
    link.setAttribute("aria-current", "page");
  }

  const iconWrap = document.createElement("span");
  iconWrap.className = item.featured ? "account-mobile-footer__action-icon" : "account-mobile-footer__icon";
  iconWrap.append(createIcon(item.icon, { className: "account-mobile-footer__svg" }));
  link.append(iconWrap);

  const label = document.createElement("span");
  label.className = item.featured ? "account-mobile-footer__action-label text-[#ff6600] mt-4" : "account-mobile-footer__label";
  label.textContent = item.label;
  link.append(label);

  link.setAttribute("aria-label", item.label);
  link.title = item.label;
  return link;
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
    return path === "/" || (item.id === "catalog" && path === "/buyer/cars");
  }
  return path.startsWith(item.path);
}

function ensureFooterStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .account-mobile-footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      z-index: 58;
      display: block;
      padding: 0 0 env(safe-area-inset-bottom, 0px);
      pointer-events: none;
    }

    .account-mobile-footer__shell {
      position: relative;
      width: 100%;
      height: 6.7rem;
      margin: 0;
      pointer-events: auto;
    }

    .account-mobile-footer__bar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 5.55rem;
      border: 1px solid color-mix(in srgb, var(--pb-border) 72%, transparent);
      border-right: 0;
      border-left: 0;
      border-bottom: 0;
      border-radius: 1.65rem 1.65rem 0 0;
      background:
        radial-gradient(circle at 50% -24px, transparent 0 3.25rem, rgba(255, 255, 255, 0.94) 3.28rem),
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
      box-shadow: 0 -18px 42px rgba(15, 23, 42, 0.16);
      backdrop-filter: blur(18px) saturate(1.15);
      -webkit-backdrop-filter: blur(18px) saturate(1.15);
    }

    .account-mobile-footer__items {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      align-items: center;
      height: 5.55rem;
      padding: 0 max(0.7rem, env(safe-area-inset-left, 0px)) 0 max(0.7rem, env(safe-area-inset-right, 0px));
    }

    .account-mobile-footer__item {
      display: grid;
      min-width: 0;
      min-height: 4.35rem;
      place-items: center;
      align-content: center;
      gap: 0.28rem;
      border: 0;
      border-radius: 1.1rem;
      background: transparent;
      color: #334155;
      text-decoration: none;
      cursor: pointer;
      transition: color 160ms ease, background 160ms ease;
    }

    .account-mobile-footer__item .account-mobile-footer__icon,
    .account-mobile-footer__item .account-mobile-footer__label,
    .account-mobile-footer__item .account-mobile-footer__svg,
    .account-mobile-footer__action .account-mobile-footer__action-label {
      opacity: 1;
      visibility: visible;
    }

    .account-mobile-footer__item:hover,
    .account-mobile-footer__item--active {
      color: var(--pb-brand-primary);
    }

    .account-mobile-footer__item--disabled {
      cursor: not-allowed;
      color: #64748b;
      opacity: 1;
    }

    .account-mobile-footer__icon,
    .account-mobile-footer__action-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 1;
    }

    .account-mobile-footer__icon {
      width: 2rem;
      height: 2rem;
      font-size: 1.28rem;
    }

    .account-mobile-footer__label,
    .account-mobile-footer__action-label {
      display: block;
      width: 100%;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.68rem;
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: 0;
      color: inherit;
      opacity: 1;
      visibility: visible;
    }

    .account-mobile-footer__spacer {
      display: block;
      min-width: 0;
    }

    .account-mobile-footer__center {
      position: absolute;
      left: 50%;
      top: 0;
      z-index: 3;
      transform: translate(-50%, -0.05rem);
    }

    .account-mobile-footer__action {
      display: grid;
      width: 4.1rem;
      min-height: 5.15rem;
      align-items: center;
      justify-content: center;
      justify-items: center;
      // align-content: start;
      gap: 0.24rem;
      border: 0;
      border-radius: 1.3rem;
      background: transparent;
      color: #fff;
      text-decoration: none;
      transition: filter 160ms ease, transform 160ms ease;
    }

    .account-mobile-footer__action:hover {
      filter: brightness(0.96);
      transform: translateY(-1px);
    }

    .account-mobile-footer__action-icon {
      width: 3.35rem;
      height: 3.35rem;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--pb-btn-primary-from), var(--pb-btn-primary-to));
      color: #fff;
      font-size: 1.75rem;
      box-shadow: 0 18px 34px rgba(249, 115, 22, 0.34);
      outline: 8px solid rgba(255, 255, 255, 0.95);
    }

    .account-mobile-footer__action-label {
      width: 4.1rem;
      color: #334155;
    }

    .account-mobile-footer__svg {
      display: block;
      color: currentColor;
      line-height: 1;
    }

    @media (min-width: 768px) {
      .account-mobile-footer {
        display: none;
      }
    }
  `;
  document.head.append(style);
}
