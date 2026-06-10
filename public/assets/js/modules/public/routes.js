import { PublicCatalogPage } from "./pages/catalogPage.js";
import { PublicCarDetailPage } from "./pages/carDetailPage.js";
import { AuthLandingPage } from "./pages/authLandingPage.js";
import { TransactionEntryPage } from "./pages/transactionEntryPage.js";
import { publicCatalogService } from "./services/publicCatalogService.js";
import { publicCarDetailPreloadService } from "./services/publicCarDetailPreloadService.js";
import { slidersResource } from "../../resources/slidersResource.js";

export const publicReservedRoutePrefixes = Object.freeze([
  "af",
  "auth",
  "cars",
  "google-login",
  "transactions",
]);

export const publicRoutes = [
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
    name: "public.catalog",
    path: "/",
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
