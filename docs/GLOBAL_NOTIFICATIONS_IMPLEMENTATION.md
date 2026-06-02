# Global Notifications Implementation

## Status Task

- [x] Task 1 - Audit Struktur Shell/Header/Role
- [x] Task 2 - Data Model + API Contract
- [x] Task 3 - Notification State + Resource Service
- [x] Task 4 - Preload Snapshot Integration
- [x] Task 5 - Global Notification Bell + Popover UI
- [x] Task 6 - Full Notifications Page
- [x] Task 7 - Event Trigger Notification
- [x] Task 8 - Polling/SSE Realtime Upgrade
- [x] Task 9 - End-to-End Verification

## Audit Task 1

### File yang Diperiksa

- `AGENTS.md`
- `docs/TRD_NEW_MENU_GUIDELINE.md`
- `docs/SYSTEM_OVERVIEW.md`
- `docs/FRONTEND_ARCHITECTURE_SPEC.md`
- `docs/FEATURE_MODULE_CONTRACT.md`
- `docs/KNOWN_LIMITATIONS.md`
- `public/assets/js/core/app.js`
- `public/assets/js/core/router.js`
- `public/assets/js/core/apiClient.js`
- `public/assets/js/layout/shellHost.js`
- `public/assets/js/layout/appShell.js`
- `public/assets/js/layout/header.js`
- `public/assets/js/layout/sidebar.js`
- `public/assets/js/modules/buyer/manifest.js`
- `public/assets/js/modules/buyer/routes.js`
- `public/assets/js/modules/buyer/pages/dashboardPage.js`
- `public/assets/js/modules/seller/manifest.js`
- `public/assets/js/modules/admin/manifest.js`
- `public/assets/js/modules/affiliate/manifest.js`
- `public/assets/js/preload/preloadManager.js`
- `public/assets/js/preload/preloadPlans.js`
- `public/assets/js/state/store.js`
- `public/assets/js/state/stateEngine.js`
- `public/assets/js/state/authStore.js`
- `public/assets/js/resources/transactionsResource.js`
- `routes/api.php`
- `app/Modules/Transactions/Routes/api.php`
- `app/Modules/Transactions/Controllers/TransactionController.php`
- `app/Modules/Transactions/Services/TransactionService.php`

### Temuan Struktur Frontend

- SPA entry berada di `public/assets/js/core/app.js`.
- Feature manifest diregistrasi lewat `ProjectBApp.registerFeatures(...)`.
- Shell global dipilih oleh `public/assets/js/layout/shellHost.js` antara `public` dan `app`.
- Header global untuk role internal selain buyer berada di `public/assets/js/layout/header.js`.
- Buyer memakai shell khusus: `AppShell.syncBuyerShell()` menyembunyikan global header pada route `/buyer`, sehingga buyer membutuhkan integrasi khusus di header/dashboard buyer atau perubahan shell buyer.
- Sidebar internal untuk seller/admin/affiliate berada di `public/assets/js/layout/sidebar.js`.
- Auth state global berada di `public/assets/js/state/authStore.js` dan `public/assets/js/state/store.js`.
- Store memakai `StateEngine` dengan namespace `snapshot`, `working`, dan `runtime`.
- Preload boot snapshot lintas role berada di `public/assets/js/preload/preloadPlans.js`.
- Route preload working set dijalankan oleh `public/assets/js/preload/preloadManager.js`.
- API frontend memakai `apiClient` dan resource layer, contohnya `public/assets/js/resources/transactionsResource.js`.

### Temuan Header/Role

- Seller, admin, dan affiliate memakai `AppShell` dengan global `header.js`.
- Buyer route `/buyer...` menyembunyikan `header.js` dan sidebar, lalu memakai header mobile khusus di `buyer/pages/dashboardPage.js`.
- Public/guest memakai `PublicShell`; tidak ada kebutuhan bell publik saat audit ini.
- Role `affiliate_admin` dinormalisasi ke pengalaman affiliate di beberapa tempat, tetapi tetap dipakai sebagai role auth/preload.

### Temuan Notifikasi Existing

- Belum ada modul global `notifications`.
- Belum ada backend `app/Modules/Notifications`.
- Belum ada `notificationsResource.js`.
- Belum ada `notificationState.js`.
- Belum ada route `#/notifications`.
- Ada komponen statis sementara di `public/assets/js/modules/buyer/components/buyerNotificationPopover.js` dan wiring di `buyer/pages/dashboardPage.js`; ini hanya UI lokal buyer dan harus diganti oleh sistem global pada Task 3-5.
- File desain `spesifikasi_desain_ui_notifikasi_mobile (1).md` tidak ditemukan di workspace saat audit; sumber desain yang tersedia adalah spesifikasi yang diberikan user di prompt.

### Lokasi Terbaik Integrasi

- Backend module baru: `app/Modules/Notifications`.
- Frontend feature module baru: `public/assets/js/modules/notifications`.
- Frontend resource lintas modul: `public/assets/js/resources/notificationsResource.js`.
- Global notification state: `public/assets/js/modules/notifications/state/notificationState.js`, dengan penyimpanan state di `appStore` namespace `modules.notifications`.
- Global bell/popover reusable: `public/assets/js/modules/notifications/components`.
- Full page: `public/assets/js/modules/notifications/pages/notificationsPage.js`.
- Route global login: `#/notifications`, shell `app`, role fleksibel untuk semua user login. Jika role guard tidak mendukung multi-role pada satu route, perlu penyesuaian guard atau pendaftaran route per role yang mengarah ke page yang sama.
- Seller/admin/affiliate header: integrasi di `public/assets/js/layout/header.js`.
- Buyer: integrasi khusus perlu dilakukan karena buyer menyembunyikan `header.js`; opsi paling aman adalah memakai komponen bell global di header buyer existing, lalu jangka menengah menyatukan buyer topbar ke shell app.

### Keputusan Struktur Module

Gunakan feature module:

```txt
public/assets/js/modules/notifications/
+-- components/
|   +-- notificationBell.js
|   +-- notificationPopover.js
|   +-- notificationItem.js
|   +-- notificationPageList.js
+-- pages/
|   +-- notificationsPage.js
+-- services/
|   +-- notificationService.js
+-- state/
|   +-- notificationState.js
+-- manifest.js
+-- routes.js
```

Backend:

```txt
app/Modules/Notifications/
+-- Controllers/
+-- Mappers/
+-- Repositories/
+-- Requests/
+-- Routes/
+-- Services/
```

### Keputusan Teknologi

