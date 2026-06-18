import { buyerRoutes } from "./routes.js";
import { BuyerDashboardPage } from "./pages/dashboardPage.js";

export const buyerManifest = {
  name: "buyer",
  roles: ["buyer"],
  stateNamespace: "modules.buyer",
  initialState: {
    filters: {},
    selectedCarId: null,
  },
  routes: buyerRoutes,
  pages: {
    notFound: () => BuyerDashboardPage({ notFound: true }),
  },
  preload: {
    snapshot: ["buyer.profile", "buyer.catalog", "buyer.transactions", "buyer.inspectionSummary", "buyer.slidersLandingPage", "buyer.masterLocation"],
    working: ["buyerDashboard", "buyerAccount", "buyerCars", "buyerTransactions"],
  },
};
