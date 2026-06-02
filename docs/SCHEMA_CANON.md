
# SCHEMA_CANON.md

## 1. Tujuan

Dokumen ini adalah sumber kebenaran schema data untuk `projectB`.

Aturan utama:
- semua schema baru harus mengikuti dokumen ini
- schema lama di `projectA` hanya digunakan sebagai referensi perilaku
- naming lama yang tidak konsisten **tidak boleh** dibawa mentah ke `projectB`
- semua desain baru harus mengutamakan keterbacaan, konsistensi, dan kemudahan migrasi

---

## 2. Konvensi Umum Schema

### 2.1 Naming
- tabel: `snake_case`
- nama tabel: plural
- kolom: `snake_case`
- primary key: `id`
- foreign key: `<entity>_id`

### 2.2 Timestamp
Gunakan:
- `created_at`
- `updated_at`
- `deleted_at`

### 2.3 Soft delete
Gunakan `deleted_at`, bukan:
- `delete`
- `delete_flag`
- `is_deleted`

### 2.4 Status
Status bisnis wajib pakai string enum yang jelas.

Contoh:
- `draft`
- `published`
- `pending`
- `approved`
- `rejected`
- `pending_payment`
- `dp_paid`
- `paid`
- `expired`
- `cancelled`

### 2.5 Boolean
Gunakan:
- `is_active`
- `is_cover`
- `is_approved`

---

## 3. Tabel Canon

Daftar tabel inti untuk `projectB`:

1. `users`
2. `user_auth_tokens`
3. `showrooms`
4. `cars`
5. `car_images`
6. `inspection_templates`
7. `inspection_reports`
8. `inspection_report_items`
9. `transactions`
10. `transaction_payment_logs`
11. `affiliates`
12. `affiliate_click_logs`
13. `affiliate_commission_ledgers`
14. `master_data`
15. `api_versions`
16. `admin_impersonation_sessions`
17. `affiliate_commission_rules`
18. `affiliate_settlement_batches`
19. `affiliate_settlement_items`
20. `transaction_fulfillment_checklist_items`
21. `notifications`
22. `sliders`
23. `affiliate_settlement_histories`

Catatan:
- beberapa tabel adalah hasil normalisasi dari struktur lama
- beberapa tabel ditambahkan untuk memperjelas domain dan mengurangi ambiguitas

---

## 4. Detail Tabel

## 4.1 `users`

Tujuan:
Menyimpan data akun utama untuk semua role.

Field:
- `id` bigint unsigned, PK, auto increment
- `role` enum(`seller`, `buyer`, `affiliate_admin`, `admin`) not null
- `name` varchar(200) not null
- `phone_number` varchar(25) null
- `email` varchar(100) not null unique
- `password_hash` varchar(255) not null
- `address` varchar(512) null
- `account_status` enum(`pending`, `active`, `suspended`) not null default `pending`
- `otp_code` varchar(20) null
- `otp_expires_at` datetime null
- `security_key` text null
- `is_approved` tinyint(1) not null default 0
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Catatan:
- data showroom dipisahkan dari tabel ini
- `otp_code` dan `security_key` masih dipertahankan untuk kompatibilitas perilaku, tetapi secara domain bisa dipisah lagi nanti

---

## 4.2 `showrooms`

Tujuan:
Menyimpan profil showroom milik seller.

Field:
- `id` bigint unsigned, PK, auto increment
- `user_id` bigint unsigned, FK -> `users.id`, unique
- `name` varchar(225) not null
- `address` varchar(512) null
- `phone_number` varchar(25) null
- `bank_account_number` varchar(50) null
- `bank_type` varchar(100) null
- `bank_account_name` varchar(225) null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Catatan:
- seller memiliki paling banyak satu showroom pada desain awal

---

## 4.3 `user_auth_tokens`

Tujuan:
Menyimpan token remember-me / autologin.

