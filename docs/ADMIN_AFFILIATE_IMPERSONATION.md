# ADMIN_AFFILIATE_IMPERSONATION.md

## 1. Tujuan fitur

Fitur ini memungkinkan admin masuk sebagai akun target untuk kebutuhan support, verifikasi UI, dan pengecekan data tanpa mengetahui password akun target.

Scope yang saat ini didukung:

- `seller`
- `affiliate_admin`

Impersonation tidak dimaksudkan sebagai login permanen, tidak mengganti password target, dan tidak menyembunyikan fakta bahwa sesi sedang di-impersonate.

---

## 2. Role dan scope

- actor yang boleh memulai impersonation: `admin`
- target yang boleh di-impersonate:
  - `seller`
  - `affiliate_admin`
- impersonation ke `buyer` atau `admin` tidak dibuka oleh flow ini

UI boleh memakai label:

- `Seller`
- `Affiliate`

Tetapi role auth canon tetap:

- `seller`
- `affiliate_admin`

---

## 3. Endpoint contract

### Start impersonation seller

`POST /api/admin/sellers/{seller_user_id}/impersonate`

Body:

```json
{
  "reason": "Support check"
}
```

### Start impersonation affiliate

`POST /api/admin/affiliates/{affiliate_user_id}/impersonate`

Body:

```json
{
  "reason": "Support check"
}
```

### Stop impersonation

`POST /api/admin/impersonations/stop`

Response stop mengembalikan auth context admin asli:

```json
{
  "user": { "...": "restored admin context" },
  "actor": { "...": "restored admin context" },
  "impersonation": null
}
```

### Auth context

`/api/auth/autologin` dan auth context server-side mengembalikan:

- `user` = target aktif saat impersonating
- `actor` = admin asli
- `impersonation` = metadata sesi impersonation

Field penting:

```json
{
  "impersonation": {
    "is_impersonating": true,
    "session_id": 12,
    "started_at": "2026-06-01 10:00:00",
    "expires_at": "2026-06-01 14:00:00",
    "original_admin_id": 1,
    "original_admin_name": "Admin",
    "impersonated_user_id": 28,
    "impersonated_role": "affiliate_admin"
  }
}
```

---

## 4. Session / auth model

- source of truth tetap server-side:
  - remember cookie admin asli
  - impersonation cookie terpisah
  - tabel `admin_impersonation_sessions`
- password target tidak pernah dibaca atau disimpan
- token target mentah tidak diekspos
- stop impersonation menghapus cookie impersonation dan memulihkan context admin asli

---

## 5. Audit log

Audit dilakukan lewat dua lapis:

1. `admin_impersonation_sessions`
   - menyimpan admin asli, target user, target role, waktu mulai, expiry, waktu selesai, dan ended reason
2. `storage/logs/admin_affiliate_impersonation.log`
   - JSON line per event
   - event:
     - `impersonation_started`
     - `impersonation_stopped`

Payload audit minimal:

- `session_id`
- `actor_admin_id`
- `actor_admin_name`
- `target_user_id`
- `target_role`
- `target_name`
- `reason`
- `ip_address`
- `user_agent`
- timestamp event

Tidak ada password, server key, atau credential sensitif yang dicatat.

---

## 6. UI admin flow

Lokasi entry point saat ini:

- `#/admin/users`

Perilaku:

1. admin buka user seller atau affiliate
2. tombol `Login sebagai Seller` hanya muncul untuk user `seller`
3. tombol `Login sebagai Affiliate` hanya muncul untuk user `affiliate_admin`
4. modal konfirmasi tampil
5. modal tidak menutup lewat backdrop
6. admin konfirmasi
7. frontend memanggil endpoint impersonation sesuai role target
8. auth store berganti ke context target
9. working state dibersihkan
10. redirect tanpa reload:
   - seller -> `#/seller`
   - affiliate_admin -> `#/affiliate`

---

## 7. Banner kembali ke admin

Saat impersonation aktif, shell menampilkan banner global:

- seller:
  - `Anda sedang login sebagai Seller: {nama}`
- affiliate:
  - `Anda sedang login sebagai Affiliate: {nama}`
- baris actor:
  - `Admin asli: {nama admin}`
- aksi:
  - `Kembali ke Admin`

Elemen penting:

- host app shell: `#app_impersonation_banner_host`
- host public shell: `#public_impersonation_banner_host`
- panel banner: `#global_impersonation_banner`
- tombol stop: `#global_impersonation_return_button`

Stop impersonation:

- memanggil endpoint stop
- memulihkan auth context admin
- membersihkan working state
- redirect ke `#/admin`

---

## 8. Mutation safety

Default policy yang diterapkan:

- impersonation dipakai untuk inspeksi/support
- perubahan profil affiliate diblokir
- perubahan password affiliate diblokir

Guard diterapkan di backend dan UI profile.

Pesan backend:

- `Profil affiliate tidak dapat diubah saat admin sedang login sebagai affiliate.`
- `Password affiliate tidak dapat diubah saat admin sedang login sebagai affiliate.`

Seller dan affiliate route read-only/support tetap dapat diakses untuk verifikasi data.

---

## 9. Notification dan preload behavior

- role auth aktif berubah mengikuti target:
  - `seller`
  - `affiliate_admin`
- role guard frontend otomatis menutup akses ke route admin saat impersonation aktif
- notification bell mengikuti context target
- open popover tetap tidak fetch on open
- working state dibersihkan saat start/stop impersonation
- snapshot `admin`, `seller`, dan `affiliate_admin` dibersihkan saat switch

Tidak ada `location.reload()` sebagai mekanisme sync.

---

## 10. Security notes

- admin tidak memerlukan password target
- target role divalidasi di backend
- route admin tidak terbuka saat role aktif bukan `admin`
- state impersonation selalu terlihat di UI
- endpoint stop memverifikasi sesi impersonation aktif
- profile/password mutation sensitif affiliate diblokir saat impersonating

---

## 11. Smoke checklist

Latest emergency verification: 2026-06-02 on `http://127.0.0.1:8035`.

- [x] login admin
- [x] buka `#/admin/users`
- [x] cari user seller
- [x] cari user affiliate
- [x] tombol `Login sebagai Seller` terlihat
- [x] tombol `Login sebagai Affiliate` terlihat
- [x] modal seller tampil dan tidak close via backdrop
- [x] modal affiliate tampil dan tidak close via backdrop
- [x] seller impersonation redirect ke `#/seller`
- [x] affiliate impersonation redirect ke `#/affiliate`
- [x] banner seller tampil
- [x] banner affiliate tampil
- [x] `#/seller/cars` dan `#/seller/transactions` terbuka saat seller impersonation
- [x] `#/affiliate/ledger` dan `#/affiliate/settlements` terbuka saat affiliate impersonation
- [x] klik `Kembali ke Admin` kembali ke `#/admin`
- [x] banner hilang setelah stop

Evidence browser smoke:

- `storage/browser-smoke/admin_impersonation_smoke.json`

---

## 12. Known limitations

- belum ada halaman admin khusus untuk membaca audit log impersonation dari UI
- audit event file log saat ini dibaca dari storage/log, bukan dashboard admin
- mutation safety seller belum diperketat lebih lanjut karena scope bug ini hanya restore seller + affiliate impersonation existing
