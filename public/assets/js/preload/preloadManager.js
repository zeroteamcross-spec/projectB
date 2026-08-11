export class PreloadManager {
  constructor({ store, cache, plans, bus } = {}) {
    this.store = store;
    this.cache = cache;
    this.plans = plans;
    this.bus = bus;
    this.controllers = new Set();
    this.bootedRoles = new Set();
    this.routeHydration = null;
  }

  async boot(role = "buyer") {
    if (this.bootedRoles.has(role)) {
      return null;
    }

    this.bootedRoles.add(role);
    const plan = this.plans[role] ?? this.plans.buyer ?? { bootSnapshot: [] };
    const tasks = (plan.bootSnapshot ?? []).map((item) => this.loadSnapshot(role, item));
    await Promise.allSettled(tasks);
    this.bus?.emit("preload:boot-complete", { role });
    return role;
  }

  async hydrateRoute(route, context) {
    const items = route.preload?.working ?? [];
    this.routeHydration?.controllers.forEach((controller) => controller.abort());
    const hydration = { controllers: new Set() };
    this.routeHydration = hydration;

    try {
      return await Promise.allSettled(items.map((item) => this.loadWorking(route.workingStateKey, item, context, hydration)));
    } finally {
      if (this.routeHydration === hydration) {
        this.routeHydration = null;
      }
    }
  }

  async loadSnapshot(role, item) {
    const cacheKey = `${role}.${item.key}`;
    const cached = this.cache.read(cacheKey);

    if (cached) {
      this.store.patchState(`snapshot.${cacheKey}`, cached, "snapshot:cache-hit");
      if (!cached.stale) {
        return cached;
      }
    }

    if (typeof item.loader !== "function") {
      this.store.patchState(`snapshot.${cacheKey}`, {
        data: item.fallback ?? null,
        fetchedAt: 0,
        ttl: item.ttl ?? 300,
        version: item.version ?? cacheKey,
        stale: true,
      }, "snapshot:declared");
      return null;
    }

    const controller = new AbortController();
    this.controllers.add(controller);

    try {
      const data = await item.loader({ signal: controller.signal });
      const payload = this.cache.write(cacheKey, data, { ttl: item.ttl, version: item.version });
      this.store.patchState(`snapshot.${cacheKey}`, payload, "snapshot:loaded");
      return payload;
    } finally {
      this.controllers.delete(controller);
    }
  }

  async loadWorking(workingStateKey, item, context, hydration = null) {
    if (!workingStateKey || typeof item.loader !== "function") {
      return null;
    }

    const controller = new AbortController();
    this.controllers.add(controller);
    hydration?.controllers.add(controller);

    try {
      const data = await item.loader({ ...context, signal: controller.signal });
      if (hydration && this.routeHydration !== hydration) {
        return data;
      }

      this.store.patchState(`working.${workingStateKey}.${item.key}`, {
        data,
        hydratedAt: Date.now(),
      }, "working:hydrated");
      return data;
    } finally {
      this.controllers.delete(controller);
      hydration?.controllers.delete(controller);
    }
  }

  dispose() {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
    this.routeHydration = null;
  }
}