Field:
- `id` bigint unsigned, PK, auto increment
- `user_id` bigint unsigned, FK -> `users.id`
- `selector` char(12) not null unique
- `hashed_validator` longtext not null
- `expires_at` datetime not null
- `last_used_at` datetime null
- `created_at` datetime not null
- `updated_at` datetime null
- `revoked_at` datetime null

Index:
- index on `user_id`
- index on `expires_at`

---

## 4.4 `cars`

Tujuan:
Menyimpan master listing mobil.

Field:
- `id` bigint unsigned, PK, auto increment
- `seller_user_id` bigint unsigned, FK -> `users.id`
- `showroom_id` bigint unsigned, FK -> `showrooms.id`, null
- `listing_status` enum(`draft`, `published`, `reserved`, `sold`, `archived`) not null default `draft`
- `stock` int not null default 1
- `license_plate_number` varchar(100) null
- `brand_name` varchar(100) not null
- `model_name` varchar(100) not null
- `sub_model_name` varchar(100) null
- `primary_color` varchar(50) null
- `secondary_color` varchar(50) null
- `color_variation` varchar(50) null
- `document_type` enum(`new`, `old`) null
- `registration_date` date null
- `transmission` varchar(50) null
- `engine_number` varchar(100) null
- `chassis_number` varchar(100) null
- `location_name` varchar(225) null
- `engine_capacity_cc` int null
- `mileage_km` int null
- `seat_count` int null
- `previous_owner_count` int null
- `has_service_book` tinyint(1) not null default 0
- `key_count` int not null default 1
- `description` text null
- `price_cash` bigint null
- `price_discount` bigint null
- `price_credit` bigint null
- `inspection_summary_status` enum(`not_checked`, `partial`, `completed`) not null default `not_checked`
- `published_at` datetime null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- index on `seller_user_id`
- index on `showroom_id`
- index on `listing_status`
- index on `brand_name`
- index on `model_name`

Catatan:
- `brand_name` dan `model_name` masih disimpan sebagai string agar migrasi lebih ringan
- bila master brand-model sudah stabil, bisa dinormalisasi di fase lanjutan

---

## 4.5 `car_images`

Tujuan:
Menyimpan file gambar mobil.

Field:
- `id` bigint unsigned, PK, auto increment
- `car_id` bigint unsigned, FK -> `cars.id`
- `user_id` bigint unsigned, FK -> `users.id`
- `file_path` text not null
- `file_name` varchar(255) null
- `file_size` bigint null
- `mime_type` varchar(100) null
- `sort_order` int not null default 0
- `is_cover` tinyint(1) not null default 0
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- index on `car_id`
- index on `user_id`
- index on `is_cover`

---

## 4.6 `inspection_templates`

Tujuan:
Master item inspeksi paten/canon. Tabel ini adalah source of truth inspection, bukan template fleksibel milik seller.
Seller/showroom tidak boleh membuat atau mengubah item dari flow seller; seller hanya memilih kondisi dan mengisi catatan hasil inspeksi.
Admin mengelola definisi canon ini dari halaman `#/admin/master-inspection`, yang berada sebagai child di grup sidebar `Master`.

Field:
- `id` bigint unsigned, PK, auto increment
- `category_name` varchar(100) not null
- `item_name` varchar(200) not null
- `description` text null
- `sort_order` int not null default 0
- `is_active` tinyint(1) not null default 1
- `created_at` datetime not null
- `updated_at` datetime null

Index:
- index on `category_name`
- index on `is_active`

---

## 4.7 `inspection_reports`

Tujuan:
Header laporan inspeksi untuk satu mobil.

Field:
- `id` bigint unsigned, PK, auto increment
- `car_id` bigint unsigned, FK -> `cars.id`
- `inspector_user_id` bigint unsigned, FK -> `users.id`
- `report_status` enum(`draft`, `completed`, `published`) not null default `draft`
- `summary_notes` text null
- `inspected_at` datetime null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- index on `car_id`
- index on `inspector_user_id`
- index on `report_status`

---

## 4.8 `inspection_report_items`

Tujuan:
Detail hasil inspeksi per item.

