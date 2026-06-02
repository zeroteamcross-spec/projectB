# SMOKE_TEST_CHECKLIST.md

## Tujuan
Dokumen ini digunakan untuk smoke test baseline `projectB` pada environment local, UAT, atau staging.

Base URL contoh:
`http://projectb.test`

Status hasil:
- PASS
- FAIL
- BLOCKED
- N/A

---

## 1. Public & System

| ID | Test Case | Method | URL | Expected |
|---|---|---|---|---|
| ST-001 | Root route | GET | `/` | HTTP 200, `success=true`, app berjalan |
| ST-002 | Health route | GET | `/health` | HTTP 200, `status=ok`, ada timestamp |
| ST-003 | Public cars catalog | GET | `/api/cars` | HTTP 200, daftar mobil tampil, pagination ada |
| ST-004 | Inspection templates | GET | `/api/inspection-templates` | HTTP 200, daftar template inspeksi tampil |

---

## 2. Auth

| ID | Test Case | Method | URL | Expected |
|---|---|---|---|---|
| ST-010 | Login admin | POST | `/api/auth/login` | HTTP 200, login sukses |
| ST-011 | Login seller | POST | `/api/auth/login` | HTTP 200, login sukses |
| ST-012 | Login buyer | POST | `/api/auth/login` | HTTP 200, login sukses |
| ST-013 | Register buyer | POST | `/api/auth/register` | Buyer baru tercipta |
| ST-014 | Register seller | POST | `/api/auth/register` | Seller dan showroom tercipta |
| ST-015 | Current profile | GET | `/api/users/me` | Profil user login tampil |
| ST-016 | Pending users | GET | `/api/auth/pending-users` | Admin 200, non-admin 403 |
| ST-017 | Approve users | POST | `/api/auth/approve-users` | Admin 200, non-admin 403 |

### Sample payload login
```json
{
  "email": "admin@projectb.local",
  "password": "YOUR_ADMIN_PASSWORD"
}
```

### Sample payload register buyer
```json
{
  "role": "buyer",
  "name": "Buyer Baru",
  "phone_number": "081234567001",
  "email": "buyerbaru@example.test",
  "password": "Password123!",
  "address": "Bandung"
}
```

### Sample payload register seller
```json
{
  "role": "seller",
  "name": "Seller Baru",
  "phone_number": "081234567002",
  "email": "sellerbaru@example.test",
  "password": "Password123!",
  "address": "Jakarta",
  "showroom": {
    "name": "Showroom Baru",
    "address": "Jl. Contoh No. 1",
    "phone_number": "081234567003",
    "bank_account_number": "1234567890",
    "bank_type": "BCA",
    "bank_account_name": "Seller Baru"
  }
}
```

---

## 3. Users & Showrooms

| ID | Test Case | Method | URL | Expected |
|---|---|---|---|---|
| ST-020 | Show my profile | GET | `/api/users/me` | Profil tampil |
| ST-021 | Update user profile | PATCH | `/api/users/me` | Data user berubah |
| ST-022 | Get my showroom | GET | `/api/showrooms/me` | Seller 200 |
| ST-023 | Update my showroom | PATCH | `/api/showrooms/me` | Data showroom berubah |
| ST-024 | Show showroom by id | GET | `/api/showrooms/{id}` | Scope benar, unauthorized 403 |

### Sample payload update showroom
```json
{
  "name": "Showroom Updated",
  "address": "Jl. Update No. 123",
  "phone_number": "081200000000",
  "bank_account_number": "999888777",
  "bank_type": "Mandiri",
  "bank_account_name": "PT Showroom Updated"
}
```

---

## 4. Cars

