import { authStore } from "../state/authStore.js";
import { affiliateDashboardResource } from "../resources/affiliateDashboardResource.js";
import { getBuyerShowroomCatalogUrl } from "../utils/buyerShowroomUrl.js";
import { navigateTo } from "../core/router.js";

/**
 * Klik logo header/sidebar membuka katalog publik showroom -- tapi "showroom
 * milik sendiri" berarti hal berbeda per role: buyer adalah pelanggan satu
 * showroom (users.home_showroom_slug), marketing mempromosikan satu showroom
 * (affiliate.showroom.slug dari /affiliate/me). Seller sengaja tidak
 * termasuk di sini -- dashboard mereka sendiri sudah jadi tujuan default.
 */
const ROLES_WITH_OWN_SHOWROOM = new Set(["buyer", "affiliate_admin"]);

let cachedAffiliateSlug = null;
let cachedAffiliatePromise = null;

export function hasOwnShowroomLink(role) {
  return ROLES_WITH_OWN_SHOWROOM.has(role);
}

export async function navigateToOwnShowroom() {
  const role = authStore.role();

  if (role === "buyer") {
    const slug = String(authStore.user()?.home_showroom_slug ?? "").trim();
    const path = slug ? `/s/${encodeURIComponent(slug)}` : getBuyerShowroomCatalogUrl();
    if (path) {
      navigateTo(path);
    }
    return;
  }

  if (role === "affiliate_admin") {
    const slug = await resolveAffiliateShowroomSlug();
    if (slug) {
      navigateTo(`/showrooms/${encodeURIComponent(slug)}`);
    }
  }
}

async function resolveAffiliateShowroomSlug() {
  if (cachedAffiliateSlug) {
    return cachedAffiliateSlug;
  }

  cachedAffiliatePromise ??= affiliateDashboardResource.me().catch(() => null);
  const affiliate = await cachedAffiliatePromise;
  const slug = affiliate?.showroom?.slug ?? "";

  if (slug) {
    cachedAffiliateSlug = slug;
  }

  return slug;
}
