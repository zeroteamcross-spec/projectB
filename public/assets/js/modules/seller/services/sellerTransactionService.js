import { transactionsResource } from "../../../resources/transactionsResource.js";
import { getTransactionStatusMeta, isPaymentPaid } from "../../../utils/transactionStatus.js";

export const sellerTransactionService = {
  list(filters = {}, options = {}) {
    return transactionsResource.list(filters, options);
  },

  detail(transactionId, options = {}) {
    return transactionsResource.detail(transactionId, options);
  },

  updateStatus(transactionId, payload = {}, options = {}) {
    return transactionsResource.updateStatus(transactionId, payload, options);
  },

  updateFulfillmentChecklist(transactionId, payload = {}, options = {}) {
    return transactionsResource.updateFulfillmentChecklist(transactionId, payload, options);
  },

  cancel(transactionId, payload = {}, options = {}) {
    return transactionsResource.cancel(transactionId, payload, options);
  },

  returnTransaction(transactionId, payload = {}, options = {}) {
    return transactionsResource.returnTransaction(transactionId, payload, options);
  },

  summarize(transactions = []) {
    return {
      total: transactions.length,
      pending: transactions.filter((transaction) => transaction.transaction_status === "pending_payment").length,
      dpPaid: transactions.filter((transaction) => transaction.transaction_status === "dp_paid").length,
      paid: transactions.filter((transaction) => isPaymentPaid(transaction)).length,
      attention: transactions.filter((transaction) => ["expired", "cancelled"].includes(transaction.transaction_status)).length,
    };
  },

  statusMeta(status) {
    return getTransactionStatusMeta(status);
  },

  paymentTypeLabel(paymentType) {
    return paymentType === "dp" ? "DP" : "Full";
  },

  findInSnapshot(snapshot = { transactions: [] }, transactionId) {
    const targetId = Number(transactionId);
    const transactions = snapshot?.transactions ?? [];
    return transactions.find((transaction) => Number(transaction.id) === targetId) ?? null;
  },

  financials(transaction = null) {
    const carPrice = Number(transaction?.car_price ?? 0);
    const dpAmount = Number(transaction?.dp_amount ?? 0);
    const computedRemaining = transaction?.payment_type === "dp"
      ? Math.max(0, carPrice - dpAmount)
      : 0;
    const remainingAmount = Number(transaction?.remaining_amount ?? computedRemaining);
    const status = transaction?.transaction_status ?? "pending_payment";

    if (transaction?.payment_type === "dp") {
      if (isPaidStatus(status)) {
        return {
          total: carPrice,
          paid: carPrice,
          remaining: 0,
          dueNow: 0,
          dueNowLabel: "Sudah dibayar",
        };
      }

      if (status === "dp_paid") {
        // Booking Fee menutup kewajiban pembayaran di aplikasi. Sisa harga
        // diselesaikan langsung buyer-showroom di luar sistem dan tidak
        // ditagih atau dilacak di sini, jadi dueNow tetap 0.
        return {
          total: carPrice,
          paid: dpAmount,
          remaining: remainingAmount,
          dueNow: 0,
          dueNowLabel: "Sisa diselesaikan langsung dengan buyer",
        };
      }

      return {
        total: carPrice,
        paid: 0,
        remaining: remainingAmount,
        dueNow: dpAmount,
        dueNowLabel: "DP menunggu",
      };
    }

    return {
      total: carPrice,
      paid: isPaidStatus(status) ? carPrice : 0,
      remaining: isPaidStatus(status) ? 0 : carPrice,
      dueNow: isPaidStatus(status) ? 0 : carPrice,
      dueNowLabel: isPaidStatus(status) ? "Sudah dibayar" : "Menunggu dibayar",
    };
  },
};

function isPaidStatus(status) {
  return ["paid", "completed"].includes(String(status ?? ""));
}
