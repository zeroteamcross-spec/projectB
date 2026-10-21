<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Support;

final class TaskCatalog
{
    public const FIRST_TASK_KEY = 'request-001-transaction-access-and-task-page';

    public const FIRST_TASK_TITLE = 'Sembunyikan Akun Akses pada transaksi dan sediakan halaman daftar tugas.';

    public const FIRST_TASK_DESCRIPTION = 'Pada transactions/new?car_id={id}, sembunyikan card Akun akses beserta tombol Masuk dan Daftar Pembeli. Sediakan halaman khusus berisi daftar permintaan dengan tombol Beres yang mengubah status menjadi sip.';

    public const SHOWROOM_INSPECTION_MASTER_TASK_KEY = 'request-002-showroom-inspection-master';

    public const SHOWROOM_INSPECTION_MASTER_TASK_TITLE = 'Buat Master Inspeksi per cabang showroom dan alur salin master.';

    public const SHOWROOM_INSPECTION_MASTER_TASK_DESCRIPTION = 'Tambahkan Master Inspeksi khusus owner untuk setiap cabang showroom, CRUD item dan status aktif, salin master antar-cabang dengan mode gabung tanpa menghapus data tujuan, lalu gunakan master cabang pada alur inspeksi mobil. Master kosong harus memblokir pengisian dan inspeksi lama wajib dibuat ulang.';

    public const NOTIFICATION_PANEL_DENSITY_TASK_KEY = 'request-003-notification-panel-density';

    public const NOTIFICATION_PANEL_DENSITY_TASK_TITLE = 'Rapikan ukuran font dan card pada panel Notifikasi.';

    public const NOTIFICATION_PANEL_DENSITY_TASK_DESCRIPTION = 'Pada panel Notifikasi, kecilkan font yang terlalu besar, padatkan ukuran card, dan rapikan jarak antar elemen agar daftar lebih nyaman dibaca tanpa mengubah fungsi notifikasi, scroll, atau tombol Lihat semua notifikasi. Gunakan gambar referensi yang disimpan di storage/task-references/.';

    public const ADMIN_MASTER_SIDEBAR_INSPECTION_TASK_KEY = 'request-004-admin-master-sidebar-inspection';

    public const ADMIN_MASTER_SIDEBAR_INSPECTION_TASK_TITLE = 'Periksa dan perbaiki menu Master Inspeksi di Master Sidebar Admin.';

    public const ADMIN_MASTER_SIDEBAR_INSPECTION_TASK_DESCRIPTION = 'BUG diperbaiki: Master Inspeksi kini muncul sebagai child Master pada sidebar dan dapat diatur dari Master Sidebar Admin tanpa menghapus fungsi master inspeksi. Perubahan diuji melalui menu Admin setelah deploy. Referensi: Tugas GitIgnore/master-sidebar-inspeksi-reference-2026-10-18.png.';

    public const BUYER_DESKTOP_USER_NAME_TASK_KEY = 'request-005-buyer-desktop-user-name';

    public const BUYER_DESKTOP_USER_NAME_TASK_TITLE = 'Ubah teks Premium Buyer menjadi nama user yang login di Buyer desktop.';

    public const BUYER_DESKTOP_USER_NAME_TASK_DESCRIPTION = 'Buyer desktop kini memakai nama user yang sedang login pada identitas navigasi dan katalog publik yang sudah terautentikasi, dengan fallback User yang aman. Referensi: Tugas GitIgnore/buyer-desktop-reference-2026-10-18.png.';

    public const ADMIN_MASTER_LOCATION_REGENCIES_TASK_KEY = 'request-006-admin-master-location-regencies';

    public const ADMIN_MASTER_LOCATION_REGENCIES_TASK_TITLE = 'Ambil data kota berdasarkan provinsi untuk Master Lokasi Admin.';

    public const ADMIN_MASTER_LOCATION_REGENCIES_TASK_DESCRIPTION = 'Data provinsi dan kota/kabupaten dibuat ulang dari endpoint resmi wilayah.id: 38 provinsi dibaca dari provinces.json dan setiap kode dipanggil melalui GET https://wilayah.id/api/regencies/[PROVINCE_CODE].json. Hasil 514 kota/kabupaten disimpan dengan code, name, province_code, dan province_name di Tugas GitIgnore/kota.json.';

    public const ADMIN_MASTER_LOCATION_POPULATE_TASK_KEY = 'request-007-admin-master-location-populate';

    public const ADMIN_MASTER_LOCATION_POPULATE_TASK_TITLE = 'Isi data Master Location berdasarkan kota.json.';

    public const ADMIN_MASTER_LOCATION_POPULATE_TASK_DESCRIPTION = 'Master Location diisi melalui browser visible pada halaman admin/master-location berdasarkan Tugas GitIgnore/kota.json. Data digabung dengan data yang sudah ada dan setiap penyimpanan divalidasi melalui respons PUT nyata serta tabel UI.';

    public const ADMIN_MASTER_BRAND_MODAL_UI_TASK_KEY = 'request-008-admin-master-brand-modal-ui';

