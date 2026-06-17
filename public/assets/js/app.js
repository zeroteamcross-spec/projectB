import { createProjectBApp } from "./core/app.js";
import { brandConfig } from "./theme/brandConfig.js";

document.title = brandConfig.appName;

const app = createProjectBApp({
  root: "#app",
  toastRoot: "#toast-root",
  modalRoot: "#modal-root",
});

let resolveInitialRoute;
const initialRouteMounted = new Promise((resolve) => {
  resolveInitialRoute = resolve;
});
const disposeInitialRouteListener = app.bus.on("route:mounted", () => {
  disposeInitialRouteListener();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(resolveInitialRoute);
  });
});

try {
  await app.bootstrap();
  await initialRouteMounted;
} finally {
  window.AppSplash?.hide();
}
