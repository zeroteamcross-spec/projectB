import { Card } from "../composites/card.js";
import { tw } from "../theme/tailwindClasses.js";

export function InspectionSummarySection({ summary = null } = {}) {
  const title = document.createElement("strong");
  title.className = "block text-gray-950";
  title.textContent = "Ringkasan inspeksi";

  const text = document.createElement("p");
  text.className = `text-sm ${tw.text.muted}`;
  text.textContent = summary?.report_status ?? "Belum ada ringkasan aktif.";

  return Card([title, text]);
}
