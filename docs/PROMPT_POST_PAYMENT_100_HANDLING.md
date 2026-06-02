# PROMPT CODEX — Post-Payment 100% Handling ProjectB

## Workspace

Workspace yang dikerjakan adalah `projectB`.

## Task Utama

Implementasikan alur setelah buyer membayar **100%** pada ProjectB.

Pembayaran 100% bukan akhir dari transaksi. Setelah pembayaran lunas, transaksi harus masuk ke fase **post-payment / fulfillment**, yaitu proses validasi pembayaran, penguncian mobil, proses seller, dokumen, serah terima, affiliate commission jika ada, dan settlement jika sudah ada flow-nya.

Semua perubahan hanya boleh dilakukan di `projectB`.

`projectA` hanya benchmark visual read-only jika memang perlu referensi UI. Jangan ubah file di `projectA` dan jangan copy kode mentah dari `projectA`.

---

## Dokumen yang Perlu Dibaca

Baca dokumen yang relevan saja:

1. `projectB/docs/TRD_NEW_MENU_GUIDELINE.md`
2. `projectB/AGENTS.md`
3. `projectB/docs/SYSTEM_OVERVIEW.md`
4. `projectB/docs/FRONTEND_ARCHITECTURE_SPEC.md`
5. `projectB/docs/FEATURE_MODULE_CONTRACT.md`
6. `projectB/docs/KNOWN_LIMITATIONS.md`

Jika menyentuh transaksi, pembayaran, affiliate, ledger, komisi, atau settlement, baca juga:

7. `projectB/docs/AFFILIATE_FINANCE_CANON.md`
8. `projectB/docs/RUNBOOK_SETTLEMENT_BASELINE.md`
9. `projectB/docs/SCHEMA_CANON.md` jika perlu cek schema/status canon.

Jangan membaca seluruh docs di luar kebutuhan task.

---

## Prinsip Arsitektur yang Wajib Dijaga

ProjectB adalah SPA preload-first.

Aturan wajib:

- Data halaman harus berasal dari snapshot kecil + hydrate working set penuh.
- Jangan fetch klasik saat halaman dibuka.
- Jangan fetch klasik saat modal dibuka.
- Jangan fetch detail per klik jika data bisa tersedia dari working state.
- Mutation boleh memanggil API/resource layer existing:
  - update payment status
  - update transaction status
  - update listing status
  - create affiliate commission accrual
  - settlement action jika flow sudah ada
- Setelah mutation sukses, update state lokal/working state sesuai pola existing.
- Jangan reload halaman penuh.
- Search/filter default frontend-only.
- Pagination default frontend-only.
- Semua tombol clickable memakai warna dari global theme/design token.
- Modal tidak boleh close saat klik luar/backdrop.
- Modal hanya boleh close lewat tombol eksplisit.
- Icon harus presisi di tengah wrapper.
- Jangan mengubah `projectA`.

---

## Aturan UI Global

### Button Color Consistency

Semua tombol/action clickable wajib memakai warna dari global theme/design token.

Tidak boleh:

- warna hardcoded lokal seperti `bg-blue-500`, `bg-green-500`, `bg-red-500`
- gradient lokal random
- warna tombol berbeda-beda per halaman tanpa token global

Harus:

- primary memakai token primary/global button class.
- secondary memakai token neutral/secondary.
- danger memakai token danger global.
- success memakai token success global.
- warning memakai token warning global.
- disabled memakai token disabled/neutral global.
- hover/focus/active/loading/disabled state konsisten.

### Modal Close Behavior

Semua modal wajib mengikuti aturan:

- Modal tidak boleh tertutup saat klik area luar/backdrop.
- Modal hanya boleh ditutup lewat tombol eksplisit:
  - `X`
  - `Tutup`
  - `Batal`
  - `Selesai`
  - action lain yang jelas menutup modal
- Jika modal sedang loading/saving/uploading, tombol close boleh disabled sementara.

### Icon Alignment

Semua icon di card/nav/action:

