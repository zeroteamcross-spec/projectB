# Caching aset frontend

Aset dimuat dari jalur beversi:

```
/assets/v-tjlio9/js/app.js   ->   public/assets/js/app.js
```

Tujuannya satu: pengguna boleh menyimpan berkas selamanya, tapi **tidak mungkin
tersangkut menjalankan JavaScript lama setelah deploy**. Sebelum ini setiap aset
dikirim dengan `Cache-Control: no-cache`, yang memaksa 146 permintaan validasi
di setiap kunjungan hanya untuk diberi tahu bahwa tidak ada yang berubah.

## Kenapa cukup satu titik, tanpa build step

Specifier `import` yang relatif diselesaikan terhadap URL modul yang
mengimpornya, bukan terhadap akar situs. Jadi begitu titik masuk dimuat sebagai
`/assets/v-ABC/js/app.js`, `import "./core/router.js"` di dalamnya otomatis
menjadi `/assets/v-ABC/js/core/router.js`. Seluruh graf 168 modul mewarisi
prefiks dari satu placeholder di HTML.

**Konsekuensinya: `import` absolut merusak rantai ini.** Berkas yang ditulis
`from "/assets/js/x.js"` keluar dari prefiks, tidak pernah ikut berganti URL,
dan disajikan dari cache lama selamanya. Tidak ada error, tidak ada gejala --
pengguna hanya menjalankan kode basi. `tests/Unit/FrontendAssetVersioningTest.php`
yang menjaga ini; tes itu gagal kalau ada import absolut, string `/assets/`
absolut di JS, tag `<script>` tanpa placeholder di HTML entry, atau `index.php`
kehilangan `no-store`.

## Bagian-bagiannya

| Tempat | Perannya |
| --- | --- |
| `public/index.html`, `public/app.html` | Memuat aset lewat `/assets/v-__ASSET_VER__/...` |
| `public/index.php` -> `assetVersionToken()` | Token = mtime terbaru di `public/assets`, base36 |
| `public/index.php` -> `serveVersionedAsset()` | Melayani jalur beversi (dev, dan cadangan di produksi) |
| `extension/carlynk.id/aset-beversi.conf` | Nginx melayaninya langsung dari disk + header immutable |
| `tests/Unit/FrontendAssetVersioningTest.php` | Menjaga syarat di atas |

Token dihitung **hanya saat melayani HTML** -- sekali per buka halaman, bukan
pada ratusan permintaan asetnya.

## Yang membuatnya aman

HTML tidak pernah disimpan peramban (`index.php` mengirim `no-store`), jadi
penunjuk versinya selalu yang terbaru. Deploy mengubah berkas, mtime naik, token
berubah, seluruh URL modul berubah, peramban wajib mengambil ulang. Tidak ada
langkah manual yang bisa terlupa.

**Kalau HTML sampai ikut ter-cache, seluruh mekanisme ini runtuh** -- pengguna
akan tertahan pada token lama dan tidak akan pernah menerima pembaruan. Itu
sebabnya tesnya ikut memeriksa `no-store`.

Token lama tetap dilayani dengan sengaja: tab yang sudah telanjur terbuka saat
deploy berlangsung tidak mendadak rusak.

## Hasil ukur di carlynk.id

| | Permintaan JS | Terkirim | `load` |
| --- | --- | --- | --- |
| Sebelum (semua `no-cache`) | 146 divalidasi tiap kunjungan | 43 KB | ~2,9 dtk |
| Kunjungan pertama | 148 | 445 KB | ~12 dtk |
| Kunjungan kedua | **0** | **0 KB** | **0,8 dtk** |
| Setelah deploy | 148 (ambil ulang semua) | 445 KB | ~12 dtk |
| Kunjungan sesudahnya | **0** | **0 KB** | **1,1 dtk** |

Kunjungan pertama masih ~12 detik karena 148 modul kecil diambil satu per satu.
Itu batas berikutnya, dan menyelesaikannya butuh bundling -- di luar cakupan
perubahan ini.

## Jebakan: URL berakhiran `.js` yang bukan berkas

Di carlynk.id, **setiap URL yang berakhiran `.js` dan tidak ada berkasnya di
disk dijawab dengan status 404**, meskipun badan responsnya tetap datang dari
PHP dengan benar. Nginx punya aturan yang mencocokkan akhiran itu, gagal
menemukan berkasnya, lalu meneruskan ke PHP lewat `error_page` tanpa
mengembalikan status.

Bisa dibuktikan dari luar:

| Permintaan | Status | Badan |
| --- | --- | --- |
| `/tidak-ada.txt` | 200 | shell SPA |
| `/tidak-ada.js` | **404** | shell SPA, isi sama persis |

Ini pernah memakan korban: shell memuat tema lewat
`<script src="/api/theme/runtime-config.js">`. Responsnya benar, statusnya 404,
peramban membatalkan skripnya, dan seluruh tema diam-diam kembali ke bawaan --
nama aplikasi, warna, dan logo dari Konfigurasi WEB tidak pernah terpakai.
Tidak ada error di sisi PHP maupun di konsol yang menyebut tema.

Temanya sekarang ditanam langsung ke HTML (`themeConfigJson()` di
`public/index.php`), jadi tidak ada permintaan kedua yang bisa gagal.
`tests/Unit/ThemeBootstrapTest.php` menjaga bentuk itu.

**Sebelum membuat endpoint API baru, jangan beri akhiran `.js`** selama aturan
Nginx-nya belum diperbaiki.

## Melepasnya

1. Hapus `/www/server/panel/vhost/nginx/extension/carlynk.id/aset-beversi.conf`,
   jalankan `nginx -t`, lalu `nginx -s reload`.
2. Aplikasi tetap jalan: `public/index.php` juga melayani jalur beversi sendiri,
   hanya lewat PHP dan tanpa header immutable.
3. Untuk kembali sepenuhnya, ganti `/assets/v-__ASSET_VER__/` di kedua berkas
   HTML menjadi `/assets/`, dan sesuaikan tesnya.

Cadangan konfigurasi Nginx sebelum perubahan ada di
`/root/carlynk.id.conf.bak-20260811-150505` di server.
