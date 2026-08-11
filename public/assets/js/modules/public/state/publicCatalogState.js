import { appStore } from "../../../state/store.js";

const BASE = "modules.public.catalog";
const WORKING_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const workingCatalogCache = new Map();

export const publicCatalogState = {
  get() {
    return appStore.get(BASE, {});
  },

  filters() {
    return appStore.get(`${BASE}.filters`, {});
  },

  quickFilter() {
    return appStore.get(`${BASE}.quickFilter`, "newest");
  },

  page() {
    return appStore.get(`${BASE}.page`, 1);
  },

  limit() {
    return appStore.get(`${BASE}.limit`, 12);
  },

  setFilters(filters) {
    appStore.patchState(`${BASE}.filters`, { ...this.filters(), ...filters }, "public:filters");
    appStore.patchState(`${BASE}.page`, 1, "public:page-reset");
  },

  resetFilters() {
    appStore.patchState(`${BASE}.filters`, {
      keyword: "",
      brand_name: "",
      brand_names: [],
      transmission: "",
      location_name: "",
      location_names: [],
      min_price_cash: "",
      max_price_cash: "",
    }, "public:filters-reset");
    appStore.patchState(`${BASE}.page`, 1, "public:page-reset");
  },

  setQuickFilter(value) {
    appStore.patchState(`${BASE}.quickFilter`, value, "public:quick-filter");
  },

  setFilterOpen(value) {
    appStore.patchState(`${BASE}.isFilterOpen`, Boolean(value), "public:filter-sheet");
  },

  incrementPage() {
    appStore.patchState(`${BASE}.page`, this.page() + 1, "public:page-next");
  },

  setSelectedCar(carId) {
    appStore.patchState(`${BASE}.selectedCarId`, carId, "public:selected-car");
  },

  selectedCarSummary(carId = this.get().selectedCarId, scope = {}) {
    const id = String(carId ?? "");
    const workingCars = this.workingCatalog({ cars: [] })?.cars ?? [];
    const cachedCars = this.cachedCatalog(scope)?.cars ?? [];
    const snapshotCars = this.snapshotCatalog({ cars: [] })?.cars ?? [];

    return [...workingCars, ...cachedCars, ...snapshotCars].find((car) => String(car.id) === id) ?? null;
  },

  /**
   * Posisi gulir katalog, dititipkan sebelum membuka detail mobil dan diambil
   * lagi sekali saat pembaca kembali. Sekali pakai: dibaca berarti hangus,
   * supaya membuka katalog dari menu tetap mulai dari atas.
   */
  saveScrollPosition(value) {
    const position = Number.isFinite(Number(value)) ? Number(value) : 0;
    appStore.patchState(`${BASE}.scrollPosition`, position, "public:scroll-save");
  },

  consumeScrollPosition() {
    const position = appStore.get(`${BASE}.scrollPosition`, null);
    appStore.patchState(`${BASE}.scrollPosition`, null, "public:scroll-consume");
    return Number.isFinite(Number(position)) ? Number(position) : null;
  },

  snapshotCatalog(fallback = null) {
    return appStore.get("snapshot.public.catalog.data", fallback);
  },

  workingCatalog(fallback = null) {
    return appStore.get("working.publicCatalog.catalog.data", fallback);
  },

  setWorkingCatalog(catalog) {
    appStore.patchState("working.publicCatalog.catalog", {
      data: catalog,
      hydratedAt: Date.now(),
    }, "public:catalog-set");
  },

  cachedCatalog(scope = {}) {
    const cacheKey = catalogScopeKey(scope);
    const entry = workingCatalogCache.get(cacheKey);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.storedAt > WORKING_CATALOG_CACHE_TTL_MS) {
      workingCatalogCache.delete(cacheKey);
      return null;
    }

    return entry.catalog;
  },

  rememberCatalog(catalog, scope = {}) {
    if (!catalog || !Array.isArray(catalog.cars)) {
      return;
    }

    workingCatalogCache.set(catalogScopeKey(scope), {
      catalog,
      storedAt: Date.now(),
    });
  },
};

function catalogScopeKey({ affiliateSlug = "", showroomSlug = "", filters = {}, page = 1 } = {}) {
  return JSON.stringify({
    affiliateSlug: String(affiliateSlug ?? "").trim().toLowerCase(),
    showroomSlug: String(showroomSlug ?? "").trim().toLowerCase(),
    filters: stableValue(filters),
    page: Number(page) > 0 ? Math.floor(Number(page)) : 1,
  });
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }

  return value;
}
