import { Badge } from "../../../ui/primitives/badge.js";
import { getListingStatusMeta } from "../../../utils/transactionStatus.js";

export function SellerListingStatusBadge({ status = "draft" } = {}) {
  const meta = getListingStatusMeta(status);
  return Badge({ label: meta.label, variant: meta.variant });
}
