import { carsResource } from "../../resources/carsResource.js";
import { imagesResource } from "../../resources/imagesResource.js";
import { inspectionsResource } from "../../resources/inspectionsResource.js";
import { showroomsResource } from "../../resources/showroomsResource.js";
import { transactionsResource } from "../../resources/transactionsResource.js";
import { affiliatesResource } from "../../resources/affiliatesResource.js";
import { adminMasterService } from "../admin/services/adminMasterService.js";
import { SellerDashboardPage } from "./pages/dashboardPage.js";
import { SellerAffiliateCommissionsPage } from "./pages/affiliateCommissionsPage.js";
import { SellerAffiliatesModalPage } from "./pages/affiliatesModalPage.js";
import { SellerCarsPage } from "./pages/carsPage.js";
import { SellerCarImagesPage } from "./pages/carImagesPage.js";
import { SellerCarInspectionPage } from "./pages/carInspectionPage.js";
import { SellerInspectionPage } from "./pages/inspectionPage.js";
import { SellerShowroomPage } from "./pages/showroomPage.js";
import { SellerTransactionDetailPage } from "./pages/transactionDetailPage.js";
import { SellerTransactionsPage } from "./pages/transactionsPage.js";

export const sellerRoutes = [
  {
    name: "seller.dashboard",
    path: "/seller",
    shell: "app",
    role: "seller",
    page: SellerDashboardPage,
    workingStateKey: "sellerDashboard",
    preload: {
      working: [
        {
          key: "showroom",
          loader: ({ signal }) => showroomsResource.mine({ signal }).catch(() => null),
        },
        {
          key: "cars",
          loader: ({ signal }) => carsResource.sellerList({ limit: 12 }, { signal }).catch(() => ({ cars: [] })),
        },
        {
          key: "transactions",
          loader: ({ signal }) => transactionsResource.list({ limit: 10 }, { signal }).catch(() => ({ transactions: [] })),
        },
      ],
    },
  },
  {
    name: "seller.showroom",
    path: "/seller/showroom",
    shell: "app",
    role: "seller",
    page: SellerShowroomPage,
    workingStateKey: "sellerShowroom",
    preload: {
      working: [
        {
          key: "showroom",
          loader: ({ signal }) => showroomsResource.mine({ signal }).catch(() => null),
        },
        {
          key: "masterBank",
          loader: ({ signal }) => adminMasterService.getBankMaster({ signal }).catch(() => adminMasterService.normalizeBankMaster(null)),
        },
      ],
    },
  },
  {
    name: "seller.cars",
    path: "/seller/cars",
    shell: "app",
    role: "seller",
    page: SellerCarsPage,
    workingStateKey: "sellerCars",
    preload: {
      working: [
        {
          key: "cars",
          loader: ({ signal }) => carsResource.sellerList({ limit: 24 }, { signal }).catch(() => ({ cars: [] })),
        },
        {
          key: "masterBrand",
          loader: ({ signal }) => adminMasterService.getBrandMaster({ signal }).catch(() => adminMasterService.normalizeMaster(null)),
        },
      ],
    },
  },
  {
    name: "seller.affiliates",
    path: "/seller/affiliates",
    shell: "app",
    role: "seller",
    page: SellerAffiliatesModalPage,
    workingStateKey: "sellerAffiliates",
    preload: {
      working: [
        {
          key: "affiliates",
          loader: ({ signal }) => affiliatesResource.sellerList({ limit: 50 }, { signal }).catch(() => ({ affiliates: [], meta: {} })),
        },
        {
          key: "detail",
          loader: () => Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "seller.affiliate-commissions",
    path: "/seller/affiliate-commissions",
    shell: "app",
    role: "seller",
    page: SellerAffiliateCommissionsPage,
    workingStateKey: "sellerAffiliateCommissions",
    preload: {
      working: [
        {
          key: "rules",
          loader: ({ signal }) => affiliatesResource.sellerCommissionRules({ limit: 50 }, { signal }).catch(() => ({ global_rule: null, overrides: [], meta: {} })),
        },
        {
          key: "cars",
          loader: ({ signal }) => carsResource.sellerList({ limit: 100 }, { signal }).catch(() => ({ cars: [], meta: {} })),
        },
      ],
    },
  },
  {
    name: "seller.transactions",
    path: "/seller/transactions",
    shell: "app",
    role: "seller",
    page: SellerTransactionsPage,
    workingStateKey: "sellerTransactions",
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
    name: "seller.inspection",
    path: "/seller/inspection",
    shell: "app",
    role: "seller",
    page: SellerInspectionPage,
    workingStateKey: "sellerInspection",
    preload: {
      working: [
        {
          key: "overview",
          loader: ({ signal }) => inspectionsResource.sellerOverview({ limit: 100 }, { signal }).catch(() => ({
            cars: [],
            reports_by_car_id: {},
            templates: [],
            summary: {},
          })),
        },
      ],
    },
  },
  {
    name: "seller.transaction-detail",
    path: "/seller/transactions/:id",
    shell: "app",
    role: "seller",
    page: SellerTransactionDetailPage,
    workingStateKey: "sellerTransactionDetail",
    preload: {
      working: [
        {
          key: "transaction",
          loader: ({ params, signal }) => transactionsResource.detail(params.id, { signal }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "seller.car-images",
    path: "/seller/cars/:id/images",
    shell: "app",
    role: "seller",
    page: SellerCarImagesPage,
    workingStateKey: "sellerCarImages",
    preload: {
      working: [
        {
          key: "car",
          loader: ({ params, signal }) => carsResource.sellerDetail(params.id, { signal }).catch(() => null),
        },
        {
          key: "images",
          loader: ({ params, signal }) => imagesResource.listByCar(params.id, { signal }).catch(() => []),
        },
      ],
    },
  },
  {
    name: "seller.car-inspection",
    path: "/seller/cars/:id/inspection",
    shell: "app",
    role: "seller",
    page: SellerCarInspectionPage,
    workingStateKey: "sellerCarInspection",
    preload: {
      working: [
        {
          key: "car",
          loader: ({ params, signal }) => carsResource.sellerDetail(params.id, { signal }).catch(() => null),
        },
        {
          key: "templates",
          loader: ({ signal }) => inspectionsResource.templates({ signal }).catch(() => []),
        },
        {
          key: "report",
          loader: ({ params, signal }) => inspectionsResource.sellerByCar(params.id, { signal }).catch(() => null),
        },
      ],
    },
  },
];
