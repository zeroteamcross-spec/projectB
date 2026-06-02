# FEATURE_MODULE_CONTRACT.md

## 1. Tujuan

Dokumen ini menetapkan aturan bagaimana fitur baru ditambahkan ke frontend `projectB`.

Karena frontend `projectB` akan tumbuh besar, setiap fitur baru harus masuk dengan kontrak yang sama agar:
- tidak merusak arsitektur
- mudah dirawat
- mudah di-preload
- mudah diintegrasikan dengan store
- mudah diuji

---

## 2. Prinsip Dasar

Setiap fitur baru harus:
- masuk sebagai module/feature sendiri
- tidak menyusup liar ke core
- punya batas route, state, service, dan component yang jelas
- mengikuti lifecycle resmi
- mengikuti preload dan cache contract resmi

---

## 3. Struktur Minimal Feature Module

Setiap feature/module minimal memiliki struktur:

```text
modules/
  featureName/
    manifest.js
    routes.js
    state/
    services/
    components/
    pages/
```

Opsional:
```text
    hooks/
    utils/
```

## 4. Fungsi Tiap Bagian

manifest.js
Berisi deklarasi feature.
Minimal:
- nama feature
- route yang didaftarkan
- preload plan
- dependency state
- permission/role scope

routes.js
- Berisi definisi route frontend untuk feature tersebut.

state/
- Berisi state logic khusus feature.

services/
- Berisi pemanggilan resource/API dan business interaction frontend untuk feature.

components/
- Berisi komponen spesifik feature.

pages/
- Berisi page entry feature.


## 5. Manifest Contract

Feature harus memiliki manifest yang mendeklarasikan minimal:
- feature name
- supported roles
- routes
- preload snapshot needs
- preload working needs
- state namespace

Contoh konsep:
```javascript
export const featureManifest = {
  name: 'buyerTransactions',
  roles: ['buyer'],
  stateNamespace: 'buyerTransactions',
  routes: [],
  preload: {
    snapshot: [],
    working: []
  }
};
```


## 6. Route Contract

Setiap route baru harus mendeklarasikan:
- path
- page component
- required role
- preload plan
- working state key
- cleanup behavior

Route baru tidak boleh langsung menulis fetch logic liar.


## 7. State Contract

Feature baru wajib:
- mendaftarkan namespace state
- mendefinisikan snapshot data bila dibutuhkan
- mendefinisikan working data bila dibutuhkan
- mendefinisikan cleanup rule saat leave page


## 8. Preload Contract

Jika feature butuh preload, preload harus dideklarasikan, bukan di-hardcode sembarang.

Minimal dibedakan:
- snapshot preload
- working hydration

Preload module harus mengikuti aturan toast:
- initial preload setelah login silent by default
- resource/API success dari preload tidak memunculkan toast
- error preload non-kritis masuk ke state/log, bukan toast berulang
- error preload kritis maksimal satu toast dengan key dedupe


## 9. Lifecycle Contract

Setiap page di feature baru wajib memiliki lifecycle minimal:
- bootstrap()
- mount()
- hydrate()
- bindEvents()
- unmount()
- dispose()
- Penjelasan
- bootstrap() → inisialisasi awal ringan
- mount() → render awal
- hydrate() → fetch/isi working data
- bindEvents() → pasang event listener
- unmount() → lepas page dari DOM
- dispose() → bersihkan listener, state kerja, timer

### 9.1 SPA Render Stability Contract

Filter, tab, search, sort, and list pagination interactions must preserve the active page shell.

Rules:

- Do not use `location.reload()` or route refresh to update filtered data.
- Do not remount top-level page, role shell, navigation, or footer for in-page filter/list updates.
- Keep filter containers stable in the DOM; update active state and list region only.
- Keep async list regions visually stable with `min-height`, stable skeletons, or inline loading overlays.
- Do not clear visible list content before the replacement data is ready unless a stable loading state preserves layout.
- Presentational components must not call `fetch()` directly; use resource/service/state layers.


## 10. Cleanup Contract

Saat user meninggalkan feature/page:
- working set feature dibuang
- event listener dibersihkan
- timer dibersihkan
- transient runtime state dibersihkan

Snapshot kecil boleh dipertahankan bila relevan.


## 11. Komponen dalam Feature Baru

Aturan:
- jika reusable lintas feature, pindahkan ke shared system
- jika spesifik feature, simpan di components/ feature
- jangan duplikasi komponen shared hanya karena butuh style sedikit berbeda; gunakan variant bila memungkinkan
- modal feature wajib memakai modal baseline global; modal tidak boleh tertutup lewat backdrop click dan hanya boleh ditutup lewat tombol eksplisit di dalam modal
- jika modal sedang loading, upload, atau saving, tombol close boleh dinonaktifkan sementara untuk mencegah input hilang atau proses terputus
- create/edit modal yang dibuka dari render/subscription loop wajib memisahkan draft form dari snapshot/working data
- background snapshot/preload update tidak boleh mengganti DOM modal aktif atau menulis ulang draft yang sedang diketik user
- field sensitif seperti password hanya boleh tersimpan in-memory sepanjang lifecycle modal dan wajib dibersihkan saat close/cancel/success/dispose
- upload queue modal menyimpan `File` dan object URL hanya sebagai transient runtime state; snapshot/preload update tidak boleh menghapus queue aktif atau mereset progress
- preview gambar gallery harus memakai lightbox/modal di aplikasi, bukan navigasi langsung ke URL gambar


## 12. Service Contract

Service di feature baru:
- berinteraksi dengan resource/API
- tidak mengandung render logic
- tidak boleh langsung memanipulasi DOM
- hanya berkoordinasi dengan state layer dan page layer


## 13. Anti-Pattern Fitur Baru

Dilarang:
- menulis fitur baru langsung di file page lama tanpa module boundary
- menambah state global bebas
- menambah preload liar di router tanpa manifest
- fetch langsung di komponen shared
- membuat feature tanpa cleanup lifecycle


## 14. Checklist Saat Menambah Fitur Baru

Sebelum fitur dianggap masuk:
- [ ] punya manifest.
- [ ] punya route contract
- [ ] punya state namespace
- [ ] preload dideklarasikan
- [ ] lifecycle page jelas
- [ ] cleanup behavior jelas
- [ ] komponen reusable dipisahkan dengan benar
- [ ] tidak menambah memory leak
- [ ] tidak merusak snapshot/working contract


## 15. Outcome Spesifikasi Ini

Spesifikasi ini dianggap berhasil bila:
- fitur baru bisa ditambahkan tanpa membongkar core
- state dan preload fitur baru tetap terkontrol
- komponen tetap reusable
- aplikasi tetap stabil meskipun jumlah fitur bertambah

## 16. Affiliate Finance Module Contract

- Admin affiliate finance memakai working state `adminAffiliateCommissions` untuk ledger dan `adminSettlements` untuk batch.
- Snapshot canon: `admin.affiliateLedgers`, `admin.settlements`, `affiliate_admin.ledgerActivity`, `affiliate_admin.settlementActivity`.
- Create/edit/detail finance tetap modal/action berbasis preload; komponen tidak fetch langsung.
- Settlement response wajib membawa `ledger_ids` atau `items` agar shared mutation sync dapat memetakan lifecycle ledger.


