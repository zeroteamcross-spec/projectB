import { carsResource } from "../../../resources/carsResource.js";
import { imagesResource } from "../../../resources/imagesResource.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";
import { publicContextService } from "./publicContextService.js";

const CATALOG_CACHE_TTL_MS = 30_000;
const catalogCache = new Map();
const catalogInFlight = new Map();

export const publicCatalogService = {
  async list({ page = 1, limit = 12, filters = {}, affiliateSlug = "", showroomSlug = "" } = {}, options = {}) {
    const normalizedAffiliateSlug = normalizeSlug(affiliateSlug);
    const normalizedShowroomSlug = normalizeSlug(showroomSlug);
    let affiliateSellerUserId = null;
    let showroomSellerUserId = null;

    if (normalizedAffiliateSlug) {
      const context = await publicContextService.activateAffiliateBySlug(normalizedAffiliateSlug, options);
      if (!context) {
        return { cars: [], meta: {} };
      }

      affiliateSellerUserId = context.sellerUserId;
    }

    if (normalizedShowroomSlug) {
      const context = await publicContextService.activateShowroomBySlug(normalizedShowroomSlug, options);
      if (!context) {
        return { cars: [], meta: {} };
      }

      showroomSellerUserId = context.sellerUserId;
    }

    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => key !== "brand_names" && value !== "" && value !== null && value !== undefined)
    );

    const scopedFilters = {
      page: positiveInteger(page, 1),
      limit: positiveInteger(limit, 12),
      ...cleanFilters,
      listing_status: "published",
    };

    if (affiliateSellerUserId || showroomSellerUserId) {
      scopedFilters.seller_user_id = affiliateSellerUserId || showroomSellerUserId;
    }

    const requestFilters = (affiliateSellerUserId || showroomSellerUserId)
      ? scopedFilters
      : publicContextService.applyCatalogFilters(scopedFilters);
    const cacheKey = catalogCacheKey({
      affiliateSlug: normalizedAffiliateSlug,
      showroomSlug: normalizedShowroomSlug,
      filters: requestFilters,
    });
    const cached = readCatalogCache(cacheKey);

    if (cached) {
      return cached;
    }

    const pending = catalogInFlight.get(cacheKey);
    if (pending) {
      return pending;
    }

    const request = carsResource.list(requestFilters, options)
      .then((data) => {
        catalogCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
        });
        return data;
      });

    // Route preload requests remain abortable. Calls without a route signal
    // can still share one in-flight request, such as repeated load-more taps.
    if (!options.signal) {
      catalogInFlight.set(cacheKey, request);
      request.then(
        () => catalogInFlight.delete(cacheKey),
        () => catalogInFlight.delete(cacheKey)
      );
    }

    return request;
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

function normalizeSlug(value) {
  return String(value ?? "").trim().toLowerCase();
}

function positiveInteger(value, fallback) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : fallback;
}

function catalogCacheKey({ affiliateSlug = "", showroomSlug = "", filters = {} } = {}) {
  return JSON.stringify({
    affiliateSlug,
    showroomSlug,
    filters: stableValue(filters),
  });
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }

  return value;
}

function readCatalogCache(cacheKey) {
  const entry = catalogCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    catalogCache.delete(cacheKey);
    return null;
  }

  return entry.data;
}
