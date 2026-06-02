import { sellerRoutes } from "./routes.js";
import { SellerDashboardPage } from "./pages/dashboardPage.js";

export const sellerManifest = {
  name: "seller",
  roles: ["seller"],
  stateNamespace: "modules.seller",
  initialState: {
    selectedCarId: null,
  },
  routes: sellerRoutes,
  pages: {
    notFound: () => SellerDashboardPage({ notFound: true }),
  },
  preload: {
    snapshot: ["seller.showroom", "seller.cars", "seller.transactions", "seller.affiliates", "seller.affiliate-commissions", "seller.inspectionOverview", "seller.masterSidebar", "seller.masterBank", "seller.masterBrand"],
    working: ["sellerDashboard", "sellerAffiliates", "sellerAffiliateCommissions", "sellerInspection"],
  },
};
