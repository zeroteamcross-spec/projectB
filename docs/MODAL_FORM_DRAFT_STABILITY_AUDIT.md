# Modal Form Draft Stability Audit

Tanggal audit: 2026-05-21

## Bug Class

ProjectB memakai snapshot/preload dan store subscription untuk menjaga halaman tetap segar. Pola ini aman untuk list/table, tetapi berbahaya untuk modal form jika page render memanggil `openModal()` ulang setiap kali store berubah. `openModal()` dengan key yang sama sebelumnya tetap mengganti body modal, sehingga input yang sedang diketik user bisa hilang saat snapshot/preload update.

Aturan final:

```txt
Background snapshot/preload may update page data,
but must never erase active user input in modal/form drafts.
```

## Root Cause: Seller Affiliates

Route `#/seller/affiliates` memakai `SellerAffiliatesModalPage`. Page ini subscribe ke `appStore`, lalu `render()` membuat ulang layout dan memanggil `openAffiliateModal()` saat query modal aktif. Ketika snapshot `seller.affiliates` berubah di background, `openModal()` dipanggil lagi dengan key yang sama dan body modal diganti dengan form baru. Form create affiliate mengambil value awal dari props/draft kosong, sehingga input user termasuk password hilang.

## Fix Diterapkan

- `openModal()` sekarang mendukung guard `preserveContentOnSameSignature` + `contentSignature`.
- Modal yang dipanggil ulang dari render loop dapat mempertahankan body DOM aktif jika signature konten tidak berubah.
- `SellerAffiliatesModalPage` memakai draft create/edit affiliate in-memory yang terpisah dari snapshot.
- Draft password affiliate hanya berada di memori module selama modal aktif.
- Draft dibersihkan saat explicit close/cancel, sukses save, pindah mode/detail, atau dispose page.
- Snapshot/list seller affiliates tetap boleh update karena page content di belakang modal tetap re-render.

## Risk Matrix

| Area | Modal/Form | Snapshot/Preload Source | Risk | Status | Recommendation |
|---|---|---|---|---|---|
| Seller Affiliates | Tambah/Edit Affiliate | `seller.affiliates` snapshot + working set | High | Fixed | Stable in-memory draft + modal content signature |
| Seller Cars | Tambah/Edit Mobil | `seller.cars`, `seller.masterBrand` | High | Guarded | Runtime draft already exists; modal body now preserved on same signature |
| Seller Showroom | Edit/Buat Showroom | `seller.showroom`, `seller.masterBank` | Medium | Guarded | Modal body preserved on same signature; consider explicit draft object if validation grows |
| Seller Affiliate Commissions | Global/Override commission forms | `seller.affiliateCommissionRules`, seller cars list | Medium | Guarded | Modal body preserved during background refresh |
| Admin Sliders | Tambah/Edit Slider | admin slider working/snapshot | Medium | Guarded | Existing modal draft remains active; modal body preserved during refresh |
| Buyer Account | Edit Profile / Change Password | buyer profile/auth snapshots | Low | Audited | Modal opened by action closure, draft local to modal; not reopened from page render loop |
| Global Profile | Edit Profile / Change Password | auth/profile snapshots | Low | Audited | Modal opened by action closure, draft local to modal; password not persisted |
| Public Transaction Entry | Transaction form | `working.transactionEntry.detail`, transaction entry runtime | Medium | Audited | Not a modal; form state is in `transactionEntryState`, but page re-render can still affect focus. Keep under regression watch |
| Admin Users / Approvals / Transactions | Detail/action modals | admin snapshots | Low | Audited | Mostly detail/action panels, not long-running input forms |
| Seller Images / Inspection / Transactions | Upload/action/fulfillment modals | seller working sets | Medium | Audited | Some action forms exist; patch if user input loss is reproduced |
| Notifications | Popover/filter/list | notification polling snapshot | Low | Audited | Popover is not a form modal; outside-click behavior is intentionally separate |

## Global Rule

- Snapshot/working data is server/page data.
- Modal form draft is user-owned transient state.
- Opening a form seeds the draft once.
- Dirty draft wins over background snapshot updates.
- Render loops may update list/table/summary behind the modal.
- Render loops must not recreate active modal body unless mode/entity/status signature changed.
- Password and other sensitive drafts must remain in memory only and be cleared on close/success/dispose.

## Smoke Result

Non-mutating browser harness for `#/seller/affiliates` modal:

- Opened `Tambah Affiliate`.
- Filled name, username/email, password, password confirmation, phone, and slug.
- Triggered synthetic `snapshot.seller.affiliates` update while modal stayed open.
- Modal remained open.
- All input values remained unchanged.
- Focus remained on `slraf_affiliate_email_input`.
- No console error.

