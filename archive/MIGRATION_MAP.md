# MIGRATION_MAP.md

## 1. Tujuan

Dokumen ini memetakan modul lama pada `projectA` ke modul baru pada `projectB`, beserta strategi migrasi, status, dan risiko.

Prinsip utama:
- pertahankan perilaku bisnis
- jangan copy code mentah kecuali diminta
- semua implementasi baru mengikuti arsitektur `projectB`
- semua schema baru mengikuti `SCHEMA_CANON.md`

---

## 2. Status Migrasi

Gunakan status berikut:

- `not_started`
- `in_analysis`
- `in_progress`
- `stabilized`
- `done`
- `blocked`

---

## 3. Ringkasan Strategi Migrasi

Strategi migrasi resmi:

1. bangun core framework baru
2. pindahkan modul rendah risiko lebih dulu
3. pindahkan modul transaksi setelah core dan modul dasar stabil
4. cocokan output modul baru terhadap perilaku bisnis lama
5. dokumentasikan gap dan keputusan perubahan

---

## 4. Peta Modul

| Modul Baru | Sumber Utama di projectA | Target di projectB | Prioritas | Status | Risiko |
|---|---|---|---:|---|---|
| Core Framework | routing & bootstrap lama tersebar | `app/Core`, `bootstrap`, `routes`, `public/index.php` | 1 | in_progress | Sedang |
| Auth | `api/controllers/UsersController.php`, `api/models/Users.php`, `api/models/AuthToken.php`, `assets/js/auth.js`, `include/signin.php` | `Modules/Auth`, `Modules/Users` | 2 | in_progress | Sedang |
| Users | `api/models/Users.php`, profile/update logic | `Modules/Users` | 2 | in_progress | Sedang |
| Showrooms | field showroom masih menempel di `Users` | `Modules/Showrooms` | 3 | in_progress | Sedang |
| Cars | `api/controllers/CarsController.php`, `api/models/Cars.php`, katalog/admin JS | `Modules/Cars` | 3 | in_progress | Sedang |
| Car Images | `api/controllers/ImageController.php`, `api/models/image.php` | `Modules/Images` | 4 | in_progress | Sedang |
| Inspection | `api/controllers/InspeksiController.php`, `api/models/Inspeksi.php` | `Modules/Inspection` | 5 | in_progress | Sedang |
| Affiliate | `api/controllers/AffiliatorController.php`, `api/models/Affiliator.php`, JS affiliate | `Modules/Affiliate` | 6 | in_progress | Sedang |
| Transactions | `api/controllers/TransaksiController.php`, `api/models/Transaksi.php`, `include/transaksi.php`, `assets/js/account/pesanan_saya.js`, `assets/js/globalFrontend.js` | `Modules/Transactions` | 7 | in_progress | Tinggi |
| Payment Provider | `payment/*`, Midtrans logic pada transaksi | `Infrastructure/Payment`, `Modules/Transactions` | 8 | in_progress | Tinggi |
| Master Data | `api/models/Master.php`, admin master JS | `Modules/MasterData` | 9 | in_progress | Rendah |
| API Versions | `api/models/VersiApi.php` | `Modules/ApiVersion` | 9 | in_progress | Rendah |

---

## 5. Detail per Modul

## 5.1 Core Framework

### Tujuan
Membangun pondasi baru yang tidak tergantung pada pola campur aduk di `projectA`.

### Sumber referensi
- `index.php`
- `api/index.php`
- route files lama
- helper response lama

### Yang dipertahankan
- konsep entry point tunggal
- pemisahan jalur API
- pola auth gate dasar

### Yang ditulis ulang
- bootstrap
- router
- request class
- response class
- middleware
- exception handler
- config loader
- environment loader

### Target output
- `public/index.php`
- `app/Core/Application.php`
- `app/Core/Router.php`
- `app/Core/Request.php`
- `app/Core/Response.php`
- `app/Core/Middleware/*`
- `config/*.php`
- `.env.example`

### Risiko
- integrasi awal belum langsung kompatibel dengan seluruh frontend lama
- perlu kontrak route baru yang baku

---

