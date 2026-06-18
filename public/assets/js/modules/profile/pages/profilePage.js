import { createPageLifecycle } from "../../../core/lifecycle.js";
import { authService } from "../../../core/auth.js";
import { profileResource } from "../../../resources/profileResource.js";
import { appStore } from "../../../state/store.js";
import { authStore } from "../../../state/authStore.js";
import { mergeActiveUserIdentity, syncAuthUserPatch } from "../../../state/sync/authUserSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatDate } from "../../../utils/formatDate.js";
import { NotificationBell } from "../../notifications/components/notificationBell.js";
import { BUYER_MOBILE_FOOTER_ITEMS, BuyerMobileFooterNav } from "../../buyer/components/buyerMobileFooterNav.js";
import { AffiliateAccountLayout, affiliateAccountActions } from "../../affiliate/components/affiliateAccountShell.js";

const PROFILE_MODAL_KEY = "profile-edit-modal";
const PASSWORD_MODAL_KEY = "profile-password-modal";
const LOGOUT_MODAL_KEY = "profile-logout-confirm-modal";

export function ProfilePage() {
  let root = null;
  let contextRef = null;
  let unsubscribe = null;

  const actions = {
    openEditProfile() {
      openEditProfileModal(resolveProfile(), () => render(root, contextRef, actions));
    },
    openChangePassword() {
      openChangePasswordModal();
    },
    logout() {
      openLogoutConfirmModal();
    },
    navigate(path) {
      contextRef?.router?.navigate(path);
    },
  };

  return createPageLifecycle({
    mount(context) {
      contextRef = context;
      root = document.createElement("div");
      render(root, context, actions);
      return root;
    },
    hydrate(context) {
      contextRef = context;
      render(root, context, actions);
    },
    bindEvents(context) {
      contextRef = context;
      unsubscribe = appStore.subscribe((state, action) => {
        if (!String(action ?? "").startsWith("ui:")) {
          render(root, contextRef, actions);
        }
      });
      return () => unsubscribe?.();
    },
    dispose() {
      closeProfileModal(PROFILE_MODAL_KEY);
      closeProfileModal(PASSWORD_MODAL_KEY);
      closeProfileModal(LOGOUT_MODAL_KEY);
      unsubscribe = null;
    },
  });
}

function render(root, context, actions) {
  if (!root) {
    return;
  }

  const profile = resolveProfile();
  if (profile.role === "buyer") {
    renderBuyerProfile(root, context, profile, actions);
    return;
  }

  if (profile.role === "affiliate_admin") {
    renderAffiliateProfile(root, context, profile, actions);
    return;
  }

  const page = document.createElement("section");
  page.id = "profile_page";
  page.className = "mx-auto grid min-w-0 w-full max-w-[1180px] gap-5 text-[var(--pb-text)]";
  page.dataset.ds = "profile.page";

  page.append(
    pageHeader(),
    profileGrid(profile, actions),
  );

  disposeChildren(root);
  root.replaceChildren(page);
}

function isAdminImpersonatingAffiliate() {
  const impersonation = authStore.impersonation();
  const actor = authStore.actor();
  return Boolean(impersonation?.is_impersonating && actor?.role === "admin");
}

function renderAffiliateProfile(root, context, profile, actions) {
  const page = AffiliateAccountLayout({
    activePath: context?.path ?? "/profile",
    title: "Profil Marketing",
    subtitle: profileName(profile),
    icon: "user",
    actions: {
      ...affiliateAccountActions(context),
      ...actions,
    },
    children: [
      profileGrid(profile, actions),
    ],
  });

  disposeChildren(root);
  root.replaceChildren(page);
}

function renderBuyerProfile(root, context, profile, actions) {
  const activePath = context?.path ?? "/profile";
  const page = document.createElement("section");
  page.id = "byr_profile_page";
  page.className = "mx-auto grid min-w-0 w-full max-w-[430px] gap-5 pb-28 text-[var(--pb-text)] md:max-w-[1180px] md:gap-6 md:pb-8";
  page.dataset.ds = "buyer.profile.page";

  const isGoogle = Boolean(profile.has_google_identity);

  page.append(
    buyerTopNavigation({ activePath, profile, actions }),
    buyerMobileHeader({ profile, actions }),
    buyerHeroCard(profile, actions),
    buyerAccountCard(profile)
  );

  if (!isGoogle) {
    page.append(
      buyerShortcutCard(actions)
    );
  }

  page.append(
    buyerLogoutCard(actions),
    BuyerMobileFooterNav({
      activePath,
      items: BUYER_MOBILE_FOOTER_ITEMS,
      onNavigate: (path) => actions.navigate(path),
    })
  );

  disposeChildren(root);
  root.replaceChildren(page);
}

