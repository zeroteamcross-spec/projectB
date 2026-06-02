import { transactionsResource } from "../../../resources/transactionsResource.js";
import { getTransactionStatusMeta } from "../../../utils/transactionStatus.js";

export const adminTransactionMonitoringService = {
  list(filters = {}, options = {}) {
    return transactionsResource.list(filters, options);
  },

  detail(transactionId, options = {}) {
    return transactionsResource.detail(transactionId, options);
  },

  filterTransactions(transactions = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();
    const status = String(filters.status ?? "").trim().toLowerCase();
    const paymentType = String(filters.paymentType ?? "").trim().toLowerCase();

    return transactions.filter((transaction) => {
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
      if (["paid", "completed"].includes(status)) {
        return {
          total,
          paid: total,
          remaining: 0,
          dueNow: 0,
          dueNowLabel: "Sudah dibayar",
        };
      }

      if (status === "dp_paid") {
        return {
          total,
          paid: dpAmount,
          remaining,
          dueNow: remaining,
          dueNowLabel: "Sisa pelunasan",
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
      paid: transactions.filter((transaction) => ["paid", "completed"].includes(transaction.transaction_status)).length,
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
