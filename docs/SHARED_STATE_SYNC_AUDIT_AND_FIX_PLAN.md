# Shared State Sync Audit and Fix Plan

Tanggal audit: 2026-05-18

## 1. Ringkasan Bug Class

ProjectB adalah SPA preload-first. Data awal banyak halaman diambil dari snapshot preload, lalu disimpan ke `appStore.snapshot.*` dan cache browser melalui `CacheManager`. Pola ini cepat, tetapi rawan stale data jika mutation hanya memperbarui backend dan local page state tanpa memperbarui source of truth global, snapshot preload, dan cache yang dibaca halaman lain.

Kasus pemicu:

```txt
#/profile update nama user
-> profile page menerima data baru
-> authStore.setUser(updated) terpanggil
-> working.profilePage.profile ikut berubah
-> snapshot.buyer.profile dan cache preload buyer.profile belum ikut berubah
-> #/buyer masih memprioritaskan buyerState.snapshot("profile")
-> greeting buyer masih memakai nama lama
```

Masalah ini bukan bug satu halaman. Ini adalah bug class:

```txt
Page A mutation sukses
-> Page A update local/working state
-> Global source of truth tidak lengkap
-> Snapshot/cache preload tidak di-patch atau di-invalidate
-> Page B membaca snapshot/cache lama
```

## 2. Store / State / Cache yang Ditemukan

| Store/State | File utama | Fungsi | Risiko stale |
|---|---|---|---|
| `appStore` | `public/assets/js/state/store.js` | Root state SPA, `patchState`, `get`, subscribe | Menjadi pusat state tetapi belum punya contract mutation lintas domain |
| `authStore` | `public/assets/js/state/authStore.js` | Auth context, user, roles, active role | User bisa fresh di auth tetapi snapshot profile/cache role masih lama |
| `snapshotStore` | `public/assets/js/state/snapshotStore.js` | Helper membaca/menulis `snapshot.*` | Snapshot bisa dipakai lebih dulu dari auth/working |
| `workingStore` | `public/assets/js/state/workingStore.js` | Working set halaman | Sering ter-update hanya untuk halaman aktif |
| `CacheManager` | `public/assets/js/preload/cacheManager.js` | Cache preload di `localStorage`, namespace `projectB:spa:v1` | Mutation tidak otomatis patch/remove cache |
| `PreloadManager` | `public/assets/js/preload/preloadManager.js` | Boot preload role dan snapshot | Bisa hydrate dari cache non-stale walau backend sudah berubah |
| `buyerState` | `public/assets/js/modules/buyer/state/buyerState.js` | Akses snapshot/working buyer | `buyerState.snapshot("profile")` bisa mengalahkan `authStore.user()` |
| `sellerState` | `public/assets/js/modules/seller/state/sellerState.js` | Akses snapshot/working seller | Seller mutation umumnya hanya patch seller snapshot |
| `publicCatalogState` | `public/assets/js/modules/public/state/publicCatalogState.js` | Public catalog filters, selected car, working catalog | Catalog public dapat stale setelah seller/admin ubah listing |
| `publicContextState` | `public/assets/js/modules/public/state/publicContextState.js` | Affiliate/public context | Session attribution bisa tidak sinkron bila flow transaksi berubah |
| `transactionEntryState` | `public/assets/js/modules/public/state/transactionEntryState.js` | Checkout form/result runtime | Transaction result lokal bisa tidak patch buyer/seller/admin transaction lists |
| `notificationState` | `public/assets/js/modules/notifications/state/notificationState.js` | Snapshot, working items, unread count, polling state | Relatif paling lengkap, tetapi polling vs optimistic mutation perlu dijaga |
| Runtime module state | `runtime.*` di berbagai page | Loading, modal, form, selection | Tidak boleh dijadikan source of truth shared |
| Public session cache | `publicContextService`, `publicAffiliateTrackingService` | `sessionStorage` attribution/referral | Perlu reset eksplisit pada logout/role switch |

Tidak ditemukan cache auth user dedicated di `localStorage`; auth context dipulihkan melalui `/auth/autologin`. Cache preload tetap dapat menyimpan data profile role, misalnya `projectB:spa:v1:buyer.profile`.

