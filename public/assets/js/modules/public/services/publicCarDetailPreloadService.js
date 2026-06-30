import { appStore } from "../../../state/store.js";
import { publicCatalogService } from "./publicCatalogService.js";

const PRELOAD_INTERVAL_MS = 500;

let queue = [];
let queuedIds = new Set();
let loadedIds = new Set();
let detailsById = new Map();
let inFlightById = new Map();
let timer = null;
let isLoading = false;

export const publicCarDetailPreloadService = {
  enqueueCars(cars = [], options = {}) {
    const affiliateSlug = String(options.affiliateSlug ?? "").trim();
    const items = Array.isArray(cars) ? cars : [];

    items.forEach((car) => {
      const id = normalizeId(car?.id);

      if (!id || queuedIds.has(id) || loadedIds.has(id) || cachedDetail(id)) {
        return;
      }

      queuedIds.add(id);
      queue.push({ id, affiliateSlug });
    });

    scheduleNext();
  },

  async detailOrFetch(carId, options = {}) {
    const id = normalizeId(carId);
    const cached = cachedDetail(id);

    if (cached) {
      patchWorkingIfActive(id, cached);
      return cached;
    }

    const detail = await fetchDetailOnce(id, carId, options);
    loadedIds.add(id);
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
    if (item.affiliateSlug && !isCurrentAffiliateRoute(item.affiliateSlug)) {
      return;
    }

    const detail = await fetchDetailOnce(item.id, item.id, {
      affiliateSlug: item.affiliateSlug,
    });
    loadedIds.add(item.id);
    rememberDetail(item.id, detail);
    patchWorkingIfActive(item.id, detail);
  } catch (error) {
    // Background preload must not interrupt catalog interaction.
  } finally {
    isLoading = false;
    scheduleNext();
  }
}

function fetchDetailOnce(id, carId, options = {}) {
  if (inFlightById.has(id)) {
    return inFlightById.get(id);
  }

  const request = publicCatalogService.detail(carId, options)
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
  const routeName = String(route?.name ?? "");

  if (activeId !== id || !routeName.includes("car-detail")) {
    return;
  }

  appStore.patchState("working.publicCarDetail.detail", {
    data: detail,
    hydratedAt: Date.now(),
  }, "public:car-detail-preload-hit");
}

function normalizeId(value) {
  const id = String(value ?? "").trim();
  return id || "";
}

function isCurrentAffiliateRoute(slug) {
  const route = appStore.get("app.currentRoute", null);
  const path = String(route?.path ?? "");
  const normalizedSlug = String(slug ?? "").trim().toLowerCase();

  if (!normalizedSlug) {
    return true;
  }

  return path.startsWith(`/af/${normalizedSlug}`) || path.startsWith(`/a/${normalizedSlug}`);
}
