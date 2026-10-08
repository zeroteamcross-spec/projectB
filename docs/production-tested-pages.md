# Daftar Halaman yang Diuji di Production

Tanggal pengujian: 8 Oktober 2026

Metode: Playwright headless melalui browser production.

> Catatan: judul tab browser aplikasi adalah `Siata Mobilindo`. Judul pada tabel adalah judul tampilan halaman.

| Judul halaman | URL | Keterangan | Hasil |
| --- | --- | --- | --- |
| Daftar Tugas | [https://carlynk.id/tasks](https://carlynk.id/tasks) | Halaman publik daftar tugas; tugas Master Inspeksi berstatus `Sip`. | PASS |
| Dashboard Seller | [https://showroom.carlynk.id/seller](https://showroom.carlynk.id/seller) | Dashboard seller berhasil dimuat setelah login. | PASS |
| Master Inspeksi | [https://showroom.carlynk.id/seller/master-inspection](https://showroom.carlynk.id/seller/master-inspection) | CRUD, detail, status aktif/nonaktif, filter, urutan, pagination, responsive, dan salin master antar-cabang. | PASS |
| Inspeksi Kendaraan | [https://showroom.carlynk.id/seller/cars/23/inspection](https://showroom.carlynk.id/seller/cars/23/inspection) | Master cabang digunakan; 7 item berhasil dipilih `Good` dan disimpan. | PASS |
| Inspeksi Kendaraan / Readiness | [https://showroom.carlynk.id/seller/inspection](https://showroom.carlynk.id/seller/inspection) | Daftar readiness inspeksi dan kondisi master kosong diuji. | PASS |
| Kelola Staf | [https://showroom.carlynk.id/seller/staff](https://showroom.carlynk.id/seller/staff) | Akun staff dummy dibuat melalui UI dan tampil aktif. | PASS |
| Dashboard Admin | [https://admin.carlynk.id/admin](https://admin.carlynk.id/admin) | Dashboard admin berhasil dimuat setelah login. | PASS |
| Master Harga | [https://admin.carlynk.id/admin/master-pricing](https://admin.carlynk.id/admin/master-pricing) | Data paket dan kuota staff diperiksa melalui UI Admin. | PASS |
| Master Inspeksi Admin | [https://admin.carlynk.id/admin/master-inspection](https://admin.carlynk.id/admin/master-inspection) | Menu disembunyikan dari sidebar, tetapi halaman dan fungsi lama tetap dapat dibuka langsung. | PASS |
| Login Seller | [https://carlynk.id/login/seller](https://carlynk.id/login/seller) | Login owner dan seller isolation diuji. | PASS |
| Login Admin | [https://carlynk.id/login/admin](https://carlynk.id/login/admin) | Login admin diuji. | PASS |
| Akses Master Inspeksi oleh Staff | [https://showroom.carlynk.id/seller/master-inspection](https://showroom.carlynk.id/seller/master-inspection) | Staff tidak melihat menu dan akses langsung owner diblokir. | PASS |

## Skenario khusus

- Salin master antar-cabang berhasil dengan HTTP `200`.
- Seller tenant lain tidak dapat membaca master tenant target: HTTP `403`.
- Master kosong menampilkan pesan `Master Inspeksi showroom belum dibuat`.
- Halaman mobile tidak mengalami horizontal overflow.
- Hasil smoke test terakhir: `issues: []`, `pageErrors: []`.

## Bukti smoke test

- [showroom_inspection_master_smoke.json](../storage/browser-smoke/showroom_inspection_master_smoke.json)
