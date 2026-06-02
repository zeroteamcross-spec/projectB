import { cx, tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../../theme/designStudioHooks.js";

export function Button({ label, variant = "primary", disabled = false, onClick = null, designHook = null } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = cx(tw.button.base, tw.button[variant] ?? tw.button.primary);
  button.disabled = disabled;
  button.textContent = label ?? "Aksi";
  applyDesignHook(button, designHook);

  if (onClick) {
    button.addEventListener("click", onClick);
  }

  return button;
}