- wrapper fixed width/height.
- wrapper memakai `inline-flex items-center justify-center`.
- SVG/icon memakai ukuran fixed.
- SVG/icon harus `block`.
- hindari `mt-*`, `ml-*`, `translate-*` untuk mengakali posisi.
- warna memakai global theme token.
- icon harus presisi di tengah wrapper.

---

# Konsep Produk

## Saat Buyer Membayar 100%

Ketika buyer membayar 100%, sistem harus melakukan transisi status:

```txt
pending_payment / unpaid / partial
↓
paid
↓
processing / fulfillment
↓
handover
↓
completed
```

Pembayaran 100% berarti kewajiban pembayaran buyer selesai, tetapi transaksi belum final sampai dokumen dan serah terima selesai.

---

## Status yang Disarankan

Sesuaikan dengan status aktual yang sudah ada di code/schema. Jangan memaksakan status baru jika project sudah punya canon yang berbeda.

### Payment Status

```txt
unpaid
partial
paid
failed
refunded
```

### Transaction Status

```txt
pending_payment
paid
processing
handover
completed
cancelled
refunded
```

### Listing/Car Status

```txt
published
reserved
sold
archived
```

### Affiliate Commission Status

```txt
none
accrued
eligible
settled
cancelled
```

Jika status aktual di project berbeda, buat mapping compatibility yang aman dan dokumentasikan.

---

# Target Flow Setelah Pembayaran 100%

## Flow Ideal

```txt
Buyer bayar 100%
↓
payment_status = paid
transaction_status = paid
listing_status = sold / reserved_paid
↓
Buyer melihat halaman pembayaran berhasil
↓
Seller melihat transaksi masuk antrean “Perlu Diproses”
↓
Seller memproses dokumen dan serah terima
↓
Seller/Admin menandai transaksi selesai
↓
transaction_status = completed
↓
Jika ada affiliate, komisi masuk accrued/eligible sesuai canon
↓
Jika settlement tersedia, proses settlement seller/affiliate berjalan sesuai runbook
```

---

# Task Handling Terpisah

Implementasi wajib dibagi menjadi beberapa task kecil. Setelah setiap task selesai, Codex wajib update dokumen progress ini atau membuat file progress baru di docs.

## File Progress yang Harus Dibuat/Diupdate

Buat atau update file:

```txt
projectB/docs/POST_PAYMENT_100_HANDLING.md
```

File ini harus memuat:

- daftar task
- status tiap task
- file yang diubah
- keputusan status/mapping
- endpoint/resource yang dipakai
- hasil verifikasi
- catatan risiko
- next task

Setiap selesai satu task, update checklist di file tersebut.

Format progress:

```md
# Post Payment 100% Handling

## Status Task

- [ ] Task 1 — Audit Status dan Flow Existing
- [ ] Task 2 — Canon/Mapping Status Payment, Transaction, Listing
- [ ] Task 3 — Backend/Resource Mutation Setelah Payment Paid
- [ ] Task 4 — Buyer Payment Success UI
- [ ] Task 5 — Buyer Transactions UI Update
- [ ] Task 6 — Seller Transactions Fulfillment Queue
- [ ] Task 7 — Listing Lock/Sold Handling
- [ ] Task 8 — Affiliate Commission Accrual
- [ ] Task 9 — Settlement Readiness
- [ ] Task 10 — End-to-End Verification

## Changelog

### YYYY-MM-DD — Task X
- File diubah:
- Keputusan:
- Verifikasi:
- Risiko:
- Next:
```

---

# Task 1 — Audit Status dan Flow Existing

## Tujuan

Cari kondisi aktual alur transaksi, pembayaran, listing, affiliate commission, dan settlement di codebase.

## Area yang Perlu Diperiksa

- buyer payment status page:
  - `public/assets/js/modules/buyer/pages/paymentStatusPage.js`
- buyer transactions:
  - `public/assets/js/modules/buyer/pages/transactionsPage.js`
- seller transactions:
  - cari halaman/module `#/seller/transactions`
- admin transactions:
  - cari halaman/module `#/admin/transactions`
- transaction resource/API layer
- payment resource/API layer
- car/listing resource/API layer
- affiliate commission resource/API layer
- settlement resource/API layer
- buyer transaction service:
  - `public/assets/js/modules/buyer/services/buyerTransactionService.js`