- MVP memakai database `notifications` + REST API.
- Snapshot kecil dipreload saat login/role diketahui.
- Popover membaca state, tidak fetch saat dibuka.
- Polling ringan 30-60 detik menjadi fallback setelah MVP.
- SSE dicatat sebagai upgrade setelah REST MVP stabil.
- WebSocket tidak direkomendasikan untuk tahap ini.

### Preload-First Guardrail

- `GET /api/notifications/snapshot` masuk ke `preloadPlans` untuk role login, bukan dipanggil dari komponen.
- Bell dan popover membaca `notificationState.snapshot()`.
- Mutation `mark read` dan `mark all read` boleh memanggil resource/service, lalu update state lokal.
- Full page boleh menggunakan route preload/working set, bukan fetch langsung di komponen presentasional.

## Changelog

## Notification Popover Layering Canon

## Guest Notification Bell Rule

Notification bell must not render for guest/public users. Public shell routes such as landing, public car detail, public transaction entry, and public affiliate pages must omit the bell until a valid authenticated user and role are present.

Layer order:
1. Page content
2. Notification backdrop
3. Notification popover
4. Global modal/dialog
5. Toast/system overlay

All notification popovers must render above their backdrop:
- `global_ntf_popover`
- `byr_mobile_ntf_popover`
- `byr_desktop_ntf_popover`
- `byr_profile_mobile_ntf_popover`
- `byr_profile_desktop_ntf_popover`

Additional buyer notification page variants follow the same shared `NotificationBell` portal behavior:
- `byr_notifications_mobile_ntf_popover`
- `byr_notifications_desktop_ntf_popover`

Implementation rule:
- Notification popover and backdrop render into one shared body-level `#notification_overlay_root` when backdrop is enabled.
- `#notification_overlay_root` is above page/header/card/table content and below the global modal root.
- Backdrop uses the lower notification layer and popover uses the higher notification layer inside the same overlay root.
- Opening notification popover must not trigger fetch; it reads the preloaded/polled notification snapshot.
- Outside-click close applies only to notification popovers, not form modals.

### 2026-05-19 - Notification Overlay Root Layer Hardening

- Fixed buyer desktop layering where `byr_desktop_ntf_backdrop` could cover `byr_desktop_ntf_popover`.
- Root cause: notification backdrop was already body-level, while buyer popovers were still rendered inside buyer nav/header stacking contexts such as sticky `z-40` containers. The popover z-index could not escape the lower parent stacking context.
- `NotificationBell` now renders both backdrop and popover into shared `#notification_overlay_root` whenever `withBackdrop` is enabled.
- The overlay root is created once, uses notification layer `z-index: 79`, and remains below the global modal layer `z-[80]` and toast layer `z-[9999]`.
- Backdrop and popover share the same parent; backdrop uses lower local layer and popover uses higher local layer.
- Popover is positioned from the bell button bounding rect and resynced on viewport resize/scroll while open.
- Close cleanup removes portal backdrop and portal popover; closed bells no longer leave hidden popover nodes.
- Opening notification popovers still reads `notificationService.snapshot()` only and does not fetch.

### 2026-05-19 - Global Notification Popover Backdrop + Layering

- `global_ntf_popover` uses a backdrop layer when opened from the global app header.
- Backdrop id: `global_ntf_backdrop`.
- The global header is positioned with controlled layering so `global_ntf_popover` renders above page content/cards/tables and below global modal z-index.
- Notification backdrops are rendered through a body portal so fixed `inset: 0` covers the viewport, not only the shell content column.
- Backdrop click and outside click close notification popovers only; this does not change global form modal backdrop behavior.
- `NotificationBell` now performs an initial render after subscribing, so bell buttons always have live handlers even before the next notification state update.
- Opening notification popovers still reads notification state only and does not trigger notification fetch.
- Browser smoke passed for `#/seller/transactions`, `#/seller/cars`, `#/admin/transactions`, `#/affiliate/ledger`, and buyer `#/buyer`.

### 2026-05-18 - Buyer Notification Popover Backdrop Coverage

- Buyer global notification popovers now use the shared backdrop and outside-click close behavior:
  - `byr_mobile_ntf_popover`
  - `byr_desktop_ntf_popover`
- Buyer profile popovers keep the same behavior:
  - `byr_profile_mobile_ntf_popover`
  - `byr_profile_desktop_ntf_popover`
- Opening notification popovers still reads `notificationState` through `NotificationBell` and does not trigger notification fetch.
- Outside-click close applies only to notification popovers, not global form modals.

### 2026-05-18 - Buyer Notifications Page Layout

- Route `#/notifications` remains global and `authRequired`.
- When the current role is `buyer`, the page renders with buyer-specific shell/layout.
- Buyer notifications page is mobile-first, has no sidebar, uses buyer desktop top navigation and mobile bottom navigation, and keeps header actions as `[NotificationBell] [Profile/User]`.
- Admin, seller, and affiliate keep their normal app shell/layout.
- Notification data still uses global `notificationState` / `notificationService`; no direct component fetch was added.

### 2026-05-18 - Notification Popover Backdrop + Outside Click

- Notification popover can render a backdrop layer when opened.
- Backdrop is visual and closes the notification popover when clicked.
- This outside-click close rule applies to notification popover only, not global form modals.
- Popover stays above backdrop; backdrop stays above page content and below modal z-index.
- Backdrop is cleaned up through the bell rerender/dispose lifecycle and route change close.
- Buyer profile mobile/desktop popovers use this behavior for scroll stability.
- Opening the popover still only reads notification state and does not trigger notification fetch.
- Outside-click close is active for every notification popover, including global header popovers that do not render a backdrop.

### 2026-05-18 - Login Toast Dedupe / Silent Initial Preload

- Aturan:
  - Login success toast memakai key dedupe `auth-login-success`.
  - Login error toast memakai key dedupe `auth-login-error`.
  - Initial preload dan notification snapshot tetap silent; success preload tidak menampilkan toast.
  - Route hydrate/preload error user-facing memakai key dedupe `initial-preload-error`.
- Keputusan:
  - Tidak ada perubahan endpoint atau fetch baru.
  - Notification snapshot tetap dimuat dari auth/app lifecycle dan tidak menampilkan toast sukses/gagal saat preload.
  - Toast container tetap global di `#toast-root`.

### 2026-05-17 - Notification Bell Global Position Rule

- Aturan:
  - Notification bell adalah bagian dari header action group.
  - Posisi bell selalu kanan atas dan berada tepat sebelum profile/user icon.
  - Berlaku untuk buyer, seller, admin, dan affiliate/admin.
  - Bell tetap memakai component global `NotificationBell`.
  - Bell/popover tidak fetch saat dibuka; data tetap dari preload/polling notification state.
