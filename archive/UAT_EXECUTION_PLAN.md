# UAT Execution Plan

Dokumen ini menjadi rencana eksekusi UAT bisnis `projectB` pada staging. Jalankan setelah `docs/STAGING_DEPLOYMENT_GUIDE.md` selesai.

## Prasyarat

- [ ] Staging memakai baseline `projectB-v1-staging-ready`.
- [ ] Domain public HTTPS aktif.
- [ ] `MIDTRANS_CALLBACK_URL` public dan sama dengan dashboard Midtrans sandbox.
- [ ] `php scripts/check_environment.php --target=staging --check-db` lulus.
- [ ] Database staging terisi schema canon.
- [ ] Smoke seed tersedia atau data UAT manual siap.

Seed cepat:

```bash
php scripts/seed_smoke_readiness.php
```

## Data Minimum

- 1 admin aktif.
- 1 seller aktif dan approved.
- 1 buyer aktif.
- 1 affiliate admin aktif.
- 1 showroom.
- 1 mobil `published`.
- 1 referral code aktif.
- Midtrans sandbox credential valid.

## Batch 1 - System dan Auth

- [ ] `GET /` HTTP 200.
- [ ] `GET /health` HTTP 200.
- [ ] `GET /api/health` HTTP 200.
- [ ] `POST /api/auth/login` admin.
- [ ] `POST /api/auth/login` seller.
- [ ] `POST /api/auth/login` buyer.
- [ ] `POST /api/auth/login` affiliate admin.
- [ ] `GET /api/users/me` untuk tiap role.
- [ ] Protected endpoint tanpa cookie mengembalikan 401.

## Batch 2 - Admin

| ID | Route/Flow | Expected |
|---|---|---|
| ADM-001 | `GET /api/auth/pending-users` | Admin 200, non-admin 403 |
| ADM-002 | `POST /api/auth/approve-users` | Seller pending menjadi active/approved |
| ADM-003 | `GET /api/admin/cars` | Admin melihat daftar mobil |
| ADM-004 | `PATCH /api/admin/cars/{id}` | Data mobil berubah |
| ADM-005 | `DELETE /api/admin/cars/{id}` | Mobil archived/deleted_at |
| ADM-006 | `GET /api/transactions` | Scope admin valid |
| ADM-007 | `PATCH /api/transactions/{transaction_id}/status` | Status canon valid tersimpan |
| ADM-008 | `PUT/PATCH /api/master-data/{master_key}` | Master non-transaksional tersimpan |
| ADM-009 | DB `transaction_payment_logs` | Payment request/response/callback tercatat |

## Batch 3 - Seller

| ID | Route/Flow | Expected |
|---|---|---|
| SEL-001 | `GET /api/showrooms/me` | Showroom seller tampil |
| SEL-002 | `PATCH /api/showrooms/me` | Showroom berubah |
| SEL-003 | `GET /api/seller/cars` | Hanya mobil seller tampil |
| SEL-004 | `POST /api/seller/cars` | Mobil seller tercipta |
| SEL-005 | `PATCH /api/seller/cars/{id}` | Update mobil sendiri berhasil |
| SEL-006 | `DELETE /api/seller/cars/{id}` | Archive mobil sendiri berhasil |
| SEL-007 | `POST /api/cars/{car_id}/images` | Upload image berhasil |
| SEL-008 | `PATCH /api/cars/{car_id}/images/{image_id}/cover` | Cover berganti |
| SEL-009 | `DELETE /api/cars/{car_id}/images/{image_id}` | Soft delete berhasil |
| SEL-010 | `POST /api/cars/{car_id}/inspection-reports` | Report inspeksi tercipta |
| SEL-011 | `POST /api/inspection-reports/{report_id}/items` | Item inspeksi tercipta |
| SEL-012 | `PATCH /api/inspection-reports/{report_id}/items/{item_id}` | Item berubah |
| SEL-013 | `GET /api/transactions` | Hanya transaksi seller terkait |
| SEL-014 | `GET /api/seller/affiliates` | Affiliate seller tampil |

## Batch 4 - Buyer

