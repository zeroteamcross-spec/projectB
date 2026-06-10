import { appStore } from "../../../state/store.js";
import { buyerTransactionService } from "./buyerTransactionService.js";

const PRELOAD_INTERVAL_MS = 500;

let queue = [];
let queuedIds = new Set();
let loadedIds = new Set();
let detailsById = new Map();
let inFlightById = new Map();
let timer = null;
let isLoading = false;

export const buyerTransactionDetailPreloadService = {
  enqueueTransactions(transactions = []) {
    const items = Array.isArray(transactions) ? transactions : [];

    items.forEach((transaction) => {
      const id = normalizeId(transaction?.id);

      if (!id || queuedIds.has(id) || loadedIds.has(id) || cachedDetail(id)) {
        return;
      }

      queuedIds.add(id);
      queue.push({ id });
    });

    scheduleNext();
  },

  async detailOrFetch(transactionId, options = {}) {
    const id = normalizeId(transactionId);
    const cached = cachedDetail(id);

    if (cached) {
      patchWorkingIfActive(id, cached);
      return cached;
    }

    const detail = await fetchDetailOnce(id, transactionId, options);
    rememberDetail(id, detail);
    patchWorkingIfActive(id, detail);
    return detail;
  },
};

function scheduleNext() {
  if (timer || isLoading || queue.length === 0) {
    return;
  }

  timer = window.setTimeout(() => {
    timer = null;
    void loadNext();
  }, PRELOAD_INTERVAL_MS);
}

async function loadNext() {
  if (isLoading || queue.length === 0) {
    scheduleNext();
    return;
  }

  const item = queue.shift();
  queuedIds.delete(item.id);

  if (loadedIds.has(item.id) || cachedDetail(item.id)) {
    scheduleNext();
    return;
  }

  isLoading = true;

  try {
    const detail = await fetchDetailOnce(item.id, item.id);
    rememberDetail(item.id, detail);
    patchWorkingIfActive(item.id, detail);
  } catch (error) {
    // Background preload must not interrupt the transactions list.
  } finally {
    isLoading = false;
    scheduleNext();
  }
}

function fetchDetailOnce(id, transactionId, options = {}) {
  if (inFlightById.has(id)) {
    return inFlightById.get(id);
  }

  const request = buyerTransactionService.detail(transactionId, options)
    .finally(() => {
      inFlightById.delete(id);
    });

  inFlightById.set(id, request);
  return request;
}

function rememberDetail(id, detail) {
  if (!id || !detail) {
    return;
  }

  loadedIds.add(id);
  detailsById.set(id, detail);
}

function cachedDetail(id) {
  if (!id) {
    return null;
  }

  return detailsById.get(id) ?? null;
}

function patchWorkingIfActive(id, detail) {
  if (!id || !detail) {
    return;
  }

  const route = appStore.get("app.currentRoute", null);
  const activeId = normalizeId(route?.params?.id);

  if (activeId !== id || route?.name !== "buyer.payment-status") {
    return;
  }

  appStore.patchState("working.buyerPaymentStatus.transaction", {
    data: detail,
    hydratedAt: Date.now(),
  }, "buyer-payment-status:preload-hit");
}

function normalizeId(value) {
  const id = String(value ?? "").trim();
  return id || "";
}