function disposeChildren(root) {
  root?.querySelectorAll?.("*").forEach((node) => node.dispose?.());
}

function buyerMobileHeader({ profile, actions }) {
  const header = document.createElement("header");
  header.id = "byr_profile_mobile_header";
  header.className = "relative flex min-w-0 items-center justify-between gap-3 px-1 py-1 md:hidden";
  header.dataset.ds = "buyer.profile.mobile_header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 flex-1 gap-0.5";
  copy.append(
    textNode("p", "text-sm font-bold text-[var(--pb-text-muted)]", "Profil Saya"),
    textNode("h1", "truncate text-2xl font-black leading-tight tracking-normal text-[var(--pb-text)]", profileName(profile)),
  );

  const actionsWrap = document.createElement("section");
  actionsWrap.className = "relative z-20 inline-flex shrink-0 items-center justify-end gap-2";
  actionsWrap.append(
    NotificationBell({ idPrefix: "byr_profile_mobile", compact: true, onNavigate: actions.navigate, withBackdrop: true }),
    buyerProfileAvatarButton(profile, actions, true),
  );

  header.append(copy, actionsWrap);
  return header;
}

function buyerTopNavigation({ activePath, profile, actions }) {
  const nav = document.createElement("nav");
  nav.id = "byrtx_desktop_top_nav";
  nav.className = "sticky top-0 z-40 hidden min-w-0 items-center justify-between gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 shadow-[var(--pb-shadow-card)] backdrop-blur-xl md:flex";
  nav.setAttribute("aria-label", "Navigasi buyer desktop");

  const brand = document.createElement("section");
  brand.className = "flex min-w-0 items-center gap-3 px-1";
  brand.append(
    iconBox("user", "h-11 w-11 rounded-full bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white"),
    textNode("strong", "truncate text-base font-black text-[var(--pb-text)]", "Profil Saya"),
  );

  const links = document.createElement("section");
  links.className = "flex min-w-0 items-center justify-end gap-2";
  BUYER_MOBILE_FOOTER_ITEMS.forEach((item) => {
    links.append(buyerDesktopNavLink(item, activePath, actions));
  });

  const actionsWrap = document.createElement("section");
  actionsWrap.className = "inline-flex shrink-0 items-center justify-end gap-2";
  actionsWrap.append(
    NotificationBell({ idPrefix: "byr_profile_desktop", onNavigate: actions.navigate, withBackdrop: true }),
    buyerProfileAvatarButton(profile, actions),
  );

  const right = document.createElement("section");
  right.className = "flex min-w-0 items-center justify-end gap-2";
  right.append(links, actionsWrap);
  nav.append(brand, right);
  return nav;
}

function buyerHeroCard(profile, actions) {
  const card = document.createElement("section");
  card.id = "byr_profile_identity_card";
  card.className = "relative overflow-hidden rounded-[1.9rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,var(--pb-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_8%,white),var(--pb-surface-card)_52%,color-mix(in_srgb,var(--pb-brand-accent)_8%,white))] p-5 shadow-[var(--pb-shadow-card)] md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-5 md:p-6";
  card.dataset.ds = "buyer.profile.identity_card";

  const avatar = avatarNode(profile);
  avatar.classList.add("justify-self-center", "md:justify-self-start");

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2 pt-4 text-center md:pt-0 md:text-left";
  copy.append(
    textNode("p", "text-xs font-black uppercase tracking-normal text-[var(--pb-brand-secondary)]", "Akun Buyer"),
    textNode("h2", "break-words text-3xl font-black leading-tight text-[var(--pb-text)]", profileName(profile)),
    textNode("p", "break-words text-sm font-semibold text-[var(--pb-text-muted)]", compactContact(profile)),
    buyerBadgeRow(profile),
  );

  const actionWrap = document.createElement("section");
  actionWrap.className = "mt-5 grid gap-2 sm:grid-cols-2 md:mt-0 md:w-[220px] md:grid-cols-1";
  const edit = Button({ label: "Edit Profil", onClick: actions.openEditProfile, designHook: "shared.button.primary" });
  edit.id = "byr_profile_edit_button";
  edit.prepend(createIcon("edit", { className: "block h-4 w-4 leading-none" }));
  actionWrap.append(
    edit,
    hiddenLegacyLogoutButton("byr_profile_logout_button", actions.logout),
    roleSpecificLogoutButton("byr_profile_role_specific_logout_button", actions.logout),
  );

  card.append(avatar, copy, actionWrap);
  return card;
}