## 5.2 Auth

### Tujuan
Memisahkan login, register, approval, dan remember-me dari model user yang terlalu gemuk.

### Sumber referensi
- `api/models/Users.php`
- `api/models/AuthToken.php`
- `api/controllers/UsersController.php`
- `assets/js/auth.js`
- `include/signin.php`

### Perilaku bisnis yang harus dipertahankan
- register user
- login user
- remember me / autologin
- approval user tertentu
- OTP / verifikasi bila masih dipakai

### Yang ditulis ulang
- auth service
- token service
- session/auth context
- request validation
- response contract

### Keputusan migrasi awal
- Endpoint baru memakai prefix `/api/auth/*`, bukan route lama `/api/users/login` dan `/api/authToken/*`.
- Register publik fase awal hanya menerima role canon `buyer` dan `seller`.
- Role lama `pembeli` dipetakan ke `buyer`; role lama `penjual` dipetakan ke `seller`.
- Buyer langsung dibuat `account_status = active` dan `is_approved = 1`, mengikuti perilaku lama `status = 1`.
- Seller dibuat `account_status = pending` dan `is_approved = 0`, mengikuti flow approval showroom lama `status = 0`.
- Remember-me/autologin memakai tabel canon `user_auth_tokens` dengan token cookie format `selector:validator`; validator disimpan sebagai hash.
- Login sukses selalu menerbitkan cookie auth seperti perilaku autologin lama; flag `remember` hanya menentukan TTL panjang atau session pendek.
- OTP baru memakai `users.phone_number`, `users.otp_code`, dan `users.otp_expires_at`, bukan session `nomor_wa`.
- Endpoint approval dasar sudah disiapkan, tetapi permission admin belum dipasang sampai middleware Auth/role selesai.

### Gap sementara
- Flow OTP lama belum lengkap untuk pembuatan user awal via nomor WA karena perilaku lama masih bergantung session dan belum jelas digunakan di frontend baru.
- Register affiliate lama tidak dipindahkan ke Auth; akan dimigrasikan pada modul Affiliate.
- Frontend lama masih memakai field `nama`, `alamat`, dan `nama_showroom`; endpoint baru memakai field canon seperti `name`, `address`, dan nested `showroom`.
- Route guard lama `authToken/resData/{endpoint}` belum dimigrasikan karena desain baru akan memakai middleware Auth/role.

### Risiko
- field lama masih tercampur dengan data showroom
- perlu pemisahan antara auth, user profile, dan showroom profile

---

## 5.3 Users

### Tujuan
Membangun modul user yang bersih dan fokus pada profile/account domain.

### Sumber referensi
- `api/models/Users.php`
- update profile logic
- pending/approval logic

### Perilaku bisnis yang harus dipertahankan
- baca profil user
- edit profil
- status approval
- role-based identity

### Keputusan desain
- data akun tetap di `users`
- data showroom dipisahkan ke `showrooms`
- Endpoint profile baru memakai `/api/users/me` untuk baca dan update profil user aktif.
- Update profile self tidak mengizinkan perubahan `role`, `account_status`, atau `is_approved`.
- Pembacaan profil user lain hanya dibuka untuk `admin`; user biasa hanya dapat membaca profil sendiri.
- Status approval dibaca lewat `/api/users/{id}/approval-status` dan tetap memakai `account_status` + `is_approved`.

### Risiko
- beberapa flow lama mungkin masih menganggap semua data ada di satu tabel

---

## 5.4 Showrooms

### Tujuan
Menormalkan data showroom yang dulu menempel di tabel user.

### Sumber referensi
- field showroom di model `Users`
- tampilan dashboard penjual/showroom

### Perilaku bisnis yang harus dipertahankan
- penjual punya identitas showroom
- rekening pembayaran tetap tersedia
- kontak showroom tetap tersedia

### Keputusan desain
- satu seller satu showroom pada fase awal
- boleh diperluas nanti bila perlu multi-showroom
- Showroom seller dikelola melalui `/api/showrooms/me`.
- Data rekening showroom dipertahankan pada tabel `showrooms`, bukan `users`.
- Seller hanya bisa membaca/mengubah showroom miliknya; `admin` boleh membaca showroom lain.
- Upsert showroom memakai `PATCH /api/showrooms/me` agar seller lama yang belum punya row `showrooms` bisa dibuatkan row baru.

