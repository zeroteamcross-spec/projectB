import { cx, tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../../theme/designStudioHooks.js";

export function Badge({ label, variant = "default", designHook = null } = {}) {
  const node = document.createElement("span");
  node.className = cx(tw.badge.base, tw.badge[variant] ?? tw.badge.default);
  node.textContent = label ?? "-";
  applyDesignHook(node, designHook);
  return node;
}
