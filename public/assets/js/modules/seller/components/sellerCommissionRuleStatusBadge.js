import { Badge } from "../../../ui/primitives/badge.js";
import { sellerAffiliateCommissionService } from "../services/sellerAffiliateCommissionService.js";

export function SellerCommissionRuleStatusBadge(status = "inactive") {
  return Badge(sellerAffiliateCommissionService.statusMeta(status));
}