| ID | Test Case | Method | URL | Expected |
|---|---|---|---|---|
| ST-030 | List public cars | GET | `/api/cars` | Daftar mobil publik tampil |
| ST-031 | Filter cars by brand | GET | `/api/cars?brand_name=Toyota` | Hanya brand terkait |
| ST-032 | Get car detail | GET | `/api/cars/{id}` | Detail mobil tampil |
| ST-033 | Seller list own cars | GET | `/api/seller/cars` | Hanya mobil milik seller |
| ST-034 | Admin list all cars | GET | admin cars endpoint | Admin melihat semua |
| ST-035 | Create car | POST | `/api/seller/cars` atau `/api/admin/cars` | Mobil baru tercipta |
| ST-036 | Update car | PATCH | `/api/seller/cars/{id}` atau `/api/admin/cars/{id}` | Mobil ter-update |
| ST-037 | Archive car | DELETE | `/api/seller/cars/{id}` atau `/api/admin/cars/{id}` | Status archived / deleted_at terisi |

### Sample payload create car
```json
{
  "showroom_id": 1,
  "listing_status": "draft",
  "stock": 1,
  "license_plate_number": "D 9876 XY",
  "brand_name": "Honda",
  "model_name": "Brio",
  "sub_model_name": "RS",
  "primary_color": "Merah",
  "secondary_color": "Merah",
  "document_type": "old",
  "registration_date": "2023-02-10",
  "transmission": "Automatic",
  "engine_number": "ENG-NEW-001",
  "chassis_number": "CHS-NEW-001",
  "location_name": "Bandung",
  "engine_capacity_cc": 1200,
  "mileage_km": 12000,
  "seat_count": 5,
  "previous_owner_count": 1,
  "has_service_book": true,
  "key_count": 2,
  "description": "Unit smoke test",
  "price_cash": 180000000,
  "price_discount": 175000000,
  "price_credit": 170000000
}
```

---

## 5. Images

| ID | Test Case | Method | URL | Expected |
|---|---|---|---|---|
| ST-040 | List images by car | GET | `/api/cars/{car_id}/images` | Daftar image tampil |
| ST-041 | Upload image | POST | `/api/cars/{car_id}/images` | File tersimpan, DB row tercipta |
| ST-042 | Set cover image | PATCH | `/api/cars/{car_id}/images/{image_id}/cover` | Cover berganti |
| ST-043 | Delete image | DELETE | `/api/cars/{car_id}/images/{image_id}` | Soft delete berhasil |
| ST-044 | Cleanup job image | CLI | `php scripts/purge_deleted_car_images.php --days=30 --limit=100` | File eligible dipurge, log tercatat |

---

## 6. Inspection

| ID | Test Case | Method | URL | Expected |
|---|---|---|---|---|
| ST-050 | List inspection templates | GET | `/api/inspection-templates` | Template tampil |
| ST-051 | Create inspection report | POST | `/api/cars/{car_id}/inspection-reports` | Report tercipta |
| ST-052 | Get inspection report by car | GET | `/api/cars/{car_id}/inspection-report` | Report tampil atau 404 jika belum ada |
| ST-053 | Add inspection item | POST | `/api/inspection-reports/{report_id}/items` | Item tercipta |
| ST-054 | Update inspection item | PATCH | `/api/inspection-reports/{report_id}/items/{item_id}` | Item berubah |
| ST-055 | Publish inspection report | PATCH | `/api/inspection-reports/{report_id}` | Status report berubah |

### Sample payload create inspection report
```json
{
  "report_status": "draft",
  "summary_notes": "Pemeriksaan awal",
  "inspected_at": "2026-04-15 10:00:00"
}
```

### Sample payload add inspection item
```json
{
  "template_id": 1,
  "result_status": "good",
  "description": "Body mulus",
  "notes": "Tidak ada baret besar"
}
```

---

## 7. Affiliate

| ID | Test Case | Method | URL | Expected |
|---|---|---|---|---|
| ST-060 | Create affiliate relation | POST | `/api/affiliates` | Affiliate relation tercipta |
| ST-061 | Generate referral code | POST | `/api/affiliate/referral-codes/generate` | Kode unik keluar |
| ST-062 | List affiliates by seller | GET | `/api/seller/affiliates` | Data seller scope tampil |
| ST-063 | Update affiliate setting | PATCH | `/api/affiliates/{affiliate_id}/settings` | Setting berubah |
| ST-064 | Record click log | POST | `/api/affiliate/clicks` | Click tercatat, total_clicks naik |
| ST-065 | Create commission ledger | POST | `/api/affiliates/{affiliate_id}/commission-ledgers` | Ledger tercipta, aggregate sinkron |

