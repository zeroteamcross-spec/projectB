import { cx, tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../../theme/designStudioHooks.js";

export function Card(children = [], options = {}) {
  const node = document.createElement("article");
  node.className = cx(
    options.variant === "raised" ? tw.surface.raisedCard : tw.surface.card,
    options.className ?? ""
  );
  applyDesignHook(node, options.designHook ?? null);
  node.append(...(Array.isArray(children) ? children : [children]));
  return node;
}
