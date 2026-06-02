# FRONTEND_ARCHITECTURE_SPEC.md

## 1. Tujuan

Dokumen ini menjadi spesifikasi arsitektur frontend `projectB`.

Frontend `projectB` bukan sekadar lapisan tampilan, tetapi merupakan:

- SPA runtime engine
- UI composition layer
- state orchestration layer
- preload and cache layer
- reusable component platform

Arsitektur ini harus:
- cepat
- modular
- mudah dirawat
- extensible untuk fitur baru
- tahan terhadap pertumbuhan kompleksitas aplikasi

---

## 2. Prinsip Inti

Frontend `projectB` dibangun dengan prinsip berikut:

1. **Full SPA**
    - seluruh UI dirender oleh JavaScript
    - perpindahan halaman tidak melakukan full page reload

2. **Frontend-first interaction**
    - pengalaman aplikasi ditentukan terutama oleh frontend
    - frontend bertanggung jawab atas render, preload, cache, dan state

3. **Reusable-first**
    - komponen dibangun untuk dipakai ulang
    - satu komponen tidak boleh hanya cocok untuk satu halaman jika sebenarnya bisa digeneralisasi

4. **Feature-extensible**
    - fitur baru harus bisa ditambahkan tanpa membongkar fondasi
    - arsitektur harus siap untuk pertumbuhan modul baru

5. **Snapshot + Working Set**
    - data kecil disimpan untuk instan render
    - data besar aktif halaman dibuang saat leave page

6. **No uncontrolled globals**
    - tidak ada global variable liar
    - semua state global harus dikelola lewat store engine resmi

7. **Lifecycle-aware**
    - setiap page dan feature harus punya lifecycle yang jelas
    - event listener, working state, dan binding harus dibersihkan saat unmount

---

## 3. Scope Arsitektur

Spesifikasi ini mencakup:

- struktur folder frontend
- layer core frontend
- layer module/feature
- route system
- store & preload contract
- component system
- lifecycle page
- cache model
- extensibility rules

---

## 4. Layer Arsitektur Frontend

Frontend dibagi ke 4 layer utama:

### 4.1 Core Platform
Layer paling dasar dan paling stabil.

Tanggung jawab:
- frontend router
- store engine
- preload manager
- cache manager
- event bus
- lifecycle manager
- API client
- version manager

### 4.2 Shared System
Layer reusable lintas semua fitur.

Tanggung jawab:
- UI primitives
- composite components
- shared helpers
- formatter
- visual tokens
- shared layouts

Modal primitive di shared system menjadi baseline perilaku modal global. Modal tidak boleh ditutup lewat klik backdrop/area luar modal; close hanya boleh terjadi melalui tombol eksplisit di dalam modal seperti `X`, `Batal`, `Tutup`, `Selesai`, atau action lain yang jelas menutup modal. Saat modal sedang loading, upload, atau saving, tombol close boleh dinonaktifkan sementara untuk menjaga data dan proses.

Logout confirmation must use the shared modal baseline. Native `alert()` / `confirm()` is not allowed for logout; the logout modal must not close via backdrop click and may only close through explicit controls such as `X`, `Batal`, or the confirmed logout action.

### 4.3 Feature Modules
Layer domain bisnis.

Contoh:
- buyer
- seller
- admin
- affiliate
- cars
- transactions
- inspection
- images
- notifications (masa depan)
- analytics (masa depan)

### 4.4 App Composition
Layer yang menyusun shell dan role experience.

Tanggung jawab:
- app shell
- role-based navigation
- route registry
- preload plan per role
- global layout composition

---

## 5. Struktur Folder yang Direkomendasikan

```text
public/assets/js/
  core/
    app.js
    router.js
    apiClient.js
    eventBus.js
    lifecycle.js
    versionManager.js
  state/
    store.js
    stateEngine.js
    snapshotStore.js
    workingStore.js
    uiStore.js
    authStore.js
  preload/
    preloadManager.js
    preloadPlans.js
    cacheManager.js
  layout/
    appShell.js
    header.js
    sidebar.js
    topNav.js
    bottomNav.js
    pageFrame.js
  ui/
    primitives/
      button.js
      input.js
      select.js
      badge.js
      modal.js
      toast.js
      tabs.js
      pagination.js
      skeleton.js
      emptyState.js
    composites/
      card.js
      statCard.js
      sectionHeader.js
      dataTable.js
      listToolbar.js
      filterBar.js
    sections/
      carGridSection.js
      transactionListSection.js
      profileSection.js
      inspectionSummarySection.js
  modules/
    buyer/
      manifest.js
      routes.js
      state/
      services/
      components/
      pages/
    seller/
      manifest.js
      routes.js
      state/
      services/
      components/
      pages/
    admin/
      manifest.js
      routes.js
      state/
      services/
      components/
      pages/
    affiliate/
      manifest.js
      routes.js
      state/
      services/
      components/
      pages/
  resources/
    carsResource.js
    transactionsResource.js
    inspectionsResource.js
    affiliatesResource.js
    profileResource.js
  utils/
    dom.js
    formatCurrency.js
    formatDate.js
    deepClone.js
    objectPath.js
```