    public const ADMIN_MASTER_BRAND_MODAL_UI_TASK_TITLE = 'Rapikan modal Edit Brand di Master Brand Admin dan buat responsif.';

    public const ADMIN_MASTER_BRAND_MODAL_UI_TASK_DESCRIPTION = 'Modal Edit Brand dirapikan: deskripsi memakai lebar penuh, model memakai grid responsif, tombol aksi dapat membungkus, dan child model tidak menempel pada kontrol lain. Perubahan divalidasi pada viewport desktop dan mobile. Referensi: Tugas GitIgnore/admin-master-brand-modal-reference-2026-10-18.png.';

    public const ADMIN_MASTER_BRAND_POPULATE_TASK_KEY = 'request-009-admin-master-brand-populate';

    public const ADMIN_MASTER_BRAND_POPULATE_TASK_TITLE = 'Tambahkan brand ke Master Brand berdasarkan brand.json.';

    public const ADMIN_MASTER_BRAND_POPULATE_TASK_DESCRIPTION = 'Master Brand diisi melalui browser visible berdasarkan Tugas GitIgnore/brand.json. Brand yang sudah ada dipertahankan, sedangkan brand sumber yang belum ada ditambahkan bersama model nyata dan divalidasi dari tabel UI serta respons PUT.';

    public const ADMIN_SUBSCRIPTIONS_DUE_CARD_UI_TASK_KEY = 'request-010-admin-subscriptions-due-card-ui';

    public const ADMIN_SUBSCRIPTIONS_DUE_CARD_UI_TASK_TITLE = 'Rapikan card subscriptions due dan ubah text link menjadi tombol.';

    public const ADMIN_SUBSCRIPTIONS_DUE_CARD_UI_TASK_DESCRIPTION = 'Card admin/subscriptions-due dirapikan dengan grid responsif, teks panjang dapat membungkus, action group tidak bertumpuk, dan link bukti/riwayat tampil sebagai kontrol bergaya tombol. Referensi: Tugas GitIgnore/admin-subscriptions-due-card-reference-2026-10-18.png.';

    public const ADMIN_SLIDER_ARCHIVE_BUG_TASK_KEY = 'request-011-admin-slider-archive-bug';

    public const ADMIN_SLIDER_ARCHIVE_BUG_TASK_TITLE = 'Perbaiki BUG slider menghilang setelah diarsipkan.';

    public const ADMIN_SLIDER_ARCHIVE_BUG_TASK_DESCRIPTION = 'Pada halaman admin/sliders, perbaiki BUG ketika slider diarsipkan lalu menghilang seolah-olah terhapus. Pastikan aksi arsip hanya mengubah status menjadi arsip, data tetap tersimpan, dapat dibedakan dari hapus permanen, dan alur daftar/restore tetap aman. Implementasi selesai dan sudah diuji di production; tekan Beres setelah Anda memverifikasi hasil. Tidak ada gambar referensi baru yang terlampir.';

    public const ADMIN_DASHBOARD_IMPERSONATION_CARD_TASK_KEY = 'request-012-admin-dashboard-impersonation-card';

    public const ADMIN_DASHBOARD_IMPERSONATION_CARD_TASK_TITLE = 'Sembunyikan card Impersonation pada Dashboard Admin.';

    public const ADMIN_DASHBOARD_IMPERSONATION_CARD_TASK_DESCRIPTION = 'Pada halaman /admin, sembunyikan card quick action Impersonation agar dashboard lebih ringkas. Fungsi impersonation tetap tersedia melalui User Management, dan layout dashboard harus tetap responsif serta rapi pada desktop dan mobile. Referensi: Tugas GitIgnore/admin-dashboard-impersonation-reference-2026-10-19.png.';

    public const ADMIN_MASTER_BRAND_MODELS_TASK_KEY = 'request-013-admin-master-brand-models';

    public const ADMIN_MASTER_BRAND_MODELS_TASK_TITLE = 'Perbaiki penyimpanan banyak model pada Master Brand.';

    public const ADMIN_MASTER_BRAND_MODELS_TASK_DESCRIPTION = 'Pada halaman admin/master-brand, perbaiki BUG ketika beberapa model ditambahkan berturut-turut tetapi yang tersimpan hanya model terakhir. Nilai model/status yang sudah diisi harus dipertahankan saat baris baru ditambahkan atau dihapus, lalu seluruh model dari Tugas GitIgnore/brand.json harus dapat disimpan sebagai array brand.';

    public const ADMIN_SUBSCRIPTION_PAYMENT_METHODS_TASK_KEY = 'request-014-admin-subscription-payment-methods';

    public const ADMIN_SUBSCRIPTION_PAYMENT_METHODS_TASK_TITLE = 'Atur metode pembayaran pendaftaran showroom dari Master Admin.';

    public const ADMIN_SUBSCRIPTION_PAYMENT_METHODS_TASK_DESCRIPTION = 'Pada halaman daftar-showroom, Admin dapat menentukan apakah pembayaran paket showroom memakai transfer manual, Virtual Account otomatis, atau keduanya. Pengaturan berada pada submenu Master yang dinamis melalui Master Sidebar, tersimpan sebagai master data, tampil sesuai pilihan di UI, dan divalidasi ulang di backend tanpa mengubah metode pembayaran transaksi mobil.';

