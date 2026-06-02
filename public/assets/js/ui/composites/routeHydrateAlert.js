import { Button } from "../primitives/button.js";
import { tw } from "../theme/tailwindClasses.js";

export function RouteHydrateAlert({ error = null, onDismiss = null } = {}) {
  if (!error) {
    return null;
  }

  const panel = document.createElement("section");
  panel.className = tw.alert.error;

  const top = document.createElement("div");
  top.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const copy = document.createElement("div");
  copy.className = "grid gap-1";

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700";
  eyebrow.textContent = "Route hydrate";

  const title = document.createElement("strong");
  title.className = "text-sm font-semibold text-red-900";
  title.textContent = "Hydrate route gagal";

  const path = document.createElement("p");
  path.className = tw.alert.errorMeta;
  path.textContent = error.path
    ? `Route: ${error.path}${error.routeName ? ` | ${error.routeName}` : ""}`
    : "Route aktif gagal dihydrate.";

  const message = document.createElement("p");
  message.className = "text-sm text-red-700/90";
  message.textContent = error.message || "Terjadi kegagalan saat menyiapkan data page.";

  copy.append(eyebrow, title, path, message);
  top.append(copy);

  if (typeof onDismiss === "function") {
    const action = Button({
      label: "Tutup",
      variant: "secondary",
      onClick: onDismiss,
    });
    action.classList.add("w-fit");
    top.append(action);
  }

  panel.append(top);
  return panel;
}
