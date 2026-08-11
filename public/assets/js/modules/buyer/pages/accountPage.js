import { createPageLifecycle } from "../../../core/lifecycle.js";
import { roleLabel } from "../../../core/roleLabels.js";
import { appStore } from "../../../state/store.js";
import { authStore } from "../../../state/authStore.js";
import { mergeActiveUserIdentity, syncAuthUserPatch } from "../../../state/sync/authUserSync.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { profileResource } from "../../../resources/profileResource.js";
import { buyerState } from "../state/buyerState.js";
import { BUYER_MOBILE_FOOTER_ITEMS, BuyerMobileFooterNav } from "../components/buyerMobileFooterNav.js";
import { BuyerDesktopTopNav } from "../components/buyerDesktopTopNav.js";

const PROFILE_MODAL_KEY = "byr-account-profile-modal";
const PASSWORD_MODAL_KEY = "byr-account-password-modal";

export function BuyerAccountPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;

  const actions = {
    navigate(path) {
      currentContext?.router?.navigate(path);
    },
    openEditProfile() {
      openEditProfileModal(resolveUser(), () => render(root, currentContext, actions));
    },
    openChangePassword() {
      openChangePasswordModal();
    },
  };

  return createPageLifecycle({
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      render(root, context, actions);
      return root;
    },
    hydrate(context) {
      currentContext = context;
      render(root, context, actions);
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
      closeAccountModal(PROFILE_MODAL_KEY);
      closeAccountModal(PASSWORD_MODAL_KEY);
      unsubscribe = null;
    },
  });
}

function render(root, context, actions) {
  if (!root) {
    return;
  }

  const user = resolveUser();
  const activePath = context?.path ?? "/buyer/account";
  const page = document.createElement("section");
  page.id = "byrac_page";
  page.className = "mx-auto grid min-w-0 w-full max-w-[430px] gap-5 pb-28 text-[var(--pb-text)] md:max-w-[1180px] md:gap-6 md:pb-8";
  page.dataset.ds = "buyer.account.page";

  page.append(
    BuyerDesktopTopNav({
      activePath,
      onNavigate: (path) => actions.navigate(path),
      brandLabel: "Akun Buyer",
      brandIcon: "user",
      user,
    }),
    accountHeader(user),
    accountInfoSection(user, actions),
    securitySection(actions),
    BuyerMobileFooterNav({
      activePath,
      items: BUYER_MOBILE_FOOTER_ITEMS,
      onNavigate: (path) => actions.navigate(path),
    }),
  );

  disposeChildren(root);
  root.replaceChildren(page);
}

function disposeChildren(root) {
  root?.querySelectorAll?.("*").forEach((node) => node.dispose?.());
}

function buyerTopNavigation({ activePath, actions }) {
  const nav = document.createElement("nav");
  nav.id = "byrtx_desktop_top_nav";
  nav.className = "hidden min-w-0 items-center justify-between gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 shadow-[var(--pb-shadow-card)] backdrop-blur-xl md:flex";
  nav.setAttribute("aria-label", "Navigasi buyer desktop");

  const brand = document.createElement("section");
  brand.className = "flex min-w-0 items-center gap-3 px-1";
  brand.append(
    iconBox({ size: "h-11 w-11", className: "rounded-full bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)]", icon: "user", iconSize: "h-5 w-5" }),
    textNode("strong", "truncate text-sm font-black text-[var(--pb-text)]", "Akun Buyer"),
  );

  const list = document.createElement("section");
  list.className = "flex min-w-0 items-center justify-end gap-2";
  BUYER_MOBILE_FOOTER_ITEMS.forEach((item) => list.append(desktopNavLink(item, activePath, actions)));

  nav.append(brand, list);
  return nav;
}

function accountHeader(user) {
  const header = document.createElement("header");
  header.id = "byrac_header";
  header.className = "grid min-w-0 gap-4 rounded-[1.85rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_12%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-surface-card)_94%,white)] p-5 shadow-[var(--pb-shadow-card)] md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:p-6";
  header.dataset.ds = "buyer.account.header";

  header.append(
    avatarNode(user),
    profileCopy(user),
    accountBadges(user),
  );
  return header;
}

function profileCopy(user) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "text-[10px] font-black uppercase tracking-normal text-[var(--pb-brand-secondary)]", "Akun Saya"),
    textNode("h1", "break-words text-2xl font-black leading-tight text-[var(--pb-text)]", userName(user)),
    textNode("p", "break-words text-xs font-semibold text-[var(--pb-text-muted)]", user.email || "-"),
    textNode("p", "break-words text-xs font-semibold text-[var(--pb-text-muted)]", user.phone_number || user.phone || "-"),
  );
  return wrap;
}

function accountBadges(user) {
  const wrap = document.createElement("section");
  wrap.className = "flex flex-wrap gap-2 md:justify-end";
  wrap.append(
    Badge({ label: "Buyer", variant: "info" }),
    Badge({ label: statusLabel(user.account_status || "active"), variant: user.account_status === "suspended" ? "danger" : "success" }),
  );
  return wrap;
}

