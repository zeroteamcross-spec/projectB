
# Technical Requirement Document (TRD)
## Standar Pembuatan Menu / Halaman Baru di `projectB`

## 1. Tujuan Dokumen
Dokumen ini menjadi **acuan wajib** setiap kali membuat menu, halaman, atau modul baru di `projectB`, agar:
- tidak melenceng dari arsitektur yang sudah dibangun
- tetap konsisten secara visual, teknis, dan UX
- tidak membuat pola baru yang liar
- mudah dirawat, diuji, dan dikembangkan

Dokumen ini harus dibaca **sebelum**:
- membuat route baru
- membuat halaman baru
- membuat komponen baru
- mengubah pola data loading
- membuat tabel, modal, atau form baru
- membuat fitur lintas role

---

## 2. Prinsip Utama yang Wajib Dijaga

### 2.1 Jangan keluar dari arsitektur `projectB`
Semua fitur baru harus mengikuti pola yang sudah ada di `projectB`, bukan membuat pola baru.

### 2.2 Reuse lebih diutamakan daripada membuat ulang
Kalau shared component, global table system, modal system, atau theme system sudah ada, maka **wajib reuse**.

### 2.3 UI harus konsisten lintas role
Public, buyer, seller, admin, dan affiliate harus terasa satu keluarga desain.

### 2.4 SPA discipline wajib dipertahankan
Aplikasi ini adalah SPA. Jangan mengubah fitur baru menjadi alur yang bertentangan dengan pola SPA.

### 2.5 Snapshot kecil + hydrate penuh adalah default
Render awal harus terasa instan. Data penuh boleh masuk setelah halaman tampil.

### 2.6 Pagination default adalah frontend-only
Pagination **bukan** alasan untuk mengubah kontrak backend menjadi page-based, kecuali user secara eksplisit meminta itu.

### 2.7 Jangan menambah kompleksitas tanpa alasan jelas
Kalau masalah bisa diselesaikan dengan patch kecil yang konsisten, jangan redesign besar.

---

## 3. Dokumen Yang Wajib Dibaca Sebelum Implementasi
Default minimum:
- `projectB/AGENTS.md`
- `projectB/docs/SYSTEM_OVERVIEW.md`
- `projectB/docs/FRONTEND_ARCHITECTURE_SPEC.md`
- `projectB/docs/FEATURE_MODULE_CONTRACT.md`
- `projectB/docs/KNOWN_LIMITATIONS.md`

Tambahan sesuai konteks:
- `projectB/docs/SCHEMA_CANON.md` jika menyentuh struktur data / field
- `projectB/docs/AFFILIATE_FINANCE_CANON.md` jika menyentuh affiliate finance
- `projectB/docs/UAT_CHECKLIST.md` jika menyiapkan flow untuk UAT
- `projectB/docs/OPERATIONS_RUNBOOK.md` jika menyentuh flow operasional
- `projectB/docs/RUNBOOK_SETTLEMENT_BASELINE.md` jika menyentuh settlement

Catatan:
- **Jangan gunakan prompt “baca seluruh docs”**
- baca **sesuai kebutuhan menu/fitur yang sedang dikerjakan**

---

## 4. Aturan Struktur Fitur Baru

Setiap menu/halaman baru idealnya mengikuti pola:

- route
- manifest
- preload plan bila perlu
- page module
- service/resource bila perlu
- komponen presentasional
- state working/runtime bila perlu
- reuse shared components

### 4.1 Route
Semua menu baru harus punya route yang jelas dan konsisten dengan role.

Contoh:
- public: `#/...`
- buyer: `#/buyer/...`
- seller: `#/seller/...`
- admin: `#/admin/...`
- affiliate: `#/affiliate/...`

### 4.2 Manifest
Kalau menu baru adalah modul utama, pastikan terdaftar dengan benar di manifest dan tidak membuat entry liar.

### 4.3 Page lifecycle
Halaman baru harus mengikuti lifecycle existing:
- mount
- hydrate
- bind events
- unmount / dispose

### 4.4 Jangan fetch API langsung di komponen presentasional
Komponen UI harus menerima data lewat props / render function / page layer.
Fetch dilakukan di:
- page layer
- service layer
- resource layer

### 4.5 Working state dan runtime state
Pisahkan dengan disiplin:
- **snapshot** = fallback render cepat
- **working** = data aktif halaman
- **runtime** = state UI sementara

Jangan membuat global variable liar.

---

## 5. Aturan Data Loading

### 5.1 Default loading pattern
Gunakan pola berikut sebagai default:

1. route membuka halaman
2. render awal memakai snapshot kecil bila ada
3. hydrate/background fetch ambil working set lebih penuh
4. halaman update tanpa merusak UX