    public const ADMIN_MASTER_PAYMENT_LABELS_TASK_KEY = 'request-015-admin-master-payment-labels';

    public const ADMIN_MASTER_PAYMENT_LABELS_TASK_TITLE = 'Hapus kata saja dari opsi Master Pembayaran.';

    public const ADMIN_MASTER_PAYMENT_LABELS_TASK_DESCRIPTION = 'Pada halaman admin/master-payment, ubah label Transfer Manual saja menjadi Transfer Manual dan Virtual Account otomatis saja menjadi Virtual Account otomatis tanpa mengubah nilai mode, alur pembayaran, atau fungsi penyimpanan. Referensi: Tugas GitIgnore/admin-master-payment-remove-saja-reference-2026-10-19.png.';

    public const SHOWROOM_PAYMENT_BANK_ICONS_TASK_KEY = 'request-016-showroom-payment-bank-icons';

    public const SHOWROOM_PAYMENT_BANK_ICONS_TASK_TITLE = 'Tampilkan icon bank pada pilihan Virtual Account showroom.';

    public const SHOWROOM_PAYMENT_BANK_ICONS_TASK_DESCRIPTION = 'Pada halaman daftar-showroom, tampilkan icon bank yang sudah tersedia di master pada pilihan BCA, BNI, BRI, dan Mandiri di panel Virtual Account. Referensi: Tugas GitIgnore/daftar-showroom-bank-icons-reference-2026-10-19.png.';

    public const ADMIN_SUBSCRIPTION_NOTIFICATION_PAYMENT_TASK_KEY = 'request-017-admin-subscription-notification-payment';

    public const ADMIN_SUBSCRIPTION_NOTIFICATION_PAYMENT_TASK_TITLE = 'Perbaiki notifikasi pembayaran paket yang tidak menampilkan data.';

    public const ADMIN_SUBSCRIPTION_NOTIFICATION_PAYMENT_TASK_DESCRIPTION = 'Pada notifikasi pembayaran paket pendaftaran baru, saat Admin membuka notifikasi, halaman admin/subscriptions-due harus menampilkan pembayaran paket yang dirujuk oleh notifikasi. Perbaiki pemetaan identifier atau filter data tanpa menghilangkan data pembayaran yang valid. Referensi: Tugas GitIgnore/admin-notification-subscription-payment-missing-reference-2026-10-19.png.';

    public const SHOWROOM_REGISTER_DUPLICATE_EMAIL_TASK_KEY = 'request-018-showroom-register-duplicate-email';

    public const SHOWROOM_REGISTER_DUPLICATE_EMAIL_TASK_TITLE = 'Tolak email showroom yang sudah digunakan.';

    public const SHOWROOM_REGISTER_DUPLICATE_EMAIL_TASK_DESCRIPTION = 'Pada halaman daftar-showroom, jika email login sudah dipakai user lain, pendaftaran showroom harus ditolak dan menampilkan teks merah "Email sudah digunakan" tepat di bawah field Email. Validasi wajib tetap dilakukan di backend. Referensi: Tugas GitIgnore/daftar-showroom-email-used-reference-2026-10-19.png.';

    public const ADMIN_SUBSCRIPTIONS_DUE_AUTO_APPROVE_TASK_KEY = 'request-019-admin-subscriptions-due-auto-approve';

    public const ADMIN_SUBSCRIPTIONS_DUE_AUTO_APPROVE_TASK_TITLE = 'Otomatis approve showroom saat pembayaran paket disetujui.';

    public const ADMIN_SUBSCRIPTIONS_DUE_AUTO_APPROVE_TASK_DESCRIPTION = 'Pembayaran manual yang disetujui dari admin/subscriptions-due harus otomatis mengaktifkan owner showroom tanpa approval kedua di admin/approvals. Pembayaran Virtual Account Midtrans yang menerima callback sukses juga harus langsung dikonfirmasi dan mengaktifkan owner untuk pendaftaran pertama. Pembayaran perpanjangan dan transaksi mobil tidak boleh berubah.';

    public const SELLER_INSPECTION_SUMMARY_DRAFT_TASK_KEY = 'request-020-seller-inspection-summary-draft';

    public const SELLER_INSPECTION_SUMMARY_DRAFT_TASK_TITLE = 'Pertahankan Catatan ringkas saat validasi publish inspeksi gagal.';

    public const SELLER_INSPECTION_SUMMARY_DRAFT_TASK_DESCRIPTION = 'Pada halaman seller/inspection, ketika Catatan ringkas sudah diisi valid tetapi publish kemudian gagal karena Keterangan item "Warna Cat" belum tersedia, nilai Catatan ringkas dan draft form tidak boleh hilang saat pesan validasi tampil. Referensi: Tugas GitIgnore/seller-inspection-summary-reset-reference-2026-10-19.png.';

    public const INSPECTION_MASTER_DESCRIPTION_REQUIRED_TASK_KEY = 'request-021-inspection-master-description-required';

