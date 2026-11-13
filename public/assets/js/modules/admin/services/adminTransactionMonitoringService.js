import { transactionsResource } from "../../../resources/transactionsResource.js";
import { getTransactionStatusMeta } from "../../../utils/transactionStatus.js";

export const adminTransactionMonitoringService = {
  list(filters = {}, options = {}) {
    return transactionsResource.list(filters, options);
  },

  async listAll(filters = {}, options = {}) {
    const limit = 100;
    const transactions = [];
    let total = Infinity;
    let page = 1;

    while (transactions.length < total) {
      const response = await transactionsResource.list({ ...filters, page, limit }, options);
      const batch = Array.isArray(response?.transactions) ? response.transactions : [];
      transactions.push(...batch);
      total = Number(response?.meta?.total ?? transactions.length);
      if (!batch.length) {
        break;
      }
      page += 1;
    }

    return {
      transactions,
      meta: { page: 1, limit, total: Number.isFinite(total) ? total : transactions.length },
    };
  },

  detail(transactionId, options = {}) {
    return transactionsResource.detail(transactionId, options);
  },

  filterTransactions(transactions = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();
    const status = String(filters.status ?? "").trim().toLowerCase();
    const paymentType = String(filters.paymentType ?? "").trim().toLowerCase();
    const showroomId = String(filters.showroomId ?? "");

    return transactions.filter((transaction) => {
      if (showroomId && String(transaction.showroom_id ?? transaction?.showroom?.id ?? "") !== showroomId) {
        return false;
      }

      if (status && String(transaction.transaction_status ?? "").toLowerCase() !== status) {
        return false;
      }

      if (paymentType && String(transaction.payment_type ?? "").toLowerCase() !== paymentType) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        transaction.transaction_code,
        transaction?.buyer?.name,
        transaction?.buyer?.email,
        transaction?.seller?.name,
        transaction?.seller?.email,
        transaction?.car?.brand_name,
        transaction?.car?.model_name,
        transaction?.showroom?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  },

  statusMeta(status) {
    return getTransactionStatusMeta(status);
  },

  paymentTypeLabel(paymentType) {
    return paymentType === "dp" ? "DP" : "Full";
  },

  financials(transaction = null) {
    const total = Number(transaction?.car_price ?? 0);
    const dpAmount = Number(transaction?.dp_amount ?? 0);
    const computedRemaining = transaction?.payment_type === "dp"
      ? Math.max(0, total - dpAmount)
      : 0;
    const remaining = Number(transaction?.remaining_amount ?? computedRemaining);
    const status = transaction?.transaction_status ?? "pending_payment";

    if (transaction?.payment_type === "dp") {
      if (["dp_paid", "paid", "completed"].includes(status)) {
        // "dp_paid" cuma berarti DP-nya lunas -- BUKAN harga mobil penuh.
        // Sisanya diselesaikan langsung dengan showroom, di luar aplikasi.
        // Dulu paid/remaining keliru memakai total/0, seolah harga penuh
        // sudah lunas begitu DP dikonfirmasi (lihat sellerTransactionService.js
        // untuk bug yang sama, ditambal bersamaan).
        return {
          total,
          paid: dpAmount,
          remaining,
          dueNow: 0,
          dueNowLabel: "Sisa ditagih langsung",
        };
      }

      return {
        total,
        paid: 0,
        remaining,
        dueNow: dpAmount,
        dueNowLabel: "DP menunggu",
      };
    }

    return {
      total,
      paid: ["paid", "completed"].includes(status) ? total : 0,
      remaining: ["paid", "completed"].includes(status) ? 0 : total,
      dueNow: ["paid", "completed"].includes(status) ? 0 : total,
      dueNowLabel: ["paid", "completed"].includes(status) ? "Sudah dibayar" : "Menunggu dibayar",
    };
  },

  summarize(transactions = []) {
    return {
      total: transactions.length,
      pending: transactions.filter((transaction) => transaction.transaction_status === "pending_payment").length,
      dpPaid: transactions.filter((transaction) => transaction.transaction_status === "dp_paid").length,
      paid: transactions.filter((transaction) => ["dp_paid", "paid", "completed"].includes(transaction.transaction_status)).length,
      attention: transactions.filter((transaction) => ["expired", "cancelled"].includes(transaction.transaction_status)).length,
    };
  },

  resolveSelectedTransaction({ detail = null, transactions = [], transactionId = "" } = {}) {
    const targetId = Number(transactionId);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return null;
    }

    if (detail && Number(detail.id) === targetId) {
      return detail;
    }

    return transactions.find((transaction) => Number(transaction.id) === targetId) ?? null;
  },
};
