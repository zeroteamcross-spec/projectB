# UAT_CHECKLIST.md

## Tujuan
Dokumen ini menjadi checklist UAT besar lintas role untuk `projectB`, agar proses validasi berjalan urut, konsisten, dan mudah dicatat.

Dokumen ini dipakai setelah:
- patch schema canon dan settlement sudah di-apply
- data uji dasar sudah tersedia
- environment UAT/local dapat diakses lewat browser

---

## Prasyarat Wajib

### 1. SQL patch sudah di-apply
Minimal patch berikut sudah dijalankan pada DB environment UAT:

- `20260419_affiliate_commission_pipeline_hardening.sql`
- `20260419_affiliate_settlement_baseline.sql`

Jika belum, maka hasil UAT pada area affiliate finance bisa gagal karena schema belum sinkron.

### 2. Data uji tersedia
Minimal siapkan:

- 1 akun `buyer`
- 1 akun `seller`
- 1 akun `admin`
- 1 akun `affiliate_admin`
- 1 showroom milik seller
- beberapa mobil published milik seller
- 1 affiliate aktif milik seller
- 1 global commission rule aktif
- 1 per-car override aktif
- 1 transaksi uji yang bisa dipakai bila perlu

### 3. Data referensi dicatat
Siapkan dan catat:
- email/password semua akun uji
- slug affiliate uji
- URL landing affiliate
- car id yang dipakai test
- transaction id yang dipakai test
- settlement batch id bila dibuat manual

### 4. Runbook settlement manual tersedia
Karena create-batch settlement bisa masih manual, tester harus punya langkah jelas untuk:
- create settlement batch
- update status batch ke `settled`
- update status batch ke `cancelled`

---

## Aturan Pencatatan Hasil

Setiap item UAT dicatat dengan format:

- `ID`
- `Skenario`
- `Langkah`
- `Expected Result`
- `Actual Result`
- `Status`: `PASS` / `FAIL` / `BLOCKED`
- `Catatan`
- `Bukti`: screenshot / transaction id / slug / batch id / log singkat

---

## Ringkasan Eksekusi yang Disarankan

Urutan eksekusi paling aman:

1. Public
2. Buyer
3. Seller
4. Admin
5. Affiliate public
6. Affiliate dashboard/activity
7. Affiliate ledger
8. Affiliate settlement baseline
9. Impersonation cross-role
10. Smoke re-test

---

# A. PUBLIC FLOW

## UAT-PUB-001 — Landing utama tampil normal
### Langkah
1. Buka `#/`
2. Tunggu page hydrate selesai

### Expected
- katalog tampil
- tidak ada white screen
- tidak ada hydrate alert
- search/filter area tampil

---

## UAT-PUB-002 — Detail mobil publik
### Langkah
1. Dari katalog publik, buka salah satu mobil
2. Periksa detail mobil

### Expected
- gallery tampil
- harga tampil
- ringkasan spesifikasi tampil
- CTA transaksi tampil
- CTA WhatsApp tampil

---

## UAT-PUB-003 — Auth landing netral untuk route protected
### Langkah
1. Logout
2. Buka route protected, misalnya `#/buyer/transactions`

### Expected
- user diarahkan ke `/auth?...`
- pilihan role tampil jelas
- user tidak melihat buyer shell secara liar
- route asal tetap bisa dipulihkan setelah login jika valid

---

## UAT-PUB-004 — Affiliate landing publik
### Langkah
1. Buka `#/af/{affiliateSlug}`
2. Periksa landing

### Expected
- desain sama dengan landing utama
- katalog hanya mobil seller terkait
- banner/context affiliate tampil
- CTA WhatsApp mengarah ke nomor affiliate
- tidak ada desain kedua yang menyimpang

---

# B. BUYER FLOW

## UAT-BUY-001 — Login buyer
### Langkah
1. Buka `/auth?role=buyer`
2. Login sebagai buyer

### Expected
- login berhasil
- diarahkan ke route buyer yang valid
- buyer shell/nav benar

---

## UAT-BUY-002 — Buyer dashboard & transactions
### Langkah
1. Buka `#/buyer`
2. Buka `#/buyer/transactions`

### Expected
- halaman tampil normal
- daftar transaksi tampil bila ada
- tidak ada hydrate alert

---

## UAT-BUY-003 — Create transaction dari public detail
### Langkah
1. Dari publik, buka detail mobil
2. Klik mulai transaksi
3. Isi payment type dan payment method
4. Submit

### Expected
- transaksi berhasil dibuat
- result panel atau redirect status muncul
- transaction code terlihat
- tidak ada JS/fetch error fatal

---

## UAT-BUY-004 — Payment status buyer
### Langkah
1. Buka detail/status transaksi buyer
2. Refresh status

### Expected
- status tampil jelas
- payment summary tampil
- action panel tampil sesuai status

---

## UAT-BUY-005 — Pelunasan dasar
### Langkah
1. Gunakan transaksi status `dp_paid`
2. Lakukan flow pelunasan dasar

