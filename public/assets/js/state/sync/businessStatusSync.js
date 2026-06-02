import { appStore } from "../store.js";
import {
  markPreloadSnapshotsStale,
  writePreloadSnapshot,
} from "./sharedMutationSync.js";
import {
  derivedPaymentStatus,
  ledgerStatusForSettlementStatus,
  listingStatusForTransaction,
  normalizeStatus,
} from "../../utils/transactionStatus.js";

const TRANSACTION_COLLECTIONS = {
  buyer: {
    workingPath: "working.buyerTransactions.transactions",
    snapshotRole: "buyer",
    snapshotKey: "transactions",
    collectionKey: "transactions",
    ttl: 90,
    version: "buyer-transactions-v1",
  },
  seller: {
    workingPath: "working.sellerTransactions.transactions",
    snapshotRole: "seller",
    snapshotKey: "transactions",
    collectionKey: "transactions",
    ttl: 90,
    version: "seller-transactions-v1",
  },
  admin: {
    workingPath: "working.adminTransactions.transactions",
    snapshotRole: "admin",
    snapshotKey: "transactions",
    collectionKey: "transactions",
    ttl: 90,
    version: "admin-transactions-v1",
  },
};

const CAR_COLLECTIONS = {
  seller: {
    workingPath: "working.sellerCars.cars",
    snapshotRole: "seller",
    snapshotKey: "cars",
    collectionKey: "cars",
    ttl: 120,
    version: "seller-cars-v1",
  },
  admin: {
    workingPath: "working.adminCars.cars",
    snapshotRole: "admin",
    snapshotKey: "cars",
    collectionKey: "cars",
    ttl: 90,
    version: "admin-cars-v1",
  },
  buyerCatalog: {
    workingPath: "working.buyerCatalog.catalog",
    snapshotRole: "buyer",
    snapshotKey: "catalog",
    collectionKey: "cars",
    ttl: 180,
    version: "cars-public-v1",
  },
  publicCatalog: {
    workingPath: "working.publicCatalog.catalog",
    snapshotRole: "public",
    snapshotKey: "catalog",
    collectionKey: "cars",
    ttl: 180,
    version: "public-cars-v1",
  },
};

const SETTLEMENT_COLLECTIONS = {
  admin: {
    workingPath: "working.adminSettlements.settlements",
    snapshotRole: "admin",
    snapshotKey: "settlements",
    collectionKey: "settlements",
    ttl: 90,
    version: "admin-settlements-v1",
  },
  affiliate: {
    workingPath: "working.affiliateSettlements.settlements",
    snapshotRole: "affiliate_admin",
    snapshotKey: "settlementActivity",
    collectionKey: "settlements",
    ttl: 120,
    version: "affiliate-settlement-activity-v1",
  },
};

export function syncBusinessTransaction(transaction, {
  primaryRole = "",
  source = "business-sync:transaction",
} = {}) {
  if (!transaction?.id) {
    return null;
  }

  const previous = findTransaction(transaction.id);
  const normalizedTransaction = normalizeTransaction(transaction);

  Object.entries(TRANSACTION_COLLECTIONS).forEach(([role, config]) => {
    patchCollection(config, normalizedTransaction, {
      insert: role === primaryRole,
      source: `${source}:${role}`,
    });
  });

  syncListingForTransaction(normalizedTransaction, previous, { source });
  syncAffiliateFinanceForTransaction(normalizedTransaction, previous, { source });

  markRelatedTransactionSnapshots(primaryRole, source);
  return normalizedTransaction;
}

export function syncBusinessListing(car, {
  source = "business-sync:listing",
  primaryRole = "seller",
} = {}) {
  if (!car?.id) {
    return null;
  }

  Object.entries(CAR_COLLECTIONS).forEach(([role, config]) => {
    const isCatalog = ["buyerCatalog", "publicCatalog"].includes(role);
    if (isCatalog && normalizeStatus(car.listing_status) !== "published") {
      removeCollectionItem(config, car.id, {
        source: `${source}:${role}:remove-unavailable`,
      });
      return;
    }

    patchCollection(config, car, {
      insert: role === primaryRole,
      source: `${source}:${role}`,
    });
  });

  markPreloadSnapshotsStale([
    { role: "public", key: "catalog" },
    { role: "buyer", key: "catalog" },
    { role: "admin", key: "cars" },
  ], { source: `${source}:related-catalog-stale` });

  return car;
}