### Gap sementara
- Belum ada endpoint list semua showroom untuk admin karena belum dibutuhkan oleh flow profile dasar.
- Middleware permission masih berbasis cookie remember-token dari Auth; bearer token/session API formal belum dipisahkan.

---

## 5.5 Cars

### Tujuan
Memigrasikan katalog dan manajemen mobil ke modul baru yang modular.

### Sumber referensi
- `api/models/Cars.php`
- `api/controllers/CarsController.php`
- `assets/js/admin_js/kelola_mobil.js`
- `assets/js/account/katalog.js`
- `include/landingpage.php`
- `include/showroom.php`

### Perilaku bisnis yang harus dipertahankan
- list mobil
- detail mobil
- create mobil
- update mobil
- delete / archive mobil
- list mobil milik seller
- list mobil admin
- filter katalog

### Keputusan desain
- status listing dibakukan
- field naming dinormalisasi
- response list harus konsisten
- Katalog publik memakai `/api/cars` dan default hanya mengembalikan `listing_status = published`.
- Detail publik `/api/cars/{id}` hanya menampilkan listing published.
- Seller mengelola mobil miliknya melalui `/api/seller/cars`.
- Admin mengelola semua mobil melalui `/api/admin/cars`.
- Soft delete lama `delete = 1` diganti menjadi `listing_status = archived` dan `deleted_at` terisi.
- Status lama `status = 1` dipetakan ke `published`; status nonaktif/tersembunyi dipetakan ke `draft` atau `archived` sesuai konteks migrasi.
- Response mobil menyertakan `images: []` sebagai placeholder sampai modul Car Images dimigrasikan.

### Gap sementara
- Join gambar lama dari tabel `image` belum dimigrasikan; detail/list Cars baru belum mengembalikan gambar nyata.
- Endpoint bulk update status admin lama belum dipindahkan; status per mobil bisa diubah lewat `PATCH /api/admin/cars/{id}`.
- Frontend lama masih memakai route seperti `/api/cars/{limit}/getAllcars` dan field lama seperti `merek`, `model`, `harga_cash`.

### Risiko
- frontend lama mungkin tergantung pada nama field lama
- status lama mungkin berupa angka atau mapping implisit

---

## 5.6 Car Images

### Tujuan
Memisahkan upload dan metadata gambar kendaraan secara aman.

### Sumber referensi
- `api/models/image.php`
- `api/controllers/ImageController.php`

### Perilaku bisnis yang harus dipertahankan
- upload gambar mobil
- list gambar mobil
- hapus gambar
- satu gambar bisa menjadi cover

### Yang harus diperbaiki
- hardcoded user id
- penamaan field
- validasi file
- permission upload

### Keputusan desain
- Metadata gambar disimpan pada tabel canon `car_images`.
- Mapping utama: `image.id_mobil` -> `car_images.car_id`, `image.id_users` -> `car_images.user_id`, `image.url` -> `car_images.file_path`.
- Upload memakai endpoint `/api/cars/{car_id}/images` dengan field multipart `image`.
- Storage fisik dipisahkan ke `Infrastructure/Storage` melalui `StorageServiceInterface`.
- File lokal disimpan di `storage/uploads/cars/{car_id}` dan path publik default memakai prefix `/storage/uploads`.
- Validasi upload membatasi MIME `image/jpeg`, `image/png`, `image/webp` dan ukuran maksimum 5 MB.
- Ownership dicek terhadap `cars.seller_user_id`; `admin` boleh mengelola semua gambar.
- Cover image dijaga satu per mobil dengan reset `is_cover = 0` sebelum set cover baru.
- Delete gambar memakai soft delete `deleted_at` dan tidak menghapus fisik file pada fase awal agar aman untuk audit/rollback.

### Gap sementara
- Migrasi file fisik lama dari path `image.url` belum dilakukan.
- Belum ada thumbnail/resizing/optimizer.
- Belum ada batas jumlah gambar per mobil.