Field:
- `id` bigint unsigned, PK, auto increment
- `inspection_report_id` bigint unsigned, FK -> `inspection_reports.id`
- `template_id` bigint unsigned, FK -> `inspection_templates.id`
- `item_name_snapshot` varchar(200) not null
- `result_status` enum(`good`, `fair`, `bad`, `not_available`) not null
- `description` text null
- `notes` text null
- `created_at` datetime not null
- `updated_at` datetime null

Index:
- index on `inspection_report_id`
- index on `template_id`

Catatan:
- `template_id` merujuk ke master inspection canon pada `inspection_templates`
- `item_name_snapshot` dan `description` menyimpan snapshot master saat report dibuat/disimpan
- seller hanya mengisi `result_status` dan `notes`
- snapshot nama item disimpan untuk menjaga histori bila master inspection berubah

---

## 4.9 `transactions`

Tujuan:
Menyimpan transaksi pembelian kendaraan.

Field:
- `id` bigint unsigned, PK, auto increment
- `transaction_code` varchar(100) not null unique
- `buyer_user_id` bigint unsigned, FK -> `users.id`
- `seller_user_id` bigint unsigned, FK -> `users.id`
- `car_id` bigint unsigned, FK -> `cars.id`
- `affiliate_id` bigint unsigned, FK -> `affiliates.id`, null
- `affiliate_referral_code_snapshot` varchar(50) null
- `car_price` bigint not null
- `payment_type` enum(`dp`, `full`) not null
- `dp_amount` bigint null
- `remaining_amount` bigint null
- `transaction_status` enum(`pending_payment`, `dp_paid`, `paid`, `completed`, `expired`, `cancelled`) not null default `pending_payment`
- `midtrans_order_id` varchar(100) null
- `midtrans_token` varchar(200) null
- `midtrans_redirect_url` varchar(300) null
- `expires_at` datetime null
- `paid_at` datetime null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- unique on `transaction_code`
- index on `buyer_user_id`
- index on `seller_user_id`
- index on `car_id`
- index on `affiliate_id`
- index on `transaction_status`
- index on `midtrans_order_id`

Catatan penting:
- ini menggantikan struktur lama yang ambigu pada `id_transaksi`
- PK dan kode transaksi dipisahkan secara tegas

---

## 4.10 `transaction_payment_logs`

Tujuan:
Menyimpan log pembayaran dan callback provider.

Field:
- `id` bigint unsigned, PK, auto increment
- `transaction_id` bigint unsigned, FK -> `transactions.id`
- `provider_name` varchar(50) not null default `midtrans`
- `provider_order_id` varchar(100) null
- `provider_transaction_id` varchar(100) null
- `payment_method` varchar(50) null
- `transaction_status` varchar(50) null
- `gross_amount` bigint null
- `payload_request_json` longtext null
- `payload_response_json` longtext null
- `payload_callback_json` longtext null
- `logged_at` datetime not null
- `created_at` datetime not null

Index:
- index on `transaction_id`
- index on `provider_order_id`

---

## 4.11 `affiliates`

Tujuan:
Menyimpan pengaturan affiliate dan referral.

Field:
- `id` bigint unsigned, PK, auto increment
- `user_id` bigint unsigned, FK -> `users.id`
- `seller_user_id` bigint unsigned, FK -> `users.id`
- `referral_code` varchar(50) not null unique
- `commission_type` enum(`percent`, `flat`) not null
- `commission_percent` decimal(5,2) not null default 0.00
- `commission_flat` decimal(15,2) not null default 0.00
- `total_clicks` int not null default 0
- `total_transactions` int not null default 0
- `total_commission` decimal(15,2) not null default 0.00
- `status` enum(`active`, `inactive`) not null default `active`
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- unique on `referral_code`
- index on `user_id`
- index on `seller_user_id`

---

## 4.12 `affiliate_click_logs`

Tujuan:
Mencatat event klik referral.

Field:
- `id` bigint unsigned, PK, auto increment
- `affiliate_id` bigint unsigned, FK -> `affiliates.id`
- `clicked_at` datetime not null
- `ip_address` varchar(50) null
- `user_agent` text null
- `landing_url` text null
- `created_at` datetime not null