- buyer state:
  - `public/assets/js/modules/buyer/state/buyerState.js`
- route buyer:
  - `public/assets/js/modules/buyer/routes.js`
- schema/status docs jika tersedia.

## Yang Harus Dilaporkan

1. Status payment yang sudah ada.
2. Status transaction yang sudah ada.
3. Status listing/car yang sudah ada.
4. Status affiliate commission yang sudah ada.
5. Endpoint/resource untuk update payment status.
6. Endpoint/resource untuk update transaction status.
7. Endpoint/resource untuk update listing status.
8. Apakah sudah ada flow setelah payment `paid`.
9. Apakah listing sudah dikunci setelah paid.
10. Apakah affiliate commission sudah dibuat saat paid.
11. Apakah seller transactions sudah punya status “perlu diproses”.
12. Apakah buyer payment success UI sudah ada.
13. Risiko perubahan.

## Output Task 1

- Update `projectB/docs/POST_PAYMENT_100_HANDLING.md`
- Jangan ubah logic besar dulu.
- Patch hanya boleh jika ada bug kecil yang jelas dan aman.
- Jelaskan rekomendasi task berikutnya.

## Acceptance Task 1

- Status existing sudah terdokumentasi.
- Resource/API existing sudah terdokumentasi.
- Risiko sudah tertulis.
- File progress sudah dibuat/diupdate.

---

# Task 2 — Canon/Mapping Status Payment, Transaction, Listing

## Tujuan

Tetapkan mapping status setelah pembayaran 100% berdasarkan status yang sudah ada di project.

## Requirement

Jika project sudah punya status canon, ikuti canon existing. Jangan memaksa status baru.

Jika belum ada status jelas, gunakan mapping aman:

```txt
payment_status = paid
transaction_status = paid
listing_status = sold
```

Jika project membedakan paid dan fulfillment:

```txt
payment_status = paid
transaction_status = processing
listing_status = sold
```

## Mapping yang Harus Dibuat

Buat helper/mapping jika belum ada:

```js
isPaymentPaid(transaction)
isTransactionFulfillment(transaction)
isTransactionCompleted(transaction)
isTransactionCancelled(transaction)
getPaymentStatusLabel(status)
getTransactionStatusLabel(status)
getListingLockStatus(transaction)
```

Lokasi helper mengikuti struktur project existing. Jangan membuat helper liar jika sudah ada status helper global.

## Acceptance Task 2

- Mapping status jelas.
- Compatibility dengan status lama terjaga.
- Tidak merusak data existing.
- Dokumentasi progress diupdate.
- `node --check` lulus untuk file JS yang diubah.

---

# Task 3 — Backend/Resource Mutation Setelah Payment Paid

## Tujuan

Pastikan saat pembayaran 100% terkonfirmasi, sistem melakukan mutation yang tepat.

## Requirement

Saat payment `paid`:

1. `payment_status` menjadi `paid`.
2. `transaction_status` masuk ke fase paid/processing.
3. listing/car dikunci agar tidak bisa dibeli lagi.
4. jika ada affiliate attribution, siapkan/trigger accrual commission sesuai canon.
5. state frontend update tanpa reload penuh.

## Catatan Penting

Jangan membuat payment simulator liar jika flow payment existing sudah ada.

Cari flow existing:

- payment success callback
- manual payment confirm
- buyer payment completion
- admin payment confirmation
- transaction resource mutation
- webhook/mock payment handler jika ada.

## Listing Lock

Setelah paid, mobil tidak boleh muncul sebagai available/bisa dibeli ulang.

Opsi:

```txt
listing_status = sold
```

atau jika project punya status:

```txt
listing_status = reserved_paid
```

Ikuti schema/status existing.

## Rollback/Error

Jika update listing gagal setelah payment paid, jangan silent fail.

Minimal:

- catat error/log.
- tampilkan toast di UI admin/seller jika action manual.
- dokumentasikan risiko konsistensi data.
- jika ada transaction atomic/DB transaction di backend, gunakan.

## Acceptance Task 3