### 5.2 Snapshot kecil
Snapshot awal sebaiknya kecil, misalnya:
- 10 item
- ringkasan penting
- data utama untuk first render

### 5.3 Working set penuh
Setelah halaman aktif:
- ambil data lebih penuh di belakang layar
- update working set
- jangan membuat halaman terasa blank dulu baru tampil

### 5.4 Pagination
Untuk tabel/list operasional:
- pagination default **frontend-only**
- slicing data di frontend
- page/page_size adalah state UI lokal
- jangan ubah API menjadi page/per_page tanpa kebutuhan eksplisit

### 5.5 Preload-first untuk halaman dan modal
Pada sistem SPA ini, data inti halaman harus disiapkan lebih dulu di belakang layar.

Aturan wajib:
- halaman baru membaca snapshot kecil saat render awal
- hydrate working set penuh dilakukan lewat route preload/background hydrate
- jangan fetch klasik saat halaman dibuka dari komponen presentasional
- jangan fetch klasik saat modal dibuka
- modal hanya membaca data yang sudah tersedia dari preload/state halaman
- action mutasi seperti simpan, publish, upload, atau archive boleh memanggil API sesuai service/resource contract

Jika modal membutuhkan master data atau working data detail, data tersebut harus masuk ke snapshot/working preload halaman sebelum modal bisa dipakai.

---

## 6. Aturan Global Table System

Jika halaman baru memakai data list operasional atau data dinamis, **default tampil sebagai tabel** dan **gunakan global table system**.

Aturan ini wajib supaya struktur aplikasi seragam dan revisi UX yang sama tidak berulang pada menu berikutnya.

### 6.0 Default list data dinamis
Untuk menu/halaman baru:
- data dinamis/list operasional default harus tampil sebagai tabel
- tabel menampilkan ringkasan dan kolom penting saja
- jika data cukup banyak atau detailnya panjang, tambahkan kolom aksi berisi tombol **Detail**
- tombol **Detail** wajib membuka modal berisi informasi lengkap
- pagination tetap frontend-only bila kebutuhan masih UI biasa

Hindari membuat daftar item dinamis sebagai kumpulan card/button lokal kecuali ada alasan produk yang sangat kuat dan dijelaskan eksplisit.

### 6.1 Wajib reuse
Gunakan:
- `dataTable.js`
- `pagination.js`

### 6.2 Tabel harus support mobile
Perilaku mobile wajib jelas:
- responsive container yang aman
- atau disclosure rows / stacked rows
- jangan memaksa tabel desktop mentah di layar sempit

### 6.3 Tabel harus support:
- loading
- empty state
- badge/status
- row actions
- pagination frontend-only
- responsive behavior

### 6.4 Jangan bikin tabel lokal sendiri
Jika butuh variasi, extend shared table system, bukan copy-paste desain tabel baru.

---

## 7. Aturan Modal / Popup

Jika halaman baru membutuhkan review/detail/action popup, gunakan modal system shared.

### 7.0 Default create/edit/detail flow
Untuk pembuatan menu/halaman baru:
- create flow default memakai modal
- edit flow default memakai modal
- detail penuh untuk data list default memakai modal
- tidak ada lagi create/edit inline sebagai form utama di halaman
- hindari panel create/edit inline kecuali ada alasan sangat kuat, spesifik, dan disetujui sebagai pengecualian

Halaman utama harus memprioritaskan hierarchy operasional:
- header/anchor
- CTA utama seperti **Buat Baru**
- tabel data
- aksi per row seperti **Detail** dan **Edit**

Form create/edit boleh tetap dibuat sebagai komponen presentasional, tetapi mount utamanya harus berada di modal baseline shared.

### 7.1 Modal wajib:
- responsif
- tidak overflow keluar viewport
- punya header yang jelas
- body scrollable
- footer/action yang rapi
- close action jelas
- backdrop yang rapi

### 7.1.1 Modal close behavior
Semua modal di `projectB` wajib mengikuti aturan close behavior berikut:
- modal tidak boleh tertutup saat user klik area luar modal/backdrop
- modal tidak boleh tertutup otomatis karena accidental backdrop click
- modal hanya boleh ditutup lewat tombol eksplisit di dalam modal, seperti:
  - tombol `X`
  - tombol `Batal`
  - tombol `Tutup`
  - tombol `Selesai`
  - tombol action lain yang secara jelas menutup modal
- jika modal sedang loading, upload, atau saving, tombol close boleh dinonaktifkan sementara untuk mencegah data rusak
- Escape key behavior harus mengikuti modal baseline global; jika belum ada aturan global untuk Escape, jangan membuat behavior berbeda per halaman
- semua modal baru wajib mengikuti aturan ini
- saat merapikan modal lama, pastikan backdrop click tidak menutup modal
- jangan membuat modal lokal yang punya perilaku close berbeda dari modal baseline

