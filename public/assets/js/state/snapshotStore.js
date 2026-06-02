import { appStore } from "./store.js";

export const snapshotStore = {
  get(key, fallback = null) {
    return appStore.get(`snapshot.${key}`, fallback);
  },

  set(key, data, meta = {}) {
    appStore.patchState(`snapshot.${key}`, {
      data,
      fetchedAt: Date.now(),
      ttl: meta.ttl ?? 300,
      version: meta.version ?? key,
      stale: false,
    }, "snapshot:set");
  },

  markStale(key) {
    const current = this.get(key, {});
    appStore.patchState(`snapshot.${key}`, { ...current, stale: true }, "snapshot:stale");
  },

  clearRole(role) {
    appStore.patchState(`snapshot.${role}`, {}, "snapshot:clear-role");
  },
};
