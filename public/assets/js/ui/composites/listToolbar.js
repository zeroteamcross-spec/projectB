import { tw } from "../theme/tailwindClasses.js";

export function ListToolbar(children = []) {
  const node = document.createElement("div");
  node.className = `${tw.section.toolbar} grid min-w-0 gap-3 md:flex md:items-center md:justify-between xl:max-w-6xl`;
  node.append(...(Array.isArray(children) ? children : [children]));
  return node;
}
