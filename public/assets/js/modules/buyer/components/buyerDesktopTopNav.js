import { appStore } from "../../../state/store.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { NotificationBell } from "../../notifications/components/notificationBell.js";
import { BUYER_MOBILE_FOOTER_ITEMS } from "./buyerMobileFooterNav.js";

export function BuyerDesktopTopNav({
  activePath = "/buyer",
  onNavigate = null,
  brandLabel = "Buyer",
  brandIcon = "car",
  user = null,
} = {}) {
  const nav = document.createElement("nav");
  nav.id = "byrtx_desktop_top_nav";
  nav.className = "sticky top-0 z-40 hidden min-w-0 items-center justify-between gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 shadow-[var(--pb-shadow-card)] backdrop-blur-xl md:flex";
  nav.setAttribute("aria-label", "Navigasi buyer desktop");

  const brand = document.createElement("section");
  brand.className = "flex min-w-0 items-center gap-3 px-1";
  brand.append(
    iconBox({
      size: "h-11 w-11",
      className: "rounded-full bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-soft)]",
      icon: brandIcon,
      iconSize: "h-5 w-5",
    }),
    textNode("strong", "truncate text-sm font-black text-[var(--pb-text)]", brandLabel),
  );

  const links = document.createElement("section");
  links.className = "flex min-w-0 items-center justify-end gap-2";
  BUYER_MOBILE_FOOTER_ITEMS.forEach((item) => links.append(desktopNavLink(item, activePath, onNavigate)));

  const actionGroup = document.createElement("section");
  actionGroup.className = "inline-flex shrink-0 items-center justify-end gap-2";
  actionGroup.append(
    NotificationBell({
      idPrefix: "byr_desktop",
      onNavigate,
      withBackdrop: true,
    }),
    buyerProfileAction({ user: user ?? resolveBuyerUser(), onNavigate }),
  );

  const right = document.createElement("section");
  right.className = "flex min-w-0 items-center justify-end gap-2";
  right.append(links, actionGroup);

  nav.append(brand, right);
  return nav;
}

function desktopNavLink(item, activePath, onNavigate) {
  const active = isActiveNav(item, activePath);
  const link = item.disabled ? document.createElement("button") : document.createElement("a");
  link.id = `byrtx_nav_desktop_${item.id}`;

  if (item.disabled) {
    link.type = "button";
    link.disabled = true;
    link.setAttribute("aria-disabled", "true");
  } else {
    link.href = `#${item.path}`;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      onNavigate?.(item.path);
    });
  }

  link.className = active
    ? "inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-4 py-2 text-xs font-black text-[var(--pb-brand-secondary)] no-underline shadow-[var(--pb-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-[var(--pb-text-muted)] no-underline transition hover:bg-[var(--pb-surface-muted)] hover:text-[var(--pb-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55";

  if (active) {
    link.setAttribute("aria-current", "page");
  }

  link.append(
    iconBox({
      size: "h-7 w-7",
      className: active ? "text-[var(--pb-brand-secondary)]" : "text-[var(--pb-text-muted)]",
      icon: item.icon,
      iconSize: "h-4 w-4",
    }),
    textNode("span", "truncate", item.label),
  );
  link.setAttribute("aria-label", item.label);
  link.title = item.label;
  return link;
}

function buyerProfileAction({ user, onNavigate } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.setAttribute("aria-label", "Profil Saya");
  button.title = "Profil Saya";
  button.addEventListener("click", () => onNavigate?.("/profile"));

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

function isActiveNav(item, activePath) {
  const path = String(activePath ?? "");
  if (item.path === "/buyer") {
    return path === "/buyer";
  }
  if (item.path === "/buyer/portfolio") {
    return path === "/buyer/portfolio" || path === "/buyer/transactions" || path.startsWith("/buyer/transactions/");
  }
  if (item.path === "/") {
    return path === "/" || path === "/buyer/cars";
  }
  return path === item.path || path.startsWith(`${item.path}/`);
}

function resolveBuyerUser() {
  return appStore.get("auth.user", null)
    ?? appStore.get("working.profilePage.profile.data", null)
    ?? appStore.get("working.buyerAccount.profile.data", null)
    ?? {};
}

function normalizeImageUrl(value) {
  const url = String(value ?? "").trim();
  if (!url || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("/")) {
    return url;
  }
  return `/${url.replace(/^\/+/, "")}`;
}

function initials(user) {
  const source = String(user?.name ?? user?.full_name ?? user?.username ?? user?.email ?? "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "U";
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