### Risiko
- file path lama bisa tidak seragam
- migrasi asset lama butuh strategi terpisah

---

## 5.7 Inspection

### Tujuan
Merapikan inspeksi dari struktur item tunggal menjadi header + detail item.

### Sumber referensi
- `api/models/Inspeksi.php`
- `api/controllers/InspeksiController.php`

### Perilaku bisnis yang harus dipertahankan
- mobil bisa memiliki hasil inspeksi
- tiap item punya status kondisi
- ada catatan inspeksi

### Keputusan desain
- buat `inspection_templates`
- buat `inspection_reports`
- buat `inspection_report_items`
- Endpoint baca laporan terbaru per mobil memakai `/api/cars/{car_id}/inspection-report`.
- Draft/non-published report dapat dibaca ulang oleh seller/admin melalui `/api/seller/cars/{car_id}/inspection-report` dan `/api/admin/cars/{car_id}/inspection-report`.
- Endpoint create report memakai `/api/cars/{car_id}/inspection-reports` dan menerima array `items`.
- Endpoint update item memakai `/api/inspection-reports/{report_id}/items/{item_id}`.
- Status lama `Baik`, `Kurang Baik`, `Tidak Baik` dipetakan ke enum canon `good`, `fair`, `bad`.
- `id_inspeksi` lama diperlakukan sebagai kandidat mapping ke `inspection_templates.id` bila tersedia.
- Bila item lama tidak punya template canon yang cocok, template baru dibuat dari `category_name` + `item_name`; default `category_name` adalah `general`.
- `nama` lama disimpan sebagai `inspection_report_items.item_name_snapshot` melalui template snapshot.
- `keterangan` lama menjadi `inspection_report_items.description`; `catatan` lama menjadi `inspection_report_items.notes`.
- `cars.inspection_summary_status` diperbarui dari status report: `completed/published` menjadi `completed`, selain itu `partial`.

### Gap sementara
- Belum ada endpoint CRUD template inspeksi khusus admin.
- Belum ada aturan jumlah minimal/standar checklist per kategori.
- Jika data lama memiliki `id_inspeksi` ambigu atau tidak konsisten antar mobil, migrasi perlu deduplikasi template sebelum import.

### Risiko
- field lama ambigu: `id_inspeksi`
- perlu aturan migrasi item inspeksi lama ke template baru

---

## 5.8 Affiliate

### Tujuan
Memigrasikan referral dan komisi ke modul yang lebih stabil.

### Sumber referensi
- `api/models/Affiliator.php`
- `api/controllers/AffiliatorController.php`
- JS affiliate

### Perilaku bisnis yang harus dipertahankan
- kode referral unik
- komisi persen/flat
- hitung total klik
- hitung total transaksi
- hitung total komisi

### Keputusan desain
- agregat tetap ada untuk kecepatan baca
- ledger ditambahkan untuk akurasi histori
- Tabel canon `affiliates`, `affiliate_click_logs`, dan `affiliate_commission_ledgers` menjadi target baru.
- Endpoint baru memakai prefix `/api/affiliates`, `/api/seller/affiliates`, dan `/api/affiliate/*`, bukan route lama `/api/affiliator`.
- Mapping status lama `1/0` dipindahkan ke enum canon `active/inactive`.
- Mapping commission type lama `persen` dipindahkan ke `percent`; `flat` tetap `flat`.
- Relasi affiliate dibuat eksplisit sebagai `user_id` affiliate dan `seller_user_id` seller.
- Kode referral divalidasi unik dan dinormalisasi uppercase.
- Click log dicatat ke `affiliate_click_logs`; `affiliates.total_clicks` dinaikkan secara transaksional sebagai cache baca.
- Ledger komisi menjadi source of truth histori; `affiliates.total_transactions` dan `affiliates.total_commission` disinkronkan ulang dari ledger setelah entry dibuat.
- Agregat komisi dihitung sebagai `accrual + adjustment - payout`; `total_transactions` dihitung dari transaksi unik pada ledger `accrual`.

