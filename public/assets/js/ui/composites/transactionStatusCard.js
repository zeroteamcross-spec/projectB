import { Card } from "./card.js";
import { Badge } from "../primitives/badge.js";

export function TransactionStatusCard({ transaction = {} } = {}) {
  const title = document.createElement("strong");
  title.className = "block text-gray-950";
  title.textContent = transaction.transaction_code ?? `Transaksi #${transaction.id ?? "-"}`;
  return Card([title, Badge({ label: transaction.transaction_status ?? "pending_payment" })]);
}
