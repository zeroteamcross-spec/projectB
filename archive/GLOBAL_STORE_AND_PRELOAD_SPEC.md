
---

## `projectB/docs/GLOBAL_STORE_AND_PRELOAD_SPEC.md`

```md
# GLOBAL_STORE_AND_PRELOAD_SPEC.md

## 1. Tujuan

Dokumen ini menjelaskan spesifikasi:
- global store frontend
- preload scope
- cache model
- snapshot vs working set
- invalidation
- anti-memory-leak rule

Frontend `projectB` akan bekerja sangat berat di sisi state dan preload, sehingga sistem store dan preload harus lebih kuat daripada SPA biasa.

---

## 2. Prinsip Dasar

Sistem store dan preload `projectB` mengikuti prinsip berikut:
1. data ringan harus tersedia cepat
2. data besar hanya hidup saat halaman membutuhkannya
3. state global harus terstruktur
4. preload harus deklaratif
5. cache harus punya aturan invalidation yang jelas
6. memory harus dibatasi secara sadar

---

## 3. Model State Global

State global frontend dibagi ke beberapa area utama:

```js
const AppState = {
  app: {},
  auth: {},
  ui: {},
  snapshot: {},
  working: {},
  runtime: {}
};
```

## 4. Definisi Tiap Area State

4.1 app
Berisi metadata aplikasi.
Contoh:
- current route
- active role
- current app version
- current snapshot version
- readiness flags

4.2 auth
Berisi data auth yang sedang aktif.
Contoh:
- current user
- current role
- login status
- permission summary

4.3 ui
Berisi state UI lintas aplikasi.
Contoh:
- modal state
- toast queue
- loading state
- active tab
- sidebar collapse state
- page transition state

4.4 snapshot
Berisi data kecil yang dipertahankan untuk render instan.
Contoh:
- 10 item katalog awal
- profile ringkas
- 10 transaksi terbaru
- summary statistik ringan
- showroom ringkas
- affiliate summary ringan

4.5 working
Berisi data aktif halaman yang lebih besar.
Contoh:
- full list
- detail entity
- gallery besar
- inspection detail
- payment log detail
- ledger detail
- data pencarian aktif

4.6 runtime
Berisi state sementara/pendek umur.
Contoh:
- filter aktif
- form draft
- selected row
- temp sort
- wizard step

## 5. Model Data 2 Lapis
Frontend menggunakan model dua lapis:

5.1 Snapshot Cache
Karakteristik:
- kecil
- cepat dirender
- dipertahankan lebih lama
- boleh sedikit stale
- dapat disimpan ke local storage

Tujuan:
- instant navigation
- render awal cepat
- menjaga pengalaman aplikasi tetap terasa responsif

5.2 Working Set
Karakteristik:
- lebih besar
- aktif hanya saat page tertentu dibuka
- dibuang saat halaman ditinggalkan
- boleh dihydrate ulang kapan saja

Tujuan:
- mendukung interaksi halaman secara penuh
- menyediakan detail data yang tidak perlu disimpan terus


## 6. Preload Scope
Keputusan resmi:
preload awal mencakup semua menu utama per role, tetapi hanya dalam bentuk snapshot kecil.

Artinya:
- semua halaman utama role aktif akan punya data render awal
- tetapi preload tidak mengambil full dataset besar

## 7. Preload Strategy
Sistem preload dibagi menjadi 3 tahap:

7.1 Boot Preload
Saat app pertama dibuka:
- auth context
- role aktif
- config ringan
- snapshot semua menu utama role aktif

7.2 Route Hydration
Saat user membuka halaman:
- render snapshot dulu
- ambil working set penuh di background

7.3 Background Refresh
Saat app idle atau saat versi resource berubah:
- tandai snapshot stale
- tampilkan notifikasi refresh
- atau lakukan refetch selektif


## 8. Preload Per Role

8.1 Buyer
Snapshot preload minimum:
- katalog 10 item
- profile ringkas
- transaksi saya 10 item
- inspection summary ringan bila dibutuhkan

8.2 Seller
Snapshot preload minimum:
- showroom saya
- mobil saya 10 item
- transaksi seller 10 item
- affiliate summary ringan
- inspection summary ringan

8.3 Admin
Snapshot preload minimum:
- pending users 10 item
- transaksi terbaru 10 item
- monitoring summary ringan
- showroom/seller summary ringan

8.4 Affiliate
Snapshot preload minimum:
- referral summary
- click summary
- commission summary
- ledger recent 10 item


## 9. Snapshot Storage Rule

Snapshot dapat dipertahankan di:
- memory
- localStorage

Jika disimpan ke local storage, setiap snapshot wajib memiliki metadata:
```js
{
    data: [],
        fetchedAt: 0,
        ttl: 300,
        version: "cars-public-v1",
        stale: false
}
```

Field wajib:
- fetchedAt
- ttl
- version
- stale


## 10. Working Set Rule
Working set disimpan hanya untuk page aktif atau feature aktif.

Contoh:
- working.pages.buyerDashboard
- working.pages.carDetail
- working.pages.transactionDetail

Working set harus:
- dihancurkan saat leave page
- tidak disimpan ke local storage
- tidak menyimpan raw payload besar bila sudah tidak dipakai


## 11. Invalidation Rule

11.1 Saat pindah halaman
- working set halaman lama dibuang
- snapshot kecil dipertahankan

11.2 Saat logout
- semua auth dibuang
- semua snapshot role dibuang
- semua working set dibuang
- semua runtime state dibuang
- semua local cache terkait user dibersihkan

11.3 Saat mutasi data
Setelah mutasi seperti:
- create car
- update showroom
- create transaction
- upload image
- create inspection

maka:
- snapshot terkait ditandai stale atau dipatch ringan
- working set terkait dibersihkan atau diperbarui
- route aktif diputuskan apakah perlu refetch

11.4 Saat versi resource berubah
Jika versi resource dari API berubah:
- snapshot dianggap stale
- tampilkan notifikasi refresh ke user


## 12. Anti-Memory-Leak Rule

12.1 Listener cleanup wajib
Setiap page/module yang subscribe ke store atau event bus wajib unregister saat unmount.

12.2 Tidak boleh simpan DOM di global store
Global state hanya menyimpan data, bukan node DOM.

12.3 Tidak boleh simpan response mentah besar terlalu lama
Normalisasi entity seperlunya, lalu buang raw payload.

12.4 Working set wajib dispose
Setiap page harus punya mekanisme:
- disposeWorkingState()

12.5 Snapshot size harus dibatasi
Snapshot harus tetap kecil. Snapshot bukan tempat menyimpan full listing tak terbatas.


## 13. Store Engine Contract

Store engine minimal harus menyediakan:
- registerModuleState()
- getState()
- setState()
- patchState()
- resetState()
- subscribe()
- unsubscribe()
- destroyWorkingState()
- destroyRuntimeState()

Semua perubahan state harus lewat API store resmi.
Tidak boleh assignment liar ke objek global.


## 14. Resource-Normalized Model

Data sebaiknya disimpan per entity/resource, bukan per halaman penuh.
Contoh:
- snapshot.cars.public.ids
- snapshot.cars.byId
- snapshot.transactions.recent.ids
- snapshot.transactions.byId

Dengan model ini:
- satu entity tidak disimpan berulang di banyak tempat
- patch data lebih mudah
- memory lebih hemat


## 15. Refresh Notification Rule

Jika ditemukan data stale atau versi resource berubah:
- tampilkan notifikasi ringan ke user
- beri opsi refresh
- jangan paksa reload keras kecuali benar-benar dibutuhkan

Contoh UX:
- “Data baru tersedia. Klik untuk refresh.”


## 16. Outcome Spesifikasi Ini

Spesifikasi ini dianggap diterapkan dengan benar bila:
- preload awal semua menu utama role aktif berjalan
- halaman langsung render dari snapshot
- data besar hanya hidup di working set
- working set dibuang saat leave page
- store tidak memory leak
- cache invalidation dapat diprediksi











