import { carsResource } from "../../../resources/carsResource.js";
import { imagesResource } from "../../../resources/imagesResource.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";
import { publicContextService } from "./publicContextService.js";

export const publicCatalogService = {
  async list({ page = 1, limit = 12, filters = {}, affiliateSlug = "" } = {}, options = {}) {
    if (affiliateSlug) {
      const context = await publicContextService.activateAffiliateBySlug(affiliateSlug, options);
      if (!context) {
        return { cars: [], meta: {} };
      }
    }

    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );

    return carsResource.list(publicContextService.applyCatalogFilters({
      page,
      limit,
      ...cleanFilters,
      listing_status: "published",
    }), options);
  },

  async detail(carId, options = {}) {
    if (options.affiliateSlug) {
      const context = await publicContextService.activateAffiliateBySlug(options.affiliateSlug, options);
      if (!context) {
        return null;
      }
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