## 6. App Shell
App shell adalah bagian frontend yang selalu hidup.
Minimal berisi:
- root container
- header
- sidebar atau top navigation
- content mount point
- modal root
- toast root
- loading bar root

App shell tidak boleh tahu detail domain bisnis.
App shell hanya tahu:
- role aktif
- menu aktif
- route aktif
- state UI global

### 6.1 Toast Discipline

- Login success toast hanya boleh muncul dari submit handler login yang menyelesaikan auth user-facing.
- Initial preload setelah login harus silent by default.
- Resource/API success untuk preload tidak boleh menampilkan toast.
- Error preload harus memakai key dedupe dan tidak spam user.
- Toast container harus global di root app dan tidak dimount ulang per page atau per role shell.

### 6.2 Auth Identity Source of Truth

Active user identity must render from `authStore.user()`.

Role profile snapshots may enrich details, but cannot override fresher `authStore.user()` identity. Profile identity mutations must patch `authStore`, app store auth state, related profile working state, and known profile preload cache immediately after API success. Do not fetch `/auth/me` or reload a page only to hide stale identity data after a successful profile mutation.

### 6.3 Shared Mutation Sync Pattern

Shared/global mutations must use a sync helper or equivalent explicit sequence:

- patch current page working state when the current view displays the changed entity.
- patch the owning preload snapshot and `CacheManager` cache when the mutation returns a complete entity/payload.
- mark related cross-role snapshots stale when the mutation affects another role but the response does not contain enough data to safely patch that role.
- business-specific sync helpers may apply confirmed canon rules from `BUSINESS_STATUS_CANON_AND_SYNC_RULES.md`; they must not invent unconfirmed listing, payment, settlement, or finance rules.
- do not use full page reload or route refresh as the primary state synchronization mechanism.

### 6.4 Business Status Runtime Sync

Confirmed status side effects are centralized in the business sync helper:

- `dp_paid` keeps listing availability as `reserved`.
- `paid` and `completed` keep listing availability as `sold`.
- `pending_payment` cancelled/expired returns or keeps listing `published`.
- cancelled after `dp_paid` keeps listing `reserved` until admin action.
- refunded/cancelled after `paid` keeps listing `sold` until admin action.
- settlement `settled` maps related ledgers to `paid_out` when ledger ids are present.
- settlement `cancelled` maps related ledgers back to `accrued`.

Buyer/public catalog snapshots must not keep non-`published` cars as active catalog items after a mutation sync.

### 6.5 Background Video Layer

- Background video is progressive enhancement.
- Default page background must render first.
- Video must be muted, looped, playsinline, and non-interactive.
- Video must not block initial render or preload flow.
- Video layer must stay below page content and overlays.
- If video fails or user prefers reduced motion, fallback background remains.

### 6.6 Background Video Route Coverage

Background video applies to:
- landing/public home.
- public car detail.
- public transaction entry.
- affiliate landing.
- affiliate car detail.
- affiliate transaction entry.
- login.
- buyer pages.
- affiliate account pages.

Buyer pages must keep the video visible like landing. Text outside cards should use white text on video background. Card content keeps normal readable colors.

Affiliate account pages follow the same no-sidebar account shell direction as buyer pages: mobile bottom navigation, desktop top navigation, `[NotificationBell] [Profile/User]` header actions, visible background video, and white text for copy outside solid cards.

### 6.7 Modal Form Draft Stability

- Active modal form drafts are user-owned transient state.
- Snapshot/preload updates must not overwrite active drafts.
- Forms seed draft only once when opened.
- Dirty drafts are not reinitialized by background state updates.
- Snapshot refresh may update list/table areas, but must not recreate active modal DOM.
- Draft is cleared only on explicit cancel/close, successful save, route leave, logout, or role switch.
- Sensitive draft fields such as passwords must stay in memory only and must never be persisted to preload cache, localStorage, sessionStorage, logs, or docs output.
- Modal pages that call `openModal()` from render/subscription loops must provide a stable content signature or equivalent guard so repeated store updates do not replace the active modal body.

### 6.8 Upload Queue Modal