Alasan aturan ini:
- mencegah modal tertutup tidak sengaja
- mencegah input form hilang
- mencegah upload/save terputus
- membuat UX konsisten di semua role: admin, seller, affiliate, buyer, dan public

### 7.2 Scroll modal
Scroll harus:
- nyaman
- tidak mengganggu visual
- scrollbar disembunyikan dengan aman atau dibuat tipis/elegan

### 7.3 Modal baru harus reusable
Jangan membuat popup sekali pakai yang tidak mengikuti shared modal baseline.

---

## 8. Aturan Form Baru

Setiap form baru wajib:
- rapi di mobile dan desktop
- tidak bertumpuk
- tidak overflow
- label dan helper jelas
- error state jelas
- submit CTA jelas

### 8.1 Form jangan terlalu ramai
Kurangi copy yang tidak penting.
Tampilkan hanya informasi yang membantu user mengambil aksi.

### 8.2 Field grouping
Gunakan grouping yang jelas:
- data utama
- detail tambahan
- actions

### 8.3 Validasi
Validasi harus:
- jelas
- tidak membingungkan
- terlihat dekat dengan field terkait bila perlu

---

## 9. Aturan Desain Visual

### 9.1 Benchmark visual
Visual utama harus mengacu pada `projectA`, tetapi:
- **jangan copy code mentah**
- ambil rasa visual, hierarchy, spacing, layout rhythm, dan polish UI

### 9.2 Theme system wajib dipakai
Gunakan layer yang sudah ada:
- `tailwindRuntimeConfig.js`
- `brandConfig.js`
- `designTokens.js`
- `tailwindClasses.js`
- Design Studio runtime config

### 9.3 Jangan hardcode visual sembarangan
Kalau butuh variant baru:
- tambahkan ke shared/theme layer
- jangan hardcode class liar di banyak halaman

### 9.4 Desain harus:
- modern
- rapi
- responsif
- tidak terlalu ramai
- premium tetapi tetap operasional

### 9.5 Animasi
Animasi boleh dipakai, tetapi harus:
- halus
- ringan
- instan
- tidak berlebihan
- tidak mengganggu hydrate / render / rerender

Hindari animasi yang menyebabkan:
- flicker
- layout shift
- lag

---

## 10. Aturan Responsive

Setiap halaman baru wajib aman minimal pada:
- 320px
- 360px
- 390px
- 430px
- 1280px
- 1366px
- 1440px
- 1536px
- 1728px
- 1920px

### 10.1 Tidak boleh ada:
- horizontal overflow liar
- elemen keluar dari card/container
- form bertumpuk tidak wajar
- sticky panel keluar viewport
- metadata penting terpotong
- toolbar terlalu memanjang
- card terlalu stretch di wide-screen

### 10.2 Desktop wide-screen
Gunakan:
- max-width discipline
- main/aside ratio yang masuk akal
- whitespace yang disengaja
- grid yang proporsional

---

## 11. Aturan ID dan Hook Elemen

### 11.1 Prefix id halaman wajib jelas
Setiap halaman baru harus punya prefix unik untuk:
- button
- section
- input
- elemen interaktif utama

Contoh prefix:
- `hr_` untuk auth
- `adm_` untuk admin dashboard
- `adpv_` untuk admin approvals
- `adusr_` untuk admin users
- `adtr_` untuk admin transactions
- `adst_` untuk admin settlements
- `slr_` untuk seller dashboard

### 11.2 Design hooks
Jika elemen dipengaruhi Design Studio, gunakan hook semantik:
- `data-ds="domain.area.element"`

Contoh:
- `data-ds="shell.app.header"`
- `data-ds="catalog.search.input"`
- `data-ds="admin.users.table"`

### 11.3 Jangan menggantungkan identitas pada class visual
Tailwind class bisa berubah. Gunakan:
- `id`
- `data-ds`
- registry Design Studio

---

## 12. Aturan Design Studio Compatibility

Setiap menu baru harus dipikirkan sejak awal:
- apakah elemen ini nanti akan dikontrol oleh Design Studio?
- apakah butuh `data-ds` hook?
- apakah surface/button/search/badge-nya sudah membaca theme layer?

### 12.1 Jika elemen baru termasuk:
- shell-like block
- card/panel
- button utama
- form/search
- badge/status
- section hero
- table toolbar

maka sebaiknya:
- hubungkan ke theme/shared layer
- beri hook `data-ds` bila relevan

---

## 13. Aturan Role & Navigation

### 13.1 Role guard wajib dihormati
Jangan membuat menu baru yang melanggar role guard.

