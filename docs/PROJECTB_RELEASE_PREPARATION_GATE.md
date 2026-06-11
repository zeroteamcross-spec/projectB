# ProjectB Release Preparation Gate

Date: 2026-06-01

## 1. Release Status

Status: Conditional GO.

Reason:
- final full regression gate sudah GO.
- `php tests/run.php` lulus `13 passed, 0 failed`.
- release evidence, SQL patch order, backup/rollback plan, dan deployment checklist sudah terdokumentasi.
- payment provider real UAT dan production callback readiness masih blocked oleh URL HTTPS publik dan nilai environment target yang belum dikonfirmasi.

## 2. Scope Included

- release-readiness audit untuk runtime existing.
- SQL patch order untuk patch terbaru yang wajib diketahui saat deploy target.
- environment checklist dengan placeholder `TO_CONFIRM`.
- payment provider readiness gate.
- backup and rollback plan.
- UAT evidence / cleanup guidance.
- release candidate changelog.
- deployment checklist.

Di luar scope:
- fitur baru.
- schema redesign.
- perubahan business canon.
- real provider UAT.
- destructive cleanup data.

## 3. Regression Status

- final regression gate status: GO.
- admin route gaps `#/admin/pending-users` dan `#/admin/cars` sudah ditutup.
- buyer dashboard name visibility sync sudah terbukti tanpa reload.
- seller images hardening pass.
- seller inspection hardening pass.
- affiliate finance backend/runtime/browser smoke pass.
- notification, shared preload sync, business status sync, dan background video sudah melewati gate sebelumnya.

## 4. Test Suite Status

- `php tests/run.php`: `13 passed, 0 failed`.
- `php scripts/check_environment.php --target=local`: pass.
- `php scripts/check_environment.php --target=production`: fail expected for current local values because callback masih `http://localhost:8000/...` dan DB connectivity strict belum dijalankan di target server.

## 5. Release Readiness Audit

### Sudah siap

- modul route API sudah terdaftar dari root `routes/api.php`.
- callback Midtrans route sudah tersedia di `POST /api/payments/midtrans/callbacks`.
- signature verification payment dikunci aktif di readiness checker.
- notifikasi global memakai preload-first + polling 45 detik, tanpa fetch saat popover dibuka.
- storage direktori local tersedia:
  - `storage/uploads`
  - `storage/logs`
  - `storage/cache`
  - `storage/backups`
- upload path runtime terdefinisi:
  - `STORAGE_UPLOADS_PATH`
  - `STORAGE_PUBLIC_UPLOADS_PREFIX`
  - `STORAGE_CLEANUP_LOG_PATH`
- local readiness checker ada: `scripts/check_environment.php`.
- smoke artifacts dan fallback backup artifact sudah ada di `storage/browser-smoke` dan `storage/backups`.

### Perlu diisi manual

- nilai production/staging untuk `.env`.
- domain final `APP_URL`.
- `MIDTRANS_CALLBACK_URL` HTTPS publik.
- keputusan target storage publik:
  - apakah tetap `storage/uploads`
  - bagaimana web server mempublikasikan file tersebut
- backup window dan owner deploy.
- DB connectivity check di server target dengan `--check-db`.
- credential Midtrans target dan masking evidence.
- apakah `public/uploads/demo` ikut dideploy atau dikeluarkan dari paket produksi.

### Blocking untuk production

- `MIDTRANS_CALLBACK_URL` production belum diketahui dan checker strict gagal jika masih non-HTTPS.
- environment target production belum dikonfirmasi, jadi semua nilai `.env` operasional masih `TO_CONFIRM`.
- DB connectivity strict pada server target belum dibuktikan.
- urutan dan status apply SQL patch di server target belum dibuktikan.

### Non-blocking

- admin cars route tetap read-only; ini bukan blocker release.
- payment provider real UAT belum dijalankan; ini blocker untuk provider gate, bukan blocker untuk aplikasi non-provider jika limitation ini diterima.
- public affiliate click telemetry tetap melakukan mutation telemetry; sudah dikenal dan terdokumentasi.

### Cek ulang di server target

- permission write untuk `storage/uploads`, `storage/logs`, `storage/cache`, `storage/backups`.
- cookie `Secure` / `SameSite` setelah HTTPS aktif.
- callback endpoint `POST /api/payments/midtrans/callbacks` dapat dijangkau publik.
- upload/public file path sesuai konfigurasi server web.
- database patch state dan index/constraint final.

## 6. SQL Patch Order

