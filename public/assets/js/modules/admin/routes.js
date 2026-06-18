import { AdminDashboardPage } from "./pages/dashboardPage.js";
import { AdminApprovalsPage } from "./pages/approvalsPage.js";
import { AdminCarsPage } from "./pages/carsPage.js";
import { AdminDesignStudioV2Page } from "./pages/designStudioV2Page.js";
import { AdminWebConfigPage } from "./pages/webConfigPage.js";
import { AdminUsersPage } from "./pages/usersPage.js";
import { AdminSettlementsPage } from "./pages/settlementsPage.js";
import { AdminAffiliateCommissionsPage } from "./pages/affiliateCommissionsPage.js";
import { AdminTransactionsPage } from "./pages/transactionsPage.js";
import { AdminSlidersPage } from "./pages/slidersPage.js";
import { AdminMasterBankPage, AdminMasterBrandPage, AdminMasterSidebarPage } from "./pages/masterPage.js";
import { AdminMasterInspectionPage } from "./pages/masterInspectionPage.js";
import { AdminMigrationManagerPage } from "./pages/migrationManagerPage.js";
import { AdminReleaseVersionManagerPage } from "./pages/releaseVersionManagerPage.js";
import { SuperAdminDashboardPage } from "./pages/superAdminDashboardPage.js";
import { adminSessionService } from "./services/adminSessionService.js";
import { transactionsResource } from "../../resources/transactionsResource.js";
import { carsResource } from "../../resources/carsResource.js";
import { adminMasterService } from "./services/adminMasterService.js";
import { inspectionsResource } from "../../resources/inspectionsResource.js";
import { slidersResource } from "../../resources/slidersResource.js";
import { webConfigResource } from "../../resources/webConfigResource.js";