## 3. Preload / Snapshot yang Ditemukan

Sumber utama: `public/assets/js/preload/preloadPlans.js`.

| Role | Snapshot preload | Data rawan stale |
|---|---|---|
| `public` | `catalog` | Listing, harga, status sold/published/archived, image cover, inspection |
| `buyer` | `profile`, `catalog`, `transactions`, `inspectionSummary` | Identitas buyer, catalog, transaction status, inspection summary |
| `seller` | `showroom`, `cars`, `transactions`, `affiliates`, `affiliateCommissionRules`, `inspectionOverview`, `masterSidebar`, `masterBank`, `masterBrand` | Listing seller, transaction seller, affiliate, commission rules, inspection, master |
| `admin` | `pendingUsers`, `users`, `transactions`, `cars`, `settlements`, `masterBrand`, `masterSidebar`, `masterBank`, `masterInspection`, `monitoringSummary` | Approval user, listing approval, settlement, master data |
| `affiliate_admin` | `affiliateProfile`, `clickActivity`, `ledgerActivity`, `settlementActivity`, `masterSidebar` | Ledger, settlement, profile affiliate |

`PreloadManager` dapat mengisi `appStore.snapshot.<role>.<key>` dari `CacheManager` jika cache belum stale. Mutation yang mengubah data shared harus patch atau invalidate dua lapis: in-memory snapshot dan `localStorage` cache.

## 4. Mutation Penting yang Ditemukan

| Area | File/fungsi | Resource/API | State yang diupdate sekarang | Gap sinkronisasi |
|---|---|---|---|---|
| Auth/Profile | `modules/profile/pages/profilePage.js` `openEditProfileModal` | `profileResource.updateMe()` | `authStore.setUser(updated)`, `working.profilePage.profile` | Belum patch `snapshot.buyer.profile`, `working.buyerAccount.profile`, cache `buyer.profile`; halaman buyer memprioritaskan snapshot lama |
| Buyer Account | `modules/buyer/pages/accountPage.js` edit profile | `profileResource.updateMe()` | `authStore`, `snapshot.buyer.profile.data`, `working.buyerAccount.profile` | Belum patch cache preload `buyer.profile`; belum ada helper shared |
| Seller cars | `modules/seller/pages/carsPage.js` create/update/archive | `carsResource.sellerCreate/update/archive` | `working.sellerCars.cars`, `snapshot.seller.cars` | Belum invalidate/patch `public.catalog`, `buyer.catalog`, `admin.cars`, cache related |
| Seller images | `modules/seller/pages/carImagesPage.js` upload/setCover/reorder/delete | `imagesResource.*` | `working.sellerCarImages.images` | Belum update car cover di seller cars, buyer/public catalog, car detail/cache |
| Seller inspection | `modules/seller/pages/carInspectionPage.js`, `inspectionPage.js` | `inspectionsResource.*` | Working inspection, sebagian seller list/snapshot | Belum sinkron ke buyer/public inspection summary/detail dan cache |
| Public checkout | `modules/public/pages/transactionEntryPage.js` create | `publicTransactionService.create()` -> `transactionsResource.create()` | `transactionEntryState.result` | Belum patch buyer/seller/admin transaction snapshots dan listing reservation/lock |
| Buyer payment | `modules/buyer/pages/paymentStatusPage.js` complete/update status | `buyerTransactionService.completePayment/updateStatus` | `working.buyerPaymentStatus.transaction`, upsert ke beberapa buyer transaction nodes | Belum jelas patch seller/admin transactions, listing status, affiliate ledger/commission, cache |
| Seller transactions | `modules/seller/pages/transactionsPage.js` fulfillment/status | `sellerTransactionService.updateStatus/updateFulfillmentChecklist` | `working.sellerTransactions.transactions`, `snapshot.seller.transactions` | Belum patch buyer/admin transaction snapshot dan related listing/cache |
| Admin approval | `modules/admin/pages/approvalsPage.js` approve | `adminSessionService.approveUsers()` | Refresh `working.adminApprovals.*`, `snapshot.admin.pendingUsers` | Belum patch `snapshot.admin.users`; role/user availability di area lain bergantung refresh route |
| Admin users | `modules/admin/pages/usersPage.js` refresh after action | `adminSessionService.*` | `working.adminUsers.*` | Perlu kontrak patch `snapshot.admin.users/pendingUsers` dan cache |
| Admin settlements | `modules/admin/pages/settlementsPage.js` updateStatus | `adminSessionService.updateSettlementStatus()` | `router.handleChange()` refresh route | Rawan reload-style refresh; belum patch affiliate ledger/settlement snapshots |
| Seller affiliates | `modules/seller/pages/affiliatesPage.js` create/update | `sellerAffiliateService.create/update` | `working.sellerAffiliates.*`, `snapshot.seller.affiliates` | Belum patch public affiliate context/listing link cache bila dipakai |
| Seller commission rules | `affiliateCommissionsPage.js`, `commissionRulesPage.js` | commission services | `working.sellerAffiliateCommissions.*`, `snapshot.seller.affiliateCommissionRules` | Belum patch affiliate/admin finance views |
| Notifications | `notificationState.markRead/markAllRead` | `notificationsResource.markRead/markAllRead` | Optimistic `items`, `workingItems`, `unreadCount`; complete dari payload | Perlu guard agar polling tidak overwrite optimistic state dengan stale snapshot |
| Master data | `admin/masterPage.js`, `masterInspectionPage.js` | master resources | Beberapa snapshot admin/seller/affiliate ikut patch | Perlu cache invalidation untuk master preload dan buyer/public dependencies |

