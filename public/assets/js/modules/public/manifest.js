import { publicRoutes } from "./routes.js";
import { PublicCatalogPage } from "./pages/catalogPage.js";

export const publicManifest = {
  name: "public",
  roles: ["public", "buyer", "seller", "admin", "affiliate_admin"],
  stateNamespace: "modules.public",
  initialState: {
    catalog: {
      filters: {
        keyword: "",
        brand_name: "",
        transmission: "",
        location_name: "",
        location_names: [],
        min_price_cash: "",
        max_price_cash: "",
      },
      quickFilter: "newest",
      page: 1,
      limit: 12,
      isFilterOpen: false,
      selectedCarId: null,
    },
    context: {
      mode: "default",
      affiliate: null,
      invalidSlug: "",
      hydratedAt: 0,
    },
  },
  routes: publicRoutes,
  pages: {
    notFound: () => PublicCatalogPage({ notFound: true }),
  },
  preload: {
    snapshot: ["public.catalog", "public.slidersPublicHome", "public.slidersLandingHero", "public.masterLocation"],
    working: ["publicCatalog"],
  },
};
