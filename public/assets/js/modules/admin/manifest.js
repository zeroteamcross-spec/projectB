import { adminRoutes } from "./routes.js";
import { AdminDashboardPage } from "./pages/dashboardPage.js";

export const adminManifest = {
  name: "admin",
  roles: ["admin"],
  stateNamespace: "modules.admin",
  initialState: {
    filters: {
      keyword: "",
      role: "",
    },
  },
  routes: adminRoutes,
  pages: {
    notFound: () => AdminDashboardPage({ notFound: true }),
  },
  preload: {
    snapshot: ["admin.pendingUsers", "admin.users", "admin.transactions", "admin.cars", "admin.settlements", "admin.affiliateLedgers", "admin.sliders", "admin.masterBrand", "admin.masterSidebar", "admin.masterBank", "admin.masterLocation", "admin.masterInspection"],
    working: ["superAdminDashboard", "adminDashboard", "adminApprovals", "adminUsers", "adminTransactions", "adminSettlements", "adminAffiliateCommissions", "adminSliders", "adminMaster", "adminMasterInspection", "adminDesignStudio", "adminMigrations", "adminReleaseVersions", "adminWebConfig"],
  },
};