function buyerAccountCard(profile) {
  return buyerSectionCard({
    id: "byr_profile_account_card",
    title: "Informasi Akun",
    icon: "idCard",
    rows: [
      ["Nama", profileName(profile)],
      ["Email", cleanValue(profile.email)],
      ["Nomor HP", cleanValue(profile.phone_number || profile.phone)],
      ["Role", roleLabel(profile.role)],
      ["Status akun", accountStatusLabel(profile.account_status)],
      ["Tanggal bergabung", cleanValue(formatDate(profile.created_at))],
    ],
  });
}

function buyerSecurityCard(actions) {
  const card = document.createElement("section");
  card.id = "byr_profile_security_card";
  card.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center";
  card.dataset.ds = "buyer.profile.security_card";
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3";
  copy.append(
    iconBox("lock", "h-12 w-12 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]"),
    textWrap("Keamanan Akun", "Ubah password akun pribadi Anda secara aman."),
  );
  const blocked = isAdminImpersonatingAffiliate();
  const action = Button({
    label: blocked ? "Password Dikunci" : "Ubah Password",
    variant: "secondary",
    disabled: blocked,
    onClick: blocked ? null : actions.openChangePassword,
    designHook: "shared.button.secondary",
  });
  action.id = "byr_profile_change_password_button";
  action.prepend(createIcon("lock", { className: "block h-4 w-4 leading-none" }));
  card.append(copy, action);
  if (blocked) {
    card.append(textNode("p", "text-sm font-semibold leading-6 text-amber-700 md:col-span-2", "Password akun marketing tidak dapat diubah saat admin sedang login sebagai marketing."));
  }
  return card;
}

function buyerShortcutCard(actions) {
  const card = document.createElement("section");
  card.id = "byr_profile_shortcut_card";
  card.className = "grid min-w-0 gap-3 rounded-[1.75rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)]";
  card.dataset.ds = "buyer.profile.shortcut_card";
  card.append(sectionTitle("Shortcut", "settings"));

  const grid = document.createElement("section");
  grid.className = "grid min-w-0 gap-2 sm:grid-cols-2";
  [
    ["Transaksi Saya", "transaction", "/buyer/transactions"],
    ["Katalog Mobil", "car", "/buyer/cars"],
    ["Notifikasi", "bell", "/notifications"],
  ].forEach(([label, icon, path]) => grid.append(shortcutButton(label, icon, () => actions.navigate(path))));
  card.append(grid);
  return card;
}

function buyerLogoutCard(actions) {
  const card = document.createElement("section");
  card.id = "byr_profile_logout_card";
  card.className = "grid min-w-0 gap-3 rounded-[1.75rem] border border-[color-mix(in_srgb,var(--pb-danger)_22%,var(--pb-border))] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center";
  card.dataset.ds = "buyer.profile.logout_card";
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textNode("h2", "text-lg font-black text-[var(--pb-text)]", "Keluar dari akun"),
    textNode("p", "text-sm font-semibold leading-6 text-[var(--pb-text-muted)]", "Gunakan logout saat Anda selesai memakai akun di perangkat ini."),
  );
  card.append(
    copy,
    hiddenLegacyLogoutButton("byr_profile_footer_logout_button", actions.logout),
    roleSpecificLogoutButton("byr_profile_footer_role_specific_logout_button", actions.logout, ["w-full", "sm:w-auto"]),
  );
  return card;
}

function buyerSectionCard({ id, title, icon, rows }) {
  const card = document.createElement("section");
  card.id = id;
  card.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)]";
  card.dataset.ds = "buyer.profile.info_card";
  card.append(sectionTitle(title, icon));

  const grid = document.createElement("section");
  grid.className = "grid min-w-0 gap-3 sm:grid-cols-2";
  rows.forEach(([label, value]) => grid.append(buyerInfoItem(label, value)));
  card.append(grid);
  return card;
}

function buyerInfoItem(label, value) {
  const item = document.createElement("section");
  item.className = "grid min-w-0 gap-1 rounded-[1.2rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3";
  item.append(
    textNode("p", "text-xs font-black uppercase tracking-normal text-[var(--pb-text-muted)]", label),
    textNode("p", "break-words text-sm font-bold text-[var(--pb-text)]", cleanValue(value)),
  );
  return item;
}

function buyerBadgeRow(profile) {
  const row = document.createElement("section");
  row.className = "flex flex-wrap justify-center gap-2 md:justify-start";
  row.append(
    Badge({ label: "Buyer", variant: "info" }),
    Badge({ label: accountStatusLabel(profile.account_status), variant: profile.account_status === "suspended" ? "danger" : "success" }),
  );
  return row;
}

