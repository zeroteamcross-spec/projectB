import { brandConfig } from "../theme/brandConfig.js";
import { roleLabel } from "../core/roleLabels.js";
import { renderBrandLockup } from "../theme/brandLockup.js";
import { showToast } from "../ui/primitives/toast.js";
import { tw } from "../theme/tailwindClasses.js";
import { adminSessionService } from "../modules/admin/services/adminSessionService.js";
import { applyDesignHook } from "../theme/designStudioHooks.js";
import { NotificationBell } from "../modules/notifications/components/notificationBell.js";

export function header(store) {
  const node = document.createElement("header");
  node.className = `${tw.layout.header} relative z-[79] overflow-visible`;
  applyDesignHook(node, "shell.app.header");

  const topRow = document.createElement("div");
  topRow.className = "flex min-w-0 w-full items-center justify-between gap-3";

  const titleWrap = document.createElement("div");
  titleWrap.className = "flex min-w-0 flex-1 items-center gap-3";

  const mark = document.createElement("div");

  const title = document.createElement("strong");
  title.className = `${tw.layout.appHeaderTitle} min-w-0 break-words`;

  renderBrand(mark, title);

  titleWrap.append(mark, title);

  const role = document.createElement("span");
  role.className = `${tw.layout.rolePill} hidden md:inline-flex`;
  role.textContent = `Level User: ${roleLabel(currentRole(store))}`;

  const actions = document.createElement("div");
  actions.className = "flex shrink-0 items-center justify-end gap-2";
  const notificationBell = NotificationBell({ idPrefix: "global", withBackdrop: true });
  const profileAction = profileButton(store);
  actions.append(role, notificationBell, profileAction);

  const bannerHost = document.createElement("div");
  let wasAuthenticated = Boolean(store?.get?.("auth.isAuthenticated", false));

  const sync = (state) => {
    const isAuthenticated = Boolean(state.auth?.isAuthenticated);
    role.textContent = `Level User: ${roleLabel(state.auth?.role ?? state.app.activeRole ?? "public")}`;
    renderBrand(mark, title);
    renderBanner(bannerHost, state);
    syncProfileButton(profileAction, state.auth?.user ?? null);
    node.classList.toggle("flex-col", Boolean(state.auth.impersonation));
    node.classList.toggle("items-stretch", Boolean(state.auth.impersonation));
    node.classList.toggle("py-3", Boolean(state.auth.impersonation));
    if (!wasAuthenticated && isAuthenticated) {
      profileAction.reset?.();
    }
    wasAuthenticated = isAuthenticated;
  };

  const unsubscribe = store?.subscribe?.(sync) ?? null;

  topRow.append(titleWrap, actions);
  node.append(topRow, bannerHost);
  node.dispose = () => {
    notificationBell.dispose?.();
    unsubscribe?.();
  };
  return node;
}

/**
 * Brand di header aplikasi: logo dari Konfigurasi WEB kalau ada, kalau tidak
 * kotak icon berikut nama aplikasi seperti sebelumnya.
 *
 * Saat logonya ada, kotak gradiennya ikut dilepas dan nama aplikasi
 * disembunyikan -- logo biasanya sudah memuat namanya sendiri, dan menaruhnya
 * di dalam kotak berwarna hanya membuat dua lambang bertumpuk. Namanya pindah
 * ke atribut alt supaya pembaca layar tetap mendapatkannya.
 *
 * Aturan yang sama sudah dipakai landing page sejak 354e6d7.
 */
function renderBrand(mark, title) {
  // Teksnya selalu diisi; yang menentukan tampil atau tidak adalah lockup.
  // Mengosongkannya saat ada logo terasa lebih rapi, tapi kalau logonya gagal
  // dimuat lockup akan memunculkan kembali elemen yang isinya sudah telanjur
  // kosong.
  title.textContent = brandConfig.shellTitle;

  renderBrandLockup(mark, [title], {
    markClass: tw.layout.shellMark,
    imageClass: "block h-10 w-auto max-w-[10rem] object-contain",
    iconClass: "h-5 w-5",
  });
}

function currentRole(store) {
  return store?.get("app.activeRole", "public") ?? "public";
}

function renderBanner(host, state) {
  if (!host) {
    return;
  }

  const impersonation = state.auth.impersonation ?? null;

  if (!impersonation) {
    host.replaceChildren();
    return;
  }

  const actor = impersonation.actor ?? state.auth.actor ?? null;
  const target = impersonation.target ?? state.auth.user ?? null;
  const panel = document.createElement("div");
  panel.className = "mt-3 flex min-w-0 flex-col gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--pb-warning)_42%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-4 py-3 text-xs text-[color-mix(in_srgb,var(--pb-warning)_84%,black)] shadow-sm md:flex-row md:items-center md:justify-between";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";

  const title = document.createElement("strong");
  title.className = "break-words";
  title.textContent = `Sedang act-as ${target?.name ?? target?.email ?? "user target"}`;

  const text = document.createElement("span");
  text.className = "break-words text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]";
  text.textContent = `Admin asli: ${actor?.name ?? actor?.email ?? "admin"}${impersonation.expires_at ? ` | berakhir ${impersonation.expires_at}` : ""}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = `${tw.button.base} ${tw.button.secondary}`;
  button.textContent = "Kembali ke admin";
  applyDesignHook(button, "shared.button.secondary");
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Memproses...";

    try {
      await adminSessionService.stopImpersonation();
      showToast("Impersonation dihentikan.", { type: "success" });
      window.location.hash = "#/admin/users";
    } catch (error) {
      showToast(error.message || "Gagal menghentikan impersonation.", { type: "error" });
      button.disabled = false;
      button.textContent = "Kembali ke admin";
    }
  });

  copy.append(title, text);
  panel.append(copy, button);
  host.replaceChildren(panel);
}

function profileButton(store) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-card)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-soft)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55";
  button.setAttribute("aria-label", "Profil pengguna");
  button.title = "Profil";
  applyDesignHook(button, "shared.button.secondary");
  button.reset = () => {
    button.disabled = false;
    syncProfileButton(button, store?.get?.("auth.user", null) ?? null);
  };
  syncProfileButton(button, store?.get?.("auth.user", null) ?? null);
  button.addEventListener("click", () => {
    window.location.hash = "#/profile";
  });

  return button;
}

function syncProfileButton(button, user) {
  if (!button) {
    return;
  }

  button.replaceChildren();
  const avatarUrl = user?.avatar_url ?? user?.photo_url ?? user?.profile_photo_url ?? "";
  if (avatarUrl) {
    const image = document.createElement("img");
    image.src = avatarUrl;
    image.alt = "Profil";
    image.className = "block h-full w-full object-cover";
    image.addEventListener("error", () => {
      button.textContent = initials(user);
    }, { once: true });
    button.append(image);
    return;
  }

  button.textContent = initials(user);
}

function initials(user) {
  const source = String(user?.name ?? user?.email ?? "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase() || "U";
}
