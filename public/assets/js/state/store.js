import { StateEngine } from "./stateEngine.js";

export const appStore = new StateEngine({
  app: {
    bootstrapped: false,
    activeRole: "public",
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
