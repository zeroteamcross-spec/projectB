# Production Caveats

Dokumen ini mencatat batasan yang harus dipahami sebelum `projectB` dipromosikan dari staging/UAT ke production.

## Bukan Production Checklist

Dokumen staging saat ini menyiapkan UAT dan staging nyata. Production membutuhkan keputusan tambahan, terutama untuk payment, data migration, backup, monitoring, dan security hardening.

## Payment

- Staging memakai Midtrans sandbox.
- Production wajib mengganti credential ke production dan `MIDTRANS_IS_PRODUCTION=true`.
- `MIDTRANS_VERIFY_SIGNATURE=true` tidak boleh dimatikan.
- Callback production wajib public HTTPS.
- Belum ada retry queue untuk callback/payment provider.
- Belum ada endpoint manual cancel/refund/status inquiry sebagai fitur bisnis.
- Status inquiry manual saat ini hanya tooling lokal/dev.

## Data dan Migration

- Schema canon ada di `docs/SCHEMA_CANON.md`, tetapi production migration plan harus memastikan data legacy dipindahkan dengan mapping yang benar.
- Struktur lama `projectA` tidak boleh disalin mentah.
- Migrasi file fisik image lama belum dicakup dalam staging docs.
- Reservasi stok/listing otomatis saat transaksi dibuat belum ada.

## Security

- Pastikan `.env` tidak public.
- Pastikan `APP_DEBUG=false`.
- Pastikan cookie secure aktif di HTTPS.
- Pastikan storage upload tidak mengeksekusi file sebagai script.
- Pastikan web root hanya `public`.
- Pastikan credential smoke tidak ada di production.

## Operations

- Perlu monitoring web server error log.
- Perlu backup DB production.
- Perlu prosedur restore DB.
- Perlu observability payment callback.
- Perlu jadwal cleanup image yang disetujui.

## UAT Exit Sebelum Production Candidate

- [ ] Semua UAT role utama PASS atau caveat diterima owner.
- [ ] Callback nyata staging PASS.
- [ ] Payment log audit PASS.
- [ ] Invalid signature ditolak.
- [ ] Image upload/delete/cleanup PASS.
- [ ] No P0/P1 open.
- [ ] Owner menyetujui caveat transaksi dan stock reservation.
