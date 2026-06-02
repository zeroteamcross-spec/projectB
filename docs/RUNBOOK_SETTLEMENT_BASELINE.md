# RUNBOOK_SETTLEMENT_BASELINE.md

## Tujuan
Dokumen ini menjadi runbook operasional untuk settlement affiliate baseline di `projectB`.

Scope dokumen:
- create settlement batch manual
- update status batch
- verifikasi perubahan status ledger
- langkah diagnosis dasar

Dokumen ini **bukan** panduan automation finance, bank transfer, atau payout gateway.

---

## Baseline Settlement Model

Settlement memakai model batch.

### Status ledger yang relevan
- `accrued` = komisi sudah tercatat dan eligible untuk settlement
- `pending` = ledger sudah masuk batch settlement, belum final
- `paid_out` = settlement sudah selesai
- saat batch `cancelled`, ledger kembali ke `accrued`

### Alur baseline
1. Transaksi affiliate mencapai `paid`
2. Sistem membuat ledger accrual canon otomatis
3. Ledger berstatus `accrued`
4. Admin membuat settlement batch manual
5. Ledger dalam batch menjadi `pending`
6. Admin finalisasi batch ke `settled`
7. Ledger dalam batch menjadi `paid_out`

Jika batch dibatalkan:
- status batch -> `cancelled`
- ledger item kembali ke `accrued`

---

## Prasyarat Wajib

### 1. SQL patch sudah di-apply
Pastikan patch berikut sudah berjalan:
- `20260419_affiliate_commission_pipeline_hardening.sql`
- `20260419_affiliate_settlement_baseline.sql`

### 2. Data accrual tersedia
Pastikan sudah ada minimal 1 ledger affiliate dengan:
- `affiliate_id` valid
- `transaction_id` valid
- `ledger_status = accrued`

### 3. Akun admin tersedia
Admin diperlukan untuk:
- melihat settlement di UI
- update status settlement batch
- create batch manual via endpoint/runbook

---

## Data yang Perlu Dicatat Saat Operasional
Sebelum memulai settlement, catat:
- `affiliate_id`
- `affiliate slug`
- `transaction_id`
- `transaction_code`
- `ledger_id`
- `commission_amount`
- `settlement_batch_id` setelah batch dibuat

---

# A. Cara Verifikasi Ledger Eligible

## Tujuan
Memastikan ledger memang eligible sebelum dimasukkan ke batch.

## Checklist
Per item ledger, cek:
- `ledger_status = accrued`
- `transaction_id` valid
- `affiliate_id` valid
- `commission_amount > 0`
- ledger belum terhubung ke batch aktif lain
- transaksi terkait sudah `paid`

Jika salah satu tidak valid:
- jangan masukkan ke batch
- eskalasi ke tim dev/ops untuk diagnosis canon data

---

# B. Create Settlement Batch Manual

## Catatan
Saat ini create-batch UI bisa belum tersedia penuh. Karena itu create batch baseline dilakukan manual melalui endpoint admin atau helper internal yang disiapkan tim.

## Input minimal
Batch settlement baseline sebaiknya memuat:
- target affiliate
- daftar ledger eligible
- total amount snapshot
- status awal `pending`

## Prinsip
- 1 ledger tidak boleh masuk dua batch aktif sekaligus
- amount yang masuk batch harus snapshot saat batch dibuat
- ledger item harus berpindah dari `accrued` menjadi `pending`
- batch menyimpan `settlement_code`, actor admin, payment reference/method/note bila diisi, dan history status.

## Setelah batch dibuat
Catat:
- `settlement_batch_id`
- jumlah ledger item
- total nominal
- status batch awal
- waktu create
- operator/admin yang menjalankan

---

# C. Update Status Batch ke Settled

## Tujuan
Memfinalisasi batch settlement setelah pembayaran manual dianggap selesai.

## Langkah
1. Buka admin settlement path:
   - `#/admin/settlements`
2. Cari batch dengan status `pending`
3. Verifikasi kembali:
   - batch id
   - amount
   - ledger count
4. Update status ke `settled`

## Expected
- batch status berubah menjadi final
- semua ledger item dalam batch berubah ke `paid_out`
- `paid_by`, `settled_at`, dan history status tercatat
- affiliate settlement page menunjukkan status yang sama
- ringkasan `settled` bertambah