function accountInfoSection(user, actions) {
  const section = document.createElement("section");
  section.id = "byrac_info_section";
  section.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)] md:p-6";
  section.dataset.ds = "buyer.account.info";

  const header = sectionHeader("Informasi Akun", "Data utama akun buyer Anda.", "idCard");
  const edit = Button({ label: "Edit Profil", onClick: actions.openEditProfile, designHook: "shared.button.primary" });
  edit.id = "byrac_edit_profile_button";
  edit.prepend(createIcon("edit", { className: "block h-4 w-4 leading-none" }));
  header.append(edit);

  const grid = document.createElement("section");
  grid.className = "grid gap-3 md:grid-cols-2";
  [
    ["Nama lengkap", userName(user), "user"],
    ["Email", user.email || "-", "envelope"],
    ["Nomor HP", user.phone_number || user.phone || "-", "phone"],
    ["Level User", roleLabel(user.role || "buyer"), "shield"],
    ["Status akun", statusLabel(user.account_status || "-"), "circleCheck"],
    ["Tanggal bergabung", formatDate(user.created_at), "calendar"],
    ["Alamat", user.address || "-", "location"],
  ].forEach(([label, value, icon]) => grid.append(infoItem(label, value, icon)));

  section.append(header, grid);
  return section;
}

function securitySection(actions) {
  const section = document.createElement("section");
  section.id = "byrac_security_section";
  section.className = "grid min-w-0 gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-5 shadow-[var(--pb-shadow-card)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6";
  section.dataset.ds = "buyer.account.security";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    iconBox({ size: "h-12 w-12", className: "rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]", icon: "lock", iconSize: "h-5 w-5" }),
    textNode("h2", "text-lg font-black text-[var(--pb-text)]", "Keamanan Akun"),
    textNode("p", "text-xs font-semibold leading-6 text-[var(--pb-text-muted)]", "Perbarui password secara berkala untuk menjaga keamanan akun Anda."),
  );

  const action = Button({ label: "Ubah Password", onClick: actions.openChangePassword, designHook: "shared.button.primary" });
  action.id = "byrac_change_password_button";
  action.prepend(createIcon("lock", { className: "block h-4 w-4 leading-none" }));

  section.append(copy, action);
  return section;
}

