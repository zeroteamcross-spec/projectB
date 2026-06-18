import { masterDataResource } from "../../../resources/masterDataResource.js";
import { iconRegistry } from "../../../theme/iconRegistry.js";

export const MASTER_BRANDS_KEY = "cars.brands";
export const MASTER_SIDEBAR_KEY = "app.sidebar";
export const MASTER_BANKS_KEY = "payments.banks";
export const MASTER_LOCATIONS_KEY = "locations.cities";

const DEFAULT_BRAND_SEED = [
  brandSeed("brand_toyota", "Toyota", "toyota", "MPV, SUV, dan city car populer untuk pasar keluarga Indonesia.", [
    "Avanza", "Veloz", "Kijang Innova", "Fortuner", "Raize", "Calya", "Yaris Cross",
  ]),
  brandSeed("brand_daihatsu", "Daihatsu", "daihatsu", "Pilihan kompak dan niaga ringan dengan jaringan pasar luas.", [
    "Xenia", "Terios", "Sigra", "Ayla", "Rocky", "Gran Max",
  ]),
  brandSeed("brand_honda", "Honda", "honda", "City car, crossover, dan SUV dengan positioning retail kuat.", [
    "Brio", "WR-V", "HR-V", "BR-V", "CR-V", "City Hatchback", "Civic",
  ]),
  brandSeed("brand_mitsubishi", "Mitsubishi", "mitsubishi", "MPV, SUV, dan kendaraan komersial yang umum di operasi dealer.", [
    "Xpander", "Xpander Cross", "Pajero Sport", "Xforce", "Triton", "L300",
  ]),
  brandSeed("brand_suzuki", "Suzuki", "suzuki", "Model keluarga, hatchback, dan kendaraan niaga ringan.", [
    "Ertiga", "XL7", "Carry", "Baleno", "Grand Vitara", "S-Presso",
  ]),
  brandSeed("brand_hyundai", "Hyundai", "hyundai", "SUV, MPV, dan EV modern yang semakin umum di pasar Indonesia.", [
    "Stargazer", "Creta", "Santa Fe", "Palisade", "Ioniq 5", "Kona Electric",
  ]),
  brandSeed("brand_wuling", "Wuling", "wuling", "MPV, SUV, dan EV entry-to-mid yang relevan untuk demo marketplace.", [
    "Confero", "Cortez", "Almaz", "Air ev", "BinguoEV", "Cloud EV",
  ]),
  brandSeed("brand_chery", "Chery", "chery", "SUV dan EV baru dengan pertumbuhan visibility di pasar Indonesia.", [
    "Omoda 5", "Omoda E5", "Tiggo 7 Pro", "Tiggo 8 Pro", "J6",
  ]),
  brandSeed("brand_byd", "BYD", "byd", "Brand EV dengan model awal yang relevan untuk pasar elektrifikasi.", [
    "Dolphin", "Atto 3", "Seal", "M6", "Sealion 7",
  ]),
  brandSeed("brand_nissan", "Nissan", "nissan", "MPV, SUV, dan elektrifikasi ringan untuk variasi data UAT.", [
    "Livina", "Serena", "Kicks e-Power", "Terra", "Magnite",
  ]),
  brandSeed("brand_mazda", "Mazda", "mazda", "Hatchback dan crossover premium-mass untuk variasi listing.", [
    "Mazda2", "CX-3", "CX-30", "CX-5", "CX-60",
  ]),
  brandSeed("brand_isuzu", "Isuzu", "isuzu", "Kendaraan niaga dan SUV diesel yang relevan untuk operasi fleet.", [
    "D-Max", "MU-X", "Traga", "Elf", "Giga",
  ]),
];

