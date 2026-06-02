import { getListingStatusMeta, getTransactionStatusMeta } from "../../../utils/transactionStatus.js";

export const adminDashboardService = {
  summarize({ users = [], usersMeta = {}, pendingUsers = [], transactions = [], transactionsMeta = {}, cars = [], carsMeta = {} } = {}) {
    const recentUsers = users.filter((user) => isWithinDays(user.created_at, 7)).length;
    const attentionTransactions = transactions.filter((transaction) =>
      ["pending_payment", "expired", "cancelled"].includes(transaction.transaction_status)
    ).length;
    const publishedCars = cars.filter((car) => car.listing_status === "published").length;

    return {
      totalUsers: Number(usersMeta.total ?? users.length),
      recentUsers,
      pendingApprovals: pendingUsers.length,
      totalTransactions: Number(transactionsMeta.total ?? transactions.length),
      attentionTransactions,
      totalCars: Number(carsMeta.total ?? cars.length),
      publishedCars,
    };
  },

  transactionStatusMeta(status) {
    return getTransactionStatusMeta(status);
  },

  carStatusMeta(status) {
    return getListingStatusMeta(status);
  },

  quickActions({ onUsers, onPending, onTransactions, onSettlements, onActAs } = {}) {
    return [
      {
        title: "Users",
        description: "Buka user management dan pilih konteks user yang ingin dipantau.",
        actionLabel: "Kelola user",
        onClick: onUsers,
      },
      {
        title: "Pending approvals",
        description: "Lihat seller yang masih menunggu approval admin.",
        actionLabel: "Lihat approval",
        onClick: onPending,
      },
      {
        title: "Transactions",
        description: "Pantau transaksi terbaru dan status yang perlu perhatian.",
        actionLabel: "Lihat transaksi",
        onClick: onTransactions,
      },
      {
        title: "Settlements",
        description: "Pantau batch settlement affiliate dan finalisasi manual yang relevan untuk UAT.",
        actionLabel: "Lihat settlement",
        onClick: onSettlements,
      },
      {
        title: "Impersonation",
        description: "Masuk ke konteks buyer atau seller dari user management.",
        actionLabel: "Masuk act-as",
        onClick: onActAs,
      },
    ];
  },
};

function isWithinDays(value, days) {
  if (!value) {
    return false;
  }

  const date = new Date(value).getTime();
  if (Number.isNaN(date)) {
    return false;
  }

  return Date.now() - date <= days * 24 * 60 * 60 * 1000;
}