## Checklist pasca-update
- batch tampil benar di admin
- affiliate page `#/affiliate/settlements` ikut sinkron
- ledger page `#/affiliate/ledger` tidak lagi menganggap item tersebut `accrued`

---

# D. Update Status Batch ke Cancelled

## Tujuan
Membatalkan batch settlement yang tidak jadi diproses.

## Langkah
1. Buka `#/admin/settlements`
2. Cari batch `pending`
3. Verifikasi batch yang akan dibatalkan
4. Update status ke `cancelled`

## Expected
- batch status berubah
- ledger item dalam batch kembali ke `accrued`
- `cancelled_by`, `cancelled_at`, dan history status tercatat
- eligible pool bertambah lagi
- affiliate settlement page dan ledger page ikut sinkron

---

# E. Verifikasi UI Affiliate Setelah Settlement

## Route yang dicek
- `#/affiliate`
- `#/affiliate/ledger`
- `#/affiliate/settlements`

## Checklist
### Dashboard affiliate
- summary berubah sesuai aggregate terbaru
- link ke settlement tetap berfungsi

### Ledger affiliate
- ledger item yang disettle berubah status
- nominal tetap konsisten
- tidak ada duplikasi item

### Settlement affiliate
- batch list tampil
- status batch tampil
- eligible ledger list berkurang/bertambah sesuai perubahan

---

# F. Verifikasi UI Admin Setelah Settlement

## Route yang dicek
- `#/admin`
- `#/admin/settlements`

## Checklist
- quick action settlement bekerja
- list batch tampil
- filter status berfungsi
- nominal batch benar
- ledger count benar
- update status tidak menghasilkan mismatch

---

# G. Failure Cases yang Harus Diwaspadai

## 1. Ledger tidak eligible
Gejala:
- ledger tidak muncul di eligible pool
- atau muncul tapi status bukan `accrued`

Langkah:
- cek transaction finality
- cek attribution canon
- cek commission accrual

## 2. Batch dibuat tapi ledger tidak jadi pending
Gejala:
- batch ada
- ledger status tetap `accrued`

Langkah:
- cek relasi `affiliate_settlement_items`
- cek update ledger status
- cek log backend

## 3. Batch settled tapi ledger tidak jadi paid_out
Gejala:
- batch status berubah
- ledger belum ikut berubah

Langkah:
- cek endpoint update batch
- cek transaction/DB update logic
- cek data join di affiliate settlement page

## 4. Batch cancelled tapi ledger tidak kembali accrued
Gejala:
- batch cancelled
- ledger tetap pending

Langkah:
- cek handler cancel settlement
- cek bulk update ledger status

## 5. Summary mismatch
Gejala:
- dashboard affiliate, ledger, dan settlements menunjukkan angka berbeda

Langkah:
- cek source aggregate
- cek apakah page membaca ledger canon yang sama
- cek apakah old snapshot belum refresh

---

# H. Checklist Diagnosis Cepat

Saat ada mismatch, periksa urutan berikut:

1. Apakah transaction sudah `paid`
2. Apakah transaction punya `affiliate_id`
3. Apakah ledger accrual tercipta
4. Apakah ledger status awal = `accrued`
5. Apakah settlement batch tercipta
6. Apakah settlement item relasi tercipta
7. Apakah update status batch memicu perubahan ledger status
8. Apakah UI affiliate/admin membaca aggregate yang sama

---

# I. Bukti yang Harus Dikumpulkan Saat UAT/Operasional

Per case settlement, kumpulkan:
- screenshot admin settlement page
- screenshot affiliate settlement page
- `settlement_batch_id`
- `ledger_id`
- `transaction_id`
- `transaction_code`
- status sebelum
- status sesudah
- timestamp eksekusi
- operator/admin yang menjalankan

---

# J. Hal yang Belum Termasuk Scope Baseline

Runbook ini tidak mencakup:
- bank transfer otomatis
- disbursement gateway
- withdrawal request affiliate
- reconciliation finance berat
- accounting export
- payout approval multi-level

Jika domain finance diperluas nanti, runbook ini perlu dipecah lagi menjadi:
- payout request runbook
- disbursement runbook
- reconciliation runbook
