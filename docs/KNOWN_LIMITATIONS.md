# KNOWN_LIMITATIONS

## Tujuan
Dokumen ini mencatat batasan sistem `projectB` saat ini secara jujur dan operasional. Tujuannya agar:
- tim tidak salah menganggap fitur sudah final
- prompt/pekerjaan berikutnya membaca konteks yang benar
- UAT dilakukan dengan ekspektasi yang realistis

Dokumen ini harus diperbarui bila ada batasan yang sudah ditutup atau ada batasan baru yang muncul.

---

## 1. Batasan umum
Aplikasi saat ini sudah kuat sebagai baseline lintas role, tetapi beberapa area masih baseline dan belum final. Mayoritas batasan berikut **bukan blocker fondasi**, tetapi penting untuk diketahui sebelum operasi/UAT lebih jauh.

---

## 2. Public / Buyer limitations

### 2.1 Public route masih hash-based
Frontend masih memakai hash routing (`#/...`), bukan clean history routing. Ini aman untuk sekarang, tetapi belum ideal untuk pengalaman URL yang lebih “production-grade”.

### 2.2 Error handling per page belum kaya
Hydrate error sudah terlihat di shell, tetapi banyak page belum punya error panel domain-spesifik yang lebih tajam. Dalam beberapa kasus, user masih bisa melihat empty/loading state yang tidak cukup informatif.

### 2.3 Buyer flow masih baseline
Buyer sudah bisa:
- create transaction
- lihat payment status
- pelunasan dasar

Tetapi belum ada payment UX yang sangat dalam seperti:
- payment instruction multi-method yang kaya
- payment reconciliation detail
- dispute handling
- riwayat pembayaran yang lebih kaya

---

## 3. Seller limitations

### 3.1 Seller flow operasional sudah ada, tetapi belum heavy-scale
Seller modules sudah cukup lengkap, tetapi untuk volume data besar nanti masih akan butuh:
- pagination
- server-side filtering yang lebih luas
- optimasi list/list detail

### 3.2 Seller affiliate management belum menyelesaikan lifecycle affiliate final
Seller bisa membuat dan mengelola affiliate dengan akun login dasar, tetapi lifecycle lanjutan seperti invitation, claim account, dan approval workflow khusus affiliate masih belum final.

### 3.3 Commission management belum mencakup payout policy
Seller bisa menentukan rule komisi, tetapi:
- belum ada pengaturan payout policy
- belum ada pengaturan settlement cadence
- belum ada konfigurasi finance yang lebih kaya

---

## 4. Admin limitations

### 4.1 Admin settlement path masih tipis
Admin settlement sekarang cukup untuk UAT dan operasi baseline:
- list batch
- filter status
- update status batch

Tetapi belum ada:
- create batch UI penuh
- finance dashboard admin
- reconciliation tools
- batch diagnostics yang lebih dalam

Create settlement batch masih memerlukan jalur manual / endpoint / runbook jika UI penuh belum tersedia.

### 4.2 Approval flow masih dasar
Approval admin sudah usable, tetapi belum ada:
- reject flow
- hold flow
- reason / note trail
- audit trail approval yang kaya
- granular per-row error state

### 4.3 Admin monitoring belum siap untuk volume besar
List/filter tertentu masih cukup bergantung pada snapshot/working set dan filtering frontend. Untuk skala besar, perlu:
- pagination
- server-side filtering
- server-side sorting
- query monitoring yang lebih operasional

### 4.4 Route admin cars/pending-users resolved
Final full regression follow-up 2026-06-01 menutup gap route admin:
- `#/admin/pending-users` sekarang terdaftar sebagai admin-only alias untuk approval queue existing.
- `#/admin/cars` sekarang terdaftar sebagai halaman read-only admin listing yang memakai preload/resource cars existing.

Catatan batasan yang masih berlaku: `#/admin/cars` tidak menambah action bisnis baru seperti approve/reject/archive jika action tersebut belum tersedia di surface existing. Route ini hanya menutup monitoring/listing regression gap tanpa perubahan schema/API.

---

## 5. Affiliate limitations

### 5.1 Affiliate onboarding belum final
Saat ini seller dapat membuat akun affiliate aktif dengan email/password, dan affiliate dapat login ke dashboard. Belum ada flow final untuk:
- invitation affiliate
- claim account
- aktivasi formal affiliate
- lifecycle onboarding affiliate yang lengkap

Google Login Affiliate sengaja tidak diaktifkan. Route `#/google-login/affiliate` hanya menjelaskan policy dan mengarahkan affiliate ke login user/password existing karena affiliate canon wajib terhubung ke seller dan referral code.

### 5.2 Activity/click bukan sumber kebenaran komisi
Click/activity sudah tersedia, tetapi hanya berfungsi sebagai telemetry pendukung. Komisi tidak didasarkan pada click, melainkan pada penjualan canon.

### 5.3 Affiliate analytics masih dangkal
Belum ada analytics yang lebih kaya seperti:
- source/channel breakdown
- device breakdown
- conversion funnel detail
- campaign analytics
- attribution multi-touch

