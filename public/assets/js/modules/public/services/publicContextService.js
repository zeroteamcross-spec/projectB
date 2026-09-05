import { brandConfig } from "../../../theme/brandConfig.js";
import { affiliatesResource } from "../../../resources/affiliatesResource.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
import { publicContextState } from "../state/publicContextState.js";
import { persistLastViewedShowroom, persistLastViewedAffiliate } from "../../../utils/lastViewedPublicContext.js";
import { publicReservedRoutePrefixes } from "../../../core/publicReservedRouteWords.js";

const ICON_RELS = ["icon", "shortcut icon", "apple-touch-icon"];
const RESERVED_ROOT_WORD_PATTERN = new RegExp(`^(?:${publicReservedRoutePrefixes.join("|")})$`);

let brandingOriginal = null;
let brandingShowroomId = null;

function applyShowroomBranding(showroom) {
  const iconUrl = String(showroom?.showroom?.icon_url ?? "").trim();
  const tabTitle = String(showroom?.showroom?.tab_title ?? "").trim();

  if (!iconUrl && !tabTitle) {
    return;
  }

  if (brandingOriginal === null) {
    brandingOriginal = {
      title: document.title,
      // null means the tag didn't exist originally, so revert should
      // remove it rather than write back an empty href.
      icons: Object.fromEntries(ICON_RELS.map((rel) => [
        rel,
        document.head.querySelector(`link[rel="${rel}"]`)?.getAttribute("href") ?? null,
      ])),
    };
  }
  brandingShowroomId = showroom?.id ?? null;

  if (tabTitle) {
    document.title = tabTitle;
  }

  if (iconUrl) {
    ICON_RELS.forEach((rel) => upsertShowroomIconLink(rel, iconUrl));
  }
}

function revertShowroomBranding() {
  if (brandingOriginal === null) {
    return;
  }

  document.title = brandingOriginal.title;
  ICON_RELS.forEach((rel) => {
    const originalHref = brandingOriginal.icons[rel];
    if (originalHref === null) {
      document.head.querySelectorAll(`link[rel="${rel.replace(/"/g, '\\"')}"]`).forEach((node) => node.remove());
    } else {
      upsertShowroomIconLink(rel, originalHref);
    }
  });
  brandingOriginal = null;
  brandingShowroomId = null;
}

/**
 * tailwindRuntimeConfig.js (the inline bootstrap script) runs before the
 * server-rendered <link rel="icon"> tags reach the parser, so on some pages
 * two nodes end up sharing the same rel -- one it created, one from the
 * static HTML. querySelector() only ever sees/updates the first, which may
 * not be the one the browser actually renders as the tab icon. Cleaning up
 * the extras here keeps exactly one canonical node per rel from this point
 * on, regardless of how many existed when this first ran.
 */
