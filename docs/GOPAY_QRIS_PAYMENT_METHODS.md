# GoPay dan QRIS Payment Methods

Status: implemented in runtime, provider real UAT still pending.

## 1. Tujuan fitur

Menambahkan metode pembayaran `gopay` dan `qris` ke flow transaksi ProjectB tanpa mengubah canon status transaksi, tanpa reload halaman, dan tanpa direct fetch di component.

Tambahan wajib:

- panel instruksi khusus GoPay
- panel instruksi khusus QRIS
- auto-open deeplink GoPay satu kali di mobile jika tersedia
- QRIS menampilkan QR secara layak
- QRIS menyediakan tombol `Download QR`

## 2. Ringkasan referensi ProjectA

File yang dipelajari:

- `projectA/api/models/Transaksi.php`
- `projectA/assets/js/account/katalog.js`
- `projectA/assets/js/account/pesanan_saya.js`

Perilaku yang ditemukan:

- backend ProjectA sudah mengirim `payment_type = gopay/qris`
- ProjectA mengekstrak action Midtrans:
  - `generate-qr-code`
  - `deeplink-redirect`
- ProjectA menampilkan panel instruksi GoPay dan QRIS terpisah
- ProjectA auto-open deeplink GoPay pada mobile
- ProjectA memakai QR image URL dari action provider

Bagian yang diadaptasi:

- pemisahan UI GoPay vs QRIS
- pemakaian action provider untuk QR dan deeplink
- mobile deeplink intent untuk GoPay

Bagian yang tidak diadaptasi mentah:

- implementasi `window.open()` berulang pada rerender
- modal imperative lama
- console logging lama

Alasan:

ProjectB memakai SPA preload-first dengan state patch/invalidation, jadi behavior harus dipindahkan ke page/service/resource yang sesuai.

## 3. Backend payment method contract

ProjectB adapter Midtrans sudah mendukung:

- `bca_va`
- `bni_va`
- `bri_va`
- `mandiri_va`
- `gopay`
- `qris`
- `shopeepay`

Validasi request transaksi dan pelunasan sekarang membatasi `payment_method` ke daftar yang didukung.

Transaction detail/payment log sekarang mengembalikan data turunan yang aman dipakai ulang frontend:

- `payment_logs[].payload_request`
- `payment_logs[].payload_response`
- `payment_logs[].payload_callback`
- `payment_logs[].payment_data`
- `payment_logs[].qr_code_url`
- `payment_logs[].deeplink_url`

Ini dipakai agar buyer payment status tetap bisa menampilkan QR/deeplink walau page dibuka ulang setelah sesi awal selesai dibuat.

## 4. Frontend UI behavior

### Transaction entry

Form transaksi publik sekarang menawarkan:

- `BCA Virtual Account`
- `GoPay`
- `QRIS`

### Buyer payment status

`#/buyer/transactions/{id}` sekarang menampilkan panel instruksi yang method-aware:

- VA: nomor VA + instruksi bank
- GoPay: instruksi app/deeplink + QR fallback jika tersedia
- QRIS: QR besar + instruksi scan + tombol download

### Completion payment

Panel pelunasan buyer juga mendukung `GoPay` dan `QRIS`, bukan hanya `BCA VA`.

### Public transaction result

Sesudah transaksi dibuat, panel hasil sekarang menampilkan ringkasan instruksi metode aktif agar buyer langsung melihat langkah pembayaran yang relevan.

## 5. GoPay mobile deeplink behavior

Aturan:

- hanya untuk `payment_method = gopay`
- hanya jika `deeplink_url` provider tersedia
- hanya di mobile (`Android|iPhone|iPad|iPod`)
- hanya sekali per payment session/order id per browser tab

Guard anti-loop:

- memakai `sessionStorage`
- key berbasis `provider_order_id`/transaction session
- tidak auto-open lagi bila status transaksi sudah `paid`, `completed`, `expired`, `cancelled`, atau `dp_paid`

Desktop tidak auto-open. Desktop hanya mendapat instruksi dan tombol manual.

## 6. QRIS QR display behavior

Sumber QR yang dipakai:

- `payment_session.payment_data.qr_string`
- atau action provider `generate-qr-code`
- atau `payment_logs[].qr_code_url` saat page dibuka ulang

QR hanya dirender sebagai image bila nilainya memang URL/data image yang valid. ProjectB tidak merender payload string mentah sebagai `src`.