- Payment paid mengubah status transaksi dengan benar.
- Listing terkunci/sold setelah paid.
- Tidak ada double purchase.
- Tidak ada reload penuh.
- Mutation lewat resource/API layer existing.
- Progress docs diupdate.
- Verifikasi endpoint/resource ditulis.

---

# Task 4 — Buyer Payment Success UI

## Tujuan

Saat buyer sudah membayar 100%, halaman buyer payment/detail harus menampilkan tampilan sukses.

Target:

```txt
#/buyer/transactions/:id
```

atau route payment status existing.

## UI Requirement

Jika payment sudah paid:

Tampilkan:

```txt
Pembayaran Berhasil
Pembayaran Anda sudah diterima 100%.
Transaksi sedang diproses oleh showroom/seller.
Tim seller akan menyiapkan dokumen dan proses serah terima kendaraan.
```

CTA:

- `Lihat Detail Transaksi`
- `Hubungi Seller` jika data kontak tersedia
- `Lihat Instruksi Serah Terima`
- `Unduh Bukti Pembayaran` jika data receipt tersedia

Jika action belum ada, jangan buat route/action palsu. Tampilkan hanya action yang valid.

## Buyer Design Guideline

Halaman akun buyer harus mengikuti desain buyer terbaru:

- mobile-first
- sidebar hidden untuk semua route buyer
- mobile pakai bottom nav buyer
- desktop pakai top nav buyer
- desain marketplace buyer, bukan admin dashboard
- tombol memakai global token
- icon center
- modal tidak close lewat backdrop
- tidak fetch klasik saat page/modal open

## Acceptance Task 4

- Paid state tampil sebagai success UI.
- Buyer paham transaksi sedang diproses seller.
- CTA tidak broken.
- Mobile rapi.
- Desktop rapi.
- Tidak ada fetch klasik baru.
- Progress docs diupdate.
- `node --check` lulus.

---

# Task 5 — Buyer Transactions UI Update

## Tujuan

Update `#/buyer/transactions` agar status transaksi paid/processing/completed jelas.

## Requirement

Pada card transaksi buyer:

- status `paid` tampil sebagai `Pembayaran Lunas`.
- status `processing` tampil sebagai `Diproses Seller`.
- status `handover` tampil sebagai `Serah Terima`.
- status `completed` tampil sebagai `Selesai`.
- status cancelled/refunded tampil jelas.

Jika status aktual berbeda, gunakan mapping.

## UI Card Requirement

Untuk buyer mobile:

- tampil sebagai transaction card, bukan dashboard admin.
- tampilkan gambar mobil jika tersedia.
- fallback image jika tidak ada.
- tidak ada broken image.
- CTA sesuai status:
  - pending: `Lanjutkan Pembayaran`
  - paid/processing: `Lihat Proses`
  - completed: `Lihat Detail`
  - cancelled/refunded: `Lihat Detail`

## Acceptance Task 5

- Buyer transactions menampilkan status post-payment dengan jelas.
- Card mobile-first.
- Gambar mobil tampil.
- Tidak ada broken image.
- Tidak ada fetch klasik baru.
- Progress docs diupdate.
- `node --check` lulus.

---

# Task 6 — Seller Transactions Fulfillment Queue

## Tujuan

Update halaman seller transactions agar transaksi paid masuk antrean yang perlu diproses seller.

Target:

```txt
#/seller/transactions
```

## Requirement

Jika transaksi sudah paid:

- tampilkan badge `Pembayaran Lunas`.
- tampilkan status lanjutan `Perlu Diproses`.
- seller bisa melihat bahwa pembayaran buyer sudah 100%.

Action seller yang disarankan:

- `Proses Transaksi`
- `Siapkan Dokumen`
- `Tandai Serah Terima`
- `Tandai Selesai`

Untuk MVP, minimal:

- `Proses Transaksi`
- `Tandai Selesai`

Jangan buat action palsu. Jika backend mutation belum ada, buat task terpisah atau tampilkan disabled dengan catatan.

## Mutation

Jika action update status tersedia:

- gunakan resource/API layer existing.
- update state lokal setelah sukses.
- toast sukses/gagal.
- rollback jika optimistik dan gagal.
- jangan reload penuh.

