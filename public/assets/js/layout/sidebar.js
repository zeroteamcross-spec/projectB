import { brandConfig } from "../theme/brandConfig.js";
import { KELAS_GAMBAR_LOGO, renderBrandLockup } from "../theme/brandLockup.js";
import { createIcon } from "../theme/iconRegistry.js";
import { tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../theme/designStudioHooks.js";
import { adminMasterService } from "../modules/admin/services/adminMasterService.js";
import { uiStore } from "../state/uiStore.js";
import { designStudioV2MenuItem, isDesignStudioV2Allowed } from "../modules/designStudioV2/accessGuard.js";

// "Katalog" (#/buyer/cars) is intentionally absent: it lists cars across every
// showroom, which is not how buyers browse. They arrive through a showroom or
// marketing link instead. The route itself is still reachable directly.
const BUYER_LINKS = [
  { href: "#/buyer", label: "Buyer Home", icon: "dashboard" },
  { href: "#/buyer/transactions", label: "Transaksi", icon: "transaction" },
  { href: "#/profile", label: "Profil Saya", icon: "user" },
];

const SELLER_LINKS = [
  { href: "#/seller", label: "Dashboard Showroom", icon: "dashboard" },
  { href: "#/profile", label: "Profil Saya", icon: "user" },
  { href: "#/seller/showroom", label: "Showroom Saya", icon: "showroom" },
  { href: "#/seller/cars", label: "Katalog", icon: "car" },
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
  { href: "#/admin/cars", label: "Katalog Mobil", icon: "car" },
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
        { href: "#/admin/master-location", label: "Master Lokasi", icon: "location" },
      ],
    },
  { href: "#/admin/web-config", label: "Konfigurasi WEB", icon: "settings" },
];

/**
 * Sidebar super admin ditulis tetap di sini, tidak diambil dari master data
 * app.sidebar seperti peran lain -- renderLinks() menimpa apa pun dengan daftar
 * ini begitu peran aslinya super_admin. Halaman super admin yang baru harus
 * didaftarkan di sini, kalau tidak menunya tidak akan pernah muncul.
 */
const SUPER_ADMIN_LINKS = [
  { href: "#/super-admin", label: "Superadmin Dashboard", icon: "dashboard" },
  { href: "#/super-admin/accounts", label: "Buat Akun", icon: "user" },
  { href: "#/admin/web-config", label: "Konfigurasi WEB", icon: "settings" },
  { href: "#/admin/landing-page", label: "Landing Page", icon: "home" },
  { href: "#/admin/release-versions", label: "Release Version Manager", icon: "download" },
  { href: "#/admin/migrations", label: "Migration Manager", icon: "database" },
  {
    href: "#",
    label: "Level User Switcher (Super)",
    icon: "user",
    children: [
      { href: "#/admin", label: "Admin View", icon: "dashboard" },
      { href: "#/buyer", label: "Buyer View", icon: "user" },
      { href: "#/seller", label: "Showroom View", icon: "car" },
      { href: "#/affiliate", label: "Marketing View", icon: "affiliate" },
    ],
  },
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
  const collapsed = isSidebarCollapsed(store, mode);
  const aside = document.createElement("aside");
  aside.className = mode === "drawer" ? drawerSidebarClassName() : tw.layout.sidebar;
  applyDesignHook(aside, "shell.app.sidebar");
  aside.dataset.sidebarMode = mode;

  const brand = document.createElement("div");
  brand.className = mode === "drawer"
    ? "mb-[var(--pb-space-lg)] flex min-w-0 items-start justify-between gap-3"
    : brandClassName(collapsed);

  const brandCopy = document.createElement("div");
  brandCopy.className = brandCopyClassName(collapsed);

  const brandName = document.createElement("div");
  brandName.className = mode === "drawer" ? tw.layout.brand : brandNameClassName(collapsed);
  brandName.textContent = brandConfig.appName;

  const tagline = document.createElement("p");
  tagline.className = mode === "drawer" ? tw.layout.sidebarTagline : taglineClassName(collapsed);
  tagline.textContent = brandConfig.appTagline;

  const compactMark = document.createElement("span");
  renderBrandMark(
    compactMark,
    [brandName, tagline],
    mode === "drawer" ? "hidden" : compactMarkClassName(collapsed),
    collapsed
  );

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
  nav.className = mode === "drawer" ? tw.layout.nav : navClassName(collapsed);
  renderLinks(nav, store, { ...options, store });

  const compactToggle = mode === "drawer" ? null : compactSidebarToggle(store);

  const syncBrand = () => {
    const collapsed = isSidebarCollapsed(store, mode);
    brand.className = mode === "drawer"
      ? "mb-[var(--pb-space-lg)] flex min-w-0 items-start justify-between gap-3"
      : brandClassName(collapsed);
    brandCopy.className = mode === "drawer" ? "grid min-w-0 gap-1" : brandCopyClassName(collapsed);
    brandName.className = mode === "drawer" ? tw.layout.brand : brandNameClassName(collapsed);
    tagline.className = mode === "drawer" ? tw.layout.sidebarTagline : taglineClassName(collapsed);
    nav.className = mode === "drawer" ? tw.layout.nav : navClassName(collapsed);
    syncCompactToggle(compactToggle, collapsed);
    brandName.textContent = brandConfig.appName;
    tagline.textContent = brandConfig.appTagline;
    renderBrandMark(
      compactMark,
      [brandName, tagline],
      mode === "drawer" ? "hidden" : compactMarkClassName(collapsed),
      collapsed
    );
  };

  const unsubscribe = store?.subscribe?.(() => {
    syncBrand();
    renderLinks(nav, store, { ...options, store });
  }) ?? null;

  aside.append(...[brand, compactToggle, nav].filter(Boolean));
  aside.dispose = () => unsubscribe?.();
  return aside;
}

