# Local Midtrans Manual Test

Dokumen ini menjelaskan tooling lokal untuk menguji Midtrans sandbox tanpa callback URL publik. Tooling ini hanya untuk local/dev dan tidak mengubah flow bisnis payment.

## Tujuan

- Replay payload callback Midtrans ke endpoint lokal `projectB`.
- Ambil status transaksi langsung dari Midtrans sandbox berdasarkan `order_id`.
- Memberi fallback saat callback asli Midtrans tidak bisa mencapai `localhost` atau payload callback mentah tidak tersedia.

## Prasyarat

Jalankan command dari direktori `projectB`:

```bash
cd projectB
```

Pastikan `.env` lokal berisi:

```dotenv
APP_ENV=local
APP_URL=http://localhost:8000
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_CORE_API_BASE_URL=https://api.sandbox.midtrans.com
MIDTRANS_CALLBACK_URL=http://localhost:8000/api/payments/midtrans/callbacks
MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_VERIFY_SIGNATURE=true
```

Untuk replay callback lokal dengan payload yang tidak memiliki `signature_key`, set sementara:

```dotenv
MIDTRANS_VERIFY_SIGNATURE=false
```

Aktifkan kembali `MIDTRANS_VERIFY_SIGNATURE=true` setelah manual test selesai.

## Menjalankan Server Lokal

Contoh server lokal bawaan PHP:

```bash
php -S localhost:8000 -t public
```

Endpoint callback yang dipakai oleh payment flow:

```text
POST /api/payments/midtrans/callbacks
```

## Replay Callback Manual

Simpan payload callback Midtrans sebagai JSON object, misalnya `callback.json`:

```json
{
  "order_id": "ORDER-123",
  "transaction_id": "midtrans-transaction-id",
  "payment_type": "bank_transfer",
  "transaction_status": "settlement",
  "gross_amount": "50000000.00",
  "status_code": "200",
  "signature_key": "sha512-signature-from-midtrans"
}
```

Jalankan:

```bash
php scripts/replay_midtrans_callback.php callback.json
```

Jika endpoint lokal berbeda:

```bash
php scripts/replay_midtrans_callback.php callback.json --url=http://localhost:8080/api/payments/midtrans/callbacks
```

Script akan menampilkan:

```text
POST http://localhost:8000/api/payments/midtrans/callbacks
HTTP status: 200
Response body:
{...}
```

Catatan:

- Script menolak replay ke host non-lokal.
- Host lokal yang diterima: `localhost`, `127.0.0.1`, `::1`, `*.local`, dan `*.test`.
- Status transaksi tetap diproses oleh endpoint callback existing, sehingga logika bisnis payment flow tidak dilewati.

## Fetch Status dari Midtrans Sandbox

Gunakan `order_id` Midtrans, biasanya nilai `transactions.midtrans_order_id`.

```bash
php scripts/fetch_midtrans_status.php ORDER-123
```

Script memakai GET Status API Midtrans sandbox:

```text
GET https://api.sandbox.midtrans.com/v2/{order_id}/status
```

Output:

```text
GET https://api.sandbox.midtrans.com/v2/ORDER-123/status
HTTP status: 200
Response body:
{...}
```

Jika response status sudah didapat dan perlu diterapkan ke transaksi lokal, simpan response tersebut menjadi file JSON lalu replay ke endpoint callback lokal:

```bash
php scripts/fetch_midtrans_status.php ORDER-123 > status-output.txt
```

Ambil JSON response body dari output tersebut, simpan sebagai `callback.json`, lalu:

```bash
php scripts/replay_midtrans_callback.php callback.json
```

## Safety

Tooling ini aman untuk local/dev karena:

- `replay_midtrans_callback.php` menolak berjalan di luar `APP_ENV=local/dev/development/test/testing`.
- `replay_midtrans_callback.php` menolak POST ke host non-lokal.
- `fetch_midtrans_status.php` menolak `MIDTRANS_IS_PRODUCTION=true`.
- `fetch_midtrans_status.php` menolak Core API URL selain domain sandbox Midtrans.
- Tidak ada endpoint baru, schema baru, atau modul bisnis baru.
- Flow bisnis callback tetap menggunakan endpoint existing `/api/payments/midtrans/callbacks`.

Jangan gunakan script ini untuk production.