## UI Guideline Seller

- list operasional seller default tabel.
- tabel wajib memakai shared/global DataTable.
- jangan tabel custom lokal.
- detail/action default modal.
- modal tidak close lewat backdrop.
- tombol pakai global token.

## Acceptance Task 6

- Seller dapat melihat transaksi paid yang perlu diproses.
- Status dan action jelas.
- Tabel memakai shared DataTable jika list operasional.
- Tidak ada fetch klasik baru.
- Tidak ada tabel custom lokal.
- Progress docs diupdate.
- `node --check` lulus.

---

# Task 7 — Listing Lock / Sold Handling

## Tujuan

Pastikan mobil yang sudah dibayar 100% tidak bisa dibeli lagi.

## Requirement

Ketika transaksi paid:

- listing/car status berubah menjadi sold/reserved_paid sesuai canon.
- landing page tidak menampilkan mobil sebagai available untuk dibeli.
- public detail menampilkan status `Terjual` jika masih bisa dilihat.
- buyer catalog tidak menawarkan checkout untuk mobil sold.
- seller cars menampilkan status sold/terjual.

## Area yang Harus Dicek

- public landing page
- public car detail
- buyer catalog
- buyer recommendation
- seller cars
- seller transactions
- resource/API listing status

## UI Behavior

Jika mobil sold:

- badge `Terjual`
- CTA beli/checkout disabled atau hilang.
- detail tetap boleh terlihat jika project mengizinkan, tetapi tidak bisa dibeli ulang.
- jangan broken flow.

## Acceptance Task 7

- Mobil paid tidak bisa dibeli ulang.
- Listing status tampil jelas.
- CTA beli tidak aktif untuk sold.
- Landing/buyer catalog aman.
- Seller melihat status sold.
- Progress docs diupdate.
- `node --check` lulus.

---

# Task 8 — Affiliate Commission Accrual

## Tujuan

Jika transaksi paid memiliki affiliate attribution, komisi affiliate harus dicatat sesuai canon.

## Requirement

Saat transaction paid:

- cek apakah transaksi punya:
  - affiliate id
  - affiliate referral code
  - affiliate slug
  - attribution context
- jika ada, buat ledger/accrual commission sesuai flow existing.
- status awal komisi jangan langsung settled/paid kecuali canon existing memang begitu.

Status disarankan:

```txt
accrued
```

atau

```txt
pending
```

lalu menjadi:

```txt
eligible
settled
```

sesuai settlement flow.

## Wajib Baca

- `projectB/docs/AFFILIATE_FINANCE_CANON.md`
- `projectB/docs/RUNBOOK_SETTLEMENT_BASELINE.md`

## Jangan Dilakukan

Jangan:

- mengubah rumus komisi sembarangan.
- membuat double commission.
- membuat commission paid langsung tanpa settlement.
- mengubah attribution pipeline tanpa audit.
- merusak route `#/af/:slug`.

## Idempotency

Pastikan accrual tidak double jika payment paid diproses dua kali.

Gunakan guard:

- transaction id unique
- affiliate commission existing check
- ledger idempotency key jika ada.

## Acceptance Task 8

- Affiliate commission/accrual tercatat saat transaksi paid.
- Tidak double accrual.
- Status mengikuti canon.
- Seller/admin/affiliate commission view tetap aman.
- Progress docs diupdate.
- Verifikasi idempotency ditulis.

---

# Task 9 — Settlement Readiness

## Tujuan

Pastikan transaksi paid bisa masuk ke settlement flow jika project sudah punya settlement baseline.

## Requirement

Jika project memakai settlement:

- transaction paid belum otomatis berarti seller sudah menerima dana.
- seller settlement baru eligible setelah syarat fulfillment/serah terima selesai.
- admin/sistem dapat memproses settlement sesuai runbook.

Jika settlement belum aktif:

- dokumentasikan sebagai next phase.
- jangan membuat settlement palsu.

## Area

- admin settlements
- seller settlements jika ada
- affiliate settlements
- seller transactions completed action
- settlement runbook

## Acceptance Task 9

- Settlement readiness terdokumentasi.
- Tidak ada settlement palsu.
- Paid vs completed vs settled jelas.
- Progress docs diupdate.

