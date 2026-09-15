import { createPageLifecycle } from "../../../core/lifecycle.js";
import { navigateTo } from "../../../core/router.js";
import { appStore } from "../../../state/store.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { Button } from "../../../ui/primitives/button.js";
import { openModal, closeModal } from "../../../ui/primitives/modal.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminSessionService } from "../services/adminSessionService.js";
import { adminUserManagementService } from "../services/adminUserManagementService.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
import { AdminUsersFilterBar } from "../components/adminUsersFilterBar.js";
import { AdminUsersList } from "../components/adminUsersList.js";
import { AdminUserDetailPanel } from "../components/adminUserDetailPanel.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

export function AdminUsersPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    activeUserId: null,
    approvingUserId: null,
    togglingShowroomId: null,
    confirmDeactivateUserId: null,
    deactivateReasonDraft: "",
    closingDetail: false,
    query: createUsersQuery(),
    error: "",
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    applyFilters(nextFilters) {
      state.error = "";
      state.query = {
        ...state.query,
        ...nextFilters,
        page: 1,
        userId: "",
      };
      syncUsersUrl(state.query);
      rerender();
    },
    changePage(nextPage) {
      state.error = "";
      state.query = {
        ...state.query,
        page: nextPage,
      };
      syncUsersUrl(state.query);
      rerender();
    },
    changePerPage(nextPerPage) {
      state.error = "";
      state.query = {
        ...state.query,
        page: 1,
        pageSize: nextPerPage,
        userId: "",
      };
      syncUsersUrl(state.query);
      rerender();
    },
    selectUser(user) {
      state.error = "";
      state.closingDetail = false;
      state.query = {
        ...state.query,
        userId: String(user.id),
      };
      syncUsersUrl(state.query);
      rerender();
      hydrateUserDetail(user.id);
    },
    closeUserDetail() {
      state.error = "";
      state.closingDetail = true;
      state.query = {
        ...state.query,
        userId: "",
      };
      syncUsersUrl(state.query);
      rerender();
    },
    async approveUser(user) {
      state.approvingUserId = user.id;
      state.error = "";
      rerender();

      try {
        const result = await adminSessionService.approveUsers([user.id]);
        showToast(`Approval selesai untuk ${result.approvedCount} user.`, { type: "success" });
        await refreshWorkingState(currentContext);
        clearSelectionIfApprovedLeavesQueue(state, user);
        rerender();
      } catch (error) {
        state.error = error.message || "Approval user gagal diproses.";
        showToast(state.error, { type: "error" });
      } finally {
        state.approvingUserId = null;
        rerender();
      }
    },
    deactivateShowroom(user) {
      // Cuma membuka langkah konfirmasi -- API baru dipanggil dari
      // confirmDeactivateShowroom(). Disimpan sebagai state halaman (bukan
      // openModal() langsung dari sini) supaya modalnya ikut siklus render()
      // yang sama dengan modal "Review user" -- kalau tidak, openModal() di
      // sini memicu appStore berubah, usersPage.js re-render karena
      // subscribe-nya, dan render() itu SELALU membuka ulang modal review
      // ketika shouldOpenDetailModal true, langsung menimpa modal konfirmasi
      // yang baru saja terbuka.
      state.confirmDeactivateUserId = user.id;
      state.deactivateReasonDraft = "";
      rerender();
    },
    updateDeactivateReasonDraft(value) {
      state.deactivateReasonDraft = value;
    },
    cancelDeactivateShowroom() {
      state.confirmDeactivateUserId = null;
      rerender();
    },
    async confirmDeactivateShowroom(user, reason) {
      state.togglingShowroomId = user.showroom.id;
      state.error = "";
      rerender();

      try {
        await showroomsResource.deactivate(user.showroom.id, reason);
        showToast(`Showroom ${user.showroom.name || ""} berhasil dinonaktifkan.`, { type: "success" });
        state.confirmDeactivateUserId = null;
        await refreshWorkingState(currentContext);
        rerender();
      } catch (error) {
        state.error = error.message || "Gagal menonaktifkan showroom.";
        showToast(state.error, { type: "error" });
        throw error;
      } finally {
        state.togglingShowroomId = null;
        rerender();
      }
    },
    async activateShowroom(user) {
      state.togglingShowroomId = user.showroom.id;
      state.error = "";
      rerender();

      try {
        await showroomsResource.activate(user.showroom.id);
        showToast(`Showroom ${user.showroom.name || ""} berhasil diaktifkan kembali.`, { type: "success" });
        await refreshWorkingState(currentContext);
        rerender();
      } catch (error) {
        state.error = error.message || "Gagal mengaktifkan showroom.";
        showToast(state.error, { type: "error" });
      } finally {
        state.togglingShowroomId = null;
        rerender();
      }
    },
    openImpersonation(user) {
      openImpersonationModal({
        user,
        onConfirm: async (reason = "") => {
          state.activeUserId = user.id;
          rerender();

          try {
            await adminSessionService.startImpersonation(user.id, { reason, targetRole: user.role });
            showToast(`Login sebagai ${adminUserManagementService.impersonationLabel(user).toLowerCase()} aktif untuk ${user.name || user.email || `User #${user.id}`}.`, { type: "success" });
            navigateTo(user.role === "seller" ? "/seller" : "/affiliate");
          } catch (error) {
            state.activeUserId = null;
            rerender();
            showToast(error.message || "Gagal memulai impersonation.", { type: "error" });
            throw error;
          }
        },
      });
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.activeUserId = null;
      state.approvingUserId = null;
      state.closingDetail = false;
      state.query = createUsersQuery(context?.query);
      state.error = "";
    },
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      state.closingDetail = false;
      state.query = createUsersQuery(context?.query);
      rerender();
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => rerender());
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      closeModal({ notify: false });
    },
  });
}

