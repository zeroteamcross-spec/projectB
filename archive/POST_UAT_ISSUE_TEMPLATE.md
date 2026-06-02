# POST_UAT_ISSUE_TEMPLATE

## Tujuan
Template ini dipakai untuk mencatat issue setelah UAT secara konsisten, supaya:
- mudah ditriase
- mudah direproduksi
- mudah dipetakan ke domain/role
- bisa dibedakan antara bug, misconfig, limitation, atau data issue

Gunakan satu entri per issue.

---

# 1. Ringkasan issue

- **Issue ID**:
- **Tanggal ditemukan**:
- **Ditemukan oleh**:
- **Environment**:
- **Severity**:
  - [ ] Critical
  - [ ] High
  - [ ] Medium
  - [ ] Low
- **Status awal**:
  - [ ] Open
  - [ ] Investigating
  - [ ] Blocked
  - [ ] Fixed
  - [ ] Won't Fix
  - [ ] Duplicate

- **Judul singkat issue**:

Contoh:
- Affiliate ledger tidak muncul setelah transaksi paid
- Buyer route diarahkan salah setelah login
- Admin settlement status update gagal 500

---

# 2. Domain / role terkait

## Domain
- [ ] Public
- [ ] Buyer
- [ ] Seller
- [ ] Admin
- [ ] Affiliate
- [ ] Cross-role
- [ ] Finance / Settlement
- [ ] Auth / Role Guard
- [ ] Theme / UI
- [ ] Data / Schema
- [ ] Environment / Config

## Role yang terdampak
- [ ] guest
- [ ] buyer
- [ ] seller
- [ ] admin
- [ ] affiliate_admin

---

# 3. Tipe masalah

- [ ] Bug aplikasi
- [ ] Regression
- [ ] Misconfiguration environment
- [ ] Data/seed issue
- [ ] Missing SQL patch / schema mismatch
- [ ] Known limitation
- [ ] UX issue
- [ ] Performance issue
- [ ] Security / authorization concern
- [ ] Documentation / runbook issue

---

# 4. Precondition

Tuliskan kondisi sebelum issue direproduksi.

Contoh:
- sudah login sebagai seller
- seller sudah punya showroom
- affiliate slug aktif tersedia
- transaction sudah berada di status `paid`
- SQL patch settlement belum / sudah di-apply

Precondition:
- 
- 
- 

---

# 5. Langkah reproduksi

Tuliskan langkah dengan jelas dan berurutan.

1. 
2. 
3. 
4. 
5. 

---

# 6. Expected vs actual

## Expected
Jelaskan perilaku yang seharusnya.

- 

## Actual
Jelaskan perilaku yang benar-benar terjadi.

- 

---

# 7. Bukti / artefak

- **URL / route**:
- **Transaction ID**:
- **Affiliate slug**:
- **Settlement batch ID**:
- **User ID / email test**:
- **Browser / device**:
- **Timestamp kejadian**:

## Screenshot / video
- Lampiran:
- Link:
- Catatan:

## Console / network / server log
- Ringkasan error:
- Response code:
- Request URL:
- Potongan log relevan:

---

# 8. Dampak bisnis / operasional

Pilih semua yang relevan:
- [ ] Menghalangi UAT
- [ ] Menghalangi release
- [ ] Menghalangi transaksi
- [ ] Menghalangi affiliate attribution
- [ ] Menghalangi accrual ledger
- [ ] Menghalangi settlement
- [ ] Menghalangi login / auth
- [ ] Menimbulkan salah data
- [ ] Hanya cosmetic / minor UX
- [ ] Hanya dokumen/runbook

Penjelasan dampak:
- 

---

# 9. Dugaan akar masalah (opsional)

Jika sudah ada hipotesis awal:
- [ ] Frontend
- [ ] Backend
- [ ] Schema / SQL patch
- [ ] Environment
- [ ] Seed/data
- [ ] Provider eksternal
- [ ] Belum diketahui

Catatan:
- 

---

# 10. Severity justification

## Kenapa severity ini dipilih?
- 

## Apakah ini blocker?
- [ ] Ya
- [ ] Tidak

Jika ya, blocker untuk:
- [ ] UAT
- [ ] Release
- [ ] Finance flow
- [ ] Multi-role flow
- [ ] Operasional admin
- [ ] Seller flow
- [ ] Buyer flow
- [ ] Affiliate flow

---

# 11. Penanganan awal

- [ ] Belum ada
- [ ] Workaround tersedia
- [ ] Sudah diinvestigasi sebagian
- [ ] Sudah diperbaiki lokal
- [ ] Menunggu keputusan bisnis
- [ ] Menunggu SQL patch
- [ ] Menunggu data/seed
- [ ] Menunggu provider eksternal

## Workaround (jika ada)
- 

---

# 12. Owner & tindak lanjut

- **PIC engineering**:
- **PIC QA/UAT**:
- **PIC operasional**:
- **Target tindak lanjut**:
- **Tindak lanjut berikutnya**:
  - [ ] Patch code
  - [ ] Patch SQL
  - [ ] Update env/config
  - [ ] Tambah seed/data
  - [ ] Update docs/runbook
  - [ ] Re-test
  - [ ] Business decision needed

---

# 13. Closure

- **Tanggal selesai**:
- **Diselesaikan oleh**:
- **Fix summary**:
- **Verifikasi ulang oleh**:
- **Hasil verifikasi ulang**:
  - [ ] PASS
  - [ ] FAIL
  - [ ] PARTIAL
- **Catatan akhir**:

---

# 14. Ringkasan satu baris untuk tracker

Gunakan format singkat ini untuk spreadsheet/tracker:

`[Severity] [Domain] Judul singkat — Status — PIC`

Contoh:
`[High] [Affiliate Finance] Ledger accrual tidak muncul setelah status paid — Open — Backend`
