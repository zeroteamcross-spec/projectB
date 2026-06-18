import { appStore } from "../../../state/store.js";

const BASE = "modules.public.catalog";

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

  selectedCarSummary(carId = this.get().selectedCarId) {
    const id = String(carId ?? "");
    const workingCars = this.workingCatalog({ cars: [] })?.cars ?? [];
    const snapshotCars = this.snapshotCatalog({ cars: [] })?.cars ?? [];

    return [...workingCars, ...snapshotCars].find((car) => String(car.id) === id) ?? null;
  },

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
};
