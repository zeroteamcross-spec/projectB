import { profileRoutes } from "./routes.js";

export const profileManifest = {
  name: "profile",
  roles: ["buyer", "seller", "admin", "affiliate_admin"],
  stateNamespace: "modules.profile",
  initialState: {},
  routes: profileRoutes,
  preload: {
    snapshot: ["profile.me"],
    working: ["profilePage"],
  },
};
