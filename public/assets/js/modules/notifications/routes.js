import { NotificationsPage } from "./pages/notificationsPage.js";

export const notificationRoutes = [
  {
    name: "notifications.index",
    path: "/notifications",
    shell: "app",
    authRequired: true,
    page: NotificationsPage,
    workingStateKey: "notifications",
  },
];
