# SPA Render Stability Audit

Tanggal audit: 2026-05-24

## Bug Class

SPA filter/tab/list interactions must update only the necessary section. They must not remount the whole page, reset layout, or cause visible flicker.

Bug class yang diaudit:

```txt
filter/tab/action/list update
-> page render dipanggil ulang
-> root/page shell diganti penuh
-> header/card/filter/footer remount
-> loading/empty/list height berubah cepat
-> halaman tampak reload atau berkedip
```

## Root Cause `#/notifications`

`#/notifications` sebelumnya memanggil `render()` pada:

- filter click sebelum request list.
- `notificationState.setLoading(true)`.
- response `notificationState.hydrate()`.
- subscription notification state.

Pada buyer path, `renderBuyerNotifications()` membuat page baru dan memanggil `root.replaceChildren(page)` setiap kali state berubah. Akibatnya `#byr_notifications_filter`, header card, list card, top nav, dan mobile footer ikut remount saat user hanya mengganti filter.

List state juga bisa berpindah cepat antara loading/empty/list tanpa region height stabil, sehingga card lain terlihat berubah ukuran.

## Fix Diterapkan

- `notificationsPage.js` sekarang memakai stable shell per role (`buyer`, `affiliate`, `default`).
- Root `#ntf_page`, buyer page `#byr_notifications_page`, dan filter host `#byr_notifications_filter` tidak diganti ulang saat filter berubah.
- Render berikutnya hanya mengganti isi host:
  - header host.
  - filter tabs host.
  - list region host.
  - load more host.
- List region diberi `min-height` stabil.
- Loading filter change mempertahankan current list/empty region dan menampilkan inline loading pill, bukan mengganti seluruh page.
- Empty/error/loading state diberi tinggi minimal yang konsisten.
- Filter tab memakai fixed min width dan font weight stabil agar active state tidak menggeser layout.
- Notification list item punya min-height stabil untuk variant buyer dan default.

Tidak ada `location.reload`, router refresh, direct `fetch()`, atau perubahan API.

## Halaman/Komponen Diaudit

| Area | Interaction | Root Risk | Status | Recommendation |
|---|---|---|---|---|
| Buyer Notifications | Filter `byr_notifications_filter` | Full page `replaceChildren` and unstable list height | Fixed | Stable role shell + stable list region |
| Default Notifications | Filter tabs | Full route content rerender on notification subscription | Fixed | Stable default shell + list min-height |
| Affiliate Notifications | Filter tabs inside account shell | Account layout remount including footer/top nav | Fixed | Stable AffiliateAccountLayout host nodes |
| Notification Filter Tabs | Active chip | Font/border width can shift filter row | Fixed | Fixed min width and equal font weight |
| Notification List | Read/unread list cards | Different item heights can move page while filtering | Fixed | Min-height per item variant |
| Buyer Transactions | Status/search filter | Full page rerender via `root.replaceChildren(page)` | Watch | Patch later if reproduced; current update is local data and no async empty/loading loop |
| Buyer Dashboard | Filter modal apply/search | Full dashboard rerender on local filter apply | Watch | Modal draft is stable; recommendation section can be made host-based later |
| Seller Cars | Table/filter/search | Page rerender patterns exist around working data | Watch | Avoid replacing shell on async filter once server-side filtering grows |
| Seller Transactions | Status/action list update | Working set updates can rerender table/list | Watch | Keep modal/action drafts stable; consider section-level table hosts |
| Seller Affiliates | Modal/list refresh | Render loop can affect modal input | Guarded | Covered by modal draft stability guard |
| Affiliate Ledger | Filter/list update | Account layout can remount if page uses full rerender | Watch | Apply stable host pattern when adding interactive filters |
| Admin Transactions | Table/list updates | Full page rerender possible on working updates | Watch | Prefer DataTable body patch or stable table host |
| Public Catalog | Search/filter/quick filter | `root.replaceChildren(shell)` used; local filter can remount hero/search/list | Watch | Bigger public catalog refactor should be separate |
| Public Transaction Entry | Form state | Full render can reset form if state not externalized | Watch | Keep form draft in state; avoid route remounts |

## Global Rule

- Filter/tab/search/list interactions must not remount the whole page.
- Page shell, role shell, top nav, mobile footer, and filter container should be stable DOM for in-page interactions.
- Async list regions need stable `min-height` or stable skeleton dimensions.
- Do not clear user-visible content before new data is ready unless using a stable skeleton/overlay.
- Use service/state layer for data loading; do not call `fetch()` directly in presentational components.
- Do not use `location.reload()` or router refresh to make a list look fresh.
- Active tab/filter styling must not change chip height or cause row width jumps.

## Smoke Result

Browser smoke on `https://public.test/app.html#/notifications`:

- Buyer mobile 390px: changed filters `Belum Dibaca`, `Sudah Dibaca`, `Semua`.
- Buyer desktop 1024px: changed the same filters.
- Seller desktop, admin desktop, affiliate_admin desktop: changed the same filters.
- Result: PASS.

Observed:

- `location.hash` stayed `#/notifications`.
- `#ntf_page` stayed the same DOM node.
- Buyer `#byr_notifications_page` stayed the same DOM node.
- Buyer `#byr_notifications_filter` stayed the same DOM node.
- Scroll did not jump.
- List region min-height remained stable (`380px` buyer, `360px` default/affiliate).

Additional non-mutating route smoke passed for similar-risk pages:

- `#/buyer/transactions`
- `#/seller/cars`
- `#/seller/transactions`
- `#/seller/affiliates`
- `#/admin/transactions`
- `#/affiliate/ledger`

These routes rendered page content without horizontal overflow in the smoke viewport. Full section-level refactors for their local table/filter rerenders are documented as watch items unless a reproduced flicker bug appears.