const DEFAULT_SIDEBAR_SEED = [
  sidebarSeed("admin.dashboard", "admin", "Dashboard Admin", "#/admin", "dashboard", 10),
  sidebarSeed("admin.approvals", "admin", "Approval Queue", "#/admin/approvals", "transaction", 20),
  sidebarSeed("admin.users", "admin", "User Management", "#/admin/users", "transaction", 30),
  sidebarSeed("admin.transactions", "admin", "Transactions", "#/admin/transactions", "transaction", 40),
  sidebarSeed("admin.settlements", "admin", "Settlements", "#/admin/settlements", "commission", 50),
  sidebarSeed("admin.sliders", "admin", "Slider", "#/admin/sliders", "image", 60),
  sidebarSeed("admin.master", "admin", "Master", "", "sort", 70, "", true),
  sidebarSeed("admin.master_brand", "admin", "Master Brand", "#/admin/master-brand", "car", 10, "admin.master"),
  sidebarSeed("admin.master_sidebar", "admin", "Master Sidebar", "#/admin/master-sidebar", "sitemap", 20, "admin.master"),
  sidebarSeed("admin.master_bank", "admin", "Master Bank", "#/admin/master-bank", "bank", 30, "admin.master"),
  sidebarSeed("admin.master_inspection", "admin", "Master Inspection", "#/admin/master-inspection", "clipboard", 40, "admin.master"),
  sidebarSeed("admin.master_location", "admin", "Master Lokasi", "#/admin/master-location", "location", 50, "admin.master"),
  sidebarSeed("admin.design_studio", "admin", "Design Studio", "#/admin/design-studio", "sparkles", 80),
  sidebarSeed("seller.dashboard", "seller", "Dashboard Seller", "#/seller", "dashboard", 10),
  sidebarSeed("seller.showroom", "seller", "Showroom Saya", "#/seller/showroom", "showroom", 20),
  sidebarSeed("seller.cars", "seller", "Mobil Saya", "#/seller/cars", "car", 30),
  sidebarSeed("seller.affiliates", "seller", "Marketing", "#/seller/affiliates", "affiliate", 40),
  sidebarSeed("seller.affiliate_commissions", "seller", "Komisi Marketing", "#/seller/affiliate-commissions", "commission", 50),
  sidebarSeed("seller.transactions", "seller", "Transaksi", "#/seller/transactions", "transaction", 60),
  sidebarSeed("affiliate.dashboard", "affiliate", "Dashboard Marketing", "#/affiliate", "affiliate", 10),
  sidebarSeed("affiliate.activity", "affiliate", "Activity Clicks", "#/affiliate/activity", "transaction", 20),
  sidebarSeed("affiliate.ledger", "affiliate", "Ledger Komisi", "#/affiliate/ledger", "commission", 30),
  sidebarSeed("affiliate.settlements", "affiliate", "Payout Settlement", "#/affiliate/settlements", "commission", 40),
];

const DEFAULT_BANK_SEED = [
  bankSeed("bank_bca", "BCA", "bca", "014"),
  bankSeed("bank_mandiri", "Mandiri", "mandiri", "008"),
  bankSeed("bank_bni", "BNI", "bni", "009"),
  bankSeed("bank_bri", "BRI", "bri", "002"),
  bankSeed("bank_cimb_niaga", "CIMB Niaga", "cimb-niaga", "022"),
  bankSeed("bank_permata", "Permata Bank", "permata-bank", "013"),
  bankSeed("bank_danamon", "Danamon", "danamon", "011"),
  bankSeed("bank_bsi", "Bank Syariah Indonesia", "bsi", "451"),
];