Index:
- index on `affiliate_id`
- index on `clicked_at`

---

## 4.13 `affiliate_commission_ledgers`

Tujuan:
Mencatat mutasi komisi affiliate.

Field:
- `id` bigint unsigned, PK, auto increment
- `affiliate_id` bigint unsigned, FK -> `affiliates.id`
- `affiliate_user_id` bigint unsigned, FK -> `users.id`, null
- `transaction_id` bigint unsigned, FK -> `transactions.id`, null
- `seller_user_id` bigint unsigned, FK -> `users.id`, null
- `showroom_id` bigint unsigned, FK -> `showrooms.id`, null
- `buyer_user_id` bigint unsigned, FK -> `users.id`, null
- `source_type` varchar(80) null
- `source_id` varchar(120) null
- `entry_type` enum(`accrual`, `adjustment`, `payout`) not null
- `rule_source` enum(`global`, `car_override`) null
- `commission_type` enum(`percent`, `flat`) null
- `commission_value_snapshot` decimal(15,2) null
- `base_amount` decimal(15,2) null
- `commission_amount` decimal(15,2) not null
- `amount` decimal(15,2) not null
- `currency` char(3) not null default `IDR`
- `ledger_status` enum(`pending`, `accrued`, `paid_out`, `voided`) null
- `status_reason` varchar(255) null
- `settlement_id` bigint unsigned, FK -> `affiliate_settlement_batches.id`, null
- `finality_event` enum(`paid`) null
- `accrued_at` datetime null
- `pending_at` datetime null
- `paid_out_at` datetime null
- `voided_at` datetime null
- `notes` text null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- index on `affiliate_id`
- index on `transaction_id`
- index on `seller_user_id`
- index on `showroom_id`
- index on `ledger_status`
- unique on (`transaction_id`, `affiliate_id`, `source_type`, `source_id`)

Catatan:
- `amount` dipertahankan untuk kompatibilitas ringan, dan pada accrual canon nilainya harus sama dengan `commission_amount`
- snapshot historis rule wajib disimpan di ledger agar payout/settlement nanti tidak bergantung pada rule aktif saat ini

---

## 4.14 `master_data`

Tujuan:
Menyimpan master dinamis berbasis JSON yang tidak cocok dinormalisasi saat ini.

Field:
- `id` bigint unsigned, PK, auto increment
- `master_key` varchar(100) not null
- `data_json` json not null
- `api_version_id` bigint unsigned, FK -> `api_versions.id`, null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- index on `master_key`
- index on `api_version_id`

Catatan:
- gunakan hanya untuk data referensi dinamis
- jangan gunakan untuk transaksi inti

---

## 4.15 `api_versions`

Tujuan:
Menyimpan versi data referensi/API sinkronisasi.

Field:
- `id` bigint unsigned, PK, auto increment
- `resource_name` varchar(100) not null
- `display_name` varchar(100) null
- `version_number` int not null default 1
- `created_at` datetime not null
- `updated_at` datetime null

Index:
- unique on (`resource_name`)

---

## 4.16 `admin_impersonation_sessions`

Tujuan:
Menyimpan sesi act-as-user untuk admin tanpa menghilangkan jejak admin asli.

Field:
- `id` bigint unsigned, PK, auto increment
- `admin_user_id` bigint unsigned, FK -> `users.id`
- `target_user_id` bigint unsigned, FK -> `users.id`
- `selector` char(12) not null unique
- `hashed_validator` longtext not null
- `started_at` datetime not null
- `expires_at` datetime not null
- `last_used_at` datetime null
- `ended_at` datetime null
- `ended_reason` varchar(50) null
- `created_at` datetime not null
- `updated_at` datetime null

Index:
- unique on `selector`
- index on `admin_user_id`
- index on `target_user_id`
- index on `expires_at`

Catatan:
- tabel ini terpisah dari `user_auth_tokens`
- remember-token admin asli tetap dipertahankan
- sesi impersonation hanya aktif bila admin asli masih terautentikasi