Urutan deploy target mengikuti audit patch yang ada di `scripts/sql/`.

1. `20260419_affiliate_commission_pipeline_hardening.sql`
Purpose: pondasi canon ledger commission affiliate.
Dependency: tabel affiliate/transaction canon harus sudah ada.
Pre-check: pastikan tabel `affiliate_commission_ledgers` ada dan backup DB tersedia.
Post-check: field rule snapshot dan status ledger tersedia.
Rollback note: tidak ada rollback otomatis; restore dari DB backup jika field/constraint gagal.

2. `20260419_affiliate_settlement_baseline.sql`
Purpose: pondasi batch settlement baseline.
Dependency: patch affiliate commission pipeline sudah ada.
Pre-check: backup DB, cek tidak ada migration konflik pada tabel settlement.
Post-check: tabel `affiliate_settlement_batches` dan `affiliate_settlement_items` tersedia.
Rollback note: restore DB backup jika schema settlement gagal atau bentrok.

3. `20260517_notifications.sql`
Purpose: membuat tabel inbox notifikasi global beserta index utama dan unique idempotency untuk install bersih.
Dependency: tabel `users` sudah ada.
Pre-check: backup DB, cek apakah tabel `notifications` belum ada.
Post-check:
  - tabel `notifications` ada
  - index user/role/read ada
  - unique `uq_notifications_idempotency` ada
Rollback note: drop table hanya jika environment baru dan disetujui; untuk environment existing gunakan restore backup, bukan drop manual sembarang.

4. `20260517_notifications_idempotency_unique.sql`
Purpose: menambahkan unique idempotency ke environment yang sudah punya tabel `notifications` tanpa unique index.
Dependency: `20260517_notifications.sql` atau tabel `notifications` existing tanpa unique index.
Pre-check:
  - cari duplicate `(user_id, role, type, source_type, source_id)`
  - backup DB
- patch ini jangan dijalankan bila unique key sudah ada.
Post-check: unique `uq_notifications_idempotency` terpasang.
Rollback note: remove unique key hanya dengan approval; default rollback tetap restore backup.

5. `20260601_affiliate_payment_finance_completion.sql`
Purpose: melengkapi settlement/payment finance canon:
  - `settlement_code`
  - payment metadata
  - `proof_file_url`
  - actor fields
  - ledger `source_type/source_id`
  - settlement history table
  - unique accrual-source protection
Dependency:
  - `20260419_affiliate_commission_pipeline_hardening.sql`
  - `20260419_affiliate_settlement_baseline.sql`
Pre-check:
  - backup DB
  - cek duplicate accrual-source pada ledger
  - cek tabel settlement/ledger existing sesuai baseline
Post-check:
  - kolom finance completion ada di `affiliate_settlement_batches`
  - kolom ledger source/payment lifecycle ada di `affiliate_commission_ledgers`
  - table `affiliate_settlement_histories` ada
  - unique `uniq_affiliate_commission_ledgers_accrual_source` ada
Rollback note: tidak ada rollback script aman; gunakan restore backup jika patch ini bermasalah.

6. `20260602_google_oauth_identities.sql`
Purpose: menambahkan tabel OAuth identity untuk Google role-specific login tanpa mengubah tabel `users`.
Dependency:
  - tabel `users` sudah ada.
Pre-check:
  - backup DB
  - cek belum ada tabel `user_oauth_identities`
Post-check:
  - tabel `user_oauth_identities` ada
  - unique (`provider`, `provider_user_id`) ada
  - unique (`user_id`, `provider`) ada
Rollback note: restore DB backup jika patch gagal; jangan drop manual di production tanpa approval.

## 7. Environment Checklist

Semua nilai production/staging berikut masih `TO_CONFIRM` kecuali default local yang hanya menjadi referensi bentuk konfigurasi.

