import { tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../../theme/designStudioHooks.js";

export function SectionHeader({ title, description = "", action = null, designHook = "shared.section_header" } = {}) {
  const node = document.createElement("div");
  node.className = tw.sectionHeader;
  applyDesignHook(node, designHook);

  const copy = document.createElement("div");
  copy.className = "min-w-0 max-w-3xl";

  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Overview";

  const heading = document.createElement("h1");
  heading.className = tw.text.title;
  heading.textContent = title;
  copy.append(eyebrow, heading);

  if (description) {
    const text = document.createElement("p");
    text.className = `mt-2 max-w-2xl text-sm leading-7 ${tw.text.muted}`;
    text.textContent = description;
    copy.append(text);
  }

  node.append(copy);
  if (action) {
    action.classList?.add?.("max-w-full");
    node.append(action);
  }

  return node;
}
