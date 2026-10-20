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
}
