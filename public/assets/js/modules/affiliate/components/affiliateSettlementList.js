import { Card } from "../../../ui/composites/card.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { AffiliateSettlementStatusBadge } from "./affiliateSettlementStatusBadge.js";

export function AffiliateSettlementList({ settlements = [] } = {}) {
  if (!settlements.length) {
    return EmptyState({
      title: "Belum ada batch settlement",
      description: "Saat admin membuat settlement batch manual, riwayatnya akan muncul di sini.",
    });
  }

  const wrap = document.createElement("div");
  wrap.id = "aff_settlement_list_section";
  wrap.className = "grid min-w-0 gap-3";

  settlements.forEach((settlement) => {
    const card = Card([], { variant: "raised" });
    card.id = `aff_settlement_${settlement.id}_section`;
    card.dataset.settlementStatus = settlement.status ?? "";
    card.classList.add("grid", "min-w-0", "gap-4", "overflow-hidden");

    const top = document.createElement("div");
    top.className = "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

    const left = document.createElement("div");
    left.className = "grid min-w-0 gap-2";

    const title = document.createElement("div");
    title.className = "flex min-w-0 flex-wrap items-center gap-2";
    title.append(
      textBlock("text-sm font-semibold text-gray-950", `Settlement #${settlement.id}`),
      AffiliateSettlementStatusBadge({ status: settlement.status }),
    );

    left.append(
      title,
      textBlock(`text-xs ${tw.text.muted}`, `${settlement.ledger_count} ledger | diminta ${formatDate(settlement.requested_at)}`),
    );

    if (settlement.notes) {
      left.append(textBlock(`text-xs ${tw.text.muted}`, settlement.notes));
    }

    const right = document.createElement("div");
    right.className = "grid min-w-0 gap-1 sm:max-w-[18rem] sm:text-right";
    right.append(
      textBlock("text-base font-bold text-gray-950", settlement.requestedAmountLabel),
      textBlock(`text-xs ${tw.text.muted}`, settlement.settled_at ? `Settled ${formatDate(settlement.settled_at)}` : settlement.cancelled_at ? `Cancelled ${formatDate(settlement.cancelled_at)}` : "Menunggu settlement"),
    );

    top.append(left, right);
    card.append(top);
    wrap.append(card);
  });

  return wrap;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