    public const INSPECTION_MASTER_DESCRIPTION_REQUIRED_TASK_TITLE = 'Wajibkan Keterangan saat membuat Master Inspeksi.';

    public const INSPECTION_MASTER_DESCRIPTION_REQUIRED_TASK_DESCRIPTION = 'Field Keterangan pada Master Inspeksi showroom dan admin wajib diisi saat membuat atau mengedit item. Backend menolak nilai kosong atau hanya spasi, frontend menandai field wajib, dan copy antar cabang tidak boleh membuat item tanpa keterangan.';

    public const SELLER_INSPECTION_SUMMARY_REOPEN_TASK_KEY = 'request-022-seller-inspection-summary-reopen';

    public const SELLER_INSPECTION_SUMMARY_REOPEN_TASK_TITLE = 'Selidiki Catatan ringkas kosong saat inspeksi dibuka ulang.';

    public const SELLER_INSPECTION_SUMMARY_REOPEN_TASK_DESCRIPTION = 'Pengguna melaporkan Catatan ringkas kosong saat inspeksi dibuka kembali walau sebelumnya diisi dan disimpan. Uji alur simpan, tutup/buka modal, reload, serta halaman inspeksi per mobil; reproduksi pada mobil dan akun terdampak sebelum menentukan perbaikan. Referensi: Tugas GitIgnore/seller-inspection-summary-empty-reference-2026-10-19.png.';

    public const SELLER_AFFILIATE_DETAIL_CLOSE_TASK_KEY = 'request-023-seller-affiliate-detail-close-button';

    public const SELLER_AFFILIATE_DETAIL_CLOSE_TASK_TITLE = 'Tambahkan tombol tutup pada modal Detail Marketing.';

    public const SELLER_AFFILIATE_DETAIL_CLOSE_TASK_DESCRIPTION = 'Pada halaman seller/affiliates?affiliate_id={id}&mode=detail, tambahkan tombol Tutup yang terlihat dan berfungsi pada modal Detail Marketing agar pengguna dapat menutupnya dengan jelas. Pertahankan fungsi Edit, Copy Link, dan Buka Landing. Referensi: Tugas GitIgnore/seller-affiliate-detail-close-button-reference-2026-10-19.png.';

    public const SHOWROOM_REGISTRATION_CARLYNK_BRANDING_TASK_KEY = 'request-024-showroom-registration-carlynk-branding';

    public const SHOWROOM_REGISTRATION_CARLYNK_BRANDING_TASK_TITLE = 'Ubah favicon dan teks web daftar-showroom menjadi Carlynk.';

    public const SHOWROOM_REGISTRATION_CARLYNK_BRANDING_TASK_DESCRIPTION = 'Pada halaman daftar-showroom, sesuaikan favicon dan teks branding web menjadi Carlynk. Pesan ini tidak menyertakan gambar referensi; tambahkan referensi saat tersedia.';

    public const SELLER_AFFILIATE_PAGES_BUYER_DESIGN_TASK_KEY = 'request-025-seller-affiliate-pages-buyer-design';

    public const SELLER_AFFILIATE_PAGES_BUYER_DESIGN_TASK_TITLE = 'Percantik seluruh halaman Marketing agar seragam dengan desain akun Buyer.';

    public const SELLER_AFFILIATE_PAGES_BUYER_DESIGN_TASK_DESCRIPTION = 'Perbarui tampilan seluruh halaman Marketing/Affiliate agar rapi dan konsisten dengan desain akun Buyer, termasuk halaman daftar, detail, tambah/edit, serta halaman marketing terkait. Pertahankan alur dan fungsi bisnis. Pesan ini tidak menyertakan gambar referensi; tambahkan referensi saat tersedia.';

    public const MAIN_LANDING_HEADER_FLASH_TASK_KEY = 'request-026-main-landing-header-flash';

    public const MAIN_LANDING_HEADER_FLASH_TASK_TITLE = 'Hilangkan header yang berkedip sebelum landing page Carlynk tampil.';

    public const MAIN_LANDING_HEADER_FLASH_TASK_DESCRIPTION = 'Pada root domain utama (/), header publik global sempat muncul sebelum landing page mandiri selesai dimuat. Sembunyikan header shell sejak render awal agar tidak berkedip atau bertumpuk dengan navbar landing page. Header katalog pada root custom domain showroom harus tetap berfungsi. Referensi: Tugas GitIgnore/carlynk-root-header-flash-2026-10-19.png.';

    public const MAIN_DOMAIN_TAB_TITLE_TASK_KEY = 'request-027-main-domain-tab-title';

    public const MAIN_DOMAIN_TAB_TITLE_TASK_TITLE = 'Ubah judul tab halaman utama menjadi carlynk.id.';

    public const MAIN_DOMAIN_TAB_TITLE_TASK_DESCRIPTION = 'Pada landing page root domain carlynk.id, tampilkan judul tab browser "carlynk.id" menggantikan "Siata Mobilindo". Perubahan dibatasi ke landing page domain utama; branding judul tab showroom dan custom domain tetap mengikuti konfigurasi showroom. Referensi: Tugas GitIgnore/carlynk-tab-title-reference-2026-10-20.png.';

