# Hardening Test Fixes Images Inspection

Tanggal: 2026-06-01

## 1. Ringkasan Failure

`php tests/run.php` sebelumnya menghasilkan 11 pass dan 2 fail:

- `ImagesHardeningTest`: expected `scanned = 1`, actual `scanned = 2`.
- `InspectionHardeningTest`: expected validation key `items.0.item_name`, actual `items.0.template_id`.

## 2. Root Cause ImagesHardeningTest

Failure berasal dari fixture test yang time-dependent. Data `recent.jpg` memakai `deleted_at = 2026-04-10 00:00:00`. Pada tanggal berjalan 2026-06-01, tanggal itu sudah lebih lama dari retention 30 hari, sehingga cleanup job benar menghitung dua soft-deleted images sebagai expired.

Runtime image repository sudah memfilter active list dengan `deleted_at IS NULL`. Cleanup job memang hanya mengambil `deleted_at IS NOT NULL AND deleted_at < cutoff`.

## 3. Fix ImagesHardeningTest

Fixture cleanup dibuat relatif terhadap waktu berjalan:

- expired image: `now - 60 days`.
- recent soft-deleted image: `now - 5 days`.
- active image: `deleted_at = NULL`.

Kontrak test tetap sama: cleanup hanya memproses soft-deleted image yang melewati retention.

## 4. Root Cause InspectionHardeningTest

Test masih memakai kontrak lama yang mengizinkan custom `item_name` saat create report/item. Canon terbaru di `SCHEMA_CANON.md` menetapkan `inspection_templates` sebagai source of truth dan `inspection_report_items.template_id` sebagai FK ke master inspection. Seller flow saat ini membuat checklist dari master template dan mengirim `template_id`.

## 5. Fix InspectionHardeningTest

Assertion validation diselaraskan ke kontrak canon:

- create report item tanpa template harus error pada `items.0.template_id`.
- create item tanpa template harus error pada `template_id`.

Mapper response juga menambahkan alias human-readable `item_name` dari `item_name_snapshot` atau template name, sambil tetap mempertahankan `template_id`, `item_name_snapshot`, dan nested `template`.

## 6. API Contract Final Images

Car image list:

- hanya mengembalikan `car_images.deleted_at IS NULL`.
- urutan: `is_cover DESC`, `sort_order ASC`, `id ASC`.
- item membawa `id`, `car_id`, `user_id`, `file_path`, `file_name`, `file_size`, `mime_type`, `sort_order`, `is_cover`, `created_at`, `updated_at`.

Cleanup deleted images:

- hanya memindai soft-deleted images dengan `deleted_at < cutoff`.
- tidak menghapus record database pada cleanup ini; job hanya mencoba menghapus file fisik dan menulis log.

## 7. API Contract Final Inspection

Create report/create item:

- wajib memakai `template_id` yang merujuk master `inspection_templates`.
- `result_status` wajib salah satu `good`, `fair`, `bad`, `not_available`.
- `item_name_snapshot` disimpan dari master template saat report/item dibuat.

Inspection item response:

- tetap membawa `template_id` sebagai identifier canon.
- membawa `item_name_snapshot` sebagai snapshot historis.
- membawa `item_name` sebagai label human-readable backward-compatible.
- membawa nested `template` saat template join tersedia.

## 8. Files Changed

- `tests/Unit/ImagesHardeningTest.php`
- `tests/Unit/InspectionHardeningTest.php`
- `app/Modules/Inspection/Mappers/InspectionMapper.php`
- `docs/HARDENING_TEST_FIXES_IMAGES_INSPECTION.md`

## 9. Verification Result

- `php -l tests/Unit/ImagesHardeningTest.php`: pass.
- `php -l tests/Unit/InspectionHardeningTest.php`: pass.
- `php -l app/Modules/Inspection/Mappers/InspectionMapper.php`: pass.
- `php tests/run.php`: 13 passed, 0 failed.
- `node --check`: tidak diperlukan jika tidak ada JS berubah.
- browser smoke: tidak diperlukan karena tidak ada UI berubah.

## 10. Follow-up

Tidak ada follow-up schema. Bila API contract inspection ditulis lebih detail di dokumen endpoint terpisah nanti, cantumkan `item_name` sebagai alias response dan `template_id` sebagai input canon.
