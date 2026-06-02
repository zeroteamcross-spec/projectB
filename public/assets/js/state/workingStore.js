import { appStore } from "./store.js";

export const workingStore = {
  get(key, fallback = null) {
    return appStore.get(`working.${key}`, fallback);
  },

  set(key, data) {
    appStore.patchState(`working.${key}`, {
      data,
      hydratedAt: Date.now(),
    }, "working:set");
  },

  destroy(key = "") {
    appStore.destroyWorkingState(key);
  },
};