function render(root, context, state, actions) {
  if (!root || !context) {
    return;
  }

  const filters = {
    ...state.query,
  };
  const workingUsersPayload = appStore.get("working.adminUsers.users.data", null);
  const snapshotUsersPayload = appStore.get("snapshot.admin.users.data", null);
  const usersPayload = workingUsersPayload
    ?? snapshotUsersPayload
    ?? { users: [], meta: {} };
  const workingPendingPayload = appStore.get("working.adminUsers.pendingUsers.data", null);
  const snapshotPendingPayload = appStore.get("snapshot.admin.pendingUsers.data", null);
  const pendingPayload = workingPendingPayload
    ?? snapshotPendingPayload
    ?? { users: [], meta: {} };
  const detail = appStore.get("working.adminUsers.detail.data", null);
  const detailHydratedAt = appStore.get("working.adminUsers.detail.hydratedAt", 0) ?? 0;
  const usersHydratedAt = appStore.get("working.adminUsers.users.hydratedAt", 0) ?? 0;
  const hasUsersSource = Boolean(workingUsersPayload || snapshotUsersPayload);

  // Super admin tidak ditampilkan di sini. Halaman ini untuk mengelola
  // pengguna operasional; akun super admin tidak diapa-apakan dari sini --
  // tidak di-approve, tidak di-impersonate -- jadi menampilkannya hanya
  // memberi tahu setiap admin siapa saja pemegang akses tertinggi.
  const users = tanpaSuperAdmin(usersPayload.users ?? []);
  const pendingUsers = tanpaSuperAdmin(pendingPayload.users ?? []);
  const filteredUsers = adminUserManagementService.filterUsers(users, filters);
  const counts = adminUserManagementService.counts(users);
  const currentPage = Math.max(1, Number(filters.page || 1));
  const currentPageSize = Math.max(1, Number(filters.pageSize || 10));
  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * currentPageSize;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + currentPageSize);
  const selectedUser = adminUserManagementService.resolveSelectedUser({
    detail,
    users,
    userId: filters.userId,
  });
  const canRenderDetailModal = Boolean(selectedUser) || Boolean(detailHydratedAt);
  const shouldOpenDetailModal = Boolean(filters.userId) && !state.closingDetail && canRenderDetailModal;

  const layout = document.createElement("section");
  layout.id = "adusr_page_section";
  layout.className = "grid min-w-0 gap-6";

  const main = document.createElement("div");
  main.className = "grid min-w-0 gap-6";

  const approvalsButton = Button({
    label: "Approval queue",
    variant: "secondary",
    onClick: () => context.router?.navigate("/admin/approvals"),
    designHook: "shared.button.secondary",
  });
  approvalsButton.id = "adusr_approval_queue_button";
  approvalsButton.prepend(createIcon("sparkles", { className: "h-4 w-4" }));

  main.append(
    usersHero({ action: approvalsButton }),
    applyDesignHook(AdminUsersFilterBar({
      filters,
      counts: {
        ...counts,
        pendingApproval: pendingUsers.length,
      },
      onSubmit: (nextFilters) => actions.applyFilters(nextFilters),
    }), "admin.users.filters"),
  );

  if (state.error) {
    const error = document.createElement("div");
    error.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    error.textContent = state.error;
    main.append(error);
  }

  const usersList = applyDesignHook(AdminUsersList({
    loading: !usersHydratedAt && !hasUsersSource,
    users: pagedUsers,
    page: safePage,
    perPage: currentPageSize,
    totalItems,
    selectedUserId: filters.userId,
    activeUserId: state.activeUserId,
    approvingUserId: state.approvingUserId,
    onSelect: (user) => actions.selectUser(user),
    onApprove: (user) => actions.approveUser(user),
    onImpersonate: (user) => actions.openImpersonation(user),
    onPageChange: (nextPage) => actions.changePage(nextPage),
    onPerPageChange: (nextPerPage) => actions.changePerPage(nextPerPage),
  }), "admin.users.list");
  main.append(usersList);

  layout.append(main);
  root.replaceChildren(layout);

  const isConfirmingDeactivate = shouldOpenDetailModal
    && selectedUser
    && state.confirmDeactivateUserId === selectedUser.id;

  if (isConfirmingDeactivate) {
    // Modal ini SENGAJA bagian dari render() yang sama dengan modal review
    // (bukan openModal() berdiri sendiri dipanggil dari actions.*) -- kalau
    // dipanggil terpisah, ui.modal di appStore berubah, usersPage.js
    // re-render lewat subscribe di bawah, lalu blok shouldOpenDetailModal
    // selalu membuka ulang modal review dan langsung menimpa modal
    // konfirmasi yang baru saja terbuka.
    openModal(deactivateShowroomConfirmForm({
      user: selectedUser,
      processing: state.togglingShowroomId === selectedUser.showroom?.id,
      reasonValue: state.deactivateReasonDraft,
      onReasonChange: (value) => actions.updateDeactivateReasonDraft(value),
      onCancel: () => actions.cancelDeactivateShowroom(),
      onSubmit: (reason) => actions.confirmDeactivateShowroom(selectedUser, reason),
    }), {
      key: `adusr-deactivate-confirm-${selectedUser.id}`,
      title: "Konfirmasi Nonaktifkan Showroom",
      description: "Tindakan ini bisa dibatalkan lagi kapan saja lewat tombol Aktifkan Showroom.",
      size: "lg",
      footer: null,
      panelId: "adusr_deactivate_showroom_modal",
      headerId: "adusr_deactivate_showroom_modal_header",
      bodyId: "adusr_deactivate_showroom_modal_body",
      closeButtonId: "adusr_deactivate_showroom_modal_close_button",
      onClose: () => actions.cancelDeactivateShowroom(),
    });
  } else if (shouldOpenDetailModal) {
    openModal(applyDesignHook(AdminUserDetailPanel({
      user: selectedUser,
      isHydrating: Boolean(filters.userId && !detailHydratedAt && !selectedUser),
      activeUserId: state.activeUserId,
      approvingUserId: state.approvingUserId,
      togglingShowroomId: state.togglingShowroomId,
      onApprove: (user) => actions.approveUser(user),
      onImpersonate: (user) => actions.openImpersonation(user),
      onDeactivateShowroom: (user) => actions.deactivateShowroom(user),
      onActivateShowroom: (user) => actions.activateShowroom(user),
      presentation: "modal",
    }), "admin.users.detail"), {
      key: `adusr-detail-${filters.userId}`,
      title: "Review user",
      description: "Periksa ringkasan akun, approval state, dan action admin dari satu modal yang fokus.",
      size: "lg",
      footer: null,
      panelId: "adusr_detail_modal_section",
      headerId: "adusr_detail_modal_header_section",
      bodyId: "adusr_detail_modal_body_section",
      closeButtonId: "adusr_detail_modal_close_button",
      onClose: () => actions.closeUserDetail(),
    });
  } else {
    if (!filters.userId) {
      state.closingDetail = false;
    }
    const activeModal = appStore.get("ui.modal", null);
    if (String(activeModal?.key ?? "").startsWith("adusr-detail-") || String(activeModal?.key ?? "").startsWith("adusr-deactivate-confirm-")) {
      closeModal({ notify: false });
    }
  }
}

