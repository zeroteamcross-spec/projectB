import { appStore } from "./store.js";
import { authStore } from "./authStore.js";
import { favoritesResource } from "../resources/favoritesResource.js";

const STATE_PATH = "runtime.favorites";

/**
 * Favorites are buyer-only. Every other role — and every guest — sees the app
 * exactly as it behaved before the feature existed.
 */
export function canUseFavorites() {
  return authStore.isAuthenticated() && authStore.role() === "buyer";
}

export const favoritesStore = {
  state() {
    return appStore.get(STATE_PATH, null) ?? emptyState();
  },

  cars() {
    return this.state().cars;
  },

  carIds() {
    return this.state().carIds;
  },

  isLoaded() {
    return Boolean(this.state().loadedAt);
  },

  isFavorited(carId) {
    return this.carIds().some((id) => String(id) === String(carId));
  },

  reset(source = "favorites:reset") {
    appStore.patchState(STATE_PATH, emptyState(), source);
  },

  write(payload, source = "favorites:write") {
    const next = {
      cars: Array.isArray(payload?.cars) ? payload.cars : [],
      carIds: Array.isArray(payload?.carIds) ? payload.carIds.map((id) => Number(id)) : [],
      total: Number(payload?.total ?? 0),
      loadedAt: Date.now(),
      error: null,
      pending: false,
    };

    appStore.patchState(STATE_PATH, next, source);
    return next;
  },

  async load({ force = false, signal } = {}) {
    if (!canUseFavorites()) {
      this.reset("favorites:load-skipped");
      return this.state();
    }

    if (!force && this.isLoaded()) {
      return this.state();
    }

    try {
      return this.write(await favoritesResource.list({ signal }), "favorites:loaded");
    } catch (error) {
      appStore.patchState(STATE_PATH, {
        ...this.state(),
        error: error?.message || "Daftar favorit gagal dimuat.",
        pending: false,
      }, "favorites:load-error");
      throw error;
    }
  },

  /**
   * Flips the card immediately, then reconciles with the server. A failed call
   * restores the previous list so the heart never lies about what was saved.
   */
  async toggle(carId) {
    if (!canUseFavorites()) {
      return this.state();
    }

    const id = Number(carId);
    const previous = this.state();
    const wasFavorited = this.isFavorited(id);

    appStore.patchState(STATE_PATH, {
      ...previous,
      carIds: wasFavorited
        ? previous.carIds.filter((entry) => Number(entry) !== id)
        : [id, ...previous.carIds],
      pending: true,
    }, "favorites:toggle-optimistic");

    try {
      const payload = wasFavorited
        ? await favoritesResource.remove(id)
        : await favoritesResource.add(id);

      return this.write(payload, wasFavorited ? "favorites:removed" : "favorites:added");
    } catch (error) {
      appStore.patchState(STATE_PATH, {
        ...previous,
        pending: false,
        error: error?.message || "Favorit gagal disimpan.",
      }, "favorites:toggle-rollback");
      throw error;
    }
  },
};

function emptyState() {
  return {
    cars: [],
    carIds: [],
    total: 0,
    loadedAt: null,
    error: null,
    pending: false,
  };
}