### Gap sementara
- Belum ada integrasi otomatis dari modul Transactions karena modul transaksi belum dimigrasikan.
- Belum ada endpoint payout batch atau approval payout.
- Belum ada deduplikasi click berbasis sesi/IP; fase awal mencatat setiap click sebagai event.
- Update data profil affiliate tidak digabung dengan modul Affiliate; profile user/showroom tetap dikelola modul Users/Showrooms.

### Risiko
- agregat lama mungkin tidak selalu sinkron
- butuh kebijakan source of truth antara agregat dan ledger
- data lama memakai nama tabel `afiliator/affiliator` tidak konsisten sehingga import perlu verifikasi nama tabel aktual

---

## 5.9 Transactions

### Tujuan
Memigrasikan proses transaksi pembelian mobil dengan kontrak data yang sehat.

### Sumber referensi
- `api/models/Transaksi.php`
- `api/controllers/TransaksiController.php`
- `include/transaksi.php`
- `assets/js/account/pesanan_saya.js`
- `assets/js/globalFrontend.js`

### Perilaku bisnis yang harus dipertahankan
- buat transaksi
- bayar DP / full
- cek status transaksi
- pelunasan
- update status dari callback provider

### Keputusan desain
- pisahkan PK dan business code transaksi
- buyer dan seller dibuat eksplisit
- log pembayaran dipisah ke tabel khusus
- service transaksi dipisah dari provider payment
- Implementasi baru memakai `transactions.id` sebagai PK numerik dan `transactions.transaction_code` sebagai kode bisnis pengganti `id_transaksi` lama.
- `buyer_user_id`, `seller_user_id`, dan `car_id` wajib eksplisit pada setiap row transaksi.
- Harga mobil memakai prioritas `price_discount`, lalu `price_cash`, lalu `price_credit`.
- Transaksi baru dibuat dengan `transaction_status = pending_payment`.
- Untuk `payment_type = dp`, `dp_amount` wajib lebih besar dari 0 dan lebih kecil dari `car_price`; `remaining_amount = car_price - dp_amount`.
- Untuk `payment_type = full`, `dp_amount = null` dan `remaining_amount = 0`.
- Status legacy `pending`, `menunggu_pembayaran`, dan `waiting_pelunasan` dipetakan ke status canon `pending_payment` atau dipertahankan sebagai fase log provider tanpa mengubah status transaksi final.
- Status legacy `paid` pada transaksi DP dipetakan ke `dp_paid`; status legacy `completed/lunas` dipetakan ke `paid`.
- Status provider `settlement/capture/paid` dipetakan ke `dp_paid` untuk pembayaran DP awal dan ke `paid` untuk full/pelunasan.
- Status provider `expire` dipetakan ke `expired`; `cancel/deny/failure/failed` dipetakan ke `cancelled`.
- Endpoint pelunasan buyer hanya membuat log/intensi payment; konfirmasi `paid` harus datang dari callback provider atau role seller/admin.
- Integrasi provider tidak ditanam di `TransactionService`; hasil/request/callback provider dicatat melalui `PaymentLogService` ke `transaction_payment_logs`.
- `transaction_payment_logs` menggantikan tabel/log payment lama pada fase awal, dengan payload request/response/callback disimpan sebagai JSON audit trail.

### Endpoint baru
- `POST /api/transactions`
- `GET /api/transactions`
- `GET /api/transactions/{transaction_id}`
- `GET /api/transactions/{transaction_id}/status`
- `PATCH /api/transactions/{transaction_id}/status`
- `POST /api/transactions/{transaction_id}/complete-payment`
- `POST /api/payments/midtrans/callbacks`

### Gap sementara
- Adapter Midtrans sudah dipisahkan ke `Infrastructure/Payment/Midtrans`; verifikasi sandbox end-to-end masih menunggu credential dan database siap.
- Data teknis payment lama seperti VA number, QR local path, bank, dan deeplink belum punya kolom khusus di schema canon; fase awal disimpan di payload JSON log.
- Due date pelunasan 7 hari dari legacy tidak punya kolom canon eksplisit; fase awal memakai `expires_at` transaksi/log provider dan tidak menambah schema.
- Reservasi stok/listing mobil belum otomatis dilakukan saat transaksi dibuat.

