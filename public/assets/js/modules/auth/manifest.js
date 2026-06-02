import { authRoutes } from "./routes.js";

export const authManifest = {
  name: "auth",
  roles: ["public", "buyer", "seller", "admin", "affiliate_admin"],
  stateNamespace: "modules.auth",
  initialState: {},
  routes: authRoutes,
  preload: {
    snapshot: [],
    working: [],
  },
};
