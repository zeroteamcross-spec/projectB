# Subdomain admin

Satu aplikasi, dua pintu masuk. Tidak ada kode yang dipecah, tidak ada
deployment kedua.

| Host | Melayani |
| --- | --- |
| `carlynk.id` | publik, buyer, seller, marketing |
| `admin.carlynk.id` | admin dan super admin saja |

Hanya admin yang dipisahkan. Seller dan marketing tetap di domain utama.

## Kenapa tidak dipecah jadi aplikasi terpisah

Backend, database, otentikasi, dan sebagian besar modul UI dipakai bersama.
Memecahnya berarti empat deployment, otentikasi lintas-origin (CORS plus cookie
`SameSite=None`), dan komponen bersama yang harus diduplikasi. Satu-satunya
keuntungan -- JS lebih ramping per peran -- sudah ditangani manifest peran yang
dimuat malas lewat `resolveMissing` di `core/router.js`.

Karena tiap subdomain menyajikan aplikasi yang sama, panggilan `/api` tetap
same-origin. Tidak ada CORS di sini.

## Cara menyalakannya

Tiga hal, dan ketiganya harus lengkap:

1. **DNS** -- record A `admin.carlynk.id` ke IP server.
2. **Nginx** -- host ditambahkan ke `server_name` pada vhost yang sudah ada,
   satu vhost melayani keduanya. Sertifikat harus mencakup kedua host.
3. **`.env`** -- tiga baris:

   ```
   ROLE_HOST_DEFAULT=carlynk.id
   ROLE_HOST_ADMIN=admin.carlynk.id
   AUTH_COOKIE_DOMAIN=.carlynk.id
   ```

**Jangan isi `.env` sebelum DNS-nya hidup.** Begitu `ROLE_HOST_ADMIN` terisi,
`/#/admin` di domain utama langsung dilempar ke subdomain; kalau host itu belum
resolve, admin tidak punya jalan masuk sama sekali.

## Kenapa cookienya butuh Domain

Cookie tanpa atribut `Domain` hanya berlaku di host yang menerbitkannya. Admin
login di `admin.carlynk.id`, lalu impersonation memanggil
`window.location.hash = "#/seller"` (`modules/admin/pages/usersPage.js`), yang
oleh penjaga domain dilempar ke domain utama -- dan cookienya tidak ikut. Sesi
hilang tanpa pesan galat.

`AUTH_COOKIE_DOMAIN=.carlynk.id` membuat sesi berlaku di induk beserta seluruh
subdomainnya. Semua cookie autentikasi dirakit di `app/Core/Auth/AuthCookie.php`
supaya atribut ini tidak mungkin terpasang di sebagian tempat saja;
`tests/Unit/AuthCookieTest.php` gagal kalau ada berkas lain yang merakitnya
sendiri.

## Aturan host admin

`public/assets/js/core/domainRouteGuard.js`:

- `/#/admin` dan `/#/super-admin` di domain utama dilempar ke subdomain.
- Host admin hanya melayani rute admin dan `/#/login/admin`. Rute lain --
  dashboard seller, katalog, halaman mobil -- dikembalikan ke domain utama.
- Peta hostnya datang dari server lewat `window.__PROJECTB_ROLE_HOSTS__`, diisi
  `public/index.php` dari `config/app.php`.
- **Peta kosong berarti penjaga ini diam total.** Itu keadaan bawaannya, dan itu
  yang membuat pengembangan lokal serta domain lain tidak terpengaruh.

Tidak ada jalur yang memantul dua kali: apa pun yang mendarat di domain utama
memetakan ke domain utama.

## Mematikannya lagi

Kosongkan `ROLE_HOST_DEFAULT`, `ROLE_HOST_ADMIN`, dan `AUTH_COOKIE_DOMAIN` di
`.env`. Penjaganya diam, cookie kembali host-only. Tidak perlu menyentuh kode,
tidak ada perubahan database.

Catatan: pengguna yang sudah memegang cookie ber-domain tidak otomatis
kehilangan sesinya saat konfigurasi dikosongkan, karena penghapusnya tidak lagi
menyebut domain yang sama. Kalau itu mengganggu, ganti nama cookie sekalian.
