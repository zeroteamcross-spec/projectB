import { EmptyState } from "../primitives/emptyState.js";
import { Card } from "../composites/card.js";
import { Badge } from "../primitives/badge.js";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { tw } from "../theme/tailwindClasses.js";

export function TransactionListSection({ transactions = [], onOpen = null } = {}) {
  if (!transactions.length) {
    return EmptyState({ title: "Transaksi belum ada" });
  }

  const list = document.createElement("div");
  list.className = tw.surface.grid;
  transactions.forEach((transaction) => {
    const card = Card();
    card.classList.add("transition", tw.interactive.hoverBorder);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "grid w-full gap-2 text-left";
    button.addEventListener("click", () => onOpen?.(transaction));

    const title = document.createElement("strong");
    title.className = "block text-gray-950";
    title.textContent = transaction.transaction_code ?? `Transaksi #${transaction.id}`;
    const amount = document.createElement("p");
    amount.className = "text-xs text-gray-600";
    amount.textContent = formatCurrency(transaction.car_price ?? transaction.dp_amount);
    button.append(title, Badge({ label: transaction.transaction_status }), amount);
    card.append(button);
    list.append(card);
  });
  return list;
}
