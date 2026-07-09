import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { confirmDialog } from "../../../ui/primitives/confirmDialog.js";
import { openModal, closeModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { AdminMasterBrandList } from "../components/adminMasterBrandList.js";
import { AdminMasterBrandForm } from "../components/adminMasterBrandForm.js";
import { AdminMasterBankList } from "../components/adminMasterBankList.js";
import { AdminMasterBankForm } from "../components/adminMasterBankForm.js";
import { AdminMasterLocationList } from "../components/adminMasterLocationList.js";
import { AdminMasterLocationForm } from "../components/adminMasterLocationForm.js";
import { AdminMasterSidebarList } from "../components/adminMasterSidebarList.js";
import { AdminMasterSidebarForm } from "../components/adminMasterSidebarForm.js";
import { adminMasterService } from "../services/adminMasterService.js";
import { masterDataResource } from "../../../resources/masterDataResource.js";

const MASTER_PAGES = ["brand", "sidebar", "bank", "location"];

export function AdminMasterBrandPage() {
  return createAdminMasterPage("brand");
}

export function AdminMasterSidebarPage() {
  return createAdminMasterPage("sidebar");
}

export function AdminMasterBankPage() {
  return createAdminMasterPage("bank");
}

export function AdminMasterLocationPage() {
  return createAdminMasterPage("location");
}

export function AdminMasterPage() {
  return createAdminMasterPage("brand");
}

function createAdminMasterPage(pageType = "brand") {
  const activePage = MASTER_PAGES.includes(pageType) ? pageType : "brand";
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    query: createMasterQuery({}, activePage),
    saving: false,
    uploading: false,
    uploadError: "",
    error: "",
  };

  const rerender = () => render(root, currentContext, state, actions, activePage);

  const actions = {
    applyFilters(nextFilters = {}) {
      state.query = {
        ...state.query,
        ...nextFilters,
        page: 1,
      };
      syncMasterUrl(state.query, activePage);
      rerender();
    },
    changePage(nextPage) {
      state.query = {
        ...state.query,
        page: nextPage,
      };
      syncMasterUrl(state.query, activePage);
      rerender();
    },
    changePerPage(nextPerPage) {
      state.query = {
        ...state.query,
        page: 1,
        pageSize: nextPerPage,
      };
      syncMasterUrl(state.query, activePage);
      rerender();
    },
    openCreateBrand(brands) {
      openBrandModal({ mode: "create", brand: null, brands, actions });
    },
    openEditBrand(brand, brands) {
      openBrandModal({ mode: "edit", brand, brands, actions });
    },
    async saveBrand(nextBrand, brands) {
      state.saving = true;
      state.error = "";
      rerender();
      try {
        const nextBrands = upsertBrand(brands, nextBrand);
        const master = await adminMasterService.saveBrandMaster(nextBrands);
        patchBrandMaster(master);
        closeModal({ notify: false });
        showToast("Master brand berhasil disimpan.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan master brand.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async deleteBrand(brand, brands) {
      const confirmed = await confirmDialog({
        title: "Hapus brand",
        message: "Yakin mau hapus brand ini?",
        confirmLabel: "Hapus",
        key: `admst-delete-brand-${brand.id}`,
      });
      if (!confirmed) {
        return;
      }
      state.saving = true;
      rerender();
      try {
        const master = await adminMasterService.saveBrandMaster(brands.filter((item) => item.id !== brand.id));
        patchBrandMaster(master);
        closeModal({ notify: false });
        showToast("Master brand berhasil dihapus.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menghapus master brand.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async toggleBrandStatus(brand, brands) {
      await actions.saveBrand({
        ...brand,
        status: brand.status === "active" ? "inactive" : "active",
      }, brands);
    },
    openCreateSidebar(items) {
      openSidebarModal({ mode: "create", item: null, items, actions });
    },
    openEditSidebar(item, items) {
      openSidebarModal({ mode: "edit", item, items, actions });
    },
    async saveSidebarItem(nextItem, items) {
      state.saving = true;
      state.error = "";
      rerender();
      try {
        const nextItems = upsertSidebarItem(items, nextItem);
        const master = await adminMasterService.saveSidebarMaster(nextItems);
        patchSidebarMaster(master);
        closeModal({ notify: false });
        showToast("Master sidebar berhasil disimpan.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan master sidebar.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async deleteSidebarItem(item, items) {
      const childCount = getSidebarDescendantKeys(items, item.key).size;
      const confirmed = await confirmDialog({
        title: "Hapus menu",
        message: childCount ? "Yakin mau hapus menu ini dan pindahkan child-nya?" : "Yakin mau hapus menu ini?",
        confirmLabel: "Hapus",
        key: `admst-delete-sidebar-${item.id}`,
      });
      if (!confirmed) {
        return;
      }
      state.saving = true;
      rerender();
      try {
        const master = await adminMasterService.saveSidebarMaster(removeSidebarItem(items, item));
        patchSidebarMaster(master);
        closeModal({ notify: false });
        showToast("Menu sidebar berhasil dihapus.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menghapus menu sidebar.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async toggleSidebarVisible(item, items) {
      const nextVisible = !item.is_visible;
      const childKeys = getSidebarDescendantKeys(items, item.key);
      const nextItems = items.map((entry) => {
        if (entry.id === item.id) {
          return { ...entry, is_visible: nextVisible };
        }
        if (!nextVisible && childKeys.has(entry.key)) {
          return { ...entry, is_visible: false };
        }
        return entry;
      });
      await actions.saveSidebarItems(nextItems, "Visibility menu sidebar berhasil disimpan.");
    },
    async reorderSidebarItems(orderedIds, items) {
      state.saving = true;
      state.error = "";
      rerender();
      try {
        const orderedMap = new Map(orderedIds.map((id, index) => [id, (index + 1) * 10]));
        const nextItems = items.map((item) => orderedMap.has(item.id)
          ? { ...item, order: orderedMap.get(item.id), updated_at: new Date().toISOString() }
          : item);
        const master = await adminMasterService.saveSidebarMaster(nextItems);
        patchSidebarMaster(master);
        showToast("Urutan menu sidebar berhasil disimpan.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan urutan sidebar.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async saveSidebarItems(nextItems, successMessage = "Master sidebar berhasil disimpan.") {
      state.saving = true;
      state.error = "";
      rerender();
      try {
        adminMasterService.assertValidSidebarItems(nextItems);
        const master = await adminMasterService.saveSidebarMaster(nextItems);
        patchSidebarMaster(master);
        showToast(successMessage, { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan master sidebar.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    openCreateBank(banks) {
      openBankModal({ mode: "create", bank: null, banks, actions, state });
    },
    openEditBank(bank, banks) {
      openBankModal({ mode: "edit", bank, banks, actions, state });
    },
    async uploadBankIcon(file) {
      state.uploading = true;
      state.uploadError = "";
      rerender();
      try {
        return await masterDataResource.uploadBankIcon(file);
      } catch (error) {
        state.uploadError = error.message || "Gagal upload icon bank.";
        showToast(state.uploadError, { type: "error" });
        return null;
      } finally {
        state.uploading = false;
        rerender();
      }
    },
    async saveBank(nextBank, banks) {
      state.saving = true;
      state.error = "";
      rerender();
      try {
        const nextBanks = upsertBank(banks, nextBank);
        const master = await adminMasterService.saveBankMaster(nextBanks);
        patchBankMaster(master);
        closeModal({ notify: false });
        showToast("Master bank berhasil disimpan.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan master bank.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async deleteBank(bank, banks) {
      const confirmed = await confirmDialog({
        title: "Hapus bank",
        message: "Yakin mau hapus bank ini?",
        confirmLabel: "Hapus",
        key: `admstbk-delete-bank-${bank.id}`,
      });
      if (!confirmed) {
        return;
      }
      state.saving = true;
      rerender();
      try {
        const master = await adminMasterService.saveBankMaster(banks.filter((item) => item.id !== bank.id));
        patchBankMaster(master);
        closeModal({ notify: false });
        showToast("Master bank berhasil dihapus.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menghapus master bank.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async toggleBankStatus(bank, banks) {
      await actions.saveBank({
        ...bank,
        status: bank.status === "active" ? "inactive" : "active",
      }, banks);
    },
    openCreateCity(cities) {
      openLocationModal({ mode: "create", city: null, cities, actions, state });
    },
    openEditCity(city, cities) {
      openLocationModal({ mode: "edit", city, cities, actions, state });
    },
    async saveCity(nextCity, cities) {
      state.saving = true;
      state.error = "";
      rerender();
      try {
        const nextCities = upsertCity(cities, nextCity);
        const master = await adminMasterService.saveLocationMaster(nextCities);
        patchLocationMaster(master);
        closeModal({ notify: false });
        showToast("Master lokasi berhasil disimpan.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan master lokasi.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async deleteCity(city, cities) {
      const confirmed = await confirmDialog({
        title: "Hapus kota",
        message: "Yakin mau hapus kota ini?",
        confirmLabel: "Hapus",
        key: `admstloc-delete-city-${city.id}`,
      });
      if (!confirmed) {
        return;
      }
      state.saving = true;
      rerender();
      try {
        const master = await adminMasterService.saveLocationMaster(cities.filter((item) => item.id !== city.id));
        patchLocationMaster(master);
        closeModal({ notify: false });
        showToast("Master lokasi berhasil dihapus.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menghapus master lokasi.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async toggleCityStatus(city, cities) {
      await actions.saveCity({
        ...city,
        status: city.status === "active" ? "inactive" : "active",
      }, cities);
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.query = createMasterQuery(context?.query, activePage);
      state.error = "";
      state.uploadError = "";
      state.saving = false;
      state.uploading = false;
    },
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      state.query = createMasterQuery(context?.query, activePage);
      rerender();
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => rerender());
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      closeModal({ notify: false });
    },
  });
}

function render(root, context, state, actions, activePage = "brand") {
  if (!root || !context) {
    return;
  }

  const snapshotBrandMaster = appStore.get("snapshot.admin.masterBrand.data", null);
  const workingBrandMaster = appStore.get("working.adminMaster.brand.data", null);
  const brandMaster = adminMasterService.normalizeMaster(workingBrandMaster ?? snapshotBrandMaster);
  const brandHydratedAt = appStore.get("working.adminMaster.brand.hydratedAt", 0) ?? 0;
  const hasBrandSource = Boolean(snapshotBrandMaster || workingBrandMaster);
  const brands = brandMaster.data.brands ?? [];

  const snapshotSidebarMaster = appStore.get("snapshot.admin.masterSidebar.data", null);
  const workingSidebarMaster = appStore.get("working.adminMaster.sidebar.data", null);
  const sidebarMaster = adminMasterService.normalizeSidebarMaster(workingSidebarMaster ?? snapshotSidebarMaster);
  const sidebarHydratedAt = appStore.get("working.adminMaster.sidebar.hydratedAt", 0) ?? 0;
  const hasSidebarSource = Boolean(snapshotSidebarMaster || workingSidebarMaster);
  const sidebarItems = sidebarMaster.data.items ?? [];
  const isSidebar = activePage === "sidebar";
  const isBank = activePage === "bank";
  const isLocation = activePage === "location";

  const snapshotBankMaster = appStore.get("snapshot.admin.masterBank.data", null);
  const workingBankMaster = appStore.get("working.adminMaster.bank.data", null);
  const bankMaster = adminMasterService.normalizeBankMaster(workingBankMaster ?? snapshotBankMaster);
  const bankHydratedAt = appStore.get("working.adminMaster.bank.hydratedAt", 0) ?? 0;
  const hasBankSource = Boolean(snapshotBankMaster || workingBankMaster);
  const banks = bankMaster.data.banks ?? [];

  const snapshotLocationMaster = appStore.get("snapshot.admin.masterLocation.data", null);
  const workingLocationMaster = appStore.get("working.adminMaster.location.data", null);
  const locationMaster = adminMasterService.normalizeLocationMaster(workingLocationMaster ?? snapshotLocationMaster);
  const locationHydratedAt = appStore.get("working.adminMaster.location.hydratedAt", 0) ?? 0;
  const hasLocationSource = Boolean(snapshotLocationMaster || workingLocationMaster);
  const cities = locationMaster.data.cities ?? [];

  const layout = document.createElement("section");
  layout.id = isLocation ? "admstloc_page_section" : isBank ? "admstbk_page_section" : isSidebar ? "admst_sidebar_page_section" : "admst_brand_page_section";
  layout.className = "grid min-w-0 gap-6";
  layout.dataset.ds = isLocation ? "admin.master.location.page" : isBank ? "admin.master.bank.page" : isSidebar ? "admin.master.sidebar.page" : "admin.master.brand.page";

  const createButton = Button({
    label: isLocation ? "Tambah Kota" : isBank ? "Tambah Bank" : isSidebar ? "Tambah Menu" : "Tambah Brand",
    variant: "primary",
    onClick: () => isLocation
      ? actions.openCreateCity(cities)
      : isBank
      ? actions.openCreateBank(banks)
      : isSidebar
      ? actions.openCreateSidebar(sidebarItems)
      : actions.openCreateBrand(brands),
    designHook: "shared.button.primary",
  });
  createButton.id = isLocation ? "admstloc_create_city_button" : isBank ? "admstbk_create_bank_button" : isSidebar ? "admst_create_sidebar_button" : "admst_create_brand_button";
  createButton.prepend(createIcon("sparkles", { className: "h-4 w-4" }));

  layout.append(
    masterHero({ action: createButton, pageType: activePage, brands, sidebarItems, banks, cities, master: isLocation ? locationMaster : isBank ? bankMaster : isSidebar ? sidebarMaster : brandMaster }),
  );

  if (state.error) {
    const error = document.createElement("section");
    error.id = "admst_error_section";
    error.className = "rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
    error.textContent = state.error;
    layout.append(error);
  }

  if (isLocation) {
    layout.append(...renderLocationPage({
      state,
      actions,
      cities,
      loading: !locationHydratedAt && !hasLocationSource,
    }));
  } else if (isBank) {
    layout.append(...renderBankPage({
      state,
      actions,
      banks,
      loading: !bankHydratedAt && !hasBankSource,
    }));
  } else if (isSidebar) {
    layout.append(...renderSidebarTab({
      state,
      actions,
      items: sidebarItems,
      loading: !sidebarHydratedAt && !hasSidebarSource,
    }));
  } else {
    layout.append(...renderBrandTab({
      state,
      actions,
      brands,
      loading: !brandHydratedAt && !hasBrandSource,
    }));
  }

  root.replaceChildren(layout);
}

function renderBankPage({ state, actions, banks, loading }) {
  const filters = { ...state.query };
  const filteredBanks = adminMasterService.filterBanks(banks, filters);
  const pagination = paginate(filteredBanks, filters);

  return [
    masterBankFilterBar({ filters, banks, onSubmit: actions.applyFilters }),
    applyDesignHook(AdminMasterBankList({
      loading,
      banks: pagination.items,
      page: pagination.page,
      perPage: pagination.pageSize,
      totalItems: filteredBanks.length,
      onEdit: (bank) => actions.openEditBank(bank, banks),
      onToggleStatus: (bank) => actions.toggleBankStatus(bank, banks),
      onDelete: (bank) => actions.deleteBank(bank, banks),
      onPageChange: actions.changePage,
      onPerPageChange: actions.changePerPage,
    }), "admin.master.bank.table"),
  ];
}

function renderLocationPage({ state, actions, cities, loading }) {
  const filters = { ...state.query };
  const filteredCities = adminMasterService.filterCities(cities, filters);
  const pagination = paginate(filteredCities, filters);

  return [
    masterLocationFilterBar({ filters, cities, onSubmit: actions.applyFilters }),
    applyDesignHook(AdminMasterLocationList({
      loading,
      cities: pagination.items,
      page: pagination.page,
      perPage: pagination.pageSize,
      totalItems: filteredCities.length,
      onEdit: (city) => actions.openEditCity(city, cities),
      onToggleStatus: (city) => actions.toggleCityStatus(city, cities),
      onDelete: (city) => actions.deleteCity(city, cities),
      onPageChange: actions.changePage,
      onPerPageChange: actions.changePerPage,
    }), "admin.master.location.table"),
  ];
}

function renderBrandTab({ state, actions, brands, loading }) {
  const filters = { ...state.query };
  const filteredBrands = adminMasterService.filterBrands(brands, filters);
  const pagination = paginate(filteredBrands, filters);

  return [
    masterBrandFilterBar({ filters, brands, onSubmit: actions.applyFilters }),
    applyDesignHook(AdminMasterBrandList({
      loading,
      brands: pagination.items,
      page: pagination.page,
      perPage: pagination.pageSize,
      totalItems: filteredBrands.length,
      onEdit: (brand) => actions.openEditBrand(brand, brands),
      onToggleStatus: (brand) => actions.toggleBrandStatus(brand, brands),
      onDelete: (brand) => actions.deleteBrand(brand, brands),
      onPageChange: actions.changePage,
      onPerPageChange: actions.changePerPage,
    }), "admin.master.brand.table"),
  ];
}

function renderSidebarTab({ state, actions, items, loading }) {
  const filters = { ...state.query };
  const filteredItems = adminMasterService.filterSidebarItems(items, filters);
  const pagination = paginate(filteredItems, filters);
  const reorderItems = adminMasterService
    .filterSidebarItems(items, { role: filters.role })
    .filter((item) => !item.parent_key)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

  return [
    masterSidebarFilterBar({ filters, items, onSubmit: actions.applyFilters }),
    applyDesignHook(AdminMasterSidebarList({
      loading,
      items: pagination.items,
      reorderItems,
      page: pagination.page,
      perPage: pagination.pageSize,
      totalItems: filteredItems.length,
      onEdit: (item) => actions.openEditSidebar(item, items),
      onToggleVisible: (item) => actions.toggleSidebarVisible(item, items),
      onDelete: (item) => actions.deleteSidebarItem(item, items),
      onReorder: (orderedIds) => actions.reorderSidebarItems(orderedIds, items),
      onPageChange: actions.changePage,
      onPerPageChange: actions.changePerPage,
    }), "admin.master.sidebar.table"),
  ];
}

function masterHero({ action, pageType, brands = [], sidebarItems = [], banks = [], cities = [], master = {} }) {
  const isSidebar = pageType === "sidebar";
  const isBank = pageType === "bank";
  const isLocation = pageType === "location";
  const section = document.createElement("section");
  section.id = isLocation ? "admstloc_hero_section" : isBank ? "admstbk_hero_section" : "admst_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,247,237,0.86),rgba(239,246,255,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-shadow duration-150 sm:p-6 lg:p-7";
  section.dataset.ds = "admin.master.hero";

  const grid = document.createElement("div");
  grid.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-3";
  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f97316,#14b8a6)] text-white shadow-[0_16px_40px_rgba(249,115,22,0.22)]";
  icon.append(createIcon(isLocation ? "location" : isBank ? "bank" : isSidebar ? "sort" : "car", { className: "h-5 w-5" }));
  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-orange-700", isLocation ? "" : isBank ? "" : isSidebar ? "" : ""),
    textNode("h1", "text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", isLocation ? "Master Lokasi" : isBank ? "Master Bank" : isSidebar ? "Master Sidebar" : "Master Brand"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", isLocation
      ? ""
      : isBank
      ? ""
      : isSidebar
      ? ""
      : ""),
  );

  const stats = document.createElement("section");
  stats.id = isLocation ? "admstloc_hero_stats_section" : isBank ? "admstbk_hero_stats_section" : "admst_hero_stats_section";
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[380px]";
  const provinceCount = new Set(cities.map((city) => city.province_slug || city.province_name).filter(Boolean)).size;
  const statItems = isLocation
    ? [
      ["Kota", cities.length],
      ["Aktif", cities.filter((city) => city.status === "active").length],
      ["Provinsi", provinceCount],
    ]
    : isBank
    ? [
      ["Bank", banks.length],
      ["Aktif", banks.filter((bank) => bank.status === "active").length],
      ["Icon", banks.filter((bank) => bank.icon_path).length],
    ]
    : isSidebar
    ? [
      ["Menu", sidebarItems.length],
      ["Visible", sidebarItems.filter((item) => item.is_visible).length],
      ["Parent", sidebarItems.filter((item) => item.is_parent).length],
    ]
    : [
      ["Brand", brands.length],
      ["Aktif", brands.filter((brand) => brand.status === "active").length],
      ["Model", brands.reduce((sum, brand) => sum + (brand.models?.length ?? 0), 0)],
    ];
  statItems.forEach(([label, value]) => {
    const card = document.createElement("section");
    card.id = `${isLocation ? "admstloc" : isBank ? "admstbk" : "admst"}_hero_stat_${String(label).toLowerCase()}_section`;
    card.className = "rounded-[1.25rem] border border-white/80 bg-white/78 p-3 shadow-sm";
    card.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "text-2xl font-black text-gray-950", String(value)),
    );
    stats.append(card);
  });

  const side = document.createElement("section");
  side.id = isLocation ? "admstloc_hero_actions_section" : isBank ? "admstbk_hero_actions_section" : "admst_hero_actions_section";
  side.className = "grid gap-3";
  side.append(stats, action, textNode("p", "text-xs font-semibold text-gray-500", `master_key: ${master.master_key ?? "-"}`));
  grid.append(copy, side);
  section.append(grid);
  return section;
}

function masterBankFilterBar({ filters, banks, onSubmit }) {
  const section = baseFilterSection("admstbk_filter_section", "admin.master.bank.filters");
  const form = document.createElement("form");
  form.id = "admstbk_filter_form_section";
  form.className = "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]";

  const keyword = inputField("admstbk_keyword_input", filters.keyword ?? "", "Cari nama, kode, atau slug bank");
  const status = selectField("admstbk_status_input", filters.status ?? "", [
    ["", "Semua status"],
    ["active", "Aktif"],
    ["inactive", "Nonaktif"],
  ]);
  const actions = filterActions({
    idPrefix: "admstbk",
    onReset: () => onSubmit?.({ keyword: "", status: "" }),
  });
  form.append(labelWrap("Keyword", keyword), labelWrap("Status", status), actions.wrap);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({ keyword: keyword.value.trim(), status: status.value });
  });

  section.append(form, filterChips("admstbk_filter_chips_section", [
    `${banks.length} bank`,
    `${banks.filter((bank) => bank.status === "active").length} aktif`,
    `${banks.filter((bank) => bank.icon_path).length} icon`,
  ]));
  return section;
}

function masterLocationFilterBar({ filters, cities, onSubmit }) {
  const section = baseFilterSection("admstloc_filter_section", "admin.master.location.filters");
  const form = document.createElement("form");
  form.id = "admstloc_filter_form_section";
  form.className = "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]";

  const keyword = inputField("admstloc_keyword_input", filters.keyword ?? "", "Cari kota, slug, atau provinsi");
  const status = selectField("admstloc_status_input", filters.status ?? "", [
    ["", "Semua status"],
    ["active", "Aktif"],
    ["inactive", "Nonaktif"],
  ]);
  const actions = filterActions({
    idPrefix: "admstloc",
    onReset: () => onSubmit?.({ keyword: "", status: "" }),
  });
  form.append(labelWrap("Keyword", keyword), labelWrap("Status", status), actions.wrap);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({ keyword: keyword.value.trim(), status: status.value });
  });

  const provinceCount = new Set(cities.map((city) => city.province_slug || city.province_name).filter(Boolean)).size;
  section.append(form, filterChips("admstloc_filter_chips_section", [
    `${cities.length} kota`,
    `${cities.filter((city) => city.status === "active").length} aktif`,
    `${provinceCount} provinsi`,
  ]));
  return section;
}

function masterBrandFilterBar({ filters, brands, onSubmit }) {
  const section = baseFilterSection("admst_filter_section", "admin.master.filters");
  const form = document.createElement("form");
  form.id = "admst_filter_form_section";
  form.className = "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]";

  const keyword = inputField("admst_keyword_input", filters.keyword ?? "", "Cari brand atau model");
  const status = selectField("admst_status_input", filters.status ?? "", [
    ["", "Semua status"],
    ["active", "Aktif"],
    ["inactive", "Nonaktif"],
  ]);
  const actions = filterActions({
    idPrefix: "admst",
    onReset: () => onSubmit?.({ keyword: "", status: "", role: "" }),
  });
  form.append(labelWrap("Keyword", keyword), labelWrap("Status", status), actions.wrap);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({ keyword: keyword.value.trim(), status: status.value, role: "" });
  });

  section.append(form, filterChips("admst_filter_chips_section", [
    `${brands.length} brand`,
    `${brands.filter((brand) => brand.status === "active").length} aktif`,
    `${brands.reduce((sum, brand) => sum + (brand.models?.length ?? 0), 0)} model`,
  ]));
  return section;
}

function masterSidebarFilterBar({ filters, items, onSubmit }) {
  const section = baseFilterSection("admst_sidebar_filter_section", "admin.master.sidebar.filters");
  const roleButtons = document.createElement("section");
  roleButtons.id = "admst_sidebar_role_quick_filter_section";
  roleButtons.className = "flex flex-wrap gap-2";
  [
    ["admin", "Admin"],
    ["seller", "Seller"],
    ["affiliate", "Marketing"],
  ].forEach(([roleValue, label]) => {
    const button = Button({
      label,
      variant: filters.role === roleValue ? "primary" : "secondary",
      onClick: () => onSubmit?.({ keyword: filters.keyword ?? "", role: roleValue, status: filters.status ?? "" }),
    });
    button.id = `admst_sidebar_role_${roleValue}_button`;
    button.type = "button";
    button.prepend(createIcon(roleValue === "admin" ? "sort" : roleValue === "seller" ? "showroom" : "affiliate", { className: "h-4 w-4" }));
    roleButtons.append(button);
  });

  const form = document.createElement("form");
  form.id = "admst_sidebar_filter_form_section";
  form.className = "grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px_auto]";

  const keyword = inputField("admst_sidebar_keyword_input", filters.keyword ?? "", "Cari label, route, atau key");
  const role = selectField("admst_sidebar_role_input", filters.role ?? "", [
    ["", "Semua role"],
    ["admin", "Admin"],
    ["seller", "Seller"],
    ["affiliate", "Marketing"],
  ]);
  const status = selectField("admst_sidebar_status_input", filters.status ?? "", [
    ["", "Semua status"],
    ["visible", "Tampil"],
    ["hidden", "Hidden"],
    ["active", "Aktif"],
    ["inactive", "Nonaktif"],
  ]);
  const actions = filterActions({
    idPrefix: "admst_sidebar",
    onReset: () => onSubmit?.({ keyword: "", role: "admin", status: "" }),
  });
  form.append(labelWrap("Keyword", keyword), labelWrap("Role", role), labelWrap("Status", status), actions.wrap);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({ keyword: keyword.value.trim(), role: role.value, status: status.value });
  });

  section.append(roleButtons, form, filterChips("admst_sidebar_filter_chips_section", [
    `${items.length} menu`,
    `${items.filter((item) => item.is_visible).length} tampil`,
    `${items.filter((item) => item.is_parent).length} parent`,
  ]));
  return section;
}

function openBrandModal({ mode, brand, brands, actions }) {
  openModal(applyDesignHook(AdminMasterBrandForm({
    brand,
    mode,
    onSubmit: (nextBrand) => actions.saveBrand(nextBrand, brands),
    onDelete: (targetBrand) => actions.deleteBrand(targetBrand, brands),
    onCancel: () => closeModal(),
  }), "admin.master.brand.form"), {
    key: `admst-brand-${mode}-${brand?.id ?? "new"}`,
    title: mode === "edit" ? "Edit Brand" : "Tambah Brand",
    description: "Brand dan model disimpan dalam payload JSON master cars.brands.",
    size: "xl",
    footer: null,
    panelId: "admst_brand_modal_section",
    headerId: "admst_brand_modal_header_section",
    bodyId: "admst_brand_modal_body_section",
    closeButtonId: "admst_brand_modal_close_button",
  });
}

function openSidebarModal({ mode, item, items, actions }) {
  openModal(applyDesignHook(AdminMasterSidebarForm({
    item,
    items,
    mode,
    onSubmit: (nextItem) => actions.saveSidebarItem(nextItem, items),
    onDelete: (targetItem) => actions.deleteSidebarItem(targetItem, items),
    onCancel: () => closeModal(),
  }), "admin.master.sidebar.form"), {
    key: `admst-sidebar-${mode}-${item?.id ?? "new"}`,
    title: mode === "edit" ? "Edit Menu Sidebar" : "Tambah Menu Sidebar",
    description: "Struktur sidebar disimpan sebagai payload JSON master app.sidebar.",
    size: "xl",
    footer: null,
    panelId: "admst_sidebar_modal_section",
    headerId: "admst_sidebar_modal_header_section",
    bodyId: "admst_sidebar_modal_body_section",
    closeButtonId: "admst_sidebar_modal_close_button",
  });
}

function openBankModal({ mode, bank, banks, actions, state }) {
  openModal(applyDesignHook(AdminMasterBankForm({
    bank,
    mode,
    saving: state.saving,
    uploading: state.uploading,
    uploadError: state.uploadError,
    onUploadIcon: (file) => actions.uploadBankIcon(file),
    onSubmit: (nextBank) => actions.saveBank(nextBank, banks),
    onDelete: (targetBank) => actions.deleteBank(targetBank, banks),
    onCancel: () => closeModal(),
  }), "admin.master.bank.form"), {
    key: `admstbk-bank-${mode}-${bank?.id ?? "new"}`,
    title: mode === "edit" ? "Edit Bank" : "Tambah Bank",
    description: "Data bank disimpan dalam payload JSON master payments.banks.",
    size: "xl",
    footer: null,
    panelId: "admstbk_bank_modal_section",
    headerId: "admstbk_bank_modal_header_section",
    bodyId: "admstbk_bank_modal_body_section",
    closeButtonId: "admstbk_bank_modal_close_button",
  });
}

function openLocationModal({ mode, city, cities, actions, state }) {
  openModal(applyDesignHook(AdminMasterLocationForm({
    city,
    mode,
    saving: state.saving,
    onSubmit: (nextCity) => actions.saveCity(nextCity, cities),
    onDelete: (targetCity) => actions.deleteCity(targetCity, cities),
    onCancel: () => closeModal(),
  }), "admin.master.location.form"), {
    key: `admstloc-city-${mode}-${city?.id ?? "new"}`,
    title: mode === "edit" ? "Edit Kota" : "Tambah Kota",
    description: "Data kota disimpan dalam payload JSON master locations.cities.",
    size: "xl",
    footer: null,
    panelId: "admstloc_city_modal_section",
    headerId: "admstloc_city_modal_header_section",
    bodyId: "admstloc_city_modal_body_section",
    closeButtonId: "admstloc_city_modal_close_button",
  });
}

function upsertBrand(brands, nextBrand) {
  const exists = brands.some((brand) => brand.id === nextBrand.id);
  const normalized = {
    ...nextBrand,
    slug: slugify(nextBrand.slug || nextBrand.name),
    updated_at: new Date().toISOString(),
  };

  return exists
    ? brands.map((brand) => brand.id === nextBrand.id ? normalized : brand)
    : [...brands, normalized];
}

function upsertSidebarItem(items, nextItem) {
  const exists = items.some((item) => item.id === nextItem.id);
  const normalized = {
    ...nextItem,
    key: nextItem.key || `${nextItem.role}.${slugify(nextItem.label || nextItem.route || "menu")}`,
    updated_at: new Date().toISOString(),
  };
  const childKeys = getSidebarDescendantKeys(items, normalized.key);

  const nextItems = exists
    ? items.map((item) => item.id === nextItem.id ? normalized : item)
    : [...items, normalized];

  return nextItems.map((item) => {
    if (item.id === normalized.id) {
      return item;
    }
    if (childKeys.has(item.key)) {
      if (!normalized.is_parent) {
        return { ...item, parent_key: "" };
      }
      if (!normalized.is_visible || !normalized.is_active) {
        return { ...item, is_visible: false };
      }
    }
    return item;
  });
}

function upsertBank(banks, nextBank) {
  const exists = banks.some((bank) => bank.id === nextBank.id);
  const normalized = {
    ...nextBank,
    slug: slugify(nextBank.slug || nextBank.bank_name),
    bank_code: String(nextBank.bank_code ?? "").trim().toUpperCase(),
    updated_at: new Date().toISOString(),
  };

  return exists
    ? banks.map((bank) => bank.id === nextBank.id ? normalized : bank)
    : [...banks, normalized];
}

function upsertCity(cities, nextCity) {
  const exists = cities.some((city) => city.id === nextCity.id);
  const normalized = {
    ...nextCity,
    slug: slugify(nextCity.slug || nextCity.name),
    province_slug: slugify(nextCity.province_slug || nextCity.province_name || ""),
    updated_at: new Date().toISOString(),
  };

  return exists
    ? cities.map((city) => city.id === nextCity.id ? normalized : city)
    : [...cities, normalized];
}

function removeSidebarItem(items, targetItem) {
  return items
    .filter((item) => item.id !== targetItem.id)
    .map((item) => item.parent_key === targetItem.key ? { ...item, parent_key: "" } : item);
}

function getSidebarDescendantKeys(items, parentKey) {
  const descendants = new Set();
  const collect = (key) => {
    items
      .filter((item) => item.parent_key === key)
      .forEach((child) => {
        if (!descendants.has(child.key)) {
          descendants.add(child.key);
          collect(child.key);
        }
      });
  };
  collect(parentKey);
  return descendants;
}

function patchBrandMaster(master) {
  appStore.patchState("working.adminMaster.brand", {
    data: master,
    hydratedAt: Date.now(),
  }, "admin-master:brand-saved");
  appStore.patchState("snapshot.admin.masterBrand", {
    data: master,
    hydratedAt: Date.now(),
  }, "admin-master:brand-snapshot-synced");
}

function patchSidebarMaster(master) {
  appStore.patchState("working.adminMaster.sidebar", {
    data: master,
    hydratedAt: Date.now(),
  }, "admin-master:sidebar-saved");
  const snapshotPayload = {
    data: master,
    hydratedAt: Date.now(),
  };
  appStore.patchState("snapshot.admin.masterSidebar", snapshotPayload, "admin-master:sidebar-snapshot-synced");
  appStore.patchState("snapshot.seller.masterSidebar", snapshotPayload, "admin-master:sidebar-seller-snapshot-synced");
  appStore.patchState("snapshot.affiliate_admin.masterSidebar", snapshotPayload, "admin-master:sidebar-affiliate-snapshot-synced");
}

function patchBankMaster(master) {
  appStore.patchState("working.adminMaster.bank", {
    data: master,
    hydratedAt: Date.now(),
  }, "admin-master:bank-saved");
  appStore.patchState("snapshot.admin.masterBank", {
    data: master,
    hydratedAt: Date.now(),
  }, "admin-master:bank-snapshot-synced");
}

function patchLocationMaster(master) {
  appStore.patchState("working.adminMaster.location", {
    data: master,
    hydratedAt: Date.now(),
  }, "admin-master:location-saved");
  appStore.patchState("snapshot.admin.masterLocation", {
    data: master,
    hydratedAt: Date.now(),
  }, "admin-master:location-snapshot-synced");
}

function buildMasterPath(pageType = "brand", { keyword = "", status = "", role = "", page = "", pageSize = "" } = {}) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (status) params.set("status", status);
  if (pageType === "sidebar" && role) params.set("role", role);
  if (page && Number(page) > 1) params.set("page", String(page));
  if (pageSize && Number(pageSize) > 0) params.set("page_size", String(pageSize));
  const query = params.toString();
  const basePath = pageType === "location" ? "/admin/master-location" : pageType === "bank" ? "/admin/master-bank" : pageType === "sidebar" ? "/admin/master-sidebar" : "/admin/master-brand";
  return query ? `${basePath}?${query}` : basePath;
}

function createMasterQuery(query = {}, pageType = "brand") {
  return {
    keyword: query.keyword ?? "",
    role: pageType === "sidebar" ? query.role ?? "admin" : "",
    status: query.status ?? "",
    page: Math.max(1, Number(query.page || 1)),
    pageSize: Math.max(1, Number(query.page_size || query.pageSize || 10)),
  };
}

function syncMasterUrl(query, pageType = "brand") {
  const url = new URL(window.location.href);
  url.hash = `#${buildMasterPath(pageType, query)}`;
  window.history.replaceState(window.history.state, "", url);
}

function paginate(items, filters) {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.max(1, Number(filters.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    items: items.slice(pageStart, pageStart + pageSize),
  };
}

function baseFilterSection(id, designHook) {
  const section = document.createElement("section");
  section.id = id;
  section.className = "grid gap-4 rounded-[1.5rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(239,246,255,0.72),rgba(255,247,237,0.72))] p-4 shadow-[var(--pb-shadow-card)] backdrop-blur-xl";
  section.dataset.ds = designHook;
  return section;
}

function filterActions({ idPrefix, onReset }) {
  const wrap = document.createElement("section");
  wrap.id = `${idPrefix}_filter_actions_section`;
  wrap.className = "grid gap-2 sm:grid-cols-2 lg:grid-cols-1";
  const submit = Button({ label: "Terapkan", variant: "primary" });
  submit.id = `${idPrefix}_apply_filter_button`;
  submit.type = "submit";
  submit.prepend(createIcon("search", { className: "h-4 w-4" }));
  const reset = Button({ label: "Reset", variant: "secondary", onClick: onReset });
  reset.id = `${idPrefix}_reset_filter_button`;
  reset.type = "button";
  wrap.append(submit, reset);
  return { wrap, submit, reset };
}

function filterChips(id, labels) {
  const chips = document.createElement("section");
  chips.id = id;
  chips.className = "flex flex-wrap gap-2 border-t border-white/60 pt-3";
  labels.forEach((label) => {
    const chip = document.createElement("span");
    chip.className = "rounded-full border border-[var(--pb-border)] bg-[var(--pb-chip-bg)] px-4 py-2 text-sm font-semibold text-[var(--pb-chip-text)] shadow-sm";
    chip.textContent = label;
    chips.append(chip);
  });
  return chips;
}

function labelWrap(label, control) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1 text-sm font-semibold text-gray-700";
  wrap.textContent = label;
  wrap.append(control);
  return wrap;
}

function inputField(id, value, placeholder) {
  const input = document.createElement("input");
  input.id = id;
  input.value = value;
  input.placeholder = placeholder;
  input.className = "min-h-10 min-w-0 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-sm text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  return input;
}

function selectField(id, value, options) {
  const select = document.createElement("select");
  select.id = id;
  select.className = "min-h-10 min-w-0 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-sm text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  options.forEach(([optionValue, label]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    option.selected = optionValue === value;
    select.append(option);
  });
  return select;
}

function slugify(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
