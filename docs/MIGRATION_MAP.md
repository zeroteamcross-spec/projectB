# MIGRATION_MAP

## Task board status separation

| Perilaku sebelumnya | Perilaku projectB setelah pemisahan |
|---|---|
| `tasks.status = 'sip'` menandai badge pekerjaan selesai sekaligus membuat tombol konfirmasi nonaktif | `tasks.work_status = 'done'` hanya menandai pekerjaan selesai; `tasks.status = 'sip'` hanya merekam konfirmasi pengguna |
| Satu status dipakai oleh agent dan pemilik task | Perubahan progres agent menggunakan endpoint admin work-status; tombol `Beres` tetap satu-satunya alur konfirmasi pengguna |
| Konfirmasi dari endpoint publik tidak mencatat user ID | Status yang sudah tercatat tanpa user ID dipulihkan ke `open` pada migrasi pemisahan; riwayat `sip` yang memiliki user ID tetap dipertahankan |

Patch database: `scripts/sql/20261022_task_work_status_separation.sql`.
