import { initialNotificationState } from "./state/notificationState.js";
import { notificationRoutes } from "./routes.js";

export const notificationsManifest = {
  name: "notifications",
  roles: ["buyer", "seller", "admin", "affiliate_admin"],
  stateNamespace: "modules.notifications",
  initialState: initialNotificationState,
  routes: notificationRoutes,
  preload: {
    snapshot: ["notifications.snapshot"],
    working: ["notifications"],
  },
};
