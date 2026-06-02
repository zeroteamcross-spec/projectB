import { StateEngine } from "./stateEngine.js";

export const appStore = new StateEngine({
  app: {
    bootstrapped: false,
    activeRole: "public",
    currentRoute: null,
    routeHydrateError: null,
    resourceVersions: {},
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
    sidebarCompactExpanded: false,
  },
  snapshot: {},
  working: {},
  runtime: {},
});

export { StateEngine };
