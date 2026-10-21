/**
 * Prefix ini dikirim shell oleh server dari definisi route SPA dan PHP yang
 * benar-benar terdaftar. Daftar fallback hanya dipakai di lingkungan yang
 * menyajikan aset tanpa bridge PHP (mis. unit test/editor).
 *
 * Berkas ini sengaja tidak mengimpor apa pun. beberapa pemakainya (mis.
 * utils/lastViewedPublicContext.js, utils/buyerShowroomUrl.js,
 * layout/publicShell.js) berada di ujung rantai impor yang balik lagi ke
 * modules/public/routes.js -- taruh daftar ini di modules/public/routes.js
 * sendiri akan membuat impor melingkar (routes.js mengimpor halaman-halaman
 * yang pada akhirnya mengimpor balik routes.js untuk daftar ini), yang
 * membuat modul tersebut membaca nilai belum terinisialisasi saat load.
 */
const FALLBACK_RESERVED_ROUTE_PREFIXES = [
  "admin",
  "tasks",
  "fitur",
  "features",
  "security-report",
  "laporan-keamanan",
  "super-admin",
  "seller",
  "buyer",
  "affiliate",
  "login",
  "google-login",
  "auth",
  "api",
  "cars",
  "transactions",
  "profile",
  "notifications",
  "public",
  "showrooms",
  "af",
  "a",
  "s",
  "daftar-showroom",
  "saas-landing",
  "carlynk-landing",
  "contoh-katalog",
  "health",
  "uploads",
  "assets",
  "tester",
  "app",
];

const injectedPrefixes = globalThis.__PROJECTB_RESERVED_ROUTE_PREFIXES__;
const routePrefixes = Array.isArray(injectedPrefixes)
  ? injectedPrefixes
  : FALLBACK_RESERVED_ROUTE_PREFIXES;

export const publicReservedRoutePrefixes = Object.freeze(
  [...new Set(routePrefixes
    .map((prefix) => String(prefix ?? "").trim().toLowerCase())
    .filter((prefix) => /^[a-z0-9-]+$/.test(prefix)))]
);
