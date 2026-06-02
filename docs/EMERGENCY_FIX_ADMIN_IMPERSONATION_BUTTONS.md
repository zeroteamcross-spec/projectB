# EMERGENCY_FIX_ADMIN_IMPERSONATION_BUTTONS.md

## 1. Bug user yang benar

Bug yang dilaporkan dan harus dipulihkan:

1. tombol admin `Login sebagai Seller` tidak ada
2. admin `Login sebagai Affiliate` tidak berfungsi

Scope emergency fix ini sengaja dibatasi ke pemulihan impersonation seller + affiliate dan stop impersonation.

---

## 2. Root cause tombol seller hilang

Root cause ada di:

- `public/assets/js/modules/admin/components/adminUsersList.js`

Masalah spesifik:

- action list membuat tombol impersonation dengan label literal `Login `.
- `adminUserManagementService.impersonationLabel(user)` sudah dihitung, tetapi tidak dipakai di label tombol list.
- smoke admin UI mencari kontrak teks final `Login sebagai Seller` dan `Login sebagai Affiliate`, sehingga tombol list tidak memenuhi kontrak tampilan.
- detail modal sudah memakai label role yang benar, tetapi user management list adalah surface utama yang diuji/dipakai.

Akibat:

- tombol seller/affiliate pada list terlihat sebagai tombol generic `Login`, bukan `Login sebagai Seller` / `Login sebagai Affiliate`.
- dari sisi user ini terbaca sebagai tombol seller yang hilang karena tidak ada action eksplisit `Login sebagai Seller`.

---

## 3. Root cause affiliate impersonation gagal

Root cause aktual pada emergency verification ini sama dengan list action label:

- `public/assets/js/modules/admin/components/adminUsersList.js` tidak menampilkan label `Login sebagai Affiliate`.
- tombol list tetap ada secara DOM saat target active/approved, tetapi teksnya hanya `Login`.
- akibatnya admin UI tidak menyediakan action yang jelas dan smoke/user tidak dapat menemukan tombol `Login sebagai Affiliate`.

Backend route-specific affiliate impersonation diverifikasi berfungsi:

- `POST /api/admin/affiliates/{affiliate_user_id}/impersonate`
- auth context berubah ke `user.role = affiliate_admin`
- `actor.role = admin`
- `impersonation.is_impersonating = true`

---

## 4. File yang diubah

Runtime:

- `public/assets/js/modules/admin/components/adminUsersList.js`

Support / evidence:

- `scripts/admin_impersonation_smoke.js`

Docs:

- `docs/ADMIN_AFFILIATE_IMPERSONATION.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/EMERGENCY_FIX_ADMIN_IMPERSONATION_BUTTONS.md`

---

## 5. Endpoint final

Seller impersonation:

- `POST /api/admin/sellers/{seller_user_id}/impersonate`

Affiliate impersonation:

- `POST /api/admin/affiliates/{affiliate_user_id}/impersonate`

Stop impersonation:

- `POST /api/admin/impersonations/stop`

---

## 6. UI button final

Untuk target role `seller`:

- `Login sebagai Seller`

Untuk target role `affiliate_admin`:

- `Login sebagai Affiliate`

Button tidak dipakai untuk role lain.

---

## 7. Browser smoke admin UI

Environment:

- base URL: `http://127.0.0.1:8035`
- admin: `admin@projectb.local`

Target yang diuji:

- seller user id `26` / `uat_aff_fin_20260601_145953_seller@projectb.local`
- affiliate user id `28` / `uat_aff_fin_20260601_145953_affiliate@projectb.local`

Hasil:

- tombol `Login sebagai Seller`: terlihat
- tombol `Login sebagai Affiliate`: terlihat

Evidence:

- `storage/browser-smoke/admin_impersonation_smoke.json`

---

## 8. Browser smoke admin as seller

Hasil:

- modal seller tampil
- klik backdrop tidak menutup modal
- confirm berhasil
- redirect ke `#/seller`
- auth context:
  - `user.role = seller`
  - `actor.role = admin`
  - `impersonation.is_impersonating = true`
  - `impersonation.impersonated_role = seller`
- route seller yang dibuka:
  - `#/seller`
  - `#/seller/cars`
  - `#/seller/transactions`
- `Kembali ke Admin` berhasil
- redirect kembali ke `#/admin`
- banner hilang

---

## 9. Browser smoke admin as affiliate

Hasil:

- modal affiliate tampil
- klik backdrop tidak menutup modal
- confirm berhasil
- redirect ke `#/affiliate`
- auth context:
  - `user.role = affiliate_admin`
  - `actor.role = admin`
  - `impersonation.is_impersonating = true`
  - `impersonation.impersonated_role = affiliate_admin`
- route affiliate yang dibuka:
  - `#/affiliate`
  - `#/affiliate/ledger`
  - `#/affiliate/settlements`
- `Kembali ke Admin` berhasil
- redirect kembali ke `#/admin`
- banner hilang

---

## 10. Regression minimal

PASS:

- admin normal login -> `#/admin`
- seller normal login -> `#/seller`
- affiliate_admin normal login -> `#/affiliate`

---

## 11. Test result

- `node --check` runtime files yang diubah: PASS
- `node --check scripts/admin_impersonation_smoke.js`: PASS
- `php tests/run.php`: PASS, `13 passed, 0 failed`
- browser smoke admin as seller: PASS
- browser smoke admin as affiliate: PASS

---

## 12. Final status

`SAFE`