    public const SHOWROOM_REGISTRATION_NO_AUTOFILL_CHECK_TASK_KEY = 'request-028-showroom-registration-no-autofill-check';

    public const SHOWROOM_REGISTRATION_NO_AUTOFILL_CHECK_TASK_TITLE = 'Hilangkan autofill pada pendaftaran showroom dan tambahkan tombol cek slug.';

    public const SHOWROOM_REGISTRATION_NO_AUTOFILL_CHECK_TASK_DESCRIPTION = 'Pada halaman daftar-showroom, nonaktifkan pengisian otomatis browser di seluruh form pendaftaran agar field Alamat URL Showroom tidak terisi sendiri. Tambahkan tombol hijau bertuliskan "cek" di samping field tersebut. Implementasi fitur menunggu instruksi pengguna. Referensi: Tugas GitIgnore/daftar-showroom-no-autofill-check-2026-10-20.png.';

    public const SELLER_CAR_IMAGES_REMOVE_COVER_EDIT_TASK_KEY = 'request-029-seller-car-images-remove-cover-edit';

    public const SELLER_CAR_IMAGES_REMOVE_COVER_EDIT_TASK_TITLE = 'Hilangkan tombol Cover dan Edit pada halaman foto mobil showroom.';

    public const SELLER_CAR_IMAGES_REMOVE_COVER_EDIT_TASK_DESCRIPTION = 'Pada halaman seller/cars/{id}/images, hilangkan tombol Cover dan Edit dari tampilan. Implementasi menunggu instruksi pengguna. Pesan ini tidak menyertakan gambar referensi.';

    public const SELLER_CAR_IMAGE_UPLOAD_SAVE_BUTTON_TASK_KEY = 'request-030-seller-car-image-upload-save-button';

    public const SELLER_CAR_IMAGE_UPLOAD_SAVE_BUTTON_TASK_TITLE = 'Ubah tombol Tutup menjadi Simpan pada uploader foto mobil.';

    public const SELLER_CAR_IMAGE_UPLOAD_SAVE_BUTTON_TASK_DESCRIPTION = 'Pada halaman seller/cars/{id}/image, ubah tombol Tutup menjadi Simpan dengan latar hijau dan teks putih, sesuai screenshot referensi Tugas GitIgnore/seller-car-image-upload-save-button-2026-10-20.png. Implementasi menunggu instruksi pengguna.';

    public const SELLER_INSPECTION_SAVE_BUTTON_ALIGNMENT_TASK_KEY = 'request-031-seller-inspection-save-button-alignment';

    public const SELLER_INSPECTION_SAVE_BUTTON_ALIGNMENT_TASK_TITLE = 'Pindahkan tombol Simpan Inspeksi ke kanan bawah.';

    public const SELLER_INSPECTION_SAVE_BUTTON_ALIGNMENT_TASK_DESCRIPTION = 'Pada halaman seller/cars/{id}/inspection, pindahkan tombol Simpan Inspeksi dari kiri bawah ke kanan bawah tanpa mengubah alur penyimpanan. Implementasi menunggu instruksi pengguna. Pesan tidak menyertakan gambar referensi.';

    public const SELLER_CARS_YEAR_ONLY_TASK_KEY = 'request-032-seller-cars-year-only';

    public const SELLER_CARS_YEAR_ONLY_TASK_TITLE = 'Tampilkan tahun saja pada halaman seller/cars.';

    public const SELLER_CARS_YEAR_ONLY_TASK_DESCRIPTION = 'Pada halaman seller/cars, permintaan menyebut mengubah tampilan menjadi tahun saja tanpa bulan dan tanggal. Field atau komponen tanggal yang dimaksud perlu dikonfirmasi sebelum implementasi agar perubahan tepat. Implementasi menunggu instruksi pengguna. Pesan tidak menyertakan gambar referensi.';

    public const SELLER_INSPECTION_SELECTED_OPTION_CONTRAST_TASK_KEY = 'request-033-seller-inspection-selected-option-contrast';

    public const SELLER_INSPECTION_SELECTED_OPTION_CONTRAST_TASK_TITLE = 'Perjelas tampilan pilihan inspeksi yang sedang dipilih.';

    public const SELLER_INSPECTION_SELECTED_OPTION_CONTRAST_TASK_DESCRIPTION = 'Pada halaman seller/cars/{id}/inspection, tebalkan dan tingkatkan keterbacaan teks pilihan inspeksi yang aktif. Beri latar berwarna pada pilihan aktif dengan warna yang mengikuti warna status yang sudah digunakan, serta teks putih. Pertahankan pemetaan warna/status yang ada. Implementasi menunggu instruksi pengguna. Pesan tidak menyertakan gambar referensi.';

    public const SELLER_SHOWROOM_HIDE_VIEW_MODE_TASK_KEY = 'request-034-seller-showroom-hide-view-mode';

    public const SELLER_SHOWROOM_HIDE_VIEW_MODE_TASK_TITLE = 'Hapus tombol Mode lihat showroom pada halaman seller/showroom.';

