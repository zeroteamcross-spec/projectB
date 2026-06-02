import { affiliateDashboardService } from "./services/affiliateDashboardService.js";
import { affiliateActivityService } from "./services/affiliateActivityService.js";
import { affiliateLedgerService } from "./services/affiliateLedgerService.js";
import { affiliateSettlementService } from "./services/affiliateSettlementService.js";
import { AffiliateActivityPage } from "./pages/activityPage.js";
import { AffiliateDashboardPage } from "./pages/dashboardPage.js";
import { AffiliateLedgerPage } from "./pages/ledgerPage.js";
import { AffiliateSettlementsPage } from "./pages/settlementsPage.js";

export const affiliateRoutes = [
  {
    name: "affiliate.settlements",
    path: "/affiliate/settlements",
    shell: "app",
    role: "affiliate_admin",
    page: AffiliateSettlementsPage,
    workingStateKey: "affiliateSettlements",
    preload: {
      working: [
        {
          key: "settlements",
          loader: ({ signal }) => affiliateSettlementService.list({ limit: 20, eligible_limit: 10 }, { signal }).catch(() => ({ summary: {}, eligible_ledgers: [], settlements: [], meta: {} })),
        },
      ],
    },
  },
  {
    name: "affiliate.ledger",
    path: "/affiliate/ledger",
    shell: "app",
    role: "affiliate_admin",
    page: AffiliateLedgerPage,
    workingStateKey: "affiliateLedger",
    preload: {
      working: [
        {
          key: "ledgers",
          loader: ({ signal }) => affiliateLedgerService.list({ limit: 30 }, { signal }).catch(() => ({ ledgers: [], summary: {}, meta: {} })),
        },
      ],
    },
  },
  {
    name: "affiliate.activity",
    path: "/affiliate/activity",
    shell: "app",
    role: "affiliate_admin",
    page: AffiliateActivityPage,
    workingStateKey: "affiliateActivity",
    preload: {
      working: [
        {
          key: "clicks",
          loader: ({ signal }) => affiliateActivityService.list({ limit: 30 }, { signal }).catch(() => ({ clicks: [], summary: {}, meta: {} })),
        },
      ],
    },
  },
  {
    name: "affiliate.dashboard",
    path: "/affiliate",
    shell: "app",
    role: "affiliate_admin",
    page: AffiliateDashboardPage,
    workingStateKey: "affiliateDashboard",
    preload: {
      working: [
        {
          key: "profile",
          loader: ({ signal }) => affiliateDashboardService.me({ signal }).catch(() => null),
        },
      ],
    },
  },
];