| Key | Status |
|---|---|
| `APP_ENV` | `<TO_CONFIRM>` |
| `APP_DEBUG` | `<TO_CONFIRM>` |
| `APP_TIMEZONE` | `Asia/Jakarta` unless target requires otherwise |
| `APP_URL` | `<TO_CONFIRM>` |
| `GOOGLE_AUTH_ENABLED` | `false` until Google credential target is confirmed |
| `GOOGLE_CLIENT_ID` | `<TO_CONFIRM>` |
| `GOOGLE_CLIENT_SECRET` | `<TO_CONFIRM>` |
| `GOOGLE_REDIRECT_URI` | `<TO_CONFIRM>` |
| `GOOGLE_ALLOWED_DOMAINS` | optional `<TO_CONFIRM>` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | `<TO_CONFIRM>` |
| `DB_PORT` | `<TO_CONFIRM>` |
| `DB_DATABASE` | `<TO_CONFIRM>` |
| `DB_USERNAME` | `<TO_CONFIRM>` |
| `DB_PASSWORD` | `<TO_CONFIRM>` |
| `AUTH_REMEMBER_SECURE` | `<TO_CONFIRM>` and should be `true` under HTTPS |
| `AUTH_REMEMBER_SAME_SITE` | `<TO_CONFIRM>` |
| `STORAGE_UPLOADS_PATH` | `<TO_CONFIRM>` |
| `STORAGE_PUBLIC_UPLOADS_PREFIX` | `<TO_CONFIRM>` |
| `STORAGE_DELETED_IMAGE_RETENTION_DAYS` | `30` unless ops decides otherwise |
| `STORAGE_CLEANUP_LOG_PATH` | `<TO_CONFIRM>` |
| `PAYMENT_DEFAULT_PROVIDER` | `midtrans` if provider flow is enabled |
| `MIDTRANS_SERVER_KEY` | `<TO_CONFIRM>` |
| `MIDTRANS_CLIENT_KEY` | `<TO_CONFIRM>` |
| `MIDTRANS_IS_PRODUCTION` | `<TO_CONFIRM>` |
| `MIDTRANS_IS_SANITIZED` | `<TO_CONFIRM>` |
| `MIDTRANS_IS_3DS` | `<TO_CONFIRM>` |
| `MIDTRANS_VERIFY_SIGNATURE` | `true` |
| `MIDTRANS_CALLBACK_URL` | `<TO_CONFIRM>` and must be HTTPS for non-local release target |
| storage public exposure path | `<TO_CONFIRM>` |
| upload directories owner/permission | `<TO_CONFIRM>` |
| log rotation/retention | `<TO_CONFIRM>` |
| session/cookie domain | `<TO_CONFIRM>` |

## 8. Payment Provider Readiness

Status: BLOCKED for real UAT / production-ready provider verification.

Checklist:
- Public HTTPS URL tersedia: `[ ]`
- `MIDTRANS_CALLBACK_URL` HTTPS: `[ ]`
- provider sandbox credential valid untuk target UAT: `[ ]`
- signature verification aktif: `[x]` di readiness checker dan config contract
- callback log table / payment log path siap: `[x]` `transaction_payment_logs` canon tersedia
- disposable transaction ids disetujui: `[ ]`
- rollback/reset plan tersedia: `[ ]` untuk run provider nyata

Notes:
- local env current callback masih `http://localhost:8000/api/payments/midtrans/callbacks`.
- real provider UAT tidak dijalankan pada gate ini.
- release aplikasi dapat lanjut sebagai Conditional GO jika provider gate ini diterima sebagai keterbatasan environment, bukan defect runtime aplikasi.

## 8.1 Google Provider Readiness

Status: BLOCKED for real UAT / production-ready provider verification.

Checklist:
- Google OAuth client tersedia: `[ ]`
- `GOOGLE_CLIENT_ID` target valid: `[ ]`
- `GOOGLE_CLIENT_SECRET` target valid: `[ ]`
- `GOOGLE_REDIRECT_URI` cocok dengan Google Cloud authorized redirect URI: `[ ]`
- `GOOGLE_AUTH_ENABLED=true` hanya setelah credential valid: `[ ]`
- SQL patch `20260602_google_oauth_identities.sql` sudah applied: `[ ]`
- Browser smoke route disabled/configured sudah dijalankan: `[ ]`

Notes:
- default aman adalah disabled.
- affiliate Google login disabled by policy; affiliate tetap user/password.
- provider real UAT tidak dijalankan pada gate ini.

## 9. Backup Plan

### Backup Before Deploy

- DB dump penuh sebelum apply patch dan upload code.
- backup `.env` aktif di server target.
- backup code/current release artifact.
- backup `storage/uploads`.
- backup `storage/logs` bila dibutuhkan untuk investigasi cepat.

Evidence local:
- fallback backup finance pernah dibuat di `storage/backups/affiliate_finance_before_20260601_20260601_145936.json` karena `mysqldump` tidak tersedia di PATH saat smoke finance.

## 10. Rollback Plan

