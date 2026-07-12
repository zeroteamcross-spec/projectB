import { PublicCatalogPage } from "./pages/catalogPage.js";
import { PublicCarDetailPage } from "./pages/carDetailPage.js";
import { AuthLandingPage } from "./pages/authLandingPage.js";
import { LandingPageSwitcher } from "./pages/landingPageSwitcher.js";
import { SaasLandingPage } from "./pages/saasLandingPage.js";
import { TransactionEntryPage } from "./pages/transactionEntryPage.js";
import { publicCatalogService } from "./services/publicCatalogService.js";
import { publicCarDetailPreloadService } from "./services/publicCarDetailPreloadService.js";
import { slidersResource } from "../../resources/slidersResource.js";
import { adminMasterService } from "../admin/services/adminMasterService.js";

export const publicReservedRoutePrefixes = Object.freeze([
  "af",
  "auth",
  "cars",
  "google-login",
  "showrooms",
  "transactions",
]);

export const publicRoutes = [
  {
    name: "public.showroom.catalog",
    path: "/showrooms/:slug",
    shell: "public",
    page: PublicCatalogPage,
    workingStateKey: "publicCatalog",
    preload: {
      working: [
        {
          key: "catalog",
          loader: ({ params, signal }) => publicCatalogService.list({ page: 1, limit: 12, showroomSlug: params.slug }, { signal }),
        },
        {
          key: "masterLocation",
          loader: ({ signal }) => adminMasterService.getLocationMaster({ signal }).catch(() => adminMasterService.normalizeLocationMaster(null)),
        },
        {
          key: "sliders",
          loader: ({ signal }) => loadPublicLandingSliders(signal),
        },
      ],
    },
  },
  {
    name: "public.showroom.car-detail",
    path: "/showrooms/:slug/cars/:id",
    shell: "public",
    page: PublicCarDetailPage,
    workingStateKey: "publicCarDetail",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, signal }) => publicCarDetailPreloadService.detailOrFetch(params.id, { signal, showroomSlug: params.slug }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "public.showroom.transaction-entry",
    path: "/showrooms/:slug/transactions/new",
    shell: "public",
    page: TransactionEntryPage,
    workingStateKey: "transactionEntry",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, query, signal }) => query.car_id
            ? publicCarDetailPreloadService.detailOrFetch(query.car_id, { signal, showroomSlug: params.slug }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "public.showroom-legacy.catalog",
    path: "/s/:slug",
    shell: "public",
    page: PublicCatalogPage,
    workingStateKey: "publicCatalog",
    preload: {
      working: [
        {
          key: "catalog",
          loader: ({ params, signal }) => publicCatalogService.list({ page: 1, limit: 12, showroomSlug: params.slug }, { signal }),
        },
        {
          key: "masterLocation",
          loader: ({ signal }) => adminMasterService.getLocationMaster({ signal }).catch(() => adminMasterService.normalizeLocationMaster(null)),
        },
        {
          key: "sliders",
          loader: ({ signal }) => loadPublicLandingSliders(signal),
        },
      ],
    },
  },
  {
    name: "public.showroom-legacy.car-detail",
    path: "/s/:slug/cars/:id",
    shell: "public",
    page: PublicCarDetailPage,
    workingStateKey: "publicCarDetail",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, signal }) => publicCarDetailPreloadService.detailOrFetch(params.id, { signal, showroomSlug: params.slug }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "public.showroom-legacy.transaction-entry",
    path: "/s/:slug/transactions/new",
    shell: "public",
    page: TransactionEntryPage,
    workingStateKey: "transactionEntry",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, query, signal }) => query.car_id
            ? publicCarDetailPreloadService.detailOrFetch(query.car_id, { signal, showroomSlug: params.slug }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "public.affiliate.catalog",
    path: "/af/:slug",
    shell: "public",
    page: PublicCatalogPage,
    workingStateKey: "publicCatalog",
    preload: {
      working: [
        {
          key: "catalog",
          loader: ({ params, signal }) => publicCatalogService.list({ page: 1, limit: 12, affiliateSlug: params.slug }, { signal }),
        },
        {
          key: "masterLocation",
          loader: ({ signal }) => adminMasterService.getLocationMaster({ signal }).catch(() => adminMasterService.normalizeLocationMaster(null)),
        },
        {
          key: "sliders",
          loader: ({ signal }) => loadPublicLandingSliders(signal),
        },
      ],
    },
  },
  {
    name: "public.affiliate.car-detail",
    path: "/af/:slug/cars/:id",
    shell: "public",
    page: PublicCarDetailPage,
    workingStateKey: "publicCarDetail",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, signal }) => publicCarDetailPreloadService.detailOrFetch(params.id, { signal, affiliateSlug: params.slug }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "public.affiliate.transaction-entry",
    path: "/af/:slug/transactions/new",
    shell: "public",
    page: TransactionEntryPage,
    workingStateKey: "transactionEntry",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, query, signal }) => query.car_id
            ? publicCarDetailPreloadService.detailOrFetch(query.car_id, { signal, affiliateSlug: params.slug }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "public.affiliate-legacy.catalog",
    path: "/a/:slug",
    shell: "public",
    page: PublicCatalogPage,
    workingStateKey: "publicCatalog",
    preload: {
      working: [
        {
          key: "catalog",
          loader: ({ params, signal }) => publicCatalogService.list({ page: 1, limit: 12, affiliateSlug: params.slug }, { signal }),
        },
        {
          key: "masterLocation",
          loader: ({ signal }) => adminMasterService.getLocationMaster({ signal }).catch(() => adminMasterService.normalizeLocationMaster(null)),
        },
        {
          key: "sliders",
          loader: ({ signal }) => loadPublicLandingSliders(signal),
        },
      ],
    },
  },
  {
    name: "public.affiliate-legacy.car-detail",
    path: "/a/:slug/cars/:id",
    shell: "public",
    page: PublicCarDetailPage,
    workingStateKey: "publicCarDetail",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, signal }) => publicCarDetailPreloadService.detailOrFetch(params.id, { signal, affiliateSlug: params.slug }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "public.affiliate-legacy.transaction-entry",
    path: "/a/:slug/transactions/new",
    shell: "public",
    page: TransactionEntryPage,
    workingStateKey: "transactionEntry",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, query, signal }) => query.car_id
            ? publicCarDetailPreloadService.detailOrFetch(query.car_id, { signal, affiliateSlug: params.slug }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "public.saas-landing",
    path: "/saas-landing",
    shell: "public",
    page: SaasLandingPage,
    workingStateKey: null,
  },
  {
    name: "public.landing-home",
    path: "/",
    shell: "public",
    page: LandingPageSwitcher,
    workingStateKey: null,
  },
  {
    name: "public.catalog-alias",
    path: "/public",
    shell: "public",
    page: PublicCatalogPage,
    workingStateKey: "publicCatalog",
    preload: {
      working: [
        {
          key: "catalog",
          loader: ({ signal }) => publicCatalogService.list({ page: 1, limit: 12 }, { signal }),
        },
        {
          key: "masterLocation",
          loader: ({ signal }) => adminMasterService.getLocationMaster({ signal }).catch(() => adminMasterService.normalizeLocationMaster(null)),
        },
        {
          key: "sliders",
          loader: ({ signal }) => loadPublicLandingSliders(signal),
        },
      ],
    },
  },
  {
    name: "public.example-catalog",
    path: "/contoh-katalog",
    shell: "public",
    page: PublicCatalogPage,
    workingStateKey: "publicCatalog",
    preload: {
      working: [
        {
          key: "catalog",
          loader: ({ signal }) => publicCatalogService.list({ page: 1, limit: 12 }, { signal }),
        },
        {
          key: "masterLocation",
          loader: ({ signal }) => adminMasterService.getLocationMaster({ signal }).catch(() => adminMasterService.normalizeLocationMaster(null)),
        },
        {
          key: "sliders",
          loader: ({ signal }) => loadPublicLandingSliders(signal),
        },
      ],
    },
  },
  {
    name: "public.car-detail",
    path: "/cars/:id",
    shell: "public",
    page: PublicCarDetailPage,
    workingStateKey: "publicCarDetail",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ params, signal }) => publicCarDetailPreloadService.detailOrFetch(params.id, { signal }).catch(() => null),
        },
      ],
    },
  },
  {
    name: "public.transaction-entry",
    path: "/transactions/new",
    shell: "public",
    page: TransactionEntryPage,
    workingStateKey: "transactionEntry",
    preload: {
      working: [
        {
          key: "detail",
          loader: ({ query, signal }) => query.car_id
            ? publicCarDetailPreloadService.detailOrFetch(query.car_id, { signal }).catch(() => null)
            : Promise.resolve(null),
        },
      ],
    },
  },
  {
    name: "public.auth-landing",
    path: "/auth",
    shell: "public",
    page: AuthLandingPage,
    workingStateKey: null,
  },
];

function loadPublicLandingSliders(signal) {
  return Promise.all([
    slidersResource.publicList({ position: "public_home", limit: 5 }, { signal }),
    slidersResource.publicList({ position: "landing_hero", limit: 5 }, { signal }),
  ]).then(([publicHome, landingHero]) => ({
    sliders: [...(publicHome?.sliders ?? []), ...(landingHero?.sliders ?? [])].slice(0, 5),
    meta: { positions: ["public_home", "landing_hero"] },
  })).catch(() => ({ sliders: [], meta: {} }));
}