## 7. QRIS QR download behavior

Strategi yang dipakai: `hybrid`, dengan jalur utama backend proxy yang ownership-safe.

### Jalur runtime

1. Buyer menekan `Download QR`.
2. Page memanggil `transactionsResource.downloadPaymentQr(transactionId)`.
3. Resource melakukan request ke endpoint same-origin:
   - `GET /api/transactions/{transaction_id}/payment-qr`
4. Backend mengambil QR URL dari payment log transaksi yang tersimpan.
5. Backend memvalidasi source dan mengunduh file gambar dari provider.
6. Frontend menerima blob dan mengunduh file:
   - `qris-payment-{transaction_code}.png`

### Kenapa tidak download langsung ke URL provider

- menghindari problem CORS/cross-origin
- menghindari raw provider URL menjadi UX utama
- memastikan client tidak mengirim arbitrary external URL

## 8. Provider actions mapping

Action Midtrans yang dipakai:

- `generate-qr-code` -> `qr_code_url`
- `deeplink-redirect` -> `deeplink_url`

Fallback:

- jika `qr_string` sudah berupa `data:image/...`, backend download juga bisa decode base64

## 9. Status dan callback mapping

Tidak ada perubahan canon status transaksi.

Callback tetap memakai mapping existing:

- `settlement/capture/paid` -> `paid` atau `dp_paid` sesuai canon existing
- `pending` -> `pending_payment`
- `expire` -> `expired`
- `cancel/deny/failure/failed` -> `cancelled`

GoPay/QRIS tidak menambah aturan status khusus baru.

## 10. Security notes

- tidak ada server key yang diekspos ke frontend
- callback tetap server-side
- download QR endpoint tidak menerima URL dari client
- download QR endpoint tetap melewati auth + ownership check transaksi
- source QR ditarik dari payment log transaksi yang tersimpan
- host private/local IP ditolak untuk mencegah proxy ke alamat internal
- hanya response image yang diterima backend untuk download

## 11. Test dan smoke checklist

### Lint dan unit

- `php tests/run.php` -> pass `13 passed, 0 failed`
- `php -l` pada PHP yang diubah -> pass
- `node --check` pada JS yang diubah -> pass

### Browser smoke yang ideal

- pilih GoPay di checkout
- buat transaksi disposable
- pastikan panel GoPay muncul
- mobile: deeplink auto-open sekali
- desktop: tombol manual tampil, tidak auto-open
- pilih QRIS
- pastikan QR tampil
- klik `Download QR`
- pastikan file image terunduh

### Status pelaksanaan pada task ini

- runtime/code path sudah dipasang
- provider/browser smoke belum dijalankan karena server lokal `http://localhost:8000` tidak aktif pada sesi ini dan real provider UAT tetap diblokir oleh gate callback HTTPS publik

## 12. Known limitations

- QR download endpoint saat ini hanya dibuka untuk `qris`
- jika provider suatu saat hanya mengirim payload string QR non-image dan tanpa `generate-qr-code`, ProjectB belum mengenerate QR bitmap sendiri
- real provider validation tetap butuh sandbox/UAT dengan callback HTTPS publik

## 13. GoPay/QRIS Provider Sandbox UAT Result

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
- Callback status mapping: not executed against provider sandbox
- Cross-role sync: not executed against provider sandbox
- Security checks: code-level checks remain in place; provider sandbox execution not started
- Issues:
  - callback URL is not public HTTPS
  - `APP_URL` is still localhost
  - no explicitly approved disposable buyer/seller/car/transaction set was provided for provider mutation
- Result: `BLOCKED`

## 14. Payment page persistence update - 2026-06-04

Payment status page sekarang reload-safe untuk instruction sebelum expired:

- backend detail mengembalikan `payment_instruction` dari payment log terbaru yang punya artifact instruksi.
- frontend tidak lagi bergantung hanya pada `payment_logs[0]`.
- QRIS QR dan Download QR tetap muncul dari payment instruction/log existing selama QR valid dan belum expired.
- GoPay deeplink/QR fallback dan VA instruction dipulihkan dari detail/log existing.
- auto status check berjalan setiap 12 detik lewat endpoint status existing, lalu mengambil detail saat status berubah.
- paid success overlay tampil sekali saat status berubah dari belum paid ke `paid`/`completed`.

Tidak ada perubahan status canon, callback provider, atau schema.
