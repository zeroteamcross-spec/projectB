# Affiliate Payment and Commission Module

## Tujuan
Modul ini merapikan flow finance affiliate di `projectB`: transaksi paid membuat komisi accrued, admin membuat batch pembayaran manual, affiliate melihat ledger dan riwayat settlement miliknya sendiri.

## Role dan Scope
- Backend role affiliate tetap `affiliate_admin`.
- Admin dapat melihat semua ledger dan settlement affiliate.
- Affiliate hanya dapat melihat ledger dan settlement miliknya sendiri.
- Seller mengelola affiliate dan rule komisi, tetapi tidak boleh menandai payout dibayar.

## Commission Lifecycle
- `paid` pada transaksi membuat ledger komisi `accrued` bila transaksi punya affiliate valid dan seller punya rule komisi aktif.
- `accrued` masuk batch settlement menjadi `pending`.
- Settlement `settled` membuat ledger menjadi `paid_out`.
- Settlement `cancelled` mengembalikan ledger ke `accrued`.
- `voided` disiapkan untuk koreksi/refund/reversal, bukan hasil cancel settlement.

## Formula Komisi
Formula mengikuti canon existing:
- rule efektif = per-car override aktif, fallback ke global rule aktif seller.
- `percent`: `commission_amount = transactions.car_price * commission_percent / 100`.
- `flat`: `commission_amount = commission_flat`.
- `base_amount` yang disimpan adalah `transactions.car_price`.
- Jika tidak ada rule aktif atau hasil komisi <= 0, ledger tidak dibuat.

## Status Ledger
- `accrued` = Belum Dibayar.
- `pending` = Menunggu Pembayaran.
- `paid_out` = Sudah Dibayar.
- `voided` = Dibatalkan.

## Status Settlement
- `pending` = batch dibuat dan belum final.
- `settled` = batch sudah dibayar.
- `cancelled` = batch dibatalkan dan ledger kembali accrued.

## API Contract
Admin:
- `GET /api/admin/affiliate-ledgers`
- `GET /api/admin/affiliate-settlements`
- `POST /api/admin/affiliate-settlements`
- `GET /api/admin/affiliate-settlements/{id}`
- `POST /api/admin/affiliate-settlements/{id}/settle`
- `POST /api/admin/affiliate-settlements/{id}/cancel`
- `PATCH /api/admin/affiliate-settlements/{id}/status` tetap ada untuk kompatibilitas.

Affiliate:
- `GET /api/affiliate/me/ledgers`
- `GET /api/affiliate/me/settlements`
- `GET /api/affiliate/me/settlements/{id}`

## UI Admin
- `#/admin/affiliate-commissions` menampilkan ledger komisi dengan status user-friendly dan aksi membuat settlement dari ledger `accrued`.
- `#/admin/settlements` tetap menjadi meja batch settlement dan memakai endpoint settle/cancel baru.
- List admin memakai shared `DataTable`.
- Create settlement memakai modal global dan tidak bergantung pada fetch saat modal dibuka.

## UI Affiliate
- `#/affiliate/ledger` menampilkan history komisi.
- `#/affiliate/settlements` menampilkan eligible ledger dan history batch pembayaran.
- Label status dibuat user-friendly, backend tetap memakai status canon.

## Notification Events
- `commission_accrued`: dikirim ke user affiliate saat ledger dibuat, link `#/affiliate/ledger`.
- `settlement_paid`: dikirim ke user affiliate saat batch menjadi `settled`, link `#/affiliate/settlements`.
- Idempotency notification memakai `source_type` dan `source_id`.

## State dan Preload Sync
- Admin ledger menggunakan working key `adminAffiliateCommissions.ledgers` dan snapshot `admin.affiliateLedgers`.
- Settlement mutation memanggil `syncBusinessSettlement`.
- Response settlement membawa `ledger_ids/items`, sehingga frontend dapat patch status ledger tanpa menebak.
- Snapshot terkait ditandai stale: admin settlement, admin affiliate ledgers, affiliate ledger, affiliate settlement.

## Audit dan History
- `affiliate_settlement_histories` mencatat create settlement, settle, dan cancel dengan actor user, status awal, status tujuan, note, dan timestamp.
- Payment reference, method, note, proof URL, paid_by, cancelled_by, requested_by disimpan di batch settlement.

## Security Rules
- Mutasi settlement hanya admin.
- Affiliate detail settlement discoping ke affiliate milik user login.
- Affiliate tidak menerima input `affiliate_id` untuk membaca data.

## Smoke Checklist
- Proses transaksi affiliate ke `paid`, pastikan ledger `accrued` dibuat sekali.
- Ulang callback paid, pastikan ledger tidak duplicate.
- Admin pilih ledger `accrued`, buat settlement, pastikan ledger `pending`.
- Mark settled, pastikan ledger `paid_out` dan notifikasi affiliate masuk.
- Cancel pending, pastikan ledger kembali `accrued` dan history tercatat.
- Login affiliate dan pastikan hanya data miliknya yang tampil.

## Known Limitations
- Belum ada upload file proof binary; field `proof_file_url` disiapkan untuk URL/path dari flow upload terpisah.
- Reversal/refund menjadi `voided` belum dipatch besar karena flow refund/admin correction runtime belum jelas.
- Approval multi-level belum diaktifkan; field `approved_by` disiapkan untuk fase berikutnya.

