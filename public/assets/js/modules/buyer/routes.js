import { carsResource } from "../../resources/carsResource.js";
import { profileResource } from "../../resources/profileResource.js";
import { transactionsResource } from "../../resources/transactionsResource.js";
import { slidersResource } from "../../resources/slidersResource.js";
import { buyerTransactionDetailPreloadService } from "./services/buyerTransactionDetailPreloadService.js";
import { BuyerAccountPage } from "./pages/accountPage.js";
import { BuyerCarsPage } from "./pages/carsPage.js";
import { BuyerDashboardPage } from "./pages/dashboardPage.js";
import { BuyerPortfolioPage } from "./pages/portfolioPage.js";
import { BuyerTransactionsPage } from "./pages/transactionsPage.js";
import { PaymentStatusPage } from "./pages/paymentStatusPage.js";

export const buyerRoutes = [
  {
    name: "buyer.dashboard",
    path: "/buyer",
    shell: "app",
    role: "buyer",
    page: BuyerDashboardPage,
    workingStateKey: "buyerDashboard",
    preload: {
      working: [
        {
          key: "catalog",
          loader: ({ signal }) => carsResource.list({ limit: 10, listing_status: "published" }, { signal }),
        },
        {
          key: "transactions",
          loader: ({ signal }) => transactionsResource.list({ limit: 10 }, { signal }).catch(() => ({ transactions: [] })),
        },
        {
          key: "sliders",
          loader: ({ signal }) => Promise.all([
            slidersResource.publicList({ position: "public_home", limit: 5 }, { signal }),
            slidersResource.publicList({ position: "landing_hero", limit: 5 }, { signal }),
          ]).then(([publicHome, landingHero]) => ({
            sliders: [...(publicHome?.sliders ?? []), ...(landingHero?.sliders ?? [])].slice(0, 5),
            meta: { positions: ["public_home", "landing_hero"] },
          })).catch(() => ({ sliders: [], meta: {} })),
        },
      ],
    },
  },
  {
    name: "buyer.portfolio",
    path: "/buyer/portfolio",
    shell: "app",
    role: "buyer",
    page: BuyerPortfolioPage,
    workingStateKey: "buyerPortfolio",
    preload: {
      working: [
        {
          key: "transactions",
          loader: ({ signal }) => transactionsResource.list({ limit: 20 }, { signal }).catch(() => ({ transactions: [] })),
        },
        {
          key: "profile",
          loader: ({ signal }) => profileResource.me({ signal }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "buyer.account",
    path: "/buyer/account",
    shell: "app",
    role: "buyer",
    page: BuyerAccountPage,
    workingStateKey: "buyerAccount",
    preload: {
      working: [
        {
          key: "profile",
          loader: ({ signal }) => profileResource.me({ signal }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "buyer.cars",
    path: "/buyer/cars",
    shell: "app",
    role: "buyer",
    page: BuyerCarsPage,
    workingStateKey: "buyerCars",
    preload: {
      working: [
        {
          key: "catalog",
          loader: ({ query, signal }) => carsResource.list({ limit: 24, ...query, listing_status: "published" }, { signal }),
        },
      ],
    },
  },
  {
    name: "buyer.transactions",
    path: "/buyer/transactions",
    shell: "app",
    role: "buyer",
    page: BuyerTransactionsPage,
    workingStateKey: "buyerTransactions",
    preload: {
      working: [
        {
          key: "transactions",
          loader: ({ signal }) => transactionsResource.list({ limit: 20 }, { signal }).catch(() => ({ transactions: [] })),
        },
      ],
    },
  },
  {
    name: "buyer.payment-status",
    path: "/buyer/transactions/:id",
    shell: "app",
    role: "buyer",
    page: PaymentStatusPage,
    workingStateKey: "buyerPaymentStatus",
    preload: {
      working: [
        {
          key: "transaction",
          loader: ({ params, signal }) => buyerTransactionDetailPreloadService.detailOrFetch(params.id, { signal }).catch(() => null),
        },
      ],
    },
  },
];