## 5. Data Shared / Global yang Rawan Stale

- User identity: username, full name, email, phone, avatar, role label, branch.
- Buyer profile snapshot/cache: `snapshot.buyer.profile`, `working.buyerAccount.profile`, `projectB:spa:v1:buyer.profile`.
- Listing/catalog: `snapshot.seller.cars`, `snapshot.public.catalog`, `snapshot.buyer.catalog`, `snapshot.admin.cars`.
- Car image/cover: detail gallery, card thumbnail, public/buyer catalog.
- Inspection data: seller inspection overview, buyer/public inspection summary/detail.
- Transactions: buyer list/detail, seller list/detail, admin transaction list, payment status page.
- Listing commercial status: available/reserved/sold/archived/published.
- Affiliate data: seller affiliates, public referral context, affiliate ledger/settlement, commission rules.
- Settlement/finance: admin settlements, affiliate settlement activity, ledger summary.
- Notifications: bell unread count, popover snapshot, full page list.
- Master data: sidebar, bank, brand, inspection templates.

## 6. Risk Matrix

| Area | Mutation | Source of Truth | State/Snapshot Terdampak | Risiko | Level | Rekomendasi |
|---|---|---|---|---|---|---|
| Auth/Profile | update profile name/avatar | `authStore.user` plus profile snapshot | header, `#/profile`, `#/buyer`, buyer account, preload cache | Nama/avatar stale lintas halaman | High | Buat helper `syncAuthUserPatch`, patch auth, working profile, role profile snapshot, dan cache terkait |
| Buyer dashboard | read profile identity | `authStore.user` untuk identity aktif | `buyerState.snapshot("profile")`, `authStore.user()` | Snapshot lama mengalahkan auth terbaru | High | Resolver identity harus memprioritaskan auth untuk user aktif atau snapshot harus dipatch atomik |
| Seller listing | create/update/archive | Backend listing resource | seller cars, public catalog, buyer catalog, admin cars, cache | Listing salah tampil, CTA beli aktif pada unit tidak valid | Critical | Mutation sync helper listing: patch own list, invalidate public/buyer/admin catalog caches |
| Car image | upload/set cover/reorder/delete | Backend car images | seller image page, seller cars cover, public/buyer cards/detail | Cover/gambar stale di marketplace | High | Patch image working set dan invalidate car/catalog snapshots |
| Inspection | update report/item/template | Backend inspection | seller inspection, buyer/public inspection summary/detail | Kondisi unit salah ditampilkan | High | Patch seller working; invalidate buyer/public inspection summaries and car detail |
| Transaction create/payment | create transaction, complete payment | Backend transaction/payment | buyer/seller/admin transactions, listing status, notification, affiliate commission | Status pembayaran/listing salah | Critical | Central `syncTransactionMutation` patch related transaction lists, listing lock/sold, notification snapshot |
| Seller fulfillment | checklist/status update | Backend transaction | seller/buyer/admin transaction views | Buyer melihat status lama | Critical | Patch all known transaction snapshots by id and invalidate role caches |
| Admin approval | approve user | Backend users | pending users, users, auth availability | User tetap terlihat pending atau akses tidak muncul | High | Patch pending/users snapshots and cache; reload auth only if current user affected |
| Admin settlement | settled/cancelled | Backend settlement/ledger | admin settlements, affiliate settlements, affiliate ledger | Finance stale | Critical | Patch settlement batch and invalidate affiliate finance snapshots |
| Affiliate commission rules | save/create/update | Backend commission rules | seller rules, affiliate/admin finance estimates | Perhitungan komisi UI stale | High | Patch seller rules and invalidate finance/ledger previews |
| Notifications | mark read/all | Backend notifications | bell, popover, full page | Badge unread tidak konsisten | Medium | Keep optimistic patch; add version/updatedAt guard for polling overwrite |
| Master data | brand/sidebar/bank/template mutations | Backend master | admin/seller/affiliate snapshots and cache | Menu/master lama muncul setelah update | Medium | Patch all role snapshots already known and remove related preload cache |
| Public affiliate context | record click/referral session | session/backend attribution | transaction create, public landing, affiliate ledger | Attribution salah | High | Confirm source of truth, expire/reset session context on completion/logout |

