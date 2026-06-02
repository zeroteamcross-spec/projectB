import { CacheManager } from "../../preload/cacheManager.js";
import { appStore } from "../store.js";

const PRELOAD_CACHE = new CacheManager({ namespace: "projectB:spa:v1" });

export function markPreloadSnapshotStale(role, key, { source = "shared-sync:mark-stale" } = {}) {
  const cacheKey = cacheKeyFor(role, key);
  const statePath = snapshotPath(role, key);
  const current = appStore.get(statePath, null);

  if (current && typeof current === "object") {
    appStore.patchState(statePath, {
      ...current,
      stale: true,
    }, source);
  }

  PRELOAD_CACHE.markStale(cacheKey);
}

export function markPreloadSnapshotsStale(items = [], options = {}) {
  items
    .filter((item) => item?.role && item?.key)
    .forEach((item) => markPreloadSnapshotStale(item.role, item.key, options));
}

export function writePreloadSnapshot(role, key, data, {
  ttl = 300,
  version = cacheKeyFor(role, key),
  source = "shared-sync:write-snapshot",
} = {}) {
  const payload = {
    data,
    fetchedAt: Date.now(),
    ttl,
    version,
    stale: false,
  };

  appStore.patchState(snapshotPath(role, key), payload, source);
  PRELOAD_CACHE.write(cacheKeyFor(role, key), data, { ttl, version });
  return payload;
}

export function upsertWorkingCollection(path, item, {
  collectionKey,
  matchKey = "id",
  source = "shared-sync:upsert-working",
} = {}) {
  if (!path || !item) {
    return null;
  }

  const currentNode = appStore.get(path, null);
  const current = currentNode?.data ?? currentNode ?? defaultPayload(collectionKey);
  const nextData = upsertItemInPayload(current, item, { collectionKey, matchKey });
  const nextNode = {
    data: nextData,
    hydratedAt: Date.now(),
  };

  appStore.patchState(path, nextNode, source);
  return nextNode;
}

export function upsertPreloadCollection(role, key, item, {
  collectionKey,
  matchKey = "id",
  ttl = 300,
  version = cacheKeyFor(role, key),
  source = "shared-sync:upsert-snapshot",
} = {}) {
  if (!role || !key || !item) {
    return null;
  }

  const statePath = snapshotPath(role, key);
  const currentNode = appStore.get(statePath, null);
  const cached = PRELOAD_CACHE.read(cacheKeyFor(role, key));
  const currentData = currentNode?.data ?? cached?.data ?? defaultPayload(collectionKey);
  const nextData = upsertItemInPayload(currentData, item, { collectionKey, matchKey });

  return writePreloadSnapshot(role, key, nextData, {
    ttl: currentNode?.ttl ?? cached?.ttl ?? ttl,
    version: currentNode?.version ?? cached?.version ?? version,
    source,
  });
}

export function upsertItemInPayload(payload, item, {
  collectionKey,
  matchKey = "id",
} = {}) {
  const key = collectionKey ?? inferCollectionKey(payload);
  if (Array.isArray(payload)) {
    return upsertItemInArray(payload, item, matchKey);
  }

  if (!key) {
    return item;
  }

  const current = payload && typeof payload === "object" ? payload : {};
  return {
    ...current,
    [key]: upsertItemInArray(Array.isArray(current[key]) ? current[key] : [], item, matchKey),
  };
}

export function invalidateCatalogSnapshots({ source = "shared-sync:catalog-stale" } = {}) {
  markPreloadSnapshotsStale([
    { role: "public", key: "catalog" },
    { role: "buyer", key: "catalog" },
    { role: "admin", key: "cars" },
  ], { source });
}

export function invalidateTransactionSnapshots({ source = "shared-sync:transactions-stale" } = {}) {
  markPreloadSnapshotsStale([
    { role: "buyer", key: "transactions" },
    { role: "seller", key: "transactions" },
    { role: "admin", key: "transactions" },
  ], { source });
}

export function invalidateAffiliateFinanceSnapshots({ source = "shared-sync:affiliate-finance-stale" } = {}) {
  markPreloadSnapshotsStale([
    { role: "admin", key: "settlements" },
    { role: "affiliate_admin", key: "ledgerActivity" },
    { role: "affiliate_admin", key: "settlementActivity" },
  ], { source });
}

function upsertItemInArray(items = [], item, matchKey = "id") {
  const itemKey = item?.[matchKey];
  if (itemKey === undefined || itemKey === null) {
    return [item, ...(items ?? [])];
  }

  const exists = (items ?? []).some((entry) => sameKey(entry?.[matchKey], itemKey));
  return exists
    ? items.map((entry) => (sameKey(entry?.[matchKey], itemKey) ? { ...entry, ...item } : entry))
    : [item, ...(items ?? [])];
}

function inferCollectionKey(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return ["cars", "transactions", "settlements", "ledgers", "items", "users"]
    .find((key) => Array.isArray(payload[key])) ?? null;
}

function defaultPayload(collectionKey) {
  return collectionKey ? { [collectionKey]: [] } : [];
}

function sameKey(left, right) {
  return String(left ?? "") === String(right ?? "");
}

function snapshotPath(role, key) {
  return `snapshot.${role}.${key}`;
}

function cacheKeyFor(role, key) {
  return `${role}.${key}`;
}
