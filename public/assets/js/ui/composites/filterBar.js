import { tw } from "../theme/tailwindClasses.js";

export function FilterBar(children = []) {
  const node = document.createElement("div");
  node.className = `${tw.section.toolbar} grid min-w-0 gap-3 xl:max-w-5xl`;
  node.append(...(Array.isArray(children) ? children : [children]));
  return node;
}
