import { Badge } from "../../../ui/primitives/badge.js";
import { affiliateSettlementService } from "../services/affiliateSettlementService.js";

export function AffiliateSettlementStatusBadge({ status = "" } = {}) {
  const meta = affiliateSettlementService.statusMeta(status);
  return Badge({
    label: meta.label,
    variant: meta.variant,
  });
}
