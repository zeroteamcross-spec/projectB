# OPERATIONS_RUNBOOK

## Tujuan
Dokumen ini menjadi runbook operasional lintas role untuk `projectB` setelah baseline aplikasi dianggap stabil dan siap masuk ke UAT besar. Fokus dokumen ini adalah operasi harian, validasi lingkungan, tindakan manual yang masih diperlukan, serta jalur diagnosis saat terjadi masalah.

Dokumen ini **bukan** dokumen arsitektur. Gunakan bersama:
- `ROADMAP_PROJECTB.md`
- `UAT_CHECKLIST.md`
- `RUNBOOK_SETTLEMENT_BASELINE.md`
- `AFFILIATE_FINANCE_CANON.md`

---

## 1. Ruang lingkup sistem
Sistem `projectB` saat ini mencakup domain berikut:

### Public
- landing utama
- katalog publik
- detail mobil
- auth landing netral
- landing affiliate `#/af/:slug`

### Buyer
- transaction entry
- payment status
- pelunasan dasar

### Seller
- dashboard seller
- showroom saya
- mobil saya
- image management
- inspection
- transaksi seller
- affiliate management
- affiliate commission management

### Admin
- dashboard admin
- user management
- approval flow
- impersonation
- transaction monitoring
- settlement baseline monitoring/update

### Affiliate
- dashboard affiliate
- activity / click
- ledger / komisi
- settlement visibility

---

## 2. Prasyarat operasional
Sebelum sistem digunakan untuk UAT atau operasi internal, pastikan semua prasyarat berikut terpenuhi.

### 2.1 Environment
Pastikan environment valid:
- database aktif dan sesuai schema canon terbaru
- endpoint API bisa diakses dari frontend
- config auth aktif
- config payment sandbox valid
- URL aplikasi lokal / UAT konsisten
- timezone konsisten

### 2.2 SQL patch wajib
Patch berikut **wajib** sudah di-apply pada environment UAT/operasional internal:

- `20260419_affiliate_commission_pipeline_hardening.sql`
- `20260419_affiliate_settlement_baseline.sql`

Jika patch ini belum diterapkan:
- attribution affiliate ke transaksi bisa gagal
- ledger canon bisa tidak sinkron
- settlement baseline bisa tidak berfungsi

### 2.3 Akun minimum untuk validasi
Minimal tersedia akun:
- buyer
- seller
- admin
- affiliate_admin

Minimal tersedia data:
- 1 showroom aktif
- beberapa mobil published
- 1 affiliate aktif
- 1 global commission rule
- 1 per-car override
- 1 transaksi uji
- 1 batch settlement uji bila perlu

---

## 3. Startup checklist environment
Gunakan checklist ini setiap kali memulai sesi operasional/UAT baru.

### 3.1 Backend
- server backend aktif
- endpoint health check OK
- koneksi DB OK
- auth login bisa dipakai
- log error backend kosong atau terkendali

### 3.2 Frontend
- `app.html` dapat diakses
- hash routing berjalan
- tidak ada white screen
- tidak ada hydrate alert permanen di shell
- localStorage/sessionStorage tidak menyimpan state usang yang menyesatkan

### 3.3 Payment sandbox
- create payment session berhasil
- callback path siap
- callback URL sesuai environment
- untuk staging/public callback, URL harus public HTTPS yang reachable

---

## 4. Operasi lintas role
Bagian ini menjelaskan tindakan operasional dasar per role.

## 4.1 Public
Operator wajib bisa memverifikasi:
- `#/` membuka katalog
- `#/cars/:id` membuka detail mobil
- `#/auth` bisa dipakai
- `#/af/:slug` membuka landing affiliate
- CTA WhatsApp context-aware berjalan

Jika public mengalami blank page:
1. cek console browser
2. cek hydrate alert
3. cek file JS utama termuat
4. cek API katalog
5. bersihkan localStorage/sessionStorage bila perlu

## 4.2 Buyer
Buyer flow minimum yang harus sehat:
- login buyer
- buat transaksi dari detail mobil
- lihat payment status
- refresh status
- pelunasan dasar

Jika transaksi gagal:
1. cek payload create transaction
2. cek attribution affiliate bila transaksi berasal dari landing affiliate
3. cek validitas payment method
4. cek transaksi tersimpan di DB
5. cek status payment logs bila ada

## 4.3 Seller
Seller flow minimum:
- update showroom
- create/edit/archive mobil
- upload gambar
- inspection
- lihat transaksi
- buat/edit affiliate
- atur commission rules

Jika seller tidak melihat data yang diharapkan:
1. cek seller ownership
2. cek preload seller snapshot
3. cek working set seller
4. cek query filter backend
5. cek role guard

## 4.4 Admin
Admin flow minimum:
- dashboard
- users
- approvals
- transactions
- settlements
- impersonation

Jika admin settlement dipakai:
- admin dapat melihat batch
- admin dapat memfinalisasi batch
- admin dapat cancel batch
- perubahan batch harus sinkron dengan ledger

Jika impersonation dipakai:
- banner impersonation wajib tampil
- admin route tidak boleh tetap terbuka saat effective role berubah
- stop impersonation harus mengembalikan context admin

## 4.5 Affiliate
Affiliate flow minimum:
- login affiliate
- dashboard
- activity
- ledger
- settlements

Affiliate bersifat read-only untuk settlement baseline. Jangan mengasumsikan affiliate dapat request withdrawal otomatis.

---

