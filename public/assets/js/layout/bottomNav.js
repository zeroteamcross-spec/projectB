import { topNav } from "./topNav.js";

export function bottomNav(items = []) {
  const nav = topNav(items);
  return nav;
}
