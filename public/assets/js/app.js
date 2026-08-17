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

app.bootstrap().catch((error) => {
  console.error("ProjectB app bootstrap failed.", error);
  disposeDomainRouteGuard();
});