    public const SELLER_SHOWROOM_HIDE_VIEW_MODE_TASK_DESCRIPTION = 'Pada halaman seller/showroom, hapus kontrol "Mode lihat showroom" (ikon mata) yang ditunjukkan pada screenshot Tugas GitIgnore/seller-showroom-hide-mode-control-2026-10-20.png. Implementasi menunggu instruksi pengguna.';

    public const SELLER_CAR_LISTING_SINGLE_CATALOG_PREVIEW_TASK_KEY = 'request-035-seller-car-listing-single-catalog-preview';

    public const SELLER_CAR_LISTING_SINGLE_CATALOG_PREVIEW_TASK_TITLE = 'Tambahkan tombol Live Preview pada setiap listing mobil seller.';

    public const SELLER_CAR_LISTING_SINGLE_CATALOG_PREVIEW_TASK_DESCRIPTION = 'Pada halaman seller/cars, tambahkan tombol "Live Preview" pada setiap listing mobil. Saat ditekan, tampilkan halaman mobil penuh dengan tampilan seperti katalog publik, tetapi hanya untuk mobil pada listing yang dipilih. Ejaan sudah dikoreksi menjadi "Live Preview" sesuai konfirmasi pengguna. Implementasi menunggu instruksi pengguna. Pesan tidak menyertakan gambar referensi.';

    public const SELLER_INSPECTION_MASTER_ITEM_HEADING_TASK_KEY = 'request-036-seller-inspection-master-item-heading';

    public const SELLER_INSPECTION_MASTER_ITEM_HEADING_TASK_TITLE = 'Ubah label Master Paten Aktif menjadi Master Item Inspeksi Aktif.';

    public const SELLER_INSPECTION_MASTER_ITEM_HEADING_TASK_DESCRIPTION = 'Pada halaman seller/inspection, ubah teks "Master Paten Aktif" menjadi "Master Item Inspeksi Aktif" sesuai screenshot Tugas GitIgnore/seller-inspection-master-item-label-2026-10-20.png. Perubahan hanya pada label; fungsi dan data master inspeksi tetap sama. Implementasi menunggu instruksi pengguna.';

    public const CATALOG_LOCATION_FILTER_SHOW_ALL_CITIES_TASK_KEY = 'request-037-catalog-location-filter-show-all-cities';

    public const CATALOG_LOCATION_FILTER_SHOW_ALL_CITIES_TASK_TITLE = 'Tambahkan pencarian lokasi dan tombol Tampilkan Semua Kota pada katalog mobil.';

    public const CATALOG_LOCATION_FILTER_SHOW_ALL_CITIES_TASK_DESCRIPTION = 'Pada filter lokasi di katalog mobil, tambahkan pencarian kota, tampilkan hanya sebagian kota pada kondisi awal, sembunyikan sisanya, dan sediakan tombol "Tampilkan Semua Kota" untuk membuka daftar lengkap. Jumlah atau aturan pemilihan kota yang tampil awal perlu dipastikan sebelum implementasi. Sesuai screenshot Tugas GitIgnore/catalog-location-filter-show-all-cities-2026-10-20.png. Implementasi menunggu instruksi pengguna.';

    public const SELLER_AFFILIATES_PROSPECT_EXPLANATION_TASK_KEY = 'request-038-seller-affiliates-prospect-explanation';

    public const SELLER_AFFILIATES_PROSPECT_EXPLANATION_TASK_TITLE = 'Jelaskan asal, dasar perhitungan, dan cara mendapatkan Prospek di seller/affiliates.';

    public const SELLER_AFFILIATES_PROSPECT_EXPLANATION_TASK_DESCRIPTION = 'Pada halaman seller/affiliates, jelaskan dari sumber data mana angka Prospek berasal, aturan atau kriteria apa yang dihitung, serta bagaimana prospek diperoleh. Jawaban harus ditelusuri dari implementasi dan alur data aplikasi, bukan asumsi. Jangan mengubah perilaku fitur. Penelusuran menunggu instruksi pengguna. Pesan tidak menyertakan gambar referensi.';

    public const SELLER_MASTER_INSPECTION_SECTION_GROUPING_ORDER_TASK_KEY = 'request-039-seller-master-inspection-section-grouping-order';

    public const SELLER_MASTER_INSPECTION_SECTION_GROUPING_ORDER_TASK_TITLE = 'Kelompokkan dan urutkan item Master Inspeksi berdasarkan section.';

    public const SELLER_MASTER_INSPECTION_SECTION_GROUPING_ORDER_TASK_DESCRIPTION = 'Pada halaman seller/master-inspection, ikat urutan item inspeksi ke section masing-masing dan tampilkan item secara berkelompok berdasarkan section agar lebih mudah dikelola. Implementasi menunggu instruksi pengguna. Pesan tidak menyertakan gambar referensi.';

    public const LANDING_LEGAL_PAGES_SOCIAL_LINKS_TASK_KEY = 'request-040-landing-legal-pages-social-links';

    public const LANDING_LEGAL_PAGES_SOCIAL_LINKS_TASK_TITLE = 'Buat halaman Syarat & Ketentuan dan Kebijakan Privasi pada Landingpage.';