function sectionTitle(title, icon) {
  const header = document.createElement("header");
  header.className = "flex min-w-0 items-center gap-3";
  header.append(
    iconBox(icon, "h-11 w-11 rounded-full bg-[var(--pb-brand-primary)] text-white"),
    textNode("h2", "break-words text-lg font-black text-[var(--pb-text)]", title),
  );
  return header;
}

function shortcutButton(label, icon, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.2rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3 text-left transition hover:bg-[var(--pb-surface-card)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.addEventListener("click", onClick);
  button.append(
    iconBox(icon, "h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]"),
    textNode("span", "min-w-0 break-words text-sm font-black text-[var(--pb-text)]", label),
    createIcon("chevronRight", { className: "block h-4 w-4 leading-none text-[var(--pb-text-muted)]" }),
  );
  return button;
}

function buyerDesktopNavLink(item, activePath, actions) {
  const active = isActiveBuyerNav(item, activePath);
  const link = item.disabled ? document.createElement("button") : document.createElement("a");
  link.id = `byr_profile_nav_desktop_${item.id}`;
  if (item.disabled) {
    link.type = "button";
    link.disabled = true;
    link.setAttribute("aria-disabled", "true");
  } else {
    link.href = `#${item.path}`;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      actions.navigate(item.path);
    });
  }
  link.className = active
    ? "inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-4 py-2 text-sm font-black text-[var(--pb-brand-secondary)] no-underline shadow-[var(--pb-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-[var(--pb-text-muted)] no-underline transition hover:bg-[var(--pb-surface-muted)] hover:text-[var(--pb-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55";
  if (active) {
    link.setAttribute("aria-current", "page");
  }
  link.append(
    iconBox(item.icon, active ? "h-7 w-7 rounded-full text-[var(--pb-brand-secondary)]" : "h-7 w-7 rounded-full text-[var(--pb-text-muted)]"),
    textNode("span", "truncate", item.label),
  );
  return link;
}

function buyerProfileAvatarButton(profile, actions, compact = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.setAttribute("aria-label", "Profil Saya");
  button.title = "Profil Saya";
  button.addEventListener("click", () => actions.navigate("/profile"));
  const src = avatarSource(profile);
  if (src) {
    const image = document.createElement("img");
    image.src = normalizeImageUrl(src);
    image.alt = "Foto profil";
    image.loading = "lazy";
    image.className = "block h-full w-full object-cover";
    image.addEventListener("error", () => {
      button.textContent = initials(profile);
    }, { once: true });
    button.append(image);
    return button;
  }
  button.textContent = initials(profile);
  return button;
}

function isActiveBuyerNav(item, activePath) {
  if (item.path === "/buyer") {
    return activePath === "/buyer";
  }
  return String(activePath ?? "").startsWith(item.path);
}

function pageHeader() {
  const header = document.createElement("header");
  header.className = "grid min-w-0 gap-2";
  header.append(
    textNode("p", "text-sm font-bold text-[var(--pb-text-muted)]", "Home / Profil"),
    textNode("h1", "break-words text-3xl font-black tracking-normal text-[var(--pb-text)]", "Profil Saya"),
  );
  return header;
}

function profileGrid(profile, actions) {
  const grid = document.createElement("section");
  grid.className = "grid min-w-0 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]";
  grid.append(identityCard(profile, actions), detailPanel(profile, actions));
  return grid;
}

function identityCard(profile, actions) {
  const card = document.createElement("aside");
  card.className = "grid min-w-0 gap-5 rounded-[1.5rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)] lg:self-start";

  const identity = document.createElement("section");
  identity.className = "grid min-w-0 justify-items-center gap-3 text-center";
  identity.append(
    avatarNode(profile),
    textNode("h2", "break-words text-2xl font-black text-[var(--pb-text)]", profileName(profile)),
    textNode("p", "break-words text-sm font-semibold text-[var(--pb-text-muted)]", profile.username || profile.email || "-"),
  );

  const badges = document.createElement("section");
  badges.className = "flex flex-wrap justify-center gap-2";
  badges.append(
    Badge({ label: roleLabel(profile.role), variant: "info" }),
    Badge({ label: accountStatusLabel(profile.account_status), variant: profile.account_status === "suspended" ? "danger" : "success" }),
  );

  const facts = document.createElement("section");
  facts.className = "grid min-w-0 gap-2";
  facts.append(
    summaryFact("Role", roleLabel(profile.role), "shield"),
    summaryFact("Cabang", branchLabel(profile), "showroom"),
    summaryFact("Scope", "Own", "lock"),
  );

  card.append(
    identity,
    badges,
    facts,
    hiddenLegacyLogoutButton("profile_logout_button", actions.logout),
    roleSpecificLogoutButton("profile_role_specific_logout_button", actions.logout, ["w-full"]),
  );
  return card;
}

