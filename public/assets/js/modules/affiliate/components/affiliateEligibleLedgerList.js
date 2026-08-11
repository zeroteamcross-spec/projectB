import { Card } from "../../../ui/composites/card.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AffiliateEligibleLedgerList({ ledgers = [] } = {}) {
  if (!ledgers.length) {
    return EmptyState({
      title: "Belum ada ledger eligible",
      description: "Ledger accrual yang siap masuk batch settlement akan muncul di sini.",
    });
  }

  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-3";

  ledgers.forEach((ledger) => {
    const card = Card([], { variant: "raised" });
    card.classList.add("grid", "min-w-0", "gap-4", "overflow-hidden");

    const top = document.createElement("div");
    top.className = "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

    const left = document.createElement("div");
    left.className = "grid min-w-0 gap-1";
    left.append(
      textBlock("text-sm font-semibold text-gray-950", ledger.transactionCodeLabel),
      textBlock(`text-xs ${tw.text.muted}`, ledger.carLabel),
      textBlock(`text-xs ${tw.text.muted}`, ledger.ownerLabel),
    );

    const right = document.createElement("div");
    right.className = "grid min-w-0 gap-1 sm:max-w-[18rem] sm:text-right";
    right.append(
      textBlock("text-base font-bold text-gray-950", ledger.amountLabel),
      textBlock(`text-xs ${tw.text.muted}`, formatDate(ledger.created_at)),
    );

    const meta = document.createElement("div");
    meta.className = `grid min-w-0 gap-2 ${tw.surface.insetGrid} sm:grid-cols-2 xl:grid-cols-4`;
    [
      ["Rule source", ledger.rule_source || "-"],
      ["Commission type", ledger.commission_type || "-"],
      ["Ledger status", ledger.ledger_status || "-"],
      ["Finality event", ledger.finality_event || "-"],
    ].forEach(([label, value]) => meta.append(infoRow(label, value)));

    top.append(left, right);
    card.append(top, meta);
    wrap.append(card);
  });

  return wrap;
}

function infoRow(label, value) {
  const row = document.createElement("div");
  row.className = "grid min-w-0 gap-1 rounded-2xl bg-white/90 px-3 py-3 shadow-sm";
  row.append(
    textBlock("break-words text-[10px] font-semibold uppercase tracking-normal text-gray-500", label),
    textBlock("break-words text-xs font-medium text-gray-900", value),
  );
  return row;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
