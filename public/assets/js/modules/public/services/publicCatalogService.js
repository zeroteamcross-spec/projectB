import { carsResource } from "../../../resources/carsResource.js";
import { imagesResource } from "../../../resources/imagesResource.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";
import { publicContextService } from "./publicContextService.js";

const catalogCache = new Map();
const CATALOG_CACHE_TTL = 120000;

export const publicCatalogService = {
  async list({ page = 1, limit = 12, filters = {}, affiliateSlug = "", showroomSlug = "" } = {}, options = {}) {
    let affiliateSellerUserId = null;
    let showroomSellerUserId = null;

    if (affiliateSlug) {
      const context = await publicContextService.activateAffiliateBySlug(affiliateSlug, options);
      if (!context) {
        return { cars: [], meta: {} };
      }

      affiliateSellerUserId = context.sellerUserId;
    }

    if (showroomSlug) {
      const context = await publicContextService.activateShowroomBySlug(showroomSlug, options);
      if (!context) {
        return { cars: [], meta: {} };
      }

      showroomSellerUserId = context.sellerUserId;
    }

    const cleanFilters = normalizeCatalogFilters(filters);

    const scopedFilters = {
      page,
      limit,
      ...cleanFilters,
      listing_status: "published",
    };

    if (affiliateSellerUserId || showroomSellerUserId) {
      scopedFilters.seller_user_id = affiliateSellerUserId || showroomSellerUserId;
    }

    const request = { page: Number(page), limit: Number(limit), filters: cleanFilters, affiliateSlug: String(affiliateSlug ?? ""), showroomSlug: String(showroomSlug ?? "") };
    const cacheKey = JSON.stringify({ ...request, sellerUserId: Number(affiliateSellerUserId || showroomSellerUserId || 0) });
    const cached = catalogCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CATALOG_CACHE_TTL) {
      return cached.data;
    }

    const data = await carsResource.list(
      (affiliateSellerUserId || showroomSellerUserId) ? scopedFilters : publicContextService.applyCatalogFilters(scopedFilters),
      options
    );
    catalogCache.set(cacheKey, { data, fetchedAt: Date.now(), request });
    return data;
  },

  cachedList({ page = 1, limit = 12, filters = {}, affiliateSlug = "", showroomSlug = "" } = {}) {
    const request = { page: Number(page), limit: Number(limit), filters: normalizeCatalogFilters(filters), affiliateSlug: String(affiliateSlug ?? ""), showroomSlug: String(showroomSlug ?? "") };
    for (const entry of catalogCache.values()) {
      if (entry.request && JSON.stringify(entry.request) === JSON.stringify(request) && Date.now() - entry.fetchedAt < CATALOG_CACHE_TTL) {
        return entry.data;
      }
    }
    return null;
  },

  async detail(carId, options = {}) {
    let scopedSellerUserId = null;

    if (options.affiliateSlug) {
      const context = await publicContextService.activateAffiliateBySlug(options.affiliateSlug, options);
      if (!context) {
        return null;
      }

      scopedSellerUserId = context.sellerUserId;
    }

    if (options.showroomSlug) {
      const context = await publicContextService.activateShowroomBySlug(options.showroomSlug, options);
      if (!context) {
        return null;
      }

      scopedSellerUserId = context.sellerUserId;
    }

    let car = null;

    try {
      car = await carsResource.detail(carId, options);
    } catch (error) {
      if (error.status === 404) {
        return null;
      }

      throw error;
    }

    if (!car) {
      return null;
    }

    if (scopedSellerUserId && Number(car.seller_user_id) !== Number(scopedSellerUserId)) {
      return null;
    }

    const [imagesResult, inspectionResult] = await Promise.allSettled([
      imagesResource.listByCar(carId, options),
      inspectionsResource.byCar(carId, options),
    ]);

    const images = imagesResult.status === "fulfilled" ? imagesResult.value : [];
    const inspection = inspectionResult.status === "fulfilled" ? inspectionResult.value : null;

    return {
      car: {
        ...car,
        images: images.length ? images : car.images ?? [],
      },
      images,
      inspection,
    };
  },
};

function normalizeCatalogFilters(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([key, value]) => key !== "brand_names" && value !== "" && value !== null && value !== undefined),
  );
}
