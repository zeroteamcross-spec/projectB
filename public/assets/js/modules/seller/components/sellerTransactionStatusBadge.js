import { Badge } from "../../../ui/primitives/badge.js";
import { sellerTransactionService } from "../services/sellerTransactionService.js";

export function SellerTransactionStatusBadge({ status = "pending_payment" } = {}) {
  const meta = sellerTransactionService.statusMeta(status);
  return Badge({ label: meta.label, variant: meta.variant });
}
