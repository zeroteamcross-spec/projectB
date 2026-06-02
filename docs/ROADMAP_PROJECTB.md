# ProjectB Frontend & Product Roadmap

## Status Dokumen
- Tipe: Roadmap implementasi dan hardening
- Scope: Public, Buyer, Seller, Admin, Affiliate, Finance Baseline, Engineering Maturity
- Target penempatan: `projectB/docs/ROADMAP_PROJECTB.md`
- Fungsi: Menjadi source of truth untuk prioritas pengembangan berikutnya, bahan prompt untuk Codex, dan panduan UAT / hardening

---

# 1. Ringkasan Eksekutif

`projectB` saat ini sudah memiliki fondasi aplikasi yang kuat dan lintas role, meliputi:
- Public landing utama
- Buyer flow
- Seller flow
- Admin flow
- Affiliate flow
- Theme system terpusat
- Role guard lintas role
- Affiliate commission pipeline canon
- Affiliate settlement baseline

Dengan kondisi saat ini, aplikasi **sudah cukup matang untuk UAT besar lintas role**, dengan syarat operasional berikut:
1. SQL patch canon + settlement wajib di-apply ke environment UAT
2. Runbook/create-settlement-batch manual harus disiapkan
3. UAT harus dijalankan end-to-end untuk semua role dan jalur finance affiliate

Roadmap berikut disusun untuk mengarahkan pekerjaan setelah baseline besar ini selesai, agar pengembangan berikutnya:
- tidak merusak arsitektur yang sudah kuat
- tetap konsisten lintas role
- mendahulukan kebutuhan operasional dan stabilitas
- baru kemudian masuk ke pendalaman bisnis dan automation yang lebih berat

---

# 2. Prinsip Utama Pengembangan Lanjutan

Semua pekerjaan lanjutan wajib mengikuti prinsip ini:

## 2.1. Jangan Rusak Arsitektur Inti
Arsitektur yang sudah benar harus dipertahankan:
- Full SPA
- Modular frontend
- Lifecycle page/module:
  - mount
  - hydrate
  - unmount
  - dispose
- Snapshot / working / runtime state discipline
- Shell separation per role
- Theme system terpusat
- Role guard lintas role

## 2.2. Reuse, Jangan Duplikasi
Kalau ada kebutuhan baru:
- cek apakah bisa memakai page/module/component yang sudah ada
- cek apakah bisa jadi variant/context, bukan halaman/desain baru
- cek apakah bisa masuk ke theme layer, bukan hardcode baru

## 2.3. Finance Selalu Audit-Friendly
Semua domain finance affiliate harus:
- punya source of truth yang jelas
- punya event bisnis canon
- punya snapshot historis
- tidak bergantung pada inferensi frontend
- tidak bergantung pada data manual yang sulit diaudit

## 2.4. Operasional Lebih Dulu daripada Automation
Sebelum automation berat:
- pastikan jalur manual operasional ada
- pastikan UI dan runbook jelas
- pastikan UAT bisa dijalankan
- baru sesudah itu automation disiapkan

## 2.5. Jangan Menambah Domain Besar Sekaligus
Domain baru harus masuk bertahap:
1. discovery / audit
2. foundation
3. baseline UI/flow
4. hardening
5. UAT
6. baru pendalaman

---

# 3. Snapshot Status Sistem Saat Ini

## 3.1. Public
Sudah tersedia:
- landing utama
- public catalog
- public car detail
- auth landing netral
- affiliate public landing context `#/af/:slug`

## 3.2. Buyer
Sudah tersedia:
- transaction entry
- auth gate / auth landing
- payment status
- pelunasan dasar

## 3.3. Seller
Sudah tersedia:
- dashboard
- showroom
- mobil saya
- upload gambar
- inspection
- transaksi seller
- affiliate management
- commission management

## 3.4. Admin
Sudah tersedia:
- dashboard
- user management
- approval flow
- impersonation
- transaction monitoring
- settlement path tipis