---

## 4.17 `affiliate_commission_rules`

Tujuan:
Menyimpan rule komisi affiliate milik seller, baik rule global maupun override per mobil.

Field:
- `id` bigint unsigned, PK, auto increment
- `seller_user_id` bigint unsigned, FK -> `users.id`
- `car_id` bigint unsigned, FK -> `cars.id`, null
- `commission_type` enum(`percent`, `flat`) not null
- `commission_percent` decimal(5,2) not null default 0.00
- `commission_flat` decimal(15,2) not null default 0.00
- `status` enum(`active`, `inactive`) not null default `active`
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- index on `seller_user_id`
- index on `car_id`
- index on `status`

Catatan:
- `car_id = null` berarti global rule untuk seluruh mobil seller
- `car_id != null` berarti override untuk mobil tertentu
- override per mobil harus menang atas global rule saat rule efektif dihitung

---

## 4.18 `affiliate_settlement_batches`

Tujuan:
Menyimpan batch payout/settlement manual sebagai baseline operasional.

Field:
- `id` bigint unsigned, PK, auto increment
- `settlement_code` varchar(100) unique null
- `affiliate_id` bigint unsigned, FK -> `affiliates.id`
- `affiliate_user_id` bigint unsigned, FK -> `users.id`, null
- `requested_amount` decimal(15,2) not null
- `currency` char(3) not null default `IDR`
- `ledger_count` int not null default 0
- `status` enum(`pending`, `settled`, `cancelled`) not null default `pending`
- `payment_method` varchar(80) null
- `payment_reference` varchar(160) null
- `payment_note` text null
- `proof_file_url` text null
- `period_start` date null
- `period_end` date null
- `requested_by` bigint unsigned, FK -> `users.id`, null
- `approved_by` bigint unsigned, FK -> `users.id`, null
- `paid_by` bigint unsigned, FK -> `users.id`, null
- `cancelled_by` bigint unsigned, FK -> `users.id`, null
- `notes` text null
- `requested_at` datetime not null
- `settled_at` datetime null
- `cancelled_at` datetime null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- index on `affiliate_id`
- index on `status`
- index on `requested_at`

Catatan:
- batch ini tidak melakukan transfer bank otomatis
- batch hanya menjadi catatan operasional bahwa sekumpulan ledger sedang diproses atau sudah dibayar

---

## 4.19 `affiliate_settlement_items`

Tujuan:
Menghubungkan ledger accrual ke batch settlement tertentu.

Field:
- `id` bigint unsigned, PK, auto increment
- `settlement_batch_id` bigint unsigned, FK -> `affiliate_settlement_batches.id`
- `ledger_id` bigint unsigned, FK -> `affiliate_commission_ledgers.id`
- `amount_snapshot` decimal(15,2) not null
- `created_at` datetime not null

Index:
- index on `settlement_batch_id`
- unique on `ledger_id`

Catatan:
- satu ledger accrual hanya boleh masuk satu batch settlement
- snapshot nominal disimpan agar audit settlement tidak berubah walau ledger utama nanti ikut berkembang

---

## 4.20 `transaction_fulfillment_checklist_items`

Tujuan:
Menyimpan checklist fulfillment transaksi setelah pembayaran lunas. Seller mengelola checklist ini, buyer melihat progres dan hanya buyer yang dapat menandai transaksi `completed` setelah semua item wajib selesai.

Field:
- `id` bigint unsigned, PK, auto increment
- `transaction_id` bigint unsigned, FK -> `transactions.id`
- `checklist_key` varchar(80) not null
- `label` varchar(200) not null
- `is_required` tinyint(1) not null default 1
- `is_completed` tinyint(1) not null default 0
- `completed_at` datetime null
- `completed_by_user_id` bigint unsigned, FK -> `users.id`, null
- `notes` varchar(500) null
- `sort_order` int not null default 0
- `created_at` datetime not null
- `updated_at` datetime null

Index:
- unique on (`transaction_id`, `checklist_key`)
- index on `transaction_id`
- index on `is_completed`

