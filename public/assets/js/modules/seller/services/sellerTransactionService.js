import { transactionsResource } from "../../../resources/transactionsResource.js";
import { apiClient } from "../../../core/apiClient.js";
import { authStore } from "../../../state/authStore.js";
import { getTransactionStatusMeta, isPaymentPaid } from "../../../utils/transactionStatus.js";

export const sellerTransactionService = {
  list(filters = {}, options = {}) {
    return transactionsResource.list(filters, options);
  },

  detail(transactionId, options = {}) {
    return transactionsResource.detail(transactionId, options);
  },

  async createOfflineBooking(payload, options = {}) {
    const response = await apiClient.post("/transactions/offline-bookings", payload, options);
    return response.data?.transaction ?? null;
  },

  async recordOfflinePayment(transactionId, payload, options = {}) {
    const response = await apiClient.post(`/transactions/${encodeURIComponent(transactionId)}/offline-payment`, payload, options);
    return response.data?.transaction ?? null;
  },

  canCreateOfflineBooking(car) {
    return isCurrentSellerOwner(car?.seller_user_id)
      && car?.listing_status === "published";
  },

  canRecordOfflinePayment(transaction) {
    const hasManualProof = transaction?.payment_method === "manual_transfer"
      && Boolean(transaction?.manual_transfer?.proof_path);
    return isCurrentSellerOwner(transaction?.seller_user_id)
      && transaction?.payment_type === "dp"
      && transaction?.transaction_status === "pending_payment"
      && !hasManualProof;
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

  confirmManualTransfer(transactionId, options = {}) {
    return transactionsResource.confirmManualTransfer(transactionId, options);
  },

  rejectManualTransfer(transactionId, reason, options = {}) {
    return transactionsResource.rejectManualTransfer(transactionId, reason, options);
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
        // "dp_paid" cuma berarti DP-nya lunas -- BUKAN harga mobil penuh.
        // Sisanya (remainingAmount) diselesaikan langsung dengan showroom,
        // di luar aplikasi (lihat teks instruksi pembayaran buyer), jadi
        // tetap "belum dibayar via aplikasi" sampai transaksi ditandai
        // selesai. paid/remaining di sini dulu keliru memakai carPrice/0,
        // seolah harga penuh sudah lunas begitu DP dikonfirmasi.
        return {
          total: carPrice,
          paid: dpAmount,
          remaining: remainingAmount,
          dueNow: 0,
          dueNowLabel: "Sisa ditagih langsung",
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

function isCurrentSellerOwner(sellerUserId) {
  const user = authStore.user();
  return authStore.isAuthenticated()
    && authStore.role() === "seller"
    && user?.role === "seller"
    && Number.isSafeInteger(Number(sellerUserId))
    && Number(sellerUserId) > 0
    && Number(user?.id) === Number(sellerUserId);
}

function isPaidStatus(status) {
  return ["dp_paid", "paid", "completed"].includes(String(status ?? ""));
}