## 3.5. Affiliate
Sudah tersedia:
- dashboard
- activity / click
- ledger / komisi
- settlement visibility

## 3.6. Cross-role / Foundation
Sudah tersedia:
- theme system terpusat
- auth landing netral
- role guard
- shell separation
- snapshot / working / runtime cleanup
- hydrate error visibility lintas shell

## 3.7. Finance Affiliate
Sudah tersedia:
- seller commission rule:
  - global
  - per-car override
- affiliate attribution canon di transaksi
- commission accrual otomatis saat `paid`
- ledger historis canon
- settlement baseline batch manual

---

# 4. Gap Besar yang Masih Ada

## 4.1. UAT Operasional Nyata
Codebase sudah kuat, tetapi hasil riil tetap bergantung pada:
- SQL patch yang sudah diterapkan
- data UAT yang benar
- eksekusi UAT besar lintas role
- validasi end-to-end di browser

## 4.2. Admin Settlement Create-Batch UI
Saat ini admin settlement sudah punya:
- list batch
- filter
- update status

Tetapi belum punya:
- create batch UI yang nyaman

Akibatnya create batch masih manual lewat endpoint/runbook.

## 4.3. Error Handling Per Page Belum Kaya
Hydrate error sudah lebih terlihat, tetapi masih perlu pendalaman:
- panel error spesifik per page
- retry action yang jelas
- diagnosis yang lebih membantu tester

## 4.4. Affiliate Onboarding Belum Final
Saat ini affiliate account masih memakai fondasi bridge:
- seller create affiliate
- affiliate_admin bisa ada
- dashboard affiliate sudah ada

Tetapi belum ada lifecycle final:
- invitation flow
- claim flow
- aktivasi formal
- ownership onboarding yang lebih rapi

## 4.5. Approval Flow Masih Dasar
Approval admin sudah usable, tetapi belum memiliki:
- reject flow
- hold flow
- reason trail
- audit trail approval

## 4.6. Monitoring Admin Belum Siap Scale Besar
Untuk volume data kecil/menengah saat ini masih aman, tetapi nanti akan butuh:
- pagination
- server-side filtering
- sorting operasional yang lebih kuat

## 4.7. Affiliate Analytics Masih Dangkal
Activity/click sekarang hanya telemetry pendukung.
Belum ada:
- source / device breakdown
- conversion funnel
- campaign analytics
- relationship click -> transaction yang lebih eksplisit

## 4.8. Finance Automation Belum Ada
Belum tersedia:
- withdrawal request
- bank payout workflow
- disbursement automation
- finance reconciliation dashboard

## 4.9. Automation Test / Regression Suite Belum Matang
Masih kurang:
- e2e lintas role
- regression suite domain affiliate
- regression suite settlement
- regression suite impersonation

## 4.10. Runbook Operasional Belum Formal
Masih perlu dokumen operasional:
- create settlement batch
- UAT per role
- validation affiliate accrual
- langkah debug jika attribution mismatch
- langkah cancel batch
- langkah finalisasi batch

---

# 5. Prioritas Roadmap

Roadmap dibagi menjadi 4 tier prioritas:
- **P0** = wajib / blocker readiness
- **P1** = sangat penting setelah P0
- **P2** = pendalaman bisnis/operasional
- **P3** = optimization / future enhancement

---

# 6. P0 — Wajib Sebelum / Saat UAT Besar

## P0.1. Apply Semua SQL Patch Canon
### Tujuan
Memastikan environment UAT memiliki schema yang sama dengan code canon terbaru.

### Wajib di-apply
- `20260419_affiliate_commission_pipeline_hardening.sql`
- `20260419_affiliate_settlement_baseline.sql`
- patch schema relevan sebelumnya jika masih belum applied

### Outcome
- transaksi affiliate bisa menyimpan attribution canon
- ledger canon bisa hidup
- settlement baseline tidak putus runtime