export function syncBusinessSettlement(settlement, {
  source = "business-sync:settlement",
  primaryRole = "admin",
} = {}) {
  if (!settlement?.id) {
    return null;
  }

  Object.entries(SETTLEMENT_COLLECTIONS).forEach(([role, config]) => {
    patchCollection(config, settlement, {
      insert: role === primaryRole,
      source: `${source}:${role}`,
    });
  });

  syncSettlementLedgerLifecycle(settlement, { source });
  markPreloadSnapshotsStale([
    { role: "affiliate_admin", key: "ledgerActivity" },
    { role: "affiliate_admin", key: "settlementActivity" },
    { role: "admin", key: "affiliateLedgers" },
    { role: "admin", key: "settlements" },
  ], { source: `${source}:affiliate-finance-stale` });

  return settlement;
}

function normalizeTransaction(transaction) {
  const paymentStatus = derivedPaymentStatus(transaction);
  return {
    ...transaction,
    derived_payment_status: paymentStatus,
  };
}

function syncListingForTransaction(transaction, previousTransaction, { source }) {
  const nextListingStatus = listingStatusForTransaction(transaction, previousTransaction);
  const carId = transaction?.car?.id ?? transaction?.car_id;

  if (!carId || !nextListingStatus) {
    return;
  }

  const carPatch = {
    ...(transaction.car ?? {}),
    id: carId,
    listing_status: nextListingStatus,
  };

  syncBusinessListing(carPatch, {
    primaryRole: "",
    source: `${source}:listing-${nextListingStatus}`,
  });
}

function syncAffiliateFinanceForTransaction(transaction, previousTransaction, { source }) {
  const status = normalizeStatus(transaction?.transaction_status ?? transaction?.status);
  const previousStatus = normalizeStatus(previousTransaction?.transaction_status ?? previousTransaction?.status);

  if (status === "paid" && previousStatus !== "paid") {
    markPreloadSnapshotsStale([
      { role: "affiliate_admin", key: "ledgerActivity" },
      { role: "affiliate_admin", key: "settlementActivity" },
      { role: "admin", key: "settlements" },
    ], { source: `${source}:affiliate-accrual-stale` });
    return;
  }

  if (["cancelled", "refunded"].includes(status) && ["paid", "completed"].includes(previousStatus)) {
    markPreloadSnapshotsStale([
      { role: "affiliate_admin", key: "ledgerActivity" },
      { role: "affiliate_admin", key: "settlementActivity" },
      { role: "admin", key: "settlements" },
    ], { source: `${source}:affiliate-void-risk-stale` });
  }
}

function syncSettlementLedgerLifecycle(settlement, { source }) {
  const nextLedgerStatus = ledgerStatusForSettlementStatus(settlement?.status);
  const ledgerIds = extractSettlementLedgerIds(settlement);

  if (!nextLedgerStatus || !ledgerIds.length) {
    return;
  }

  patchLedgerCollections(ledgerIds, {
    ledger_status: nextLedgerStatus,
    settlement_batch_id: nextLedgerStatus === "accrued" ? null : settlement.id,
  }, { source: `${source}:ledger-${nextLedgerStatus}` });
}

