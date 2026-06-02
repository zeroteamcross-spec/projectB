import { Badge } from "../../../ui/primitives/badge.js";
import { adminSettlementService } from "../services/adminSettlementService.js";

export function AdminSettlementStatusBadge({ status = "" } = {}) {
  const meta = adminSettlementService.statusMeta(status);
  return Badge({
    label: meta.label,
    variant: meta.variant,
  });
}
