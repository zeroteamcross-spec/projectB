import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { openModal, closeModal } from "../../../ui/primitives/modal.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminSessionService } from "../services/adminSessionService.js";
import { adminApprovalQueueService } from "../services/adminApprovalQueueService.js";
import { AdminApprovalFilterBar } from "../components/adminApprovalFilterBar.js";
import { AdminApprovalQueueList } from "../components/adminApprovalQueueList.js";
import { AdminApprovalDetailPanel } from "../components/adminApprovalDetailPanel.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

export function AdminApprovalsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    approvingUserId: null,
    reviewingUserId: null,
    closingReview: false,
    query: createApprovalsQuery(),
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
        pageSize: state.query.pageSize,
        userId: "",
      };
      syncApprovalsUrl(state.query);
      rerender();
    },
    review(user) {
      state.error = "";
      state.closingReview = false;
      state.reviewingUserId = user.id;
      state.query = {
        ...state.query,
        userId: String(user.id),
      };
      syncApprovalsUrl(state.query);
      rerender();
      hydrateApprovalDetail(user.id);
    },
    changePage(nextPage) {
      state.error = "";
      state.query = {
        ...state.query,
        page: nextPage,
      };
      syncApprovalsUrl(state.query);
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
      syncApprovalsUrl(state.query);
      rerender();
    },
    async approve(user) {
      state.approvingUserId = user.id;
      state.error = "";
      rerender();

      try {
        const result = await adminSessionService.approveUsers([user.id]);
        showToast(`Approval selesai untuk ${result.approvedCount} user.`, { type: "success" });
        await refreshWorkingState();
        syncSelectionAfterApproval(user);
      } catch (error) {
        state.error = error.message || "Approval user gagal diproses.";
        showToast(state.error, { type: "error" });
      } finally {
        state.approvingUserId = null;
        rerender();
      }
    },
    closeReview() {
      state.reviewingUserId = null;
      state.closingReview = true;
      state.query = {
        ...state.query,
        userId: "",
      };
      rerender();
      syncApprovalsUrl(state.query);
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.approvingUserId = null;
      state.reviewingUserId = null;
      state.closingReview = false;
      state.query = createApprovalsQuery(context?.query);
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
      state.reviewingUserId = null;
      state.closingReview = false;
      state.query = createApprovalsQuery(context?.query);
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

  async function refreshWorkingState() {
    const selectedUserId = state.query.userId ?? "";
    const [pendingUsers, detail] = await Promise.all([
      adminSessionService.pendingUsers({ limit: 100 }),
      selectedUserId ? adminSessionService.userDetail(selectedUserId).catch(() => null) : Promise.resolve(null),
    ]);

    appStore.patchState("working.adminApprovals.pendingUsers", {
      data: pendingUsers,
      hydratedAt: Date.now(),
    }, "admin-approvals:refresh-pending");
    appStore.patchState("working.adminApprovals.detail", {
      data: detail,
      hydratedAt: Date.now(),
    }, "admin-approvals:refresh-detail");
    appStore.patchState("snapshot.admin.pendingUsers", {
      ...(appStore.get("snapshot.admin.pendingUsers", {}) ?? {}),
      data: pendingUsers,
    }, "admin-approvals:sync-snapshot");
  }

  function syncSelectionAfterApproval(user) {
    if (Number(state.query.userId ?? 0) !== Number(user?.id ?? 0)) {
      return;
    }

    state.query = {
      ...state.query,
      userId: "",
    };
    syncApprovalsUrl(state.query);
    rerender();
  }
}