function patchLedgerCollections(ledgerIds, patch, { source }) {
  const targets = [
    { path: "working.affiliateLedger.ledgers", role: "affiliate_admin", key: "ledgerActivity", collectionKey: "ledgers", ttl: 120, version: "affiliate-ledger-activity-v1" },
    { path: "working.affiliateSettlements.settlements", role: "affiliate_admin", key: "settlementActivity", collectionKey: "eligible_ledgers", ttl: 120, version: "affiliate-settlement-activity-v1" },
    { path: "working.adminAffiliateCommissions.ledgers", role: "admin", key: "affiliateLedgers", collectionKey: "ledgers", ttl: 90, version: "admin-affiliate-ledgers-v1" },
  ];

  targets.forEach((target) => {
    const workingNode = appStore.get(target.path, null);
    if (workingNode?.data) {
      const nextData = patchItemsByIds(workingNode.data, ledgerIds, patch, target.collectionKey);
      appStore.patchState(target.path, {
        data: nextData,
        hydratedAt: Date.now(),
      }, `${source}:working`);
    }

    const snapshotPath = `snapshot.${target.role}.${target.key}`;
    const snapshotNode = appStore.get(snapshotPath, null);
    if (snapshotNode?.data) {
      const nextData = patchItemsByIds(snapshotNode.data, ledgerIds, patch, target.collectionKey);
      writePreloadSnapshot(target.role, target.key, nextData, {
        ttl: snapshotNode.ttl ?? target.ttl,
        version: snapshotNode.version ?? target.version,
        source: `${source}:snapshot`,
      });
    }
  });
}

function patchCollection(config, item, { insert = false, source }) {
  patchWorkingCollection(config, item, { insert, source });
  patchSnapshotCollection(config, item, { insert, source });
}

function removeCollectionItem(config, itemId, { source }) {
  removeFromWorkingCollection(config, itemId, { source });
  removeFromSnapshotCollection(config, itemId, { source });
}

function removeFromWorkingCollection(config, itemId, { source }) {
  const node = appStore.get(config.workingPath, null);
  const data = node?.data ?? null;
  if (!data) {
    return;
  }

  const nextData = removeItemFromPayload(data, itemId, config.collectionKey);
  if (nextData === data) {
    return;
  }

  appStore.patchState(config.workingPath, {
    data: nextData,
    hydratedAt: Date.now(),
  }, `${source}:working`);
}

function removeFromSnapshotCollection(config, itemId, { source }) {
  const snapshotPath = `snapshot.${config.snapshotRole}.${config.snapshotKey}`;
  const node = appStore.get(snapshotPath, null);
  const data = node?.data ?? null;
  if (!data) {
    return;
  }

  const nextData = removeItemFromPayload(data, itemId, config.collectionKey);
  if (nextData === data) {
    return;
  }

  writePreloadSnapshot(config.snapshotRole, config.snapshotKey, nextData, {
    ttl: node?.ttl ?? config.ttl,
    version: node?.version ?? config.version,
    source: `${source}:snapshot`,
  });
}

function patchWorkingCollection(config, item, { insert = false, source }) {
  const node = appStore.get(config.workingPath, null);
  const data = node?.data ?? null;
  if (!data && !insert) {
    return;
  }

  const nextData = patchItemInPayload(data ?? defaultPayload(config.collectionKey), item, {
    collectionKey: config.collectionKey,
    insert,
  });

  if (nextData === data) {
    return;
  }

  appStore.patchState(config.workingPath, {
    data: nextData,
    hydratedAt: Date.now(),
  }, `${source}:working`);
}

function patchSnapshotCollection(config, item, { insert = false, source }) {
  const snapshotPath = `snapshot.${config.snapshotRole}.${config.snapshotKey}`;
  const node = appStore.get(snapshotPath, null);
  const data = node?.data ?? null;
  if (!data && !insert) {
    return;
  }

  const nextData = patchItemInPayload(data ?? defaultPayload(config.collectionKey), item, {
    collectionKey: config.collectionKey,
    insert,
  });

  if (nextData === data) {
    return;
  }

  writePreloadSnapshot(config.snapshotRole, config.snapshotKey, nextData, {
    ttl: node?.ttl ?? config.ttl,
    version: node?.version ?? config.version,
    source: `${source}:snapshot`,
  });
}