- File upload queues are transient UI state and must stay in memory only.
- Snapshot/preload updates must not reset active upload queues or progress state.
- Upload queue modal must not close via backdrop and must close only through explicit controls.
- Upload progress should be shown per file and overall when browser/resource support exists.
- Gallery preview must use an in-app lightbox/modal, not direct image URL navigation.

## Account Mobile Footer Isolation

Buyer and affiliate account mobile footers must use scoped account-specific classes.
They must not depend on global footer/nav styles.
All footer icons and labels must remain visible in active and inactive states.
Footer must be readable above background video and must stay below notification popovers/modals.

## Guest Notification Bell Rule

Notification bell must not render for guest/public users. It is only available for authenticated users with a valid role.

## Landing Car Grid Rule

Public landing car grid must render max 3 cards per row on desktop and wide screens. Mobile uses 1 card per row and tablet uses max 2 cards per row.

## 7. Frontend Router
Frontend router adalah tulang belakang SPA.

Tanggung jawab:
- membaca URL
- menentukan page module aktif
- men-trigger mount/unmount
- men-trigger preload/hydrate
- menjaga transisi halaman

Router tidak boleh:
- menyimpan data bisnis
- memanggil API langsung untuk domain bisnis

Router hanya berkoordinasi dengan:
- preload manager
- lifecycle manager
- page module

## 8. Arsitektur Data Rendering

Rendering halaman harus mengikuti alur:
1. router menentukan page aktif
2. page membaca snapshot ringan
3. halaman langsung dirender cepat
4. background hydrate mengambil working data penuh
5. halaman diperbarui secara bertahap

Dengan pola ini:
- halaman terasa instan
- data tetap bisa diperdalam setelah mount
- user tidak merasa kosong total saat pindah halaman

## 9. Rendering Rule
Frontend projectB menggunakan JavaScript rendering penuh.

Aturan:
- komponen tidak boleh fetch data langsung
- page module tidak menyimpan DOM reference di global state
- render harus membaca data dari state/store resmi
- perubahan data harus memicu rerender yang terkontrol
- modal page/feature harus memakai modal baseline global dan tidak membuat behavior close lokal yang berbeda, termasuk backdrop click close
- filter/tab/search/list interactions must update the smallest practical section, not remount the whole page shell.
- async list updates must keep stable containers or stable skeleton dimensions so page cards do not flicker or resize wildly.
- do not clear user-visible list content before new data is ready unless a stable loading overlay/skeleton preserves layout.
- `location.reload()` and router refresh are not valid fixes for stale or filtered SPA state.

## 10. Feature Module Rule

Setiap feature/module wajib:
- punya route atau page entry yang jelas
- punya state sendiri bila dibutuhkan
- punya service layer sendiri
- punya komponen internal sendiri bila spesifik
- tidak menaruh logic lintas domain sembarangan
Setiap fitur baru harus bisa ditambahkan tanpa membongkar core platform.

## 11. Ekstensibilitas

Arsitektur frontend harus siap untuk penambahan fitur masa depan seperti:
- notifikasi realtime
- analytics
- promo
- favorite/wishlist
- chat
- dashboard tambahan
- aktivitas user
- reporting
  Agar itu mungkin, semua fitur baru harus masuk sebagai feature module, bukan patch liar ke halaman lama.

## 12. Anti-Pattern yang Dilarang

Jangan lakukan hal berikut:
- menyimpan semua data di global variable bebas
- fetch API langsung di komponen reusable
- menaruh listener tanpa mekanisme cleanup
- menyimpan raw payload besar terlalu lama
- menulis halaman sebagai template string raksasa tanpa struktur
- mencampur route, state, render, dan event logic dalam satu file
- membuat komponen reusable yang tahu endpoint API bisnis


## 13. Outcome Tahap 1

Tahap 1 frontend dianggap berhasil bila:
- struktur core frontend terbentuk
- route engine ada
- global store hybrid ada
- preload manager ada
- component system dasar ada
- buyer flow bisa menjadi use case pertama
- modul baru punya slot masuk yang jelas

## 14. Affiliate Finance UI Contract

- Admin ledger komisi berada di `#/admin/affiliate-commissions` dan memakai shared `DataTable`.
- Admin settlement batch tetap berada di `#/admin/settlements`.
- Create settlement memakai modal global; modal tidak fetch saat dibuka dan hanya memakai ledger yang sudah dipreload.
- Mutation settlement harus memanggil sync helper dan menandai snapshot `admin.affiliateLedgers`, `admin.settlements`, `affiliate_admin.ledgerActivity`, dan `affiliate_admin.settlementActivity` stale.
- Label UI ledger: `accrued` = Belum Dibayar, `pending` = Menunggu Pembayaran, `paid_out` = Sudah Dibayar, `voided` = Dibatalkan.