    public const LANDING_LEGAL_PAGES_SOCIAL_LINKS_TASK_DESCRIPTION = 'Pada Landingpage, buat halaman Syarat & Ketentuan dan Kebijakan Privasi, lalu arahkan text link masing-masing ke halaman yang sesuai. Buat tautan Facebook dan Instagram tidak dapat diklik karena akun/tautannya belum tersedia. Implementasi menunggu instruksi pengguna. Pesan tidak menyertakan gambar referensi.';

    public const LANDING_ACTIVE_PACKAGE_PRICING_TASK_KEY = 'request-041-landing-active-package-pricing';

    public const LANDING_ACTIVE_PACKAGE_PRICING_TASK_TITLE = 'Tampilkan harga paket aktif di Landingpage dan pertahankan paket yang dipilih.';

    public const LANDING_ACTIVE_PACKAGE_PRICING_TASK_DESCRIPTION = 'Pada Landingpage, hubungkan text link Harga ke daftar harga paket yang sedang aktif. Buat desain daftar harga yang responsif, kontras dan jelas, selaras dengan tema Landingpage. Tombol pada setiap paket harus menuju pendaftaran sambil mempertahankan pilihan paket agar otomatis terpilih pada formulir. Implementasi menunggu instruksi pengguna. Pesan tidak menyertakan gambar referensi.';

    public const LANDING_SIGNUP_HEADER_FLASH_TASK_KEY = 'request-042-landing-signup-header-flash';

    public const LANDING_SIGNUP_HEADER_FLASH_TASK_TITLE = 'Cari penyebab dan perbaiki glitch header saat klik Daftar di Landingpage.';

    public const LANDING_SIGNUP_HEADER_FLASH_TASK_DESCRIPTION = 'Pada Landingpage, saat tombol Daftar diklik, header global SIATA MOBILINDO sempat muncul sebelum halaman tujuan tampil. Telusuri penyebab glitch tersebut dan perbaiki tanpa merusak tujuan/alur pendaftaran. Screenshot referensi: Tugas GitIgnore/landing-daftar-header-flash-2026-10-20.png. Diagnosis dan implementasi menunggu instruksi pengguna.';

    public const SHOWROOM_REGISTRATION_COPY_PAYMENT_FIELDS_TASK_KEY = 'request-043-showroom-registration-copy-payment-fields';

    public const SHOWROOM_REGISTRATION_COPY_PAYMENT_FIELDS_TASK_TITLE = 'Tambahkan tombol salin untuk Jumlah Transfer dan Nomor Rekening saat daftar showroom.';

    public const SHOWROOM_REGISTRATION_COPY_PAYMENT_FIELDS_TASK_DESCRIPTION = 'Pada halaman daftar-showroom, tambahkan tombol copy untuk nilai Jumlah Transfer dan Nomor Rekening pada informasi pembayaran paket, sesuai screenshot Tugas GitIgnore/daftar-showroom-copy-payment-fields-2026-10-20.png. Masing-masing tombol menyalin nilai field yang sesuai. Implementasi menunggu instruksi pengguna.';

    public const GOOGLE_SELLER_PENDING_APPROVAL_SWITCH_ACCOUNT_ERROR_TASK_KEY = 'request-044-google-pending-approval-switch-account-error';

    public const GOOGLE_SELLER_PENDING_APPROVAL_SWITCH_ACCOUNT_ERROR_TASK_TITLE = 'Perbaiki error saat keluar atau mengganti akun dari persetujuan Google seller.';

    public const GOOGLE_SELLER_PENDING_APPROVAL_SWITCH_ACCOUNT_ERROR_TASK_DESCRIPTION = 'Pada halaman google-login/complete?status=pending_approval&role=seller, klik tombol "Keluar / Gunakan Akun Lain" menampilkan error "Cannot read properties of null (reading \'user\')". Perbaiki alur keluar/ganti akun agar menangani sesi atau user null dengan aman, membersihkan sesi yang benar, dan mengarahkan pengguna ke login tanpa error. Referensi: Tugas GitIgnore/google-pending-approval-switch-account-error-2026-10-20.png. Implementasi menunggu instruksi pengguna.';

    public const BUYER_TRANSACTION_TRANSFER_PROOF_UPLOAD_TASK_KEY = 'request-045-buyer-transaction-transfer-proof-upload';

    public const BUYER_TRANSACTION_TRANSFER_PROOF_UPLOAD_TASK_TITLE = 'Perbaiki upload bukti transfer pada detail transaksi Buyer.';

    public const BUYER_TRANSACTION_TRANSFER_PROOF_UPLOAD_TASK_DESCRIPTION = 'Pada halaman buyer/transactions/{id}, Buyer tidak dapat mengunggah bukti transfer melalui form file (JPG, PNG, atau PDF, maksimal 5 MB) sesuai screenshot Tugas GitIgnore/buyer-transaction-transfer-proof-upload-2026-10-20.png. Telusuri penyebab dan perbaiki agar file valid dapat diunggah serta ditautkan ke transaksi yang sesuai, dengan validasi akses transaksi, tipe, dan ukuran file yang aman. Implementasi menunggu instruksi pengguna.';