/**
 * Sidebar memakai aturan yang sama: logo unggahan tampil sendirian, dan nama
 * beserta taglinenya ikut disembunyikan.
 *
 * Kelas wadahnya dihitung ulang tiap sync mengikuti keadaan compact, jadi
 * dioperkan setiap kali, bukan disimpan.
 */
function renderBrandMark(mark, teks = [], markClass = "", collapsed = false) {
  renderBrandLockup(mark, teks, {
    markClass,
    imageClass: KELAS_GAMBAR_LOGO,
    // Rail yang diciutkan hanya menyisakan 56px. Logo memanjang di sana akan
    // jadi pita 9px yang tidak terbaca, jadi rail memakai icon dan nama
    // aplikasi tetap disembunyikan seperti label menu lainnya.
    pakaiLogo: !collapsed,
  });

  if (collapsed) {
    teks.filter(Boolean).forEach((simpul) => {
      simpul.hidden = true;
      simpul.style.display = "none";
    });
  }
}

/**
 * Sidebar sedang diciutkan atau tidak. Bawaannya tidak -- melebar penuh.
 *
 * Kelas `xl:` yang dulu menempel di helper-helper di bawah memaksa tampilan
 * melebar begitu layar mencapai xl, apa pun keadaannya, sehingga tombol ciutkan
 * tidak berpengaruh di layar besar. Sekarang keadaan inilah yang menentukan, di
 * semua lebar mulai md; di bawah md sidebar memakai drawer, bukan rail.
 */
function isSidebarCollapsed(store, mode = "desktop") {
  return mode === "desktop" && Boolean(store?.get("ui.sidebarCollapsed", false));
}

/**
 * w-full wajib di sini. Induknya memakai justify-items, yang membuat setiap
 * item grid menyusut ke isinya. Begitu nama dan tagline disembunyikan karena
 * ada logo, isinya tinggal gambar ber-w-auto yang justru menunggu lebar dari
 * wadahnya -- keduanya saling menunggu dan hasilnya nol.
 */
function brandCopyClassName(collapsed = false) {
  return collapsed
    ? "grid w-full min-w-0 justify-items-center gap-1"
    : "grid w-full min-w-0 gap-1";
}

function brandClassName(collapsed = false) {
  return collapsed
    ? `${tw.layout.sidebarBrandBlock} justify-items-center`
    : `${tw.layout.sidebarBrandBlock} justify-items-start`;
}

function brandNameClassName(collapsed = false) {
  return collapsed ? `${tw.layout.brand} hidden` : tw.layout.brand;
}

function taglineClassName(collapsed = false) {
  return collapsed ? `${tw.layout.sidebarTagline} hidden` : tw.layout.sidebarTagline;
}

function compactMarkClassName(collapsed = false) {
  return collapsed
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[var(--pb-radius-xl)] bg-[var(--pb-shell-nav-active)] text-[var(--pb-shell-nav-text)] shadow-[var(--pb-shadow-soft)]"
    : "hidden";
}

function navClassName(collapsed = false) {
  return collapsed ? `${tw.layout.nav} justify-items-center` : `${tw.layout.nav} justify-items-stretch`;
}

function compactSidebarToggle(store) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "global_sidebar_collapse_button";
  button.className = "mb-[var(--pb-space-lg)] hidden min-h-10 items-center justify-center gap-2 rounded-[var(--pb-radius-xl)] border border-[color-mix(in_srgb,var(--pb-shell-nav-text)_24%,transparent)] bg-[var(--pb-shell-nav-active)] px-3 py-2 text-xs font-semibold text-[var(--pb-shell-nav-text)] shadow-[var(--pb-shadow-soft)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pb-shell-nav-text)_40%,transparent)] md:inline-flex";
  button.addEventListener("click", () => uiStore.toggleSidebarCollapsed());
  syncCompactToggle(button, Boolean(store?.get("ui.sidebarCollapsed", false)));
  return button;
}

function syncCompactToggle(button, collapsed = false) {
  if (!button) {
    return;
  }

  button.classList.toggle("w-12", collapsed);
  button.classList.toggle("w-full", !collapsed);
  const label = collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.replaceChildren(
    createIcon(collapsed ? "arrowRight" : "arrowLeft", { className: "block h-4 w-4 leading-none" }),
    compactToggleLabel(collapsed),
  );
}