Catatan:
- item default dibuat oleh service transaksi agar checklist konsisten lintas seller/buyer.
- status `completed` hanya boleh ditandai buyer setelah semua item wajib selesai.
- settlement tetap mengikuti runbook; `completed` belum otomatis berarti payout selesai.

---

## 4.21 `notifications`

Tujuan:
Menyimpan inbox notifikasi per user untuk preload snapshot, popover global, dan halaman daftar notifikasi penuh.

Field:
- `id` bigint unsigned, PK, auto increment
- `user_id` bigint unsigned, FK -> `users.id`
- `role` enum(`seller`, `buyer`, `affiliate_admin`, `admin`) not null
- `type` varchar(80) not null
- `title` varchar(160) not null
- `body` varchar(600) not null
- `data_json` longtext null
- `link_url` varchar(300) null
- `icon_key` varchar(60) null
- `priority` enum(`low`, `normal`, `high`) not null default `normal`
- `source_type` varchar(80) null
- `source_id` varchar(120) null
- `actor_user_id` bigint unsigned, FK -> `users.id`, null
- `is_read` tinyint(1) not null default 0
- `read_at` datetime null
- `expires_at` datetime null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- index on (`user_id`, `role`, `created_at`, `id`)
- index on (`user_id`, `role`, `is_read`)
- index on `type`
- index on (`source_type`, `source_id`)
- index on `actor_user_id`
- unique on (`user_id`, `role`, `type`, `source_type`, `source_id`) for event idempotency

Catatan:
- endpoint notifikasi user normal wajib scope ke `user_id` dan `role` dari auth context, bukan dari input client.
- role affiliate mengikuti canon user role yaitu `affiliate_admin`, bukan label UI `affiliate`.
- `data_json` disimpan sebagai longtext JSON agar konsisten dengan payload log existing dan tetap kompatibel dengan environment MySQL/MariaDB yang belum seragam.
- `source_type` dan `source_id` dipakai untuk idempotency event trigger. Event notification wajib mengisi keduanya agar unique index mencegah duplicate pada retry/webhook paralel.

---

## 4.22 `sliders`

Tujuan:
Menyimpan konten banner/slider yang dikelola admin dan ditampilkan pada public catalog hero atau buyer dashboard hero berdasarkan `position_key`.

Field:
- `id` bigint unsigned, PK, auto increment
- `code` varchar(80) not null unique
- `title` varchar(180) not null
- `subtitle` varchar(220) null
- `body_text` text null
- `html_content` text null
- `image_url` text null
- `image_alt` varchar(180) null
- `cta_text` varchar(80) null
- `cta_url` varchar(300) null
- `position_key` varchar(80) not null default `landing_hero`
- `template_key` varchar(80) not null default `elegant_gradient`
- `animation_key` varchar(40) not null default `fade`
- `sort_order` int not null default 0
- `is_active` tinyint(1) not null default 1
- `start_at` datetime null
- `end_at` datetime null
- `created_by` bigint unsigned, FK -> `users.id`, null
- `updated_by` bigint unsigned, FK -> `users.id`, null
- `created_at` datetime not null
- `updated_at` datetime null
- `deleted_at` datetime null

Index:
- unique on `code`
- index on (`position_key`, `is_active`, `sort_order`)
- index on `template_key`
- index on (`start_at`, `end_at`)
- index on `created_by`
- index on `updated_by`

Enum-like values:
- `position_key`: `landing_hero`, `buyer_home`, `public_home`
- `template_key`: `elegant_gradient`, `glassmorphism`, `minimal_product`, `full_image`
- `animation_key`: `fade`, `slide`, `zoom`, `rise`, `none`

Catatan:
- `html_content` tidak menerima HTML custom dari admin pada MVP. Tampilan HTML berasal dari template predefined frontend berdasarkan `template_key`.
- Endpoint publik hanya mengembalikan slider aktif, belum soft-deleted, dan lolos jadwal tampil.
- `start_at` dan `end_at` null diperlakukan sebagai open-ended schedule.