function detailPanel(profile, actions) {
  const panel = document.createElement("section");
  panel.className = "grid min-w-0 gap-5";

  const blocked = isAdminImpersonatingAffiliate();
  const actionBar = document.createElement("section");
  actionBar.className = "flex flex-col gap-2 rounded-[1.5rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 shadow-[var(--pb-shadow-card)] sm:flex-row sm:justify-end";
  const edit = Button({
    label: blocked ? "Profil Dikunci" : "Edit Profil",
    disabled: blocked,
    onClick: blocked ? null : actions.openEditProfile,
    designHook: "shared.button.primary",
  });
  edit.id = "profile_edit_button";
  edit.prepend(createIcon("edit", { className: "block h-4 w-4 leading-none" }));
  const password = Button({
    label: blocked ? "Password Dikunci" : "Ubah Password",
    variant: "secondary",
    disabled: blocked,
    onClick: blocked ? null : actions.openChangePassword,
    designHook: "shared.button.secondary",
  });
  password.id = "profile_change_password_button";
  password.prepend(createIcon("lock", { className: "block h-4 w-4 leading-none" }));
  if (profile.role !== "seller") {
    actionBar.append(edit, password);
  } else {
    actionBar.append(edit);
  }

  panel.append(actionBar);

  if (blocked) {
    panel.append(textNode("p", "rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800", "Anda sedang login sebagai marketing melalui akun admin. Perubahan profil dan password diblokir untuk menjaga keamanan akun target."));
  }

  panel.append(
    detailSection("Informasi Akun", "idCard", [
      ["Username", profile.username || profile.email || "-"],
      ["Nama Lengkap", profileName(profile)],
      ["Email", profile.email || "-"],
      ["Nomor HP", profile.phone_number || profile.phone || "-"],
      ["Foto Profil", avatarSource(profile) ? "Tersedia" : "Belum tersedia"],
      ["Status Akun", accountStatusLabel(profile.account_status)],
    ]),
    detailSection("Informasi Role & Scope", "sitemap", [
      ["Level login", profile.id_level || profile.login_level || profile.role || "-"],
      ["Role efektif", roleLabel(profile.role)],
      ["Cabang user", branchLabel(profile)],
      ["Scope data user", "Own"],
    ]),
    detailSection("Informasi Relasi Data", "addressBook", relationRows(profile)),
    detailSection("Info Login", "clock", [
      ["User ID", profile.id ? `#${profile.id}` : "-"],
      ["Tanggal dibuat", formatDate(profile.created_at)],
      ["Terakhir diperbarui", formatDate(profile.updated_at)],
    ]),
  );

  return panel;
}

function detailSection(title, icon, rows) {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-4 rounded-[1.5rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)]";

  const header = document.createElement("header");
  header.className = "flex min-w-0 items-center gap-3";
  header.append(
    iconBox(icon, "h-11 w-11 rounded-full bg-[var(--pb-brand-primary)] text-white"),
    textNode("h2", "break-words text-lg font-black text-[var(--pb-text)]", title),
  );

  const list = document.createElement("section");
  list.className = "grid min-w-0 gap-3 md:grid-cols-2";
  rows.forEach(([label, value]) => list.append(infoItem(label, value)));

  section.append(header, list);
  return section;
}

function relationRows(profile) {
  const showroom = profile.showroom ?? null;
  const affiliate = profile.affiliate ?? null;
  return [
    ["Karyawan terkait", profile.employee?.name || "-"],
    ["Santri terkait", profile.student?.name || "-"],
    ["Wali santri terkait", profile.guardian?.name || "-"],
    ["Showroom terkait", showroom?.name || "-"],
    ["Marketing terkait", affiliate?.referral_code || "-"],
    ["Referensi lain", profile.reference_note || profile.fid_keterangan || "-"],
  ];
}

function hiddenLegacyLogoutButton(id, onClick) {
  const button = Button({ label: "Logout", variant: "danger", onClick, designHook: "shared.button.danger" });
  button.id = id;
  button.hidden = true;
  button.setAttribute("aria-hidden", "true");
  button.classList.add("hidden");
  button.prepend(createIcon("unlock", { className: "block h-4 w-4 leading-none" }));
  return button;
}

