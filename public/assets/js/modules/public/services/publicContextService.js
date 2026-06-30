import { brandConfig } from "../../../theme/brandConfig.js";
import { affiliatesResource } from "../../../resources/affiliatesResource.js";
import { publicContextState } from "../state/publicContextState.js";

export const publicContextService = {
  restore() {
    publicContextState.setDefault();
    return null;
  },

  current() {
    return publicContextState.current();
  },

  activeAffiliate() {
    return publicContextState.activeAffiliate();
  },

  isAffiliateActive() {
    return publicContextState.isAffiliateActive();
  },

  invalidSlug() {
    return publicContextState.invalidSlug();
  },

  async activateAffiliateBySlug(slug, options = {}) {
    const normalizedSlug = String(slug ?? "").trim().toLowerCase();
    if (!normalizedSlug) {
      this.clear();
      return null;
    }

    const result = await affiliatesResource.validateReferralCode(normalizedSlug, options);
    if (!result?.is_valid || !result?.affiliate_id || !result?.seller_user_id) {
      this.clearInvalidSlug(normalizedSlug);
      return null;
    }

    const affiliate = {
      id: Number(result.affiliate_id),
      slug: result.referral_code ?? normalizedSlug,
      sellerUserId: Number(result.seller_user_id),
      contactWhatsapp: result.contact_whatsapp ?? result?.affiliate?.phone_number ?? result?.showroom?.phone_number ?? result?.seller?.phone_number ?? "",
      profile: result.affiliate ?? null,
      seller: result.seller ?? null,
      showroom: result.showroom ?? null,
    };

    publicContextState.setAffiliate(affiliate);
    return affiliate;
  },

  clear() {
    publicContextState.setDefault();
  },

  clearInvalidSlug(slug) {
    publicContextState.setInvalidSlug(slug);
  },

  syncRouteContext(context = {}) {
    if (this.routeAffiliateSlug(context)) {
      return;
    }

    this.clear();
  },

  routeAffiliateSlug(context = {}) {
    const slug = String(context.params?.slug ?? "").trim().toLowerCase();
    if (!slug) {
      return "";
    }

    const path = String(context.path ?? "");
    const name = String(context.name ?? context.route?.name ?? "");
    const isAffiliatePath = path.startsWith(`/af/${slug}`) || path.startsWith(`/a/${slug}`);
    const isAffiliateRoute = name.includes("affiliate");
    return isAffiliatePath || isAffiliateRoute ? slug : "";
  },

  applyCatalogFilters(filters = {}) {
    const affiliate = this.activeAffiliate();

    if (!affiliate?.sellerUserId) {
      return { ...filters };
    }

    return {
      ...filters,
      seller_user_id: affiliate.sellerUserId,
    };
  },

  resolveWhatsAppTarget(car = null) {
    const affiliate = this.activeAffiliate();

    if (affiliate?.contactWhatsapp) {
      return {
        phone: affiliate.contactWhatsapp,
        label: affiliate.profile?.name ? `Affiliate ${affiliate.profile.name}` : "Marketing",
      };
    }

    const listingPhone = car?.whatsapp_number ?? car?.seller_whatsapp ?? car?.showroom_whatsapp ?? "";
    if (listingPhone) {
      return {
        phone: listingPhone,
        label: "Listing",
      };
    }

    return {
      phone: brandConfig.contact?.whatsapp ?? "",
      label: "Default",
    };
  },

  catalogPath() {
    const affiliate = this.activeAffiliate();
    return affiliate?.slug ? `/af/${encodeURIComponent(affiliate.slug)}` : "/";
  },

  carDetailPath(carId) {
    const affiliate = this.activeAffiliate();
    if (affiliate?.slug) {
      return `/af/${encodeURIComponent(affiliate.slug)}/cars/${encodeURIComponent(carId)}`;
    }

    return `/cars/${encodeURIComponent(carId)}`;
  },

  transactionEntryPath(carId) {
    const affiliate = this.activeAffiliate();
    if (affiliate?.slug) {
      return `/af/${encodeURIComponent(affiliate.slug)}/transactions/new?car_id=${encodeURIComponent(carId)}`;
    }

    return `/transactions/new?car_id=${encodeURIComponent(carId)}`;
  },
};