function render(root, context, state, actions) {
  if (!root || !context) {
    return;
  }

  const filters = {
    ...state.query,
  };

  const workingPendingPayload = appStore.get("working.adminApprovals.pendingUsers.data", null);
  const snapshotPendingPayload = appStore.get("snapshot.admin.pendingUsers.data", null);
  const pendingPayload = workingPendingPayload ?? snapshotPendingPayload ?? { users: [], meta: {} };
  const pendingHydratedAt = appStore.get("working.adminApprovals.pendingUsers.hydratedAt", 0) ?? 0;
  const detail = appStore.get("working.adminApprovals.detail.data", null);
  const detailHydratedAt = appStore.get("working.adminApprovals.detail.hydratedAt", 0) ?? 0;
  const hasPendingSource = Boolean(workingPendingPayload || snapshotPendingPayload);
  const users = pendingPayload.users ?? [];
  const filteredUsers = adminApprovalQueueService.filterUsers(users, filters);
  const counts = adminApprovalQueueService.counts(users);
  const currentPage = Math.max(1, Number(filters.page || 1));
  const currentPageSize = Math.max(1, Number(filters.pageSize || 10));
  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * currentPageSize;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + currentPageSize);
  const hasRequestedUser = Boolean(filters.userId);
  const selectedUser = adminApprovalQueueService.resolveSelectedUser({
    detail,
    users,
    userId: filters.userId,
  });
  const canRenderReviewModal = Boolean(selectedUser) || Boolean(detailHydratedAt);
  const shouldOpenReviewModal = hasRequestedUser && !state.closingReview && canRenderReviewModal;

  const layout = document.createElement("section");
  layout.id = "adpv_page_section";
  layout.className = "grid gap-6";

  const main = document.createElement("div");
  main.className = "grid gap-6";

  const userManagementButton = Button({
    label: "User management",
    variant: "secondary",
    onClick: () => context.router?.navigate(filters.userId
      ? `/admin/users?status=pending_approval&user_id=${encodeURIComponent(filters.userId)}`
      : "/admin/users?status=pending_approval"),
    designHook: "shared.button.secondary",
  });
  userManagementButton.id = "adpv_user_management_button";
  userManagementButton.prepend(createIcon("user", { className: "h-4 w-4" }));

  main.append(
    approvalsHero({ action: userManagementButton }),
    applyDesignHook(AdminApprovalFilterBar({
      filters,
      counts,
      onSubmit: (nextFilters) => actions.applyFilters(nextFilters),
    }), "admin.approvals.filters"),
  );

  if (state.error) {
    const error = document.createElement("div");
    error.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-sm font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    error.textContent = state.error;
    main.append(error);
  }

  if (!pendingHydratedAt && !hasPendingSource) {
    const loading = EmptyState({
      title: "Memuat approval queue",
      description: "Snapshot dan working set approval queue sedang disiapkan.",
    });
    loading.id = "adpv_loading_section";
    main.append(loading);
  } else {
    main.append(applyDesignHook(AdminApprovalQueueList({
      users: pagedUsers,
      page: safePage,
      perPage: currentPageSize,
      totalItems,
      selectedUserId: filters.userId,
      approvingUserId: state.approvingUserId,
      reviewingUserId: state.reviewingUserId,
      onReview: (user) => actions.review(user),
      onApprove: (user) => actions.approve(user),
      onPageChange: (nextPage) => actions.changePage(nextPage),
      onPerPageChange: (nextPerPage) => actions.changePerPage(nextPerPage),
    }), "admin.approvals.list"));
  }

  layout.append(main);
  root.replaceChildren(layout);

  if (shouldOpenReviewModal) {
    openModal(applyDesignHook(AdminApprovalDetailPanel({
      user: selectedUser,
      isHydrating: Boolean(hasRequestedUser && !detailHydratedAt && !selectedUser),
      hasRequestedUser,
      approvingUserId: state.approvingUserId,
      onApprove: (user) => actions.approve(user),
      onOpenUserManagement: (user) => context.router?.navigate(`/admin/users?status=pending_approval&user_id=${encodeURIComponent(user.id)}`),
    }), "admin.approvals.detail"), {
      key: `adpv-review-${filters.userId}`,
      title: "Review approval",
      description: "Periksa data user dan showroom sebelum mengambil keputusan approval.",
      size: "lg",
      footer: null,
      panelId: "adpv_review_modal_section",
      headerId: "adpv_review_modal_header_section",
      bodyId: "adpv_review_modal_body_section",
      closeButtonId: "adpv_review_modal_close_button",
      onClose: () => actions.closeReview(),
    });
  } else {
    if (!hasRequestedUser) {
      state.closingReview = false;
    }
    closeModal({ notify: false });
  }
}

function approvalsHero({ action }) {
  const section = document.createElement("section");
  section.id = "adpv_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(250,244,237,0.86),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7";

  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_45%,white)] blur-3xl";

  const layout = document.createElement("div");
  layout.className = "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-3";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-secondary),var(--pb-brand-accent))] text-white shadow-[0_16px_40px_rgba(30,129,176,0.24)]";
  icon.append(createIcon("sparkles", { className: "h-5 w-5" }));

  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", ""),
    textNode("h1", "max-w-2xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", "Approval Queue"),
    textNode("p", "max-w-xl text-sm leading-6 text-gray-600", ""),
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

function buildApprovalsPath({ keyword = "", role = "", approvalState = "", userId = "", page = "", pageSize = "" } = {}) {
  const params = new URLSearchParams();

  if (keyword) {
    params.set("keyword", keyword);
  }

  if (role) {
    params.set("role", role);
  }

  if (approvalState) {
    params.set("approval_state", approvalState);
  }

  if (userId) {
    params.set("user_id", String(userId));
  }

  if (page && Number(page) > 1) {
    params.set("page", String(page));
  }

  if (pageSize && Number(pageSize) > 0) {
    params.set("page_size", String(pageSize));
  }

  const query = params.toString();
  return query ? `/admin/approvals?${query}` : "/admin/approvals";
}

function createApprovalsQuery(query = {}) {
  return {
    keyword: query.keyword ?? "",
    role: query.role ?? "",
    approvalState: query.approval_state ?? "",
    page: Math.max(1, Number(query.page || 1)),
    pageSize: Math.max(1, Number(query.page_size || 10)),
    userId: query.user_id ?? "",
  };
}

function syncApprovalsUrl(query) {
  const nextHash = `#${buildApprovalsPath(query)}`;
  const url = new URL(window.location.href);
  url.hash = nextHash;
  window.history.replaceState(window.history.state, "", url);
}

async function hydrateApprovalDetail(userId) {
  const targetId = Number(userId);
  if (!targetId) {
    return;
  }

  const currentDetail = appStore.get("working.adminApprovals.detail.data", null);
  if (currentDetail && Number(currentDetail.id) === targetId) {
    return;
  }

  appStore.patchState("working.adminApprovals.detail", {
    data: null,
    hydratedAt: 0,
  }, "admin-approvals:detail-loading");

  const detail = await adminSessionService.userDetail(targetId).catch(() => null);
  appStore.patchState("working.adminApprovals.detail", {
    data: detail,
    hydratedAt: Date.now(),
  }, "admin-approvals:detail-hydrated");
}
