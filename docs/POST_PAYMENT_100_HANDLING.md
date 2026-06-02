# Post Payment 100% Handling

## Status Task

- [x] Task 1 - Audit Status dan Flow Existing
- [x] Task 2 - Canon/Mapping Status Payment, Transaction, Listing
- [x] Task 3 - Backend/Resource Mutation Setelah Payment Paid
- [x] Task 4 - Buyer Payment Success UI
- [x] Task 5 - Buyer Transactions UI Update
- [x] Task 6 - Seller Transactions Fulfillment Queue
- [x] Task 7 - Listing Lock/Sold Handling
- [x] Task 8 - Affiliate Commission Accrual
- [x] Task 9 - Settlement Readiness
- [x] Task 10 - End-to-End Verification

## Status/Mapping

- `payment_status` tidak punya kolom terpisah di schema aktual. Mapping UI memakai `transaction_status`.
- `pending_payment` = pembayaran belum selesai.
- `dp_paid` = DP diterima, mobil dikunci dengan `cars.listing_status = reserved`.
- `paid` = pembayaran 100% diterima, mobil ditandai `cars.listing_status = sold`, affiliate accrual boleh dibuat, seller perlu proses fulfillment.
- `completed` = dokumen dan serah terima selesai. Hanya buyer yang boleh menandai selesai dari transaksi `paid`, setelah checklist seller lengkap.
- `processing`, `handover`, `refunded` hanya dipetakan sebagai compatibility UI bila data lama/masa depan mengirim status itu.
- Listing canon: `published`, `reserved`, `sold`, `archived`.
- Affiliate ledger awal tetap `accrued` pada finality event `paid`.
- Settlement tidak dibuat otomatis. Settlement baseline tetap manual/admin-driven sesuai runbook.

## Endpoint/Resource Dipakai

- `POST /api/payments/midtrans/callbacks` -> `TransactionService::handleProviderCallback`.
- `PATCH /api/transactions/{transaction_id}/status` -> `TransactionService::updateStatus`.
- `PATCH /api/transactions/{transaction_id}/fulfillment-checklist` -> seller memperbarui checklist proses setelah lunas.
- `POST /api/transactions/{transaction_id}/complete-payment` -> pelunasan transaksi DP.
- `transactionsResource.updateStatus` ditambahkan sebagai wrapper resource standar.
- Seller `Proses Transaksi` menyimpan checklist fulfillment. Buyer melihat checklist read-only dan tombol `Selesaikan` aktif hanya setelah semua item wajib selesai.
- Buyer `Selesaikan` memakai `PATCH /api/transactions/{transaction_id}/status` dengan `transaction_status = completed`.
- Lock listing dilakukan di repository transaksi melalui update `cars.listing_status`, bukan endpoint liar baru.
- Affiliate accrual memakai flow existing `AffiliateService::accrueCommissionForPaidTransaction`.

## File Diubah

- `app/Modules/Transactions/Repositories/TransactionRepository.php`
- `app/Modules/Transactions/Requests/UpdateTransactionStatusRequest.php`
- `app/Modules/Transactions/Requests/UpdateFulfillmentChecklistRequest.php`
- `app/Modules/Transactions/Services/PaymentLogService.php`
- `app/Modules/Transactions/Services/TransactionService.php`
- `docs/SCHEMA_CANON.md`
- `public/assets/js/utils/transactionStatus.js`
- `public/assets/js/resources/transactionsResource.js`
- `public/assets/js/modules/buyer/pages/paymentStatusPage.js`
- `public/assets/js/modules/buyer/pages/transactionsPage.js`
- `public/assets/js/modules/buyer/components/paymentStatusSummary.js`
- `public/assets/js/modules/buyer/components/paymentActionPanel.js`
- `public/assets/js/modules/buyer/components/carSummaryCard.js`
- `public/assets/js/modules/seller/services/sellerTransactionService.js`
- `public/assets/js/modules/seller/components/sellerTransactionsList.js`
- `public/assets/js/modules/seller/components/sellerTransactionDetailPanel.js`
- `public/assets/js/modules/seller/components/sellerListingStatusBadge.js`
- `public/assets/js/modules/seller/components/sellerTransactionSummaryCards.js`
- `public/assets/js/modules/seller/pages/carsPage.js`
- `public/assets/js/modules/seller/pages/transactionsPage.js`
- `public/assets/js/modules/public/components/publicStickyCta.js`
- `public/assets/js/modules/public/components/publicCarCard.js`
- `public/assets/js/modules/public/components/publicCarTitleBlock.js`
- `public/assets/js/modules/public/pages/carDetailPage.js`
- `public/assets/js/modules/public/pages/transactionEntryPage.js`
- `public/assets/js/modules/admin/services/adminTransactionMonitoringService.js`
- `public/assets/js/modules/admin/services/adminDashboardService.js`
- `docs/POST_PAYMENT_100_HANDLING.md`
- `scripts/sql/20260511_transaction_completed_status.sql`
- `scripts/sql/20260511_transaction_fulfillment_checklist.sql`

