const APPROVAL_META = {
  pending_approval: {
    label: "Menunggu approval",
    variant: "warning",
    description: "User masih menunggu approval admin sebelum bisa dipakai normal.",
  },
  pending_account: {
    label: "Pending account",
    variant: "warning",
    description: "Akun belum aktif dan masih perlu review admin.",
  },
  approved: {
    label: "Approved",
    variant: "success",
    description: "Akun sudah disetujui admin.",
  },
};

export const adminApprovalQueueService = {
  filterUsers(users = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();
    const role = String(filters.role ?? "").trim().toLowerCase();
    const approvalState = String(filters.approvalState ?? "").trim().toLowerCase();

    return users.filter((user) => {
      if (role && String(user.role ?? "").toLowerCase() !== role) {
        return false;
      }

      if (approvalState && !matchesApprovalState(user, approvalState)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        user.name,
        user.email,
        user.phone_number,
        user.role,
        user?.showroom?.name,
        user?.showroom?.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  },

  counts(users = []) {
    return {
      total: users.length,
      sellers: users.filter((user) => user.role === "seller").length,
      pendingApproval: users.filter((user) => matchesApprovalState(user, "pending_approval")).length,
      pendingAccount: users.filter((user) => matchesApprovalState(user, "pending_account")).length,
    };
  },

  approvalMeta(user = null) {
    if (matchesApprovalState(user, "pending_account")) {
      return APPROVAL_META.pending_account;
    }

    if (matchesApprovalState(user, "approved")) {
      return APPROVAL_META.approved;
    }

    return APPROVAL_META.pending_approval;
  },

  isApprovable(user = null) {
    return matchesApprovalState(user, "pending_approval") || matchesApprovalState(user, "pending_account");
  },

  resolveSelectedUser({ detail = null, users = [], userId = "" } = {}) {
    const targetId = Number(userId);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return null;
    }

    if (detail && Number(detail.id) === targetId) {
      return detail;
    }

    return users.find((user) => Number(user.id) === targetId) ?? null;
  },
};

function matchesApprovalState(user = null, approvalState = "") {
  if (!user) {
    return false;
  }

  if (approvalState === "pending_approval") {
    return Boolean(!user.is_approved);
  }

  if (approvalState === "pending_account") {
    return String(user.account_status ?? "") === "pending";
  }

  if (approvalState === "approved") {
    return Boolean(user.is_approved);
  }

  return true;
}