---

## 4.23 `affiliate_settlement_histories`

Tujuan:
Mencatat history status batch settlement affiliate untuk audit finance baseline.

Field:
- `id` bigint unsigned, PK, auto increment
- `settlement_id` bigint unsigned, FK -> `affiliate_settlement_batches.id`
- `from_status` varchar(30) null
- `to_status` varchar(30) not null
- `note` text null
- `actor_user_id` bigint unsigned, FK -> `users.id`, null
- `created_at` datetime not null

Index:
- index on `settlement_id`
- index on `actor_user_id`

Catatan:
- history dibuat saat create settlement, settle, dan cancel.
- settlement `cancelled` mengembalikan ledger ke `accrued`, bukan `voided`.

---

## 5. Mapping dari Struktur Lama ke Canon Baru

### 5.1 `Users` lama
Mapping:
- `nama` -> `name`
- `nomor_wa` -> `phone_number`
- `password` -> `password_hash`
- `status` -> `account_status` atau `is_approved` sesuai konteks
- `sskey` -> `security_key`

Dipisah ke tabel baru:
- `nama_showroom` -> `showrooms.name`
- `alamat_showroom` -> `showrooms.address`
- `tlp_showroom` -> `showrooms.phone_number`
- `no_rekening` -> `showrooms.bank_account_number`
- `type_bank` -> `showrooms.bank_type`
- `pemilik_rekening` -> `showrooms.bank_account_name`

---

### 5.2 `AuthToken` lama
Mapping:
- `user_id` -> `user_id`
- `selector` -> `selector`
- `hashed_validator` -> `hashed_validator`
- `expires` -> `expires_at`

---

### 5.3 `Cars` lama
Mapping:
- `id_users` -> `seller_user_id`
- `status` -> `listing_status`
- `stok` -> `stock`
- `nomor_polisi` -> `license_plate_number`
- `merek` -> `brand_name`
- `model` -> `model_name`
- `sub_model` -> `sub_model_name`
- `warna_dasar` -> `primary_color`
- `warna` -> `secondary_color`
- `variasi_warna` -> `color_variation`
- `stnk_bpkb` -> `document_type`
- `tanggal_registrasi` -> `registration_date`
- `nomor_mesin` -> `engine_number`
- `nomor_rangka` -> `chassis_number`
- `lokasi` -> `location_name`
- `kapasitas_mesin` -> `engine_capacity_cc`
- `jarak_tempuh_km` -> `mileage_km`
- `jumlah_kursi` -> `seat_count`
- `jumlah_pemilik_sebelum` -> `previous_owner_count`
- `buku_servis` -> `has_service_book` (perlu transformasi)
- `jumlah_kunci` -> `key_count`
- `deskripsi` -> `description`
- `harga_cash` -> `price_cash`
- `harga_diskon` -> `price_discount`
- `harga_kredit` -> `price_credit`
- `inspeksi` -> `inspection_summary_status` atau dihitung dari laporan inspeksi
- `delete` -> `deleted_at`

---

### 5.4 `image` lama
Mapping:
- `id_users` -> `user_id`
- `id_mobil` -> `car_id`
- `url` -> `file_path`

---

### 5.5 `Inspeksi` lama
Normalisasi:
- `car_id` tetap ke `inspection_reports.car_id`
- `id_users` -> `inspection_reports.inspector_user_id`
- `nama` dan `id_inspeksi` dipetakan ke template/item
- `status` -> `inspection_report_items.result_status`
- `keterangan` -> `inspection_report_items.description`
- `catatan` -> `inspection_report_items.notes`

---

### 5.6 `Transaksi` lama
Normalisasi:
- `id_transaksi` (varchar business id) -> `transaction_code`
- PK numerik -> `id`
- `id_user` -> `buyer_user_id`
- `id_mobil` -> `car_id`
- `harga_mobil` -> `car_price`
- `tipe_pembayaran` -> `payment_type`
- `dp_nominal` -> `dp_amount`
- `sisa_pembayaran` -> `remaining_amount`
- `status_transaksi` -> `transaction_status`
- `midtrans_order_id` -> `midtrans_order_id`
- `midtrans_token` -> `midtrans_token`
- `midtrans_redirect` -> `midtrans_redirect_url`
- `expired_at` -> `expires_at`