### Expected
- create completion payment berhasil
- info result tampil
- status tetap sinkron

---

# C. SELLER FLOW

## UAT-SEL-001 — Seller dashboard
### Langkah
1. Login seller
2. Buka `#/seller`

### Expected
- dashboard seller tampil
- summary ringan tampil
- quick actions berjalan

---

## UAT-SEL-002 — Showroom saya
### Langkah
1. Buka `#/seller/showroom`
2. Edit showroom
3. Simpan

### Expected
- update berhasil
- reload tetap konsisten
- data tampil benar di mode view

---

## UAT-SEL-003 — Mobil saya
### Langkah
1. Buka `#/seller/cars`
2. Create mobil
3. Edit mobil
4. Archive mobil

### Expected
- semua aksi berhasil
- listing status tampil benar
- list tersinkron

---

## UAT-SEL-004 — Upload gambar
### Langkah
1. Buka route gambar mobil
2. Upload gambar
3. Set cover
4. Delete gambar

### Expected
- upload berhasil
- preview tampil
- cover berubah benar
- delete berhasil

---

## UAT-SEL-005 — Inspection flow
### Langkah
1. Buka route inspeksi mobil
2. Create/update report
3. Publish report

### Expected
- report tersimpan
- status inspeksi berubah
- list mobil ikut sinkron

---

## UAT-SEL-006 — Seller transactions
### Langkah
1. Buka `#/seller/transactions`
2. Lihat detail transaksi

### Expected
- list tampil
- detail tampil
- status transaksi sesuai backend

---

## UAT-SEL-007 — Seller affiliate management
### Langkah
1. Buka `#/seller/affiliates`
2. Create affiliate baru
3. Edit affiliate
4. Aktif/nonaktifkan affiliate

### Expected
- slug unik tervalidasi
- URL landing affiliate tampil
- WhatsApp affiliate tersimpan
- status aktif/nonaktif berjalan

---

## UAT-SEL-008 — Seller commission management
### Langkah
1. Buka `#/seller/affiliate-commissions`
2. Set global rule
3. Set per-car override
4. Nonaktifkan override

### Expected
- global rule tersimpan
- override tersimpan
- priority override > global berlaku
- saat override nonaktif, global dipakai lagi

---

# D. ADMIN FLOW

## UAT-ADM-001 — Admin dashboard
### Langkah
1. Login admin
2. Buka `#/admin`

### Expected
- dashboard tampil
- quick actions tampil
- tidak ada role/shell mismatch

---

## UAT-ADM-002 — Admin user management
### Langkah
1. Buka `#/admin/users`
2. Filter role/status
3. Buka detail user
4. Approve seller bila ada

### Expected
- list tampil
- detail panel tampil
- approval dasar berhasil
- queue tetap sinkron

---

## UAT-ADM-003 — Impersonation buyer
### Langkah
1. Dari admin user management, start act-as buyer
2. Periksa shell
3. Kembali ke admin

### Expected
- effective role berubah ke buyer
- admin route tidak lagi terbuka sebagai buyer
- banner impersonation tampil
- stop impersonation berhasil

---

## UAT-ADM-004 — Impersonation seller
### Langkah
1. Start act-as seller
2. Akses seller pages
3. Kembali ke admin

### Expected
- shell seller tampil
- seller pages dapat diakses
- kembali ke admin berhasil

---

## UAT-ADM-005 — Admin transactions
### Langkah
1. Buka `#/admin/transactions`
2. Filter status/payment type
3. Buka detail transaksi

### Expected
- list tampil
- detail panel tampil
- payment logs/summary tampil bila ada

---

## UAT-ADM-006 — Approval queue
### Langkah
1. Buka `#/admin/approvals`
2. Pilih item
3. Review detail
4. Approve dari list atau detail

### Expected
- queue tampil
- detail review tampil
- approve berhasil
- item keluar dari queue bila sudah tidak pending

---

## UAT-ADM-007 — Admin settlements
### Langkah
1. Buka `#/admin/settlements`
2. Filter batch
3. Update status `pending -> settled`
4. Update status `pending -> cancelled`

### Expected
- list batch tampil
- nominal dan count tampil
- update status berhasil
- efek ke ledger sesuai baseline

---

# E. AFFILIATE FLOW

## UAT-AFF-001 — Login affiliate
### Langkah
1. Buka `/auth?role=affiliate_admin`
2. Login affiliate

### Expected
- login berhasil
- diarahkan ke `#/affiliate`
- nav/sidebar affiliate benar

---

## UAT-AFF-002 — Affiliate dashboard
### Langkah
1. Buka `#/affiliate`

### Expected
- identity panel tampil
- owner/showroom tampil
- quick actions tampil
- jika data belum lengkap, tampil empty state yang jujur

---

## UAT-AFF-003 — Affiliate activity
### Langkah
1. Buka `#/affiliate/activity`

### Expected
- summary click tampil
- list click tampil bila ada
- fallback jujur bila data belum penuh