- File diubah:
  - `public/assets/js/layout/header.js`
  - `public/assets/js/layout/appShell.js`
  - `public/assets/js/modules/buyer/pages/dashboardPage.js`
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`
- Penyebab posisi belum seragam:
  - Global header sebelumnya memakai bell + tombol logout teks, bukan bell + profile icon.
  - Buyer header khusus menaruh bell tanpa profile icon di kanan pada mobile, dan desktop buyer menaruh bell setelah nav links.
  - Buyer shell desktop masih menyembunyikan global sidebar/header hanya dengan atribut `hidden`; class Tailwind responsive dapat membuat elemen tersembunyi tetap memengaruhi layout pada smoke desktop.
- Keputusan:
  - Global header seller/admin/affiliate memakai action group `[NotificationBell][profile avatar]`.
  - Profile avatar global menjalankan logout seperti action lama, tetapi tampil sebagai user/profile icon agar posisi bell konsisten.
  - Buyer mobile dan desktop memakai action group `[NotificationBell][buyer profile avatar]`; avatar buyer menuju `#/buyer/account`.
  - `AppShell.syncBuyerShell()` sekarang juga memakai `style.display` untuk memastikan global sidebar/header benar-benar tidak tampil pada buyer shell.
- Verifikasi:
  - `node --check public/assets/js/layout/header.js`.
  - `node --check public/assets/js/layout/appShell.js`.
  - `node --check public/assets/js/modules/buyer/pages/dashboardPage.js`.
  - Browser smoke mobile/desktop: buyer, seller, admin, affiliate memiliki tepat satu visible bell dan satu visible profile action, bell berada sebelum profile, keduanya adjacent di kanan atas, dan `popoverFetches = 0`.
  - Guest/public tidak memiliki visible notification bell.
- Risiko:
  - Profile avatar global saat ini adalah lightweight logout action, bukan dropdown profile penuh. Jika nanti ada user menu formal, action ini bisa diarahkan ke menu tersebut tanpa mengubah posisi bell.

### 2026-05-17 - Seller Dashboard Bell Fix

- Masalah:
  - Dashboard seller dilaporkan belum menampilkan icon lonceng notifikasi dengan jelas.
- Penyebab:
  - Route `#/seller` sudah memakai global `header.js` dan sudah membuat `NotificationBell`, tetapi layout action header mobile memakai flex-wrap/full width sehingga bell bisa jatuh ke baris bawah bersama role/logout dan mudah terlewat pada dashboard seller.
  - Label role juga mengambil `app.activeRole` sehingga pada beberapa timing render bisa tampil sebagai `PUBLIC` meski auth seller sudah aktif.
- File diubah:
  - `public/assets/js/layout/header.js`
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`
- Keputusan:
  - Tetap memakai komponen global `NotificationBell`; tidak membuat bell seller statis.
  - Header action dibuat `shrink-0` dan tidak wrap agar bell selalu berada di area topbar kanan.
  - Role pill disembunyikan pada mobile (`hidden md:inline-flex`) agar ruang mobile diprioritaskan untuk bell dan logout.
  - Role label membaca `auth.role` terlebih dahulu, fallback ke `app.activeRole`.
- Verifikasi:
  - `node --check public/assets/js/layout/header.js` lulus.
  - Browser smoke seller `#/seller`: bell 46x46 tampil, badge unread tampil, popover terbuka, `popoverFetches = 0`, item click mark read dan navigasi ke `#/seller/transactions`, mark all menghapus badge.
  - Regression smoke: admin dan affiliate tetap punya satu global bell; public tidak punya bell; buyer tetap memakai buyer bell dengan global header tersembunyi oleh buyer shell.
- Risiko:
  - Buyer DOM masih memiliki global header tersembunyi dari AppShell, tetapi header tersebut `aria-hidden` dan buyer tetap memakai bell khusus buyer yang sudah ada.

### 2026-05-17 - Post-MVP Hardening

- File diubah:
  - `scripts/sql/20260517_notifications.sql`
  - `scripts/sql/20260517_notifications_idempotency_unique.sql`
  - `docs/SCHEMA_CANON.md`
  - `docs/PAYMENT_PROVIDER_UAT_CHECKLIST.md`
  - `app/Modules/Notifications/Services/NotificationService.php`
  - `app/Modules/Cars/Services/CarService.php`
  - `app/Modules/Inspection/Services/InspectionService.php`
  - `app/Modules/Transactions/Services/TransactionService.php`
  - `app/Modules/Affiliate/Services/AffiliateService.php`
- Unique index:
  - Added `uq_notifications_idempotency (user_id, role, type, source_type, source_id)`.
  - Fresh installs get the index from `20260517_notifications.sql`.
  - Existing installs can run `20260517_notifications_idempotency_unique.sql` after cleaning any historical duplicate event rows.
  - `NotificationService::createOnce()` now catches duplicate-key races and returns the existing notification when possible.
- Trigger domain tambahan:
  - Listing approved: admin transition to `published` creates seller `listing_approved`, source `car`.
  - Listing rejected: because schema canon has no `rejected` listing status, admin transition to `archived` is treated as rejection and creates seller `listing_rejected`, source `car`.
  - Inspection needed: car inspection summary transition to `not_checked` or `partial` creates seller `inspection_needed`, source `car_inspection`.
  - Transaction completed: `TransactionService::applyStatus('completed')` creates buyer and seller `transaction_completed`, source `transaction`.
  - Settlement paid: `AffiliateService::updateSettlementBatchStatus(... settled ...)` creates affiliate `settlement_paid`, source `affiliate_settlement`.
- Role/link decisions:
  - Listing and inspection notifications target seller, link `#/seller/cars` or `#/seller/inspection`.
  - Transaction completed targets buyer and seller, links `#/buyer/transactions/{id}` and `#/seller/transactions`.
  - Commission accrued targets `affiliate_admin`, link `#/affiliate/ledger`.
  - Settlement paid targets `affiliate_admin`, link `#/affiliate/settlements`.
  - No raw notification role `affiliate` introduced.
- UAT:
  - Added `docs/PAYMENT_PROVIDER_UAT_CHECKLIST.md` for real payment provider/webhook verification.
  - UAT checklist covers full payment, DP completion, affiliate commission, transaction completed, settlement paid, notification snapshot, polling, and idempotent retry.
- Verifikasi:
  - `php -l` passed for modified services.
  - In-memory notification service smoke passed for listing approved/rejected, inspection needed, transaction completed, and settlement paid idempotency.
- Risiko:
  - Applying the new unique index on an existing database will fail if duplicate event notification rows already exist.
  - `listing_rejected` maps to admin archive because there is no dedicated rejected listing status in `cars.listing_status`.
  - Real provider UAT still requires reachable callback URL and valid provider credentials.

