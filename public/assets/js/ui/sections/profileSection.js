import { Card } from "../composites/card.js";
import { tw } from "../theme/tailwindClasses.js";

export function ProfileSection({ user = null } = {}) {
  const title = document.createElement("strong");
  title.className = "block text-gray-950";
  title.textContent = user?.name ?? "Guest";

  const detail = document.createElement("p");
  detail.className = `text-xs ${tw.text.muted}`;
  detail.textContent = user?.email ?? "Belum login";

  return Card([title, detail]);
}
