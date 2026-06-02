import { Card } from "../../../ui/composites/card.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AffiliateLedgerList({ ledgers = [] } = {}) {
  if (!ledgers.length) {
    return EmptyState({
      title: "Belum ada ledger komisi",
      description: "Komisi affiliate akan muncul di sini saat penjualan mulai dicatat ke ledger.",
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
      textBlock("text-base font-semibold text-gray-950", ledger.transactionCodeLabel),
      textBlock(`text-sm ${tw.text.muted}`, ledger.carLabel),
      textBlock(`text-sm ${tw.text.muted}`, ledger.sellerOwnerLabel),
    );

    const right = document.createElement("div");
    right.className = "grid min-w-0 gap-1 sm:max-w-[18rem] sm:text-right";
    right.append(
      textBlock("text-lg font-bold text-gray-950", ledger.amountLabel),
      textBlock(`text-sm ${tw.text.muted}`, formatDate(ledger.created_at)),
    );

    const grid = document.createElement("div");
    grid.className = `grid min-w-0 gap-2 ${tw.surface.insetGrid} sm:grid-cols-2 xl:grid-cols-3`;
    [
      ["Rule source", ledger.ruleSourceLabel],
      ["Commission type", ledger.commissionTypeLabel],
      ["Rule value", ledger.commissionValueLabel],
      ["Base amount", ledger.baseAmountLabel],
      ["Payment type", ledger.transaction?.payment_type || "-"],
      ["Transaction status", ledger.transaction?.transaction_status || "-"],
      ["Ledger status", ledger.ledgerStatusLabel],
      ["Finality event", ledger.finalityEventLabel],
    ].forEach(([label, value]) => grid.append(infoRow(label, value)));

    if (ledger.notes) {
      const notes = document.createElement("div");
      notes.className = tw.surface.inset;
      notes.append(textBlock("text-sm text-gray-700", ledger.notes));
      card.append(top, grid, notes);
    } else {
      card.append(top, grid);
    }

    top.append(left, right);
    wrap.append(card);
  });

  return wrap;
}

function infoRow(label, value) {
  const row = document.createElement("div");
  row.className = "grid min-w-0 gap-1 rounded-2xl bg-white/90 px-3 py-3 shadow-sm";
  row.append(
    textBlock("break-words text-xs font-semibold uppercase tracking-normal text-gray-500", label),
    textBlock("break-words text-sm font-medium text-gray-900", value),
  );
  return row;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