### 2026-05-17 - Task 9

- File diperiksa:
  - Frontend notification state/service/components/page/routes.
  - Global header `public/assets/js/layout/header.js`.
  - Buyer header integration `public/assets/js/modules/buyer/pages/dashboardPage.js`.
  - App bootstrap `public/assets/js/core/app.js`.
  - Resource `public/assets/js/resources/notificationsResource.js`.
  - Backend notifications module, `TransactionService`, `AffiliateService`, and `routes/api.php`.
- File diubah:
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`.
- Scenario diverifikasi:
  - Buyer notification: browser smoke memuat buyer shell, badge unread tampil, popover menampilkan item `transaction_paid`, klik item menjalankan mark read dan navigasi ke `#/buyer/transactions/1`.
  - Seller notification: trigger backend Task 7 memakai target `seller_user_id`, role `seller`, type `transaction_paid`, link `#/seller/transactions`; service smoke Task 7 memastikan createOnce tidak duplicate.
  - Admin notification: trigger backend Task 7 membuat notification untuk admin aktif dan approved saja, role `admin`, link `#/admin/transactions`; user non-admin tidak menjadi target.
  - Affiliate notification: trigger backend Task 7 memakai role `affiliate_admin`, type `commission_accrued`, source `affiliate_commission`, link `#/affiliate/commissions`; service smoke Task 7 memastikan idempotent.
  - Idempotency: `NotificationService::createOnce()` dan repository lookup berdasarkan `user_id`, `role`, `type`, `source_type`, `source_id` sudah diverifikasi lewat smoke in-memory Task 7.
  - Popover no fetch: browser smoke membuka popover dan mencatat `popoverFetches = 0`; klik bell hanya toggle UI.
  - Mark read: browser smoke mencatat `markReadCalled = true`, unread state turun, dan link route berjalan.
  - Mark all read: browser smoke mencatat `unreadAfterMarkAll = 0` dan badge hilang.
  - Full page: browser smoke membuka `#/notifications`, judul `Notifikasi` tampil, list item tampil, filter `Belum Dibaca` memanggil list service, dan `Muat lagi` memakai cursor.
  - Guest guard: route guard `authRequired` mengembalikan redirect ke `/auth?role=public&from=%2Fnotifications`.
  - Polling lifecycle: browser smoke memastikan guest tidak start polling, login start polling, repeated start tidak membuat failure/duplicate visible state, dan logout tidak start polling.
- Code audit:
  - Tidak ada `fetch(` langsung di notification components/page; API call melalui `notificationService`/`notificationsResource`.
  - Tidak ada interval polling di UI component; `setInterval` hanya ada di notification service global.
  - Tidak ada WebSocket.
  - SSE tetap deferred.
  - Static buyer notification lama sudah tidak direferensikan.
  - Role notification tetap canon `buyer`, `seller`, `admin`, `affiliate_admin`; `affiliate` hanya dinormalisasi ke `affiliate_admin` di service backend.
- Verifikasi:
  - `node --check` lulus untuk semua file JS notification/header/buyer/app/resource terkait.
  - `php -l` lulus untuk `NotificationController`, `NotificationMapper`, `NotificationRepository`, `NotificationService`, `TransactionService`, `AffiliateService`, dan `routes/api.php`.
  - Browser smoke Playwright lulus: badge, popover no-fetch, mark read, mark all, full page, filter, load more, guard guest, polling auth lifecycle.
  - `php tests/run.php`: 11 pass, 2 fail existing/unrelated:
    - `ImagesHardeningTest`: `Expected 1, got 2.`
    - `InspectionHardeningTest`: expected `items.0.item_name`, got `items.0.template_id`.
- Patch kecil:
  - Tidak ada patch kode runtime pada Task 9; hanya dokumentasi final.
- ProjectA:
  - Tidak ada perubahan atau edit pada `projectA`.
  - `git status` tidak tersedia karena workspace bukan repository Git, sehingga validasi dilakukan dari scope operasi dan file edit yang hanya menyentuh `projectB`.
- Risiko tersisa:
  - Idempotency belum diproteksi unique index database; race condition paralel ekstrem masih mungkin.
  - Full notifications page tidak auto-reload list penuh dari polling snapshot; ini disengaja agar polling ringan tidak memaksa reload working list.
  - E2E real payment provider/webhook dan data produksi tetap perlu UAT environment karena smoke memakai mock API/browser dan service in-memory.
- Status:
  - MVP Global Notifications complete untuk data model, API, state, preload, bell/popover, full page, event trigger, dan polling fallback.
- Next:
  - Tambahkan unique index idempotency.
  - Pertimbangkan SSE jika kebutuhan realtime lebih kuat.
  - Tambah trigger domain lanjutan: listing approved/rejected, inspection needed, transaction completed, settlement paid.

### 2026-05-17 - Task 8