---

# Task 10 — End-to-End Verification

## Tujuan

Verifikasi end-to-end flow setelah buyer membayar 100%.

## Scenario Test

### Scenario 1 — Buyer Payment 100%

1. Buyer punya transaksi pending.
2. Buyer membayar 100%.
3. Payment menjadi paid.
4. Buyer melihat success UI.
5. Listing terkunci/sold.
6. Seller melihat transaksi perlu diproses.
7. Admin melihat transaksi paid.

Expected:

- tidak reload penuh.
- tidak fetch klasik liar.
- status konsisten di semua role.

### Scenario 2 — Mobil Paid Tidak Bisa Dibeli Lagi

1. Mobil sudah punya transaction paid.
2. Public/buyer catalog membuka mobil tersebut.
3. CTA checkout tidak tersedia.
4. Badge terjual tampil.

### Scenario 3 — Affiliate Attribution

1. Buyer datang dari affiliate link.
2. Buyer checkout.
3. Buyer paid 100%.
4. Affiliate commission accrued.
5. Tidak double accrual jika callback/action diulang.

### Scenario 4 — Seller Completion

1. Seller melihat transaksi paid.
2. Seller proses transaksi.
3. Seller/admin menandai completed.
4. Buyer melihat transaksi selesai.
5. Settlement readiness sesuai runbook.

## Verification Command

Jalankan minimal:

```bash
node --check <file-js-yang-diubah>
```

Jika project punya test/lint command, jalankan juga sesuai docs.

## Acceptance Task 10

- Semua scenario utama lolos.
- Tidak ada fetch klasik baru di page/modal open.
- Tidak ada perubahan `projectA`.
- Tidak ada button hardcoded liar.
- Modal tidak close lewat backdrop.
- Progress docs selesai.

---

# Output Umum yang Diminta dari Codex

Untuk setiap task, Codex harus output:

1. Ringkasan pemahaman task.
2. File yang diperiksa.
3. File yang diubah.
4. Status/mapping yang dipakai.
5. Endpoint/resource yang dipakai.
6. Penjelasan bagaimana preload-first tetap dijaga.
7. Ada/tidak fetch baru.
8. Ada/tidak perubahan `projectA`.
9. Patch/kode perubahan.
10. Hasil verifikasi:
    - `node --check`
    - test/lint jika tersedia
11. Update `projectB/docs/POST_PAYMENT_100_HANDLING.md`.
12. Checklist acceptance criteria.
13. Next task yang direkomendasikan.

---

# Acceptance Criteria Task Utama

Task utama dianggap selesai jika:

- Payment 100% mengubah payment status menjadi paid.
- Transaction status masuk fase post-payment yang benar.
- Buyer melihat tampilan pembayaran berhasil.
- Buyer transactions menampilkan status paid/processing/completed dengan jelas.
- Seller transactions menampilkan transaksi paid sebagai perlu diproses.
- Listing/mobil terkunci agar tidak bisa dibeli ulang.
- Public/buyer catalog tidak menampilkan CTA beli untuk mobil sold.
- Jika ada affiliate attribution, commission accrual tercatat sesuai canon.
- Accrual affiliate tidak double.
- Settlement readiness terdokumentasi.
- Semua perubahan mengikuti SPA preload-first.
- Tidak ada fetch klasik baru saat page/modal open.
- Tidak ada perubahan pada `projectA`.
- Semua tombol memakai global theme token.
- Modal tidak close lewat backdrop.
- Icon center dalam wrapper.
- `projectB/docs/POST_PAYMENT_100_HANDLING.md` sudah dibuat/diupdate setiap task.
- `node --check` lulus untuk semua file JS yang diubah.

---

# Catatan Penting

Jangan mengerjakan semua task sekaligus jika terlalu besar.

Mulai dari:

1. Task 1 — Audit Status dan Flow Existing.
2. Update `POST_PAYMENT_100_HANDLING.md`.
3. Baru lanjut Task 2 dan seterusnya.

Setiap task harus selesai, diverifikasi, dan didokumentasikan sebelum lanjut ke task berikutnya.