function patchItemInPayload(payload, item, { collectionKey, insert = false } = {}) {
  if (Array.isArray(payload)) {
    return patchItemInArray(payload, item, { insert });
  }

  const current = payload && typeof payload === "object" ? payload : defaultPayload(collectionKey);
  const collection = Array.isArray(current[collectionKey]) ? current[collectionKey] : [];
  const nextCollection = patchItemInArray(collection, item, { insert });

  if (nextCollection === collection) {
    return payload;
  }

  return {
    ...current,
    [collectionKey]: nextCollection,
  };
}

function patchItemInArray(items = [], item, { insert = false } = {}) {
  const itemId = item?.id;
  if (itemId === undefined || itemId === null) {
    return items;
  }

  const exists = items.some((entry) => sameId(entry?.id, itemId));
  if (!exists) {
    return insert ? [item, ...items] : items;
  }

  return items.map((entry) => (sameId(entry?.id, itemId) ? { ...entry, ...item } : entry));
}

function removeItemFromPayload(payload, itemId, collectionKey) {
  if (Array.isArray(payload)) {
    const nextItems = payload.filter((item) => !sameId(item?.id, itemId));
    return nextItems.length === payload.length ? payload : nextItems;
  }

  const current = payload && typeof payload === "object" ? payload : {};
  const collection = Array.isArray(current[collectionKey]) ? current[collectionKey] : [];
  const nextCollection = collection.filter((item) => !sameId(item?.id, itemId));

  if (nextCollection.length === collection.length) {
    return payload;
  }

  return {
    ...current,
    [collectionKey]: nextCollection,
  };
}

function patchItemsByIds(payload, ids, patch, collectionKey) {
  const idSet = new Set(ids.map((id) => String(id)));

  if (Array.isArray(payload)) {
    return payload.map((item) => (idSet.has(String(item?.id)) ? { ...item, ...patch } : item));
  }

  const current = payload && typeof payload === "object" ? payload : {};
  const collection = Array.isArray(current[collectionKey]) ? current[collectionKey] : [];
  return {
    ...current,
    [collectionKey]: collection.map((item) => (idSet.has(String(item?.id)) ? { ...item, ...patch } : item)),
  };
}

function findTransaction(transactionId) {
  const roles = Object.values(TRANSACTION_COLLECTIONS);
  for (const config of roles) {
    const working = findItem(appStore.get(`${config.workingPath}.data`, null), transactionId, config.collectionKey);
    if (working) {
      return working;
    }

    const snapshot = findItem(appStore.get(`snapshot.${config.snapshotRole}.${config.snapshotKey}.data`, null), transactionId, config.collectionKey);
    if (snapshot) {
      return snapshot;
    }
  }

  const activePaymentTransaction = appStore.get("working.buyerPaymentStatus.transaction.data", null);
  return sameId(activePaymentTransaction?.id, transactionId) ? activePaymentTransaction : null;
}

function findItem(payload, id, collectionKey) {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.[collectionKey]) ? payload[collectionKey] : [];
  return items.find((item) => sameId(item?.id, id)) ?? null;
}

function extractSettlementLedgerIds(settlement) {
  const sources = [
    settlement?.ledger_ids,
    settlement?.ledgerIds,
    settlement?.ledgers,
    settlement?.items,
  ];

  return sources
    .flatMap((source) => Array.isArray(source) ? source : [])
    .map((entry) => typeof entry === "object" ? entry.id ?? entry.ledger_id : entry)
    .filter((id) => id !== undefined && id !== null);
}

function markRelatedTransactionSnapshots(primaryRole, source) {
  markPreloadSnapshotsStale(
    Object.keys(TRANSACTION_COLLECTIONS)
      .filter((role) => role !== primaryRole)
      .map((role) => ({ role, key: "transactions" })),
    { source: `${source}:related-transactions-stale` }
  );
}

function defaultPayload(collectionKey) {
  return collectionKey ? { [collectionKey]: [] } : [];
}

function sameId(left, right) {
  return String(left ?? "") === String(right ?? "");
}
