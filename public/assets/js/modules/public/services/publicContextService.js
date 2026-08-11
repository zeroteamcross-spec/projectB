import { brandConfig } from "../../../theme/brandConfig.js";
import { affiliatesResource } from "../../../resources/affiliatesResource.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
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

  activeShowroom() {
    return publicContextState.activeShowroom();
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

    const activeAffiliate = this.activeAffiliate();
    if (activeAffiliate?.slug?.toLowerCase?.() === normalizedSlug && activeAffiliate.sellerUserId) {
      return activeAffiliate;
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

  async activateShowroomBySlug(slug, options = {}) {
    const normalizedSlug = String(slug ?? "").trim().toLowerCase();
    if (!normalizedSlug) {
      this.clear();
      return null;
    }

    const activeShowroom = this.activeShowroom();
    if (activeShowroom?.slug?.toLowerCase?.() === normalizedSlug && activeShowroom.sellerUserId) {
      return activeShowroom;
    }

    const result = await showroomsResource.validateSlug(normalizedSlug, options);
    if (!result?.is_valid || !result?.seller_user_id) {
      this.clearInvalidSlug(normalizedSlug);
      return null;
    }

    const showroom = {
      id: Number(result.showroom?.id ?? 0),
      slug: result.slug ?? result.showroom?.slug ?? normalizedSlug,
      sellerUserId: Number(result.seller_user_id),
      contactWhatsapp: result.contact_whatsapp ?? result?.showroom?.phone_number ?? result?.seller?.phone_number ?? "",
      seller: result.seller ?? null,
      showroom: result.showroom ?? null,
    };

    publicContextState.setShowroom(showroom);
    return showroom;
  },

  clear() {
    publicContextState.setDefault();
  },

  clearInvalidSlug(slug) {
    publicContextState.setInvalidSlug(slug);
  },

  syncRouteContext(context = {}) {
    if (this.routeAffiliateSlug(context) || this.routeShowroomSlug(context)) {
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

  routeShowroomSlug(context = {}) {
    const slug = String(context.params?.slug ?? "").trim().toLowerCase();
    if (!slug) {
      return "";
    }

    const path = String(context.path ?? "");
    const name = String(context.name ?? context.route?.name ?? "");
    const isShowroomPath = path.startsWith(`/showrooms/${slug}`) || path.startsWith(`/s/${slug}`);
    const isShowroomRoute = name.includes("showroom");
    return isShowroomPath || isShowroomRoute ? slug : "";
  },

  applyCatalogFilters(filters = {}) {
    const affiliate = this.activeAffiliate();

    if (!affiliate?.sellerUserId) {
      const showroom = this.activeShowroom();

      if (!showroom?.sellerUserId) {
        return { ...filters };
      }

      return {
        ...filters,
        seller_user_id: showroom.sellerUserId,
      };
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

    const showroom = this.activeShowroom();
    if (showroom?.contactWhatsapp) {
      return {
        phone: showroom.contactWhatsapp,
        label: showroom.showroom?.name ? `Showroom ${showroom.showroom.name}` : "Showroom",
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
    if (affiliate?.slug) {
      return `/af/${encodeURIComponent(affiliate.slug)}`;
    }

    const showroom = this.activeShowroom();
    return showroom?.slug ? `/showrooms/${encodeURIComponent(showroom.slug)}` : "/";
  },

  carDetailPath(carId) {
    const affiliate = this.activeAffiliate();
    if (affiliate?.slug) {
      return `/af/${encodeURIComponent(affiliate.slug)}/cars/${encodeURIComponent(carId)}`;
    }

    const showroom = this.activeShowroom();
    if (showroom?.slug) {
      return `/showrooms/${encodeURIComponent(showroom.slug)}/cars/${encodeURIComponent(carId)}`;
    }

    return `/cars/${encodeURIComponent(carId)}`;
  },

  transactionEntryPath(carId) {
    const affiliate = this.activeAffiliate();
    if (affiliate?.slug) {
      return `/af/${encodeURIComponent(affiliate.slug)}/transactions/new?car_id=${encodeURIComponent(carId)}`;
    }

    const showroom = this.activeShowroom();
    if (showroom?.slug) {
      return `/showrooms/${encodeURIComponent(showroom.slug)}/transactions/new?car_id=${encodeURIComponent(carId)}`;
    }

    return `/transactions/new?car_id=${encodeURIComponent(carId)}`;
  },
};
