import { appStore } from "../../../state/store.js";
import { notificationsResource } from "../../../resources/notificationsResource.js";
import { notificationState } from "../state/notificationState.js";

const DEFAULT_SNAPSHOT_TTL_MS = 45000;
const DEFAULT_POLL_INTERVAL_MS = 45000;

let snapshotInFlight = null;
let snapshotAuthKey = "";
let pollingTimer = null;
let pollingStore = appStore;
let pollingIntervalMs = DEFAULT_POLL_INTERVAL_MS;
let pollingEnabled = false;

export const notificationService = {
  setSnapshot(payload = {}) {
    return notificationState.setSnapshot(payload);
  },

  async loadSnapshot(params = {}, options = {}) {
    const { store = appStore, ...requestOptions } = options;
    notificationState.setLoading(true);
    try {
      const payload = await notificationsResource.snapshot(params, requestOptions);
      snapshotAuthKey = authKey(store.get?.("auth", null));
      return notificationState.setSnapshot(payload);
    } catch (error) {
      notificationState.setError(error);
      throw error;
    }
  },

  async ensureSnapshot({ force = false, ttlMs = DEFAULT_SNAPSHOT_TTL_MS, store = appStore } = {}) {
    const auth = store?.get?.("auth", null) ?? appStore.get("auth", null);

    if (!isAuthenticatedNotificationUser(auth)) {
      return notificationState.snapshot();
    }

    const nextAuthKey = authKey(auth);
    const state = notificationState.get();
    const lastSyncedAt = Number(state.lastSyncedAt ?? 0);
    const isFresh = Boolean(state.isHydrated)
      && snapshotAuthKey === nextAuthKey
      && lastSyncedAt > 0
      && Date.now() - lastSyncedAt < ttlMs;

    if (!force && isFresh) {
      return notificationState.snapshot();
    }

    if (snapshotInFlight && snapshotAuthKey === nextAuthKey) {
      return snapshotInFlight;
    }

    snapshotAuthKey = nextAuthKey;
    snapshotInFlight = this.loadSnapshot({}, { store })
      .catch((error) => {
        notificationState.setError(error);
        return notificationState.snapshot();
      })
      .finally(() => {
        snapshotInFlight = null;
      });

    return snapshotInFlight;
  },

  hydrate(payload = {}, options = {}) {
    return notificationState.hydrate(payload, options);
  },

  async loadList(params = {}, options = {}) {
    return notificationState.loadList(params, options);
  },

  async markRead(id, options = {}) {
    return notificationState.markRead(id, options);
  },

  async markAllRead(options = {}) {
    return notificationState.markAllRead(options);
  },

  pushNotification(item) {
    return notificationState.pushNotification(item);
  },

  reset() {
    notificationState.reset();
  },

  snapshot() {
    return notificationState.snapshot();
  },

  working() {
    return notificationState.working();
  },

  subscribe(listener) {
    return notificationState.subscribe(listener);
  },

  startPolling({ intervalMs = DEFAULT_POLL_INTERVAL_MS, store = appStore, immediate = false } = {}) {
    pollingStore = store ?? appStore;
    pollingIntervalMs = normalizeInterval(intervalMs);
    pollingEnabled = true;

    if (!canPoll(pollingStore) || isDocumentHidden()) {
      this.stopPolling({ keepEnabled: true });
      return false;
    }

    if (pollingTimer !== null) {
      return true;
    }

    pollingTimer = window.setInterval(() => {
      this.pollSnapshot({ store: pollingStore });
    }, pollingIntervalMs);

    if (immediate) {
      this.pollSnapshot({ store: pollingStore });
    }

    return true;
  },

  stopPolling({ keepEnabled = false } = {}) {
    if (pollingTimer !== null) {
      window.clearInterval(pollingTimer);
      pollingTimer = null;
    }

    if (!keepEnabled) {
      pollingEnabled = false;
    }
  },

  restartPolling(options = {}) {
    this.stopPolling();
    return this.startPolling(options);
  },

  pollSnapshot({ store = pollingStore } = {}) {
    if (!canPoll(store) || isDocumentHidden()) {
      return Promise.resolve(notificationState.snapshot());
    }

    return this.ensureSnapshot({ force: true, store });
  },

  bindVisibilityLifecycle({ store = appStore, intervalMs = DEFAULT_POLL_INTERVAL_MS } = {}) {
    if (typeof document === "undefined") {
      return () => {};
    }

    const handleVisibilityChange = () => {
      if (isDocumentHidden()) {
        this.stopPolling({ keepEnabled: true });
        return;
      }

      if (pollingEnabled && canPoll(store)) {
        this.startPolling({ store, intervalMs, immediate: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  },

  bindAuthReset(store) {
    let previous = authKey(store?.get("auth", null));
    return store?.subscribe?.((state) => {
      const next = authKey(state.auth);
      if (previous !== next) {
        previous = next;
        notificationState.reset();
      }
    }) ?? (() => {});
  },

  bindAuthLifecycle(store = appStore) {
    let previous = authKey(store?.get("auth", null));

    return store?.subscribe?.((state) => {
      const next = authKey(state.auth);

      if (previous === next) {
        return;
      }

      previous = next;
      notificationState.reset();

      if (isAuthenticatedNotificationUser(state.auth)) {
        this.ensureSnapshot({ force: true, store });
      }
    }) ?? (() => {});
  },

  bindRealtimeLifecycle(store = appStore, { intervalMs = DEFAULT_POLL_INTERVAL_MS } = {}) {
    const disposers = [];
    disposers.push(this.bindAuthLifecycle(store));
    disposers.push(this.bindVisibilityLifecycle({ store, intervalMs }));

    if (canPoll(store) && !isDocumentHidden()) {
      this.startPolling({ store, intervalMs, immediate: true });
    }

    const unsubscribeAuthPolling = store?.subscribe?.((state) => {
      if (!isAuthenticatedNotificationUser(state.auth)) {
        this.stopPolling();
        return;
      }

      if (!isDocumentHidden()) {
        this.startPolling({ store, intervalMs, immediate: true });
      }
    }) ?? null;

    if (unsubscribeAuthPolling) {
      disposers.push(unsubscribeAuthPolling);
    }

    return () => {
      disposers.splice(0).forEach((dispose) => dispose?.());
      this.stopPolling();
    };
  },
};

function authKey(auth = null) {
  const userId = auth?.user?.id ?? auth?.user?.user_id ?? "";
  const role = auth?.role ?? auth?.user?.role ?? "public";
  return `${userId}:${role}`;
}

function isAuthenticatedNotificationUser(auth = null) {
  const role = auth?.role ?? auth?.user?.role ?? "public";
  const userId = auth?.user?.id ?? auth?.user?.user_id ?? null;

  return Boolean(auth?.isAuthenticated && userId && role !== "public");
}

function canPoll(store = appStore) {
  return isAuthenticatedNotificationUser(store?.get?.("auth", null) ?? appStore.get("auth", null));
}

function isDocumentHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function normalizeInterval(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return DEFAULT_POLL_INTERVAL_MS;
  }

  return Math.max(30000, Math.min(number, 60000));
}
