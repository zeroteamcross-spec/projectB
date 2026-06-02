import { affiliateRoutes } from "./routes.js";
import { AffiliateDashboardPage } from "./pages/dashboardPage.js";

export const affiliateManifest = {
  name: "affiliate",
  roles: ["affiliate_admin"],
  stateNamespace: "modules.affiliate",
  initialState: {},
  routes: affiliateRoutes,
  pages: {
    notFound: () => AffiliateDashboardPage({ notFound: true }),
  },
  preload: {
    snapshot: ["affiliate_admin.affiliateProfile", "affiliate_admin.clickActivity", "affiliate_admin.ledgerActivity", "affiliate_admin.settlementActivity", "affiliate_admin.masterSidebar"],
    working: ["affiliateDashboard", "affiliateActivity", "affiliateLedger", "affiliateSettlements"],
  },
};