## 5. Runbook affiliate finance baseline
Untuk detail finance baseline, gunakan:
- `AFFILIATE_FINANCE_CANON.md`
- `RUNBOOK_SETTLEMENT_BASELINE.md`

Di dokumen ini hanya ditulis jalur operasional ringkas.

### 5.1 Jalur bisnis yang berlaku
1. user datang dari `#/af/:slug`
2. context affiliate aktif
3. create transaction mengirim referral code
4. backend resolve affiliate canon
5. transaksi dibayar sampai `paid`
6. accrual ledger dibuat otomatis
7. ledger menjadi eligible untuk settlement
8. admin membuat batch settlement
9. batch menjadi `pending`
10. admin finalisasi menjadi `paid_out`
11. affiliate melihat hasil di dashboard/ledger/settlements

### 5.2 Hal yang wajib dicek saat finance UAT
- transaction menyimpan `affiliate_id`
- transaction menyimpan `affiliate_referral_code_snapshot`
- rule komisi efektif benar
- override per mobil menang atas global
- accrual hanya dibuat sekali
- ledger snapshot historis tersimpan
- settlement status sinkron ke ledger

---

## 6. Runbook create settlement batch manual
Karena create-batch UI belum selalu tersedia, jalur manual harus siap.

### 6.1 Tujuan
Membuat settlement batch baseline dari ledger berstatus `accrued`.

### 6.2 Input minimum
- affiliate_id
- daftar ledger eligible
- total nominal batch
- operator/admin yang membuat batch

### 6.3 Langkah umum
1. identifikasi ledger eligible (`accrued`)
2. buat batch settlement manual via endpoint/admin tool/runbook
3. simpan item relasi ledger ke batch
4. ubah ledger menjadi `pending`
5. verifikasi affiliate settlement page menampilkan batch tersebut

### 6.4 Finalisasi
- `pending -> settled` mengubah ledger ke `paid_out`
- `pending -> cancelled` mengembalikan ledger ke `accrued`

### 6.5 Catatan
Jangan memfinalisasi batch yang ledger item-nya tidak cocok, tidak lengkap, atau bukan milik affiliate yang sama.

---

## 7. Hydrate error / route error runbook
Sekarang hydrate error sudah tampil di shell lintas role. Gunakan ini untuk diagnosis.

### 7.1 Gejala
- alert hydrate muncul
- toast error route muncul
- page tidak merender sesuai harapan
- page jatuh ke empty state yang tidak masuk akal

### 7.2 Langkah diagnosis
1. catat hash route aktif
2. catat pesan error di alert
3. cek console browser
4. cek response network untuk preload/hydrate route
5. cek role aktif
6. cek apakah SQL patch environment sudah sinkron
7. reload route terkait
8. bila tetap gagal, pindah route lalu kembali lagi untuk memastikan cleanup berjalan

### 7.3 Hal yang perlu dicatat
- role aktif
- route hash
- payload/query
- API yang gagal
- screenshot alert
- waktu kejadian

---

## 8. Impersonation runbook
Gunakan hanya untuk admin yang sah.

### 8.1 Tujuan
Memasuki konteks user lain tanpa merusak session admin asli.

### 8.2 Jalur yang benar
- admin login sebagai admin
- admin masuk ke user management
- admin pilih user target
- admin start impersonation
- banner impersonation tampil
- admin dapat kembali ke admin tanpa login ulang

### 8.3 Larangan
- jangan gunakan impersonation untuk menyamarkan audit
- jangan lanjutkan operasi sensitif jika banner tidak tampil
- jangan gunakan flow ini untuk admin lain tanpa kebutuhan jelas

### 8.4 Jika terjadi mismatch
Jika setelah act-as route tidak sesuai:
1. cek effective role
2. cek role guard
3. gunakan stop impersonation
4. login ulang admin bila context diragukan

---

## 9. Logging & bukti operasional
Selama UAT atau operasi awal, selalu simpan bukti minimum:

- waktu kejadian
- role
- route
- transaction_id bila relevan
- affiliate slug / affiliate_id bila relevan
- settlement_batch_id bila relevan
- screenshot UI
- response API penting bila ada
- query manual / runbook manual yang dijalankan

---

## 10. Kriteria go / no-go internal
Gunakan kriteria ini untuk memutuskan apakah sistem cukup sehat untuk melanjutkan UAT atau operasi baseline.

### GO jika:
- SQL patch sudah applied
- login semua role berjalan
- public/buyer/seller/admin/affiliate route utama sehat
- affiliate attribution benar-benar tersimpan di transaksi
- ledger accrual otomatis bekerja
- settlement baseline bekerja
- tidak ada hydrate blocker besar
- impersonation bekerja dan dapat dihentikan dengan benar

### NO-GO jika:
- schema patch belum sinkron
- transaksi affiliate tidak menyimpan attribution canon
- ledger tidak sinkron dengan rule seller
- settlement status tidak sinkron ke ledger
- white screen / blank page masih muncul
- role guard salah arah
- callback/payment flow putus

---

## 11. Tindak lanjut setelah UAT
Setelah UAT besar selesai, evaluasi:
- bug fungsional
- mismatch data
- gap operasional
- kebutuhan admin settlement UI yang lebih lengkap
- kebutuhan invitation/claim affiliate final
- kebutuhan automated regression/e2e

Dokumentasikan hasil UAT dalam:
- daftar PASS / FAIL / BLOCKED
- root cause
- patch yang dibutuhkan
- prioritas perbaikan
