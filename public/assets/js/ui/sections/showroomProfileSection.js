import { Card } from "../composites/card.js";
import { tw } from "../theme/tailwindClasses.js";

export function ShowroomProfileSection({ showroom = null } = {}) {
  const title = document.createElement("strong");
  title.className = "block text-gray-950";
  title.textContent = showroom?.name ?? "Showroom";
  const address = document.createElement("p");
  address.className = `text-sm ${tw.text.muted}`;
  address.textContent = showroom?.address ?? "Alamat belum tersedia";
  return Card([title, address]);
}
