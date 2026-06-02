# ENV_SETUP_CHECKLIST

## Tujuan
Dokumen ini dipakai untuk memastikan environment `projectB` disiapkan dengan benar sebelum:
- smoke test
- UAT
- staging validation
- release

Dokumen ini fokus pada:
- source code
- PHP/server
- database
- environment variables
- storage/uploads
- provider/payment
- data awal minimum

---

## Cara pakai
- Tandai:
  - `[ ]` belum
  - `[x]` selesai
  - `N/A` tidak berlaku
- Catat nilai final atau catatan penting di bawah setiap bagian bila perlu

---

# 1. Informasi environment

- Environment name:
- URL frontend:
- URL API:
- Server/local path:
- PIC setup:
- Tanggal setup:

---

# 2. Source code

- [ ] Repository `projectB` sudah tersedia di path yang benar
- [ ] Branch yang dipakai sudah benar
- [ ] Commit/tag target sudah benar
- [ ] Working tree bersih atau status perubahan diketahui
- [ ] File docs utama tersedia:
  - [ ] `ROADMAP_PROJECTB.md`
  - [ ] `UAT_CHECKLIST.md`
  - [ ] `RUNBOOK_SETTLEMENT_BASELINE.md`
  - [ ] `AFFILIATE_FINANCE_CANON.md`
  - [ ] `OPERATIONS_RUNBOOK.md`
  - [ ] `KNOWN_LIMITATIONS.md`

---

# 3. PHP / runtime / web server

- [ ] Versi PHP sesuai kebutuhan project
- [ ] Ekstensi PHP yang dibutuhkan aktif
- [ ] Web server/local server bisa serve `public/app.html`
- [ ] Rewrite/static serving sesuai kebutuhan SPA
- [ ] Timezone server sesuai
- [ ] Error log path diketahui
- [ ] Permission file/folder valid

Catatan:
- local/Herd/domain:
- command server bila relevan:
- log path:

---

# 4. Database

- [ ] Database sudah dibuat
- [ ] User DB / credential valid
- [ ] Koneksi DB berhasil
- [ ] Schema dasar sudah terpasang
- [ ] Seed/data awal minimum tersedia

## Patch SQL wajib
- [ ] `20260419_affiliate_commission_pipeline_hardening.sql`
- [ ] `20260419_affiliate_settlement_baseline.sql`

## Patch lain yang relevan
- [ ] patch affiliate commission rules
- [ ] patch admin impersonation / timestamp bila environment ini membutuhkannya
- [ ] patch lain yang belum terpasang sudah diidentifikasi

Catatan:
- Nama DB:
- Host:
- Port:
- User:
- Applied patches:

---

# 5. Environment variables / config

## Core app
- [ ] APP_ENV / mode environment benar
- [ ] APP_URL / public URL benar
- [ ] API base URL benar
- [ ] Timezone benar
- [ ] Session/cookie domain/path sesuai
- [ ] Auth config valid

## Database
- [ ] DB_HOST benar
- [ ] DB_PORT benar
- [ ] DB_NAME benar
- [ ] DB_USER benar
- [ ] DB_PASSWORD benar

## Payment/provider
- [ ] MIDTRANS server key benar untuk environment
- [ ] MIDTRANS client key benar untuk environment
- [ ] MIDTRANS callback URL benar
- [ ] Callback URL public HTTPS reachable jika environment bukan local murni

## Affiliate / public URL
- [ ] URL public affiliate `#/af/:slug` dapat diakses pada host target
- [ ] Domain/cookie tidak mengganggu session affiliate/buyer/seller/admin

Catatan:
- File config utama:
- Nilai sensitif tidak dibagikan di dokumen ini

---

# 6. Storage / uploads

- [ ] Folder uploads ada
- [ ] Folder images ada
- [ ] Permission write valid
- [ ] File image mobil bisa dibaca dari browser
- [ ] Cleanup/retention behavior dipahami bila relevan

Catatan:
- Upload path:
- Public path:
- Permission note:

---

# 7. Frontend readiness

- [ ] `public/app.html` bisa dibuka
- [ ] Asset JS utama bisa dimuat
- [ ] Route hash SPA bekerja
- [ ] Theme config termuat
- [ ] Tidak ada white screen pada load dasar
- [ ] Hydrate alert tidak muncul pada smoke dasar

## Route sanity
- [ ] `#/`
- [ ] `#/auth`
- [ ] `#/buyer`
- [ ] `#/seller`
- [ ] `#/admin`
- [ ] `#/affiliate`
- [ ] `#/af/{slug}` bila data ada

---

# 8. Role account readiness

## Buyer
- [ ] akun buyer uji tersedia
- [ ] credential valid

## Seller
- [ ] akun seller uji tersedia
- [ ] credential valid
- [ ] showroom seller ada
- [ ] seller punya mobil

## Admin
- [ ] akun admin uji tersedia
- [ ] credential valid

## Affiliate
- [ ] akun affiliate_admin uji tersedia
- [ ] credential valid
- [ ] profile affiliate terkait ada
- [ ] slug affiliate aktif ada

Catatan akun uji:
- buyer:
- seller:
- admin:
- affiliate_admin:

---

# 9. Data bisnis minimum

- [ ] seller punya minimal 1 showroom
- [ ] seller punya minimal beberapa mobil published
- [ ] seller punya minimal 1 affiliate
- [ ] seller punya global commission rule
- [ ] seller punya minimal 1 override per mobil bila ingin uji override
- [ ] ada transaksi sample atau flow siap untuk create transaction nyata
- [ ] ada ledger affiliate bila ingin smoke display
- [ ] ada settlement batch sample atau runbook create batch tersedia

---

# 10. Payment readiness

- [ ] create payment session bisa jalan
- [ ] callback test path dipahami
- [ ] mapping pending -> paid dipahami
- [ ] log payment bisa dicek
- [ ] jika local: strategi callback manual jelas
- [ ] jika staging: callback public HTTPS siap

---

# 11. Affiliate finance readiness

- [ ] attribution affiliate canon aktif di transaksi
- [ ] accrual terjadi pada event `paid`
- [ ] ledger canon terbentuk
- [ ] settlement baseline schema aktif
- [ ] endpoint settlement baseline tersedia
- [ ] runbook create settlement batch manual tersedia

---

# 12. Operasional UAT

- [ ] SQL patch sudah benar-benar di-apply
- [ ] runbook UAT tersedia
- [ ] macro/skrip UAT tersedia bila dipakai
- [ ] browser target UAT ditentukan
- [ ] log/screenshot capture method ditentukan
- [ ] template issue UAT tersedia

---

# 13. Smoke check minimum sebelum UAT

- [ ] buka landing utama berhasil
- [ ] login buyer berhasil
- [ ] login seller berhasil
- [ ] login admin berhasil
- [ ] login affiliate berhasil
- [ ] route admin settlements bisa diakses
- [ ] route affiliate ledger/settlements bisa diakses
- [ ] affiliate landing `#/af/:slug` menampilkan katalog seller

---

# 14. Sign-off setup

## Status setup
- [ ] READY
- [ ] READY WITH NOTES
- [ ] NOT READY

## Catatan
- Blocker:
- Warning:
- Tindak lanjut:
- PIC:
- Target penyelesaian:
