import { brandConfig } from "../theme/brandConfig.js";
import { createIcon } from "../theme/iconRegistry.js";
import { tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../theme/designStudioHooks.js";
import { adminMasterService } from "../modules/admin/services/adminMasterService.js";
import { uiStore } from "../state/uiStore.js";
import { designStudioV2MenuItem, isDesignStudioV2Allowed } from "../modules/designStudioV2/accessGuard.js";

const BUYER_LINKS = [
  { href: "#/buyer", label: "Buyer Home", icon: "dashboard" },
  { href: "#/buyer/cars", label: "Katalog", icon: "car" },
  { href: "#/buyer/transactions", label: "Transaksi", icon: "transaction" },
  { href: "#/profile", label: "Profil Saya", icon: "user" },
];

const SELLER_LINKS = [
  { href: "#/seller", label: "Dashboard Seller", icon: "dashboard" },
  { href: "#/profile", label: "Profil Saya", icon: "user" },
  { href: "#/seller/showroom", label: "Showroom Saya", icon: "showroom" },
  { href: "#/seller/cars", label: "Mobil Saya", icon: "car" },
  { href: "#/seller/inspection", label: "Inspeksi", icon: "clipboard" },
  { href: "#/seller/affiliates", label: "Marketing", icon: "affiliate" },
  { href: "#/seller/affiliate-commissions", label: "Komisi Marketing", icon: "commission" },
  { href: "#/seller/transactions", label: "Transaksi", icon: "transaction" },
];

const ADMIN_LINKS = [
  { href: "#/admin", label: "Dashboard Admin", icon: "dashboard" },
  { href: "#/profile", label: "Profil Saya", icon: "user" },
  { href: "#/admin/approvals", label: "Approval Queue", icon: "transaction" },
  { href: "#/admin/users", label: "User Management", icon: "transaction" },
  { href: "#/admin/transactions", label: "Transactions", icon: "transaction" },
  { href: "#/admin/settlements", label: "Settlements", icon: "commission" },
  { href: "#/admin/sliders", label: "Slider", icon: "image" },
  {
    href: "#",
    label: "Master",
    icon: "sort",
      children: [
        { href: "#/admin/master-brand", label: "Master Brand", icon: "car" },
        { href: "#/admin/master-sidebar", label: "Master Sidebar", icon: "sitemap" },
        { href: "#/admin/master-bank", label: "Master Bank", icon: "bank" },
        { href: "#/admin/master-inspection", label: "Master Inspection", icon: "clipboard" },
      ],
    },
  { href: "#/admin/design-studio", label: "Design Studio", icon: "sparkles" },
];

const AFFILIATE_LINKS = [
  { href: "#/affiliate", label: "Dashboard Marketing", icon: "affiliate" },
  { href: "#/profile", label: "Profil Saya", icon: "user" },
  { href: "#/affiliate/activity", label: "Activity Clicks", icon: "transaction" },
  { href: "#/affiliate/ledger", label: "Ledger Komisi", icon: "commission" },
  { href: "#/affiliate/settlements", label: "Payout Settlement", icon: "commission" },
];

export function sidebar(store = null, options = {}) {
  const mode = options.mode ?? "desktop";
  const compactExpanded = isCompactExpanded(store, mode);
  const aside = document.createElement("aside");
  aside.className = mode === "drawer" ? drawerSidebarClassName() : tw.layout.sidebar;
  applyDesignHook(aside, "shell.app.sidebar");
  aside.dataset.sidebarMode = mode;

  const brand = document.createElement("div");
  brand.className = mode === "drawer"
    ? "mb-[var(--pb-space-lg)] flex min-w-0 items-start justify-between gap-3"
    : brandClassName(compactExpanded);

  const brandCopy = document.createElement("div");
  brandCopy.className = "grid min-w-0 gap-1";

  const brandName = document.createElement("div");
  brandName.className = mode === "drawer" ? tw.layout.brand : brandNameClassName(compactExpanded);
  brandName.textContent = brandConfig.appName;

  const tagline = document.createElement("p");
  tagline.className = mode === "drawer" ? tw.layout.sidebarTagline : taglineClassName(compactExpanded);
  tagline.textContent = brandConfig.appTagline;

  const compactMark = document.createElement("span");
  compactMark.className = mode === "drawer"
    ? "hidden"
    : compactMarkClassName(compactExpanded);
  compactMark.append(createIcon(brandConfig.logoIcon, { className: "block h-5 w-5 leading-none" }));

  brandCopy.append(compactMark, brandName, tagline);
  brand.append(brandCopy);

  if (mode === "drawer") {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--pb-shell-nav-text)_24%,transparent)] bg-[var(--pb-shell-nav-active)] text-[var(--pb-shell-nav-text)] shadow-[var(--pb-shadow-soft)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pb-shell-nav-text)_40%,transparent)]";
    close.setAttribute("aria-label", "Tutup sidebar");
    close.title = "Tutup sidebar";
    close.append(createIcon("circleXmark", { className: "block h-4 w-4 leading-none" }));
    close.addEventListener("click", () => options.onClose?.());
    brand.append(close);
  }

  const nav = document.createElement("nav");
  nav.className = mode === "drawer" ? tw.layout.nav : navClassName(compactExpanded);
  renderLinks(nav, store, { ...options, store });

  const compactToggle = mode === "drawer" ? null : compactSidebarToggle(store);

  const syncBrand = () => {
    const expanded = isCompactExpanded(store, mode);
    brand.className = mode === "drawer"
      ? "mb-[var(--pb-space-lg)] flex min-w-0 items-start justify-between gap-3"
      : brandClassName(expanded);
    brandName.className = mode === "drawer" ? tw.layout.brand : brandNameClassName(expanded);
    tagline.className = mode === "drawer" ? tw.layout.sidebarTagline : taglineClassName(expanded);
    compactMark.className = mode === "drawer" ? "hidden" : compactMarkClassName(expanded);
    nav.className = mode === "drawer" ? tw.layout.nav : navClassName(expanded);
    syncCompactToggle(compactToggle, expanded);
    brandName.textContent = brandConfig.appName;
    tagline.textContent = brandConfig.appTagline;
  };

  const unsubscribe = store?.subscribe?.(() => {
    syncBrand();
    renderLinks(nav, store, { ...options, store });
  }) ?? null;

  aside.append(...[brand, compactToggle, nav].filter(Boolean));
  aside.dispose = () => unsubscribe?.();
  return aside;
}