### Risiko
- modul paling kompleks
- ada bug structural pada schema lama
- sangat sensitif terhadap perubahan field dan status
- frontend lama masih memakai route `/api/transaksi/*` dan status non-canon seperti `paid`, `completed`, `waiting_pelunasan`

---

## 5.10 Payment Provider

### Tujuan
Menormalkan integrasi Midtrans dan menjadikannya adapter terpisah.

### Sumber referensi
- `payment/*`
- bagian Midtrans di `Transaksi.php`

### Perilaku bisnis yang harus dipertahankan
- generate token / redirect pembayaran
- callback / notification
- update status transaksi
- pembayaran DP / full / pelunasan

### Keputusan desain
- Midtrans dipindah ke `Infrastructure/Payment`
- transaksi hanya memanggil service adapter
- request/response provider disimpan ke `transaction_payment_logs`
- Adapter Midtrans baru berada di `Infrastructure/Payment/Midtrans`.
- Credential Midtrans wajib dibaca dari env/config, tidak boleh hardcode.
- `TransactionService` membuat payment session melalui `MidtransPaymentAdapter`, lalu menyimpan request/response provider melalui `PaymentLogService`.
- Callback masuk melalui endpoint `/api/payments/midtrans/callbacks`, dinormalisasi dan diverifikasi oleh `MidtransCallbackHandler`, lalu status canon diproses oleh `TransactionService`.
- Signature callback Midtrans diverifikasi dengan formula `order_id + status_code + gross_amount + server_key`; verifikasi bisa dimatikan hanya untuk local testing melalui env.
- Payment method lama `bca_va`, `bni_va`, `bri_va`, `mandiri_va`, `qris`, `gopay`, dan `shopeepay` dipertahankan sebagai input adapter.
- Detail teknis provider seperti VA number, QR string, actions, deeplink, dan raw response tidak ditambahkan ke schema baru; data tersebut disimpan pada payload JSON di `transaction_payment_logs`.

### Gap sementara
- Belum ada adapter provider selain Midtrans.
- Belum ada retry queue untuk kegagalan HTTP provider.
- Belum ada endpoint manual status inquiry/cancel/refund ke Midtrans.
- Belum ada test sandbox end-to-end karena membutuhkan credential Midtrans aktif dan database projectB siap.

### Risiko
- callback harus sangat presisi
- raw payload perlu disimpan untuk audit
- network call ke provider saat create payment session perlu timeout dan observability saat production hardening

---

## 5.11 Master Data

### Tujuan
Mempertahankan master dinamis yang memang masih berguna, tanpa menjadikannya tempat menaruh data transaksi.

### Sumber referensi
- `api/models/Master.php`
- admin master JS
- local storage usage

### Perilaku bisnis yang harus dipertahankan
- data referensi dinamis bisa diambil frontend
- ada versi sinkronisasi
- beberapa konfigurasi tidak perlu tabel khusus

### Keputusan desain
- tetap pertahankan JSON master untuk data referensi
- batasi ruang lingkupnya
- Endpoint baca master baru memakai `GET /api/master-data/{master_key}`.
- Endpoint upsert master admin memakai `PUT/PATCH /api/master-data/{master_key}` dengan payload `data`.
- `master_key` dinormalisasi lowercase dan hanya boleh berisi huruf kecil, angka, titik, dash, dan underscore.
- Perubahan master default-nya melakukan bump version pada `api_versions` dengan `resource_name = master_key`.
- `bump_version=false` boleh dipakai hanya bila perubahan tidak relevan untuk invalidasi cache client.
- Tabel `master_data` hanya boleh dipakai untuk data referensi JSON yang jarang berubah dan tidak menjadi source of truth transaksi.
- Resource berikut wajib tetap relasional dan ditolak oleh service jika dipakai sebagai `master_key`: `users`, `showrooms`, `cars`, `car_images`, `inspection_templates`, `inspection_reports`, `inspection_report_items`, `transactions`, `transaction_payment_logs`, `affiliates`, `affiliate_click_logs`, `affiliate_commission_ledgers`.

