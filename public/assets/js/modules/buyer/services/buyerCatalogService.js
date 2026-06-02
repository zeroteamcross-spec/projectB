import { carsResource } from "../../../resources/carsResource.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";

export const buyerCatalogService = {
  list(filters = {}, options = {}) {
    return carsResource.list({ listing_status: "published", ...filters }, options);
  },

  detail(carId, options = {}) {
    return carsResource.detail(carId, options);
  },

  inspection(carId, options = {}) {
    return inspectionsResource.byCar(carId, options).catch(() => null);
  },
};
