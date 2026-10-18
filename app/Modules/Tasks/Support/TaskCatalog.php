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

    public const ADMIN_MASTER_SIDEBAR_INSPECTION_TASK_DESCRIPTION = 'Periksa mengapa menu Master Inspeksi tidak muncul pada Master Sidebar di akun Admin, karena menu tersebut seharusnya dapat diatur dari sana. Jika terbukti BUG, perbaiki tanpa merusak menu atau role lain, lalu uji visibilitas dan pengaturan menu Admin. Gambar referensi disimpan di Tugas GitIgnore/master-sidebar-inspeksi-reference-2026-10-18.png. Pekerjaan menunggu instruksi Mulai kerjakan tugas.';

    public const BUYER_DESKTOP_USER_NAME_TASK_KEY = 'request-005-buyer-desktop-user-name';

    public const BUYER_DESKTOP_USER_NAME_TASK_TITLE = 'Ubah teks Premium Buyer menjadi nama user yang login di Buyer desktop.';

    public const BUYER_DESKTOP_USER_NAME_TASK_DESCRIPTION = 'Pada halaman Buyer desktop, ganti teks statis Premium Buyer menjadi nama user yang sedang login. Pertahankan tampilan tetap rapi dan fallback yang aman untuk pengguna yang belum login. Pekerjaan menunggu instruksi Mulai kerjakan tugas. Gambar referensi belum dilampirkan.';

    public const ADMIN_MASTER_LOCATION_REGENCIES_TASK_KEY = 'request-006-admin-master-location-regencies';

    public const ADMIN_MASTER_LOCATION_REGENCIES_TASK_TITLE = 'Ambil data kota berdasarkan provinsi untuk Master Lokasi Admin.';

    public const ADMIN_MASTER_LOCATION_REGENCIES_TASK_DESCRIPTION = 'Pada halaman admin/master-location, gunakan data provinsi dari Tugas GitIgnore/provinsi.json, panggil endpoint GET https://wilayah.id/api/regencies/[PROVINCE_CODE].json untuk setiap kode provinsi, lalu gabungkan hasil kota/kabupaten ke Tugas GitIgnore/kota.json dengan code, name, province_code, dan province_name. Data hasil tetap berada di folder yang di-ignore.';

    public const ADMIN_MASTER_LOCATION_POPULATE_TASK_KEY = 'request-007-admin-master-location-populate';

    public const ADMIN_MASTER_LOCATION_POPULATE_TASK_TITLE = 'Isi data Master Location berdasarkan kota.json.';

    public const ADMIN_MASTER_LOCATION_POPULATE_TASK_DESCRIPTION = 'Pada halaman admin/master-location, isi data berdasarkan Tugas GitIgnore/kota.json. Pekerjaan hanya dicatat dan menunggu instruksi persis Mulai kerjakan tugas; jangan melakukan pengisian, CRUD, atau perubahan implementasi sebelum instruksi tersebut diberikan.';
}