function upsertShowroomIconLink(rel, href) {
  const selector = `link[rel="${rel.replace(/"/g, '\\"')}"]`;
  const nodes = document.head.querySelectorAll(selector);
  let node = nodes[0];
  if (!node) {
    node = document.createElement("link");
    node.rel = rel;
    document.head.append(node);
  } else {
    nodes.forEach((extra, index) => index > 0 && extra.remove());
  }
  node.href = href;
}

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
      if (activeAffiliate.showroom) {
        applyShowroomBranding({ id: activeAffiliate.showroom.id, showroom: activeAffiliate.showroom });
      }
      persistLastViewedAffiliate(activeAffiliate.slug, activeAffiliate.showroom?.slug ?? "");
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
    if (affiliate.showroom) {
      // affiliate.showroom is the showroom the affiliate SELLS FOR -- same
      // tab title/favicon/header-logo branding a direct showroom visit gets,
      // shaped to what applyShowroomBranding() expects (a `showroom` field
      // nested one level in, matching activateShowroomBySlug()'s object).
      applyShowroomBranding({ id: affiliate.showroom.id, showroom: affiliate.showroom });
    } else if (brandingShowroomId !== null) {
      revertShowroomBranding();
    }
    persistLastViewedAffiliate(affiliate.slug, affiliate.showroom?.slug ?? "");
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
      applyShowroomBranding(activeShowroom);
      persistLastViewedShowroom(activeShowroom.slug);
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
    applyShowroomBranding(showroom);
    persistLastViewedShowroom(showroom.slug);
    return showroom;
  },

  clear() {
    if (brandingShowroomId !== null) {
      revertShowroomBranding();
    }
    publicContextState.setDefault();
  },

  /**
   * Safety net for showroom branding (tab title/favicon/header logo): the
   * pages that activate a showroom's branding (catalog/car-detail/
   * transaction-entry, and now affiliate/marketing catalog pages too) are
   * also the only ones that ever revert it via clear(). Routes outside that
   * set (e.g. the plain landing page) never call syncRouteContext(), so
   * branding -- and the header logo, which reads activeShowroom()/
   * activeAffiliate() straight from state -- would otherwise stay stuck
   * after navigating away. Called from PublicShell on every hash change
   * instead, using the raw path so it works regardless of which page
   * component is mounted.
   */
  syncBrandingFromPath(path = "") {
    const value = String(path ?? "");
    const isLegacyBrandedPath = /^\/(?:showrooms|s|af|a)\//.test(value);
    // Showroom di bentuk baru tidak punya prefix -- satu-satunya penanda
    // adalah segmen pertamanya BUKAN kata cadangan (rute sistem lain semua
    // terdaftar di publicReservedRoutePrefixes). Tanpa ini, tiap
    // pindah-path di halaman showroom-di-root langsung menghapus context
    // yang baru saja diaktifkan activateShowroomBySlug() -- katalog jadi
    // macet di loading terus-menerus.
    const bareMatch = value.match(/^\/([^/]+)/);
    const isBareShowroomPath = Boolean(bareMatch) && !RESERVED_ROOT_WORD_PATTERN.test(bareMatch[1]);
    if (isLegacyBrandedPath || isBareShowroomPath) {
      return;
    }

    if (brandingShowroomId !== null) {
      revertShowroomBranding();
    }

    if (publicContextState.activeShowroom() || publicContextState.activeAffiliate()) {
      publicContextState.setDefault();
    }
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

  // Rute marketing-di-root ("/{showroom}/{marketingSlug}") membawa DUA slug
  // named-group sekaligus -- params.slug adalah showroom yang muncul di URL,
  // params.marketingSlug yang sebenarnya jadi context aktif. Rute lama
  // (/af/:slug, /a/:slug) cuma redirect sekarang (lihat routes.js), jadi
  // param.slug tunggal itu praktis tidak pernah lagi sampai ke sini, tapi
  // fallback-nya dibiarkan sebagai jaring pengaman.
  routeAffiliateSlug(context = {}) {
    const name = String(context.name ?? context.route?.name ?? "");
    const isAffiliateRoute = name.includes("affiliate");

    if (!isAffiliateRoute) {
      return "";
    }

    const slug = String(context.params?.marketingSlug ?? context.params?.slug ?? "").trim().toLowerCase();
    return slug;
  },

  // Cocok dengan catatan di routeAffiliateSlug() -- rute marketing juga
  // punya params.slug (showroom yang tertulis di URL-nya), tapi itu bukan
  // showroom yang sedang "aktif" untuk halaman ini (yang aktif adalah
  // affiliate-nya). Dikembalikan langsung di awal supaya tidak keliru
  // menyalakan activeShowroom() sekaligus activeAffiliate() -- keduanya
  // saling menghapus satu sama lain di publicContextState (lihat
  // setShowroom()/setAffiliate()), jadi dobel-aktifkan ini akan mematikan
  // context marketing yang baru saja dinyalakan.
  routeShowroomSlug(context = {}) {
    const name = String(context.name ?? context.route?.name ?? "");
    if (name.includes("affiliate")) {
      return "";
    }

    const slug = String(context.params?.slug ?? "").trim().toLowerCase();
    if (!slug) {
      return "";
    }

    const path = String(context.path ?? "");
    const isShowroomPath = path.startsWith(`/showrooms/${slug}`) || path.startsWith(`/s/${slug}`)
      || path === `/${slug}` || path.startsWith(`/${slug}/`);
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
      return affiliate.showroom?.slug
        ? `/${encodeURIComponent(affiliate.showroom.slug)}/${encodeURIComponent(affiliate.slug)}`
        : `/af/${encodeURIComponent(affiliate.slug)}`;
    }

    const showroom = this.activeShowroom();
    return showroom?.slug ? `/${encodeURIComponent(showroom.slug)}` : "/";
  },

  carDetailPath(carId) {
    const affiliate = this.activeAffiliate();
    if (affiliate?.slug) {
      return affiliate.showroom?.slug
        ? `/${encodeURIComponent(affiliate.showroom.slug)}/${encodeURIComponent(affiliate.slug)}/cars/${encodeURIComponent(carId)}`
        : `/af/${encodeURIComponent(affiliate.slug)}/cars/${encodeURIComponent(carId)}`;
    }

    const showroom = this.activeShowroom();
    if (showroom?.slug) {
      return `/${encodeURIComponent(showroom.slug)}/cars/${encodeURIComponent(carId)}`;
    }

    return `/cars/${encodeURIComponent(carId)}`;
  },

  transactionEntryPath(carId) {
    const affiliate = this.activeAffiliate();
    if (affiliate?.slug) {
      const base = affiliate.showroom?.slug
        ? `/${encodeURIComponent(affiliate.showroom.slug)}/${encodeURIComponent(affiliate.slug)}`
        : `/af/${encodeURIComponent(affiliate.slug)}`;
      return `${base}/transactions/new?car_id=${encodeURIComponent(carId)}`;
    }

    const showroom = this.activeShowroom();
    if (showroom?.slug) {
      return `/${encodeURIComponent(showroom.slug)}/transactions/new?car_id=${encodeURIComponent(carId)}`;
    }

    return `/transactions/new?car_id=${encodeURIComponent(carId)}`;
  },
};