function roleSpecificLogoutButton(id, onClick, extraClasses = []) {
  const button = Button({ label: "Logout", variant: "danger", onClick, designHook: "shared.button.danger" });
  button.id = id;
  button.classList.add(...extraClasses);
  button.prepend(createIcon("unlock", { className: "block h-4 w-4 leading-none" }));
  return button;
}

function openEditProfileModal(profile, onSaved) {
  let saving = false;
  let mounted = true;
  let errors = {};
  const draft = {
    name: profileName(profile) === "User" ? "" : profileName(profile),
    email: profile.email || "",
    phone_number: profile.phone_number || "",
    address: profile.address || "",
  };

  const renderModal = () => {
    const form = document.createElement("form");
    form.className = "grid min-w-0 gap-4";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errors = validateProfile(draft);
      if (Object.keys(errors).length) {
        renderModal();
        return;
      }
      saving = true;
      renderModal();
      const payload = {
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone_number: draft.phone_number.trim() || null,
        address: draft.address.trim() || null,
      };
      try {
        const updated = await profileResource.updateMe(payload);
        syncAuthUserPatch(updated ?? payload, { source: "profile:update" });
        showToast("Profil berhasil diperbarui.", { type: "success" });
        mounted = false;
        closeModal({ notify: false });
        onSaved?.();
      } catch (error) {
        errors = normalizeErrors(error);
        showToast(error.message || "Gagal memperbarui profil.", { type: "error" });
      } finally {
        saving = false;
        if (mounted) {
          renderModal();
        }
      }
    });

    form.append(
      formInput("Nama lengkap", "profile_name_input", "text", draft.name, (value) => { draft.name = value; }, errors.name, saving),
      formInput("Email", "profile_email_input", "email", draft.email, (value) => { draft.email = value; }, errors.email, saving),
      formInput("Nomor HP", "profile_phone_input", "text", draft.phone_number, (value) => { draft.phone_number = value; }, errors.phone_number, saving),
      formTextarea("Alamat", "profile_address_input", draft.address, (value) => { draft.address = value; }, errors.address, saving),
      modalActions(saving, saving ? "Menyimpan..." : "Simpan", () => {
        mounted = false;
        closeModal({ notify: false });
      }),
    );

    openModal(form, {
      key: PROFILE_MODAL_KEY,
      title: "Edit Profil",
      description: "Perbarui informasi akun pribadi.",
      size: "lg",
      footer: null,
      panelId: "profile_edit_modal",
      headerId: "profile_edit_modal_header",
      bodyId: "profile_edit_modal_body",
      closeButtonId: "profile_edit_modal_close_button",
    });
  };

  renderModal();
}

function openChangePasswordModal() {
  let saving = false;
  let mounted = true;
  let errors = {};
  const draft = {
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  };

  const renderModal = () => {
    const form = document.createElement("form");
    form.className = "grid min-w-0 gap-4";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errors = validatePassword(draft);
      if (Object.keys(errors).length) {
        renderModal();
        return;
      }
      saving = true;
      renderModal();
      try {
        await profileResource.changePassword(draft);
        showToast("Password berhasil diperbarui.", { type: "success" });
        mounted = false;
        closeModal({ notify: false });
      } catch (error) {
        errors = normalizeErrors(error);
        showToast(error.message || "Gagal mengubah password.", { type: "error" });
      } finally {
        saving = false;
        if (mounted) {
          renderModal();
        }
      }
    });

    form.append(
      formInput("Password lama", "profile_current_password_input", "password", draft.current_password, (value) => { draft.current_password = value; }, errors.current_password, saving),
      formInput("Password baru", "profile_new_password_input", "password", draft.new_password, (value) => { draft.new_password = value; }, errors.new_password, saving),
      formInput("Konfirmasi password baru", "profile_new_password_confirmation_input", "password", draft.new_password_confirmation, (value) => { draft.new_password_confirmation = value; }, errors.new_password_confirmation, saving),
      modalActions(saving, saving ? "Menyimpan..." : "Simpan Password", () => {
        mounted = false;
        closeModal({ notify: false });
      }),
    );

    openModal(form, {
      key: PASSWORD_MODAL_KEY,
      title: "Ubah Password",
      description: "Gunakan password baru minimal 8 karakter.",
      size: "lg",
      footer: null,
      panelId: "profile_password_modal",
      headerId: "profile_password_modal_header",
      bodyId: "profile_password_modal_body",
      closeButtonId: "profile_password_modal_close_button",
    });
  };

  renderModal();
}

