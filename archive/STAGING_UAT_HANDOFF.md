# Staging UAT Handoff

Dokumen ini merangkum status handoff `projectB` untuk deploy staging nyata dan UAT bisnis.

## Baseline

```text
projectB-v1-staging-ready
```

Scope:

- Deploy hanya `projectB`.
- `projectA` read-only dan tidak diubah.
- Dokumentasi mengikuti route/script/env yang ada di codebase `projectB` saat ini.

## Dokumen Utama

- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/STAGING_DEPLOYMENT_GUIDE.md`
- `docs/UAT_EXECUTION_PLAN.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/STAGING_GO_LIVE_CHECKLIST.md`
- `docs/FINAL_READINESS_REPORT.md`
- `docs/PRODUCTION_CAVEATS.md`
- `docs/LOCAL_MIDTRANS_MANUAL_TEST.md`

## Yang Harus Disiapkan Tim Deploy

- Domain public HTTPS.
- Web root ke `projectB/public`.
- Database staging dengan schema canon.
- `.env` staging.
- Credential Midtrans sandbox.
- Dashboard Midtrans sandbox notification URL:

```text
https://staging.example.test/api/payments/midtrans/callbacks
```

- Permission writable untuk `storage/logs`, `storage/cache`, `storage/uploads`.

## Urutan Eksekusi Handoff

1. Checkout baseline `projectB-v1-staging-ready`.
2. Setup domain/HTTPS dan web root.
3. Setup DB staging dan `.env`.
4. Jalankan:

```bash
php scripts/check_environment.php --target=staging --check-db
```

5. Jalankan seed bila butuh data UAT:

```bash
php scripts/seed_smoke_readiness.php
```

6. Jalankan:

```bash
php tests/run.php
```

7. Verifikasi health dan smoke endpoint.
8. Jalankan UAT per `docs/UAT_EXECUTION_PLAN.md`.
9. Verifikasi callback nyata Midtrans.
10. Catat hasil di laporan UAT.

## Caveat Terakhir

- Staging masih sandbox Midtrans.
- Callback nyata membutuhkan public HTTPS, bukan localhost.
- Tool replay/fetch Midtrans hanya untuk local/dev.
- Belum ada retry queue payment.
- Belum ada auto reservation stok saat transaksi dibuat.
- Credential smoke tidak boleh dipakai production.

## Keputusan Go/No-Go

Keputusan go/no-go UAT harus berdasarkan:

- `docs/STAGING_GO_LIVE_CHECKLIST.md`
- hasil UAT aktual
- hasil callback nyata Midtrans
- daftar caveat di `docs/PRODUCTION_CAVEATS.md`
