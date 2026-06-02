# Role-Specific Login Pages

## 1. Tujuan

Menambahkan halaman login baru yang terkunci per role tanpa mengubah halaman login existing.

## 2. Route Baru

- Buyer: `#/login/buyer`
- Admin: `#/login/admin`
- Seller: `#/login/seller`
- Affiliate: `#/login/affiliate`

## 3. Login Existing

Login existing tetap di `#/auth`.

File existing login tidak diubah:

- `public/assets/js/modules/public/pages/authLandingPage.js`
- `public/assets/js/modules/public/services/publicAuthLandingService.js`

## 4. Role Lock Behavior

Setiap route hanya menerima role canon yang sesuai:

- `#/login/buyer` menerima `buyer`
- `#/login/admin` menerima `admin`
- `#/login/seller` menerima `seller`
- `#/login/affiliate` menerima `affiliate_admin`

Jika credential valid tetapi role tidak sesuai, user tetap berada di halaman login role-specific dan melihat error:

```txt
Akun ini bukan akun <Role>. Silakan gunakan halaman login yang sesuai.
```

## 5. Positive Login Mapping

- `buyer` -> `#/buyer`
- `admin` -> `#/admin`
- `seller` -> `#/seller`
- `affiliate_admin` -> `#/affiliate`

## 6. Negative Mismatch Behavior

Mismatch tidak diarahkan ke dashboard role lain.

Flow:

1. Submit credential ke login API existing.
2. Ambil role dari auth context hasil response.
3. Jika role salah, bersihkan session.
4. Clear `authStore`.
5. Tampilkan error pada halaman role-specific.

## 7. Session Cleanup On Mismatch

Cleanup dilakukan dari service frontend role-specific:

- mencoba `authService.logout()` terlebih dahulu.
- fallback additive ke `POST /api/auth/logout` jika profile logout gagal.
- clear `authStore` setelah fallback.

Tidak ada endpoint login existing yang diubah.

## 8. Regression Matrix

Positive:

- Buyer login page + akun buyer -> `#/buyer`
- Admin login page + akun admin -> `#/admin`
- Seller login page + akun seller -> `#/seller`
- Affiliate login page + akun affiliate_admin -> `#/affiliate`

Negative:

- Buyer login page + akun seller -> ditolak
- Admin login page + akun affiliate_admin -> ditolak
- Seller login page + akun buyer -> ditolak
- Affiliate login page + akun admin -> ditolak

Existing:

- `#/auth` tetap terbuka dan memakai behavior lama.

## 9. Files Changed

- `public/assets/js/core/app.js`
- `public/assets/js/modules/auth/manifest.js`
- `public/assets/js/modules/auth/routes.js`
- `public/assets/js/modules/auth/pages/roleSpecificLoginPage.js`
- `public/assets/js/modules/auth/services/roleSpecificLoginService.js`
- `public/assets/js/modules/profile/pages/profilePage.js`
- `docs/ROLE_SPECIFIC_LOGIN_PAGES.md`

## 10. Known Limitations

- Halaman role-specific memakai validasi frontend setelah response login existing. Tidak ada endpoint backend role-login khusus.
- Browser smoke tetap wajib dijalankan dengan credential aktif pada environment target.