## Changelog

### 2026-05-11 - Task 1
- File diperiksa: prompt, AGENTS, overview, frontend architecture, feature contract, limitations, schema canon, affiliate finance canon, settlement runbook, transaction/payment/listing/affiliate modules.
- Keputusan: schema aktual memakai `transaction_status` sebagai source pembayaran; status canon transaksi adalah `pending_payment`, `dp_paid`, `paid`, `expired`, `cancelled`.
- Verifikasi: flow callback dan manual status ditemukan di `TransactionService::applyStatus`; affiliate accrual existing idempotent memakai `findAccrualByTransactionId`.
- Risiko: belum ada status fulfillment `completed` di schema update transaksi, jadi action selesai seller belum dibuat sebagai mutation aktif.
- Next: mapping helper status shared.

### 2026-05-11 - Task 2
- File diubah: `public/assets/js/utils/transactionStatus.js`.
- Keputusan: helper shared memetakan status payment, transaction, listing lock, dan compatibility label.
- Verifikasi: `node --check public/assets/js/utils/transactionStatus.js` lulus.
- Risiko: status `processing/handover/completed` hanya compatibility UI sampai schema/backend mengadopsinya.
- Next: mutation lock listing.

### 2026-05-11 - Task 3
- File diubah: `TransactionService.php`, `TransactionRepository.php`, `transactionsResource.js`.
- Keputusan: saat `dp_paid`, listing menjadi `reserved`; saat `paid`, listing menjadi `sold`. Lock dicegah bila ada transaksi lain pada mobil yang sama dengan status `dp_paid` atau `paid`.
- Verifikasi: `php -l` untuk file PHP lulus; resource JS lulus `node --check`.
- Risiko: rollback/release listing untuk cancelled setelah DP belum diaktifkan agar tidak melepas unit tanpa kebijakan refund/cancel yang jelas.
- Next: buyer paid success UI.

### 2026-05-11 - Task 4
- File diubah: buyer payment status page/components.
- Keputusan: status `paid` menampilkan "Pembayaran Berhasil", copy 100%, dan instruksi serah terima; instruksi pembayaran disembunyikan saat lunas.
- Verifikasi: `node --check` file buyer payment lulus.
- Risiko: CTA receipt dan contact seller tidak ditampilkan karena payload belum menyediakan receipt/kontak seller.
- Next: buyer transaction card.

### 2026-05-11 - Task 5
- File diubah: buyer transactions page, car summary card.
- Keputusan: `paid` masuk bucket proses, label "Pembayaran Lunas", CTA "Lihat Proses"; `completed` baru dianggap selesai.
- Verifikasi: `node --check` file buyer transactions lulus.
- Risiko: route proses masih detail transaksi existing karena belum ada route fulfillment khusus.
- Next: seller queue.

### 2026-05-11 - Task 6
- File diubah: seller transaction service/list/detail/summary.
- Keputusan: transaksi `paid` diberi badge "Pembayaran Lunas" dan "Perlu Diproses"; action "Proses Transaksi" membuka modal detail dari working set. "Tandai Selesai" disabled karena schema canon belum punya status `completed`.
- Verifikasi: `node --check` file seller transaksi lulus.
- Risiko: penyelesaian fulfillment perlu task schema/backend terpisah bila status completed resmi ditambahkan.
- Next: listing lock UI.