    public const BUYER_TRANSACTION_MANUAL_PAYMENT_INSTRUCTIONS_TASK_KEY = 'request-046-buyer-transaction-manual-payment-instructions';

    public const BUYER_TRANSACTION_MANUAL_PAYMENT_INSTRUCTIONS_TASK_TITLE = 'Sesuaikan instruksi transaksi Buyer dengan metode pembayaran yang dipilih.';

    public const BUYER_TRANSACTION_MANUAL_PAYMENT_INSTRUCTIONS_TASK_DESCRIPTION = 'Pada halaman buyer/transactions/{id}, Buyer memilih pembayaran manual, tetapi halaman justru menampilkan instruksi pembayaran otomatis (VA/QRIS/GoPay, batas waktu, dan refresh otomatis) seperti pada screenshot Tugas GitIgnore/buyer-transaction-manual-payment-instructions-2026-10-20.png. Selidiki penyebab dan pastikan instruksi serta status yang tampil sesuai metode pembayaran transaksi; jangan mengubah alur otomatis untuk transaksi yang memang memakai metode otomatis. Implementasi menunggu instruksi pengguna.';

    public const BUYER_NOTIFICATION_BLOCKED_PAGES_TASK_KEY = 'request-047-buyer-notification-blocked-pages';

    public const BUYER_NOTIFICATION_BLOCKED_PAGES_TASK_TITLE = 'Periksa dua halaman yang terblokir saat Buyer memilih Notif.';

    public const BUYER_NOTIFICATION_BLOCKED_PAGES_TASK_DESCRIPTION = 'Pada halaman notifications akun Buyer, ketika memilih halaman "Notif", pengguna melaporkan dua halaman ikut terblokir, padahal seharusnya hanya halaman Notif yang terblokir. Reproduksi perilaku, identifikasi halaman kedua yang terdampak, lalu perbaiki cakupan blokir agar hanya berlaku pada halaman yang dimaksud tanpa mengganggu navigasi Buyer lainnya. Gambar referensi tidak terlampir. Implementasi menunggu instruksi pengguna.';

    public const BUYER_CATALOG_REDIRECT_TO_MAIN_LANDING_TASK_KEY = 'request-048-buyer-catalog-redirects-to-main-landing';

    public const BUYER_CATALOG_REDIRECT_TO_MAIN_LANDING_TASK_TITLE = 'Perbaiki redirect Katalog Buyer yang melewati atau berhenti di landingpage utama.';

    public const BUYER_CATALOG_REDIRECT_TO_MAIN_LANDING_TASK_DESCRIPTION = 'Pada akun Buyer, saat memilih halaman "Katalog", navigasi lebih dulu dilempar ke landingpage utama https://carlynk.id/ sebelum menuju halaman showroom. Lebih parah, dari halaman "Notif" lalu memilih "Katalog", pengguna justru berakhir di https://carlynk.id/. Reproduksi kedua skenario, telusuri penyebab navigasi, dan pastikan Katalog membuka showroom yang benar secara langsung, termasuk saat berpindah dari Notif, tanpa transit atau berakhir di landingpage utama. Gambar referensi tidak terlampir. Implementasi menunggu instruksi pengguna.';

    public const SHOWROOM_MANUAL_OFFLINE_TRANSACTION_CONTINUATION_TASK_KEY = 'request-049-showroom-manual-offline-transaction-continuation';

    public const SHOWROOM_MANUAL_OFFLINE_TRANSACTION_CONTINUATION_TASK_TITLE = 'Izinkan showroom melanjutkan transaksi secara manual untuk pembayaran offline.';

    public const SHOWROOM_MANUAL_OFFLINE_TRANSACTION_CONTINUATION_TASK_DESCRIPTION = 'Tambahkan fitur pada akun showroom untuk memproses transaksi secara manual ketika pembayaran terjadi offline: showroom dapat mencatat/menangani booking dan melanjutkan proses transaksi yang sudah berstatus booked, sehingga transaksi dapat terus berjalan tanpa pembayaran online. Telusuri alur status dan validasi yang ada saat implementasi agar pencatatan manual konsisten dan tidak mengubah alur pembayaran online. Gambar referensi tidak terlampir. Implementasi menunggu instruksi pengguna.';

    public const ADMIN_WEB_CONFIGURATION_MENU_TASK_KEY = 'request-050-admin-web-configuration-menu';

    public const ADMIN_WEB_CONFIGURATION_MENU_TASK_TITLE = 'Tambahkan menu Konfigurasi WEB pada akun Admin.';

    public const ADMIN_WEB_CONFIGURATION_MENU_TASK_DESCRIPTION = 'Tambahkan menu bernama "Konfigurasi WEB" pada level akun Admin. Rincian pengaturan yang harus tersedia belum ditentukan; sebelum mengimplementasikan isi/fungsi menu, konfirmasi ruang lingkup kepada pengguna. Permintaan dicatat sebagai backlog saja dan menunggu instruksi "mulai kerjakan semua tugas". Tidak ada gambar referensi yang terlampir.';
}