---

## 8. Transactions

| ID | Test Case | Method | URL | Expected |
|---|---|---|---|---|
| ST-070 | Create transaction DP | POST | `/api/transactions` | Transaksi DP tercipta |
| ST-071 | Create transaction full payment | POST | `/api/transactions` | Transaksi full tercipta |
| ST-072 | List my transactions | GET | `/api/transactions` | Scope buyer/seller/admin benar |
| ST-073 | Transaction detail | GET | `/api/transactions/{transaction_id}` | Scope view benar |
| ST-074 | Complete payment / pelunasan | POST | `/api/transactions/{transaction_id}/complete-payment` | Session pelunasan tercipta |

### Sample payload create transaction DP
```json
{
  "car_id": 1,
  "payment_type": "dp",
  "dp_amount": 50000000,
  "payment_method": "bca_va"
}
```

### Sample payload create transaction full
```json
{
  "car_id": 1,
  "payment_type": "full",
  "payment_method": "bca_va"
}
```

---

## 9. Midtrans Sandbox

| ID | Test Case | Method | URL/Flow | Expected |
|---|---|---|---|---|
| ST-080 | Create initial payment session | Flow bisnis | `POST /api/transactions` | Token/session payment terbentuk |
| ST-081 | Callback pending | Callback | `POST /api/payments/midtrans/callbacks` | Log tercatat, status sesuai |
| ST-082 | Callback settlement/capture | Callback | `POST /api/payments/midtrans/callbacks` | Status jadi `dp_paid` / `paid` |
| ST-083 | Callback expire | Callback | `POST /api/payments/midtrans/callbacks` | Status jadi `expired` |
| ST-084 | Callback cancel/deny/failure | Callback | `POST /api/payments/midtrans/callbacks` | Status jadi `cancelled` |
| ST-085 | Completion payment sandbox | Flow bisnis | `POST /api/transactions/{transaction_id}/complete-payment` | Session pelunasan + callback valid |

Prasyarat:
- `MIDTRANS_SERVER_KEY` valid
- `MIDTRANS_CLIENT_KEY` valid
- sandbox mode aktif
- callback URL bisa diakses

---

## 10. Logging & Cleanup

| ID | Test Case | Method | URL/Flow | Expected |
|---|---|---|---|---|
| ST-090 | Payment logs recorded | DB check | `transaction_payment_logs` | Request/response/callback tercatat |
| ST-091 | Soft delete image then purge | Flow + CLI | image delete + purge script | File hilang setelah purge |
| ST-092 | Error path payment creation | Flow error | sandbox misconfig/test case | Error terkontrol dan tercatat |

---

## 11. Template Laporan Hasil

```md
| ID | Test Case | Result | Notes |
|---|---|---|---|
| ST-001 | Root route | PASS | Root JSON tampil |
| ST-002 | Health route | PASS | Timestamp dan timezone benar |
| ST-003 | Public cars catalog | PASS | 1 mobil bootstrap tampil |
| ST-010 | Login admin | BLOCKED | Password hash demo belum diganti |
| ST-080 | Create initial payment session | BLOCKED | MIDTRANS_SERVER_KEY belum valid |
```

---

## 12. Prioritas Eksekusi

### Batch 1 — Baseline
- ST-001
- ST-002
- ST-003
- ST-004

### Batch 2 — Auth
- ST-010
- ST-011
- ST-012
- ST-015

### Batch 3 — Seller Core
- ST-022
- ST-023
- ST-035
- ST-041
- ST-051

### Batch 4 — Transaction & Payment
- ST-070
- ST-073
- ST-080
- ST-081
- ST-082
- ST-085
