import { PublicCatalogPage } from "./pages/catalogPage.js";
import { PublicCarDetailPage } from "./pages/carDetailPage.js";
import { AuthLandingPage } from "./pages/authLandingPage.js";
import { LandingPageSwitcher } from "./pages/landingPageSwitcher.js";
import { SaasLandingPage } from "./pages/saasLandingPage.js";
import { ShowroomRegisterPage } from "./pages/showroomRegisterPage.js";
import { TransactionEntryPage } from "./pages/transactionEntryPage.js";
import { GoogleLoginPage } from "../auth/pages/googleLoginPage.js";
import { publicCatalogService } from "./services/publicCatalogService.js";
import { publicCarDetailPreloadService } from "./services/publicCarDetailPreloadService.js";
import { slidersResource } from "../../resources/slidersResource.js";
import { adminMasterService } from "../admin/services/adminMasterService.js";
import { publicReservedRoutePrefixes } from "../../core/publicReservedRouteWords.js";

export { publicReservedRoutePrefixes };

/**
 * Pola regex untuk rute showroom di root: segmen pertama path yang BUKAN
 * salah satu kata di publicReservedRoutePrefixes. Named group-nya persis
 * seperti yang dihasilkan Router.compile() untuk ":nama" biasa, supaya
 * page/preload di bawah bisa membaca context.params tanpa tahu bedanya.
 */
const ROOT_SLUG_EXCLUSION = `(?!(?:${publicReservedRoutePrefixes.join("|")})(?:/|$))`;

function compileRootSlugPattern(tail = "") {
  return new RegExp(`^/${ROOT_SLUG_EXCLUSION}(?<slug>[^/]+)${tail}$`);
}

/**
 * Dulu tiap redirect legacy ini adalah halaman sungguhan (PublicCatalogPage
 * dkk dirender langsung di /showrooms/:slug atau /s/:slug). Sekarang alamat
 * kanoniknya pindah ke root ("carlynk.id/{slug}") -- link lama yang sudah
 * terlanjur dibagikan (WhatsApp, bookmark) tetap harus jalan, jadi keduanya
 * dibiarkan hidup tapi cuma sebagai pengalih ke bentuk barunya. Reload penuh
 * (bukan navigasi SPA) sengaja dipakai di sini -- ini jalur lama yang jarang
 * dipakai, jadi kesederhanaan lebih penting daripada menghindari satu kali
 * reload tambahan.
 */
function redirectToPath(path) {
  window.location.replace(path);
  return document.createElement("div");
}

export const publicRoutes = [
  {
    name: "public.showroom.catalog",
    path: "/:slug",
    pattern: compileRootSlugPattern(),
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
    path: "/:slug/cars/:id",
    pattern: compileRootSlugPattern("/cars/(?<id>[^/]+)"),
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
    path: "/:slug/transactions/new",
    pattern: compileRootSlugPattern("/transactions/new"),
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
    // Buyer-only Google login scoped to one showroom, e.g. the "Masuk" link
    // on a catalog page a buyer reached via carlynk.id/<slug>. Login always
    // returns here, to this same showroom, instead of the generic buyer home
    // — and records it as the showroom this buyer belongs to, so a later
    // logout (from any session) returns them here too.
    name: "public.showroom.buyer-login",
    path: "/:slug/login",
    pattern: compileRootSlugPattern("/login"),
    shell: "public",
    page: (context) => GoogleLoginPage({
      roleSlug: "buyer",
      next: `/${encodeURIComponent(context.params.slug)}`,
      showroomSlug: context.params.slug,
      subtitle: "Masuk untuk melanjutkan ke katalog showroom ini.",
      footerLink: { label: "Kembali ke katalog", path: `/${encodeURIComponent(context.params.slug)}` },
    }),
    workingStateKey: null,
  },
  {
    name: "public.showroom-legacy-showrooms.catalog",
    path: "/showrooms/:slug",
    shell: "public",
    page: (context) => redirectToPath(`/${encodeURIComponent(context.params.slug)}`),
    workingStateKey: null,
  },
  {
    name: "public.showroom-legacy-showrooms.car-detail",
    path: "/showrooms/:slug/cars/:id",
    shell: "public",
    page: (context) => redirectToPath(`/${encodeURIComponent(context.params.slug)}/cars/${encodeURIComponent(context.params.id)}`),
    workingStateKey: null,
  },
  {
    name: "public.showroom-legacy-showrooms.transaction-entry",
    path: "/showrooms/:slug/transactions/new",
    shell: "public",
    page: (context) => redirectToPath(
      context.query?.car_id
        ? `/${encodeURIComponent(context.params.slug)}/transactions/new?car_id=${encodeURIComponent(context.query.car_id)}`
        : `/${encodeURIComponent(context.params.slug)}/transactions/new`
    ),
    workingStateKey: null,
  },
  {
    name: "public.showroom-legacy-s.catalog",
    path: "/s/:slug",
    shell: "public",
    page: (context) => redirectToPath(`/${encodeURIComponent(context.params.slug)}`),
    workingStateKey: null,
  },
  {
    name: "public.showroom-legacy-s.car-detail",
    path: "/s/:slug/cars/:id",
    shell: "public",
    page: (context) => redirectToPath(`/${encodeURIComponent(context.params.slug)}/cars/${encodeURIComponent(context.params.id)}`),
    workingStateKey: null,
  },
  {
    name: "public.showroom-legacy-s.transaction-entry",
    path: "/s/:slug/transactions/new",
    shell: "public",
    page: (context) => redirectToPath(
      context.query?.car_id
        ? `/${encodeURIComponent(context.params.slug)}/transactions/new?car_id=${encodeURIComponent(context.query.car_id)}`
        : `/${encodeURIComponent(context.params.slug)}/transactions/new`
    ),
    workingStateKey: null,
  },
  {
    name: "public.showroom-legacy-s.buyer-login",
    path: "/s/:slug/login",
    shell: "public",
    page: (context) => redirectToPath(`/${encodeURIComponent(context.params.slug)}/login`),
    workingStateKey: null,
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
  {
    name: "public.showroom-register",
    path: "/daftar-showroom",
    shell: "public",
    role: "public",
    page: ShowroomRegisterPage,
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
