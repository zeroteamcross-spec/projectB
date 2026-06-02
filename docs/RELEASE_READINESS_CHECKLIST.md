# RELEASE_READINESS_CHECKLIST

## Tujuan
Dokumen ini dipakai untuk menilai apakah `projectB` sudah siap dipromosikan ke environment berikutnya
(local -> UAT -> staging -> production) dari sisi:
- code readiness
- database/schema readiness
- environment readiness
- operasional
- UAT
- finance/affiliate baseline
- rollback awareness

Dokumen ini **bukan** pengganti UAT. Dokumen ini adalah checklist keputusan rilis.

---

## Cara pakai
- Tandai setiap item dengan:
  - `[ ]` belum
  - `[x]` selesai
  - `N/A` tidak berlaku
- Simpan catatan ringkas pada item yang masih pending
- Jangan nyatakan release ready jika ada blocker di bagian **P0 wajib**

---

# 1. Informasi release

- Nama release:
- Tanggal:
- Environment target:
- Branch/commit/tag:
- PIC release:
- PIC backend:
- PIC frontend:
- PIC QA/UAT:
- PIC operasional:

---

# 2. P0 wajib — blocker release

## 2.1 Source code
- [ ] Working tree bersih / perubahan release sudah committed
- [ ] Tag release sudah dibuat bila diperlukan
- [ ] Tidak ada file debug/dev sementara yang ikut terbawa
- [ ] Tidak ada credential sensitif hardcoded
- [ ] Tidak ada route/test hook/debug endpoint yang seharusnya nonaktif tapi masih terbuka

## 2.2 Database & schema
- [ ] Semua SQL patch/migration yang wajib sudah diidentifikasi
- [ ] SQL patch sudah dijalankan pada environment target
- [ ] Schema canon dan schema aktual sinkron
- [ ] Tidak ada query yang mengandalkan kolom/tabel yang belum dibuat
- [ ] Seed/data minimum yang dibutuhkan untuk smoke/UAT tersedia

## 2.3 Environment
- [ ] `.env` target valid
- [ ] DB connection valid
- [ ] base URL / app URL valid
- [ ] callback URL provider valid untuk environment target
- [ ] timezone sudah benar
- [ ] storage path/upload path valid
- [ ] permission file/folder valid

## 2.4 Core app health
- [ ] Root app/frontend bisa diakses
- [ ] Health check backend valid
- [ ] API utama merespons normal
- [ ] Error fatal/white screen tidak ditemukan di smoke dasar
- [ ] Role guard berjalan benar

## 2.5 Affiliate finance baseline
- [ ] Affiliate attribution canon di transaksi aktif
- [ ] Commission accrual otomatis aktif
- [ ] Ledger canon aktif
- [ ] Settlement baseline schema aktif
- [ ] Settlement read/update path berjalan
- [ ] Tidak ada mismatch jelas antara transaksi paid dan ledger accrual

## 2.6 UAT minimum
- [ ] UAT public minimum lulus
- [ ] UAT buyer minimum lulus
- [ ] UAT seller minimum lulus
- [ ] UAT admin minimum lulus
- [ ] UAT affiliate minimum lulus
- [ ] Tidak ada blocker P0 terbuka

---

# 3. Backend readiness

## 3.1 API & business flow
- [ ] Route API utama tersedia
- [ ] Validasi request utama bekerja
- [ ] Policy/authorization bekerja sesuai role
- [ ] Error response utama konsisten
- [ ] Endpoint finance/provider penting telah diuji pada scope yang sesuai

## 3.2 Payment / provider
- [ ] Create payment session berjalan
- [ ] Callback validation/signature berjalan
- [ ] Mapping status transaksi benar
- [ ] Payment logs tercatat
- [ ] Callback URL environment sesuai target
- [ ] Untuk staging/production: callback URL public HTTPS reachable

## 3.3 Affiliate domain
- [ ] Seller affiliate management berjalan
- [ ] Seller commission management berjalan
- [ ] Affiliate dashboard/activity/ledger/settlement read berjalan
- [ ] Ledger canon menyimpan snapshot rule historis
- [ ] Finality event accrual sudah jelas dan konsisten

