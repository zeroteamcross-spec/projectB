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
}