export const adminRoutes = [
  {
    name: "super-admin.dashboard",
    path: "/super-admin",
    shell: "app",
    role: "admin",
    page: SuperAdminDashboardPage,
    workingStateKey: "superAdminDashboard",
  },
  {
    name: "admin.dashboard",
    path: "/admin",
    shell: "app",
    role: "admin",
    page: AdminDashboardPage,
    workingStateKey: "adminDashboard",
    preload: {
      working: [
        {
          key: "users",
          loader: ({ signal }) => adminSessionService.listUsers({ limit: 8 }, { signal }).catch(() => ({ users: [] })),
        },
        {
          key: "pendingUsers",
          loader: ({ signal }) => adminSessionService.pendingUsers({ limit: 8 }, { signal }).catch(() => ({ users: [] })),
        },
        {
          key: "transactions",
          loader: ({ signal }) => transactionsResource.list({ limit: 8 }, { signal }).catch(() => ({ transactions: [], meta: {} })),
        },
        {
          key: "cars",
          loader: ({ signal }) => carsResource.adminList({ limit: 8 }, { signal }).catch(() => ({ cars: [], meta: {} })),
        },
      ],
    },
  },
  {
    name: "admin.approvals",
    path: "/admin/approvals",
    shell: "app",
    role: "admin",
    page: AdminApprovalsPage,
    workingStateKey: "adminApprovals",
    preload: {
      working: [
        {
          key: "pendingUsers",
          loader: ({ signal }) => adminSessionService.pendingUsers({ limit: 100 }, { signal }).catch(() => ({ users: [], meta: {} })),
        },
        {
          key: "detail",
          loader: ({ query, signal }) => query.user_id
            ? adminSessionService.userDetail(query.user_id, { signal }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "admin.pending-users",
    path: "/admin/pending-users",
    shell: "app",
    role: "admin",
    page: AdminApprovalsPage,
    workingStateKey: "adminApprovals",
    preload: {
      working: [
        {
          key: "pendingUsers",
          loader: ({ signal }) => adminSessionService.pendingUsers({ limit: 100 }, { signal }).catch(() => ({ users: [], meta: {} })),
        },
        {
          key: "detail",
          loader: ({ query, signal }) => query.user_id
            ? adminSessionService.userDetail(query.user_id, { signal }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "admin.cars",
    path: "/admin/cars",
    shell: "app",
    role: "admin",
    page: AdminCarsPage,
    workingStateKey: "adminCars",
    preload: {
      working: [
        {
          key: "cars",
          loader: ({ query, signal }) => carsResource.adminList({
            listing_status: query.listing_status ?? query.status ?? "",
            limit: 100,
          }, { signal }).catch(() => ({ cars: [], meta: {} })),
        },
      ],
    },
  },
  {
    name: "admin.users",
    path: "/admin/users",
    shell: "app",
    role: "admin",
    page: AdminUsersPage,
    workingStateKey: "adminUsers",
    preload: {
      working: [
        {
          key: "users",
          loader: ({ signal }) => adminSessionService.listUsers({
            limit: 100,
          }, { signal }).catch(() => ({ users: [], meta: {} })),
        },
        {
          key: "pendingUsers",
          loader: ({ signal }) => adminSessionService.pendingUsers({ limit: 50 }, { signal }).catch(() => ({ users: [], meta: {} })),
        },
        {
          key: "detail",
          loader: ({ query, signal }) => query.user_id
            ? adminSessionService.userDetail(query.user_id, { signal }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "admin.affiliate-commissions",
    path: "/admin/affiliate-commissions",
    shell: "app",
    role: "admin",
    page: AdminAffiliateCommissionsPage,
    workingStateKey: "adminAffiliateCommissions",
    preload: {
      working: [
        {
          key: "ledgers",
          loader: ({ query, signal }) => adminSessionService.listAffiliateLedgers({
            status: query.status ?? "",
            limit: 100,
          }, { signal }).catch(() => ({ ledgers: [], meta: {} })),
        },
      ],
    },
  },
  {
    name: "admin.settlements",
    path: "/admin/settlements",
    shell: "app",
    role: "admin",
    page: AdminSettlementsPage,
    workingStateKey: "adminSettlements",
    preload: {
      working: [
        {
          key: "settlements",
          loader: ({ query, signal }) => adminSessionService.listSettlements({
            status: query.status ?? "",
            limit: 50,
          }, { signal }).catch(() => ({ settlements: [], meta: {} })),
        },
        {
          key: "ledgers",
          loader: ({ signal }) => adminSessionService.listAffiliateLedgers({
            status: "accrued",
            limit: 100,
          }, { signal }).catch(() => ({ ledgers: [], meta: {} })),
        },
        {
          key: "detail",
          loader: ({ query, signal }) => query.settlement_id
            ? adminSessionService.settlementDetail(query.settlement_id, { signal }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "admin.sliders",
    path: "/admin/sliders",
    shell: "app",
    role: "admin",
    page: AdminSlidersPage,
    workingStateKey: "adminSliders",
    preload: {
      working: [
        {
          key: "sliders",
          loader: ({ signal }) => slidersResource.adminList({ limit: 100 }, { signal }).catch(() => ({ sliders: [], meta: {} })),
        },
      ],
    },
  },
  {
    name: "admin.master-brand",
    path: "/admin/master-brand",
    shell: "app",
    role: "admin",
    page: AdminMasterBrandPage,
    workingStateKey: "adminMaster",
    preload: {
      working: [
        {
          key: "brand",
          loader: ({ signal }) => adminMasterService.getBrandMaster({ signal }).catch(() => adminMasterService.normalizeMaster(null)),
        },
      ],
    },
  },
  {
    name: "admin.master-sidebar",
    path: "/admin/master-sidebar",
    shell: "app",
    role: "admin",
    page: AdminMasterSidebarPage,
    workingStateKey: "adminMaster",
    preload: {
      working: [
        {
          key: "sidebar",
          loader: ({ signal }) => adminMasterService.getSidebarMaster({ signal }).catch(() => adminMasterService.normalizeSidebarMaster(null)),
        },
      ],
    },
  },
  {
    name: "admin.master-bank",
    path: "/admin/master-bank",
    shell: "app",
    role: "admin",
    page: AdminMasterBankPage,
    workingStateKey: "adminMaster",
    preload: {
      working: [
        {
          key: "bank",
          loader: ({ signal }) => adminMasterService.getBankMaster({ signal }).catch(() => adminMasterService.normalizeBankMaster(null)),
        },
      ],
    },
  },
  {
    name: "admin.master-inspection",
    path: "/admin/master-inspection",
    shell: "app",
    role: "admin",
    page: AdminMasterInspectionPage,
    workingStateKey: "adminMasterInspection",
    preload: {
      working: [
        {
          key: "templates",
          loader: ({ signal }) => inspectionsResource.adminTemplates({ signal }).catch(() => []),
        },
      ],
    },
  },
  {
    name: "admin.web-config",
    path: "/admin/web-config",
    shell: "app",
    role: "admin",
    page: AdminWebConfigPage,
    workingStateKey: "adminWebConfig",
    preload: {
      working: [
        {
          key: "config",
          loader: ({ signal }) => webConfigResource.get({ signal }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "admin.design-studio-v2",
    path: "/admin/design-studio-v2",
    shell: "app",
    role: "admin",
    page: AdminDesignStudioV2Page,
  },
  {
    name: "admin.migrations",
    path: "/admin/migrations",
    shell: "app",
    role: "admin",
    page: AdminMigrationManagerPage,
    workingStateKey: "adminMigrations",
    preload: {
      working: [
        {
          key: "migrations",
          loader: ({ signal }) => import("./services/adminMigrationService.js")
            .then(({ adminMigrationService }) => adminMigrationService.status({ signal }))
            .then((migrations) => ({ migrations }))
            .catch(() => ({ migrations: [] })),
        },
      ],
    },
  },
  {
    name: "admin.release-versions",
    path: "/admin/release-versions",
    shell: "app",
    role: "admin",
    page: AdminReleaseVersionManagerPage,
    workingStateKey: "adminReleaseVersions",
    preload: {
      working: [
        {
          key: "versions",
          loader: ({ signal }) => import("./services/adminReleaseVersionService.js")
            .then(({ adminReleaseVersionService }) => adminReleaseVersionService.versions(["app", "cars", "transactions", "notifications", "sliders", "master_data", "design_studio"], { signal }))
            .then((versions) => ({ versions }))
            .catch(() => ({ versions: [] })),
        },
      ],
    },
  },
  {
    name: "admin.transactions",
    path: "/admin/transactions",
    shell: "app",
    role: "admin",
    page: AdminTransactionsPage,
    workingStateKey: "adminTransactions",
    preload: {
      working: [
        {
          key: "transactions",
          loader: ({ signal }) => transactionsResource.list({ limit: 50 }, { signal }).catch(() => ({ transactions: [], meta: {} })),
        },
        {
          key: "detail",
          loader: ({ query, signal }) => query.transaction_id
            ? transactionsResource.detail(query.transaction_id, { signal }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
];