### Definition of Done
- patch berhasil di-apply
- schema diverifikasi
- endpoint finance affiliate tidak error karena missing column/table

## P0.2. Runbook UAT Besar Lintas Role
### Tujuan
Membuat tester / operator punya langkah yang konsisten.

### Isi minimal
- login data UAT per role
- langkah UAT public
- langkah UAT buyer
- langkah UAT seller
- langkah UAT admin
- langkah UAT affiliate
- langkah create settlement batch manual
- data referensi:
  - slug affiliate
  - car_id
  - transaction_id
  - batch id

### Outcome
- UAT tidak tergantung ingatan developer
- tester bisa menjalankan UAT dengan urutan yang benar

### Definition of Done
- runbook tertulis
- bisa dipakai tim lain
- dipakai benar saat UAT

## P0.3. UAT Besar Lintas Role
### Tujuan
Memvalidasi flow utama sistem di browser dan environment nyata.

### Scope
- Public
- Buyer
- Seller
- Admin
- Affiliate
- Affiliate finance baseline

### Fokus khusus
- affiliate attribution
- commission rule -> accrual
- settlement batch -> paid_out / cancelled
- impersonation
- role guard
- hydrate error visibility

### Outcome
- masalah runtime nyata terdeteksi
- bug minor/major bisa dikelompokkan

### Definition of Done
- hasil UAT terdokumentasi
- blocker teridentifikasi
- patch lanjutan diprioritaskan

---

# 7. P1 — Sangat Penting Setelah UAT Besar

## P1.1. Admin Settlement Create-Batch UI
### Kenapa penting
Saat ini admin hanya bisa:
- lihat batch
- update status

Tetapi belum bisa:
- create batch dari UI

### Scope
- halaman/create action tipis
- pilih ledger eligible
- buat batch manual dari UI
- tetap tanpa payout automation

### Outcome
- settlement operasional lebih first-class
- runbook manual jadi lebih pendek

### Definition of Done
- admin bisa create batch tanpa endpoint manual mentah
- ledger yang masuk batch jelas
- status awal batch konsisten

## P1.2. Error Panel Per Page / Retry UX
### Kenapa penting
Saat UAT/debug, empty/loading generik masih terlalu ambigu.

### Scope
- page-level error panel
- retry hydrate action
- copy yang lebih membantu tester

### Outcome
- diagnosis bug lebih cepat
- pengalaman error lintas role lebih rapi

### Definition of Done
- public/buyer/seller/admin/affiliate page penting punya error handling yang lebih jelas
- tester bisa membedakan empty state vs load failure

## P1.3. Regression Test Baseline
### Kenapa penting
Semakin banyak domain, semakin besar risiko regresi.

### Scope minimal
- public landing
- buyer transaction create
- affiliate attribution
- seller commission rule
- affiliate ledger accrual
- settlement status change
- admin impersonation

### Outcome
- perubahan berikutnya lebih aman
- bug lama tidak mudah kembali

### Definition of Done
- ada suite regression awal
- bisa dijalankan berulang di local/UAT

## P1.4. Hardening Operasional Finance Baseline
### Scope
- validasi state transition settlement
- guard tambahan jika ledger tidak eligible
- duplicate handling
- audit log settlement action bila perlu

### Outcome
- finance baseline lebih tahan edge case

### Definition of Done
- jalur batch create/update aman
- state invalid ditolak
- mismatch ledger/batch mudah dideteksi

---

# 8. P2 — Pendalaman Bisnis dan Operasional

## P2.1. Affiliate Onboarding / Invitation Final
### Tujuan
Mengganti bridge model affiliate account menjadi lifecycle yang formal.

### Scope
- seller invite affiliate
- affiliate claim account
- aktivasi affiliate
- status onboarding affiliate
- relasi seller-affiliate yang lebih eksplisit

### Outcome
- akun affiliate tidak lagi “sementara”
- ownership dan lifecycle lebih rapi