## Runtime Smoke Result
- Date: 2026-06-01 14:59 Asia/Jakarta.
- Environment: local/dev database `projectb_app` on `localhost`, `APP_ENV=local`.
- SQL patch status: applied through `scripts/sql/20260601_affiliate_payment_finance_completion.sql` after preflight duplicate check returned no accrual-source duplicate risk.
- Backup: PDO JSON fallback backup created at `storage/backups/affiliate_finance_before_20260601_20260601_145936.json` because `mysqldump` was not available in PATH.
- Schema verification: settlement payment fields, ledger source/payment fields, `affiliate_settlement_histories`, unique settlement code index, and unique ledger accrual source index are present.
- Test data: disposable UAT run `uat_aff_fin_20260601_145953`; admin user `25`, seller user `26`, buyer user `27`, affiliate user `28`, showroom `9`, affiliate `7`, commission rule `3`, cars `21,22`, transactions `34,35`, ledgers `2,3`, settlements `2,3`.
- Commission accrual: PASS. Paid transaction created one `accrued` ledger for affiliate `7`, affiliate user `28`, transaction `34`, base `100000000`, rate `5%`, commission `5000000`, currency `IDR`.
- Duplicate accrual/idempotency: PASS. Reprocessing the paid transaction left one ledger for the transaction/source.
- Settlement create: PASS. Admin-created settlement `2` started as `pending`, total `5000000`, ledger `2` moved `accrued -> pending`, settlement history create row written.
- Settlement settle: PASS. Settlement `2` moved to `settled`, ledger `2` moved to `paid_out`, `paid_by=25`, `paid_at` filled, payment reference/note/proof URL persisted, settlement history settle row written.
- Settlement cancel: PASS. Separate pending settlement `3` moved to `cancelled`, ledger `3` moved back to `accrued`, `settlement_id` cleared, `cancelled_by=25`, history cancel row written.
- Affiliate view: PASS at service/API scope. Affiliate-scoped repository returned only affiliate-owned ledgers/settlements; foreign ledgers visible count was `0`.
- Notifications: PASS. `commission_accrued` used `#/affiliate/ledger`; `settlement_paid` used `#/affiliate/settlements`.
- Admin UI: PASS by static/service verification for shared state inputs and mutation responses. Browser visual smoke was not executed in this run.
- Regression: `php tests/run.php` kept the previous baseline: 11 passed, 2 failed existing/unrelated (`ImagesHardeningTest`, `InspectionHardeningTest`).
- Issues: No finance runtime issue found. `mysqldump` missing from PATH, so backup used the local PDO JSON fallback.
- Result: PASS for SQL patch, schema, commission accrual idempotency, settlement create/settle/cancel, affiliate scoping, and notification checks.

## Browser Visual Smoke Result
- Date: 2026-06-01 15:30 Asia/Jakarta.
- Environment: local/dev browser smoke on `http://127.0.0.1:8019/app.html`, Playwright Chromium headless, DB `projectb_app`.
- UAT data/run id: `uat_aff_fin_20260601_145953`; users `admin=25`, `affiliate_user=28`; ledgers `2,3`; settlements `2,3`.
- Admin affiliate commissions: PASS. `#/admin/affiliate-commissions` rendered shared DataTable, UAT ledgers, user-friendly paid/unpaid labels, currency values, and no page horizontal overflow.
- Admin settlement page: PASS. `#/admin/settlements` rendered settlement batches with settled/cancelled status, DataTable layout, and no horizontal overflow.
- Admin create settlement modal: PASS. Accrued ledger selection opened the create modal, backdrop click did not close it, explicit close worked, draft input survived a viewport/state event, and the main page section stayed stable after selection. Submit was not executed to avoid extra finance mutation during visual-only smoke.
- Admin settlement detail: PASS after UI patch. Detail opens through route working preload using `settlement_id`, not direct component fetch. Modal shows items, history, and payment metadata.
- Affiliate dashboard: PASS after scope/runtime patch. `#/affiliate` loads the affiliate profile for role `affiliate_admin` and no longer shows the fallback "Affiliate belum siap" for the UAT affiliate.
- Affiliate ledger: PASS. `#/affiliate/ledger` rendered only the affiliate account surface, showed `Sudah Dibayar` and `Belum Dibayar`, no visible sidebar, and no horizontal overflow.
- Affiliate settlements: PASS. `#/affiliate/settlements` rendered settlement history with paid/cancelled labels, no visible sidebar, and no horizontal overflow.
- Affiliate profile: PASS. `#/profile` renders the affiliate account profile shell for `affiliate_admin`.
- Notification finance: PASS. Admin and affiliate notification bells opened popovers with finance notification text, `fetchesOnOpen=0`, and `Lihat semua notifikasi` navigated to `#/notifications`.
- Responsive matrix: PASS for `360px`, `390px`, `768px`, and `1280px` on `#/admin/affiliate-commissions`, `#/admin/settlements`, `#/affiliate/ledger`, and `#/affiliate/settlements`; no horizontal overflow detected.
- SPA stability: PASS. No `location.reload`, no direct `fetch()` in checked finance UI files, no modal close via backdrop, no create-modal draft reset, and admin finance frame nodes remain stable on selection/rerender.
- Issues found: fixed during smoke:
  - local dev server needed a router that serves static `app.html` before API front controller.
  - admin settlement detail UI was missing from preloaded route state.
  - modal close callback order could reopen route-driven modals before query cleanup.
  - affiliate dashboard called seller/admin-scoped ledger listing from `/api/affiliate/me`, causing 403 for `affiliate_admin`.
  - affiliate quick actions referenced a missing local `textBlock` helper after the dashboard profile loaded.
- Patches made: `scripts/local_dev_router.php`, `scripts/browser_affiliate_finance_visual_smoke.js`, admin settlement route/list/page UI, global modal close ordering, affiliate dashboard service scope, affiliate quick actions helper, and stable admin finance frame replacement.
- Result artifact: `storage/browser-smoke/affiliate_finance_visual_uat_aff_fin_20260601_145953.json`.
- Result: PASS.