function usersHero({ action }) {
  const section = document.createElement("section");
  section.id = "adusr_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(250,244,237,0.86),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7";

  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_45%,white)] blur-3xl";

  const layout = document.createElement("div");
  layout.className = "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-3";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-secondary),var(--pb-brand-accent))] text-white shadow-[0_16px_40px_rgba(30,129,176,0.24)]";
  icon.append(createIcon("user", { className: "h-5 w-5" }));

  copy.append(
    icon,
    textNode("p", "text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", ""),
    textNode("h1", "max-w-2xl text-2xl font-black leading-tight tracking-normal text-gray-950 sm:text-3xl", "User Management"),
    textNode("p", "max-w-xl text-xs leading-6 text-gray-600", ""),
  );

  layout.append(copy, action);
  section.append(glow, layout);
  return section;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}

async function refreshWorkingState(context) {
  if (!context) {
    return;
  }

  const filters = {
    userId: context.query.user_id ?? "",
  };

  const [users, pendingUsers, detail] = await Promise.all([
    adminSessionService.listUsers({
      limit: 100,
    }),
    adminSessionService.pendingUsers({ limit: 50 }),
    filters.userId ? adminSessionService.userDetail(filters.userId).catch(() => null) : Promise.resolve(null),
  ]);

  appStore.patchState("working.adminUsers.users", {
    data: users,
    hydratedAt: Date.now(),
  }, "admin-users:refresh-users");
  appStore.patchState("working.adminUsers.pendingUsers", {
    data: pendingUsers,
    hydratedAt: Date.now(),
  }, "admin-users:refresh-pending");
  appStore.patchState("working.adminUsers.detail", {
    data: detail,
    hydratedAt: Date.now(),
  }, "admin-users:refresh-detail");
}