function isCompactExpanded(store, mode = "desktop") {
  return mode === "desktop" && Boolean(store?.get("ui.sidebarCompactExpanded", false));
}

function brandClassName(expanded = false) {
  return expanded
    ? `${tw.layout.sidebarBrandBlock} justify-items-start`
    : `${tw.layout.sidebarBrandBlock} justify-items-center xl:justify-items-start`;
}

function brandNameClassName(expanded = false) {
  return expanded ? tw.layout.brand : `${tw.layout.brand} hidden xl:block`;
}

function taglineClassName(expanded = false) {
  return expanded ? tw.layout.sidebarTagline : `${tw.layout.sidebarTagline} hidden xl:block`;
}

function compactMarkClassName(expanded = false) {
  return expanded
    ? "hidden xl:hidden"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[var(--pb-radius-xl)] bg-[var(--pb-shell-nav-active)] text-[var(--pb-shell-nav-text)] shadow-[var(--pb-shadow-soft)] xl:hidden";
}

function navClassName(expanded = false) {
  return expanded ? `${tw.layout.nav} justify-items-stretch` : `${tw.layout.nav} justify-items-center xl:justify-items-stretch`;
}

function compactSidebarToggle(store) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mb-[var(--pb-space-lg)] hidden min-h-10 items-center justify-center gap-2 rounded-[var(--pb-radius-xl)] border border-[color-mix(in_srgb,var(--pb-shell-nav-text)_24%,transparent)] bg-[var(--pb-shell-nav-active)] px-3 py-2 text-sm font-semibold text-[var(--pb-shell-nav-text)] shadow-[var(--pb-shadow-soft)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pb-shell-nav-text)_40%,transparent)] md:inline-flex xl:hidden";
  button.addEventListener("click", () => uiStore.toggleSidebarCompactExpanded());
  syncCompactToggle(button, Boolean(store?.get("ui.sidebarCompactExpanded", false)));
  return button;
}

function syncCompactToggle(button, expanded = false) {
  if (!button) {
    return;
  }

  button.classList.toggle("w-12", !expanded);
  button.classList.toggle("w-full", expanded);
  button.setAttribute("aria-label", expanded ? "Sembunyikan nama menu" : "Tampilkan nama menu");
  button.title = expanded ? "Sembunyikan nama menu" : "Tampilkan nama menu";
  button.replaceChildren(
    createIcon(expanded ? "arrowLeft" : "arrowRight", { className: "block h-4 w-4 leading-none" }),
    compactToggleLabel(expanded),
  );
}

function compactToggleLabel(expanded = false) {
  const label = document.createElement("span");
  label.className = expanded ? "min-w-0 truncate" : "sr-only";
  label.textContent = expanded ? "Sembunyikan" : "Tampilkan nama menu";
  return label;
}