function compactToggleLabel(collapsed = false) {
  const label = document.createElement("span");
  // Saat diciutkan hanya icon yang tersisa, jadi teksnya cuma untuk pembaca
  // layar -- kalau ditampilkan ia yang justru melebarkan kembali rail-nya.
  label.className = collapsed ? "sr-only" : "min-w-0 truncate";
  label.textContent = collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar";
  return label;
}

function drawerSidebarClassName() {
  return "h-full w-[min(82vw,292px)] min-w-0 overflow-y-auto border-r border-white/15 bg-[linear-gradient(160deg,rgba(11,31,58,0.94),rgba(22,38,74,0.86))] px-5 py-5 text-[var(--pb-shell-nav-text)] shadow-[0_26px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl";
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
    links = SUPER_ADMIN_LINKS;
  }

  const visibleLinks = userRealRole === "super_admin" ? links : withDesignStudioV2Menu(links, role, store);
  nav.replaceChildren(...visibleLinks.map((link) => renderSidebarNode(link, path, options)));
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

  return ensureAdminWebConfigMenu(ensureProfileMenu(buildSidebarTree(items)), role);
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
  return ensureMenuLink(links, { href: "#/profile", label: "Profil Saya", icon: "user" }, 1);
}

function ensureAdminWebConfigMenu(links, role) {
  if (normalizeSidebarRole(role) !== "admin") {
    return links;
  }

  return ensureMenuLink(links, { href: "#/admin/web-config", label: "Konfigurasi WEB", icon: "settings" }, 2);
}

function ensureMenuLink(links, menu, index = 1) {
  if (links.some((link) => String(link.href ?? "") === menu.href)) {
    return links;
  }

  const insertAt = Math.min(Math.max(0, index), links.length);
  return [
    ...links.slice(0, insertAt),
    menu,
    ...links.slice(insertAt),
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
    const collapsed = isSidebarCollapsed(options.store, options.mode);
    const parent = renderSidebarAnchor(link, path, false, true, childActive, options);
    const arrow = document.createElement("span");
    arrow.className = options.mode === "drawer"
      ? childActive
        ? "ml-auto inline-flex shrink-0 rotate-180 items-center justify-center transition-transform duration-150"
        : "ml-auto inline-flex shrink-0 items-center justify-center transition-transform duration-150"
      // Saat diciutkan panahnya ikut hilang: rail selebar icon tidak menyisakan
      // ruang untuknya, dan submenu dibuka lewat klik pada icon induknya.
      : collapsed
        ? "hidden"
        : childActive
          ? "ml-auto inline-flex shrink-0 rotate-180 items-center justify-center transition-transform duration-150"
          : "ml-auto inline-flex shrink-0 items-center justify-center transition-transform duration-150";
    arrow.append(createIcon("chevron-down", { className: "block h-3.5 w-3.5 leading-none" }));
    parent.append(arrow);
    const childWrap = document.createElement("div");
    syncSidebarGroup(childWrap, arrow, parent, childActive, options);
    link.children.forEach((child) => childWrap.append(renderSidebarAnchor(child, path, true, false, false, options)));
    parent.addEventListener("click", (event) => {
      event.preventDefault();
      const expanded = parent.getAttribute("aria-expanded") === "true";
      syncSidebarGroup(childWrap, arrow, parent, !expanded, options);
    });
    group.append(parent);
    group.append(childWrap);
    return group;
  }

  return renderSidebarAnchor(link, path, false, false, false, options);
}

function syncSidebarGroup(childWrap, arrow, parent, expanded = false, options = {}) {
  const baseClass = "gap-1 pl-5";
  childWrap.className = expanded ? `grid ${baseClass}` : `hidden ${baseClass}`;
  arrow.classList.toggle("rotate-180", expanded);
  parent.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function renderSidebarAnchor(link, path, child = false, parent = false, activeOverride = false, options = {}) {
  const anchor = document.createElement("a");
  anchor.href = link.href;
  const collapsed = isSidebarCollapsed(options.store, options.mode);
  const active = Boolean(activeOverride || isActive(path, link.href));
  anchor.className = active
    ? `${tw.layout.navLink} ${tw.layout.navLinkActive}`
    : tw.layout.navLink;
  anchor.classList.add(...(options.mode === "drawer"
    ? ["w-full"]
    : collapsed
      ? ["w-12", "justify-center"]
      : ["w-full", "justify-start"]));
  anchor.title = link.label ?? "";
  anchor.setAttribute("aria-current", active ? "page" : "false");
  if (!parent && options.mode === "drawer") {
    anchor.addEventListener("click", () => options.onNavigate?.());
  }
  if (child) {
    anchor.classList.add("text-xs", "opacity-90");
  }
  const label = document.createElement("span");
  label.className = options.mode !== "drawer" && collapsed
    ? "hidden min-w-0 break-words"
    : "min-w-0 break-words";
  label.textContent = link.label;
  const iconWrap = document.createElement("span");
  iconWrap.className = "inline-flex h-5 w-5 shrink-0 items-center justify-center";
  iconWrap.append(createIcon(link.icon, { className: tw.layout.navIcon }));
  anchor.append(iconWrap, label);
  return anchor;
}