function buildUsersPath({ keyword = "", role = "", status = "", page = "", pageSize = "", userId = "" } = {}) {
  const params = new URLSearchParams();

  if (keyword) {
    params.set("keyword", keyword);
  }

  if (role) {
    params.set("role", role);
  }

  if (status) {
    params.set("status", status);
  }

  if (page && Number(page) > 1) {
    params.set("page", String(page));
  }

  if (pageSize && Number(pageSize) > 0) {
    params.set("page_size", String(pageSize));
  }

  if (userId) {
    params.set("user_id", String(userId));
  }

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function clearSelectionIfApprovedLeavesQueue(state, user) {
  if (String(state?.query?.status ?? "") !== "pending_approval") {
    return;
  }

  if (Number(state?.query?.userId ?? 0) !== Number(user?.id ?? 0)) {
    return;
  }

  state.query = {
    ...state.query,
    userId: "",
  };
  syncUsersUrl(state.query);
}

function createUsersQuery(query = {}) {
  return {
    keyword: query.keyword ?? "",
    role: query.role ?? "",
    status: query.status ?? "",
    page: Math.max(1, Number(query.page || 1)),
    pageSize: Math.max(1, Number(query.page_size || 10)),
    userId: query.user_id ?? "",
  };
}

function tanpaSuperAdmin(users) {
  return (Array.isArray(users) ? users : []).filter((user) => user?.role !== "super_admin");
}

function syncUsersUrl(query) {
  const target = new URL(buildUsersPath(query), window.location.origin);
  window.history.replaceState(window.history.state, "", target);
}

async function hydrateUserDetail(userId) {
  const targetId = Number(userId);
  if (!targetId) {
    return;
  }

  const currentDetail = appStore.get("working.adminUsers.detail.data", null);
  if (currentDetail && Number(currentDetail.id) === targetId) {
    return;
  }

  appStore.patchState("working.adminUsers.detail", {
    data: null,
    hydratedAt: 0,
  }, "admin-users:detail-loading");

  const detail = await adminSessionService.userDetail(targetId).catch(() => null);
  appStore.patchState("working.adminUsers.detail", {
    data: detail,
    hydratedAt: Date.now(),
  }, "admin-users:detail-hydrated");
}

/**
 * Fungsi render murni (bukan pemilik state/openModal sendiri) -- dipanggil
 * ulang dari render() halaman setiap kali state.deactivateReasonDraft atau
 * state.togglingShowroomId berubah, supaya modal ini ikut siklus reaktif
 * yang sama dengan modal "Review user" alih-alih bersaing dengannya.
 */
function deactivateShowroomConfirmForm({ user, processing, reasonValue, onReasonChange, onCancel, onSubmit }) {
  const showroomName = user.showroom?.name || `Showroom #${user.showroom?.id ?? "-"}`;

  const form = document.createElement("form");
  form.className = "grid min-w-0 gap-4";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    // Baca langsung dari elemen textarea (di bawah), bukan dari parameter
    // reasonValue -- fungsi ini sengaja TIDAK dipanggil ulang tiap keystroke
    // (lihat komentar di onReasonChange di usersPage.js), jadi reasonValue di
    // closure ini selalu nilai saat form pertama dirender, bukan nilai
    // terkini yang sedang diketik admin.
    const reason = textarea.value.trim();
    if (reason.length < 5) {
      showToast("Alasan menonaktifkan showroom minimal 5 karakter.", { type: "error" });
      return;
    }

    onSubmit?.(reason);
  });

  const note = document.createElement("div");
  note.className = "grid gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  note.append(
    textNode("strong", "break-words", `Nonaktifkan ${showroomName}`),
    textNode("p", "break-words text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]", "Halaman showroom publik dan katalog mobilnya akan menampilkan halaman maintenance ke buyer. Seller tetap bisa masuk ke dashboard untuk melihat alasan ini."),
  );

  const reasonField = document.createElement("label");
  reasonField.className = "grid min-w-0 gap-1 text-xs font-bold text-[var(--pb-text-strong)]";
  const textarea = document.createElement("textarea");
  textarea.id = "adusr_deactivate_showroom_reason_input";
  textarea.rows = 3;
  textarea.value = reasonValue;
  textarea.disabled = processing;
  textarea.placeholder = "Mis. menunggak pembayaran paket, melanggar aturan platform, dsb.";
  textarea.className = "min-h-24 w-full resize-y rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs font-semibold text-[var(--pb-text)] outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:opacity-60";
  textarea.addEventListener("input", () => onReasonChange?.(textarea.value));
  reasonField.append(textNode("span", "", "Alasan (wajib)"), textarea);

  const actions = document.createElement("section");
  actions.className = "flex flex-col-reverse gap-2 border-t border-[var(--pb-border)] pt-4 sm:flex-row sm:justify-end";
  const cancel = Button({
    label: "Batal",
    variant: "secondary",
    disabled: processing,
    onClick: () => onCancel?.(),
  });
  cancel.id = "adusr_deactivate_showroom_cancel_button";
  const confirm = Button({
    label: processing ? "Memproses..." : "Nonaktifkan Showroom",
    disabled: processing,
  });
  confirm.type = "submit";
  confirm.id = "adusr_deactivate_showroom_confirm_button";

  actions.append(cancel, confirm);
  form.append(note, reasonField, actions);

  return form;
}

