import { createIcon } from "../theme/iconRegistry.js";
import { tw } from "../theme/tailwindClasses.js";

export function topNav(items = []) {
  const nav = document.createElement("nav");
  nav.className = tw.layout.nav;
  items.forEach((item) => {
    const anchor = document.createElement("a");
    anchor.href = item.href;
    anchor.className = tw.layout.navLink;
    if (item.icon) {
      anchor.append(createIcon(item.icon, { className: tw.layout.navIcon }));
    }
    anchor.append(document.createTextNode(item.label));
    nav.append(anchor);
  });
  return nav;
}
