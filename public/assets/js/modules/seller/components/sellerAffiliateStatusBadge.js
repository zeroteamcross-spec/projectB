import { Badge } from "../../../ui/primitives/badge.js";
import { sellerAffiliateService } from "../services/sellerAffiliateService.js";

export function SellerAffiliateStatusBadge(status = "") {
  return Badge(sellerAffiliateService.statusMeta(status));
}