function drawerSidebarClassName() {
  return "h-full w-[min(82vw,292px)] min-w-0 overflow-y-auto bg-[linear-gradient(180deg,var(--pb-shell-sidebar-start),var(--pb-shell-sidebar-end))] px-5 py-5 text-[var(--pb-shell-nav-text)] shadow-[var(--pb-shadow-elevated)]";
}

function renderLinks(nav, store, options = {}) {
  const role = resolveSidebarRole(store);
  const path = store?.get("app.currentRoute.path", "/buyer") ?? "/buyer";
  const fallbackLinks = role === "seller"
    ? SELLER_LINKS
    : role === "admin"
      ? ADMIN_LINKS
      : role === "affiliate_admin"
        ? AFFILIATE_LINKS
        : BUYER_LINKS;
  let links = getSidebarLinksForRole(role, store, fallbackLinks);

  const userRealRole = store?.get("auth.user.role", "") || store?.get("auth.role", "");
  if (userRealRole === "super_admin") {
    if (!links.some((l) => l.label === "Role Switcher (Super)")) {
      links = [
        ...links,
        {
          href: "#",
          label: "Role Switcher (Super)",
          icon: "user",
          children: [
            { href: "#/admin", label: "Admin View", icon: "dashboard" },
            { href: "#/buyer", label: "Buyer View", icon: "user" },
            { href: "#/seller", label: "Seller View", icon: "car" },
            { href: "#/affiliate", label: "Affiliate View", icon: "affiliate" },
          ],
        },
      ];
    }
  }

  nav.replaceChildren(...withDesignStudioV2Menu(links, role, store).map((link) => renderSidebarNode(link, path, options)));
}

function resolveSidebarRole(store) {
  const routeRole = store?.get("app.currentRoute.route.role", "") ?? "";
  if (routeRole && routeRole !== "public") {
    return routeRole;
  }

  return firstConcreteRole([
    store?.get("app.activeRole", ""),
    store?.get("auth.user.role", ""),
    store?.get("auth.role", ""),
    store?.get("working.profilePage.profile.data.role", ""),
  ]) ?? "buyer";
}

function firstConcreteRole(roles = []) {
  return roles.find((role) => role && role !== "public") ?? null;
}