- restore code release sebelumnya.
- restore `.env` backup sebelumnya.
- restore DB dump jika patch schema/data bermasalah.
- restore `storage/uploads` bila upload path/file exposure bermasalah.
- disable / unpublish payment callback URL sementara jika callback mulai masuk ke build yang di-rollback.
- jangan menjalankan rollback SQL manual destruktif tanpa approval.

## 10.1 Auto Schema Bootstrap Gate

- `AUTO_SCHEMA_BOOTSTRAP_ENABLED` mengontrol bootstrap tabel module-scoped.
- Scope saat ini hanya tabel `notifications`.
- Bootstrap tidak membuat database baru dan tidak menjalankan `ALTER TABLE` pada tabel existing.
- Untuk production, rekomendasi utama tetap apply SQL patch dengan backup; auto bootstrap hanya safety net terbatas bila env diaktifkan.

## 11. UAT Evidence / Data Cleanup

Known UAT evidence:
- run id `uat_aff_fin_20260601_145953`
- ledgers `2,3`
- settlements `2,3`
- transactions `34,35`
- affiliate user `28`
- disposable seller image `258` sudah soft-deleted saat final regression gate

Cleanup decision:
- data UAT existing jangan dibersihkan otomatis tanpa konfirmasi.
- perlakukan sebagai evidence disposable/non-production yang harus direview sebelum deploy ke database target yang dipakai publik.
- jika target release memakai database baru/clean staging-production, data ini tidak ikut menjadi blocker.

Manual cleanup checklist if requested later:
- [ ] confirm target DB memang bukan DB evidence yang masih dipakai audit.
- [ ] backup DB sebelum cleanup.
- [ ] cleanup transaction/payment log/ledger/settlement/affiliate UAT records by approved id list.
- [ ] cleanup browser-smoke artifacts bila policy release mengharuskan.
- [ ] cleanup local/demo upload assets hanya jika disetujui dan tidak dipakai UI demo.

## 12. Known Limitations

- payment provider real UAT masih bergantung pada callback HTTPS publik dan credential target yang valid.
- `proof_file_url` masih URL/path only; belum ada upload binary proof final.
- refund/reversal ke `voided` masih follow-up domain finance, bukan flow runtime final.
- admin cars route saat ini read-only.
- public route masih hash-based.
- automated regression lintas domain belum matang; release masih mengandalkan unit test + smoke/runbook.

## 13. Changelog

Reference: `docs/CHANGELOG_RELEASE_CANDIDATE.md`.

Highlights:
- Added global notifications, buyer/affiliate account layouts, affiliate finance ledger/settlement flows, admin affiliate finance pages, seller image queue/gallery, background video coverage, and admin route compatibility.
- Changed preload/state sync, business status sync, modal rules, footer isolation, landing grid constraint, and inspection mapper compatibility.
- Fixed duplicate/stale UI and final hardening regressions including images, inspection, route gaps, and profile name sync.

## 14. Deployment Checklist

### Pre-Deploy

- [ ] Confirm target environment.
- [ ] Backup database.
- [ ] Backup storage/uploads.
- [ ] Backup current app code.
- [ ] Confirm `.env` values.
- [ ] Confirm `APP_URL`.
- [ ] Confirm payment callback URL.
- [ ] Run SQL patches in order.
- [ ] Verify schema/indexes.
- [ ] Run `php tests/run.php`.
- [ ] Run `php scripts/check_environment.php --target=<target> --check-db`.
- [ ] Clear cache if applicable.

### Deploy

- [ ] Upload code.
- [ ] Apply env.
- [ ] Apply SQL patches.
- [ ] Verify storage permissions.
- [ ] Verify upload directories.
- [ ] Verify routes.
- [ ] Verify login per role.
- [ ] Verify notification snapshot.
- [ ] Verify public landing/detail.
- [ ] Verify buyer/seller/admin/affiliate dashboards.

### Post-Deploy

- [ ] Check logs.
- [ ] Smoke test main routes.
- [ ] Verify payment callback endpoint availability.
- [ ] Verify notification polling.
- [ ] Verify image upload path.
- [ ] Verify affiliate finance view.
- [ ] Monitor errors.

## 15. Go / No-Go Recommendation

Recommendation: Conditional GO.

Reason:
- application regression state is green and PHP tests pass.
- release documentation, SQL order, and rollback/backup guidance are ready.
- remaining blocker is environment/provider readiness, not an identified application runtime defect.

To upgrade from Conditional GO to GO:
- confirm target environment values,
- run strict readiness check with DB connectivity on target,
- confirm HTTPS callback URL,
- confirm payment/provider sign-off if provider flow is in release scope.
