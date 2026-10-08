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
}
