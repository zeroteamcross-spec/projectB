import { tw } from "../theme/tailwindClasses.js";

export function Tabs({ items = [], active = "", onChange = null } = {}) {
  const node = document.createElement("div");
  node.className = tw.tabs.list;
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = item.value === active
      ? tw.tabs.active
      : tw.tabs.idle;
    button.textContent = item.label;
    button.dataset.value = item.value;
    button.disabled = item.value === active;
    button.addEventListener("click", () => onChange?.(item.value));
    node.append(button);
  });
  return node;
}
