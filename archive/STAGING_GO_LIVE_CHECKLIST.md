# Staging Go-Live Checklist

Checklist keputusan sebelum staging dibuka untuk UAT bisnis.

## Source dan Deploy

- [ ] Source berasal dari tag `projectB-v1-staging-ready`.
- [ ] `projectA` tidak diubah dan tidak ikut deploy.
- [ ] Working tree staging bersih.
- [ ] Web root mengarah ke `projectB/public`.
- [ ] `.env` tidak public.

## Domain dan HTTPS

- [ ] Domain staging public aktif.
- [ ] HTTPS certificate valid.
- [ ] `APP_URL` memakai URL HTTPS staging.
- [ ] `GET /` HTTP 200.
- [ ] `GET /health` HTTP 200.

## Database dan Storage

- [ ] Database staging terpisah dari production.
- [ ] Schema sesuai `docs/SCHEMA_CANON.md`.
- [ ] `php scripts/check_environment.php --target=staging --check-db` lulus.
- [ ] `storage/logs` writable.
- [ ] `storage/cache` writable.
- [ ] `storage/uploads` writable.

## Env dan Auth

- [ ] `APP_ENV=staging`.
- [ ] `APP_DEBUG=false`.
- [ ] `AUTH_REMEMBER_SECURE=true`.
- [ ] Smoke seed berhasil jika diperlukan.
- [ ] Admin smoke login berhasil.
- [ ] Seller smoke login berhasil dan approved.
- [ ] Buyer smoke login berhasil.
- [ ] Affiliate admin smoke login berhasil.

## Midtrans Sandbox

- [ ] `MIDTRANS_SERVER_KEY` sandbox valid.
- [ ] `MIDTRANS_CLIENT_KEY` sandbox valid.
- [ ] `MIDTRANS_IS_PRODUCTION=false`.
- [ ] `MIDTRANS_VERIFY_SIGNATURE=true`.
- [ ] `MIDTRANS_CALLBACK_URL` public HTTPS:

```text
https://staging.example.test/api/payments/midtrans/callbacks
```

- [ ] Dashboard Midtrans sandbox notification URL sama.
- [ ] `POST /api/transactions` dengan `bca_va` berhasil.
- [ ] VA number muncul di `payment_session.payment_data.va_number`.
- [ ] Callback settlement nyata masuk HTTP 200.
- [ ] Status DP menjadi `dp_paid` atau full menjadi `paid`.
- [ ] `transaction_payment_logs` mencatat callback.

## Jobs dan Operasional

- [ ] `php tests/run.php` lulus.
- [ ] `php scripts/purge_deleted_car_images.php --days=30 --limit=100` bisa dijalankan.
- [ ] Log cleanup bisa ditulis.
- [ ] Web server access/error log dapat diakses tim operasi.
- [ ] Runbook tersedia: `docs/OPERATIONS_RUNBOOK.md`.

## Keputusan

- [ ] Siap staging UAT.
- [ ] Siap handoff ke tester/owner.
- [ ] Belum siap karena blocker tercatat.