---

## UAT-AFF-004 — Affiliate ledger
### Langkah
1. Buka `#/affiliate/ledger`

### Expected
- summary komisi tampil
- list ledger tampil
- field canon baru tampil bila ada:
  - rule_source
  - commission_type
  - commission_value_snapshot
  - base_amount
  - commission_amount
  - ledger_status
  - finality_event

---

## UAT-AFF-005 — Affiliate settlements
### Langkah
1. Buka `#/affiliate/settlements`

### Expected
- summary settlement tampil
- eligible ledger tampil
- settlement batch list tampil
- status settlement sesuai data backend

---

# F. AFFILIATE FINANCE END-TO-END

## UAT-FIN-001 — Attribution canon di transaksi
### Langkah
1. Buka `#/af/{affiliateSlug}`
2. Buka mobil
3. Buat transaksi buyer dari context affiliate
4. Periksa data transaksi di backend atau response yang relevan

### Expected
Transaksi menyimpan:
- `affiliate_id`
- `affiliate_referral_code_snapshot`

---

## UAT-FIN-002 — Global commission rule applied
### Langkah
1. Set global rule seller
2. Buat transaksi affiliate
3. Ubah transaksi hingga `paid`
4. Periksa ledger affiliate

### Expected
- ledger accrual muncul
- nominal komisi sesuai global rule
- finality event = `paid`

---

## UAT-FIN-003 — Per-car override applied
### Langkah
1. Set per-car override untuk mobil tertentu
2. Buat transaksi affiliate untuk mobil itu
3. Ubah transaksi hingga `paid`
4. Periksa ledger affiliate

### Expected
- override menang atas global
- nominal komisi sesuai rule per mobil

---

## UAT-FIN-004 — Settlement create/manual batch
### Langkah
1. Pastikan ledger berstatus `accrued`
2. Buat settlement batch manual sesuai runbook
3. Cek ledger dan batch

### Expected
- ledger masuk ke status `pending`
- batch settlement tercatat

---

## UAT-FIN-005 — Settlement settled
### Langkah
1. Update batch settlement ke `settled`
2. Refresh admin settlement dan affiliate settlement

### Expected
- ledger menjadi `paid_out`
- affiliate settlement page menampilkan status yang sama

---

## UAT-FIN-006 — Settlement cancelled
### Langkah
1. Buat batch `pending`
2. Update batch ke `cancelled`

### Expected
- ledger kembali ke `accrued`
- tidak ada mismatch count/summary

---

# G. CROSS-ROLE & FOUNDATION

## UAT-XR-001 — Role guard
### Langkah
1. Coba akses route buyer/seller/admin/affiliate tanpa login
2. Coba akses route role lain setelah login dengan role salah

### Expected
- diarahkan ke auth landing / home role yang benar
- tidak mount shell yang salah
- tidak ada role leakage

---

## UAT-XR-002 — Hydrate error visibility
### Langkah
1. Simulasikan route yang gagal hydrate bila memungkinkan
2. Amati shell

### Expected
- alert hydrate tampil jelas
- route/path dan pesan error terlihat
- tidak jatuh ke loading/empty ambigu

---

## UAT-XR-003 — Theme consistency
### Langkah
1. Cek halaman utama lintas role:
   - public
   - buyer
   - seller
   - admin
   - affiliate

### Expected
- tone visual konsisten
- button/card/badge utama konsisten
- tidak ada hardcoded visual kritis yang mencolok

---

## UAT-XR-004 — Cleanup state
### Langkah
1. Berpindah antar halaman dan role
2. Perhatikan tidak ada state nyangkut / shell salah

### Expected
- snapshot/working/runtime tetap sehat
- route lama tidak meninggalkan data yang menyesatkan

---

# Kriteria PASS Global

UAT besar dianggap layak jika:
- tidak ada white screen / blank page
- tidak ada hydrate error yang tidak tertangani
- role guard konsisten
- impersonation bekerja benar
- affiliate attribution tersimpan di transaksi
- commission rule diterapkan benar
- ledger sesuai transaksi paid
- settlement baseline konsisten
- shell dan theme lintas role tetap stabil

---

# Kriteria BLOCKER Global

UAT harus dihentikan / dianggap blocked jika:
- SQL patch belum di-apply
- transaksi affiliate tidak menyimpan attribution canon
- ledger accrual tidak muncul saat transaksi paid
- komisi tidak sesuai rule seller
- settlement tidak mengubah status ledger dengan benar
- role guard salah dan membuka shell/route yang tidak semestinya
- hydrate failure hanya jatuh ke empty/loading tanpa error yang jelas

---

# Catatan Setelah UAT
Setelah UAT selesai, buat ringkasan:
- total PASS / FAIL / BLOCKED
- bug blocker
- bug sedang
- bug minor
- patch cepat yang memungkinkan
- keputusan apakah:
  - siap lanjut stabilisasi
  - siap staging/UAT berikutnya
  - atau perlu hardening tambahan