- File diubah:
  - `public/assets/js/modules/notifications/services/notificationService.js`
  - `public/assets/js/core/app.js`
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`
- Polling strategy:
  - MVP memakai polling ringan snapshot endpoint.
  - Polling hanya memanggil `notificationService.ensureSnapshot({ force: true })`, sehingga tetap melewati resource/state layer existing.
  - Response snapshot masuk ke `notificationState.setSnapshot()` melalui `loadSnapshot()`.
  - Bell badge dan popover update otomatis karena subscribe ke notification state.
- Interval:
  - Default `DEFAULT_POLL_INTERVAL_MS = 45000`.
  - Interval dinormalisasi minimum 30 detik dan maksimum 60 detik.
  - Tidak ada polling 1-5 detik.
- Auth lifecycle:
  - `notificationService.bindRealtimeLifecycle(appStore)` dipasang di `ProjectBApp.bootstrap()`.
  - Method ini menggabungkan auth reset/preload dari Task 4 dengan lifecycle polling.
  - Guest/public tidak start polling.
  - Saat login/role authenticated, polling start dan refresh snapshot immediate.
  - Saat logout/role switch ke guest, polling stop dan state reset tetap berjalan dari auth lifecycle.
- Visibility lifecycle:
  - Menggunakan Page Visibility API.
  - Saat `document.visibilityState === "hidden"`, polling stop dengan flag enabled tetap tersimpan.
  - Saat kembali `visible`, polling resume dan melakukan immediate refresh jika user masih authenticated.
- Dedupe/in-flight:
  - Polling memakai `ensureSnapshot()`, sehingga `snapshotInFlight` dari Task 4 tetap mencegah overlapping request.
  - `startPolling()` idempotent dan tidak membuat interval duplicate.
  - Timer dipasang sebelum immediate refresh agar update state tidak memicu reentrant start berulang.
- SSE decision:
  - SSE tidak dibuat pada Task 8.
  - Alasan: kebutuhan MVP cukup terpenuhi oleh polling snapshot 45 detik, backend ProjectB belum punya stream infrastructure, dan polling lebih aman untuk VPS/aaPanel.
  - SSE tetap future enhancement dengan fallback polling.
- Preload-first:
  - Tidak ada fetch saat bell diklik.
  - Tidak ada fetch saat popover dibuka.
  - Polling berada di service/lifecycle global, bukan component UI.
  - Full notifications page tetap tidak rusak; polling hanya refresh snapshot, bukan forced list reload.
- Verifikasi:
  - `node --check public/assets/js/modules/notifications/services/notificationService.js`.
  - `node --check public/assets/js/core/app.js`.
  - `node --check public/assets/js/modules/notifications/state/notificationState.js`.
  - Smoke Node dengan mock `fetch`: guest tidak polling, login buyer refresh snapshot, repeated start tidak duplicate, tab hidden tidak poll, tab visible resume immediate, logout stop dan reset state.
- Risiko:
  - Full page working list tidak otomatis reload saat polling snapshot menemukan item baru; ini sengaja agar tidak memaksa list reload dan akan diverifikasi E2E pada Task 9.
  - Polling tetap bergantung pada endpoint `/api/notifications/snapshot`; error masuk state dan tidak crash.
  - SSE belum tersedia sampai ada kebutuhan/infra streaming yang jelas.
- Next:
  - Task 9: End-to-End Verification untuk buyer paid -> seller/admin/affiliate notification -> polling badge update -> mark read/read-all -> full page.

### 2026-05-17 - Task 7

- File diubah:
  - `app/Modules/Notifications/Repositories/NotificationRepository.php`
  - `app/Modules/Notifications/Services/NotificationService.php`
  - `app/Modules/Transactions/Services/TransactionService.php`
  - `app/Modules/Affiliate/Services/AffiliateService.php`
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`
- Lokasi trigger:
  - Transaction paid: `TransactionService::applyStatus()` setelah status transaksi berhasil menjadi `paid`.
  - Affiliate commission accrued: `AffiliateService::accrueCommissionForPaidTransaction()` setelah ledger accrual ditemukan/dibuat.
- Trigger yang dibuat:
  - Buyer `transaction_paid`: target `buyer_user_id`, role `buyer`, icon `payment`, link `#/buyer/transactions/{transaction_id}`.
  - Seller `transaction_paid`: target `seller_user_id`, role `seller`, icon `transaction`, link `#/seller/transactions`.
  - Admin `transaction_paid`: target semua user admin aktif dan approved, role `admin`, icon `payment`, link `#/admin/transactions`.
  - Affiliate `commission_accrued`: target affiliate user id dari relation affiliate, role `affiliate_admin`, icon `commission`, link `#/affiliate/commissions`.
- Idempotency:
  - `NotificationRepository::findBySourceForUser()` mencari existing notification berdasarkan `user_id`, `role`, `type`, `source_type`, dan `source_id`.
  - `NotificationService::createOnce()` memakai kombinasi tersebut sebelum insert.
  - Transaction paid memakai `source_type = transaction`, `source_id = transaction_id`.
  - Commission accrued memakai `source_type = affiliate_commission`, `source_id = ledger_id`.
  - Tidak ada unique index baru pada Task 7; guard repository dipakai agar tidak mengubah schema besar.
- Notification copy:
  - Buyer title: `Pembayaran Berhasil`.
  - Buyer body: `Pembayaran untuk transaksi {mobil/kode} sudah diterima.`
  - Seller title: `Transaksi Dibayar`.
  - Seller body: `Buyer telah menyelesaikan pembayaran untuk {mobil/kode}. Segera proses transaksi.`
  - Admin title: `Pembayaran Transaksi Masuk`.
  - Affiliate title: `Komisi Affiliate Masuk`.
- Security/ownership:
  - Target user id selalu berasal dari transaction/affiliate relation backend, bukan input client.
  - Admin notification hanya dibuat untuk users role `admin`, `account_status = active`, `is_approved = 1`, dan tidak soft-deleted.
  - Role canon tetap `buyer`, `seller`, `admin`, `affiliate_admin`.
  - Endpoint user notification tetap scoped oleh auth context dari Task 2.
- Keputusan affiliate:
  - Tidak mengubah rumus komisi.
  - Tidak mengubah settlement pipeline.
  - Notification dibuat setelah ledger accrual canonical berhasil atau existing ledger ditemukan.
  - Jika tidak ada affiliate attribution/rule/ledger, tidak ada notification affiliate.
- Verifikasi:
  - `php -l app/Modules/Notifications/Repositories/NotificationRepository.php`.
  - `php -l app/Modules/Notifications/Services/NotificationService.php`.
  - `php -l app/Modules/Transactions/Services/TransactionService.php`.
  - `php -l app/Modules/Affiliate/Services/AffiliateService.php`.
  - Smoke PHP in-memory untuk `NotificationService`: transaction paid createOnce menghasilkan buyer/seller/admin aktif tanpa duplicate; commission accrued createOnce tidak duplicate.
  - `php tests/run.php` berjalan dengan 11 pass dan 2 fail existing pada `ImagesHardeningTest` dan `InspectionHardeningTest`.
- Risiko:
  - Karena tidak menambah unique index database, race condition paralel ekstrem masih mungkin membuat duplicate; mitigasi Task 7 adalah idempotency check di repository.
  - Transaction notification dibuat dalam flow status paid; jika table `notifications` belum ada di environment, status paid bisa gagal. SQL Task 2 wajib sudah diaplikasikan.
  - Tidak ada realtime refresh sampai Task 8; user melihat notifikasi baru saat snapshot/list refresh berikutnya.
- Next:
  - Task 8: polling ringan/SSE realtime upgrade untuk refresh snapshot/unread count tanpa membuka popover.

### 2026-05-17 - Task 6

- File diubah:
  - `public/assets/js/core/roleGuard.js`
  - `public/assets/js/modules/notifications/routes.js`
  - `public/assets/js/modules/notifications/pages/notificationsPage.js`
  - `public/assets/js/modules/notifications/components/notificationsPageList.js`
  - `public/assets/js/modules/notifications/components/notificationFilterTabs.js`
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`
- Route final:
  - `#/notifications`.
  - Route memakai shell `app` dan `authRequired: true`, bukan role-specific.
  - `roleGuard` ditambah dukungan `authRequired` agar route bisa dibuka buyer/seller/admin/affiliate tanpa mengubah role canon.
  - Guest/public diarahkan ke `/auth?role=public&from=%2Fnotifications`.