function openImpersonationModal({ user, onConfirm }) {
  let processing = false;
  let mounted = true;
  const draft = {
    reason: "",
  };
  const targetLabel = adminUserManagementService.impersonationLabel(user);

  const renderModal = () => {
    const form = document.createElement("form");
    form.className = "grid min-w-0 gap-4";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      processing = true;
      renderModal();

      try {
        await onConfirm?.(draft.reason.trim());
        mounted = false;
        closeModal({ notify: false });
      } catch (error) {
        processing = false;
        if (mounted) {
          renderModal();
        }
      }
    });

    const note = document.createElement("div");
    note.className = "grid gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--pb-warning)_26%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-4 py-3 text-xs text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]";
    note.append(
      textNode("strong", "break-words", `Masuk sebagai ${targetLabel.toLowerCase()} ${user.name || user.email || `User #${user.id}`}`),
      textNode("p", "break-words text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]", "Aksi ini akan tercatat di audit log. Anda tetap bisa kembali ke akun admin dari banner impersonation."),
    );

    const reasonField = document.createElement("label");
    reasonField.className = "grid min-w-0 gap-1 text-xs font-bold text-[var(--pb-text-strong)]";
    const textarea = document.createElement("textarea");
    textarea.id = "adusr_affiliate_impersonation_reason_input";
    textarea.rows = 3;
    textarea.value = draft.reason;
    textarea.disabled = processing;
    textarea.placeholder = "Alasan support/debugging (opsional)";
    textarea.className = "min-h-24 w-full resize-y rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs font-semibold text-[var(--pb-text)] outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:opacity-60";
    textarea.addEventListener("input", () => {
      draft.reason = textarea.value;
    });
    reasonField.append(textNode("span", "", "Alasan"), textarea);

    const actions = document.createElement("section");
    actions.className = "flex flex-col-reverse gap-2 border-t border-[var(--pb-border)] pt-4 sm:flex-row sm:justify-end";
    const cancel = Button({
      label: "Batal",
      variant: "secondary",
      disabled: processing,
      onClick: () => {
        mounted = false;
        closeModal({ notify: false });
      },
    });
    cancel.id = "adusr_affiliate_impersonation_cancel_button";
    const confirm = Button({
      label: processing ? "Memproses..." : `Masuk sebagai ${targetLabel}`,
      disabled: processing,
    });
    confirm.type = "submit";
    confirm.id = "adusr_affiliate_impersonation_confirm_button";

    actions.append(cancel, confirm);
    form.append(note, reasonField, actions);

    openModal(form, {
      key: "admin-impersonation-confirm",
      title: `Konfirmasi Login sebagai ${targetLabel}`,
      description: `Admin akan berpindah ke shell ${targetLabel.toLowerCase()} tanpa mengetahui password akun target.`,
      size: "lg",
      footer: null,
      panelId: "adusr_impersonation_modal",
      headerId: "adusr_impersonation_modal_header",
      bodyId: "adusr_impersonation_modal_body",
      closeButtonId: "adusr_impersonation_modal_close_button",
    });
  };

  renderModal();
}