## 7. Shared Data Mutation Contract

Setiap mutation yang mengubah data shared/global wajib:

1. Update backend lewat resource/API resmi.
2. Patch local page state jika halaman saat ini menampilkan data tersebut.
3. Patch source of truth global jika data dipakai lintas halaman.
4. Invalidate atau refresh snapshot/preload terkait.
5. Update auth/session/localStorage cache jika data auth berubah.
6. Notify subscribers/store agar UI lain ikut update.
7. Jangan menunggu reload halaman.
8. Jangan membuat fetch klasik saat page/modal open hanya untuk menutupi stale data.

Tambahan ProjectB:

- Patch in-memory snapshot dan cache `CacheManager` harus diperlakukan sebagai satu operasi logical untuk data preload.
- Runtime state (`runtime.*`) tidak boleh menjadi source of truth shared.
- Jika mutation menyentuh data lintas role, helper sinkronisasi harus diletakkan di layer shared/service, bukan tersebar di page component.
- Untuk data high-risk seperti transaction/payment/listing status, jika patch lokal tidak cukup aman, snapshot terkait harus ditandai stale dan di-refresh melalui resource resmi yang sudah ada.

## 8. Task Eksekusi Bertahap

### Task 1 - Audit State/Preload/Mutation Map

Status: audit awal selesai di dokumen ini.

Acceptance criteria:

- Daftar store/state/cache terdokumentasi.
- Daftar preload/snapshot terdokumentasi.
- Mutation penting terdokumentasi dengan gap sinkronisasi.
- Risk matrix tersedia untuk prioritas patch.

### Task 2 - Fix Auth/Profile Source of Truth

Status: selesai pada 2026-05-18.

Scope:

- Tambahkan helper kecil shared, misalnya `syncAuthUserPatch(updatedUser, options)`.
- Saat profile update sukses dari `#/profile` atau buyer account:
  - patch `authStore.user`.
  - patch `working.profilePage.profile`.
  - patch `working.buyerAccount.profile` jika buyer.
  - patch `snapshot.buyer.profile.data`.
  - patch/remove cache `projectB:spa:v1:buyer.profile`.
  - notify via `appStore.patchState`, tanpa reload dan tanpa fetch halaman buyer.
- Evaluasi resolver `#/buyer` agar identity user aktif tidak kalah oleh snapshot lama.

Acceptance criteria:

- Update nama di `#/profile`, lalu pindah ke `#/buyer`, nama berubah tanpa reload browser.
- Header/profile action ikut nama terbaru.
- Logout/login ulang tetap mengambil nama dari backend.
- Tidak ada fetch klasik baru saat `#/buyer` dibuka hanya untuk memperbaiki stale name.

Hasil implementasi:

- File diubah:
  - `public/assets/js/state/authStore.js`
  - `public/assets/js/state/sync/authUserSync.js`
  - `public/assets/js/modules/profile/pages/profilePage.js`
  - `public/assets/js/modules/buyer/pages/accountPage.js`
  - `public/assets/js/modules/buyer/pages/dashboardPage.js`
  - `public/assets/js/modules/buyer/pages/transactionsPage.js`
- Source of truth final: active user identity render dari `authStore.user()`.
- Fields identity yang dipatch mengikuti response `/profile`: `name`, `full_name`, `email`, `phone_number`, `address`, `role`, `account_status`, avatar/photo fields bila dikembalikan API.
- Cache/storage handling:
  - Tidak ada auth user cache dedicated di `localStorage/sessionStorage`.
  - Cache preload `projectB:spa:v1:buyer.profile` dipatch langsung untuk user buyer.
  - `snapshot.buyer.profile` dan `working.buyerAccount.profile` dipatch hanya untuk active user role buyer.
- Buyer dashboard merge rule: role/profile snapshot hanya enrichment; `authStore.user()` menang untuk identity fields.
- Fetch baru: tidak ada fetch baru saat masuk `#/buyer`.
- Risiko tersisa: role selain buyer belum punya profile preload dedicated, jadi sync utama mereka lewat `authStore.user()` dan `working.profilePage.profile`.

### Task 3 - Add Shared Mutation Sync Helpers

Status: selesai baseline pada 2026-05-18.

Scope:

- Buat pola helper kecil, tidak over-engineered:
  - `syncAuthUserPatch`
  - `invalidatePreloadSnapshot(role, key)` atau wrapper cache manager resmi
  - `patchListItemById(path, item, collectionKey)`
  - `invalidateCatalogSnapshots`
  - `syncTransactionPatch`
- Helper harus dipakai dari services/page mutation handler, bukan dari render.

Acceptance criteria:

- Helper dapat patch `appStore` dan cache terkait.
- Tidak membuat dependency baru.
- Tidak menghapus preload-first architecture.

Hasil implementasi:

- File helper baru: `public/assets/js/state/sync/sharedMutationSync.js`.
- Helper baseline:
  - `writePreloadSnapshot(role, key, data, options)`
  - `markPreloadSnapshotStale(role, key, options)`
  - `markPreloadSnapshotsStale(items, options)`
  - `upsertWorkingCollection(path, item, options)`
  - `upsertPreloadCollection(role, key, item, options)`
  - `invalidateCatalogSnapshots()`
  - `invalidateTransactionSnapshots()`
  - `invalidateAffiliateFinanceSnapshots()`
- Pattern: mutation page/service boleh patch own working/snapshot langsung, lalu mark related cross-role preload snapshot stale bila payload lengkap lintas role tidak tersedia.
- Batasan: helper ini belum menentukan business transition. Domain payment/listing/settlement tetap harus mengikuti status canon backend.

Critical patch yang sudah diterapkan setelah Task 3:

- Listing/car status:
  - `seller/pages/carsPage.js` sekarang menulis `snapshot.seller.cars` dan cache `seller.cars` melalui shared helper.
  - Snapshot related `public.catalog`, `buyer.catalog`, dan `admin.cars` ditandai stale setelah seller create/update/archive car.
- Transaction/payment status:
  - `buyer/pages/paymentStatusPage.js` sekarang upsert `working.buyerTransactions.transactions`, `snapshot.buyer.transactions`, dan cache `buyer.transactions` setelah complete/update status yang jelas menghasilkan transaction payload.
  - Related `seller.transactions` dan `admin.transactions` ditandai stale.
  - `seller/pages/transactionsPage.js` sekarang upsert `working.sellerTransactions.transactions`, `snapshot.seller.transactions`, dan cache `seller.transactions` setelah fulfillment checklist mutation.
  - Related `buyer.transactions` dan `admin.transactions` ditandai stale.
- Settlement/affiliate finance:
  - `admin/pages/settlementsPage.js` sekarang patch own working/snapshot/cache settlement setelah update status.
  - Related affiliate finance snapshots `affiliate_admin.ledgerActivity` dan `affiliate_admin.settlementActivity` ditandai stale.
  - Route refresh tidak lagi menjadi mekanisme utama untuk status settlement update.