function openEditProfileModal(user, onSaved) {
  let saving = false;
  let mounted = true;
  let errors = {};
  const draft = {
    name: userName(user) === "Buyer" ? "" : userName(user),
    phone_number: user.phone_number || user.phone || "",
    email: user.email || "",
    address: user.address || "",
  };

  const renderModal = () => {
    const content = document.createElement("form");
    content.id = "byrac_profile_form";
    content.className = "grid min-w-0 gap-4";
    content.addEventListener("submit", async (event) => {
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
        phone_number: draft.phone_number.trim() || null,
        email: draft.email.trim(),
        address: draft.address.trim() || null,
      };
      try {
        const updated = await profileResource.updateMe(payload);
        syncAuthUserPatch(updated ?? payload, { source: "buyer-account:profile-updated" });
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

    content.append(
      formInput("Nama lengkap", "byrac_profile_name_input", "text", draft.name, (value) => { draft.name = value; }, errors.name, saving),
      formInput("Email", "byrac_profile_email_input", "email", draft.email, (value) => { draft.email = value; }, errors.email, saving),
      formInput("Nomor HP", "byrac_profile_phone_input", "text", draft.phone_number, (value) => { draft.phone_number = value; }, errors.phone_number, saving),
      formTextarea("Alamat", "byrac_profile_address_input", draft.address, (value) => { draft.address = value; }, errors.address, saving),
      modalActions({
        saving,
        submitLabel: saving ? "Menyimpan..." : "Simpan",
        onCancel: () => {
          mounted = false;
          closeModal({ notify: false });
        },
      }),
    );

    openModal(content, {
      key: PROFILE_MODAL_KEY,
      title: "Edit Profil",
      description: "Ubah informasi akun yang dapat diperbarui oleh buyer.",
      size: "lg",
      footer: null,
      panelId: "byrac_profile_modal",
      headerId: "byrac_profile_modal_header",
      bodyId: "byrac_profile_modal_body",
      closeButtonId: "byrac_profile_modal_close_button",
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
    const content = document.createElement("form");
    content.id = "byrac_password_form";
    content.className = "grid min-w-0 gap-4";
    content.addEventListener("submit", async (event) => {
      event.preventDefault();
      errors = validatePassword(draft);
      if (Object.keys(errors).length) {
        renderModal();
        return;
      }
      saving = true;
      renderModal();
      try {
        await profileResource.changePassword({
          current_password: draft.current_password,
          new_password: draft.new_password,
          new_password_confirmation: draft.new_password_confirmation,
        });
        draft.current_password = "";
        draft.new_password = "";
        draft.new_password_confirmation = "";
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

    content.append(
      formInput("Password lama", "byrac_current_password_input", "password", draft.current_password, (value) => { draft.current_password = value; }, errors.current_password, saving),
      formInput("Password baru", "byrac_new_password_input", "password", draft.new_password, (value) => { draft.new_password = value; }, errors.new_password, saving),
      formInput("Konfirmasi password baru", "byrac_new_password_confirmation_input", "password", draft.new_password_confirmation, (value) => { draft.new_password_confirmation = value; }, errors.new_password_confirmation, saving),
      modalActions({
        saving,
        submitLabel: saving ? "Menyimpan..." : "Simpan Password",
        onCancel: () => {
          mounted = false;
          closeModal({ notify: false });
        },
      }),
    );

    openModal(content, {
      key: PASSWORD_MODAL_KEY,
      title: "Ubah Password",
      description: "Gunakan password baru minimal 8 karakter.",
      size: "lg",
      footer: null,
      panelId: "byrac_password_modal",
      headerId: "byrac_password_modal_header",
      bodyId: "byrac_password_modal_body",
      closeButtonId: "byrac_password_modal_close_button",
    });
  };

  renderModal();
}

function formInput(label, id, type, value, onChange, error, disabled) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1 text-xs font-bold text-[var(--pb-text-strong)]";
  const input = document.createElement("input");
  input.id = id;
  input.type = type;
  input.value = value;
  input.disabled = disabled;
  input.className = "min-h-11 w-full rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 text-xs font-semibold text-[var(--pb-text)] outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:opacity-60";
  input.addEventListener("input", () => onChange(input.value));
  wrap.append(textNode("span", "", label), input);
  if (error) {
    wrap.append(textNode("span", "text-[10px] font-semibold text-[var(--pb-danger)]", error));
  }
  return wrap;
}

function formTextarea(label, id, value, onChange, error, disabled) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1 text-xs font-bold text-[var(--pb-text-strong)]";
  const input = document.createElement("textarea");
  input.id = id;
  input.value = value;
  input.disabled = disabled;
  input.rows = 3;
  input.className = "min-h-24 w-full resize-y rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs font-semibold text-[var(--pb-text)] outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:opacity-60";
  input.addEventListener("input", () => onChange(input.value));
  wrap.append(textNode("span", "", label), input);
  if (error) {
    wrap.append(textNode("span", "text-[10px] font-semibold text-[var(--pb-danger)]", error));
  }
  return wrap;
}

function modalActions({ saving, submitLabel, onCancel }) {
  const actions = document.createElement("section");
  actions.className = "flex flex-wrap justify-end gap-2 border-t border-[var(--pb-border)] pt-4";
  const cancel = Button({ label: "Batal", variant: "secondary", onClick: onCancel, designHook: "shared.button.secondary" });
  cancel.type = "button";
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
  if (!draft.new_password_confirmation) {
    errors.new_password_confirmation = "Konfirmasi password wajib diisi.";
  }
  if (draft.new_password && draft.new_password_confirmation && draft.new_password !== draft.new_password_confirmation) {
    errors.new_password_confirmation = "Konfirmasi password baru tidak sama.";
  }
  if (draft.current_password && draft.new_password && draft.current_password === draft.new_password) {
    errors.new_password = "Password baru tidak boleh sama dengan password lama.";
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

function resolveUser() {
  const working = appStore.get("working.buyerAccount.profile.data", null);
  const snapshot = buyerState.snapshot("profile", null);
  const authUser = authStore.user();
  return mergeActiveUserIdentity(working ?? snapshot, authUser);
}

function avatarNode(user) {
  const wrap = document.createElement("span");
  wrap.className = "inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xl font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)]";
  const src = user.avatar_url || user.photo_url || user.profile_photo_url || "";
  if (src) {
    const image = document.createElement("img");
    image.src = normalizeImageUrl(src);
    image.alt = "Avatar buyer";
    image.loading = "lazy";
    image.className = "block h-full w-full object-cover";
    image.addEventListener("error", () => {
      wrap.textContent = initials(user);
    }, { once: true });
    wrap.append(image);
    return wrap;
  }
  wrap.textContent = initials(user);
  return wrap;
}

function infoItem(label, value, icon) {
  const item = document.createElement("section");
  item.className = "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[1.25rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3";
  item.append(
    iconBox({ size: "h-10 w-10", className: "rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] text-[var(--pb-brand-secondary)]", icon, iconSize: "h-4 w-4" }),
    textWrap(label, value || "-"),
  );
  return item;
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

function desktopNavLink(item, activePath, actions) {
  const active = isActiveNav(item, activePath);
  const link = item.disabled ? document.createElement("button") : document.createElement("a");
  link.id = `byrac_nav_desktop_${item.id}`;
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

function closeAccountModal(key) {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === key) {
    closeModal({ notify: false });
  }
}

function userName(user) {
  return user.name || user.full_name || user.username || "Buyer";
}

function initials(user) {
  return userName(user).split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "B";
}

function statusLabel(status) {
  return String(status ?? "-").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function textWrap(title, description) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("span", "break-words text-xs font-black text-[var(--pb-text)]", title),
    textNode("span", "break-words text-xs font-semibold text-[var(--pb-text-muted)]", description),
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
