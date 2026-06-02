# Final Readiness Report

Tanggal dokumen: 2026-04-16

## Ringkasan

`projectB` memiliki baseline Git untuk staging:

```text
projectB-v1-staging-ready
```

Scope readiness:

- Dokumentasi staging dan UAT disiapkan di `projectB/docs`.
- `projectA` tidak diubah.
- Tidak ada modul bisnis baru.
- Tidak ada refactor aplikasi.
- Fokus readiness: deploy staging, env, UAT, Midtrans callback nyata, dan operasi minimum.

## Status Dokumen

| Dokumen | Status | Catatan |
|---|---|---|
| `ENVIRONMENT_VARIABLES.md` | Ready | Env aktual dari config projectB |
| `STAGING_DEPLOYMENT_GUIDE.md` | Ready | Domain HTTPS, DB, storage, route, Midtrans |
| `UAT_EXECUTION_PLAN.md` | Ready | Admin, seller, buyer, affiliate, payment |
| `OPERATIONS_RUNBOOK.md` | Ready | Readiness, seed, cleanup, logs, triage |
| `STAGING_GO_LIVE_CHECKLIST.md` | Ready | Checklist go/no-go staging |
| `PRODUCTION_CAVEATS.md` | Ready | Caveat sebelum production |
| `STAGING_UAT_HANDOFF.md` | Ready | Ringkasan handoff |

## Status Teknis yang Perlu Diverifikasi di Server

- [ ] PHP `>= 7.4`.
- [ ] Extension `json`, `pdo`, `pdo_mysql`, `fileinfo`.
- [ ] Extension `curl` tersedia atau stream fallback diterima.
- [ ] Web root ke `projectB/public`.
- [ ] DB staging reachable.
- [ ] Storage writable.
- [ ] `.env` staging sesuai `ENVIRONMENT_VARIABLES.md`.
- [ ] `php scripts/check_environment.php --target=staging --check-db` lulus.
- [ ] `php tests/run.php` lulus di server staging.

## Status Payment yang Perlu Diverifikasi

- [ ] `POST /api/transactions` menghasilkan payment session sandbox.
- [ ] `payment_session.payment_data.va_number` muncul untuk `bca_va`.
- [ ] Callback nyata Midtrans masuk ke `POST /api/payments/midtrans/callbacks`.
- [ ] Signature callback valid dengan `MIDTRANS_VERIFY_SIGNATURE=true`.
- [ ] DP settlement menjadi `dp_paid`.
- [ ] Full settlement menjadi `paid`.
- [ ] Log tercatat di `transaction_payment_logs`.

## Known Caveats

- Staging/UAT masih memakai Midtrans sandbox.
- Callback nyata membutuhkan domain public HTTPS, bukan localhost.
- Tidak ada retry queue payment; audit dilakukan melalui `transaction_payment_logs`.
- Data teknis VA/QR/deeplink disimpan di payload log/session, bukan kolom khusus.
- Reservasi stok/listing belum otomatis saat transaksi dibuat.
- Script replay/fetch Midtrans adalah local/dev tooling, bukan bypass staging.

## Kesimpulan

Dokumentasi operasional cukup untuk handoff staging, dengan syarat tim deploy menyediakan domain public HTTPS, DB staging, `.env` valid, credential Midtrans sandbox, dan menjalankan checklist go-live.
