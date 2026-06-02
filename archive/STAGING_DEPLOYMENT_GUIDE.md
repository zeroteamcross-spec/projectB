# Staging Deployment Guide

Panduan ini menyiapkan `projectB` untuk deployment staging nyata. `projectA` read-only dan tidak ikut deploy.

## Baseline

- Baseline Git: `projectB-v1-staging-ready`.
- Deploy hanya isi repository `projectB`.
- Web root wajib mengarah ke `projectB/public`.

## Server dan HTTPS

- [ ] Domain/subdomain staging tersedia, contoh `https://staging.example.test`.
- [ ] DNS mengarah ke server staging.
- [ ] HTTPS certificate valid.
- [ ] HTTP diarahkan ke HTTPS bila memungkinkan.
- [ ] Web server document root: `projectB/public`.
- [ ] File `.env`, `app`, `config`, dan `storage` tidak public.
- [ ] Request ke `/`, `/health`, dan `/api/health` masuk ke `public/index.php`.

## Runtime PHP

Wajib:

- PHP `>= 7.4`.
- Extension `json`.
- Extension `pdo`.
- Extension `pdo_mysql`.
- Extension `fileinfo`.

Disarankan:

- Extension `curl`, agar Midtrans HTTP call tidak memakai stream fallback.

## Database Staging

1. Buat database staging terpisah dari production.
2. Pastikan schema mengikuti `docs/SCHEMA_CANON.md`.
3. Isi `DB_*` di `.env`.
4. Validasi:

```bash
php scripts/check_environment.php --target=staging --check-db
```

## Storage

Direktori berikut harus ada dan writable oleh user web server:

```text
storage/logs
storage/cache
storage/uploads
```

Upload image memakai:

```text
storage/uploads/cars/{car_id}
```

Cleanup log default:

```text
storage/logs/car_images_cleanup.log
```

## Environment

Gunakan `docs/ENVIRONMENT_VARIABLES.md`. Nilai staging minimum:

```dotenv
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://staging.example.test
AUTH_REMEMBER_SECURE=true
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_VERIFY_SIGNATURE=true
MIDTRANS_CALLBACK_URL=https://staging.example.test/api/payments/midtrans/callbacks
MIDTRANS_CORE_API_BASE_URL=https://api.sandbox.midtrans.com
```

## Route Penting yang Harus Diverifikasi

Public/system:

- `GET /`
- `GET /health`
- `GET /api/health`
- `GET /api/cars`
- `GET /api/cars/{id}`
- `GET /api/cars/{car_id}/images`
- `GET /api/inspection-templates`
- `GET /api/cars/{car_id}/inspection-report`
- `GET /api/affiliate/referral-codes/{referral_code}/validate`
- `POST /api/affiliate/clicks`
- `GET /api/master-data/{master_key}`
- `GET /api/versions/{resource_name}`

Auth/protected:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/autologin`
- `POST /api/auth/otp/confirm`
- `GET /api/auth/pending-users`
- `POST /api/auth/approve-users`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/showrooms/me`
- `PATCH /api/showrooms/me`
- `GET /api/seller/cars`
- `POST /api/seller/cars`
- `PATCH /api/seller/cars/{id}`
- `DELETE /api/seller/cars/{id}`
- `GET /api/admin/cars`
- `PATCH /api/admin/cars/{id}`
- `DELETE /api/admin/cars/{id}`
- `POST /api/cars/{car_id}/images`
- `PATCH /api/cars/{car_id}/images/{image_id}/cover`
- `DELETE /api/cars/{car_id}/images/{image_id}`
- `POST /api/cars/{car_id}/inspection-reports`
- `PATCH /api/inspection-reports/{report_id}`
- `POST /api/inspection-reports/{report_id}/items`
- `PATCH /api/inspection-reports/{report_id}/items/{item_id}`
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/transactions/{transaction_id}`
- `GET /api/transactions/{transaction_id}/status`
- `PATCH /api/transactions/{transaction_id}/status`
- `POST /api/transactions/{transaction_id}/complete-payment`
- `POST /api/affiliates`
- `PATCH /api/affiliates/{affiliate_id}/settings`
- `GET /api/affiliates/{affiliate_id}/commission-ledgers`
- `POST /api/affiliates/{affiliate_id}/commission-ledgers`
- `POST /api/affiliate/referral-codes/generate`
- `GET /api/seller/affiliates`
- `GET /api/admin/sellers/{seller_user_id}/affiliates`
- `PUT /api/master-data/{master_key}`
- `PATCH /api/master-data/{master_key}`

Payment callback:

- `POST /api/payments/midtrans/callbacks`

## Midtrans Sandbox

1. Pakai sandbox server key dan client key.
2. Set dashboard Midtrans sandbox notification URL:

```text
https://staging.example.test/api/payments/midtrans/callbacks
```

3. Pastikan `.env` sama:

```dotenv
MIDTRANS_CALLBACK_URL=https://staging.example.test/api/payments/midtrans/callbacks
MIDTRANS_VERIFY_SIGNATURE=true
MIDTRANS_IS_PRODUCTION=false
```

4. Gunakan payment method input yang didukung:

```text
bca_va
bni_va
bri_va
mandiri_va
qris
gopay
shopeepay
```

Jangan gunakan `bank_transfer` sebagai `payment_method` request API. Nilai itu muncul di callback provider.

## Seed Smoke Readiness

Jika staging dipakai untuk UAT/smoke:

```bash
php scripts/seed_smoke_readiness.php
```

Credential smoke:

| Role | Email | Password |
|---|---|---|
| admin | `admin@projectb.local` | `SmokePass123!` |
| seller | `seller@projectb.local` | `SmokePass123!` |
| buyer | `buyer@projectb.local` | `SmokePass123!` |
| affiliate_admin | `affiliate@projectb.local` | `SmokePass123!` |

## Verifikasi Deployment

Jalankan:

```bash
php scripts/check_environment.php --target=staging --check-db
php tests/run.php
```

HTTP smoke:

- [ ] `GET /` HTTP 200.
- [ ] `GET /health` HTTP 200.
- [ ] `GET /api/cars` HTTP 200.
- [ ] `GET /api/inspection-templates` HTTP 200.
- [ ] `POST /api/auth/login` berhasil untuk akun smoke.

Payment smoke:

1. Login buyer.
2. `POST /api/transactions`:

```json
{
  "car_id": 1,
  "payment_type": "dp",
  "dp_amount": 50000000,
  "payment_method": "bca_va"
}
```

3. Catat `transaction.id`, `payment_session.provider_order_id`, dan `payment_session.payment_data.va_number`.
4. Bayar lewat Midtrans sandbox.
5. Tunggu callback nyata.
6. Cek `GET /api/transactions/{transaction_id}/status`.
7. Expected DP sukses: `transaction_status=dp_paid`.
8. Cek row di `transaction_payment_logs`.

## Kriteria Siap UAT

- [ ] Domain public HTTPS aktif.
- [ ] Web root benar.
- [ ] `.env` staging valid.
- [ ] DB staging dan schema siap.
- [ ] Storage writable.
- [ ] Readiness CLI lulus.
- [ ] Smoke seed berhasil.
- [ ] Login semua role smoke berhasil.
- [ ] Payment session Midtrans sandbox berhasil.
- [ ] Callback nyata masuk dan signature valid.
- [ ] Payment log tercatat.