### Definition of Done
- affiliate bisa diundang dan claim account
- dashboard affiliate berjalan untuk akun hasil onboarding formal

## P2.2. Approval Flow Admin Lanjutan
### Scope
- reject flow
- hold flow
- reason / notes
- audit trail approval
- filter review state lebih dalam

### Outcome
- approval tidak lagi terlalu sederhana
- operasional admin lebih matang

### Definition of Done
- approval punya state yang lebih kaya
- aksi approval tercatat jelas

## P2.3. Monitoring Admin Scale-Up
### Scope
- pagination
- server-side filtering
- sorting
- query optimasi untuk:
  - users
  - transactions
  - approvals
  - settlements

### Outcome
- admin flow tetap usable saat volume data naik

### Definition of Done
- list operasional tetap cepat dan tidak berat di browser
- result set lebih akurat untuk data besar

## P2.4. Affiliate Analytics Pendalaman
### Scope
- click detail yang lebih kaya
- source/campaign breakdown
- conversion view
- relationship click -> transaction

### Outcome
- affiliate dashboard lebih informatif
- click tidak hanya jadi telemetry kasar

### Definition of Done
- analytics affiliate lebih mudah dibaca
- ada metrik yang relevan tanpa mengaburkan fokus bisnis utama

## P2.5. Finance Status Model yang Lebih Formal
### Scope
- definisi canonical finance status untuk ledger
- definisi finality yang lebih eksplisit
- pending/confirmed/paid_out/reversed formalization

### Outcome
- payout dan reporting lebih kuat

### Definition of Done
- status finance tidak ambigu
- semua UI membaca model yang sama

---

# 9. P3 — Future Enhancement / Optimization

## P3.1. Withdrawal Request oleh Affiliate
### Scope
- affiliate submit withdrawal request
- admin review withdrawal
- relasi ke settlement batch

### Catatan
Jangan dikerjakan sebelum finance baseline sangat stabil.

## P3.2. Bank Account / Payout Method Workflow
### Scope
- payout account affiliate
- payout destination validation
- history payout account changes

## P3.3. Disbursement Automation
### Scope
- automation payout
- provider/bank integration
- webhook/state sync

### Catatan
Ini domain finance berat. Jangan masuk sebelum:
- ledger canon stabil
- settlement batch stabil
- withdrawal model final

## P3.4. Advanced Affiliate Campaign Feature
### Scope
- multi-link campaign
- campaign code
- promo banner affiliate
- campaign attribution

## P3.5. Visual/Theme Final Sweep
### Scope
- hapus sisa hardcoded visual kecil
- sempurnakan theme adoption
- rapikan UI consistency edge case

---

# 10. Roadmap Per Domain

## 10.1. Public Domain
### Sudah ada
- public catalog
- detail mobil
- auth landing
- affiliate landing context

### Berikutnya
- error panel per page
- UAT stabilitas
- optional visual polish kecil

## 10.2. Buyer Domain
### Sudah ada
- transaction entry
- payment status
- pelunasan dasar

### Berikutnya
- regression test
- polish error state
- optional payment UX improvement

## 10.3. Seller Domain
### Sudah ada
- showroom
- cars
- images
- inspection
- transactions
- affiliate management
- commission management

### Berikutnya
- UAT CRUD lebih dalam
- edge-case validation
- optional list scaling

## 10.4. Admin Domain
### Sudah ada
- dashboard
- users
- approvals
- impersonation
- transactions
- settlement path tipis

### Berikutnya
- create settlement batch UI
- approval reason/reject
- admin list pagination/filter upgrade

## 10.5. Affiliate Domain
### Sudah ada
- dashboard
- activity
- ledger
- settlement read-only
- attribution canon

### Berikutnya
- onboarding final
- analytics pendalaman
- withdrawal/payout request model jika diputuskan

---

# 11. Rekomendasi Urutan Eksekusi

