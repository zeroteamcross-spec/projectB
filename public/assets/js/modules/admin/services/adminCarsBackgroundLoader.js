import { carsResource } from "../../../resources/carsResource.js";
import { appStore } from "../../../state/store.js";

const WORKING_PATH = "working.adminCars.cars";
const SNAPSHOT_PATH = "snapshot.admin.cars";
const VERSION = "admin-cars-v1";
const TTL = 90;
const DEFAULT_BATCH_LIMIT = 100;
const FRESH_COMPLETION_MS = 90 * 1000;

const state = {
  promise: null,
  startedAt: 0,
  completedAt: 0,
  total: 0,
  error: null,
};

export const adminCarsBackgroundLoader = {
  ensure(options = {}) {
    if (state.promise) {
      return state.promise;
    }

    const currentNode = snapshotNode();
    const current = currentNode?.data ?? snapshotPayload();
    const cars = normalizeCars(current);
    const total = Number(current?.meta?.total ?? state.total ?? 0);
    const complete = total > 0 && cars.length >= total;
    const recentlyCompleted = state.completedAt && Date.now() - state.completedAt < FRESH_COMPLETION_MS;

    if (complete && recentlyCompleted && currentNode?.stale !== true) {
      return Promise.resolve(current);
    }

    state.startedAt = Date.now();
    state.error = null;
    state.promise = run(options)
      .catch((error) => {
        state.error = error;
        throw error;
      })
      .finally(() => {
        state.promise = null;
      });

    return state.promise;
  },

  status() {
    return {
      running: Boolean(state.promise),
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      total: state.total,
      error: state.error,
    };
  },
};

async function run({ batchLimit = DEFAULT_BATCH_LIMIT } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(batchLimit) || DEFAULT_BATCH_LIMIT, 500));
  let payload = snapshotPayload();
  let mergedCars = normalizeCars(payload);
  let total = Number(payload?.meta?.total ?? 0);
  let page = 1;

  while (!total || mergedCars.length < total) {
    const response = await carsResource.adminList({ page, limit: safeLimit });
    const batch = Array.isArray(response?.cars) ? response.cars : [];
    total = Number(response?.meta?.total ?? total ?? 0);

    if (!batch.length) {
      break;
    }

    mergedCars = mergeCars(mergedCars, batch);
    payload = writeCarsPayload({
      cars: mergedCars,
      meta: {
        ...(payload?.meta ?? {}),
        ...(response?.meta ?? {}),
        page,
        limit: safeLimit,
        total,
        loaded: mergedCars.length,
        background_complete: total > 0 && mergedCars.length >= total,
      },
    });

    patchWorkingIfAdminCarsActive(payload);
    page += 1;
  }

  const finalPayload = {
    cars: mergedCars,
    meta: {
      ...(payload?.meta ?? {}),
      total,
      loaded: mergedCars.length,
      background_complete: true,
      completed_at: new Date().toISOString(),
    },
  };

  payload = writeCarsPayload(finalPayload);
  patchWorkingIfAdminCarsActive(payload);
  state.completedAt = Date.now();
  state.total = total || mergedCars.length;
  return payload;
}

function snapshotPayload() {
  return snapshotNode()?.data
    ?? appStore.get(`${WORKING_PATH}.data`, null)
    ?? { cars: [], meta: {} };
}

function snapshotNode() {
  return appStore.get(SNAPSHOT_PATH, null);
}

function writeCarsPayload(payload) {
  appStore.patchState(SNAPSHOT_PATH, {
    data: payload,
    fetchedAt: Date.now(),
    ttl: TTL,
    version: VERSION,
    stale: false,
    memoryOnly: true,
  }, "admin-cars:background-snapshot");
  return payload;
}

function patchWorkingIfAdminCarsActive(payload) {
  const routeName = appStore.get("app.currentRoute.name", "");
  if (routeName !== "admin.cars") {
    return;
  }

  appStore.patchState(WORKING_PATH, {
    data: payload,
    hydratedAt: Date.now(),
  }, "admin-cars:background-working");
}

function normalizeCars(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean);
  }
  if (Array.isArray(payload?.cars)) {
    return payload.cars.filter(Boolean);
  }
  if (Array.isArray(payload?.data?.cars)) {
    return payload.data.cars.filter(Boolean);
  }
  return [];
}

function mergeCars(current = [], incoming = []) {
  const byId = new Map();

  current.filter(Boolean).forEach((car) => {
    const id = car?.id;
    if (id === undefined || id === null) {
      return;
    }
    byId.set(String(id), car);
  });

  incoming.filter(Boolean).forEach((car) => {
    const id = car?.id;
    if (id === undefined || id === null) {
      return;
    }
    byId.set(String(id), { ...(byId.get(String(id)) ?? {}), ...car });
  });

  return Array.from(byId.values()).sort((left, right) => Number(right.id ?? 0) - Number(left.id ?? 0));
}
