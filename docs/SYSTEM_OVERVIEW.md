# SYSTEM_OVERVIEW.md

## 1. Tujuan

`projectB` adalah generasi baru dari aplikasi pada `projectA`, dibangun ulang dengan arsitektur yang lebih bersih, modular, ringan, dan mudah dirawat, tanpa kehilangan perilaku bisnis penting dari sistem lama.

Pendekatan pengembangan yang digunakan adalah **hybrid migration**:

- `projectA` menjadi sumber referensi perilaku bisnis lama
- `projectB` menjadi implementasi baru dengan desain arsitektur yang lebih baik
- migrasi dilakukan **per modul**, bukan rewrite total sekaligus
- fokus utama adalah **mempertahankan business behavior**, bukan mewarisi struktur kode lama

---

## 2. Prinsip Arsitektur

Project ini mengikuti prinsip berikut:

1. **Native PHP first**
    - Hindari ketergantungan berat pada framework pihak ketiga
    - Gunakan dependency eksternal hanya jika benar-benar diperlukan

2. **API-driven**
    - Semua data utama diakses melalui API internal
    - Frontend mengonsumsi JSON secara konsisten

3. **SPA-oriented**
    - Tampilan dirender oleh JavaScript
    - Backend tidak bertugas merender halaman bisnis secara penuh

4. **Modular**
    - Setiap domain utama dipisah ke modul sendiri
    - Tidak ada file monolitik yang memegang terlalu banyak tanggung jawab

5. **Convention over chaos**
    - Gunakan naming convention yang seragam
    - Gunakan kontrak request/response yang baku
    - Gunakan struktur folder yang konsisten

6. **Backward-aware, not backward-coupled**
    - Perilaku bisnis lama dipertahankan
    - Struktur kode lama tidak boleh disalin mentah ke desain baru

---

## 3. Tujuan Teknis Utama

Tujuan teknis `projectB`:

- memiliki **core framework** internal yang stabil
- menyediakan **routing** yang bersih dan dapat diskalakan
- menyediakan **middleware auth** dan permission yang jelas
- menggunakan **schema canon** sebagai sumber kontrak data
- memiliki **response JSON** yang konsisten
- memiliki **state management frontend** yang lebih tertata
- memisahkan **business logic**, **data access**, dan **presentation logic**

---

## 4. Batasan dan Aturan Kerja

### 4.1 `projectA`
- bersifat **read-only**
- digunakan hanya untuk membaca perilaku bisnis lama
- tidak boleh menjadi target penulisan kode baru
- tidak boleh disalin mentah kecuali diminta eksplisit

### 4.2 `projectB`
- semua pengembangan baru dilakukan di sini
- semua modul baru mengikuti arsitektur baru
- semua schema mengikuti `docs/SCHEMA_CANON.md`
- semua migrasi mengikuti `docs/MIGRATION_MAP.md`

---

## 5. Gambaran Domain Sistem

Domain utama aplikasi:

1. **Auth & Users**
    - registrasi
    - login
    - remember me
    - approval user
    - profil user

2. **Cars**
    - katalog mobil
    - detail mobil
    - status listing
    - stok / ketersediaan
    - informasi kendaraan

3. **Car Images**
    - upload gambar mobil
    - gallery
    - cover image
    - penghapusan gambar

4. **Inspection**
    - checklist inspeksi kendaraan berbasis master inspection canon
    - hasil inspeksi dan snapshot item master per report
    - catatan inspeksi per item dan summary report
    - status kondisi kendaraan

5. **Transactions**
    - pemesanan kendaraan
    - DP / full payment
    - status transaksi
    - pelunasan
    - callback pembayaran

6. **Affiliate**
    - referral code
    - komisi
    - klik
    - konversi
    - total komisi

7. **Master Data**
    - konfigurasi dinamis
    - menu admin
    - halaman Master Inspection sebagai child grup Master untuk kelola canon section/item inspection
    - payment metadata
    - data referensi frontend tertentu

8. **API Version / Sync Metadata**
    - versi data referensi
    - sinkronisasi cache / local storage
    - invalidasi data client

---

## 6. Arsitektur Logical Layer

`projectB` harus mengikuti pemisahan layer berikut:

### 6.1 Core
Berisi pondasi framework internal:
- bootstrap aplikasi
- router
- request
- response
- middleware
- validator
- env/config loader
- auth context
- error handler

### 6.2 Modules
Setiap domain bisnis disimpan pada modul terpisah:
- Auth
- Users
- Cars
- Images
- Inspection
- Transactions
- Affiliate
- MasterData
- ApiVersion

### 6.3 Infrastructure
Menangani detail implementasi teknis:
- database connection
- repository base
- storage / upload
- external service adapter
- payment provider adapter

### 6.4 Frontend
Frontend JS harus dipisah menjadi:
- core client
- module-based screens
- reusable components
- shared store
- service API wrapper

---

## 7. Struktur Folder yang Direkomendasikan

```text
projectB/
  app/
    Core/
    Shared/
    Modules/
      Auth/
      Users/
      Cars/
      Images/
      Inspection/
      Transactions/
      Affiliate/
      MasterData/
      ApiVersion/
    Infrastructure/
      Database/
      Storage/
      Payment/
  bootstrap/
  config/
  public/
    index.php
    assets/
      js/
      css/
      images/
  routes/
    api.php
    web.php
  storage/
    logs/
    uploads/
    cache/
  tests/
  docs/