## Tahap 1 — Stabilization/UAT
1. Apply SQL patch
2. Siapkan runbook UAT
3. Jalankan UAT besar lintas role
4. Catat blocker dan patch kecil

## Tahap 2 — Operasional Kritis
1. Admin settlement create-batch UI
2. Error panel per page / retry UX
3. Hardening settlement finance baseline

## Tahap 3 — Engineering Maturity
1. Regression test baseline
2. Smoke/e2e lintas role
3. Dokumentasi operasional yang lebih formal

## Tahap 4 — Bisnis Lanjutan
1. Affiliate onboarding/invitation final
2. Approval flow lebih dalam
3. Monitoring admin scale-up
4. Affiliate analytics pendalaman

## Tahap 5 — Finance Lanjutan
1. Finance status model formal
2. Withdrawal request
3. Bank payout workflow
4. Disbursement automation

---

# 12. Prompt Strategy untuk Codex Berikutnya

Prompt berikutnya sebaiknya mengikuti urutan ini:

## 12.1. Setelah UAT besar selesai
- prompt patch blocker hasil UAT
- prompt create settlement batch UI
- prompt page-level error/retry UX

## 12.2. Setelah stabil
- prompt regression/e2e baseline
- prompt admin approval deepening
- prompt affiliate onboarding final

## 12.3. Setelah finance baseline makin kuat
- prompt withdrawal request baseline
- prompt payout method management
- prompt disbursement automation discovery

---

# 13. Daftar Dokumen Tambahan yang Disarankan

Selain roadmap ini, disarankan membuat dokumen berikut di `projectB/docs/`:

1. `UAT_CHECKLIST.md`
   - checklist UAT besar lintas role

2. `RUNBOOK_SETTLEMENT_BASELINE.md`
   - langkah create batch settlement manual
   - langkah finalisasi batch
   - langkah cancel batch

3. `AFFILIATE_FINANCE_CANON.md`
   - aturan attribution
   - finality event
   - rule priority
   - ledger status
   - settlement status

4. `REGRESSION_PLAN.md`
   - daftar regression test yang akan dibangun

5. `ONBOARDING_AFFILIATE_FUTURE.md`
   - rancangan invitation/claim flow final

---

# 14. Definition of Success

Roadmap ini dianggap berhasil jika pada akhirnya `projectB` mencapai kondisi berikut:

## Produk
- semua role utama usable:
  - public
  - buyer
  - seller
  - admin
  - affiliate

## Arsitektur
- tidak ada kebocoran role/shell
- state lifecycle tetap disiplin
- theme system tetap jadi source of truth

## Bisnis
- affiliate attribution dapat diaudit
- commission rule dapat ditelusuri
- ledger dan settlement konsisten

## Operasional
- UAT bisa dijalankan dengan jelas
- tim non-dev bisa mengikuti runbook
- settlement bisa dikelola tanpa “tebak-tebakan”

## Engineering
- regression risk turun
- patch berikutnya tidak lagi merusak fondasi besar

---

# 15. Rekomendasi Final

Prioritas langsung setelah dokumen ini dibuat adalah:
1. **Apply SQL patch di environment UAT**
2. **Jalankan UAT besar lintas role**
3. **Perbaiki blocker hasil UAT**
4. **Bangun admin settlement create-batch UI**
5. **Bangun regression baseline**
6. **Masuk ke affiliate onboarding final dan finance pendalaman**

---

# 16. Catatan Penutup

Dokumen ini harus dibaca sebagai:
- panduan prioritas
- batas scope
- alat bantu prompt Codex
- pengingat bahwa aplikasi ini **sudah kuat secara fondasi**, sehingga pekerjaan selanjutnya harus fokus pada:
  - stabilisasi
  - operasional
  - auditability
  - kedisiplinan arsitektur

Jangan menambah domain besar baru tanpa meninjau roadmap ini terlebih dahulu.