- Notification overwrite risk:
  - `notificationState` sekarang menjaga optimistic read state saat snapshot/list hydrate masuk ketika `markRead` atau `markAllRead` masih pending.
  - Incoming unread count yang lebih tinggi tidak mengalahkan optimistic unread count saat mutation read masih pending.

### Task 4 - Fix Notifications State Sync

Scope:

- Pastikan `markRead` dan `markAllRead` tetap patch bell, popover, dan full page.
- Tambahkan guard bila polling snapshot lebih lama dari optimistic mutation.
- Pastikan open popover tidak fetch.

Acceptance criteria:

- Mark read di popover mengubah badge dan `#/notifications`.
- Mark all di full page mengubah badge.
- Polling tidak mengembalikan unread count lama setelah mark read.

### Task 5 - Fix Listing/Car Mutation Sync

Status: runtime patch completed for listing status and seller car mutations on 2026-05-18; seller image upload/cover/reorder/delete stale invalidation updated on 2026-05-25.

Scope:

- Seller create/update/archive listing.
- Image upload/set cover/reorder/delete.
- Inspection update.
- Admin approval/rejection listing bila ada.
- Patch/invalidate:
  - `snapshot.seller.cars`
  - `snapshot.public.catalog`
  - `snapshot.buyer.catalog`
  - `snapshot.admin.cars`
  - related localStorage cache.

Acceptance criteria:

- Seller edit listing terlihat di seller list dan buyer/public catalog tanpa reload penuh.
- Archive/sold listing tidak meninggalkan CTA beli aktif.
- Cover image berubah di card/detail terkait.

Hasil implementasi:

- Added `syncBusinessListing()` in `public/assets/js/state/sync/businessStatusSync.js`.
- Seller car create/update/archive now route through business sync after local working update.
- Seller/admin car snapshots are patched when the car exists in memory.
- Buyer/public catalog snapshots remove cars whose `listing_status` is no longer `published`.
- Related catalog/admin snapshots are marked stale so preload can refresh official resource data.
- Seller image upload queue is transient UI state. Upload success patches `working.sellerCarImages.images`; upload, cover, delete, and reorder mutations mark `seller.cars`, `public.catalog`, `buyer.catalog`, and `admin.cars` stale.
- Seller gallery preview uses in-app lightbox/modal and must not navigate to direct image URLs.

### Task 6 - Fix Transaction/Payment Mutation Sync

Status: runtime patch completed for public create, buyer payment/status, seller fulfillment checklist on 2026-05-18.

Scope:

- Public transaction create.
- Buyer payment complete/status update.
- Seller fulfillment/handover/complete.
- Admin transaction updates.
- Patch/invalidate buyer/seller/admin transaction snapshots and listing status.

Acceptance criteria:

- Payment success mengubah buyer transaction, seller transaction, admin transaction, dan listing availability.
- Status handover/completed konsisten lintas role.
- Tidak ada reload halaman penuh sebagai mekanisme utama.

Hasil implementasi:

- Added canon helpers in `public/assets/js/utils/transactionStatus.js`.
- Added `syncBusinessTransaction()` in `public/assets/js/state/sync/businessStatusSync.js`.
- Transaction create/payment/status/fulfillment mutations patch the acting role transaction snapshot and mark other role transaction snapshots stale.
- Confirmed status side effects:
  - `dp_paid` -> listing `reserved`.
  - `paid` -> listing `sold` and affiliate finance snapshots stale for accrual.
  - `completed` -> listing remains `sold`; no settlement side effect.
  - cancelled/expired before paid -> listing `published`.
  - cancelled after DP -> listing remains `reserved`.
  - refunded/cancelled after paid -> listing remains `sold`.

### Task 7 - Fix Affiliate/Commission/Settlement Sync

Status: runtime patch completed for admin settlement status mutation on 2026-05-18.

Scope:

- Seller affiliate create/update.
- Commission rule update.
- Commission accrual after payment.
- Admin settlement status.
- Affiliate ledger/settlement snapshots.

Acceptance criteria:

- Settlement status admin tercermin di affiliate settlement/ledger.
- Commission rule update tidak membuat preview/dashboard stale.
- Attribution session tidak bocor setelah logout/transaction completion.

