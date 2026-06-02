import { brandConfig } from "../../../theme/brandConfig.js";
import { affiliatesResource } from "../../../resources/affiliatesResource.js";
import { publicContextState } from "../state/publicContextState.js";

const STORAGE_KEY = "projectB:public-context";

export const publicContextService = {
  restore() {
    const raw = safeSessionStorage().getItem(STORAGE_KEY);

    if (!raw) {
      publicContextState.setDefault();
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.mode !== "affiliate" || !parsed.affiliate?.slug) {
        this.clear();
        return null;
      }

      publicContextState.setAffiliate(parsed.affiliate);
      return parsed.affiliate;
    } catch (error) {
      this.clear();
      return null;
    }
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
    const normalizedSlug = String(slug ?? "").trim().toUpperCase();
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
    persist({ mode: "affiliate", affiliate });
    return affiliate;
  },

  clear() {
    publicContextState.setDefault();
    safeSessionStorage().removeItem(STORAGE_KEY);
  },

  clearInvalidSlug(slug) {
    publicContextState.setInvalidSlug(slug);
    safeSessionStorage().removeItem(STORAGE_KEY);
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
        label: affiliate.profile?.name ? `Affiliate ${affiliate.profile.name}` : "Affiliate",
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

function persist(payload) {
  safeSessionStorage().setItem(STORAGE_KEY, JSON.stringify(payload));
}

function safeSessionStorage() {
  try {
    return window.sessionStorage;
  } catch (error) {
    return {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    };
  }
}