### 13.2 Shell yang benar
Pastikan menu baru hidup di shell yang benar:
- public shell
- app shell

### 13.3 Jangan mencampur konteks role
Seller jangan terasa seperti admin.
Affiliate jangan terasa seperti buyer.
Public jangan bocor ke shell internal.

---

## 14. Aturan Copywriting UI

### 14.1 Jangan terlalu banyak keterangan
UI harus ringkas. Hindari paragraf penjelasan panjang tanpa nilai.

### 14.2 Prioritaskan:
- label jelas
- helper singkat
- CTA yang tegas
- status yang mudah dipahami

### 14.3 Hanya tampilkan copy yang benar-benar membantu
Kalau teks tidak membantu keputusan user, pertimbangkan untuk hapus.

---

## 15. Aturan Error / Empty / Loading State

Semua menu baru harus punya:
- loading state
- empty state
- error state

### 15.1 Loading
- jangan terlalu ramai
- gunakan skeleton/panel yang konsisten

### 15.2 Empty state
- beri arahan yang jelas
- jangan terlalu banyak teks
- CTA bila perlu

### 15.3 Error state
- tampilkan secara jelas
- jangan jatuh diam-diam ke empty state
- gunakan shared alert/hydrate error pattern bila relevan

---

## 16. Checklist Wajib Sebelum Menu Baru Dianggap Selesai

### 16.1 Teknis
- route benar
- manifest/preload benar
- lifecycle benar
- tidak ada fetch langsung di komponen presentasional
- state snapshot/working/runtime dipakai benar
- node check lulus
- tidak ada error JS jelas

### 16.2 UI/UX
- responsive mobile aman
- wide-screen aman
- tidak ada overflow
- tidak ada elemen keluar card
- hierarchy visual jelas
- tombol/action mudah dipahami
- data dinamis/list operasional tampil sebagai tabel secara default
- create/edit memakai modal, bukan form inline utama
- detail penuh dari tabel dibuka lewat modal bila data banyak atau detail panjang
- desain konsisten dengan projectA + shared theme

### 16.3 Integrasi
- role guard tidak rusak
- shell tidak rusak
- Design Studio compatibility dipikirkan
- id prefix halaman sudah ada
- `data-ds` hook dipasang bila relevan

### 16.4 Operasional
- loading/empty/error state ada
- pagination tetap frontend-only bila berupa tabel/list
- first render tetap terasa instan
- hydrate penuh tidak merusak UI

---

## 17. Template Minimum Saat Membuat Menu Baru

Setiap prompt implementasi menu baru sebaiknya menjawab minimal:

1. halaman/route apa yang dibuat
2. role mana yang memakai
3. data source-nya apa
4. snapshot kecilnya apa
5. hydrate penuhnya apa
6. pakai shared component apa saja
7. kalau list operasional, pakai global table system atau tidak
8. kalau modal, pakai modal baseline atau tidak
9. prefix `id` halaman apa
10. apakah perlu `data-ds` hook
11. acceptance criteria visual/responsive apa

---

## 18. Larangan Yang Harus Dihindari

Jangan lakukan ini tanpa alasan sangat kuat:
- membuat route liar di luar pola role
- fetch API langsung di komponen presentasional
- hardcode visual di banyak file
- membuat tabel lokal baru padahal shared table system sudah ada
- membuat list data dinamis sebagai card/button lokal padahal cocok sebagai tabel
- membuat create/edit inline sebagai form utama halaman
- membuat pagination backend baru untuk kebutuhan UI biasa
- membuat side panel/modal baru yang tidak mengikuti modal baseline
- membuat modal yang tertutup lewat backdrop click atau perilaku close lokal yang berbeda dari modal baseline
- membuat state global liar
- membuat desain yang terlalu ramai
- memaksa desktop layout ke mobile
- memaksa mobile layout ke wide-screen
- menghapus pola snapshot → hydrate

---

## 19. Definisi “Menu Baru Yang Benar”
Menu baru dianggap benar jika:
- konsisten dengan arsitektur `projectB`
- konsisten dengan visual benchmark `projectA`
- terasa satu keluarga dengan halaman existing
- instan saat dibuka
- responsif
- mudah dirawat
- tidak membuat pola baru yang liar
- siap di-UAT tanpa perlu tambalan arsitektur tambahan

---

## 20. Status Dokumen
Dokumen ini adalah **acuan utama** untuk pembuatan menu/halaman baru di `projectB`.

Jika ada konflik antara implementasi baru dan dokumen ini, maka:
1. ikuti dokumen ini terlebih dahulu
2. bila memang ada alasan kuat menyimpang, harus dijelaskan secara eksplisit
3. penyimpangan harus kecil, sadar, dan tidak merusak fondasi sistem
