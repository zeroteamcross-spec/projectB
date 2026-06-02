# AFFILIATE_FINANCE_CANON.md

## Tujuan
Dokumen ini menjelaskan source of truth canon untuk domain affiliate finance di `projectB`.

Dokumen ini harus menjadi acuan saat:
- mengembangkan fitur affiliate baru
- mengubah attribution
- mengubah commission rules
- mengubah ledger
- mengembangkan payout/settlement berikutnya
- menulis prompt Codex lanjutan

---

## Prinsip Inti

### 1. Click bukan dasar komisi
Click/activity hanya telemetry pendukung.

Yang dihitung utama adalah:
- transaksi yang sah
- rule komisi seller yang berlaku
- ledger accrual canon
- settlement baseline

### 2. Attribution harus canon di transaksi
Attribution affiliate tidak boleh bergantung pada:
- session frontend
- slug URL yang kebetulan aktif
- inferensi dari activity log

Source of truth attribution adalah data transaksi canon.

### 3. Rule komisi ditentukan seller
Seller/showroom adalah pemilik aturan komisi untuk affiliate yang berada di bawah seller tersebut.

### 4. Ledger adalah source utama hasil bisnis affiliate
Dashboard affiliate, page ledger, dan settlement harus membaca sumber canon yang sama, bukan angka manual yang berbeda-beda.

---

# 1. Domain Objects

## 1.1 Affiliate
Affiliate adalah entitas milik seller.

Aturan:
- satu affiliate milik satu seller
- slug affiliate unik global
- landing affiliate memakai route final:
  - `#/af/:affiliateSlug`
- WhatsApp pada affiliate landing mengarah ke nomor affiliate

## 1.2 Affiliate Public Context
Public affiliate context adalah variant dari public landing utama.

Context ini memengaruhi:
- katalog seller yang tampil
- CTA WhatsApp
- detail mobil
- transaction entry
- attribution frontend sebelum masuk backend canon

Context ini bersifat session-aware, tetapi **bukan source of truth akhir** untuk komisi.

## 1.3 Commission Rule
Commission rule dimiliki seller.

Model minimal:
- `global rule`
- `per-car override`

Rule:
- jika ada override aktif pada mobil tertentu, override menang atas global
- jika override tidak ada, pakai global aktif
- jika tidak ada keduanya, maka tidak ada komisi

## 1.4 Transaction Attribution
Transaction attribution adalah pengikatan resmi antara transaksi dan affiliate.

Source canon minimal di transaksi:
- `affiliate_id`
- `affiliate_referral_code_snapshot`

Frontend boleh membawa `affiliate_referral_code`, tetapi backend yang wajib:
- resolve
- validasi
- simpan canon di transaksi

## 1.5 Affiliate Ledger
Affiliate ledger adalah catatan accrual komisi yang sudah canon.

Ledger harus lahir dari:
- transaksi yang valid
- attribution canon yang valid
- rule komisi seller yang efektif
- finality event yang eksplisit

## 1.6 Settlement Batch
Settlement baseline memakai model batch.

Settlement bukan sumber komisi baru. Settlement hanya mengelola lifecycle pembayaran atas ledger yang sudah canon.

---

# 2. Canonical Flow End-to-End

## Langkah 1 — Public affiliate landing
User masuk lewat:
- `#/af/:slug`

Frontend:
- resolve slug ke affiliate context
- persist selama sesi
- pakai context untuk catalog/detail/CTA

## Langkah 2 — Transaction entry
Saat user mulai transaksi dari context affiliate:
- frontend mengirim `affiliate_referral_code` ke backend

## Langkah 3 — Transaction canon
Backend:
- validasi affiliate aktif
- validasi affiliate milik seller yang sama dengan mobil transaksi
- simpan di transaksi:
  - `affiliate_id`
  - `affiliate_referral_code_snapshot`

Mulai titik ini, attribution affiliate sudah canon.

## Langkah 4 — Finality event
Saat transaksi mencapai status final yang dipilih:
- `paid`

maka sistem boleh membuat accrual affiliate.

## Langkah 5 — Resolve effective commission rule
Backend harus menentukan rule efektif:
1. cek override aktif untuk `car_id`
2. jika tidak ada, cek global aktif
3. jika tidak ada, tidak ada accrual

## Langkah 6 — Compute commission
Jika `commission_type = percentage`:
- `commission_amount = base_amount * percent / 100`

Jika `commission_type = fixed`:
- `commission_amount = fixed value`

## Langkah 7 — Create ledger accrual
Ledger dibuat otomatis dan idempotent.

Idempotent artinya:
- transaksi yang sama tidak boleh membuat duplicate accrual

## Langkah 8 — Dashboard / Ledger display
Frontend affiliate membaca ledger canon dan aggregate ledger canon yang sama.

## Langkah 9 — Settlement baseline
Ledger berstatus:
- `accrued` -> eligible
- batch create -> `pending`
- batch settled -> `paid_out`
- batch cancelled -> kembali `accrued`

Settlement batch menyimpan history status, actor admin, payment reference/method/note bila diisi, dan daftar ledger item sebagai snapshot audit.

---

# 3. Canonical Data Requirements

## 3.1 Transaction attribution fields
Minimal harus ada:
- `affiliate_id`
- `affiliate_referral_code_snapshot`

