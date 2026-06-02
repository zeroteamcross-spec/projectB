import { tw } from "../ui/theme/tailwindClasses.js";

export function pageFrame() {
  const node = document.createElement("section");
  node.className = tw.layout.pageFrame;
  node.id = "page-outlet";
  return node;
}