function isActive(currentPath, href) {
  const hashPath = String(href || "").replace(/^#/, "") || "/";
  return currentPath === hashPath || currentPath.startsWith(`${hashPath}/`);
}

function getSidebarLinksForRole(role, store, fallbackLinks) {
  const normalizedRole = normalizeSidebarRole(role);
  if (!["admin", "seller", "affiliate"].includes(normalizedRole)) {
    return fallbackLinks;
  }

  const workingMaster = store?.get("working.adminMaster.sidebar.data", null);
  const snapshotRole = role === "affiliate_admin" ? "affiliate_admin" : normalizedRole;
  const snapshotMaster = store?.get(`snapshot.${snapshotRole}.masterSidebar.data`, null)
    ?? store?.get("snapshot.admin.masterSidebar.data", null);
  const items = adminMasterService
    .normalizeSidebarMaster(workingMaster ?? snapshotMaster)
    .data.items
    .filter((item) => item.role === normalizedRole && item.is_active && item.is_visible);

  if (!items.length) {
    return fallbackLinks;
  }

  return ensureProfileMenu(buildSidebarTree(items));
}

function normalizeSidebarRole(role) {
  if (role === "affiliate_admin") {
    return "affiliate";
  }

  if (role === "super_admin") {
    return "admin";
  }

  return role;
}

function withDesignStudioV2Menu(links, role, store) {
  if (normalizeSidebarRole(role) !== "admin" || !isDesignStudioV2Allowed({ store })) {
    return links;
  }

  if (links.some((link) => String(link.href ?? "") === "#/admin/design-studio-v2")) {
    return links;
  }

  return [...links, designStudioV2MenuItem()];
}

function ensureProfileMenu(links) {
  if (links.some((link) => String(link.href ?? "") === "#/profile")) {
    return links;
  }

  return [
    ...links.slice(0, 1),
    { href: "#/profile", label: "Profil Saya", icon: "user" },
    ...links.slice(1),
  ];
}

function buildSidebarTree(items) {
  const byParent = new Map();
  items.forEach((item) => {
    const parentKey = item.parent_key || "";
    byParent.set(parentKey, [...(byParent.get(parentKey) ?? []), item]);
  });

  const sortItems = (list = []) => [...list].sort((a, b) => {
    const orderDelta = Number(a.order ?? 0) - Number(b.order ?? 0);
    return orderDelta || String(a.label).localeCompare(String(b.label));
  });

  const topLevel = sortItems(byParent.get("") ?? []);
  return topLevel.map((item) => ({
    href: item.route || "#",
    label: item.label,
    icon: item.icon || "sort",
    children: sortItems(byParent.get(item.key) ?? []).map((child) => ({
      href: child.route || "#",
      label: child.label,
      icon: child.icon || "sort",
      children: [],
    })),
  }));
}

function renderSidebarNode(link, path, options = {}) {
  if (Array.isArray(link.children) && link.children.length) {
    const group = document.createElement("div");
    group.className = options.mode === "drawer" ? "grid w-full gap-1" : "grid w-full gap-1";
    const childActive = link.children.some((child) => isActive(path, child.href));
    const compactExpanded = isCompactExpanded(options.store, options.mode);
    const parent = renderSidebarAnchor(link, path, false, true, childActive, options);
    const arrow = document.createElement("span");
    arrow.className = options.mode === "drawer"
      ? childActive
        ? "ml-auto inline-flex shrink-0 rotate-180 items-center justify-center transition-transform duration-150"
        : "ml-auto inline-flex shrink-0 items-center justify-center transition-transform duration-150"
      : compactExpanded
        ? childActive
          ? "ml-auto inline-flex shrink-0 rotate-180 items-center justify-center transition-transform duration-150 xl:inline-flex"
          : "ml-auto inline-flex shrink-0 items-center justify-center transition-transform duration-150 xl:inline-flex"
        : childActive
          ? "ml-auto hidden shrink-0 rotate-180 items-center justify-center transition-transform duration-150 xl:inline-flex"
          : "ml-auto hidden shrink-0 items-center justify-center transition-transform duration-150 xl:inline-flex";
    arrow.append(createIcon("chevron-down", { className: "block h-3.5 w-3.5 leading-none" }));
    parent.append(arrow);
    const childWrap = document.createElement("div");
    childWrap.className = childActive
      ? (compactExpanded ? "grid gap-1 pl-5" : "hidden gap-1 pl-5 xl:grid")
      : "hidden gap-1 pl-5";
    if (options.mode === "drawer") {
      childWrap.className = childActive ? "grid gap-1 pl-5" : "hidden gap-1 pl-5";
    }
    link.children.forEach((child) => childWrap.append(renderSidebarAnchor(child, path, true, false, false, options)));
    parent.setAttribute("aria-expanded", childActive ? "true" : "false");
    parent.addEventListener("click", (event) => {
      event.preventDefault();
      const hidden = childWrap.classList.contains("hidden");
      childWrap.className = hidden
        ? (options.mode === "drawer" || isCompactExpanded(options.store, options.mode) ? "grid gap-1 pl-5" : "hidden gap-1 pl-5 xl:grid")
        : "hidden gap-1 pl-5";
      arrow.classList.toggle("rotate-180", hidden);
      parent.setAttribute("aria-expanded", hidden ? "true" : "false");
    });
    group.append(parent);
    group.append(childWrap);
    return group;
  }

  return renderSidebarAnchor(link, path, false, false, false, options);
}

function renderSidebarAnchor(link, path, child = false, parent = false, activeOverride = false, options = {}) {
  const anchor = document.createElement("a");
  anchor.href = link.href;
  const compactExpanded = isCompactExpanded(options.store, options.mode);
  const active = Boolean(activeOverride || isActive(path, link.href));
  anchor.className = active
    ? `${tw.layout.navLink} ${tw.layout.navLinkActive}`
    : tw.layout.navLink;
  anchor.classList.add(...(options.mode === "drawer"
    ? ["w-full"]
    : compactExpanded
      ? ["w-full", "justify-start"]
      : ["w-12", "justify-center", "xl:w-full", "xl:justify-start"]));
  anchor.title = link.label ?? "";
  anchor.setAttribute("aria-current", active ? "page" : "false");
  if (!parent && options.mode === "drawer") {
    anchor.addEventListener("click", () => options.onNavigate?.());
  }
  if (child) {
    anchor.classList.add("text-sm", "opacity-90");
  }
  const label = document.createElement("span");
  label.className = options.mode === "drawer" || compactExpanded
    ? "min-w-0 break-words"
    : "hidden min-w-0 break-words xl:inline";
  label.textContent = link.label;
  const iconWrap = document.createElement("span");
  iconWrap.className = "inline-flex h-5 w-5 shrink-0 items-center justify-center";
  iconWrap.append(createIcon(link.icon, { className: tw.layout.navIcon }));
  anchor.append(iconWrap, label);
  return anchor;
}