const DEFAULT_LOCATION_SEED = [
  citySeed("city_jakarta", "Jakarta", "jakarta", "DKI Jakarta", "dki-jakarta"),
  citySeed("city_bandung", "Bandung", "bandung", "Jawa Barat", "jawa-barat"),
  citySeed("city_surabaya", "Surabaya", "surabaya", "Jawa Timur", "jawa-timur"),
  citySeed("city_semarang", "Semarang", "semarang", "Jawa Tengah", "jawa-tengah"),
  citySeed("city_yogyakarta", "Yogyakarta", "yogyakarta", "DI Yogyakarta", "di-yogyakarta"),
  citySeed("city_medan", "Medan", "medan", "Sumatera Utara", "sumatera-utara"),
  citySeed("city_palembang", "Palembang", "palembang", "Sumatera Selatan", "sumatera-selatan"),
  citySeed("city_pekanbaru", "Pekanbaru", "pekanbaru", "Riau", "riau"),
  citySeed("city_padang", "Padang", "padang", "Sumatera Barat", "sumatera-barat"),
  citySeed("city_makassar", "Makassar", "makassar", "Sulawesi Selatan", "sulawesi-selatan"),
  citySeed("city_denpasar", "Denpasar", "denpasar", "Bali", "bali"),
  citySeed("city_balipapan", "Balikpapan", "balikpapan", "Kalimantan Timur", "kalimantan-timur"),
  citySeed("city_samarinda", "Samarinda", "samarinda", "Kalimantan Timur", "kalimantan-timur"),
  citySeed("city_banjarmasin", "Banjarmasin", "banjarmasin", "Kalimantan Selatan", "kalimantan-selatan"),
  citySeed("city_manado", "Manado", "manado", "Sulawesi Utara", "sulawesi-utara"),
  citySeed("city_batam", "Batam", "batam", "Kepulauan Riau", "kepulauan-riau"),
  citySeed("city_tangerang", "Tangerang", "tangerang", "Banten", "banten"),
  citySeed("city_bekasi", "Bekasi", "bekasi", "Jawa Barat", "jawa-barat"),
  citySeed("city_bogor", "Bogor", "bogor", "Jawa Barat", "jawa-barat"),
  citySeed("city_depok", "Depok", "depok", "Jawa Barat", "jawa-barat"),
];