- Page/components:
  - `NotificationsPage` sebagai lifecycle page route.
  - `NotificationFilterTabs` untuk filter `all`, `unread`, `read`.
  - `NotificationsPageList` untuk list penuh dengan unread dot, icon, title, body, time relatif, read/unread badge, type badge, dan chevron/link affordance.
- Data loading:
  - Page memanggil `notificationService.loadList({ status, limit: 20 })`.
  - Tidak ada `fetch()` langsung di page/component.
  - Working state dibaca dari `notificationService.working()` / `notificationState.working()`.
  - Snapshot bell/popover tetap tidak berubah dan tidak fetch saat dibuka.
- Filter:
  - Label UI: `Semua`, `Belum Dibaca`, `Sudah Dibaca`.
  - Filter aktif memanggil endpoint list via service dengan query `status=all|unread|read`.
  - State `activeFilter` disimpan oleh `notificationState.hydrate()`.
- Mark read / mark all:
  - Klik item unread memanggil `notificationService.markRead(id)` lalu navigasi ke `linkUrl` bila ada.
  - Tombol `Tandai semua dibaca` memanggil `notificationService.markAllRead()`.
  - Badge bell ikut update karena semua komponen subscribe ke notification state yang sama.
  - Tidak ada reload dan tidak ada refresh snapshot setelah mutation.
- Load more/cursor:
  - Jika `nextCursor` tersedia, tombol `Muat lagi` muncul.
  - Klik `Muat lagi` memanggil `notificationService.loadList({ status: activeFilter, limit: 20, cursor })`.
  - `notificationState.loadList()` sudah memakai append saat cursor tersedia dan merge unique by id.
- Empty/error state:
  - Empty all: `Belum ada notifikasi`.
  - Empty unread: `Tidak ada notifikasi belum dibaca`.
  - Empty read: `Belum ada notifikasi yang sudah dibaca`.
  - Error state: `Notifikasi belum bisa dimuat` dengan tombol `Coba Lagi`.
- Responsive:
  - Page max width 940px agar desktop tidak terlalu melebar.
  - Filter chips horizontal-scroll friendly di mobile.
  - List item memakai grid responsif dan tap target lega.
  - Buyer yang membuka `#/notifications` memakai app shell global route, tanpa sidebar buyer karena route tidak role-specific.
- Verifikasi:
  - `node --check public/assets/js/modules/notifications/pages/notificationsPage.js`.
  - `node --check public/assets/js/modules/notifications/components/notificationsPageList.js`.
  - `node --check public/assets/js/modules/notifications/components/notificationFilterTabs.js`.
  - `node --check public/assets/js/modules/notifications/routes.js`.
  - `node --check public/assets/js/modules/notifications/manifest.js`.
  - `node --check public/assets/js/core/roleGuard.js`.
  - `node --check public/assets/js/modules/notifications/state/notificationState.js`.
  - `node --check public/assets/js/modules/notifications/services/notificationService.js`.
  - Browser smoke via Playwright: page title tampil, initial list dimuat, filter unread memanggil status unread, load more memakai cursor, mark all menghapus unread, guest guard redirect ke auth.
  - `php tests/run.php` berjalan dengan 11 pass dan 2 fail existing pada `ImagesHardeningTest` dan `InspectionHardeningTest`.
- Risiko:
  - Route `#/notifications` saat ini memakai app shell global untuk buyer; ini konsisten dengan route global lintas role, tetapi UX buyer full-screen bisa dipoles lagi jika buyer shell disatukan nanti.
  - Page load list bergantung pada endpoint `/api/notifications`; environment yang belum apply SQL notifications akan menampilkan error state.
  - Polling/SSE belum ada sampai Task 8.
- Next:
  - Task 7: event trigger notification untuk payment/transaction minimal buyer payment success dan seller transaction paid.

### 2026-05-17 - Task 5

- File diubah:
  - `public/assets/js/layout/header.js`
  - `public/assets/js/modules/buyer/pages/dashboardPage.js`
  - `public/assets/js/modules/buyer/components/buyerNotificationPopover.js` dihapus karena berisi notifikasi statis buyer-only.
  - `public/assets/js/modules/notifications/components/notificationBell.js`
  - `public/assets/js/modules/notifications/components/notificationPopover.js`
  - `public/assets/js/modules/notifications/components/notificationItem.js`
  - `public/assets/js/modules/notifications/components/notificationIcon.js`
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`
- Komponen:
  - `NotificationBell` membaca `notificationService.snapshot()` dan subscribe ke notification state.
  - `NotificationPopover` merender panel putih rounded, border biru, border kanan tebal, pointer, header `Notifikasi`, action `Tandai semua dibaca`, list item, empty/error state, dan footer `Lihat semua notifikasi`.
  - `NotificationItem` menangani unread dot, icon, judul, body, waktu relatif, mark-one-read, dan navigasi link.
  - `NotificationIcon` memetakan `iconKey`/`type` ke icon ProjectB tanpa dependency baru.
- Integrasi header global:
  - `layout/header.js` memasang `NotificationBell({ idPrefix: "global" })` di action area bersama role pill dan logout.
  - Bell hanya tampil saat `auth.isAuthenticated` true.
  - Header tidak fetch notifikasi; bell membaca state preload.
- Integrasi buyer:
  - `buyer/pages/dashboardPage.js` memakai `NotificationBell` untuk mobile buyer profile header.
  - Desktop buyer top navigation juga mendapat bell agar buyer tetap punya akses notifikasi di viewport desktop.
  - State lokal `notificationsOpen/notificationsRead` dan popover statis lama dihapus.
  - Render buyer membersihkan `dispose()` node lama sebelum `replaceChildren` untuk mencegah subscription leak.
- Mark read / mark all:
  - Klik item unread memanggil `notificationService.markRead(id)` dan navigasi ke `linkUrl` jika ada.
  - Klik `Tandai semua dibaca` memanggil `notificationService.markAllRead()`.
  - Optimistic update dan rollback tetap memakai state/service Task 3.
  - Toast sukses/gagal memakai toast primitive existing.
- Preload-first:
  - Klik bell hanya toggle DOM state lokal.
  - Popover hanya membaca `notificationState.snapshot()` melalui service.
  - Tidak ada fetch snapshot/list saat bell diklik atau popover dibuka.
  - Tidak ada polling, SSE, halaman penuh, atau event trigger di Task 5.
- Responsive:
  - Mobile popover memakai fixed panel hampir selebar layar dengan margin 16px dan internal scroll.
  - Desktop popover memakai panel absolute width sampai 410px di bawah bell.
  - Tap target bell minimal 46px, icon center dengan wrapper fixed.
- Verifikasi:
  - `node --check public/assets/js/modules/notifications/components/notificationBell.js`.
  - `node --check public/assets/js/modules/notifications/components/notificationPopover.js`.
  - `node --check public/assets/js/modules/notifications/components/notificationItem.js`.
  - `node --check public/assets/js/modules/notifications/components/notificationIcon.js`.
  - `node --check public/assets/js/layout/header.js`.
  - `node --check public/assets/js/modules/buyer/pages/dashboardPage.js`.
  - `node --check public/assets/js/modules/notifications/state/notificationState.js`.
  - `node --check public/assets/js/modules/notifications/services/notificationService.js`.
  - Browser smoke via Playwright: set snapshot unread, render bell, badge tampil, popover terbuka, `fetchAfterOpen = 0`, mark all menghapus badge dan unread count.
  - `php tests/run.php` berjalan dengan 11 pass dan 2 fail existing pada `ImagesHardeningTest` dan `InspectionHardeningTest`.
- Risiko:
  - Footer `Lihat semua notifikasi` mengarah ke `#/notifications`, tetapi halaman penuh baru dibuat pada Task 6 sehingga saat ini route dapat jatuh ke not-found.
  - Task 5 belum membuat polling/SSE; unread baru setelah boot tetap menunggu action manual atau Task 8.
  - Visual perlu dicek ulang saat Task 6 jika halaman notifikasi penuh menambah route global multi-role.
