/**
 * Konfigurasi build statis, menggantikan mesin JIT yang dulu jalan di
 * peramban (public/assets/js/theme/tailwindcss.js, dihapus).
 *
 * Satu-satunya perluasan tema yang pernah didaftarkan di runtime lama
 * (tailwindRuntimeConfig.js -> syncTailwindConfig) adalah:
 *   - theme.extend.colors.brand dengan sejumlah tingkat kegelapan -- diperiksa,
 *     TIDAK ada satu pun kelas warna brand itu dipakai di seluruh kode.
 *     Aman diabaikan.
 *   - theme.extend.boxShadow.card -- DIPAKAI (grep: 111 kecocokan literal
 *     "shadow-card" tersebar di banyak halaman). Nilai aslinya dihitung dari
 *     theme.layout.shadowDepth yang bisa diubah admin lewat Design Studio.
 *     Supaya kelas shadow-card tetap ikut berubah live setelah build statis
 *     ini, nilainya diarahkan ke custom property yang sudah dipakai di
 *     tempat lain untuk hal yang sama: var(--pb-shadow-card). Itu disetel di
 *     <html> oleh tailwindRuntimeConfig.js setiap tema diterapkan, jadi kelas
 *     shadow-card di CSS statis ini hanya menunjuk ke variabel itu -- bukan
 *     ke angka tetap.
 */
module.exports = {
  content: [
    "./public/index.html",
    "./public/app.html",
    "./public/assets/js/**/*.js",
  ],
  theme: {
    extend: {
      boxShadow: {
        card: "var(--pb-shadow-card)",
      },
    },
  },
  plugins: [],
};
