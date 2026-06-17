import { createProjectBApp } from "./core/app.js";
import { bindDomainRouteGuard } from "./core/domainRouteGuard.js";
import { brandConfig } from "./theme/brandConfig.js";

document.title = brandConfig.appName;
const disposeDomainRouteGuard = bindDomainRouteGuard();

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
  .then(() => initialRouteMounted)
  .catch((error) => {
    console.error("ProjectB app bootstrap failed.", error);
    disposeDomainRouteGuard();
  })
  .finally(() => {
    window.AppSplash?.hide();
  });
