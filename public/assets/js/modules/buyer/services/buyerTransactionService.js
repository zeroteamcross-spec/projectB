import { transactionsResource } from "../../../resources/transactionsResource.js";

export const buyerTransactionService = {
  list(filters = {}, options = {}) {
    return transactionsResource.list(filters, options);
  },

  detail(transactionId, options = {}) {
    return transactionsResource.detail(transactionId, options);
  },

  status(transactionId, options = {}) {
    return transactionsResource.status(transactionId, options);
  },

  syncPaymentStatus(transactionId, options = {}) {
    return transactionsResource.syncPaymentStatus(transactionId, options);
  },

  updateStatus(transactionId, payload = {}, options = {}) {
    return transactionsResource.updateStatus(transactionId, payload, options);
  },

  completePayment(transactionId, payload = {}, options = {}) {
    return transactionsResource.completePayment(transactionId, payload, options);
  },

  cancel(transactionId, payload = {}, options = {}) {
    return transactionsResource.cancel(transactionId, payload, options);
  },

  downloadPaymentQr(transactionId, options = {}) {
    return transactionsResource.downloadPaymentQr(transactionId, options);
  },

  submitManualTransferProof(transactionId, file, note = "", options = {}) {
    return transactionsResource.submitManualTransferProof(transactionId, file, note, options);
  },
};
