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
  window.setTimeout(resolveInitialRoute, 32);
});

app.bootstrap()
  .then(() => Promise.race([
    initialRouteMounted,
    new Promise((resolve) => window.setTimeout(resolve, 1600)),
  ]))
  .catch((error) => {
    console.error("ProjectB app bootstrap failed.", error);
  })
  .finally(() => {
    window.AppSplash?.hide();
  });