### 5.4 Affiliate settlement masih read-only untuk affiliate
Affiliate hanya bisa melihat settlement. Belum ada:
- withdrawal request
- payout request
- bank payout workflow
- settlement confirmation dari sisi affiliate

---

## 6. Affiliate finance limitations

### 6.1 Payout/settlement masih baseline manual
Model settlement saat ini sengaja baseline:
- ledger canon
- settlement batch
- status `accrued / pending / paid_out`
- admin/manual update status

Belum ada:
- payout gateway
- auto disbursement
- bank automation
- reconciliation finance berat
- withdrawal automation

### 6.2 SQL patch wajib masih menjadi dependency operasional
Beberapa flow affiliate finance bergantung pada patch schema canon. Tanpa apply patch yang benar, finance flow bisa gagal di runtime.

### 6.3 Rule history baru tersedia setelah hardening canon
Rule source, commission type, dan nilai snapshot sekarang sudah masuk canon, tetapi environment yang belum sinkron schema-nya akan gagal memakai pipeline baru.

### 6.4 Keputusan bisnis payout belum final
Yang belum final:
- apakah affiliate boleh request withdrawal sendiri
- apakah settlement sepenuhnya admin-driven
- cadence settlement
- threshold payout minimum
- cancellation/reversal policy yang lebih kaya

### 6.5 Payment provider real UAT masih blocked environment
Provider/runtime payment path di codebase sudah ada, tetapi real provider UAT dan readiness produksi tetap bergantung pada:
- callback URL HTTPS publik
- credential target yang valid
- approval transaction disposable
- rollback/reset plan yang disetujui

Artinya, aplikasi bisa lulus regression gate tanpa otomatis berarti provider real UAT sudah siap dijalankan.

### 6.6 Google provider real UAT masih blocked environment
Google role-specific login sudah tersedia secara code-level, tetapi provider UAT/production readiness tetap bergantung pada:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- domain callback yang cocok dengan konfigurasi Google Cloud
- SQL patch `20260602_google_oauth_identities.sql`

Default env tetap `GOOGLE_AUTH_ENABLED=false`, jadi status provider adalah blocked sampai credential target valid dipasang.

### 6.7 Google login menjadi default UI, tetapi provider masih bisa disabled
Public UI sekarang mengarah ke Google Login sebagai default. Jika provider belum dikonfigurasi, user melihat pesan aman bahwa Google Login belum dikonfigurasi.

Login email/password existing tetap tersedia lewat URL manual untuk emergency, tetapi link legacy disembunyikan dari UI publik/default.

---

## 7. Cross-role limitations

### 7.1 Theme adoption sudah kuat tetapi belum absolut
Theme system terpusat sudah ada dan banyak diadopsi, tetapi masih mungkin ada sisa kecil hardcoded visual pada komponen minor.

### 7.2 UAT besar masih wajib dilakukan secara nyata
Walau fondasi codebase sudah kuat, readiness penuh tetap bergantung pada:
- apply SQL patch
- browser UAT end-to-end
- validasi lintas role
- validasi affiliate finance path

### 7.3 Automation test belum matang
Saat ini masih banyak mengandalkan:
- manual UAT
- smoke check
- syntax check
- unit test existing

Belum ada regression/e2e suite yang matang untuk semua domain utama.

### 7.4 Runbook masih penting karena sebagian flow masih manual
Beberapa area seperti settlement baseline masih memerlukan runbook operasional. Ini normal untuk baseline, tetapi harus diingat saat UAT/operasi.

---

## 8. Known limitations yang bersifat keputusan, bukan bug
Bagian ini penting agar tim tidak salah menganggap semua “kekurangan” adalah defect.

### 8.1 Hash routing
Ini keputusan teknis sementara, bukan bug.

### 8.2 Affiliate settlement read-only
Ini keputusan produk baseline, bukan bug.

### 8.3 Settlement batch create yang masih manual/runbook
Ini baseline operasional, bukan bug selama runbook tersedia.

### 8.4 Click analytics yang ringan
Ini keputusan scope; click hanya pendukung, bukan defect utama.

### 8.5 Tidak ada automation payout
Ini memang belum scope, bukan bug.

---

## 9. Trigger untuk memperbarui dokumen ini
Dokumen ini harus diperbarui bila salah satu terjadi:
- create batch settlement UI sudah tersedia
- invitation/claim affiliate sudah tersedia
- reject/hold approval flow sudah tersedia
- payout automation mulai dibangun
- hash routing diganti
- regression/e2e suite sudah matang
- theme sweep final sudah selesai
- hardening error handling per page sudah dilakukan

---

## 10. Ringkasan singkat
Saat ini aplikasi sudah:
- kuat secara fondasi lintas role
- kuat secara affiliate canon pipeline
- cukup matang untuk UAT besar bila environment sinkron

Tetapi aplikasi **belum final** pada area:
- payout automation dan upload proof file binary
- affiliate onboarding final
- affiliate finance automation
- approval flow kaya
- analytics affiliate mendalam
- automated regression testing

---

## 11. Payment method limitations