- Next:
  - Task 6: buat full notifications page di route `#/notifications` dengan filter all/unread/read dan list lengkap.

### 2026-05-17 - Task 4

- File diubah:
  - `public/assets/js/core/app.js`
  - `public/assets/js/modules/notifications/services/notificationService.js`
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`
- Lokasi integrasi preload:
  - `ProjectBApp.bootstrap()` memuat auth context lewat `/api/auth/autologin`, lalu memanggil `notificationService.ensureSnapshot({ force: true, store: appStore })` sebelum boot preload role.
  - `notificationService.bindAuthLifecycle(appStore)` dipasang di bootstrap untuk reset saat logout/role switch dan preload snapshot saat login/role auth berubah.
- Flow:
  - Auth user login/restore terdeteksi.
  - Role dan user id dibaca dari `appStore.auth`.
  - `notificationService.ensureSnapshot()` memanggil `notificationService.loadSnapshot()`.
  - `loadSnapshot()` memanggil `notificationsResource.snapshot()`.
  - Response masuk ke `notificationState.setSnapshot(payload)`.
  - Bell/popover Task 5 dapat membaca `notificationState.snapshot()` tanpa request saat dibuka.
- Guard/TTL:
  - TTL freshness snapshot: 45 detik.
  - Snapshot tidak dipanggil ulang jika state sudah hydrated, auth key sama, dan `lastSyncedAt` masih fresh.
  - Request simultan untuk auth key yang sama di-dedupe dengan `snapshotInFlight`.
  - `force: true` tetap bisa dipakai untuk app boot pertama atau role switch.
- Guest/public:
  - Jika `auth.isAuthenticated` false, user id kosong, atau role `public`, `ensureSnapshot()` hanya mengembalikan snapshot state lokal dan tidak memanggil API.
  - Tidak ada preload notifikasi untuk guest/public.
- Buyer shell:
  - Preload berada di lifecycle auth/app, bukan di global header.
  - Buyer tetap mendapat notification snapshot meski route `/buyer` menyembunyikan global header lewat buyer shell khusus.
- Error handling:
  - `loadSnapshot()` mengisi `notificationState.error` dan melempar error untuk caller service langsung.
  - `ensureSnapshot()` menangkap kegagalan snapshot, menyimpan error state, lalu mengembalikan snapshot lokal agar app boot/render tidak crash.
  - Tidak ada redirect, reload, atau blocking render jika endpoint notifikasi gagal.
- Preload-first:
  - Tidak ada fetch dari header, bell, popover, atau komponen UI.
  - Task 4 belum membuat UI bell/popover, halaman penuh, polling, SSE, atau event trigger.
- Verifikasi:
  - `node --check public/assets/js/core/app.js`.
  - `node --check public/assets/js/modules/notifications/services/notificationService.js`.
  - `node --check public/assets/js/modules/notifications/state/notificationState.js`.
  - `node --check public/assets/js/resources/notificationsResource.js`.
  - `node --check public/assets/js/modules/notifications/manifest.js`.
  - Smoke Node dengan mock `fetch`: guest tidak preload, login buyer mengisi snapshot, TTL mencegah duplicate call, `force` refresh bekerja, logout reset state.
  - `php tests/run.php` berjalan dengan 11 pass dan 2 fail existing pada `ImagesHardeningTest` dan `InspectionHardeningTest`.
- Risiko:
  - Snapshot preload sekarang aktif untuk user login; environment yang belum apply SQL `notifications` akan menyimpan error state tetapi app tetap berjalan.
  - TTL 45 detik hanya mencegah duplikasi opportunistic; polling berkala tetap ditunda sampai Task 8.
  - UI buyer statis existing belum diganti sampai Task 5.
- Next:
  - Task 5: implement global notification bell + popover UI yang membaca `notificationState.snapshot()` tanpa fetch saat click/open.

### 2026-05-17 - Task 3

- File diubah:
  - `public/assets/js/core/app.js`
  - `public/assets/js/modules/notifications/manifest.js`
  - `public/assets/js/modules/notifications/routes.js`
  - `public/assets/js/modules/notifications/services/notificationService.js`
  - `public/assets/js/modules/notifications/state/notificationState.js`
- State shape:
  - `unreadCount`
  - `items`
  - `workingItems`
  - `nextCursor`
  - `activeFilter`
  - `isHydrated`
  - `isLoading`
  - `isMarkingAllRead`
  - `markingIds`
  - `error`
  - `lastSyncedAt`
- Method:
  - `notificationState.snapshot()`
  - `notificationState.working()`
  - `notificationState.setSnapshot(payload)`
  - `notificationState.hydrate(payload, options)`
  - `notificationState.loadList(params, options)`
  - `notificationState.markRead(id, options)`
  - `notificationState.markAllRead(options)`
  - `notificationState.pushNotification(item)`
  - `notificationState.reset()`
  - `notificationState.subscribe(listener)`
  - `notificationService` menyediakan wrapper service untuk method yang sama plus `loadSnapshot()` dan `bindAuthReset()`.
- Keputusan:
  - Namespace appStore: `modules.notifications`.
  - `notificationsManifest` dibuat dengan route kosong untuk registrasi state; route halaman penuh tetap Task 6.
  - `notificationService.bindAuthReset(appStore)` dipasang di bootstrap agar logout/role switch mereset notification state tanpa fetch.
  - Normalizer mengubah snake_case API ke camelCase state: `link_url` -> `linkUrl`, `icon_key` -> `iconKey`, `is_read` -> `isRead`, dan seterusnya.
  - Role canon tidak diubah di state; `affiliate_admin` tetap `affiliate_admin`.
  - Tidak ada UI bell/popover/header/preload/polling/SSE di Task 3.
- Optimistic update:
  - `markRead` menyimpan previous state, menandai item lokal read, decrement `unreadCount`, set `markingIds[id]`, lalu memanggil `notificationsResource.markRead(id)`.
  - Jika `markRead` gagal, state rollback ke previous state, `error` diisi, lalu error dilempar ulang.
  - `markAllRead` menyimpan previous state, menandai semua item lokal read, set `unreadCount = 0`, set `isMarkingAllRead`, lalu memanggil `notificationsResource.markAllRead()`.
  - Jika `markAllRead` gagal, state rollback ke previous state, `error` diisi, lalu error dilempar ulang.
- Preload-first:
  - `setSnapshot(payload)` siap dipanggil Task 4 dari preload snapshot.
  - Bell/popover Task 5 cukup membaca `notificationState.snapshot()` tanpa fetch.
  - Full page Task 6 dapat memakai `notificationState.loadList()`/`notificationService.loadList()` di page/service layer.
- Verifikasi:
  - `node --check public/assets/js/resources/notificationsResource.js`.
  - `node --check public/assets/js/modules/notifications/state/notificationState.js`.
  - `node --check public/assets/js/modules/notifications/services/notificationService.js`.
  - `node --check public/assets/js/modules/notifications/manifest.js`.
  - `node --check public/assets/js/modules/notifications/routes.js`.
  - `node --check public/assets/js/core/app.js`.
  - Smoke state via Node untuk `setSnapshot`, optimistic mark read complete, dan `pushNotification`.
  - `php tests/run.php` berjalan dengan 11 pass dan 2 fail existing pada `ImagesHardeningTest` dan `InspectionHardeningTest`.
- Risiko:
  - `notificationsManifest` belum punya route sampai Task 6.
  - Preload belum mengisi snapshot sampai Task 4, sehingga state awal tetap kosong setelah login.
  - Komponen buyer statis existing masih harus diganti pada Task 5 agar tidak ada dua sumber notifikasi.
- Next:
  - Task 4: integrasikan `GET /api/notifications/snapshot` ke preload boot snapshot tiap role login dan hydrate ke `notificationState.setSnapshot()`.

### 2026-05-17 - Task 2

- File diubah:
  - `docs/SCHEMA_CANON.md`
  - `scripts/sql/20260517_notifications.sql`
  - `routes/api.php`
  - `app/Modules/Notifications/Controllers/NotificationController.php`
  - `app/Modules/Notifications/Mappers/NotificationMapper.php`
  - `app/Modules/Notifications/Repositories/NotificationRepository.php`
  - `app/Modules/Notifications/Routes/api.php`
  - `app/Modules/Notifications/Services/NotificationService.php`
  - `public/assets/js/resources/notificationsResource.js`
- Schema:
  - Tabel baru `notifications`.
  - PK `id` bigint unsigned auto increment.
  - Scope penerima memakai `user_id` + `role`.
  - Role mengikuti canon user role: `seller`, `buyer`, `affiliate_admin`, `admin`.
  - `data_json` memakai `LONGTEXT` berisi JSON encoded payload untuk kompatibilitas runtime DB existing.
  - `source_type` + `source_id` disiapkan sebagai pondasi idempotency trigger pada Task 7.
  - `deleted_at` tersedia untuk soft delete.
- Endpoint:
  - `GET /api/notifications/snapshot`
  - `GET /api/notifications?status=all|unread|read&limit=20&cursor=<id>`
  - `POST /api/notifications/{notification_id}/read`
  - `POST /api/notifications/read-all`
- Frontend resource:
  - `notificationsResource.snapshot(params, options)`
  - `notificationsResource.list(params, options)`
  - `notificationsResource.markRead(id, options)`
  - `notificationsResource.markAllRead(options)`
- Keputusan:
  - Endpoint user normal selalu memakai auth context dari backend untuk `user_id` dan `role`.
  - Backend tidak menerima role target dari query client untuk snapshot/list/read/read-all.
  - Mark read dan mark all read dibuat idempotent.
  - List penuh memakai cursor berbasis `id` karena pola project belum punya cursor engine global; shape response tetap `next_cursor`.
  - Service create minimal sudah tersedia untuk trigger event berikutnya, tetapi Task 2 belum memasang trigger transaksi/payment.
- Verifikasi:
  - `node --check public/assets/js/resources/notificationsResource.js`.
  - `php -l` untuk file module Notifications dan `routes/api.php`.
  - SQL patch `20260517_notifications.sql` berhasil diaplikasikan di database lokal.
  - Smoke endpoint login buyer berhasil untuk snapshot, list, mark read, dan mark all read.
  - Data smoke lokal sudah di-soft-delete setelah verifikasi.
  - `php tests/run.php` berjalan dengan 11 pass dan 2 fail existing pada `ImagesHardeningTest` dan `InspectionHardeningTest`.
- Risiko:
  - SQL patch harus diaplikasikan di environment sebelum endpoint dipakai.
  - `SCHEMA_CANON.md` sekarang memasukkan `notifications`; environment lama yang belum apply patch akan mendapat error table missing.
  - Idempotency event belum aktif sampai Task 7.
- Next:
  - Task 3: buat `notificationState` global dan service frontend yang memakai `notificationsResource`, tanpa fetch dari komponen UI.

### 2026-05-17 - Task 1

- File diubah:
  - `docs/GLOBAL_NOTIFICATIONS_IMPLEMENTATION.md`
- Keputusan:
  - Notifikasi harus menjadi module global baru, bukan buyer-only component.
  - REST + preload snapshot menjadi MVP.
  - Polling fallback dan SSE ditunda sampai state/API stabil.
- Verifikasi:
  - Audit struktur frontend/backend selesai.
  - Tidak ada `node --check` karena Task 1 hanya dokumentasi.
- Risiko:
  - Buyer memakai shell khusus dan perlu integrasi tambahan supaya bell tetap global secara behavior.
  - Komponen buyer statis existing perlu diganti agar tidak ada dua sumber notifikasi.
  - Route global multi-role perlu dicek dengan role guard saat Task 6.
- Next:
  - Task 2: baca `SCHEMA_CANON.md`, rancang tabel `notifications`, backend module, dan kontrak endpoint snapshot/list/read/read-all.
