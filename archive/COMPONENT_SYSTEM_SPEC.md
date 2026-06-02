
---

## `projectB/docs/COMPONENT_SYSTEM_SPEC.md`

```md
# COMPONENT_SYSTEM_SPEC.md

## 1. Tujuan

Dokumen ini menjelaskan sistem komponen frontend `projectB` agar:
- reusable
- konsisten
- indah secara visual
- mudah dipakai lintas halaman
- mudah diperluas untuk fitur baru

---

## 2. Prinsip Komponen

Setiap komponen harus:
1. reusable
2. terisolasi
3. tidak fetch data langsung
4. menerima data lewat props/input
5. bisa dipakai di lebih dari satu halaman jika relevan
6. mendukung state loading/empty/error bila diperlukan
7. konsisten secara visual dengan design system

---

## 3. Layer Komponen

Sistem komponen dibagi ke 4 lapis:

### 3.1 Primitive Components
Komponen dasar kecil.
Contoh:
- Button
- Input
- Select
- Textarea
- Badge
- Icon
- Avatar
- Skeleton
- Modal
- Toast
- Tabs
- Pagination

### 3.2 Composite Components
Gabungan beberapa primitive.
Contoh:
- Card
- SectionHeader
- DataTable
- SearchBar
- FilterBar
- ListToolbar
- EmptyStateBlock
- StatusPill

### 3.3 Section Components
Potongan area halaman.
Contoh:
- CarGridSection
- TransactionListSection
- ProfileSection
- ShowroomSection
- InspectionSummarySection
- AffiliateSummarySection

### 3.4 Page Components
Halaman utuh.
Contoh:
- BuyerDashboardPage
- CarDetailPage
- PaymentStatusPage
- SellerCarsPage

---

## 4. Design System Rule

Agar reusable tidak mengurangi kecantikan halaman, komponen harus mengikuti sistem visual yang konsisten.

Minimal harus ada standar untuk:
- spacing scale
- typography scale
- border radius
- shadow/elevation
- color tokens
- status colors
- interaction states
- skeleton style
- empty state style

---

## 5. Visual Token

Harus ada token visual resmi, minimal:

### 5.1 Color token
- primary
- secondary
- success
- warning
- danger
- info
- text primary
- text muted
- surface
- border

### 5.2 Spacing token
- xs
- sm
- md
- lg
- xl

### 5.3 Radius token
- sm
- md
- lg

### 5.4 Shadow token
- card
- dropdown
- modal

---

## 6. Komponen Tidak Boleh Tahu API

Komponen reusable dilarang:
- fetch API sendiri
- tahu endpoint backend
- mengubah global store secara liar

Komponen hanya:
- menerima props
- mengirim event/callback
- merender UI

---

## 7. State UI di Komponen

Setiap komponen harus mempertimbangkan minimal state berikut bila relevan:
- default
- loading
- empty
- error
- disabled
- success

---

## 8. Kontrak Komponen

Setiap komponen harus punya:
- input/props yang jelas
- output event yang jelas
- variant bila dibutuhkan
- style scope yang jelas

Contoh:
- `Button`
  - props: `label`, `variant`, `size`, `disabled`
  - event: `onClick`

- `CarCard`
  - props: `carSummary`, `onOpenDetail`, `onPrimaryAction`
  - event: callback actions

---

## 9. Reusability Rule

Sebelum membuat komponen baru, cek:
1. apakah ini bisa menjadi variant dari komponen lama?
2. apakah ini sebenarnya section yang bisa disusun dari primitive/composite?
3. apakah nama komponen cukup generik untuk dipakai lagi?

---

## 10. Kategori Komponen Awal yang Harus Ada

### 10.1 Primitive
- Button
- Input
- Select
- Textarea
- Checkbox
- Radio
- Badge
- Skeleton
- EmptyState
- Modal
- Toast
- Pagination

### 10.2 Composite
- Card
- StatCard
- SectionHeader
- FilterBar
- SearchBar
- Toolbar
- ImageGallery
- TransactionStatusCard

### 10.3 Section
- CarGridSection
- CarDetailHeroSection
- InspectionSummarySection
- TransactionHistorySection
- ShowroomProfileSection
- AffiliateMetricsSection

---

## 11. Komponen dan Keindahan UI

Reusable tidak boleh identik dengan generik polos.

Agar tetap cantik:
- gunakan visual token
- buat variant
- buat composition yang baik
- gunakan section layout yang konsisten
- hindari style ad-hoc per halaman

---

## 12. Anti-Pattern Komponen

Jangan lakukan:
- satu komponen menangani terlalu banyak domain
- satu komponen besar untuk seluruh halaman
- komponen fetch API sendiri
- komponen menyimpan state bisnis global
- komponen menyimpan listener yang tidak dibersihkan
- komponen dengan props ambigu

---

## 13. Outcome Spesifikasi Ini

Sistem komponen dianggap berhasil bila:
- banyak halaman bisa memakai komponen yang sama
- UI tetap terlihat konsisten dan menarik
- fitur baru bisa dibangun dengan reuse tinggi
- komponen tidak menjadi sumber coupling ke API/state domain