### 11.1 GoPay dan QRIS runtime sudah ada, provider UAT nyata belum
Support runtime untuk `gopay` dan `qris` sudah ditambahkan di checkout/status page, tetapi validasi end-to-end provider tetap bergantung pada:

- callback HTTPS publik
- disposable transaction yang disetujui
- sandbox/provider environment yang aktif

Artinya, code path sudah siap, tetapi hasil provider nyata belum boleh diasumsikan lulus tanpa UAT khusus.

### 11.2 QR download saat ini fokus ke QRIS
Endpoint download QR saat ini dibuka untuk transaksi `qris`. GoPay tetap dapat menampilkan QR fallback bila provider memberikannya, tetapi tombol unduh khusus saat ini tidak dibuka untuk GoPay.

### 11.3 QR payload string mentah belum digenerate menjadi bitmap
Implementasi saat ini mengandalkan:

- action provider `generate-qr-code`
- atau `data:image/...`

Jika suatu saat provider hanya mengembalikan payload string QR non-image tanpa action image, ProjectB belum mengenerate QR bitmap sendiri.

### 11.4 GoPay/QRIS provider sandbox UAT masih blocked oleh environment
Per 2026-06-01, gate provider sandbox untuk GoPay/QRIS belum bisa dijalankan karena:

- `APP_URL` masih `http://localhost:8000`
- `MIDTRANS_CALLBACK_URL` masih `http://localhost:8000/api/payments/midtrans/callbacks`
- belum ada URL callback HTTPS publik yang bisa dijangkau Midtrans
- belum ada approval eksplisit untuk disposable transaction yang boleh dimutasi

Ini bukan bug runtime baru, tetapi blocker operasional yang harus ditutup sebelum payment release bisa naik ke status provider-ready.

---

## 12. Admin impersonation limitations

### 12.1 Audit log impersonation belum punya halaman admin khusus
Impersonation admin-ke-affiliate sudah tercatat di:

- `admin_impersonation_sessions`
- `storage/logs/admin_affiliate_impersonation.log`

Namun saat ini belum ada page admin khusus untuk membaca audit trail tersebut dari UI.

### 12.2 Impersonation saat ini dibuka untuk seller dan affiliate, tetapi tetap support-oriented
Flow impersonation saat ini mendukung target:

- `seller`
- `affiliate_admin`

Emergency smoke 2026-06-02 memverifikasi tombol admin UI `Login sebagai Seller` dan `Login sebagai Affiliate`, start impersonation kedua role, banner, stop/kembali admin, dan regression login normal minimal.

Tetapi guard mutation sensitif yang eksplisit baru diterapkan pada affiliate:

- edit profil affiliate
- ubah password affiliate

Seller impersonation saat ini diposisikan untuk inspeksi/support dan belum menambah perluasan mutation policy baru di luar perilaku existing.

---

## 13. Auto schema bootstrap limitations

### 13.1 Scope auto-create tabel masih module-scoped
Auto schema bootstrap saat ini hanya membuat tabel `notifications` jika belum tersedia. Ini sengaja tidak dibuat global agar request pertama tidak menjalankan scan/patch schema besar.

### 13.2 Tidak membuat database baru
Database MySQL harus sudah ada dan tetap mengikuti konfigurasi aktif `config/database.php` / `.env`. Bootstrap hanya berjalan setelah koneksi PDO ke database berhasil.

### 13.3 Tidak memperbaiki tabel existing yang tidak lengkap
Jika tabel `notifications` sudah ada tetapi kolom/index-nya belum lengkap, bootstrap tidak menjalankan `ALTER TABLE`. Sinkronisasi tabel existing tetap harus mengikuti SQL patch manual dengan backup.

## 14. Payment page persistence limitations

Payment page sekarang menyimpan ulang instruksi dari backend detail/log dan tidak memaksa transaksi baru untuk QRIS/GoPay/VA reload. Batasan yang masih berlaku:

- Polling status memakai endpoint status existing dan tidak menambah provider status query baru.
- Jika provider response/log tidak pernah membawa QR/deeplink/VA/payment code, UI tidak bisa mengarang instruksi baru.
- Browser smoke real provider tetap membutuhkan credential, callback HTTPS publik, dan transaksi disposable yang disetujui.
- Expiry mengikuti `transactions.expires_at` atau `expiry_time` provider bila tersedia.

## 15. Design Studio data-ds preview limitations

Design Studio sekarang memiliki registry awal, search `data-ds`, iframe route preview, viewport selector, highlight, dan temporary style override. Batasan yang masih berlaku:

- Persistent save per-elemen `data-ds` belum dibuat karena storage belum diputuskan.
- Protected route preview memakai session login saat ini dan tidak membuat mock auth.
- Admin dapat membuka route frontend buyer/seller/affiliate untuk Design Studio preview, tetapi endpoint/API tetap mengikuti permission backend dan bisa menampilkan data kosong atau error terkontrol jika session admin tidak punya data role target.
- Registry editable awal sengaja dibatasi ke `catalog.search.bar`, `catalog.filter.toolbar`, `buyer.mobile.footer`, dan `affiliate.mobile.footer`.
- Unregistered `data-ds` hanya ditampilkan sebagai temuan scan dan tidak dapat diedit bebas.