### Endpoint baru
- `GET /api/master-data/{master_key}`
- `PUT /api/master-data/{master_key}`
- `PATCH /api/master-data/{master_key}`

### Kapan boleh JSON master
- lookup UI sederhana seperti pilihan warna, label statis, daftar opsi non-transaksional, konfigurasi tampilan ringan
- referensi frontend yang tidak membutuhkan relasi kuat, audit transaksi, ownership, atau query kompleks
- data yang bisa diganti seluruh dokumen JSON dan divalidasi di layer aplikasi

### Kapan harus relasional
- semua transaksi, pembayaran, ledger, user, seller, showroom, mobil, gambar, inspeksi report, affiliate relation/log/commission
- data yang perlu FK, ownership, audit mutasi detail, status bisnis, pencarian/filter granular, atau konsistensi antar modul

### Risiko
- mudah disalahgunakan untuk data yang seharusnya relasional
- struktur JSON per `master_key` belum punya schema validator spesifik; validasi domain bisa ditambahkan saat key mulai stabil

---

## 5.12 API Versions

### Tujuan
Mempertahankan mekanisme versi sinkronisasi data referensi.

### Sumber referensi
- `api/models/VersiApi.php`

### Perilaku bisnis yang harus dipertahankan
- client bisa tahu versi resource tertentu
- invalidasi cache/local data bisa dilakukan

### Keputusan desain
- Endpoint baca versi resource memakai `GET /api/versions/{resource_name}`.
- MasterData memanggil service ApiVersion untuk bump versi saat master berubah.
- `api_versions.resource_name` mengikuti `master_key` untuk master dinamis.

### Endpoint baru
- `GET /api/versions/{resource_name}`

### Risiko
- bila tidak dipakai konsisten, tabel ini hanya jadi formalitas
- bump otomatis baru terpasang pada MasterData; modul relasional lain perlu memanggil service ini bila ingin sinkronisasi cache client

---

## 6. Urutan Implementasi Resmi

### Sprint 1
- Core framework
- Config/env
- Router
- Request/response
- Error handler
- Middleware auth dasar

### Sprint 2
- Auth
- Users
- Showrooms

### Sprint 3
- Cars
- Car Images

### Sprint 4
- Inspection
- Affiliate

### Sprint 5
- Transactions
- Payment Provider

### Sprint 6
- Master Data
- API Versions
- Final hardening

---

## 7. Checklist Migrasi per Modul

Setiap modul baru harus dicek dengan checklist berikut:

- [ ] schema mengikuti `SCHEMA_CANON.md`
- [ ] route baru mengikuti standar `projectB`
- [ ] request validation ada
- [ ] response JSON baku
- [ ] service dan repository dipisah
- [ ] permission check ada
- [ ] tidak ada copy code mentah tanpa alasan
- [ ] dependensi ke `projectA` hanya sebatas referensi
- [ ] perilaku bisnis utama tetap sama
- [ ] gap migrasi didokumentasikan

---

## 8. Catatan Risiko Umum

1. Nama field lama tidak konsisten
2. Sebagian modul lama bercampur antara UI, auth, query, dan business logic
3. State frontend lama tersebar di banyak file
4. Transaksi dan pembayaran adalah area paling sensitif
5. Beberapa status bisnis lama mungkin implisit dan tidak terdokumentasi

---

## 9. Rule of Decision

Jika terjadi konflik antara:
- struktur lama di `projectA`
- schema canon di `projectB`

maka keputusan standar adalah:

1. pertahankan perilaku bisnis
2. gunakan naming dan arsitektur baru
3. dokumentasikan gap migrasi
4. jangan memaksa struktur lama masuk mentah ke desain baru

---

## 10. Ringkasan

Dokumen ini adalah peta kerja migrasi.

Acuan utama:
- `AGENTS.md`
- `SYSTEM_OVERVIEW.md`
- `SCHEMA_CANON.md`

Target akhir:
- `projectB` berdiri mandiri
- tidak bergantung pada struktur kode lama
- tetap menjaga fungsi bisnis penting dari `projectA`
