/**
 * Kata yang tidak boleh jadi slug showroom di root ("carlynk.id/{slug}") --
 * bertabrakan dengan rute sistem yang juga hidup di root (dashboard peran,
 * auth, path API, dst). HARUS sejalan dengan RESERVED_SLUGS di
 * app/Modules/Showrooms/Services/ShowroomService.php -- itu yang mencegah
 * showroom baru dapat slug ini sejak awal; daftar di sini jaring pengaman
 * kedua di sisi rute/klien.
 *
 * Berkas ini sengaja tidak mengimpor apa pun. beberapa pemakainya (mis.
 * utils/lastViewedPublicContext.js, utils/buyerShowroomUrl.js,
 * layout/publicShell.js) berada di ujung rantai impor yang balik lagi ke
 * modules/public/routes.js -- taruh daftar ini di modules/public/routes.js
 * sendiri akan membuat impor melingkar (routes.js mengimpor halaman-halaman
 * yang pada akhirnya mengimpor balik routes.js untuk daftar ini), yang
 * membuat modul tersebut membaca nilai belum terinisialisasi saat load.
 */
export const publicReservedRoutePrefixes = Object.freeze([
  "admin",
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
  "contoh-katalog",
  "health",
  "uploads",
  "assets",
  "tester",
  "app",
]);
