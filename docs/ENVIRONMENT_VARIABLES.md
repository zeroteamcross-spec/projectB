# Environment Variables

Dokumen ini mendata environment variable yang dipakai langsung oleh `projectB` saat ini. Sumber implementasi: `config/app.php`, `config/auth.php`, `config/database.php`, `config/payment.php`, `config/storage.php`, dan script CLI di `scripts/`.

## Prinsip Staging

- `.env` dibuat di root `projectB` dan tidak di-commit.
- `APP_ENV=staging` untuk staging nyata.
- `APP_DEBUG=false` untuk menghindari detail exception tampil ke client.
- Database staging wajib terpisah dari production.
- Midtrans UAT/staging memakai sandbox.
- `MIDTRANS_CALLBACK_URL` wajib public HTTPS dan mengarah ke endpoint callback projectB.
- `MIDTRANS_VERIFY_SIGNATURE=true` wajib aktif untuk staging.

## Variable Wajib

| Variable | Contoh Staging | Dipakai Oleh | Catatan |
|---|---|---|---|
| `APP_NAME` | `BeliMobil Staging` | `config/app.php` | Nama aplikasi |
| `APP_ENV` | `staging` | app config, seed guard, tooling lokal | Jangan `production` untuk UAT sandbox |
| `APP_DEBUG` | `false` | exception renderer | Wajib false untuk staging |
| `APP_TIMEZONE` | `Asia/Jakarta` | bootstrap app | Timestamp bisnis dan log |
| `APP_URL` | `https://staging.example.test` | app config, fallback callback URL | Harus public HTTPS untuk staging |
| `DB_CONNECTION` | `mysql` | `config/database.php` | Hanya MySQL yang didukung |
| `DB_HOST` | `127.0.0.1` | database connection | Host DB staging |
| `DB_PORT` | `3306` | database connection | Port DB staging |
| `DB_DATABASE` | `beli_mobil_staging` | database connection | Jangan pakai DB production |
| `DB_USERNAME` | `projectb_staging` | database connection | User DB staging |
| `DB_PASSWORD` | secret | database connection | Secret, jangan commit |
| `AUTH_REMEMBER_SECURE` | `true` | `config/auth.php` | True jika HTTPS |
| `AUTH_REMEMBER_SAME_SITE` | `Strict` | `config/auth.php` | Cookie remember-me |
| `STORAGE_UPLOADS_PATH` | `storage/uploads` | `config/storage.php` | Upload image |
| `STORAGE_PUBLIC_UPLOADS_PREFIX` | `/storage/uploads` | image mapper/storage | Prefix URL/path public upload |
| `STORAGE_DELETED_IMAGE_RETENTION_DAYS` | `30` | image cleanup job | Retensi purge soft-deleted images |
| `STORAGE_CLEANUP_LOG_PATH` | `storage/logs/car_images_cleanup.log` | image cleanup job | Log cleanup |
| `PAYMENT_DEFAULT_PROVIDER` | `midtrans` | `config/payment.php` | Provider aktif |
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-...` | Midtrans adapter/callback signature | Sandbox server key |
| `MIDTRANS_CLIENT_KEY` | `SB-Mid-client-...` | config/readiness | Sandbox client key |
| `MIDTRANS_IS_PRODUCTION` | `false` | Midtrans config/status tooling | False untuk sandbox |
| `MIDTRANS_IS_SANITIZED` | `true` | Midtrans config | Setting provider |
| `MIDTRANS_IS_3DS` | `true` | Midtrans config | Setting provider |
| `MIDTRANS_VERIFY_SIGNATURE` | `true` | `MidtransCallbackHandler` | Wajib true untuk staging |
| `MIDTRANS_CALLBACK_URL` | `https://staging.example.test/api/payments/midtrans/callbacks` | Midtrans config | Harus public HTTPS |

## Variable Opsional

| Variable | Default | Catatan |
|---|---|---|
| `MIDTRANS_SNAP_BASE_URL` | `https://app.sandbox.midtrans.com` | Isi eksplisit di staging agar tidak ambigu |
| `MIDTRANS_CORE_API_BASE_URL` | `https://api.sandbox.midtrans.com` | Dipakai charge/status API Midtrans |

## Contoh `.env` Staging

```dotenv
APP_NAME=BeliMobil Staging
APP_ENV=staging
APP_DEBUG=false
APP_TIMEZONE=Asia/Jakarta
APP_URL=https://staging.example.test

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=beli_mobil_staging
DB_USERNAME=projectb_staging
DB_PASSWORD=CHANGE_ME

AUTH_REMEMBER_SECURE=true
AUTH_REMEMBER_SAME_SITE=Strict

STORAGE_UPLOADS_PATH=storage/uploads
STORAGE_PUBLIC_UPLOADS_PREFIX=/storage/uploads
STORAGE_DELETED_IMAGE_RETENTION_DAYS=30
STORAGE_CLEANUP_LOG_PATH=storage/logs/car_images_cleanup.log

PAYMENT_DEFAULT_PROVIDER=midtrans
MIDTRANS_SERVER_KEY=SB-Mid-server-CHANGE_ME
MIDTRANS_CLIENT_KEY=SB-Mid-client-CHANGE_ME
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true
MIDTRANS_VERIFY_SIGNATURE=true
MIDTRANS_CALLBACK_URL=https://staging.example.test/api/payments/midtrans/callbacks
MIDTRANS_SNAP_BASE_URL=https://app.sandbox.midtrans.com
MIDTRANS_CORE_API_BASE_URL=https://api.sandbox.midtrans.com
```

## Validasi

Jalankan dari root `projectB`:

```bash
php scripts/check_environment.php --target=staging --check-db
```

Expected:

- PHP `>= 7.4`.
- Extension `json`, `pdo`, `pdo_mysql`, `fileinfo` tersedia.
- Storage writable.
- Database reachable.
- Midtrans key dan callback URL terisi.
- `MIDTRANS_VERIFY_SIGNATURE=true`.

## Nilai yang Tidak Boleh Untuk Staging

| Variable | Nilai Tidak Boleh | Alasan |
|---|---|---|
| `APP_DEBUG` | `true` | Membocorkan detail exception |
| `DB_DATABASE` | DB production | Risiko data production |
| `MIDTRANS_VERIFY_SIGNATURE` | `false` | Callback palsu tidak tertolak |
| `MIDTRANS_CALLBACK_URL` | `localhost` atau private IP | Midtrans tidak bisa mengirim callback nyata |
| `MIDTRANS_IS_PRODUCTION` | `true` | UAT masih sandbox |