## 3.2 Affiliate commission rule fields
Minimal harus ada:
- `seller_user_id`
- `showroom_id` bila relevan
- `car_id` nullable
- `commission_type`
- `commission_value`
- `status/is_active`

## 3.3 Affiliate ledger historical snapshot
Ledger minimal harus menyimpan:
- `affiliate_id`
- `transaction_id`
- `seller_user_id`
- `showroom_id`
- `rule_source`
- `commission_type`
- `commission_value_snapshot`
- `base_amount`
- `commission_amount`
- `ledger_status`
- `finality_event`
- `created_at`
- `updated_at`

Jika field `amount` lama masih dipertahankan untuk kompatibilitas, itu boleh, tetapi source yang dipakai secara bisnis harus jelas.

## 3.4 Settlement baseline fields
Batch minimal:
- `settlement_batch_id`
- `affiliate_id`
- `affiliate_user_id`
- `settlement_code`
- `status`
- `total_amount`
- `currency`
- `payment_method`
- `payment_reference`
- `payment_note`
- `proof_file_url`
- `requested_by`
- `paid_by`
- `cancelled_by`
- `created_at`
- `updated_at`

Settlement item minimal:
- `settlement_batch_id`
- `ledger_id`
- `amount_snapshot`

History minimal:
- `settlement_id`
- `from_status`
- `to_status`
- `note`
- `actor_user_id`
- `created_at`

---

# 4. Business Rules Resmi

## 4.1 Rule priority
- per-car override menang atas global
- global dipakai jika override tidak ada atau tidak aktif

## 4.2 Finality event accrual
Finality event untuk accrual canon adalah:
- `paid`

Alasan:
- paling aman
- menghindari komisi prematur saat baru DP
- lebih audit-friendly untuk payout berikutnya

## 4.3 No rule means no commission
Jika seller tidak punya global rule aktif dan tidak punya override aktif untuk mobil terkait:
- tidak ada accrual ledger

## 4.4 One affiliate per transaction
Satu transaksi hanya boleh punya satu affiliate attribution canon.

## 4.5 Click is not commission
Click log tidak boleh dipakai sebagai dasar perhitungan komisi.

---

# 5. What is Canon vs What is Supporting

## Canon
- transaction attribution
- seller commission rule
- ledger accrual
- settlement status batch/item

## Supporting / telemetry
- click log
- landing URL parsing
- activity list
- source/context inference dari URL

Telemetry boleh membantu monitoring, tetapi tidak boleh mengalahkan source canon.

---

# 6. UI/Frontend Rules

## 6.1 Dashboard affiliate
Dashboard boleh menampilkan:
- profile affiliate
- owner/showroom
- summary click
- summary ledger
- recent ledger
- settlement summary

Tetapi semua angka bisnis utama harus berasal dari ledger canon atau aggregate canon.

## 6.2 Ledger page
Ledger page harus menampilkan data canon jika tersedia:
- rule_source
- commission_type
- commission_value_snapshot
- base_amount
- commission_amount
- ledger_status
- finality_event

Jika field belum ada, UI harus jujur menampilkan fallback, bukan menebak.

## 6.3 Settlement page
Affiliate settlement page saat baseline adalah:
- read-only
- menampilkan eligible/accrued, pending, paid_out, batch list

## 6.4 Public affiliate landing
Landing affiliate:
- reuse landing utama
- tidak membuat desain kedua
- hanya berbeda pada:
  - data seller
  - CTA WhatsApp
  - affiliate context
  - section kecil khusus affiliate bila diperlukan

---

# 7. Audit Rules

Saat audit affiliate finance, pertanyaan utamanya harus selalu:

1. Apakah transaksi ini punya attribution canon?
2. Apakah rule seller yang dipakai memang rule efektif?
3. Apakah accrual dibuat hanya saat finality event yang disepakati?
4. Apakah ledger menyimpan snapshot historis yang cukup?
5. Apakah dashboard dan ledger membaca source canon yang sama?
6. Apakah settlement mengubah ledger status dengan benar?
7. Apakah ada area yang masih inferensi/fallback dan belum canon?

---

# 8. Hal yang Belum Menjadi Canon Penuh

Saat dokumen ini dibuat, area berikut bisa masih baseline:
- create settlement batch UI
- withdrawal request affiliate
- auto-disbursement
- reconciliation finance berat
- affiliate invitation/claim flow final
- analytics affiliate mendalam

Area itu boleh dibangun nanti, tetapi tidak boleh merusak source canon yang sudah ada.

---

# 9. Perubahan yang Tidak Boleh Dilakukan Sembarangan

Jangan ubah sembarangan:
- finality event accrual
- rule priority
- struktur attribution canon
- ledger historical snapshot
- makna status settlement

Kalau salah satu ingin diubah, update dokumen ini dulu dan audit ulang seluruh pipeline.

---

# 10. Definition of Done untuk Domain Affiliate Finance

Domain affiliate finance dianggap cukup matang jika:
- attribution canon tersimpan di transaksi
- rule seller diterapkan otomatis
- ledger accrual otomatis dan idempotent
- ledger menyimpan snapshot historis cukup
- dashboard dan ledger konsisten
- settlement baseline konsisten
- UAT end-to-end lulus:
  - affiliate landing
  - transaction create
  - paid
  - ledger accrual
  - settlement pending
  - settlement paid_out / cancelled
