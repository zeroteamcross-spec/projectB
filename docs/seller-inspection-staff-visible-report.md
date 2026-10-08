# Laporan Pengujian Visible Browser — Seller Inspeksi, Inspeksi Kendaraan, dan Staf

Tanggal: 8 Oktober 2026<br>
Target utama: `https://showroom.carlynk.id/`<br>
Application commit saat final run: `79495580f7abd693a2cf83a2f5947b7a0155ba08`

## 1. Status Browser

- Engine: Chromium standalone melalui Node.js Playwright.
- Node.js: `v22.23.2`.
- Playwright: `1.59.1`.
- Mode: `headless: false`.
- Task: 1.
- Browser: 1.
- Context terisolasi: 1.
- Page utama: 1.
- Browser terlihat dan sengaja tetap terbuka setelah pengujian.
- Seluruh tindakan memakai locator Playwright yang visible, berada di viewport, enabled saat dioperasikan, dan tanpa `force` atau `dispatchEvent`.

## 2. Halaman yang Diuji

Semua halaman berikut memakai title `Siata Mobilindo` pada browser.

| Halaman | URL | Peran / hasil |
| --- | --- | --- |
| Login seller | `https://showroom.carlynk.id/login/seller` | Owner, staff, dan verifikasi logout |
| Profil | `https://showroom.carlynk.id/profile` | Verifikasi identitas dan logout owner |
| Dashboard seller | `https://showroom.carlynk.id/seller` | Owner dan staff |
| Seller Inspeksi / Readiness | `https://showroom.carlynk.id/seller/inspection` | Owner dan staff, visible |
| Inspeksi Kendaraan | `https://showroom.carlynk.id/seller/cars/23/inspection` | Owner dan staff, visible |
| Kelola Staf | `https://showroom.carlynk.id/seller/staff` | Owner visible; request staff diarahkan ke `/seller` |
| Master Inspeksi | `https://showroom.carlynk.id/seller/master-inspection` | Request staff ditolak dan diarahkan ke `/seller` |

## 3. Langkah dan Hasil Aktual

| Langkah | Status | Hasil aktual |
| --- | --- | --- |
| Login owner | PASS | Form visible diisi seperti manusia; dashboard dan identitas akun tampil. |
| Readiness seller | PASS | Satu mobil visible: `Toyota Avanza`, ID `23`, nomor `QA-INSP-9991`; panel master tampil. Filter `Toyota` dan reset filter bekerja. |
| Checklist pada readiness | PASS | Form existing terbuka dengan 9 item visible. Ringkasan, kondisi item, dan catatan item diubah melalui input visible; simpan HTTP `200`; publish menghasilkan status `Published`. |
| Inspeksi Kendaraan direct URL | PASS | 9 item visible; kondisi dan catatan item diubah dengan input manusia; `Simpan Inspeksi` HTTP `200` dan alur bisnis mem-publish inspeksi. Tidak ada tombol publish terpisah pada alur direct. |
| Kelola Staf owner | PASS | Tiga kartu staf visible; data existing dipakai secara bermakna. Kuota visible stabil `3/3`, sehingga tombol `Tambah Staf` disabled dan create tidak dipaksakan. Edit HTTP `200`, `Nonaktifkan` HTTP `200`, status `Nonaktif` visible, `Aktifkan` HTTP `200`, lalu status akhir `Aktif` visible. |
| Responsive Kelola Staf | PASS | Viewport `390x844`; tidak ada horizontal overflow (`scrollWidth` tidak melebihi lebar viewport). |
| Logout owner | PASS | Logout dikonfirmasi melalui modal visible dan form login kembali tampil. |
| Login staff | PASS | Login dilakukan setelah logout owner; dashboard dan identitas staff tampil. |
| Guard owner-only | PASS | Staff tidak dapat membuka `/seller/staff` maupun `/seller/master-inspection`; keduanya berakhir di `/seller`, dan halaman owner-only tidak tampil. |
| Akses inspeksi oleh staff | PASS | Staff dapat membuka readiness `/seller/inspection` dan direct inspection `/seller/cars/23/inspection`; tombol simpan inspection visible. Sidebar Master Inspeksi tidak tampil untuk staff. |

## 4. Batasan CRUD yang Tervalidasi

- Data create staf sudah tersedia dan tampil pada UI, tetapi create tidak diulang pada final run karena kuota visible sudah penuh `3/3`. Guard tombol `Tambah Staf` juga terlihat disabled; tidak ada tindakan tersembunyi atau bypass quota.
- Pada checklist readiness, report sudah ada sehingga tombol create draft tidak muncul. Read, update, save, dan publish tervalidasi nyata pada report existing.
- Tidak ada hard-delete destruktif pada inspection report atau staf. Perilaku bisnis yang tersedia adalah status `draft/completed/published` untuk report dan `Nonaktifkan/Aktifkan` untuk staf.
- CRUD Master Inspeksi owner telah dilaporkan terpisah pada [laporan Master Inspeksi](master-inspection-visible-crud-report.md); pada run ini akses Master Inspeksi oleh staff diuji sebagai owner-only guard.

## 5. Bug yang Ditemukan dan Perbaikan

Pada pemeriksaan awal, textarea catatan item di halaman direct inspection melakukan re-render setiap event `input`, sehingga ketikan manusia dapat hilang. Perilaku ini diperbaiki dengan draft catatan sementara tanpa mengganti DOM pada setiap karakter. Final run visible kemudian berhasil mengetik, memvalidasi nilai input, menyimpan, dan mem-publish tanpa masalah.

## 6. Error Console dan Request

- `pageErrors`: `0`.
- Tiga response `GET /api/auth/autologin` HTTP `401` tercatat saat halaman login memeriksa session yang belum ada; semuanya ditandai expected dan tidak menghambat login.
- Satu `net::ERR_ABORTED` untuk asset root `app.js` tercatat ketika navigasi segera berpindah dari root ke login; ditandai expected oleh runner.
- Tidak ada console error, page error, atau failed request tak terduga pada final run.

## 7. Bukti Pengujian

- [Screenshot hasil akhir](../storage/browser-smoke/seller-inspection-staff-visible-final.png)
- [Screenshot kegagalan historis sebelum perbaikan input catatan](../storage/browser-smoke/seller-inspection-staff-visible-failure.png)
- [Log JSON lengkap](../storage/browser-smoke/seller-inspection-staff-visible.json)
- [Runner Playwright visible](../scripts/seller_inspection_staff_visible_test.mjs)

## 8. Status Akhir

**PASSED** untuk seluruh alur dan kontrol yang tersedia pada state production yang visible. Sepuluh langkah final runner berstatus `PASS`, browser benar-benar berjalan visible, tidak ada `pageerror`, dan data meaningful tetap disisakan pada aplikasi.
