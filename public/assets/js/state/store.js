import { StateEngine } from "./stateEngine.js";

export const appStore = new StateEngine({
  app: {
    bootstrapped: false,
    activeRole: "public",
    // Cabang showroom yang sedang dikelola seller (fitur multi-cabang) --
    // sama sekali tidak dikirim server. Nilai awalnya selalu null di sini;
    // modules/seller/state/activeShowroom.js yang membaca/menulis nilai
    // sesungguhnya (localStorage, supaya bertahan lewat reload penuh) dan
    // memakai slot ini murni sebagai cache in-memory. null berarti belum
    // pernah dipilih/seller cuma punya satu cabang (jalur lama, tidak
    // berubah).
    activeShowroomId: null,
    currentRoute: null,
    routeHydrateError: null,
    resourceVersions: {},
    release: {
      manifest: null,
      latestVersion: null,
      appliedVersion: null,
      updateAvailable: false,
      checkedAt: null,
      error: null,
    },
  },
  auth: {
    user: null,
    actor: null,
    impersonation: null,
    isAuthenticated: false,
    role: "public",
  },
  ui: {
    loading: false,
    modal: null,
    toasts: [],
    sidebarOpen: false,
    sidebarCollapsed: false,
  },
  snapshot: {},
  working: {},
  runtime: {},
});

export { StateEngine };
