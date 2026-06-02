import { Badge } from "../../../ui/primitives/badge.js";
import { adminTransactionMonitoringService } from "../services/adminTransactionMonitoringService.js";

export function AdminTransactionStatusBadge({ status = "pending_payment" } = {}) {
  const meta = adminTransactionMonitoringService.statusMeta(status);
  return Badge({ label: meta.label, variant: meta.variant });
}
