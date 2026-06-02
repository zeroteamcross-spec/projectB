import { carsResource } from "../resources/carsResource.js";
import { adminSessionService } from "../modules/admin/services/adminSessionService.js";
import { affiliateActivityService } from "../modules/affiliate/services/affiliateActivityService.js";
import { affiliateDashboardService } from "../modules/affiliate/services/affiliateDashboardService.js";
import { affiliateLedgerService } from "../modules/affiliate/services/affiliateLedgerService.js";
import { affiliateSettlementService } from "../modules/affiliate/services/affiliateSettlementService.js";
import { publicCatalogService } from "../modules/public/services/publicCatalogService.js";
import { affiliatesResource } from "../resources/affiliatesResource.js";
import { inspectionsResource } from "../resources/inspectionsResource.js";
import { profileResource } from "../resources/profileResource.js";
import { showroomsResource } from "../resources/showroomsResource.js";
import { transactionsResource } from "../resources/transactionsResource.js";
import { adminMasterService } from "../modules/admin/services/adminMasterService.js";
import { slidersResource } from "../resources/slidersResource.js";

export const preloadPlans = {
  public: {
    bootSnapshot: [
      {
        key: "catalog",
        ttl: 180,
        version: "public-cars-v1",
        loader: ({ signal }) => publicCatalogService.list({ limit: 10 }, { signal }),
      },
      {
        key: "slidersPublicHome",
        ttl: 120,
        version: "public-sliders-home-v1",
        loader: ({ signal }) => slidersResource.publicList({ position: "public_home", limit: 5 }, { signal }).catch(() => ({ sliders: [], meta: {} })),
      },
      {
        key: "slidersLandingHero",
        ttl: 120,
        version: "public-sliders-landing-v1",
        loader: ({ signal }) => slidersResource.publicList({ position: "landing_hero", limit: 5 }, { signal }).catch(() => ({ sliders: [], meta: {} })),
      },
    ],
  },
  buyer: {
    bootSnapshot: [
      {
        key: "profile",
        ttl: 120,
        version: "buyer-profile-v1",
        loader: async ({ signal }) => profileResource.me({ signal }).catch(() => null),
      },
      {
        key: "catalog",
        ttl: 180,
        version: "cars-public-v1",
        loader: ({ signal }) => carsResource.list({ limit: 10, listing_status: "published" }, { signal }),
      },
      {
        key: "slidersBuyerHome",
        ttl: 120,
        version: "buyer-sliders-home-v1",
        loader: ({ signal }) => slidersResource.publicList({ position: "buyer_home", limit: 5 }, { signal }).catch(() => ({ sliders: [], meta: {} })),
      },
      {
        key: "transactions",
        ttl: 90,
        version: "buyer-transactions-v1",
        loader: async ({ signal }) => transactionsResource.list({ limit: 10 }, { signal }).catch(() => []),
      },
      {
        key: "inspectionSummary",
        ttl: 300,
        version: "buyer-inspection-summary-v1",
        fallback: [],
      },
    ],
  },
  seller: {
    bootSnapshot: [
      {
        key: "showroom",
        ttl: 120,
        version: "seller-showroom-v1",
        loader: ({ signal }) => showroomsResource.mine({ signal }).catch(() => null),
      },
      {
        key: "cars",
        ttl: 120,
        version: "seller-cars-v1",
        loader: ({ signal }) => carsResource.sellerList({ limit: 10 }, { signal }).catch(() => ({ cars: [] })),
      },
      {
        key: "transactions",
        ttl: 90,
        version: "seller-transactions-v1",
        loader: ({ signal }) => transactionsResource.list({ limit: 10 }, { signal }).catch(() => ({ transactions: [] })),
      },
      {
        key: "affiliates",
        ttl: 120,
        version: "seller-affiliates-v1",
        loader: ({ signal }) => affiliatesResource.sellerList({ limit: 10 }, { signal }).catch(() => ({ affiliates: [], meta: {} })),
      },
      {
        key: "affiliateCommissionRules",
        ttl: 120,
        version: "seller-affiliate-commission-rules-v1",
        loader: ({ signal }) => affiliatesResource.sellerCommissionRules({ limit: 10 }, { signal }).catch(() => ({ global_rule: null, overrides: [], meta: {} })),
      },
      {
        key: "inspectionOverview",
        ttl: 120,
        version: "seller-inspection-overview-v1",
        loader: ({ signal }) => inspectionsResource.sellerOverview({ limit: 10 }, { signal }).catch(() => ({
          cars: [],
          reports_by_car_id: {},
          templates: [],
          summary: {},
        })),
      },
      {
        key: "masterSidebar",
        ttl: 120,
        version: "master-sidebar-v1",
        loader: ({ signal }) => adminMasterService.getSidebarMaster({ signal }).catch(() => adminMasterService.normalizeSidebarMaster(null)),
      },
      {
        key: "masterBank",
        ttl: 120,
        version: "seller-master-bank-v1",
        loader: ({ signal }) => adminMasterService.getBankMaster({ signal }).catch(() => adminMasterService.normalizeBankMaster(null)),
      },
      {
        key: "masterBrand",
        ttl: 120,
        version: "seller-master-brand-v1",
        loader: ({ signal }) => adminMasterService.getBrandMaster({ signal }).catch(() => adminMasterService.normalizeMaster(null)),
      },
    ],
  },
  admin: {
    bootSnapshot: [
      {
        key: "pendingUsers",
        ttl: 90,
        version: "admin-pending-users-v1",
        loader: ({ signal }) => adminSessionService.pendingUsers({ limit: 10 }, { signal }).catch(() => ({ users: [] })),
      },
      {
        key: "users",
        ttl: 90,
        version: "admin-users-v1",
        loader: ({ signal }) => adminSessionService.listUsers({ limit: 10 }, { signal }).catch(() => ({ users: [] })),
      },
      {
        key: "transactions",
        ttl: 90,
        version: "admin-transactions-v1",
        loader: ({ signal }) => transactionsResource.list({ limit: 10 }, { signal }).catch(() => ({ transactions: [], meta: {} })),
      },
      {
        key: "cars",
        ttl: 90,
        version: "admin-cars-v1",
        loader: ({ signal }) => carsResource.adminList({ limit: 10 }, { signal }).catch(() => ({ cars: [], meta: {} })),
      },
      {
        key: "settlements",
        ttl: 90,
        version: "admin-settlements-v1",
        loader: ({ signal }) => adminSessionService.listSettlements({ limit: 10 }, { signal }).catch(() => ({ settlements: [], meta: {} })),
      },
      {
        key: "sliders",
        ttl: 90,
        version: "admin-sliders-v1",
        loader: ({ signal }) => slidersResource.adminList({ limit: 10 }, { signal }).catch(() => ({ sliders: [], meta: {} })),
      },
      {
        key: "masterBrand",
        ttl: 120,
        version: "admin-master-brand-v1",
        loader: ({ signal }) => adminMasterService.getBrandMaster({ signal }).catch(() => adminMasterService.normalizeMaster(null)),
      },
      {
        key: "masterSidebar",
        ttl: 120,
        version: "admin-master-sidebar-v1",
        loader: ({ signal }) => adminMasterService.getSidebarMaster({ signal }).catch(() => adminMasterService.normalizeSidebarMaster(null)),
      },
      {
        key: "masterBank",
        ttl: 120,
        version: "admin-master-bank-v1",
        loader: ({ signal }) => adminMasterService.getBankMaster({ signal }).catch(() => adminMasterService.normalizeBankMaster(null)),
      },
      {
        key: "masterInspection",
        ttl: 120,
        version: "admin-master-inspection-v1",
        loader: ({ signal }) => inspectionsResource.adminTemplates({ signal }).catch(() => []),
      },
      { key: "monitoringSummary", version: "admin-monitoring-summary-v1", fallback: null },
    ],
  },
  affiliate_admin: {
    bootSnapshot: [
      {
        key: "affiliateProfile",
        ttl: 120,
        version: "affiliate-profile-v1",
        loader: ({ signal }) => affiliateDashboardService.me({ signal }).catch(() => null),
      },
      {
        key: "clickActivity",
        ttl: 120,
        version: "affiliate-click-activity-v1",
        loader: ({ signal }) => affiliateActivityService.list({ limit: 10 }, { signal }).catch(() => ({ clicks: [], summary: {}, meta: {} })),
      },
      {
        key: "ledgerActivity",
        ttl: 120,
        version: "affiliate-ledger-activity-v1",
        loader: ({ signal }) => affiliateLedgerService.list({ limit: 10 }, { signal }).catch(() => ({ ledgers: [], summary: {}, meta: {} })),
      },
      {
        key: "settlementActivity",
        ttl: 120,
        version: "affiliate-settlement-activity-v1",
        loader: ({ signal }) => affiliateSettlementService.list({ limit: 10, eligible_limit: 6 }, { signal }).catch(() => ({ summary: {}, eligible_ledgers: [], settlements: [], meta: {} })),
      },
      {
        key: "masterSidebar",
        ttl: 120,
        version: "master-sidebar-v1",
        loader: ({ signal }) => adminMasterService.getSidebarMaster({ signal }).catch(() => adminMasterService.normalizeSidebarMaster(null)),
      },
    ],
  },
};