export const adminMasterService = {
  async getBrandMaster(options = {}) {
    const master = await masterDataResource.get(MASTER_BRANDS_KEY, options);
    return normalizeMaster(master);
  },

  async saveBrandMaster(brands = [], options = {}) {
    const master = await masterDataResource.save(MASTER_BRANDS_KEY, {
      schema: "admin.master.brand.v1",
      type: "brand",
      brands: normalizeBrands(brands),
    }, {
      displayName: "Master Brand Mobil",
      bumpVersion: true,
      ...options,
    });
    return normalizeMaster(master);
  },

  async getSidebarMaster(options = {}) {
    const master = await masterDataResource.get(MASTER_SIDEBAR_KEY, options);
    return normalizeSidebarMaster(master);
  },

  async saveSidebarMaster(items = [], options = {}) {
    const normalizedItems = normalizeSidebarItems(items, { repair: false });
    assertValidSidebarItems(normalizedItems);
    const master = await masterDataResource.save(MASTER_SIDEBAR_KEY, {
      schema: "admin.master.sidebar.v1",
      type: "sidebar",
      items: normalizedItems,
    }, {
      displayName: "Master Sidebar",
      bumpVersion: true,
      ...options,
    });
    return normalizeSidebarMaster(master);
  },

  async getBankMaster(options = {}) {
    const master = await masterDataResource.get(MASTER_BANKS_KEY, options);
    return normalizeBankMaster(master);
  },

  async saveBankMaster(banks = [], options = {}) {
    const master = await masterDataResource.save(MASTER_BANKS_KEY, {
      schema: "admin.master.bank.v1",
      type: "bank",
      banks: normalizeBanks(banks),
    }, {
      displayName: "Master Bank",
      bumpVersion: true,
      ...options,
    });
    return normalizeBankMaster(master);
  },

  async getLocationMaster(options = {}) {
    const master = await masterDataResource.get(MASTER_LOCATIONS_KEY, options);
    return normalizeLocationMaster(master);
  },

  async saveLocationMaster(cities = [], options = {}) {
    const master = await masterDataResource.save(MASTER_LOCATIONS_KEY, {
      schema: "admin.master.location.v1",
      type: "location",
      cities: normalizeCities(cities),
    }, {
      displayName: "Master Lokasi",
      bumpVersion: true,
      ...options,
    });
    return normalizeLocationMaster(master);
  },

  normalizeMaster,
  normalizeSidebarMaster,
  normalizeBankMaster,
  normalizeLocationMaster,
  normalizeBrands,
  normalizeSidebarItems,
  normalizeBanks,
  normalizeCities,
  validateSidebarItems,
  assertValidSidebarItems,
  getSidebarChildren,
  createEmptyBrand,
  createEmptyModel,
  createEmptySidebarItem,
  createEmptyBank,
  createEmptyCity,

  filterBrands(brands = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();
    const status = String(filters.status ?? "").trim().toLowerCase();

    return brands.filter((brand) => {
      if (status && String(brand.status ?? "").toLowerCase() !== status) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        brand.name,
        brand.slug,
        brand.description,
        ...(brand.models ?? []).flatMap((model) => [model.name, model.slug]),
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(keyword);
    });
  },

  filterSidebarItems(items = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();
    const role = normalizeSidebarRole(filters.role ?? "");
    const status = String(filters.status ?? "").trim().toLowerCase();

    return items.filter((item) => {
      if (role && item.role !== role) {
        return false;
      }

      if (status === "visible" && !item.is_visible) {
        return false;
      }

      if (status === "hidden" && item.is_visible) {
        return false;
      }

      if (status === "active" && !item.is_active) {
        return false;
      }

      if (status === "inactive" && item.is_active) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        item.key,
        item.label,
        item.route,
        item.icon,
        item.parent_key,
        item.role,
      ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  },

  filterBanks(banks = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();
    const status = String(filters.status ?? "").trim().toLowerCase();

    return banks.filter((bank) => {
      if (status && bank.status !== status) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        bank.bank_name,
        bank.bank_code,
        bank.slug,
        bank.icon_path,
      ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  },

  filterCities(cities = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();
    const status = String(filters.status ?? "").trim().toLowerCase();

    return cities.filter((city) => {
      if (status && city.status !== status) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        city.name,
        city.slug,
        city.province_name,
        city.province_slug,
      ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  },
};

function normalizeMaster(master = null) {
  const hasPersistedBrands = Array.isArray(master?.data?.brands);
  const data = master?.data ?? {};
  return {
    id: master?.id ?? null,
    master_key: master?.master_key ?? MASTER_BRANDS_KEY,
    data: {
      schema: data.schema ?? "admin.master.brand.v1",
      type: data.type ?? "brand",
      brands: normalizeBrands(hasPersistedBrands ? data.brands : DEFAULT_BRAND_SEED),
    },
    version: master?.version ?? null,
    created_at: master?.created_at ?? null,
    updated_at: master?.updated_at ?? null,
    seeded: !hasPersistedBrands,
  };
}

function normalizeSidebarMaster(master = null) {
  const hasPersistedItems = Array.isArray(master?.data?.items);
  const data = master?.data ?? {};
  return {
    id: master?.id ?? null,
    master_key: master?.master_key ?? MASTER_SIDEBAR_KEY,
    data: {
      schema: data.schema ?? "admin.master.sidebar.v1",
      type: data.type ?? "sidebar",
      items: normalizeSidebarItems(hasPersistedItems ? data.items : DEFAULT_SIDEBAR_SEED),
    },
    version: master?.version ?? null,
    created_at: master?.created_at ?? null,
    updated_at: master?.updated_at ?? null,
    seeded: !hasPersistedItems,
  };
}

function normalizeBankMaster(master = null) {
  const hasPersistedBanks = Array.isArray(master?.data?.banks);
  const data = master?.data ?? {};
  return {
    id: master?.id ?? null,
    master_key: master?.master_key ?? MASTER_BANKS_KEY,
    data: {
      schema: data.schema ?? "admin.master.bank.v1",
      type: data.type ?? "bank",
      banks: normalizeBanks(hasPersistedBanks ? data.banks : DEFAULT_BANK_SEED),
    },
    version: master?.version ?? null,
    created_at: master?.created_at ?? null,
    updated_at: master?.updated_at ?? null,
    seeded: !hasPersistedBanks,
  };
}

function normalizeLocationMaster(master = null) {
  const hasPersistedCities = Array.isArray(master?.data?.cities);
  const data = master?.data ?? {};
  return {
    id: master?.id ?? null,
    master_key: master?.master_key ?? MASTER_LOCATIONS_KEY,
    data: {
      schema: data.schema ?? "admin.master.location.v1",
      type: data.type ?? "location",
      cities: normalizeCities(hasPersistedCities ? data.cities : DEFAULT_LOCATION_SEED),
    },
    version: master?.version ?? null,
    created_at: master?.created_at ?? null,
    updated_at: master?.updated_at ?? null,
    seeded: !hasPersistedCities,
  };
}

function normalizeBrands(brands = []) {
  return brands.map((brand, index) => ({
    id: String(brand.id || `brand_${Date.now()}_${index}`),
    name: String(brand.name ?? "").trim(),
    slug: slugify(brand.slug || brand.name || `brand-${index + 1}`),
    status: ["active", "inactive"].includes(brand.status) ? brand.status : "active",
    description: String(brand.description ?? "").trim(),
    models: normalizeModels(brand.models ?? []),
    updated_at: brand.updated_at ?? null,
  })).filter((brand) => brand.name);
}

function normalizeModels(models = []) {
  return models.map((model, index) => ({
    id: String(model.id || `model_${Date.now()}_${index}`),
    name: String(model.name ?? "").trim(),
    slug: slugify(model.slug || model.name || `model-${index + 1}`),
    status: ["active", "inactive"].includes(model.status) ? model.status : "active",
  })).filter((model) => model.name);
}

function normalizeBanks(banks = []) {
  const seen = new Set();
  return banks.map((bank, index) => {
    const bankName = String(bank.bank_name ?? bank.name ?? "").trim();
    const slug = slugify(bank.slug || bankName || `bank-${index + 1}`);
    const normalized = {
      id: String(bank.id || `bank_${Date.now()}_${index}`),
      slug,
      bank_name: bankName,
      bank_code: String(bank.bank_code ?? bank.code ?? "").trim().toUpperCase(),
      icon_path: String(bank.icon_path ?? bank.icon_url ?? "").trim(),
      icon_asset: typeof bank.icon_asset === "object" && bank.icon_asset !== null ? bank.icon_asset : {},
      status: ["active", "inactive"].includes(bank.status) ? bank.status : "active",
      updated_at: bank.updated_at ?? null,
    };
    const key = normalized.slug || normalized.bank_code;
    if (!normalized.bank_name || !normalized.bank_code || seen.has(key)) {
      return null;
    }
    seen.add(key);
    return normalized;
  }).filter(Boolean);
}

function normalizeCities(cities = []) {
  const seen = new Set();
  return cities.map((city, index) => {
    const name = String(city.name ?? city.city_name ?? "").trim();
    const slug = slugify(city.slug || name || `city-${index + 1}`);
    const provinceName = String(city.province_name ?? "").trim();
    const normalized = {
      id: String(city.id || `city_${Date.now()}_${index}`),
      name,
      slug,
      status: ["active", "inactive"].includes(city.status) ? city.status : "active",
      province_name: provinceName,
      province_slug: slugify(city.province_slug || provinceName),
      updated_at: city.updated_at ?? null,
    };
    if (!normalized.name || seen.has(normalized.slug)) {
      return null;
    }
    seen.add(normalized.slug);
    return normalized;
  }).filter(Boolean);
}

function normalizeSidebarItems(items = [], { repair = true } = {}) {
  const normalized = items.map((item, index) => {
    const role = normalizeSidebarRole(item.role ?? "admin") || "admin";
    const label = String(item.label ?? "").trim();
    const key = slugKey(item.key || `${role}.${slugify(label || item.route || `menu-${index + 1}`)}`);
    return {
      id: String(item.id || key || `sidebar_${Date.now()}_${index}`),
      key,
      role,
      label,
      route: String(item.route ?? "").trim(),
      icon: normalizeIconName(item.icon),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
      parent_key: slugKey(item.parent_key ?? ""),
      is_parent: Boolean(item.is_parent),
      is_visible: item.is_visible !== false,
      is_active: item.is_active !== false,
      meta: typeof item.meta === "object" && item.meta !== null ? item.meta : {},
      updated_at: item.updated_at ?? null,
    };
  }).filter((item) => item.key && item.label);

  return repair ? repairSidebarItems(normalized) : normalized;
}

function createEmptyBrand() {
  return {
    id: `brand_${Date.now()}`,
    name: "",
    slug: "",
    status: "active",
    description: "",
    models: [],
  };
}

function createEmptyModel() {
  return {
    id: `model_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: "",
    slug: "",
    status: "active",
  };
}

function createEmptySidebarItem() {
  return {
    id: `sidebar_${Date.now()}`,
    key: "",
    role: "admin",
    label: "",
    route: "",
    icon: "sort",
    order: 10,
    parent_key: "",
    is_parent: false,
    is_visible: true,
    is_active: true,
    meta: {},
  };
}

function createEmptyBank() {
  return {
    id: `bank_${Date.now()}`,
    slug: "",
    bank_name: "",
    bank_code: "",
    icon_path: "",
    icon_asset: {},
    status: "active",
  };
}

function createEmptyCity() {
  return {
    id: `city_${Date.now()}`,
    name: "",
    slug: "",
    status: "active",
    province_name: "",
    province_slug: "",
  };
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function brandSeed(id, name, slug, description, models = []) {
  return {
    id,
    name,
    slug,
    status: "active",
    description,
    models: models.map((modelName) => ({
      id: `model_${slug}_${slugify(modelName)}`,
      name: modelName,
      slug: slugify(modelName),
      status: "active",
    })),
    updated_at: "2026-05-04T00:00:00.000Z",
  };
}

function sidebarSeed(key, role, label, route, icon, order, parentKey = "", isParent = false) {
  return {
    id: `sidebar_${key.replace(/[^a-z0-9]+/g, "_")}`,
    key,
    role,
    label,
    route,
    icon,
    order,
    parent_key: parentKey,
    is_parent: isParent,
    is_visible: true,
    is_active: true,
    meta: {},
    updated_at: "2026-05-04T00:00:00.000Z",
  };
}

function bankSeed(id, bankName, slug, bankCode) {
  return {
    id,
    slug,
    bank_name: bankName,
    bank_code: bankCode,
    icon_path: "",
    icon_asset: {},
    status: "active",
    updated_at: "2026-05-05T00:00:00.000Z",
  };
}

function citySeed(id, name, slug, provinceName = "", provinceSlug = "") {
  return {
    id,
    name,
    slug,
    status: "active",
    province_name: provinceName,
    province_slug: provinceSlug,
    updated_at: "2026-06-18T00:00:00.000Z",
  };
}

function validateSidebarItems(items = []) {
  const normalized = normalizeSidebarItems(items, { repair: false });
  const errors = [];
  const byKey = new Map();
  const keyCounts = new Map();
  const idCounts = new Map();

  normalized.forEach((item) => {
    keyCounts.set(item.key, (keyCounts.get(item.key) ?? 0) + 1);
    idCounts.set(item.id, (idCounts.get(item.id) ?? 0) + 1);
    if (!byKey.has(item.key)) {
      byKey.set(item.key, item);
    }
  });

  keyCounts.forEach((count, key) => {
    if (count > 1) {
      errors.push(`Key menu duplikat: ${key}.`);
    }
  });
  idCounts.forEach((count, id) => {
    if (count > 1) {
      errors.push(`ID menu duplikat: ${id}.`);
    }
  });

  normalized.forEach((item) => {
    if (!["admin", "seller", "affiliate"].includes(item.role)) {
      errors.push(`Role tidak valid untuk ${item.label}.`);
    }

    if (!/^[a-z0-9_.-]+$/.test(item.key)) {
      errors.push(`Key ${item.key} hanya boleh memakai huruf kecil, angka, titik, dash, dan underscore.`);
    }

    if (!Number.isFinite(Number(item.order))) {
      errors.push(`Urutan menu ${item.label} harus berupa angka.`);
    }

    if (!item.is_parent && !isValidSidebarRoute(item.route)) {
      errors.push(`Route wajib valid untuk menu ${item.label}. Gunakan hash route seperti #/admin/users.`);
    }

    if (item.is_parent && item.route && !isValidSidebarRoute(item.route)) {
      errors.push(`Route parent ${item.label} tidak valid.`);
    }

    if (item.parent_key) {
      const parent = byKey.get(item.parent_key);
      if (item.parent_key === item.key) {
        errors.push(`Menu ${item.label} tidak boleh menjadi parent dirinya sendiri.`);
      } else if (!parent) {
        errors.push(`Parent ${item.parent_key} untuk menu ${item.label} tidak ditemukan.`);
      } else {
        if (parent.role !== item.role) {
          errors.push(`Parent ${parent.label} berbeda role dengan menu ${item.label}.`);
        }
        if (!parent.is_parent) {
          errors.push(`Parent ${parent.label} harus ditandai sebagai parent menu.`);
        }
        if (item.is_visible && (!parent.is_visible || !parent.is_active)) {
          errors.push(`Menu ${item.label} tampil, tetapi parent ${parent.label} hidden/nonaktif.`);
        }
      }
    }
  });

  normalized.forEach((item) => {
    if (hasParentCycle(item, byKey)) {
      errors.push(`Relasi parent menu ${item.label} membentuk loop.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    items: normalized,
  };
}

function assertValidSidebarItems(items = []) {
  const result = validateSidebarItems(items);
  if (!result.valid) {
    throw new Error(result.errors.slice(0, 4).join(" "));
  }
  return result.items;
}

function getSidebarChildren(items = [], parentKey = "") {
  const key = slugKey(parentKey);
  return normalizeSidebarItems(items).filter((item) => item.parent_key === key);
}

function repairSidebarItems(items = []) {
  const sourceItems = ensureAdminMasterSidebarChildren(items);
  const firstByKey = new Map();
  sourceItems.forEach((item) => {
    if (!firstByKey.has(item.key)) {
      firstByKey.set(item.key, item);
    }
  });

  return Array.from(firstByKey.values())
    .map((item) => {
      const parent = item.parent_key ? firstByKey.get(item.parent_key) : null;
      const validParent = parent
        && parent.key !== item.key
        && parent.role === item.role
        && parent.is_parent
        && !hasParentCycle(item, firstByKey);
      return {
        ...item,
        route: item.is_parent ? item.route : item.route || "#",
        parent_key: validParent ? item.parent_key : "",
        is_visible: item.parent_key && parent && (!parent.is_visible || !parent.is_active) ? false : item.is_visible,
      };
    })
    .filter((item) => item.is_parent || isValidSidebarRoute(item.route));
}

function ensureAdminMasterSidebarChildren(items = []) {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const master = byKey.get("admin.master");
  const next = [...items];

  if (!byKey.has("admin.sliders")) {
    const sliderOrder = master && Number.isFinite(Number(master.order)) ? Number(master.order) - 1 : 60;
    next.push(sidebarSeed("admin.sliders", "admin", "Slider", "#/admin/sliders", "image", sliderOrder));
  }

  if (!master || master.role !== "admin") {
    return next;
  }

  const now = master.updated_at ?? null;
  const normalized = next.map((item) => item.key === "admin.master"
    ? {
      ...item,
      route: "",
      icon: item.icon || "sort",
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : 70,
      parent_key: "",
      is_parent: true,
    }
    : item);

  if (!byKey.has("admin.master_brand")) {
    normalized.push(sidebarSeed("admin.master_brand", "admin", "Master Brand", "#/admin/master-brand", "car", 10, "admin.master"));
    normalized[normalized.length - 1].updated_at = now;
  }

  if (!byKey.has("admin.master_sidebar")) {
    normalized.push(sidebarSeed("admin.master_sidebar", "admin", "Master Sidebar", "#/admin/master-sidebar", "sitemap", 20, "admin.master"));
    normalized[normalized.length - 1].updated_at = now;
  }

  if (!byKey.has("admin.master_bank")) {
    normalized.push(sidebarSeed("admin.master_bank", "admin", "Master Bank", "#/admin/master-bank", "bank", 30, "admin.master"));
    normalized[normalized.length - 1].updated_at = now;
  }

  if (!byKey.has("admin.master_inspection")) {
    normalized.push(sidebarSeed("admin.master_inspection", "admin", "Master Inspection", "#/admin/master-inspection", "clipboard", 40, "admin.master"));
    normalized[normalized.length - 1].updated_at = now;
  }

  if (!byKey.has("admin.master_location")) {
    normalized.push(sidebarSeed("admin.master_location", "admin", "Master Lokasi", "#/admin/master-location", "location", 50, "admin.master"));
    normalized[normalized.length - 1].updated_at = now;
  }

  return normalized.map((item) => {
    if (item.key === "admin.sliders") {
      return {
        ...item,
        label: item.label || "Slider",
        route: "#/admin/sliders",
        icon: item.icon || "image",
        parent_key: item.parent_key ?? "",
        role: "admin",
        is_parent: false,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : 60,
      };
    }
    if (item.key === "admin.master_brand") {
      return {
        ...item,
        label: item.label || "Master Brand",
        route: "#/admin/master-brand",
        icon: item.icon || "car",
        parent_key: "admin.master",
        role: "admin",
        is_parent: false,
      };
    }
    if (item.key === "admin.master_sidebar") {
      return {
        ...item,
        label: item.label || "Master Sidebar",
        route: "#/admin/master-sidebar",
        icon: item.icon || "sitemap",
        parent_key: "admin.master",
        role: "admin",
        is_parent: false,
      };
    }
    if (item.key === "admin.master_bank") {
      return {
        ...item,
        label: item.label || "Master Bank",
        route: "#/admin/master-bank",
        icon: item.icon || "bank",
        parent_key: "admin.master",
        role: "admin",
        is_parent: false,
      };
    }
    if (item.key === "admin.master_inspection") {
      return {
        ...item,
        label: item.label || "Master Inspection",
        route: "#/admin/master-inspection",
        icon: item.icon || "clipboard",
        parent_key: "admin.master",
        role: "admin",
        is_parent: false,
      };
    }
    if (item.key === "admin.master_location") {
      return {
        ...item,
        label: item.label || "Master Lokasi",
        route: "#/admin/master-location",
        icon: item.icon || "location",
        parent_key: "admin.master",
        role: "admin",
        is_parent: false,
      };
    }
    return item;
  });
}

function hasParentCycle(item, byKey) {
  const seen = new Set([item.key]);
  let cursor = item.parent_key ? byKey.get(item.parent_key) : null;
  while (cursor) {
    if (seen.has(cursor.key)) {
      return true;
    }
    seen.add(cursor.key);
    cursor = cursor.parent_key ? byKey.get(cursor.parent_key) : null;
  }
  return false;
}

function isValidSidebarRoute(route) {
  const value = String(route ?? "").trim();
  return /^#\/[a-z0-9/_-]+(?:\?[a-z0-9_=&%.-]+)?$/i.test(value);
}

function slugKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeIconName(icon) {
  const value = String(icon || "sort").trim();
  return iconRegistry.includes(value) ? value : "sort";
}

function normalizeSidebarRole(role) {
  const normalized = String(role ?? "").trim().toLowerCase();
  if (normalized === "affiliate_admin") {
    return "affiliate";
  }
  return ["admin", "seller", "affiliate"].includes(normalized) ? normalized : "";
}