function openLogoutConfirmModal() {
  let processing = false;
  const loginHash = logoutLoginHash(authStore.role());

  const renderModal = () => {
    const content = document.createElement("section");
    content.id = "profile_logout_confirm_content";
    content.className = "grid min-w-0 gap-5";

    const message = document.createElement("section");
    message.className = "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-danger)_18%,var(--pb-border))] bg-[var(--pb-surface-muted)] p-4";
    message.append(
      iconBox("unlock", "h-11 w-11 rounded-full bg-[color-mix(in_srgb,var(--pb-danger)_12%,white)] text-[var(--pb-danger)]"),
      textWrap("Keluar dari akun?", "Anda akan keluar dari sesi saat ini dan perlu login kembali untuk mengakses akun."),
    );

    const actions = document.createElement("section");
    actions.className = "flex flex-col-reverse gap-2 border-t border-[var(--pb-border)] pt-4 sm:flex-row sm:justify-end";

    const cancel = Button({
      label: "Batal",
      variant: "secondary",
      disabled: processing,
      onClick: () => closeModal({ notify: false }),
      designHook: "shared.button.secondary",
    });
    cancel.id = "profile_logout_cancel_button";

    const confirm = Button({
      label: processing ? "Memproses..." : "Ya, Logout",
      variant: "danger",
      disabled: processing,
      onClick: async () => {
        processing = true;
        renderModal();
        try {
          await authService.logout();
          closeModal({ notify: false });
          showToast("Logout berhasil.", { type: "success" });
          window.location.hash = loginHash;
        } catch (error) {
          processing = false;
          renderModal();
          showToast(error.message || "Logout gagal.", { type: "error" });
        }
      },
      designHook: "shared.button.danger",
    });
    confirm.id = "profile_logout_confirm_button";
    confirm.prepend(createIcon("unlock", { className: "block h-4 w-4 leading-none" }));

    actions.append(cancel, confirm);
    content.append(message, actions);

    openModal(content, {
      key: LOGOUT_MODAL_KEY,
      title: "Konfirmasi Logout",
      description: "",
      size: "md",
      footer: null,
      panelId: "profile_logout_confirm_modal",
      headerId: "profile_logout_confirm_modal_header",
      bodyId: "profile_logout_confirm_modal_body",
      closeButtonId: "profile_logout_confirm_modal_close_button",
    });
  };

  renderModal();
}

function logoutLoginHash(role) {
  if (role === "admin" || role === "super_admin") {
    return "#/google-login/admin";
  }

  if (role === "seller") {
    return "#/google-login/seller";
  }

  if (role === "affiliate_admin") {
    return "#/login/affiliate";
  }

  return "#/google-login/buyer";
}

function formInput(label, id, type, value, onChange, error, disabled) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1 text-sm font-bold text-[var(--pb-text-strong)]";
  const input = document.createElement("input");
  input.id = id;
  input.type = type;
  input.value = value;
  input.disabled = disabled;
  input.className = "min-h-11 w-full rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 text-sm font-semibold text-[var(--pb-text)] outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:opacity-60";
  input.addEventListener("input", () => onChange(input.value));
  wrap.append(textNode("span", "", label), input);
  if (error) {
    wrap.append(textNode("span", "text-xs font-semibold text-[var(--pb-danger)]", error));
  }
  return wrap;
}

function formTextarea(label, id, value, onChange, error, disabled) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1 text-sm font-bold text-[var(--pb-text-strong)]";
  const input = document.createElement("textarea");
  input.id = id;
  input.value = value;
  input.disabled = disabled;
  input.rows = 3;
  input.className = "min-h-24 w-full resize-y rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-sm font-semibold text-[var(--pb-text)] outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:opacity-60";
  input.addEventListener("input", () => onChange(input.value));
  wrap.append(textNode("span", "", label), input);
  if (error) {
    wrap.append(textNode("span", "text-xs font-semibold text-[var(--pb-danger)]", error));
  }
  return wrap;
}

function modalActions(saving, submitLabel, onCancel) {
  const actions = document.createElement("section");
  actions.className = "flex flex-col-reverse gap-2 border-t border-[var(--pb-border)] pt-4 sm:flex-row sm:justify-end";
  const cancel = Button({ label: "Batal", variant: "secondary", onClick: onCancel, designHook: "shared.button.secondary" });
  cancel.disabled = saving;
  const submit = Button({ label: submitLabel, disabled: saving, designHook: "shared.button.primary" });
  submit.type = "submit";
  actions.append(cancel, submit);
  return actions;
}