Tambahan canon baru:
- `seller_user_id`
- `affiliate_id`
- `affiliate_referral_code_snapshot`
- `updated_at`
- `paid_at`
- `deleted_at`

---

### 5.7 `Affiliator` lama
Mapping:
- `user_id` -> `user_id`
- `id_penjual` -> `seller_user_id`
- `kode_referral` -> `referral_code`
- `tipe_komisi` -> `commission_type`
- `komisi_persen` -> `commission_percent`
- `komisi_flat` -> `commission_flat`
- `total_klik` -> `total_clicks`
- `total_transaksi` -> `total_transactions`
- `total_komisi` -> `total_commission`

---

### 5.8 `Master` lama
Mapping:
- `tabel_master` -> `master_key`
- `data` -> `data_json`
- `id_versiApi` -> `api_version_id`

---

### 5.9 `VersiApi` lama
Mapping:
- `nama_tabel` -> `resource_name`
- `nama` -> `display_name`
- `versi` -> `version_number`

---

## 6. Enum Canon Resmi

### 6.1 User role
- `seller`
- `buyer`
- `affiliate_admin`
- `admin`

### 6.2 Account status
- `pending`
- `active`
- `suspended`

### 6.3 Car listing status
- `draft`
- `published`
- `reserved`
- `sold`
- `archived`

### 6.4 Inspection report status
- `draft`
- `completed`
- `published`

### 6.5 Inspection item result
- `good`
- `fair`
- `bad`
- `not_available`

Label domain UI:
- `good` = Baik
- `fair` = Kurang baik
- `bad` = Tidak baik
- `not_available` = Tidak tersedia

### 6.6 Payment type
- `dp`
- `full`

### 6.7 Transaction status
- `pending_payment`
- `dp_paid`
- `paid`
- `completed`
- `expired`
- `cancelled`

### 6.8 Affiliate status
- `active`
- `inactive`

### 6.9 Commission type
- `percent`
- `flat`

### 6.10 Ledger status
- `pending`
- `accrued`
- `paid_out`
- `voided`

### 6.11 Ledger finality event
- `paid`

### 6.12 Settlement batch status
- `pending`
- `settled`
- `cancelled`

### 6.13 Notification type
- `transaction_paid`
- `transaction_processing`
- `transaction_completed`
- `transaction_new`
- `message_new`
- `offer`
- `listing_approved`
- `listing_rejected`
- `inspection_needed`
- `commission_accrued`
- `settlement_paid`
- `security_alert`
- `system_message`

### 6.14 Notification priority
- `low`
- `normal`
- `high`

### 6.15 Slider position key
- `landing_hero`
- `buyer_home`
- `public_home`

### 6.16 Slider template key
- `elegant_gradient`
- `glassmorphism`
- `minimal_product`
- `full_image`

### 6.17 Slider animation key
- `fade`
- `slide`
- `zoom`
- `rise`
- `none`

---

## 7. Aturan Desain Tambahan

1. Jangan gunakan nama field yang ambigu
2. Jangan definisikan key array ganda dalam schema contract
3. Semua FK harus jelas secara nama dan tujuan
4. Semua soft delete baru menggunakan `deleted_at`
5. Semua tabel transaksi penting harus punya `updated_at`
6. Semua schema baru harus lebih pentingkan kestabilan jangka panjang dibanding kompatibilitas nama lama

---

## 8. Catatan Implementasi

Dokumen ini adalah acuan untuk:
- migration file
- repository design
- request validation
- response serialization
- dokumentasi endpoint

Jika ditemukan perilaku lama yang belum tercover:
- tambahkan catatan pada `MIGRATION_MAP.md`
- evaluasi apakah perlu update pada schema canon
- jangan langsung mengubah schema tanpa dokumentasi keputusan