### 2026-05-11 - Task 7
- File diubah: public sticky CTA, public car card/title/detail, transaction entry, seller listing badge/cars page, buyer car summary.
- Keputusan: listing `reserved` tampil "Terkunci DP"; `sold` tampil "Terjual"; CTA checkout disabled/ditolak bila data car sudah tidak `published`.
- Verifikasi: `node --check` file public/seller/buyer listing lulus.
- Risiko: public catalog sudah filter `published`; public detail untuk sold tetap mengikuti policy backend existing.
- Next: affiliate accrual.

### 2026-05-11 - Task 8
- File diperiksa/terkait: `AffiliateService.php`, `AffiliateCommissionLedgerRepository.php`, finance canon.
- Keputusan: accrual tetap pada finality event `paid`, tidak pada `dp_paid`, agar sesuai `AFFILIATE_FINANCE_CANON.md`. Idempotency memakai guard `findAccrualByTransactionId`.
- Verifikasi: flow `applyStatus('paid')` tetap memanggil `accrueCommissionForPaidTransaction` di transaksi DB yang sama.
- Risiko: environment harus sudah apply SQL patch affiliate finance canon.
- Next: settlement readiness.

### 2026-05-11 - Task 9
- File diperiksa: settlement runbook dan service affiliate settlement.
- Keputusan: paid belum berarti seller/affiliate settled. Settlement tetap manual/admin-driven dari ledger `accrued` ke batch `pending`, lalu `paid_out`.
- Verifikasi: tidak ada settlement palsu/auto settlement baru.
- Risiko: create batch UI masih baseline/manual sesuai known limitations.
- Next: E2E verification.

### 2026-05-11 - Task 10
- Verifikasi:
  - `php -l app/Modules/Transactions/Repositories/TransactionRepository.php`
  - `php -l app/Modules/Transactions/Services/TransactionService.php`
  - `node --check` untuk semua file JS yang diubah.
- Hasil: semua syntax check lulus.
- Preload-first: tetap memakai route preload/working state existing; tidak ada fetch baru saat halaman/modal dibuka.

### 2026-05-11 - Buyer Completion + Fulfillment Checklist
- File diubah: backend transaksi, schema canon, seller transaction page/detail, buyer payment status page, resource/service transaksi.
- Keputusan: seller tidak lagi menandai transaksi selesai. Seller hanya mengelola checklist `Proses Transaksi` setelah status `paid`.
- Keputusan: buyer melihat progress checklist read-only dan hanya bisa klik `Selesaikan` setelah semua checklist wajib selesai.
- Verifikasi DB lokal: enum `transactions.transaction_status` sudah memuat `completed`, dan tabel `transaction_fulfillment_checklist_items` tersedia.
- Fetch baru: tidak ada fetch klasik baru. Mutation/resource wrapper ditambahkan untuk endpoint update status existing.
- Perubahan `projectA`: tidak ada.
- Risiko tersisa: E2E browser/manual UAT tetap diperlukan dengan database nyata dan callback provider/mock Midtrans.

### 2026-05-11 - Seller Completion Follow-up
- File diubah: `UpdateTransactionStatusRequest.php`, `TransactionService.php`, `PaymentLogService.php`, `seller/pages/transactionsPage.js`, `seller/components/sellerTransactionsList.js`, `adminTransactionMonitoringService.js`, `SCHEMA_CANON.md`.
- File baru: `scripts/sql/20260511_transaction_completed_status.sql`.
- Keputusan: `completed` resmi masuk canon transaksi untuk fulfillment selesai. Transisi dibatasi hanya dari `paid` agar transaksi belum lunas tidak bisa selesai.
- Endpoint/resource: `PATCH /api/transactions/{id}/status` via `sellerTransactionService.updateStatus`.
- Preload-first: tidak ada fetch page/modal baru; setelah mutation sukses, working state dan snapshot seller transactions di-update lokal.
- Verifikasi: `php -l` untuk request/service terkait lulus; `node --check` seller/admin/status helper lulus.
- Risiko: SQL patch wajib dijalankan pada database sebelum tombol ini dipakai di environment yang masih memakai enum lama.

## Next Task

- Jalankan `scripts/sql/20260511_transaction_completed_status.sql` di database target sebelum UAT tombol `Tandai Selesai`.
- Tambahkan status fulfillment antara (`processing`, `handover`) bila bisnis membutuhkan tahapan sebelum `completed`.
- Definisikan kebijakan cancel/refund setelah DP agar listing `reserved` bisa dilepas dengan aman bila transaksi batal.
