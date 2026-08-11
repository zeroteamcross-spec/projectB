import { Card } from "../../../ui/composites/card.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AffiliateActivityPanel({ affiliate = null } = {}) {
  const card = Card();
  card.classList.add("grid", "min-w-0", "gap-4", "overflow-hidden");
  card.id = "affiliate-activity-panel";

  const title = document.createElement("h2");
  title.className = `${tw.text.sectionTitle} min-w-0 break-words`;
  title.textContent = "Ringkasan aktivitas";

  const body = document.createElement("div");
  body.className = "grid min-w-0 gap-3";

  if (!Array.isArray(affiliate?.recent_ledgers) || affiliate.recent_ledgers.length === 0) {
    body.append(EmptyState({
      title: "Aktivitas detail belum banyak",
      description: "Klik total dan agregat komisi sudah nyata. Riwayat ledger detail akan muncul di sini saat komisi mulai tercatat.",
    }));
  } else {
    affiliate.recent_ledgers.forEach((ledger) => {
      const item = document.createElement("div");
      item.className = `grid min-w-0 gap-1 ${tw.surface.inset}`;

      const heading = document.createElement("div");
      heading.className = "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between";

      const label = document.createElement("p");
      label.className = "break-words font-semibold text-gray-950";
      label.textContent = `${ledger.entry_type} | ${formatCurrency(ledger.amount)}`;

      const date = document.createElement("p");
      date.className = "text-xs text-gray-500";
      date.textContent = formatDate(ledger.created_at);

      const notes = document.createElement("p");
      notes.className = "break-words text-xs leading-6 text-gray-600";
      notes.textContent = ledger.notes || (ledger.transaction_id ? `Terkait transaksi #${ledger.transaction_id}` : "Belum ada catatan tambahan.");

      heading.append(label, date);
      item.append(heading, notes);
      body.append(item);
    });
  }

  card.append(title, body);
  return card;
}
