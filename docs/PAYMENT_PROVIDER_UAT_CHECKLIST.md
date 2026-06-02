# Payment Provider UAT Checklist

## Scope

Checklist ini dipakai untuk UAT real payment webhook/provider setelah Global Notifications MVP aktif.

## Prasyarat

- SQL patch notification sudah diterapkan, termasuk:
  - `scripts/sql/20260517_notifications.sql`
  - `scripts/sql/20260517_notifications_idempotency_unique.sql` jika table sudah ada sebelum unique index ditambahkan.
- Provider payment sandbox/production-staging sudah dikonfigurasi.
- Endpoint callback publik mengarah ke:
  - `POST /api/payments/midtrans/callbacks`
- Akun tersedia:
  - buyer aktif
  - seller pemilik listing
  - admin aktif dan approved
  - affiliate_admin aktif jika menguji referral

## Scenario A - Full Payment

1. Buyer membuat transaksi full payment dari listing `published`.
2. Ulang minimal untuk metode:
   - `bca_va`
   - `gopay`
   - `qris`
2. Selesaikan pembayaran di provider.
3. Pastikan provider mengirim callback status settlement/capture/paid.
4. Verifikasi transaksi berubah ke `paid`.
5. Verifikasi listing berubah ke `sold`.
6. Verifikasi notifikasi:
   - buyer `transaction_paid`
   - seller `transaction_paid`
   - admin aktif `transaction_paid`
7. Verifikasi `/api/notifications/snapshot` untuk masing-masing user menaikkan unread count.
8. Verifikasi bell update lewat polling tanpa membuka ulang halaman.

## Scenario B - DP Completion

1. Buyer membuat transaksi DP.
2. Ulang minimal untuk metode:
   - `gopay`
   - `qris`
2. Selesaikan DP sampai status `dp_paid`.
3. Buyer menjalankan pelunasan via `complete-payment`.
4. Provider mengirim callback pelunasan.
5. Verifikasi transaksi berubah ke `paid`.
6. Verifikasi notifikasi buyer/seller/admin sama seperti full payment.

## Scenario C - Affiliate Transaction

1. Buyer membuka listing lewat referral affiliate valid.
2. Buyer menyelesaikan pembayaran sampai transaksi `paid`.
3. Verifikasi ledger commission dibuat dengan status `accrued`.
4. Verifikasi affiliate mendapat notifikasi `commission_accrued`.
5. Ulang callback yang sama.
6. Verifikasi tidak ada duplicate notification.

## Scenario D - Transaction Completed

1. Seller melengkapi fulfillment checklist transaksi `paid`.
2. Buyer menandai transaksi selesai sampai status `completed`.
3. Verifikasi buyer dan seller mendapat notifikasi `transaction_completed`.
4. Ulang mutation status jika memungkinkan.
5. Verifikasi idempotency tetap mencegah duplicate.

## Scenario E - Settlement Paid

1. Admin membuat settlement batch dari ledger `accrued`.
2. Admin mengubah batch ke `settled`.
3. Verifikasi ledger berubah ke `paid_out`.
4. Verifikasi affiliate mendapat notifikasi `settlement_paid`.
5. Verifikasi affiliate bell/popup/page menampilkan notifikasi setelah polling.

## Bukti yang Dikumpulkan

- `transaction_id`
- `transaction_code`
- `provider_order_id`
- provider callback payload/status
- screenshot panel instruksi GoPay
- screenshot panel instruksi QRIS
- bukti deeplink GoPay mobile dipanggil sekali
- bukti file QRIS terunduh dengan nama aman
- `notification.id` untuk buyer/seller/admin/affiliate
- screenshot bell/popover/page notifikasi
- hasil retry callback untuk membuktikan idempotency

## Risiko

- Callback provider nyata membutuhkan URL publik, signature/key valid, dan environment provider yang benar.
- Jika unique index gagal diterapkan karena data duplicate lama, bersihkan duplicate event notification terlebih dahulu.
- Polling default 45 detik; tunggu minimal satu interval atau refresh snapshot manual saat investigasi.

## GoPay/QRIS Provider Sandbox UAT Result

- Date: 2026-06-01
- Environment: local
- APP_URL: `http://localhost:8000`
- MIDTRANS_CALLBACK_URL: `http://localhost:8000/api/payments/midtrans/callbacks`
- UAT run id: `<NOT_CREATED>`
- GoPay transaction id: `<NOT_CREATED>`
- QRIS transaction id: `<NOT_CREATED>`
- GoPay desktop: `BLOCKED`
- GoPay mobile deeplink: `BLOCKED`
- QRIS display: `BLOCKED`
- QRIS download: `BLOCKED`
- Callback status mapping: `BLOCKED`
- Cross-role sync: `BLOCKED`
- Security checks: not executed against provider session; code-level controls remain
- Issues:
  - callback still localhost/http, not public HTTPS
  - disposable provider mutation set not approved
- Result: `BLOCKED`