| ID | Route/Flow | Expected |
|---|---|---|
| BUY-001 | `POST /api/auth/register` role buyer | Buyer aktif tercipta |
| BUY-002 | `PATCH /api/users/me` | Profile sendiri berubah |
| BUY-003 | `GET /api/cars` | Mobil published tampil |
| BUY-004 | `GET /api/cars?brand_name=Toyota` | Filter berjalan |
| BUY-005 | `GET /api/cars/{id}` | Detail published tampil |
| BUY-006 | `GET /api/cars/{car_id}/images` | Image list tampil |
| BUY-007 | `GET /api/cars/{car_id}/inspection-report` | Report tampil atau 404 terkontrol |
| BUY-008 | `POST /api/transactions` DP | Transaksi pending dan session terbentuk |
| BUY-009 | `POST /api/transactions` full | Transaksi pending dan session terbentuk |
| BUY-010 | `GET /api/transactions` | Hanya transaksi buyer tampil |
| BUY-011 | `GET /api/transactions/{transaction_id}` | Detail sendiri tampil |
| BUY-012 | `POST /api/transactions/{transaction_id}/complete-payment` | Session pelunasan terbentuk |

## Batch 5 - Affiliate

| ID | Route/Flow | Expected |
|---|---|---|
| AFF-001 | `POST /api/affiliate/referral-codes/generate` | Kode unik keluar |
| AFF-002 | `GET /api/affiliate/referral-codes/{referral_code}/validate` | Kode aktif valid |
| AFF-003 | `POST /api/affiliate/clicks` | Click log tercatat |
| AFF-004 | `POST /api/affiliates` | Relasi affiliate terbentuk |
| AFF-005 | `PATCH /api/affiliates/{affiliate_id}/settings` | Setting komisi berubah |
| AFF-006 | `POST /api/affiliates/{affiliate_id}/commission-ledgers` | Ledger tercatat |
| AFF-007 | `GET /api/affiliates/{affiliate_id}/commission-ledgers` | Histori ledger tampil |
| AFF-008 | `GET /api/admin/sellers/{seller_user_id}/affiliates` | Admin/affiliate admin scope valid |

## Batch 6 - Payment Sandbox dan Callback Nyata

1. Login buyer.
2. Buat transaksi DP:

```json
{
  "car_id": 1,
  "payment_type": "dp",
  "dp_amount": 50000000,
  "payment_method": "bca_va"
}
```

3. Simpan `transaction.id`, `payment_session.provider_order_id`, `payment_session.payment_data.bank`, dan `payment_session.payment_data.va_number`.
4. Bayar VA melalui Midtrans sandbox.
5. Tunggu callback nyata ke:

```text
POST /api/payments/midtrans/callbacks
```

6. Cek:

```text
GET /api/transactions/{transaction_id}/status
```

Expected DP sukses:

```text
transaction_status = dp_paid
remaining_amount = car_price - dp_amount
```

7. Cek DB `transaction_payment_logs`:

- `provider_order_id` sama.
- `provider_transaction_id` terisi.
- `transaction_status=settlement` atau `capture`.
- `payload_callback_json` terisi.

## Payment Expected Matrix

| Provider Status | Payment Type | Expected ProjectB Status |
|---|---|---|
| `pending` | `dp` atau `full` | `pending_payment` |
| `settlement` | `dp` | `dp_paid` |
| `capture` | `dp` | `dp_paid` |
| `settlement` | `full` | `paid` |
| `capture` | `full` | `paid` |
| `expire` | `dp` atau `full` | `expired` |
| `cancel` | `dp` atau `full` | `cancelled` |
| `deny` | `dp` atau `full` | `cancelled` |
| `failure` | `dp` atau `full` | `cancelled` |

## Template Hasil

```md
| ID | Role/Area | Result | Notes | Tester | Date |
|---|---|---|---|---|---|
| PAY-001 | payment | PASS | Callback settlement masuk, status dp_paid | QA | 2026-04-16 |
```

## Exit Criteria

- [ ] System/auth baseline PASS.
- [ ] Admin approval dan scope PASS.
- [ ] Seller showroom/cars/images/inspection PASS.
- [ ] Buyer katalog/transaksi/payment PASS.
- [ ] Affiliate referral/click/ledger PASS.
- [ ] Callback nyata Midtrans PASS.
- [ ] Payment log audit tersedia.
- [ ] Tidak ada blocker P0/P1.
