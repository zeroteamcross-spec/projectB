import { createProjectBApp } from "./core/app.js";
import { bindDomainRouteGuard } from "./core/domainRouteGuard.js";
import { bindInternalLinkInterceptor } from "./core/router.js";
import { upgradeLegacyHashUrl } from "./core/legacyHashUrl.js";
import { brandConfig } from "./theme/brandConfig.js";

document.title = brandConfig.appName;
upgradeLegacyHashUrl();
const disposeDomainRouteGuard = bindDomainRouteGuard();
bindInternalLinkInterceptor();

const app = createProjectBApp({
  root: "#app",
  toastRoot: "#toast-root",
  modalRoot: "#modal-root",
});

app.bootstrap().catch((error) => {
  console.error("ProjectB app bootstrap failed.", error);
  disposeDomainRouteGuard();
});
