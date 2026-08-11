-- Menghapus menu "Design Studio" dari sidebar Admin.
--
-- Menu ini datang dari master data app.sidebar, bukan dari ADMIN_LINKS di
-- layout/sidebar.js -- daftar di berkas itu hanya cadangan saat master datanya
-- kosong, dan Design Studio memang tidak ada di sana. Jadi menghapusnya harus
-- lewat baris master data ini.
--
-- JSON_SEARCH mencari posisi item yang key-nya admin.design_studio, lalu
-- JSON_REMOVE membuang seluruh elemen array pada posisi itu. Klausa WHERE
-- memastikan pernyataan ini tidak melakukan apa-apa kalau itemnya memang sudah
-- tidak ada, sehingga aman dijalankan ulang.

UPDATE master_data
SET data_json = JSON_REMOVE(
        data_json,
        REPLACE(
            JSON_UNQUOTE(JSON_SEARCH(data_json, 'one', 'admin.design_studio', NULL, '$.items[*].key')),
            '.key',
            ''
        )
    ),
    updated_at = NOW()
WHERE master_key = 'app.sidebar'
  AND deleted_at IS NULL
  AND JSON_SEARCH(data_json, 'one', 'admin.design_studio', NULL, '$.items[*].key') IS NOT NULL;