function validateProfile(draft) {
  const errors = {};
  if (!draft.name.trim()) {
    errors.name = "Nama lengkap wajib diisi.";
  }
  if (!draft.email.trim()) {
    errors.email = "Email wajib diisi.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = "Email tidak valid.";
  }
  return errors;
}

function validatePassword(draft) {
  const errors = {};
  if (!draft.current_password) {
    errors.current_password = "Password lama wajib diisi.";
  }
  if (!draft.new_password) {
    errors.new_password = "Password baru wajib diisi.";
  } else if (draft.new_password.length < 8) {
    errors.new_password = "Password baru minimal 8 karakter.";
  }
  if (draft.new_password !== draft.new_password_confirmation) {
    errors.new_password_confirmation = "Konfirmasi password baru tidak sama.";
  }
  return errors;
}

function normalizeErrors(error) {
  const list = Array.isArray(error?.errors) ? error.errors : [];
  if (!list.length && error?.response?.errors && typeof error.response.errors === "object") {
    return error.response.errors;
  }
  return list.reduce((carry, item) => {
    if (Array.isArray(item) && item.length >= 2) {
      carry[item[0]] = item[1];
    }
    return carry;
  }, {});
}

function resolveProfile() {
  const working = appStore.get("working.profilePage.profile.data", null);
  const authUser = authStore.user();
  return mergeActiveUserIdentity(working, authUser);
}

function avatarNode(profile) {
  const wrap = document.createElement("span");
  wrap.className = "inline-flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-3xl font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)]";
  const src = avatarSource(profile);
  if (src) {
    const image = document.createElement("img");
    image.src = normalizeImageUrl(src);
    image.alt = "Foto profil";
    image.loading = "lazy";
    image.className = "block h-full w-full object-cover";
    image.addEventListener("error", () => {
      wrap.textContent = initials(profile);
    }, { once: true });
    wrap.append(image);
    return wrap;
  }
  wrap.textContent = initials(profile);
  return wrap;
}

function avatarSource(profile) {
  return profile.avatar_url || profile.photo_url || profile.profile_photo_url || "";
}

function summaryFact(label, value, icon) {
  const item = document.createElement("section");
  item.className = "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[1rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3";
  item.append(iconBox(icon, "h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]"), textWrap(label, value));
  return item;
}

function infoItem(label, value) {
  const item = document.createElement("section");
  item.className = "grid min-w-0 gap-1 rounded-[1rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3";
  item.append(
    textNode("p", "text-xs font-black uppercase tracking-normal text-[var(--pb-text-muted)]", label),
    textNode("p", "break-words text-sm font-bold text-[var(--pb-text)]", cleanValue(value)),
  );
  return item;
}

function textWrap(label, value) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-0.5";
  wrap.append(
    textNode("span", "text-xs font-black uppercase tracking-normal text-[var(--pb-text-muted)]", label),
    textNode("span", "break-words text-sm font-bold text-[var(--pb-text)]", value || "-"),
  );
  return wrap;
}

function iconBox(icon, className) {
  const wrap = document.createElement("span");
  wrap.className = `inline-flex shrink-0 items-center justify-center ${className}`;
  wrap.append(createIcon(icon, { className: "block h-4 w-4 leading-none" }));
  return wrap;
}

function closeProfileModal(key) {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === key) {
    closeModal({ notify: false });
  }
}

function profileName(profile) {
  return cleanValue(profile.name || profile.full_name || profile.username, "User");
}

function initials(profile) {
  return profileName(profile).split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
}

function roleLabel(role) {
  const labels = {
    admin: "Admin",
    seller: "Seller",
    buyer: "Buyer",
    affiliate_admin: "Marketing Admin",
  };
  return labels[role] ?? statusLabel(role || "-");
}

function accountStatusLabel(status) {
  const labels = {
    active: "Aktif",
    pending: "Pending",
    suspended: "Nonaktif",
  };
  return labels[status] ?? statusLabel(status || "Belum diisi");
}

function branchLabel(profile) {
  return cleanValue(profile.branch?.name || profile.cabang?.name || profile.showroom?.name);
}

function statusLabel(value) {
  return cleanValue(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactContact(profile) {
  const email = cleanValue(profile.email, "");
  const phone = cleanValue(profile.phone_number || profile.phone, "");
  return [email, phone].filter(Boolean).join(" | ") || "Kontak belum diisi";
}

function cleanValue(value, fallback = "Belum diisi") {
  if (value === null || value === undefined) {
    return fallback;
  }
  const text = String(value).trim();
  if (!text || text === "-" || text.toLowerCase() === "null" || text.toLowerCase() === "undefined" || text === "Invalid Date") {
    return fallback;
  }
  return text;
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

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
