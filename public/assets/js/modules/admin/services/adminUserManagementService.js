const STATUS_META = {
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  suspended: { label: "Suspended", variant: "danger" },
};

const APPROVAL_META = {
  approved: { label: "Approved", variant: "success" },
  pending: { label: "Menunggu approval", variant: "warning" },
};
const IMPERSONATION_ROLES = new Set(["seller", "affiliate_admin"]);

export const adminUserManagementService = {
  filterUsers(users = [], filters = {}) {
    const normalizedKeyword = String(filters.keyword ?? "").trim().toLowerCase();
    const normalizedRole = String(filters.role ?? "").trim();
    const normalizedStatus = String(filters.status ?? "").trim();

    return users.filter((user) => {
      if (normalizedRole && user.role !== normalizedRole) {
        return false;
      }

      if (normalizedStatus && !matchesStatusFilter(user, normalizedStatus)) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const haystacks = [
        user.name,
        user.email,
        user.phone_number,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return haystacks.some((value) => value.includes(normalizedKeyword));
    });
  },

  statusMeta(status) {
    return STATUS_META[status] ?? { label: status || "-", variant: "default" };
  },

  approvalMeta(user = null) {
    return isPendingApproval(user)
      ? APPROVAL_META.pending
      : APPROVAL_META.approved;
  },

  isPendingApproval,

  isImpersonatable(user = null) {
    if (!user || !IMPERSONATION_ROLES.has(user.role)) {
      return false;
    }

    if (Number(user.id ?? 0) <= 0) {
      return false;
    }

    return user.account_status === "active" && Boolean(user.is_approved);
  },

  impersonationLabel(user = null) {
    if ((user?.role ?? null) === "seller") {
      return "Showroom";
    }

    if ((user?.role ?? null) === "affiliate_admin") {
      return "Marketing";
    }

    return "User";
  },

  counts(users = []) {
    return {
      total: users.length,
      pendingApproval: users.filter((user) => isPendingApproval(user)).length,
      active: users.filter((user) => user.account_status === "active").length,
      suspended: users.filter((user) => user.account_status === "suspended").length,
    };
  },

  resolveSelectedUser({ detail = null, users = [], userId = "" } = {}) {
    const targetId = Number(userId);

    if (!targetId) {
      return null;
    }

    if (detail && Number(detail.id) === targetId) {
      return detail;
    }

    return users.find((user) => Number(user.id) === targetId) ?? null;
  },
};

function isPendingApproval(user = null) {
  if (!user) {
    return false;
  }

  return user.role === "seller"
    && ((user.account_status ?? "") === "pending" || !user.is_approved);
}

function matchesStatusFilter(user, filter) {
  if (filter === "pending_approval") {
    return isPendingApproval(user);
  }

  if (filter === "approved") {
    return Boolean(user.is_approved);
  }

  return (user.account_status ?? "") === filter;
}