Hasil implementasi:

- Added `syncBusinessSettlement()` in `public/assets/js/state/sync/businessStatusSync.js`.
- Admin settlement status update patches admin settlement working/snapshot/cache.
- Affiliate settlement and ledger snapshots are patched when related settlement/ledger ids are present in the API response.
- Settlement `settled` maps ledgers to `paid_out`.
- Settlement `cancelled` maps ledgers back to `accrued` and clears `settlement_batch_id`.
- Related affiliate finance snapshots are marked stale when payload is partial.

### Task 8 - Regression Smoke Tests

Status: completed sandbox/mock-only browser UAT on 2026-05-18.

Checklist document:

- `docs/BUSINESS_SYNC_SANDBOX_UAT_CHECKLIST.md`

Hasil:

- 10/10 sandbox/mock scenarios passed.
- Critical scenarios passed:
  - `paid -> sold`.
  - refunded after `paid` keeps listing `sold`.
  - settlement `cancelled -> ledger accrued`.
- No real business mutation API was called.
- Normal app boot GET preload/autologin/catalog requests occurred during browser startup.

Checklist:

- Profile name sync: `#/profile` -> `#/buyer`.
- Notification sync: bell, popover, `#/notifications`.
- Listing status sync: seller edit/archive -> buyer/public catalog.
- Image/inspection sync: seller update -> buyer/public detail.
- Payment status sync: buyer payment -> seller/admin transaction.
- Affiliate commission sync: payment -> ledger/settlement/notification.
- Role switching/logout cache reset.

## 9. Prioritas Patch Pertama

Patch pertama yang paling kecil dan paling jelas adalah Auth/Profile Source of Truth:

1. Standardisasi helper untuk hasil `profileResource.updateMe`.
2. Pakai helper itu dari `modules/profile/pages/profilePage.js` dan `modules/buyer/pages/accountPage.js`.
3. Patch/invalidate `snapshot.buyer.profile` dan cache `buyer.profile`.
4. Pastikan `dashboardPage.resolveBuyerUser()` tidak memprioritaskan snapshot profile lama di atas user aktif yang baru.

Alasan: bug sudah terkonfirmasi dari kode, blast radius rendah, dan tidak menyentuh schema/API/flow transaksi.

## 10. Verification Checklist

Docs-only audit:

- Dokumen audit/plan dibuat.
- `projectA` tidak diubah.
- Tidak perlu `node --check` jika tidak ada JS berubah.

Jika patch runtime dilakukan:

- Jalankan `node --check` untuk setiap JS yang berubah.
- Smoke login buyer:
  - buka `#/profile`.
  - ubah nama.
  - pindah ke `#/buyer`.
  - nama baru tampil tanpa reload.
  - header/profile action memakai nama baru.
  - logout/login ulang tetap benar.
- Smoke role lain:
  - seller/admin/affiliate profile tetap render.
  - logout/cache reset tidak meninggalkan user lama.
- Static audit:
  - tidak ada fetch baru di page open untuk menutupi stale state.
  - tidak ada full page reload sebagai sinkronisasi utama.

## 11. Catatan Risiko dan Konfirmasi yang Dibutuhkan

- Perlu konfirmasi apakah identitas user aktif harus selalu bersumber dari `authStore.user()` saat render header/buyer greeting, sedangkan snapshot profile hanya untuk field detail tambahan.
- Perlu konfirmasi strategi cache setelah mutation: patch cache payload langsung atau remove cache supaya preload berikutnya refresh resource resmi.
- Perlu keputusan lokasi helper sync: `state/`, `preload/`, atau `modules/*/services/`. Rekomendasi: helper shared untuk cross-domain sync, service module untuk domain-specific patch.
- Perlu audit backend response untuk mutation high-risk: apakah response selalu mengembalikan entity lengkap atau hanya partial payload.
- Untuk transaction/payment/listing, perlu konfirmasi business rule status final seperti reserved, paid, handover, completed, cancelled, refunded, dan kapan listing boleh kembali tersedia.
- Untuk affiliate finance, perlu konfirmasi apakah settlement/ledger harus real-time di UI atau cukup stale-while-revalidate setelah mutation admin.
