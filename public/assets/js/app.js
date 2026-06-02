import { createProjectBApp } from "./core/app.js";
import { brandConfig } from "./theme/brandConfig.js";

document.title = brandConfig.appName;

const app = createProjectBApp({
  root: "#app",
  toastRoot: "#toast-root",
  modalRoot: "#modal-root",
});

app.bootstrap();