---

# 4. Frontend readiness

## 4.1 General
- [ ] App shell/public shell berjalan benar
- [ ] Theme/design config terpusat terbaca
- [ ] Tidak ada hydrate alert pada smoke normal
- [ ] Route hydrate error terlihat jelas saat gagal
- [ ] Snapshot/working/runtime cleanup tidak menimbulkan bug jelas

## 4.2 Role readiness
- [ ] Public flow usable
- [ ] Buyer flow usable
- [ ] Seller flow usable
- [ ] Admin flow usable
- [ ] Affiliate flow usable

## 4.3 UX baseline
- [ ] Loading state wajar
- [ ] Empty state jelas
- [ ] Error state cukup jelas untuk operasional/UAT
- [ ] Mobile-first layout tetap usable
- [ ] Navigasi antar role tidak salah arah

---

# 5. Data readiness

## 5.1 Data minimum
- [ ] Buyer test account tersedia
- [ ] Seller test account tersedia
- [ ] Admin test account tersedia
- [ ] Affiliate test account tersedia
- [ ] Seller punya showroom
- [ ] Seller punya mobil published
- [ ] Seller punya affiliate
- [ ] Seller punya commission rule
- [ ] Ada data transaksi untuk monitoring/admin/affiliate bila diperlukan

## 5.2 Data UAT
- [ ] Slug affiliate uji tersedia
- [ ] Car ID uji tersedia
- [ ] Settlement batch uji / runbook tersedia
- [ ] Pending approval uji tersedia bila approval akan diuji

---

# 6. UAT execution readiness

## 6.1 Dokumen
- [ ] `UAT_CHECKLIST.md` sudah tersedia
- [ ] `OPERATIONS_RUNBOOK.md` sudah tersedia
- [ ] `RUNBOOK_SETTLEMENT_BASELINE.md` sudah tersedia
- [ ] `AFFILIATE_FINANCE_CANON.md` sudah tersedia
- [ ] `KNOWN_LIMITATIONS.md` sudah tersedia

## 6.2 Jalur uji
- [ ] Public -> buyer transaction path siap diuji
- [ ] Seller management path siap diuji
- [ ] Admin impersonation siap diuji
- [ ] Affiliate landing -> transaction -> ledger siap diuji
- [ ] Settlement baseline path siap diuji

## 6.3 Bukti UAT
- [ ] Template pencatatan issue UAT tersedia
- [ ] Screenshot/log/ID transaksi disiapkan bila perlu
- [ ] Macro/skrip bantu UAT tersedia bila dipakai

---

# 7. Operasional & runbook

- [ ] Runbook apply SQL patch tersedia
- [ ] Runbook create settlement batch manual tersedia
- [ ] Runbook update settlement status tersedia
- [ ] Runbook rollback dasar tersedia
- [ ] PIC operasional tahu jalur settlement baseline masih manual
- [ ] Limitasi yang masih ada sudah dikomunikasikan

---

# 8. Security & access

- [ ] Role guard frontend bekerja
- [ ] Policy backend role/domain bekerja
- [ ] Admin impersonation sudah diuji
- [ ] Stop impersonation kembali normal
- [ ] Affiliate/admin/seller route tidak bocor lintas role
- [ ] Credential test tidak akan terbawa ke production docs/log secara sembarangan

---

# 9. Known limitations acknowledged

- [ ] Tim sudah membaca `KNOWN_LIMITATIONS.md`
- [ ] Limitasi yang relevan untuk release ini dipahami
- [ ] Tidak ada limitasi kritis yang disalahpahami sebagai “fitur siap penuh”
- [ ] Area baseline/manual sudah dikomunikasikan (mis. settlement create batch manual)

---

# 10. Go / No-Go

## Ringkasan blocker
- P0 blocker:
- P1 issue terbuka:
- P2/P3 yang diterima untuk rilis:

## Keputusan
- [ ] GO
- [ ] GO dengan catatan
- [ ] NO-GO

## Catatan keputusan
- Alasan:
- Syarat sebelum promote:
- Owner tindak lanjut:
- Target tanggal:
